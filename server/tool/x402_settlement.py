"""
tool/x402_settlement.py — Stacks Blockchain Settlement (SIP-010)
=================================================================

MIGRATED FROM: SKALE EVM / web3.py / ERC-20
MIGRATED TO:   Stacks Bitcoin L2 / SIP-010 tokens (USDCx / sBTC)

Architecture:
  - Python reads the burner wallet record and decrypts the private key
  - Python calls a Node.js helper (stacks_tx_builder.ts compiled to .js)
    via subprocess to construct, sign, and broadcast Stacks transactions
  - This is necessary because Python Stacks tooling is incomplete for
    signing complex contract calls; the @stacks/transactions TS SDK is authoritative

Key differences from EVM version:
  1. No gasPrice=0 trick — Stacks requires STX for transaction fees
  2. drip_stx_to_burner() replaces drip_sfuel_to_burner()
  3. SIP-010 transfer function args: [amount, sender, recipient, memo]
  4. Contract calls go through stacks_tx_builder.js subprocess
  5. XOR encryption key = sha256(stacksPrincipal) not keccak256(eoa)
"""

import asyncio
import hashlib
import json
import logging
import os
import subprocess
import datetime
from decimal import Decimal
from typing import Any

from ..db import get_db

logger = logging.getLogger(__name__)

# ── Stacks network config ──────────────────────────────────────────────────────
STACKS_NETWORK = os.environ.get("STACKS_NETWORK", "testnet")  # "testnet" | "mainnet"

# ── SIP-010 contract addresses ─────────────────────────────────────────────────
# Must match frontend/hooks/useBurnerwallet.ts
USDCX_CONTRACT_ADDRESS = os.environ.get(
    "USDCX_CONTRACT_ADDRESS",
    "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
)
USDCX_CONTRACT_NAME = os.environ.get("USDCX_CONTRACT_NAME", "usdcx-token")

SBTC_CONTRACT_ADDRESS = os.environ.get(
    "SBTC_CONTRACT_ADDRESS",
    "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
)
SBTC_CONTRACT_NAME = os.environ.get("SBTC_CONTRACT_NAME", "sbtc-token")

# Path to the compiled stacks_tx_builder.js
STACKS_TX_BUILDER_PATH = os.environ.get(
    "STACKS_TX_BUILDER_PATH",
    os.path.join(os.path.dirname(__file__), "stacks_tx_builder.js"),
)

# Master Stacks wallet (holds STX for dripping to burners)
MASTER_STACKS_PRIVATE_KEY = os.environ.get("MASTER_STACKS_PRIVATE_KEY", "")
MASTER_STACKS_ADDRESS = os.environ.get("MASTER_STACKS_ADDRESS", "")

DEFAULT_SPEND_LIMIT = float(os.environ.get("DEFAULT_SPEND_LIMIT_USD", "10000"))
STX_DRIP_AMOUNT = int(os.environ.get("STX_DRIP_ATOMIC", "500000"))  # 0.5 STX = 500000 micro-STX

SUBPROCESS_TIMEOUT = int(os.environ.get("STACKS_TX_TIMEOUT_SECONDS", "60"))


# ── XOR decryption using sha256 (Stacks-compatible) ───────────────────────────
# Mirrors frontend encryptPrivateKey() in useBurnerwallet.ts
def _decrypt_burner_key(encrypted_hex: str, owner_principal: str) -> str:
    """
    XOR decrypt the burner private key.
    key = sha256(ownerPrincipal.lower())
    """
    key_bytes = hashlib.sha256(owner_principal.lower().encode()).digest()
    enc_str = encrypted_hex[2:] if encrypted_hex.startswith("0x") else encrypted_hex
    enc_bytes = bytes.fromhex(enc_str)
    decrypted = bytes(
        b ^ key_bytes[i % len(key_bytes)] for i, b in enumerate(enc_bytes)
    )
    return decrypted.hex()


def _get_token_config(funding_asset: str) -> tuple[str, str, int]:
    """Returns (contractAddress, contractName, decimals) for the given asset."""
    if funding_asset == "sBTC":
        return SBTC_CONTRACT_ADDRESS, SBTC_CONTRACT_NAME, 8
    # Default: USDCx
    return USDCX_CONTRACT_ADDRESS, USDCX_CONTRACT_NAME, 6


def drip_stx_to_burner(burner_address: str) -> None:
    """
    Send STX from the master wallet to the burner so it can pay tx fees.
    
    Unlike SKALE (gasless), Stacks requires STX for every transaction.
    The master backend wallet must hold testnet STX (from faucet.stacks.co).
    
    This drips 0.5 STX to cover ~5 SIP-010 transfer fees.
    """
    if not MASTER_STACKS_PRIVATE_KEY or not MASTER_STACKS_ADDRESS:
        logger.debug("[X402] No MASTER_STACKS_PRIVATE_KEY — skipping STX drip.")
        return

    try:
        payload = json.dumps({
            "burnerPrivateKey": MASTER_STACKS_PRIVATE_KEY,
            "recipientAddress": burner_address,
            "amountAtomic": STX_DRIP_AMOUNT,
            "contractAddress": "",      # empty = STX transfer, not SIP-010
            "contractName": "stx-transfer",
            "network": STACKS_NETWORK,
            "isStxTransfer": True,
        })

        result = subprocess.run(
            ["node", STACKS_TX_BUILDER_PATH, payload],
            capture_output=True,
            text=True,
            timeout=SUBPROCESS_TIMEOUT,
        )

        if result.returncode == 0:
            data = json.loads(result.stdout.strip())
            logger.info("[X402] STX drip tx: %s", data.get("txId", "unknown"))
        else:
            logger.warning("[X402] STX drip failed (non-fatal): %s", result.stderr)

    except Exception as exc:
        logger.warning("[X402] STX drip failed (non-fatal): %s", exc)


def _call_stacks_tx_builder(payload: dict) -> dict:
    """
    Calls the Node.js stacks_tx_builder.js subprocess.
    Returns parsed JSON result dict.
    Raises ValueError on failure.
    """
    payload_json = json.dumps(payload)

    try:
        result = subprocess.run(
            ["node", STACKS_TX_BUILDER_PATH, payload_json],
            capture_output=True,
            text=True,
            timeout=SUBPROCESS_TIMEOUT,
        )
    except subprocess.TimeoutExpired:
        raise ValueError(
            f"Stacks transaction timed out after {SUBPROCESS_TIMEOUT}s. "
            "The Stacks node may be congested. Try again."
        )
    except FileNotFoundError:
        raise ValueError(
            f"stacks_tx_builder.js not found at {STACKS_TX_BUILDER_PATH}. "
            "Run: cd server/tool && npx tsc stacks_tx_builder.ts"
        )

    if result.returncode != 0:
        stderr_msg = result.stderr.strip()[:500]
        raise ValueError(f"stacks_tx_builder failed (exit {result.returncode}): {stderr_msg}")

    stdout = result.stdout.strip()
    if not stdout:
        raise ValueError("stacks_tx_builder returned empty output.")

    try:
        data = json.loads(stdout)
    except json.JSONDecodeError:
        raise ValueError(f"stacks_tx_builder returned invalid JSON: {stdout[:200]}")

    if not data.get("success"):
        raise ValueError(f"stacks_tx_builder error: {data.get('error', 'unknown error')}")

    return data


class X402SettlementTool:
    name = "x402_settlement"
    description = (
        "Autonomous settlement via Stacks burner principal. "
        "Transfers SIP-010 tokens (USDCx or sBTC) to merchant Stacks principals. "
        "Requires STX for transaction fees (unlike SKALE which was gasless)."
    )

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
            except Exception:
                pass

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

        burner_address = burner_record.smartWalletAddress  # Stacks principal
        owner_principal = burner_record.ownerEoa           # Stacks principal in ownerEoa field
        spend_limit_usdc = float(burner_record.spendLimitUsdc or DEFAULT_SPEND_LIMIT)

        # Detect funding asset from stored record (defaults to USDCx)
        funding_asset = getattr(burner_record, "fundingAsset", "USDCx") or "USDCx"

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
                f"Visit /wallet and top up to continue."
            )

        logger.info(
            "[X402] Stacks burner: %s | funded: $%.2f | cart: $%.2f | asset: %s | vendors: %d",
            burner_address[:16], spend_limit_usdc, total_cart_usd, funding_asset, len(merchants),
        )

        # ── Decrypt burner private key ────────────────────────────────────────
        burner_private_key = _decrypt_burner_key(
            burner_record.sessionKeyEncryptedPrivate,
            owner_principal,
        )
        logger.info("[X402] Burner key decrypted for principal: %s", burner_address[:16])

        # ── Optionally drip STX to burner for fees ────────────────────────────
        # Unlike SKALE (gasless), Stacks requires STX for tx fees.
        drip_stx_to_burner(burner_address)

        # ── Get SIP-010 contract config ───────────────────────────────────────
        contract_address, contract_name, decimals = _get_token_config(funding_asset)

        # ── Settle each vendor ────────────────────────────────────────────────
        receipts: list[dict] = []
        failures: list[dict] = []
        total_usd: Decimal = Decimal("0")

        for i, vendor in enumerate(merchants):
            vendor_principal = vendor.get("merchant_address", "")
            raw_val = vendor.get("amount", 0)
            usd_amt = float(raw_val) if float(raw_val) < 10_000 else float(raw_val) / 1_000_000
            amount_atomic = int(usd_amt * (10 ** decimals))

            logger.info(
                "[X402] Vendor %d/%d: %s — $%.2f (%d atomic %s)",
                i + 1, len(merchants), vendor.get("name"), usd_amt, amount_atomic, funding_asset,
            )

            if not vendor_principal or not vendor_principal.startswith("S"):
                failure_msg = (
                    f"Invalid Stacks principal: '{vendor_principal}'. "
                    "Merchant must have a valid Stacks address (starts with S)."
                )
                logger.error("[X402] ✗ %s failed: %s", vendor.get("name"), failure_msg)
                failures.append({
                    "commodity": vendor.get("name", "Unknown"),
                    "amount_usd": usd_amt,
                    "error": failure_msg,
                })
                continue

            try:
                # Call Node.js builder via subprocess
                tx_payload = {
                    "burnerPrivateKey": burner_private_key,
                    "recipientAddress": vendor_principal,
                    "amountAtomic": amount_atomic,
                    "contractAddress": contract_address,
                    "contractName": contract_name,
                    "network": STACKS_NETWORK,
                }

                result = await asyncio.get_event_loop().run_in_executor(
                    None, _call_stacks_tx_builder, tx_payload
                )

                tx_id = result.get("txId") or result.get("txHash", "unknown")
                logger.info("[X402] ✓ %s — txid: %s", vendor.get("name"), tx_id)

                item_usd = Decimal(str(usd_amt))
                total_usd += item_usd

                receipts.append({
                    "commodity": vendor.get("name", "Unknown"),
                    "merchant_address": vendor_principal,
                    "amount_usd": float(item_usd),
                    "tx_hash": tx_id,
                    "product_id": (vendor.get("products") or [{}])[0].get("product_id"),
                    "vendor_id": vendor.get("vendor_id"),
                    "network": f"Stacks {STACKS_NETWORK.capitalize()}",
                    "asset": funding_asset,
                })

            except Exception as exc:
                error_detail = str(exc)
                logger.error("[X402] ✗ %s failed: %s", vendor.get("name"), error_detail)
                failures.append({
                    "commodity": vendor.get("name", "Unknown"),
                    "amount_usd": usd_amt,
                    "error": error_detail,
                })

        if not receipts and failures:
            all_errors = "; ".join(f["error"] for f in failures)
            raise ValueError(f"All payments failed: {all_errors}")

        # ── Record order in DB ────────────────────────────────────────────────
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
            len(receipts), len(failures), total_usd, funding_asset,
        )

        return {
            "status": status,
            "receipts": receipts,
            "failures": failures,
            "network": f"Stacks {STACKS_NETWORK.capitalize()}",
            "asset": funding_asset,
            "details": (
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
            "status": "PAID",
            "txHash": primary_tx,
            "userWallet": user_wallet,
        })
        for receipt in receipts:
            product = None
            if receipt.get("product_id"):
                product = await db.product.find_unique(
                    where={"productID": receipt["product_id"]},
                    include={"vendor": True},
                )
            if product is None:
                matches = await db.product.find_many(
                    where={"name": {"contains": receipt["commodity"], "mode": "insensitive"}},
                    take=1,
                    include={"vendor": True},
                )
                product = matches[0] if matches else None
            if product is None:
                continue
            await db.orderitem.create(data={
                "orderId": order.id,
                "productId": product.id,
                "vendorId": product.vendorId,
                "quantity": 1,
                "price": Decimal(str(receipt["amount_usd"])),
            })