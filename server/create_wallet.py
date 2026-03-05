


import os
from dotenv import load_dotenv
from coinbase.rest import RESTClient

# Load your .env file
load_dotenv()

API_KEY = os.getenv('CDP_API_KEY_NAME')
API_SECRET = os.getenv('CDP_API_KEY_PRIVATE_KEY')

print("🚀 Creating a new AI Agent Wallet (Portfolio) on Coinbase...")

try:
    client = RESTClient(api_key=API_KEY, api_secret=API_SECRET)
    response = client.create_portfolio(name="AI Agent Wallet")
    portfolio = response.portfolio
    print("\n========================================================")
    print(f"✅ EXACT AGENT_WALLET_ID: {portfolio.uuid}")
    print(f"📍 PORTFOLIO NAME: {portfolio.name}")
    print("========================================================\n")
except Exception as e:
    print(f"⚠️ Wallet creation failed: {e}")

print("\n⚠️ IMPORTANT: Save the AGENT_WALLET_ID to your .env file!")
