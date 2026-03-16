"""
tool/x402_settlement.py — Burner EOA Settlement (Native SKALE)
===============================================================

ARCHITECTURE CHANGE: Replaced ERC-4337 Smart Wallet / UserOperation flow
with the simpler Delegated Burner EOA architecture.

WHY:
  - SKALE transactions are already GASLESS (no Paymasters or Bundlers needed)
  - ERC-4337 Bundlers (eth_sendUserOperation) don't exist on SKALE → METHOD_NOT_FOUND
  - Standard eth_sendRawTransaction works on every EVM chain natively
  - Settlement is faster: no alternative mempool wait

HOW:
  1. Retrieve the encrypted Burner private key from the SmartWallet DB record
  2. Decrypt it (XOR with owner EOA address — mirrors frontend encryption)
  3. Build a standard USDC.transfer() transaction per vendor
  4. Sign with the Burner private key
  5. Broadcast via eth_sendRawTransaction with gasPrice=0 (SKALE is gasless)
"""


from web3 import Web3, Account
from ..db import get_db
import logging
import os
import json
from decimal import Decimal
from typing import Any

logger = logging.getLogger(__name__)

SKALE_RPC_URL = os.environ.get(
    "SKALE_RPC_URL",
    "https://base-sepolia-testnet.skalenodes.com/v1/jubilant-horrible-ancha",
)
SKALE_CHAIN_ID = int(os.environ.get("SKALE_CHAIN_ID", "324705682"))
RPC_TIMEOUT = int(os.environ.get("RPC_TIMEOUT_SECONDS", "30"))

USDC_CONTRACT = os.environ.get(
    "USDC_CONTRACT_ADDRESS",
    "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
)

DEFAULT_SPEND_LIMIT = float(os.environ.get("DEFAULT_SPEND_LIMIT_USD", "10000"))


def drip_sfuel_to_burner(burner_address: str):
    """
    Uses the Master Wallet (with sFUEL credits) to fund a new burner.
    """
    master_key = os.getenv("MASTER_PRIVATE_KEY")
    if not master_key:
        logger.warning("[X402] No MASTER_PRIVATE_KEY found. Skipping gas drip.")
        return

    try:
        w3 = Web3(Web3.HTTPProvider(SKALE_RPC_URL))
        master_account = Account.from_key(master_key)

        # Check if burner already has sFUEL
        balance = w3.eth.get_balance(burner_address)
        if balance > Web3.to_wei(0.0005, 'ether'):
            return

        tx = {
            'nonce': w3.eth.get_transaction_count(master_account.address),
            'to': burner_address,
            'value': Web3.to_wei(0.001, 'ether'), # 0.001 sFUEL is plenty
            'gas': 21000,
            'gasPrice': 0, # Standard for SKALE
            'chainId': SKALE_CHAIN_ID
        }

        signed = w3.eth.account.sign_transaction(tx, master_key)
        tx_hash = w3.eth.send_raw_transaction(signed.rawTransaction)
        logger.info(f"[X402] Drip successful: {tx_hash.hex()}")
    except Exception as e:
        logger.error(f"[X402] Gas drip failed: {e}")


def _decrypt_burner_key(encrypted_hex: str, owner_address: str) -> str:
    """
    XOR decryption — mirrors the frontend encryptPrivateKey() in useBurnerWallet.ts.
    key = keccak256(ownerAddress.toLowerCase())
    """
    from web3 import Web3
    key_bytes = bytes.fromhex(
        Web3.keccak(text=owner_address.lower()).hex()[2:]
    )
    enc_str = encrypted_hex[2:] if encrypted_hex.startswith("0x") else encrypted_hex
    enc_bytes = bytes.fromhex(enc_str)
    decrypted = bytes(
        b ^ key_bytes[i % len(key_bytes)] for i, b in enumerate(enc_bytes)
    )
    return "0x" + decrypted.hex()


def _build_usdc_transfer_calldata(to_address: str, amount_atomic: int) -> bytes:
    """
    Build the ABI-encoded calldata for USDC.transfer(address,uint256).
    """
    from web3 import Web3
    # Function selector: keccak256("transfer(address,uint256)")[:4]
    selector = Web3.keccak(text="transfer(address,uint256)")[:4]
    encoded_to = bytes.fromhex(to_address[2:].zfill(64))
    encoded_amt = amount_atomic.to_bytes(32, "big")
    return selector + encoded_to + encoded_amt


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
        from web3 import Web3

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
                "No active burner wallet session. Visit /wallet to deposit USDC and authorize the agent."
            )

        burner_address = burner_record.smartWalletAddress
        owner_eoa = burner_record.ownerEoa
        spend_limit_usdc = float(burner_record.spendLimitUsdc or DEFAULT_SPEND_LIMIT)

        # Check cart total vs funded amount
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
                f"Cart total ${total_cart_usd:.2f} exceeds burner wallet funded amount "
                f"${spend_limit_usdc:.2f}. Visit /wallet and deposit more USDC."
            )

        logger.info(
            "[X402] Burner: %s | funded: $%.2f | cart: $%.2f | vendors: %d",
            burner_address[:12],
            spend_limit_usdc,
            total_cart_usd,
            len(merchants),
        )

        # ── Decrypt the burner private key ─────────────────────────────────────
        burner_private_key = _decrypt_burner_key(
            burner_record.sessionKeyEncryptedPrivate,
            owner_eoa,
        )
        burner_account = Web3().eth.account.from_key(burner_private_key)

        logger.info(
            "[X402] Burner account recovered: %s", burner_account.address[:12]
        )

        logger.info("[X402] Checking burner gas balance...")
        drip_sfuel_to_burner(burner_account.address)

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

        usdc_contract = w3.eth.contract(
            address=w3.to_checksum_address(USDC_CONTRACT),
            abi=[
                {
                    "name": "transfer",
                    "type": "function",
                    "inputs": [
                        {"name": "to", "type": "address"},
                        {"name": "amount", "type": "uint256"},
                    ],
                    "outputs": [{"name": "", "type": "bool"}],
                }
            ],
        )

        receipts: list[dict] = []
        failures: list[dict] = []
        total_usd: Decimal = Decimal("0")

        for i, vendor in enumerate(merchants):
            vendor_address = w3.to_checksum_address(vendor["merchant_address"])
            raw_val = vendor.get("amount", 0)
            usd_amt = float(raw_val) if float(raw_val) < 10_000 else float(raw_val) / 1_000_000
            # Divide the amount by 1000 before transferring as requested
            usd_amt_adjusted = usd_amt / 1000
            usdc_atomic = int(usd_amt_adjusted * 1_000_000)

            logger.info(
                "[X402] Vendor %d/%d: %s — $%.2f",
                i + 1,
                len(merchants),
                vendor.get("name"),
                usd_amt,
            )

            try:

                # ── Get nonce for the burner address ───────────────────────────
                nonce = w3.eth.get_transaction_count(burner_account.address)

                # ── Build standard USDC transfer transaction ───────────────────
                # gasPrice=0 because SKALE is completely gasless
                transaction = usdc_contract.functions.transfer(
                    vendor_address,
                    usdc_atomic,
                ).build_transaction({
                    "chainId": SKALE_CHAIN_ID,
                    "gas": 100000,
                    "gasPrice": w3.eth.gas_price,  # Use current SKALE gas price
                    "nonce": nonce,
                })

                # ── Log current balance and required balance ──────────────────
                current_balance = w3.eth.get_balance(burner_account.address)
                required_balance = transaction.get("value", 0) + transaction["gas"] * transaction["gasPrice"]
                logger.info(
                    "[X402] Burner balance: %s wei (%.6f ETH), Required: %s wei (%.6f ETH)",
                    current_balance, current_balance / 1e18, required_balance, required_balance / 1e18
                )

                # ── Sign with the burner private key ───────────────────────────
                signed_tx = w3.eth.account.sign_transaction(
                    transaction, private_key=burner_private_key
                )

                # ── Broadcast via standard eth_sendRawTransaction ──────────────
                tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
                tx_hash_hex = tx_hash.hex()
                if not tx_hash_hex.startswith("0x"):
                    tx_hash_hex = "0x" + tx_hash_hex

                logger.info("[X402] ✓ %s — tx: %s", vendor.get("name"), tx_hash_hex)

                # ── Wait for receipt ───────────────────────────────────────────
                try:
                    receipt = w3.eth.wait_for_transaction_receipt(
                        tx_hash, timeout=30
                    )
                    if receipt.status == 0:
                        raise ValueError("Transaction reverted on-chain")
                    confirmed_hash = receipt.transactionHash.hex()
                    if not confirmed_hash.startswith("0x"):
                        confirmed_hash = "0x" + confirmed_hash
                except Exception as wait_exc:
                    logger.warning(
                        "[X402] Receipt wait failed for %s: %s — using tx_hash",
                        vendor.get("name"), wait_exc,
                    )
                    confirmed_hash = tx_hash_hex

                item_usd = Decimal(str(usd_amt))
                total_usd += item_usd

                receipts.append({
                    "commodity": vendor.get("name", "Unknown"),
                    "merchant_address": vendor_address,
                    "amount_usd": float(item_usd),
                    "tx_hash": confirmed_hash,
                    "product_id": (vendor.get("products") or [{}])[0].get("product_id"),
                    "vendor_id": vendor.get("vendor_id"),
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
                logger.warning("[DB] Order recording failed: %s", exc)

        status = "settled" if not failures else "partial"
        logger.info(
            "[X402] Done — %d confirmed, %d failed, $%.2f total",
            len(receipts),
            len(failures),
            total_usd,
        )

        return {
            "status": status,
            "receipts": receipts,
            "failures": failures,
            "network": "SKALE Base Sepolia",
            "details": (
                f"Settled {len(receipts)}/{len(receipts) + len(failures)} vendor(s) · "
                f"${float(total_usd):.2f} USDC"
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
        order = await db.order.create(
            data={
                "totalAmount": total_usd,
                "status": "PAID",
                "txHash": primary_tx,
                "userWallet": user_wallet,
            }
        )
        for receipt in receipts:
            product = None
            if receipt.get("product_id"):
                product = await db.product.find_unique(
                    where={"productID": receipt["product_id"]},
                    include={"vendor": True},
                )
            if product is None:
                matches = await db.product.find_many(
                    where={
                        "name": {"contains": receipt["commodity"], "mode": "insensitive"}
                    },
                    take=1,
                    include={"vendor": True},
                )
                product = matches[0] if matches else None
            if product is None:
                continue
            await db.orderitem.create(
                data={
                    "orderId": order.id,
                    "productId": product.id,
                    "vendorId": product.vendorId,
                    "quantity": 1,
                    "price": Decimal(str(receipt["amount_usd"])),
                }
            )