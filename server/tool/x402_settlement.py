"""
tool/x402_settlement.py — Stacks Blockchain Settlement (SIP-010)
=================================================================

MIGRATED FROM: SKALE EVM / web3.py / ERC-20
MIGRATED TO:   Stacks Bitcoin L2 / SIP-010 tokens (USDCx / sBTC)

Architecture:
  - Python reads the burner wallet record and decrypts the private key
  - Python calls stacks_tx_builder.py (pure-Python) to construct, sign,
    and broadcast Stacks transactions — NO Node.js subprocess required.
  - XOR encryption key = sha256(stacksPrincipal) not keccak256(eoa)

Key differences from EVM version:
  1. No gasPrice=0 trick — Stacks requires STX for transaction fees
  2. drip_stx_to_burner() replaces drip_sfuel_to_burner()
  3. SIP-010 transfer function args: [amount, sender, recipient, memo]
  4. Pure-Python signing via stack_tx_builder.py
  5. XOR encryption key = sha256(stacksPrincipal) not keccak256(eoa)
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import os
import datetime
from decimal import Decimal
from typing import Any

from ..db import get_db

# Import the pure-Python Stacks transaction builder
from . import stack_tx_builder as stacks_builder

logger = logging.getLogger(__name__)

# ── Stacks network config ──────────────────────────────────────────────────────
STACKS_NETWORK = os.environ.get("STACKS_NETWORK", "testnet")  # "testnet" | "mainnet"
IS_TESTNET = STACKS_NETWORK == "testnet"

# ── SIP-010 contract addresses ─────────────────────────────────────────────────
USDCX_CONTRACT_ADDRESS = os.environ.get(
    "USDCX_CONTRACT_ADDRESS",
    "ST2YR7WFYKW5D6Y8FK6C0CT0YP5DXCKSNDACMTHB4",
)
USDCX_CONTRACT_NAME = os.environ.get("USDCX_CONTRACT_NAME", "usdcx-token")

SBTC_CONTRACT_ADDRESS = os.environ.get(
    "SBTC_CONTRACT_ADDRESS",
    "ST2YR7WFYKW5D6Y8FK6C0CT0YP5DXCKSNDACMTHB4",
)
SBTC_CONTRACT_NAME = os.environ.get("SBTC_CONTRACT_NAME", "sbtc-token")

# Master Stacks wallet (holds STX for dripping to burners)
MASTER_STACKS_PRIVATE_KEY = os.environ.get("MASTER_STACKS_PRIVATE_KEY", "")
MASTER_STACKS_ADDRESS = os.environ.get("MASTER_STACKS_ADDRESS", "")

DEFAULT_SPEND_LIMIT = float(os.environ.get("DEFAULT_SPEND_LIMIT_USD", "10000"))
STX_DRIP_AMOUNT = int(os.environ.get("STX_DRIP_ATOMIC", "500000"))  # 0.5 STX


# ── XOR decryption using sha256 (mirrors frontend useBurnerwallet.ts) ─────────
def _decrypt_burner_key(encrypted_hex: str, owner_principal: str) -> str:
    """
    XOR decrypt the burner private key.
    key = sha256(ownerPrincipal.lower())
    Mirrors frontend encryptPrivateKey() in useBurnerwallet.ts
    """
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
    """Returns (contractAddress, contractName, decimals) for the given asset."""
    if funding_asset == "sBTC":
        return SBTC_CONTRACT_ADDRESS, SBTC_CONTRACT_NAME, 8
    # Default: USDCx
    return USDCX_CONTRACT_ADDRESS, USDCX_CONTRACT_NAME, 6


def drip_stx_to_burner(burner_address: str) -> None:
    """
    Send STX from the master wallet to the burner so it can pay tx fees.
    Unlike SKALE (gasless), Stacks requires STX for every transaction.
    """
    if not MASTER_STACKS_PRIVATE_KEY or not MASTER_STACKS_ADDRESS:
        logger.debug("[X402] No MASTER_STACKS_PRIVATE_KEY — skipping STX drip.")
        return

    try:
        result = stacks_builder.build_and_broadcast_stx_transfer(
            private_key_hex=MASTER_STACKS_PRIVATE_KEY,
            recipient_address=burner_address,
            amount_ustx=STX_DRIP_AMOUNT,
            testnet=IS_TESTNET,
        )
        logger.info("[X402] STX drip tx: %s", result.get("txid", "unknown"))
    except Exception as exc:
        # Non-fatal — the burner may already have enough STX
        logger.warning("[X402] STX drip failed (non-fatal): %s", exc)


def _settle_vendor_sync(
    burner_private_key: str,
    vendor_principal: str,
    amount_atomic: int,
    contract_address: str,
    contract_name: str,
) -> dict:
    """
    Synchronous SIP-010 transfer via pure-Python builder.
    Runs in a thread executor so it doesn't block the event loop.
    """
    return stacks_builder.build_and_broadcast_sip010_transfer(
        private_key_hex=burner_private_key,
        recipient_address=vendor_principal,
        amount_atomic=amount_atomic,
        contract_address=contract_address,
        contract_name=contract_name,
        testnet=IS_TESTNET,
    )


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

        burner_address = burner_record.smartWalletAddress   # Stacks principal
        owner_principal = burner_record.ownerEoa            # Stacks principal stored in ownerEoa
        spend_limit_usdc = float(burner_record.spendLimitUsdc or DEFAULT_SPEND_LIMIT)

        # Detect funding asset (defaults to USDCx for backward compat)
        funding_asset: str = getattr(burner_record, "fundingAsset", None) or "USDCx"

        # Normalise total cart amount (could be raw USD float or micro-units)
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

        # ── Decrypt burner private key ────────────────────────────────────────
        burner_private_key = _decrypt_burner_key(
            burner_record.sessionKeyEncryptedPrivate,
            owner_principal,
        )
        logger.info("[X402] Burner key decrypted for principal: %s", burner_address[:16])

        # ── Drip STX to burner for fees (non-blocking) ────────────────────────
        await asyncio.get_event_loop().run_in_executor(
            None, drip_stx_to_burner, burner_address
        )

        # ── Get SIP-010 contract config ───────────────────────────────────────
        contract_address, contract_name, decimals = _get_token_config(funding_asset)

        # ── Settle each vendor ────────────────────────────────────────────────
        receipts: list[dict] = []
        failures: list[dict] = []
        total_usd: Decimal = Decimal("0")
        loop = asyncio.get_event_loop()

        for i, vendor in enumerate(merchants):
            vendor_principal = vendor.get("merchant_address", "")
            raw_val = float(vendor.get("amount", 0))
            usd_amt = raw_val if raw_val < 10_000 else raw_val / 1_000_000
            amount_atomic = int(usd_amt * (10 ** decimals))

            logger.info(
                "[X402] Vendor %d/%d: %s — $%.2f (%d atomic %s)",
                i + 1, len(merchants), vendor.get("name"), usd_amt, amount_atomic, funding_asset,
            )

            # Validate Stacks principal
            if not vendor_principal or not vendor_principal.startswith("S"):
                failure_msg = (
                    f"Invalid Stacks principal: '{vendor_principal}'. "
                    "Merchant must have a valid Stacks address (starts with S)."
                )
                logger.error("[X402] ✗ %s: %s", vendor.get("name"), failure_msg)
                failures.append({
                    "commodity":  vendor.get("name", "Unknown"),
                    "amount_usd": usd_amt,
                    "error":      failure_msg,
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
                    _settle_vendor_sync,
                    burner_private_key,
                    vendor_principal,
                    amount_atomic,
                    contract_address,
                    contract_name,
                )

                tx_id = result.get("txid") or result.get("txHash", "unknown")
                logger.info("[X402] ✓ %s — txid: %s", vendor.get("name"), tx_id)

                item_usd = Decimal(str(usd_amt))
                total_usd += item_usd

                receipts.append({
                    "commodity":       vendor.get("name", "Unknown"),
                    "merchant_address": vendor_principal,
                    "amount_usd":      float(item_usd),
                    "tx_hash":         tx_id,
                    "product_id":      (vendor.get("products") or [{}])[0].get("product_id"),
                    "vendor_id":       vendor.get("vendor_id"),
                    "network":         f"Stacks {STACKS_NETWORK.capitalize()}",
                    "asset":           funding_asset,
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

            # Try exact productID match first
            if receipt.get("product_id"):
                try:
                    product = await db.product.find_unique(
                        where={"productID": receipt["product_id"]},
                    )
                except Exception:
                    pass

            # Fall back to name search
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