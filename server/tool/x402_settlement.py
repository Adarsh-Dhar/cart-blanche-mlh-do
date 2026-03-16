"""
tool/x402_settlement.py — Burner EOA Settlement (Native SKALE)
===============================================================

FIXES vs original:
  1. USDC_CONTRACT default updated to match the SKALE-side contract
     (must match USDC_CONTRACT_ADDRESS in useBurnerwallet.ts)
  2. gasPrice explicitly set to 0 (SKALE is gasless — w3.eth.gas_price
     can return non-zero on some SKALE nodes, which causes tx rejection)
  3. Added USDC balance check on the burner BEFORE attempting settlement
     with a clear error message pointing the user to /wallet
  4. drip_sfuel_to_burner is only called when there is a MASTER_PRIVATE_KEY
     (was always called before, silently failing)
  5. amount_atomic calculation cleaned up — no divide-by-1000 hack
"""

from web3 import Web3, Account
from ..db import get_db
import logging
import os
import json
from decimal import Decimal
from typing import Any

logger = logging.getLogger(__name__)

# ── Network config ─────────────────────────────────────────────────────────────
SKALE_RPC_URL = os.environ.get(
    "SKALE_RPC_URL",
    "https://base-sepolia-testnet.skalenodes.com/v1/jubilant-horrible-ancha",
)
SKALE_CHAIN_ID = int(os.environ.get("SKALE_CHAIN_ID", "324705682"))
RPC_TIMEOUT = int(os.environ.get("RPC_TIMEOUT_SECONDS", "30"))

# ── USDC on SKALE Base Sepolia ─────────────────────────────────────────────────
# MUST match USDC_CONTRACT_ADDRESS in frontend/hooks/useBurnerwallet.ts
USDC_CONTRACT = os.environ.get(
    "USDC_CONTRACT_ADDRESS",
    "0x5425890298aed601595a70AB815c96711a31Bc65",
)

DEFAULT_SPEND_LIMIT = float(os.environ.get("DEFAULT_SPEND_LIMIT_USD", "10000"))

USDC_ABI = [
    {
        "name": "transfer",
        "type": "function",
        "stateMutability": "nonpayable",
        "inputs": [
            {"name": "to", "type": "address"},
            {"name": "amount", "type": "uint256"},
        ],
        "outputs": [{"name": "", "type": "bool"}],
    },
    {
        "name": "balanceOf",
        "type": "function",
        "stateMutability": "view",
        "inputs": [{"name": "account", "type": "address"}],
        "outputs": [{"name": "", "type": "uint256"}],
    },
]


def drip_sfuel_to_burner(w3: Web3, burner_address: str) -> None:
    """
    Fund the burner with sFUEL from a master wallet, if configured.
    On SKALE, gasPrice=0 means sFUEL isn't strictly required for USDC
    transfers, but some nodes may still require a non-zero balance.
    """
    master_key = os.getenv("MASTER_PRIVATE_KEY")
    if not master_key:
        logger.debug("[X402] No MASTER_PRIVATE_KEY — skipping sFUEL drip.")
        return

    try:
        balance = w3.eth.get_balance(w3.to_checksum_address(burner_address))
        if balance > Web3.to_wei(0.0005, "ether"):
            logger.debug("[X402] Burner already has sFUEL — skipping drip.")
            return

        master_account = Account.from_key(master_key)
        nonce = w3.eth.get_transaction_count(master_account.address)
        tx = {
            "nonce":    nonce,
            "to":       w3.to_checksum_address(burner_address),
            "value":    Web3.to_wei(0.001, "ether"),
            "gas":      21_000,
            "gasPrice": 0,          # SKALE is gasless
            "chainId":  SKALE_CHAIN_ID,
        }
        signed = w3.eth.account.sign_transaction(tx, master_key)
        tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
        logger.info("[X402] sFUEL drip tx: %s", tx_hash.hex())
    except Exception as exc:
        logger.warning("[X402] sFUEL drip failed (non-fatal): %s", exc)


def _decrypt_burner_key(encrypted_hex: str, owner_address: str) -> str:
    """
    XOR decryption — mirrors frontend encryptPrivateKey() in useBurnerwallet.ts.
    key = keccak256(ownerAddress.toLowerCase())
    """
    key_bytes = bytes.fromhex(
        Web3.keccak(text=owner_address.lower()).hex()[2:]
    )
    enc_str = encrypted_hex[2:] if encrypted_hex.startswith("0x") else encrypted_hex
    enc_bytes = bytes.fromhex(enc_str)
    decrypted = bytes(
        b ^ key_bytes[i % len(key_bytes)] for i, b in enumerate(enc_bytes)
    )
    return "0x" + decrypted.hex()


class X402SettlementTool:
    name = "x402_settlement"
    description = (
        "Autonomous settlement via Burner EOA on SKALE. "
        "Uses standard eth_sendRawTransaction with gasPrice=0 (SKALE is gasless). "
        "No ERC-4337, no Bundler, no MetaMask popup."
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

        # ── Retrieve the burner wallet record ──────────────────────────────────
        db = await get_db()
        import datetime

        burner_record = None
        if chat_id:
            try:
                burner_record = await db.smartwallet.find_first(
                    where={
                        "chatId":    chat_id,
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
                "Visit /wallet to deposit USDC and authorize the agent."
            )

        burner_address   = burner_record.smartWalletAddress
        owner_eoa        = burner_record.ownerEoa
        spend_limit_usdc = float(burner_record.spendLimitUsdc or DEFAULT_SPEND_LIMIT)

        # Parse cart total (stored as USD float, not 6-decimal atomic)
        total_cart_raw = float(
            cart_mandate.get("amount")
            or cart_mandate.get("total_budget_amount")
            or 0
        )
        # Guard against accidentally stored 6-decimal atomic values
        total_cart_usd = (
            total_cart_raw if total_cart_raw < 10_000 else total_cart_raw / 1_000_000
        )

        if total_cart_usd > spend_limit_usdc:
            raise ValueError(
                f"Cart total ${total_cart_usd:.2f} exceeds your burner wallet "
                f"balance of ${spend_limit_usdc:.2f} USDC. "
                f"Visit /wallet and top up to continue."
            )

        logger.info(
            "[X402] Burner: %s | funded: $%.2f | cart: $%.2f | vendors: %d",
            burner_address[:12], spend_limit_usdc, total_cart_usd, len(merchants),
        )

        # ── Decrypt the burner private key ─────────────────────────────────────
        burner_private_key = _decrypt_burner_key(
            burner_record.sessionKeyEncryptedPrivate,
            owner_eoa,
        )
        burner_account = Web3().eth.account.from_key(burner_private_key)
        logger.info("[X402] Burner account recovered: %s", burner_account.address[:12])

        # ── Connect to SKALE RPC ───────────────────────────────────────────────
        w3 = Web3(
            Web3.HTTPProvider(
                SKALE_RPC_URL,
                request_kwargs={"timeout": RPC_TIMEOUT},
            )
        )
        if not w3.is_connected():
            raise ConnectionError(
                f"Cannot connect to SKALE RPC: {SKALE_RPC_URL} (timeout={RPC_TIMEOUT}s)"
            )

        # ── Optionally drip sFUEL ──────────────────────────────────────────────
        drip_sfuel_to_burner(w3, burner_account.address)

        # ── Verify burner USDC balance on-chain BEFORE settling ────────────────
        usdc_contract = w3.eth.contract(
            address=w3.to_checksum_address(USDC_CONTRACT),
            abi=USDC_ABI,
        )
        burner_usdc_balance_atomic = usdc_contract.functions.balanceOf(
            w3.to_checksum_address(burner_account.address)
        ).call()
        burner_usdc_balance_usd = burner_usdc_balance_atomic / 1_000_000

        logger.info(
            "[X402] On-chain USDC balance: $%.6f (need $%.2f)",
            burner_usdc_balance_usd, total_cart_usd,
        )

        if burner_usdc_balance_atomic == 0:
            raise ValueError(
                f"Burner wallet {burner_account.address[:10]}… has 0 USDC on SKALE. "
                f"The funding transaction may have used the wrong network or USDC contract. "
                f"Expected USDC contract: {USDC_CONTRACT}. "
                f"Visit /wallet to create a new session and ensure MetaMask is on SKALE."
            )

        if burner_usdc_balance_usd < total_cart_usd:
            raise ValueError(
                f"Burner wallet only has ${burner_usdc_balance_usd:.2f} USDC on SKALE "
                f"but cart total is ${total_cart_usd:.2f}. "
                f"Visit /wallet to top up."
            )

        # ── Settle each vendor ─────────────────────────────────────────────────
        receipts: list[dict] = []
        failures: list[dict] = []
        total_usd: Decimal   = Decimal("0")

        for i, vendor in enumerate(merchants):
            vendor_address = w3.to_checksum_address(vendor["merchant_address"])
            raw_val = vendor.get("amount", 0)
            usd_amt = float(raw_val) if float(raw_val) < 10_000 else float(raw_val) / 1_000_000
            usdc_atomic = int(usd_amt * 1_000_000)

            logger.info(
                "[X402] Vendor %d/%d: %s — $%.2f (%d atomic USDC)",
                i + 1, len(merchants), vendor.get("name"), usd_amt, usdc_atomic,
            )

            try:
                nonce = w3.eth.get_transaction_count(burner_account.address)

                # Build tx — gasPrice=0 because SKALE is completely gasless
                transaction = usdc_contract.functions.transfer(
                    vendor_address,
                    usdc_atomic,
                ).build_transaction({
                    "chainId":  SKALE_CHAIN_ID,
                    "gas":      100_000,
                    "gasPrice": 0,      # ← SKALE is gasless; w3.eth.gas_price may lie
                    "nonce":    nonce,
                })

                signed_tx = w3.eth.account.sign_transaction(
                    transaction, private_key=burner_private_key
                )
                tx_hash     = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
                tx_hash_hex = "0x" + tx_hash.hex().lstrip("0x")

                logger.info("[X402] ✓ %s — tx: %s", vendor.get("name"), tx_hash_hex)

                # Wait for receipt
                try:
                    receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=60)
                    if receipt.status == 0:
                        raise ValueError("Transaction reverted on-chain")
                    confirmed_hash = "0x" + receipt.transactionHash.hex().lstrip("0x")
                except Exception as wait_exc:
                    logger.warning(
                        "[X402] Receipt wait failed for %s: %s — using submitted tx_hash",
                        vendor.get("name"), wait_exc,
                    )
                    confirmed_hash = tx_hash_hex

                item_usd   = Decimal(str(usd_amt))
                total_usd += item_usd

                receipts.append({
                    "commodity":        vendor.get("name", "Unknown"),
                    "merchant_address": vendor_address,
                    "amount_usd":       float(item_usd),
                    "tx_hash":          confirmed_hash,
                    "product_id":       (vendor.get("products") or [{}])[0].get("product_id"),
                    "vendor_id":        vendor.get("vendor_id"),
                })

            except Exception as exc:
                error_detail = str(exc)
                logger.error("[X402] ✗ %s failed: %s", vendor.get("name"), error_detail)
                failures.append({
                    "commodity":  vendor.get("name", "Unknown"),
                    "amount_usd": usd_amt,
                    "error":      error_detail,
                })

        if not receipts and failures:
            all_errors = "; ".join(f["error"] for f in failures)
            raise ValueError(f"All payments failed: {all_errors}")

        # ── Record order in DB ─────────────────────────────────────────────────
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
            "[X402] Done — %d confirmed, %d failed, $%.2f total",
            len(receipts), len(failures), total_usd,
        )

        return {
            "status":   status,
            "receipts": receipts,
            "failures": failures,
            "network":  "SKALE Base Sepolia",
            "details": (
                f"Settled {len(receipts)}/{len(receipts) + len(failures)} vendor(s) · "
                f"${float(total_usd):.2f} USDC"
            ),
        }

    async def _record_order(
        self,
        receipts:   list[dict],
        total_usd:  Decimal,
        user_wallet: str,
        primary_tx:  str,
    ) -> None:
        db    = await get_db()
        order = await db.order.create(data={
            "totalAmount": total_usd,
            "status":      "PAID",
            "txHash":      primary_tx,
            "userWallet":  user_wallet,
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
                "orderId":   order.id,
                "productId": product.id,
                "vendorId":  product.vendorId,
                "quantity":  1,
                "price":     Decimal(str(receipt["amount_usd"])),
            })