from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import os
import datetime
import subprocess
import shutil
from decimal import Decimal
from pathlib import Path
from typing import Any

import httpx

from ..db import get_db

logger = logging.getLogger(__name__)

# ── SIP-010 contract addresses (must match lib/stacks-config.ts) ───────────────
USDCX_CONTRACT_ADDRESS = os.environ.get("USDCX_CONTRACT_ADDRESS") or "ST2YR7WFYKW5D6Y8FK6C0CT0YP5DXCKSNDACMTHB4"
USDCX_CONTRACT_NAME = os.environ.get("USDCX_CONTRACT_NAME") or "usdcx-token"

SBTC_CONTRACT_ADDRESS = os.environ.get("SBTC_CONTRACT_ADDRESS") or "ST2YR7WFYKW5D6Y8FK6C0CT0YP5DXCKSNDACMTHB4"
SBTC_CONTRACT_NAME = os.environ.get("SBTC_CONTRACT_NAME") or "sbtc-token"

# Master Stacks wallet (holds STX for dripping to burners)
MASTER_STACKS_PRIVATE_KEY = os.environ.get("MASTER_STACKS_PRIVATE_KEY", "")
MASTER_STACKS_ADDRESS = os.environ.get("MASTER_STACKS_ADDRESS", "")

DEFAULT_SPEND_LIMIT = float(os.environ.get("DEFAULT_SPEND_LIMIT_USD", "10000"))
STX_DRIP_AMOUNT = int(os.environ.get("STX_DRIP_ATOMIC", "500000"))  # 0.5 STX

IS_TESTNET = True
STACKS_NETWORK = "testnet" if IS_TESTNET else "mainnet"

# ── Path to the Node.js transfer script ───────────────────────────────────────
_TOOL_DIR = Path(__file__).parent
_TRANSFER_SCRIPT = _TOOL_DIR / "stacks_transfer.mjs"


def _find_node() -> str:
    """Find the node executable; raises if not found."""
    node = shutil.which("node") or shutil.which("nodejs")
    if not node:
        raise RuntimeError(
            "Node.js not found. Install Node.js 18+ and run "
            "'cd server/tool && npm install' to set up the Stacks transfer tool."
        )
    return node


def _validate_stacks_address(address: str) -> bool:
    """
    Validate a Stacks c32check standard principal address.
    Valid addresses are 40 or 41 characters total:
      S + version_char (T/P/N/M/G) + 38-39 c32 chars
    c32check encoding of hash160+checksum can yield 40 or 41 total
    depending on leading zero bytes in the hash.
    """
    if not address or not isinstance(address, str):
        return False
    if address[0] != "S":
        return False
    if len(address) < 2 or address[1] not in ("T", "P", "N", "M", "G"):
        return False
    if not (39 <= len(address) <= 42):
        return False
    c32_chars = set("0123456789ABCDEFGHJKMNPQRSTVWXYZ")
    return all(c in c32_chars for c in address[2:])


def _decrypt_burner_key(encrypted_hex: str, owner_principal: str) -> str:
    key_bytes = hashlib.sha256(owner_principal.lower().encode()).digest()
    enc_str = encrypted_hex[2:] if encrypted_hex.startswith("0x") else encrypted_hex
    try:
        enc_bytes = bytes.fromhex(enc_str)
    except ValueError as exc:
        raise ValueError(f"Invalid encrypted key hex: {exc}") from exc
    decrypted = bytes(
        b ^ key_bytes[i % len(key_bytes)] for i, b in enumerate(enc_bytes)
    )
    return decrypted.hex()


def _get_token_config(funding_asset: str) -> tuple[str, str, int]:
    if funding_asset == "sBTC":
        return SBTC_CONTRACT_ADDRESS, SBTC_CONTRACT_NAME, 8
    return USDCX_CONTRACT_ADDRESS, USDCX_CONTRACT_NAME, 6


def _drip_stx_sync(burner_address: str) -> None:
    if not MASTER_STACKS_PRIVATE_KEY or not MASTER_STACKS_ADDRESS:
        logger.debug("[X402] No MASTER_STACKS_PRIVATE_KEY — skipping STX drip.")
        return
    try:
        from . import stack_tx_builder as stacks_builder
        result = stacks_builder.build_and_broadcast_stx_transfer(
            private_key_hex=MASTER_STACKS_PRIVATE_KEY,
            recipient_address=burner_address,
            amount_ustx=STX_DRIP_AMOUNT,
            testnet=IS_TESTNET,
        )
        logger.info("[X402] STX drip tx: %s", result.get("txid", "unknown"))
    except Exception as exc:
        logger.warning("[X402] STX drip failed (non-fatal): %s", exc)


class X402SettlementTool:
    name = "x402_settlement"
    description = (
        "Autonomous settlement via Stacks burner principal. "
        "Transfers SIP-010 tokens (USDCx or sBTC) to merchant Stacks principals "
        "using the official @stacks/transactions Node.js SDK."
    )

    async def _get_next_nonce(self, address: str) -> int:
        base_url = "https://api.testnet.hiro.so" if IS_TESTNET else "https://api.mainnet.hiro.so"
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{base_url}/v2/accounts/{address}")
            resp.raise_for_status()
            data = resp.json()
            return int(data["nonce"])

    def _call_node_transfer_with_nonce(
        self,
        private_key: str,
        recipient_address: str,
        amount_atomic: int,
        contract_address: str,
        contract_name: str,
        sender_address: str = "",
        nonce: int = None,
    ) -> dict:
        node = _find_node()
        if not _TRANSFER_SCRIPT.exists():
            raise RuntimeError(
                f"Stacks transfer script not found at {_TRANSFER_SCRIPT}. "
                "Copy stacks_transfer.mjs to server/tool/ and run 'npm install' there."
            )
        node_modules = _TRANSFER_SCRIPT.parent / "node_modules"
        if not node_modules.exists():
            raise RuntimeError(
                f"Node.js dependencies not installed. Run: cd {_TRANSFER_SCRIPT.parent} && npm install"
            )
        payload_dict = {
            "type":             "sip010",
            "private_key":      private_key,
            "sender_address":   sender_address,
            "recipient":        recipient_address,
            "amount":           amount_atomic,
            "contract_address": contract_address,
            "contract_name":    contract_name,
            "network":          STACKS_NETWORK,
        }
        if nonce is not None:
            payload_dict["nonce"] = nonce
        payload = json.dumps(payload_dict)
        logger.debug(
            "[X402] node %s — recipient=%s amount=%d contract=%s.%s nonce=%s",
            _TRANSFER_SCRIPT.name, recipient_address[:16], amount_atomic,
            contract_address[:16], contract_name, nonce,
        )
        try:
            proc = subprocess.run(
                [node, str(_TRANSFER_SCRIPT), payload],
                capture_output=True,
                text=True,
                timeout=60,
                cwd=str(_TRANSFER_SCRIPT.parent),
            )
        except subprocess.TimeoutExpired:
            raise RuntimeError("Stacks transaction timed out after 60 seconds")
        except FileNotFoundError as exc:
            raise RuntimeError(f"Could not execute Node.js: {exc}") from exc
        stdout = proc.stdout.strip()
        stderr = proc.stderr.strip()
        if proc.returncode != 0:
            err_msg = stderr or stdout or f"node exited with code {proc.returncode}"
            try:
                err_data = json.loads(stderr or stdout)
                reason = err_data.get("reason") or err_data.get("reason_data", {})
                err_msg = f"{err_data.get('error', 'Unknown error')}"
                if reason:
                    err_msg += f" ({reason})"
            except (json.JSONDecodeError, AttributeError):
                pass
            raise RuntimeError(f"Stacks transfer failed: {err_msg}")
        if not stdout:
            raise RuntimeError(f"No output from Stacks transfer script. stderr: {stderr}")
        try:
            output_str = stdout.split("\n")[-1]
            result = json.loads(output_str)
        except json.JSONDecodeError as exc:
            raise RuntimeError(f"Invalid JSON from transfer script: {stdout[:200]}") from exc
        if not result.get("success"):
            raise RuntimeError(f"Transfer script returned failure: {result}")
        return result

    async def run_async(
        self, *, args: dict[str, Any], tool_context: Any
    ) -> dict[str, Any]:

        payment_mandate = args.get("payment_mandate", {})
        if isinstance(payment_mandate, str):
            try:
                payment_mandate = json.loads(payment_mandate)
            except Exception:
                pass

        cart_mandate = payment_mandate.get("cart_mandate", {})
        chat_id = payment_mandate.get("chat_id")

        if not cart_mandate:
            raise ValueError("payment_mandate must contain 'cart_mandate'.")

        merchants = cart_mandate.get("merchants", [])
        if not merchants:
            raise ValueError("cart_mandate.merchants is empty.")

        # ── Retrieve burner wallet record ─────────────────────────────────────
        db = await get_db()

        burner_record = None
        if chat_id:
            try:
                burner_record = await db.smartwallet.find_first(
                    where={
                        "chatId": chat_id,
                        "expiresAt": {"gt": datetime.datetime.utcnow()},
                    }
                )
            except Exception as exc:
                logger.warning("[X402] Could not query by chatId: %s", exc)

        if burner_record is None:
            burner_record = await db.smartwallet.find_first(
                where={"expiresAt": {"gt": datetime.datetime.utcnow()}},
                order={"createdAt": "desc"},
            )

        if burner_record is None:
            raise ValueError(
                "No active burner wallet session. "
                "Visit /wallet to deposit USDCx and authorize the agent."
            )

        burner_address = burner_record.smartWalletAddress
        if not isinstance(burner_address, str) or len(burner_address) != 41:
            raise ValueError(
                f"Burner sender address is invalid: '{burner_address}' "
                f"(length={len(burner_address) if burner_address else 'None'}, expected exactly 41)."
            )
        owner_principal = burner_record.ownerEoa
        spend_limit_usdc = float(burner_record.spendLimitUsdc or DEFAULT_SPEND_LIMIT)
        funding_asset: str = getattr(burner_record, "fundingAsset", None) or "USDCx"

        total_cart_raw = float(
            cart_mandate.get("amount")
            or cart_mandate.get("total_budget_amount")
            or 0
        )
        total_cart_usd = (
            total_cart_raw if total_cart_raw < 10_000 else total_cart_raw / 1_000_000
        )

        if total_cart_usd > spend_limit_usdc:
            raise ValueError(
                f"Cart total ${total_cart_usd:.2f} exceeds your burner wallet "
                f"balance of ${spend_limit_usdc:.2f}. "
                "Visit /wallet and top up to continue."
            )

        logger.info(
            "[X402] Stacks burner: %s | funded: $%.2f | cart: $%.2f | asset: %s | vendors: %d",
            burner_address[:16], spend_limit_usdc, total_cart_usd, funding_asset, len(merchants),
        )

        burner_private_key = _decrypt_burner_key(
            burner_record.sessionKeyEncryptedPrivate,
            owner_principal,
        )

        contract_address, contract_name, decimals = _get_token_config(funding_asset)

        await asyncio.get_event_loop().run_in_executor(
            None, _drip_stx_sync, burner_address
        )
        await asyncio.sleep(3)

        receipts: list[dict] = []
        failures: list[dict] = []
        total_usd: Decimal = Decimal("0")
        loop = asyncio.get_event_loop()

        current_nonce = await self._get_next_nonce(burner_address)

        for i, vendor in enumerate(merchants):
            vendor_principal = (vendor.get("merchant_address", "") or "").strip().replace('"', '').replace("'", "")
            raw_val = float(vendor.get("amount", 0))
            usd_amt = raw_val if raw_val < 10_000 else raw_val / 1_000_000
            amount_atomic = int(usd_amt * (10 ** decimals))

            logger.info(
                "[X402] Vendor %d/%d: %s — $%.2f (%d atomic %s)",
                i + 1, len(merchants), vendor.get("name"), usd_amt, amount_atomic, funding_asset,
            )

            if not _validate_stacks_address(vendor_principal):
                error_msg = (
                    f"Invalid Stacks address for vendor '{vendor.get('name')}': "
                    f"'{vendor_principal}' "
                    f"(length={len(vendor_principal)}, expected exactly 41). "
                    f"Fix this vendor's pubkey in /admin/vendors."
                )
                logger.error("[X402] %s", error_msg)
                failures.append({
                    "commodity":  vendor.get("name", "Unknown"),
                    "amount_usd": usd_amt,
                    "error":      error_msg,
                })
                continue

            if amount_atomic <= 0:
                failure_msg = f"Invalid amount: {usd_amt} USD → {amount_atomic} atomic units."
                failures.append({
                    "commodity":  vendor.get("name", "Unknown"),
                    "amount_usd": usd_amt,
                    "error":      failure_msg,
                })
                continue

            try:
                result = await loop.run_in_executor(
                    None,
                    self._call_node_transfer_with_nonce,
                    burner_private_key,
                    vendor_principal,
                    amount_atomic,
                    contract_address,
                    contract_name,
                    burner_address,
                    current_nonce,
                )

                tx_id = result.get("txid", "unknown")
                logger.info("[X402] ✓ %s — txid: %s", vendor.get("name"), tx_id)

                item_usd = Decimal(str(usd_amt))
                total_usd += item_usd
                current_nonce += 1

                receipts.append({
                    "commodity":        vendor.get("name", "Unknown"),
                    "merchant_address": vendor_principal,
                    "amount_usd":       float(item_usd),
                    "tx_hash":          tx_id,
                    "product_id":       (vendor.get("products") or [{}])[0].get("product_id"),
                    "vendor_id":        vendor.get("vendor_id"),
                    "network":          f"Stacks {STACKS_NETWORK.capitalize()}",
                    "asset":            funding_asset,
                })

            except Exception as exc:
                error_detail = str(exc)
                logger.error("[X402] ✗ %s: %s", vendor.get("name"), error_detail)
                failures.append({
                    "commodity":  vendor.get("name", "Unknown"),
                    "amount_usd": usd_amt,
                    "error":      error_detail,
                })

        if not receipts and failures:
            all_errors = "; ".join(f["error"] for f in failures)
            raise ValueError(f"All payments failed: {all_errors}")

        if receipts:
            try:
                await self._record_order(
                    receipts=receipts,
                    total_usd=total_usd,
                    user_wallet=burner_address,
                    primary_tx=receipts[0]["tx_hash"],
                )
            except Exception as exc:
                logger.warning("[DB] Order recording failed (non-fatal): %s", exc)

        status = "settled" if not failures else "partial"
        logger.info(
            "[X402] Done — %d confirmed, %d failed, $%.2f total %s",
            len(receipts), len(failures), float(total_usd), funding_asset,
        )

        return {
            "status":   status,
            "receipts": receipts,
            "failures": failures,
            "network":  f"Stacks {STACKS_NETWORK.capitalize()}",
            "asset":    funding_asset,
            "details":  (
                f"Settled {len(receipts)}/{len(receipts) + len(failures)} vendor(s) · "
                f"${float(total_usd):.2f} {funding_asset}"
            ),
        }

    async def _record_order(
        self,
        receipts: list[dict],
        total_usd: Decimal,
        user_wallet: str,
        primary_tx: str,
    ) -> None:
        db = await get_db()

        order = await db.order.create(data={
            "totalAmount": total_usd,
            "status":      "PAID",
            "txHash":      primary_tx,
            "userWallet":  user_wallet,
        })

        for receipt in receipts:
            product = None

            if receipt.get("product_id"):
                try:
                    product = await db.product.find_unique(
                        where={"productID": receipt["product_id"]},
                    )
                except Exception:
                    pass

            if product is None:
                matches = await db.product.find_many(
                    where={"name": {"contains": receipt["commodity"], "mode": "insensitive"}},
                    take=1,
                )
                product = matches[0] if matches else None

            if product is None:
                logger.warning(
                    "[DB] Could not find product for receipt commodity '%s' — skipping order item.",
                    receipt["commodity"],
                )
                continue

            await db.orderitem.create(data={
                "orderId":   order.id,
                "productId": product.id,
                "vendorId":  product.vendorId,
                "quantity":  1,
                "price":     Decimal(str(receipt["amount_usd"])),
            })