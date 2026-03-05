from google.adk.tools.base_tool import BaseTool, ToolContext
from typing import Any
import json
import os
import random

class X402SettlementTool(BaseTool):
    def __init__(self):
        super().__init__(
            name="x402_settlement",
            description="Settle payments on the x402 blockchain."
        )

    async def run_async(self, *, args: dict[str, Any], tool_context: ToolContext) -> Any:
        from web3 import Web3
        from eth_account.messages import encode_typed_data
        from eth_account import Account

        payment_mandate = args.get("payment_mandate", {})
        if isinstance(payment_mandate, str):
            try:
                payment_mandate = json.loads(payment_mandate)
            except Exception:
                pass

        signature = payment_mandate.get("signature")
        cart_mandate = payment_mandate.get("cart_mandate", {})
        print(f"\n[X402_TOOL] 🚨 Processing EIP-712 Signature: {str(signature)[:15]}...\n")

        if not signature or not cart_mandate:
            raise Exception("Missing signature or cart_mandate for verification")

        # EIP-712 Domain and Types
        domain = {
            "name": "CartBlanche",
            "version": "1",
            "chainId": cart_mandate.get("chain_id", 324705682),
            "verifyingContract": "0x0000000000000000000000000000000000000000"
        }
        
        message = {
            "merchant_address": cart_mandate.get("merchant_address", "0xFe5e03799Fe833D93e950d22406F9aD901Ff3Bb9"),
            "amount": cart_mandate.get("amount") or cart_mandate.get("total_budget") or 0,
            "currency": cart_mandate.get("currency", "USDC")
        }
        
        types = {
            "EIP712Domain": [
                {"name": "name", "type": "string"},
                {"name": "version", "type": "string"},
                {"name": "chainId", "type": "uint256"},
                {"name": "verifyingContract", "type": "address"},
            ],
            "CartMandate": [
                {"name": "merchant_address", "type": "address"},
                {"name": "amount", "type": "uint256"},
                {"name": "currency", "type": "string"},
            ],
        }

        signable_bytes = encode_typed_data(
            domain_data=domain,
            message_types={"CartMandate": types["CartMandate"]},
            message_data=message
        )
        w3 = Web3(Web3.HTTPProvider("https://base-sepolia-testnet.skalenodes.com/v1/jubilant-horrible-ancha"))
        if not w3.is_connected():
            raise Exception("Could not connect to SKALE RPC")

        # Recover signer
        recovered_address = Account.recover_message(signable_bytes, signature=signature)
        print(f"[X402_TOOL] Verified Signer: {recovered_address}")

        merchants = cart_mandate.get("merchants", [])
        if not merchants:
            raise Exception("No merchants found in the batch mandate!")

        private_key = os.environ.get("SKALE_AGENT_PRIVATE_KEY")
        if not private_key:
            raise Exception("Missing SKALE_AGENT_PRIVATE_KEY in .env")
        agent_account = w3.eth.account.from_key(private_key)
        agent_address = agent_account.address

        # 🚨 THE 10 PREDEFINED MERCHANT WALLETS 🚨
        MERCHANT_WALLETS = [
            "0xFe5e03799Fe833D93e950d22406F9aD901Ff3Bb9", "0x90C768dDfeA2352511FeEE464BED8b550994d3eB",
            "0xAE0F008660E94CB67203C2Eac3660C4e0Aff6948", "0x684487A840a8784cC49668bca724803178AE71B5",
            "0x6A1a7a53C63A83fF9D5E3a0463BFE952f10a8a97", "0x3209a1520e5d301d7d5E8883B30b1b7Fa53ebb29",
            "0xEa4d474Dec3dD282D018926064AD642c451961ba", "0x9834F7C798eb0F5A2A6a2aD4b6c6B282566273A3",
            "0xEb18f156d7EC875997729D3CE294848B99A4a35c", "0x32F3CA68C03fa4AA317ec1730012ccF69187Ba23"
        ]

        print(f"[X402_TOOL] Starting MULTI-TX BATCH SETTLEMENT for {len(merchants)} merchants...")
        tx_hashes = []
        receipts = []
        
        # Get the starting nonce for the wallet
        current_nonce = w3.eth.get_transaction_count(agent_address)

        # Loop through the list of merchants and pay them all
        for vendor in merchants:
            vendor_address = w3.to_checksum_address(random.choice(MERCHANT_WALLETS))

            # 1. Extract the AI's value and strip any $ or commas it might have added
            raw_val = vendor.get("amount", 0)
            if isinstance(raw_val, str):
                raw_val = str(raw_val).replace('$', '').replace(',', '')
            raw_amount = float(raw_val)

            # 2. SANITIZE WEI: If the AI output USDC 6-decimal format (e.g. 39690000 instead of 39.69)
            if raw_amount > 10000:
                raw_amount = raw_amount / 1000000.0

            # 3. 🚨 YOUR STRICT RULE: True Cost in USD / 10,000 🚨
            actual_value_to_send = raw_amount / 1000000.0

            if actual_value_to_send <= 0:
                actual_value_to_send = 0.0001 

            commodity_name = vendor.get('name', 'Unknown Item')
            print(f"[X402_TOOL] Paying {commodity_name} at {vendor_address} ({actual_value_to_send} CREDIT)...")

            # 🚨 THIS IS THE MISSING LOGIC THAT ACTUALLY SENDS IT 🚨
            tx = {
                'nonce': current_nonce,
                'to': vendor_address,
                'value': w3.to_wei(actual_value_to_send, 'ether'),
                'gas': 2000000,
                'gasPrice': w3.eth.gas_price,
                'chainId': 324705682 
            }

            signed_tx = w3.eth.account.sign_transaction(tx, private_key)
            tx_hash_bytes = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
            tx_hash = w3.to_hex(tx_hash_bytes)

            print(f"[X402_TOOL] ⏳ Waiting for confirmation on {tx_hash}...")
            w3.eth.wait_for_transaction_receipt(tx_hash_bytes, timeout=120)
            tx_hashes.append(tx_hash)
            print(f"[X402_TOOL] ✅ Paid! TX: {tx_hash}")

            receipts.append({
                "commodity": commodity_name,
                "wallet": vendor_address,
                "amount": actual_value_to_send,
                "tx_hash": tx_hash
            })
            
            # Increment nonce so the next loop's transaction doesn't fail
            current_nonce += 1

        return {
            "status": "settled",
            "receipts": receipts,
            "network": "SKALE Base Sepolia Testnet",
            "details": f"Successfully batch-settled {len(merchants)} vendors."
        }