"""
tool/x402_settlement.py — Smart Wallet + Session Key Settlement (ERC-4337)

Fixes:
- Added 10s timeout to Web3 HTTPProvider (was hanging indefinitely)
- Reduced _wait_for_user_op polling from 20*2s=40s to 5*1s=5s
- Separates confirmed receipts from failures (no fake 0xPENDING hashes)
"""

from __future__ import annotations
import json
import logging
import os
from decimal import Decimal
from typing import Any

from ..db import get_db

logger = logging.getLogger(__name__)

SKALE_RPC_URL   = os.environ.get(
    "SKALE_RPC_URL",
    "https://base-sepolia-testnet.skalenodes.com/v1/jubilant-horrible-ancha",
)
SKALE_CHAIN_ID  = int(os.environ.get("SKALE_CHAIN_ID", "324705682"))
BUNDLER_RPC_URL = os.environ.get("BUNDLER_RPC_URL", SKALE_RPC_URL)

ENTRY_POINT_ADDRESS = os.environ.get(
    "ENTRY_POINT_ADDRESS",
    "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
)
USDC_CONTRACT = os.environ.get(
    "USDC_CONTRACT_ADDRESS",
    "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
)

DEFAULT_SPEND_LIMIT = float(os.environ.get("DEFAULT_SPEND_LIMIT_USD", "10000"))
RPC_TIMEOUT = int(os.environ.get("RPC_TIMEOUT_SECONDS", "10"))


def _decrypt_session_key(encrypted_hex: str, owner_address: str) -> str:
    from web3 import Web3
    key_bytes = bytes.fromhex(Web3.keccak(text=owner_address.lower()).hex()[2:])
    enc_bytes = bytes.fromhex(encrypted_hex[2:] if encrypted_hex.startswith("0x") else encrypted_hex)
    decrypted = bytes(b ^ key_bytes[i % len(key_bytes)] for i, b in enumerate(enc_bytes))
    return "0x" + decrypted.hex()


def _build_usdc_transfer_calldata(to_address: str, amount_atomic: int) -> str:
    from web3 import Web3
    selector    = Web3.keccak(text="transfer(address,uint256)")[:4]
    encoded_to  = bytes.fromhex(to_address[2:].zfill(64))
    encoded_amt = amount_atomic.to_bytes(32, "big")
    return "0x" + selector.hex() + encoded_to.hex() + encoded_amt.hex()


def _build_execute_calldata(target: str, value: int, inner_calldata: str) -> str:
    from web3 import Web3
    selector       = Web3.keccak(text="execute(address,uint256,bytes)")[:4]
    encoded_target = bytes.fromhex(target[2:].zfill(64))
    encoded_value  = value.to_bytes(32, "big")
    inner_bytes    = bytes.fromhex(inner_calldata[2:] if inner_calldata.startswith("0x") else inner_calldata)
    offset  = (96).to_bytes(32, "big")
    length  = len(inner_bytes).to_bytes(32, "big")
    padding = b"\x00" * ((32 - len(inner_bytes) % 32) % 32)
    return (
        "0x"
        + selector.hex()
        + encoded_target.hex()
        + encoded_value.hex()
        + offset.hex()
        + length.hex()
        + inner_bytes.hex()
        + padding.hex()
    )


class X402SettlementTool:
    name = "x402_settlement"
    description = "Autonomous ERC-4337 settlement via Smart Wallet session key."

    async def run_async(self, *, args: dict[str, Any], tool_context: Any) -> dict[str, Any]:
        from web3 import Web3

        payment_mandate = args.get("payment_mandate", {})
        if isinstance(payment_mandate, str):
            try:
                payment_mandate = json.loads(payment_mandate)
            except Exception:
                pass

        cart_mandate = payment_mandate.get("cart_mandate", {})
        chat_id      = payment_mandate.get("chat_id")

        if not cart_mandate:
            raise ValueError("payment_mandate must contain 'cart_mandate'.")

        merchants = cart_mandate.get("merchants", [])
        if not merchants:
            raise ValueError("cart_mandate.merchants is empty.")

        # Look up session key
        db = await get_db()
        smart_wallet_record = None

        if chat_id:
            try:
                smart_wallet_record = await db.smartwallet.find_first(
                    where={
                        "chatId":    chat_id,
                        "expiresAt": {"gt": __import__("datetime").datetime.utcnow()},
                    }
                )
            except Exception:
                pass

        if smart_wallet_record is None:
            smart_wallet_record = await db.smartwallet.find_first(
                where={"expiresAt": {"gt": __import__("datetime").datetime.utcnow()}},
                order={"createdAt": "desc"},
            )

        if smart_wallet_record is None:
            raise ValueError("No active Smart Wallet session key. Visit /wallet to authorize.")

        smart_wallet_address = smart_wallet_record.smartWalletAddress
        owner_eoa            = smart_wallet_record.ownerEoa

        spend_limit_usdc = float(smart_wallet_record.spendLimitUsdc or DEFAULT_SPEND_LIMIT)
        if spend_limit_usdc < DEFAULT_SPEND_LIMIT:
            spend_limit_usdc = DEFAULT_SPEND_LIMIT

        total_cart_raw = float(cart_mandate.get("amount") or cart_mandate.get("total_budget_amount") or 0)
        total_cart_usd = total_cart_raw if total_cart_raw < 10_000 else total_cart_raw / 1_000_000

        if total_cart_usd > spend_limit_usdc:
            raise ValueError(
                f"Cart total ${total_cart_usd:.2f} exceeds session spend limit "
                f"${spend_limit_usdc:.2f}. Visit /wallet to increase your limit."
            )

        logger.info(
            "[X402] Wallet: %s | limit: $%.2f | cart: $%.2f | vendors: %d",
            smart_wallet_address[:12], spend_limit_usdc, total_cart_usd, len(merchants),
        )

        session_private_key = _decrypt_session_key(
            smart_wallet_record.sessionKeyEncryptedPrivate,
            owner_eoa,
        )
        session_account = Web3().eth.account.from_key(session_private_key)

        # Connect with explicit timeout — prevents hanging on slow/unresponsive RPC
        w3 = Web3(Web3.HTTPProvider(
            SKALE_RPC_URL,
            request_kwargs={"timeout": RPC_TIMEOUT},
        ))
        if not w3.is_connected():
            raise ConnectionError(
                f"Cannot connect to SKALE RPC: {SKALE_RPC_URL} (timeout={RPC_TIMEOUT}s)"
            )

        try:
            nonce_raw = w3.eth.call({
                "to": ENTRY_POINT_ADDRESS,
                "data": "0x35567e1a" + smart_wallet_address[2:].zfill(64) + "0" * 48,
            })
            nonce = int(nonce_raw.hex(), 16) if nonce_raw else 0
        except Exception:
            nonce = 0

        receipts: list[dict] = []
        failures: list[dict] = []
        total_usd: Decimal   = Decimal("0")

        for i, vendor in enumerate(merchants):
            vendor_address = w3.to_checksum_address(vendor["merchant_address"])
            raw_val        = vendor.get("amount", 0)
            usd_amt        = float(raw_val) if float(raw_val) < 10_000 else float(raw_val) / 1_000_000
            usdc_atomic    = int(usd_amt * 1_000_000)

            logger.info("[X402] Vendor %d/%d: %s — $%.2f", i + 1, len(merchants), vendor.get("name"), usd_amt)

            usdc_calldata = _build_usdc_transfer_calldata(vendor_address, usdc_atomic)
            call_data     = _build_execute_calldata(USDC_CONTRACT, 0, usdc_calldata)

            user_op = {
                "sender":               smart_wallet_address,
                "nonce":                hex(nonce + i),
                "initCode":             "0x",
                "callData":             call_data,
                "callGasLimit":         hex(200_000),
                "verificationGasLimit": hex(150_000),
                "preVerificationGas":   hex(50_000),
                "maxFeePerGas":         hex(w3.eth.gas_price),
                "maxPriorityFeePerGas": hex(w3.eth.gas_price),
                "paymasterAndData":     "0x",
                "signature":            "0x",
            }

            user_op_hash = self._get_user_op_hash(w3, user_op, ENTRY_POINT_ADDRESS, SKALE_CHAIN_ID)
            signed = session_account.sign_message(
                __import__("eth_account.messages", fromlist=["encode_defunct"]).encode_defunct(
                    hexstr=user_op_hash.hex()
                )
            )
            user_op["signature"] = signed.signature.hex()

            try:
                response = w3.provider.make_request(
                    "eth_sendUserOperation", [user_op, ENTRY_POINT_ADDRESS]
                )
                if "error" in response:
                    error_msg = response["error"].get("message") or str(response["error"])
                    raise ValueError(f"Bundler rejected: {error_msg}")

                userop_hash_hex = response.get("result", "")
                if not userop_hash_hex:
                    raise ValueError(
                        "Bundler returned empty result — the RPC endpoint may not "
                        "support eth_sendUserOperation. Set BUNDLER_RPC_URL to a "
                        "proper ERC-4337 bundler endpoint."
                    )

                tx_hash = await self._wait_for_user_op(w3, userop_hash_hex)
                if not tx_hash:
                    raise TimeoutError(
                        f"Transaction not confirmed within {5}s. "
                        f"UserOp submitted: {userop_hash_hex}"
                    )

                item_usd   = Decimal(str(usd_amt))
                total_usd += item_usd
                receipts.append({
                    "commodity":        vendor.get("name", "Unknown"),
                    "merchant_address": vendor_address,
                    "amount_usd":       float(item_usd),
                    "tx_hash":          tx_hash,
                    "product_id":       (vendor.get("products") or [{}])[0].get("product_id"),
                    "vendor_id":        vendor.get("vendor_id"),
                })
                logger.info("[X402] ✓ %s — tx: %s", vendor.get("name"), tx_hash)

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

        if receipts:
            try:
                await self._record_order(
                    receipts=receipts,
                    total_usd=total_usd,
                    user_wallet=smart_wallet_address,
                    primary_tx=receipts[0]["tx_hash"],
                )
            except Exception as exc:
                logger.warning("[DB] Order recording failed: %s", exc)

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
            "details":  (
                f"Settled {len(receipts)}/{len(receipts) + len(failures)} vendor(s) · "
                f"${float(total_usd):.2f} USDC"
            ),
        }

    def _get_user_op_hash(self, w3, user_op, entry_point, chain_id) -> bytes:
        from eth_abi import encode
        packed = encode(
            ["address","uint256","bytes32","bytes32","uint256","uint256","uint256","uint256","uint256","bytes32"],
            [
                user_op["sender"],
                int(user_op["nonce"], 16),
                w3.keccak(hexstr=user_op["initCode"]),
                w3.keccak(hexstr=user_op["callData"]),
                int(user_op["callGasLimit"], 16),
                int(user_op["verificationGasLimit"], 16),
                int(user_op["preVerificationGas"], 16),
                int(user_op["maxFeePerGas"], 16),
                int(user_op["maxPriorityFeePerGas"], 16),
                w3.keccak(hexstr=user_op["paymasterAndData"]),
            ],
        )
        user_op_hash = w3.keccak(packed)
        return w3.keccak(encode(
            ["bytes32", "address", "uint256"],
            [user_op_hash, entry_point, chain_id]
        ))

    async def _wait_for_user_op(
        self,
        w3,
        user_op_hash: str,
        max_attempts: int = 5,       # was 20 — now fails fast after 5 seconds
        poll_interval: float = 1.0,  # was 2.0s
    ) -> str:
        import asyncio
        for _ in range(max_attempts):
            try:
                r = w3.provider.make_request("eth_getUserOperationReceipt", [user_op_hash])
                res = r.get("result")
                if res and res.get("receipt"):
                    return res["receipt"].get("transactionHash", "")
            except Exception:
                pass
            await asyncio.sleep(poll_interval)
        return ""  # empty string = timeout, caller adds to failures[]

    async def _record_order(self, receipts, total_usd, user_wallet, primary_tx) -> None:
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
                product = await db.product.find_unique(
                    where={"productID": receipt["product_id"]},
                    include={"vendor": True},
                )
            if product is None:
                matches = await db.product.find_many(
                    where={"name": {"contains": receipt["commodity"], "mode": "insensitive"}},
                    take=1, include={"vendor": True},
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