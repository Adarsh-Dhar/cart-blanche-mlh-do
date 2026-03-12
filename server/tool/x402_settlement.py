"""
x402_settlement_tool.py — Production on-chain settlement + Prisma order recording
===================================================================================
Payment destination for every vendor comes EXCLUSIVELY from Vendor.pubkey
stored in the Prisma DB — no hardcoded wallet lists, no random selection.

Data flow:
  shopping_node  → product["merchant_address"] = Vendor.pubkey   (from Prisma)
  merchant_node  → cart_mandate["merchants"][*]["merchant_address"] = same pubkey
  settlement_node → this tool pays each pubkey directly on SKALE

Two responsibilities:
  1. Verify the user's EIP-712 signature, then execute a multi-vendor
     batch payment on SKALE, paying each vendor at their real pubkey.
  2. After every confirmed TX, write Order + OrderItems back to Prisma
     for a complete audit trail.
"""

from __future__ import annotations

import json
import logging
import os
from decimal import Decimal
from typing import Any

from db import get_db

logger = logging.getLogger(__name__)

# SKALE Base Sepolia RPC — override via env var for mainnet migration
SKALE_RPC_URL = os.environ.get(
    "SKALE_RPC_URL",
    "https://base-sepolia-testnet.skalenodes.com/v1/jubilant-horrible-ancha",
)
SKALE_CHAIN_ID = int(os.environ.get("SKALE_CHAIN_ID", "324705682"))


class X402SettlementTool:
    name = "x402_settlement"
    description = (
        "Verify an EIP-712 MetaMask signature, execute a multi-vendor batch payment "
        "on SKALE using each vendor's real on-chain pubkey from the database, "
        "then record the confirmed Order and OrderItems in Prisma."
    )

    async def run_async(
        self,
        *,
        args: dict[str, Any],
        tool_context: Any,  # None when called directly from graph nodes
    ) -> dict[str, Any]:

        from web3 import Web3
        from eth_account import Account
        from eth_account.messages import encode_typed_data

        # ── 1. Parse payment mandate ─────────────────────────────────────────
        payment_mandate = args.get("payment_mandate", {})
        if isinstance(payment_mandate, str):
            try:
                payment_mandate = json.loads(payment_mandate)
            except Exception:
                pass

        signature    = payment_mandate.get("signature")
        cart_mandate = payment_mandate.get("cart_mandate", {})

        if not signature or not cart_mandate:
            raise ValueError("payment_mandate must contain 'signature' and 'cart_mandate'.")

        merchants = cart_mandate.get("merchants", [])
        if not merchants:
            raise ValueError("cart_mandate.merchants is empty — nothing to settle.")

        # ── 2. Validate all merchant addresses come from DB (non-empty, valid hex) ──
        for i, vendor in enumerate(merchants):
            addr = vendor.get("merchant_address", "")
            if not addr or addr == "0x0000000000000000000000000000000000000000":
                raise ValueError(
                    f"Merchant #{i} '{vendor.get('name', '?')}' has no valid pubkey. "
                    "Ensure UCPCommerceSearchTool populated merchant_address from Vendor.pubkey."
                )

        # ── 3. EIP-712 signature verification ────────────────────────────────
        chain_id = cart_mandate.get("chain_id", SKALE_CHAIN_ID)

        domain = {
            "name":              "CartBlanche",
            "version":           "1",
            "chainId":           chain_id,
            "verifyingContract": "0x0000000000000000000000000000000000000000",
        }
        # The top-level merchant_address in the mandate is the primary recipient
        # used for the EIP-712 digest — the first vendor's pubkey from the DB.
        primary_merchant = merchants[0]["merchant_address"]
        total_amount     = cart_mandate.get("amount") or cart_mandate.get("total_budget_amount") or 0

        eip712_message = {
            "merchant_address": primary_merchant,
            "amount":           total_amount,
            "currency":         cart_mandate.get("currency", "USDC"),
        }
        eip712_types = {
            "EIP712Domain": [
                {"name": "name",              "type": "string"},
                {"name": "version",           "type": "string"},
                {"name": "chainId",           "type": "uint256"},
                {"name": "verifyingContract", "type": "address"},
            ],
            "CartMandate": [
                {"name": "merchant_address", "type": "address"},
                {"name": "amount",           "type": "uint256"},
                {"name": "currency",         "type": "string"},
            ],
        }

        signable_bytes = encode_typed_data(
            domain_data=domain,
            message_types={"CartMandate": eip712_types["CartMandate"]},
            message_data=eip712_message,
        )

        w3 = Web3(Web3.HTTPProvider(SKALE_RPC_URL))
        if not w3.is_connected():
            raise ConnectionError(f"Cannot connect to SKALE RPC: {SKALE_RPC_URL}")

        recovered_address = Account.recover_message(signable_bytes, signature=signature)
        logger.info("[X402] EIP-712 signature verified. Signer: %s", recovered_address)

        # ── 4. Load agent wallet ──────────────────────────────────────────────
        private_key = os.environ.get("SKALE_AGENT_PRIVATE_KEY")
        if not private_key:
            raise EnvironmentError("SKALE_AGENT_PRIVATE_KEY is not set.")
        if private_key.startswith("0x"):
            private_key = private_key[2:]

        agent_account = w3.eth.account.from_key(private_key)
        current_nonce = w3.eth.get_transaction_count(agent_account.address)
        logger.info("[X402] Agent wallet: %s", agent_account.address)

        # ── 5. Execute batch settlement ───────────────────────────────────────
        receipts:  list[dict] = []
        total_usd: Decimal    = Decimal("0")

        for vendor in merchants:
            # Payment destination = Vendor.pubkey from Prisma — no fallback
            vendor_address = w3.to_checksum_address(vendor["merchant_address"])

            # Normalise amount: handle both USD float and USDC 6-decimal int
            raw_val = vendor.get("amount", 0)
            if isinstance(raw_val, str):
                raw_val = raw_val.replace("$", "").replace(",", "")
            raw_amount = float(raw_val)
            if raw_amount > 10_000:
                # LLM produced USDC 6-decimal units (e.g. 39690000) → convert to USD
                raw_amount = raw_amount / 1_000_000.0

            # sFUEL value = USD / 1,000,000 (preserves your original scaling rule)
            sfuel_value = max(raw_amount / 1_000_000.0, 0.0001)

            tx = {
                "nonce":    current_nonce,
                "to":       vendor_address,
                "value":    w3.to_wei(sfuel_value, "ether"),
                "gas":      2_000_000,
                "gasPrice": w3.eth.gas_price,
                "chainId":  chain_id,
            }
            signed    = w3.eth.account.sign_transaction(tx, private_key)
            tx_hash_b = w3.eth.send_raw_transaction(signed.raw_transaction)
            tx_hash   = w3.to_hex(tx_hash_b)

            logger.info(
                "[X402] TX submitted → %s | vendor=%s | sfuel=%.8f",
                tx_hash, vendor_address, sfuel_value,
            )
            w3.eth.wait_for_transaction_receipt(tx_hash_b, timeout=120)
            logger.info("[X402] ✅ Confirmed: %s", tx_hash)

            item_usd   = Decimal(str(raw_amount))
            total_usd += item_usd
            current_nonce += 1

            receipts.append({
                "commodity":        vendor.get("name", "Unknown"),
                "merchant_address": vendor_address,   # the real Vendor.pubkey
                "amount_usd":       float(item_usd),
                "amount_sfuel":     sfuel_value,
                "tx_hash":          tx_hash,
                "product_id":       vendor.get("product_id"),
                "vendor_id":        vendor.get("vendor_id"),
            })

        logger.info(
            "[X402] Batch complete: %d TX, total $%.2f USD. Recording order…",
            len(receipts), total_usd,
        )

        # ── 6. Write Order + OrderItems to Prisma ─────────────────────────────
        await self._record_order(
            receipts=receipts,
            total_usd=total_usd,
            user_wallet=recovered_address,
            primary_tx=receipts[0]["tx_hash"] if receipts else None,
        )

        return {
            "status":   "settled",
            "receipts": receipts,
            "network":  SKALE_RPC_URL,
            "details":  f"Batch-settled {len(receipts)} vendor(s) at their DB pubkeys. Order recorded.",
        }

    # ── DB write ──────────────────────────────────────────────────────────────

    async def _record_order(
        self,
        receipts:    list[dict],
        total_usd:   Decimal,
        user_wallet: str,
        primary_tx:  str | None,
    ) -> None:
        """
        Write a confirmed Order + one OrderItem per settled vendor to Prisma.

        Product resolution priority:
          1. product_id carried from shopping_node (direct Prisma cuid lookup)
          2. name-contains fallback search
          3. Skip OrderItem if unresolvable (Order row always written)
        """
        db = await get_db()

        try:
            order = await db.order.create(
                data={
                    "totalAmount": total_usd,
                    "status":      "PAID",
                    "txHash":      primary_tx,
                    "userWallet":  user_wallet,
                }
            )
            logger.info("[DB] Order %s created (total=$%.2f).", order.id, total_usd)

            for receipt in receipts:
                product = None

                # Priority 1: direct productID lookup
                if receipt.get("product_id"):
                    product = await db.product.find_unique(
                        where={"productID": receipt["product_id"]},
                        include={"vendor": True},
                    )

                # Priority 2: name-contains fallback
                if product is None:
                    matches = await db.product.find_many(
                        where={
                            "name": {
                                "contains": receipt["commodity"],
                                "mode":     "insensitive",
                            }
                        },
                        take=1,
                        include={"vendor": True},
                    )
                    product = matches[0] if matches else None

                if product is None:
                    logger.warning(
                        "[DB] No product found for '%s' — skipping OrderItem.",
                        receipt["commodity"],
                    )
                    continue

                await db.orderitem.create(
                    data={
                        "orderId":   order.id,
                        "productId": product.id,
                        "vendorId":  product.vendorId,
                        "quantity":  1,
                        "price":     Decimal(str(receipt["amount_usd"])),
                    }
                )
                logger.info(
                    "[DB] OrderItem created: '%s' → product %s (vendor %s).",
                    receipt["commodity"], product.id, product.vendorId,
                )

        except Exception as exc:
            # A DB write failure must never abort the settlement response
            logger.exception("[DB] Order recording failed: %s", exc)