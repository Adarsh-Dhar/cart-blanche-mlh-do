import os
from web3 import Web3
from dotenv import load_dotenv

# Load your .env file
load_dotenv()

private_key = os.environ.get("SKALE_AGENT_PRIVATE_KEY")
if not private_key:
    print("❌ ERROR: SKALE_AGENT_PRIVATE_KEY not found in .env")
    exit()

# Connect to SKALE Base Sepolia Testnet
w3 = Web3(Web3.HTTPProvider("https://base-sepolia-testnet.skalenodes.com/v1/jubilant-horrible-ancha"))

# Derive your agent's public address
account = w3.eth.account.from_key(private_key)
address = account.address

# Fetch the balance
balance_wei = w3.eth.get_balance(address)
balance_sfuel = w3.from_wei(balance_wei, 'ether')

print("\n" + "="*50)
print(f"🤖 Agent Wallet Address: {address}")
print(f"💰 Current Balance:      {balance_sfuel} sFUEL")
print("="*50 + "\n")