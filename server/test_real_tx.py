import asyncio
import os
import json
from web3 import Web3
from eth_account import Account
from eth_account.messages import encode_typed_data

# Import your actual tool
from shopping_concierge.x402_settlement_tool import X402SettlementTool

# 1. Create a dummy "User" wallet to sign the mandate
dummy_user_key = "0x" + "1" * 64
user_account = Account.from_key(dummy_user_key)

# 2. Build the EXACT First Day of School Cart ($203)
# You can paste the raw LLM output here to safely test it!
cart_mandate = {
    "chain_id": 324705682,
    "merchant_address": "0xFe5e03799Fe833D93e950d22406F9aD901Ff3Bb9",
    "amount": 203, 
    "currency": "USDC",
    "merchants": [
        {"name": "Durable Backpack", "merchant_address": "0x00", "amount": 35},
        {"name": "Notebooks (5-pack)", "merchant_address": "0x00", "amount": 10},
        {"name": "Pens (8-pack)", "merchant_address": "0x00", "amount": 2},
        {"name": "Pencils (12-pack)", "merchant_address": "0x00", "amount": 4},
        {"name": "Highlighters (5-pack)", "merchant_address": "0x00", "amount": 6},
        {"name": "Erasers (5-pack)", "merchant_address": "0x00", "amount": 4},
        {"name": "Folders (3-pack)", "merchant_address": "0x00", "amount": 6},
        {"name": "Basic Calculator", "merchant_address": "0x00", "amount": 5},
        {"name": "Pencil Case", "merchant_address": "0x00", "amount": 5},
        {"name": "Ruler (12-inch)", "merchant_address": "0x00", "amount": 2.50},
        {"name": "Comfortable Shirt", "merchant_address": "0x00", "amount": 15},
        {"name": "Comfortable Pants/Skirt", "merchant_address": "0x00", "amount": 30},
        {"name": "Sneakers", "merchant_address": "0x00", "amount": 45},
        {"name": "Reusable Water Bottle", "merchant_address": "0x00", "amount": 10},
        {"name": "Lunchbox/Bag", "merchant_address": "0x00", "amount": 15},
        {"name": "Hand Sanitizer", "merchant_address": "0x00", "amount": 1.50},
        {"name": "Tissues (Travel Pack)", "merchant_address": "0x00", "amount": 2}
    ]
}

# 3. Mathematically construct the EIP-712 Signature
domain = {
    "name": "CartBlanche",
    "version": "1",
    "chainId": cart_mandate["chain_id"],
    "verifyingContract": "0x0000000000000000000000000000000000000000"
}
message = {
    "merchant_address": cart_mandate["merchant_address"],
    "amount": cart_mandate["amount"],
    "currency": cart_mandate["currency"]
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

signable_bytes = encode_typed_data(domain_data=domain, message_types={"CartMandate": types["CartMandate"]}, message_data=message)
signed_message = Account.sign_message(signable_bytes, private_key=user_account.key)
signature = signed_message.signature.hex()

# 4. Package it exactly like the LLM does
payment_mandate = {
    "signature": signature,
    "cart_mandate": cart_mandate,
    "user_wallet_address": user_account.address
}

async def run_test():
    private_key = os.environ.get("SKALE_AGENT_PRIVATE_KEY")
    if not private_key:
        print("❌ ERROR: SKALE_AGENT_PRIVATE_KEY is missing from your environment!")
        return

    print("\n" + "="*50)
    print("🔍 RUNNING PRE-FLIGHT SIMULATION...")
    print("="*50)

    # 🚨 THE SIMULATOR: Now mathematically identical to the Tool's logic 🚨
    total_tx_value = 0.0
    for merchant in cart_mandate.get("merchants", []):
        raw_val = merchant.get("amount", 0)
        
        # 1. Clean formatting
        if isinstance(raw_val, str):
            raw_val = str(raw_val).replace('$', '').replace(',', '')
        raw_amount = float(raw_val)

        # 2. Sanitize Wei hallucinations
        if raw_amount > 10000:
            raw_amount = raw_amount / 1000000.0

        # 3. Apply your strict rule
        actual_value = raw_amount / 10000.0

        if actual_value <= 0:
            actual_value = 0.0001
            
        total_tx_value += actual_value

    print(f"🧮 SIMULATION MATH: Agent will attempt to send exactly {total_tx_value:.5f} sFUEL")

    # Connect to blockchain to check real balance
    w3 = Web3(Web3.HTTPProvider("https://base-sepolia-testnet.skalenodes.com/v1/jubilant-horrible-ancha"))
    agent_account = w3.eth.account.from_key(private_key)
    balance_wei = w3.eth.get_balance(agent_account.address)
    balance_sfuel = float(w3.from_wei(balance_wei, 'ether'))

    print(f"💰 ACTUAL WALLET BALANCE: {balance_sfuel:.5f} sFUEL")

    # 🚨 SIMULATE THE WEB3 ERROR 🚨
    if total_tx_value > balance_sfuel:
        print("\n❌ SIMULATION FAILED: Account balance is too low!")
        print(f"⚠️ You need {total_tx_value:.5f} but only have {balance_sfuel:.5f}.")
        print("🛑 This would trigger a 'Web3RPCError' in your chat UI. Stopping execution to protect the app.")
        return  # Block the tool execution entirely, just like the real error
    else:
        print("✅ SIMULATION PASSED: Sufficient funds detected.\n")

    tool = X402SettlementTool()
    
    print("🚀 Firing X402 Settlement Tool (Real SKALE Multi-TX)...\n")
    try:
        result = await tool.run_async(args={"payment_mandate": payment_mandate}, tool_context=None)
        
        print("\n========================================")
        print("✅ MULTI-SETTLEMENT SUCCESSFUL!")
        print("========================================")
        print(json.dumps(result, indent=2))
        
    except Exception as e:
        print("\n❌ SETTLEMENT FAILED DURING EXECUTION!")
        print(e)

if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv() 
    asyncio.run(run_test())