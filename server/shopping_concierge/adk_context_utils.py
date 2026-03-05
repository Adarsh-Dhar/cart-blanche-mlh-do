import os
import json
import hashlib
import httpx
from ecdsa import SigningKey, VerifyingKey, SECP256k1, BadSignatureError
from dotenv import load_dotenv
from google.adk.sessions import InMemorySessionService

# Initialize session service
SESSION_SERVICE = InMemorySessionService()

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))

FACILITATOR_URL = os.getenv("FACILITATOR_URL", "https://x402.org/facilitator")

class SigningTool:
    """Stub for SigningTool to allow import in vault_agent.py."""
    def __init__(self):
        pass

async def settle_via_facilitator(payment_mandate: dict):
    """
    Sends the signed mandate to an x402 facilitator for on-chain settlement.
    """
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{FACILITATOR_URL}/settle",
            json=payment_mandate
        )
        if response.status_code == 200:
            return response.json()
        else:
            raise Exception(f"Facilitator error: {response.text}")

def canonical_json(data):
    """Return a canonical JSON string (sorted keys, no whitespace)."""
    return json.dumps(data, sort_keys=True, separators=(",", ":"))

def get_signing_key():
    priv_key_hex = os.getenv("AGENT_PRIVATE_KEY")
    if not priv_key_hex:
        raise ValueError("AGENT_PRIVATE_KEY not set in .env")
    return SigningKey.from_string(bytes.fromhex(priv_key_hex), curve=SECP256k1)

def get_verifying_key_from_private():
    return get_signing_key().verifying_key

def sign_mandate(payload: dict) -> tuple[str, str]:
    """Sign a payment mandate and return (signature, signer_address)"""
    sk = get_signing_key()
    vk = sk.verifying_key
    
    canonical = canonical_json(payload)
    msg_hash = hashlib.sha256(canonical.encode()).digest()
    
    signature = sk.sign_digest(msg_hash, sigencode=lambda r, s, order: bytes.fromhex(f"{r:064x}{s:064x}"))
    signature_hex = signature.hex()
    
    signer_address = "0x" + hashlib.sha256(vk.to_string()).hexdigest()[:40]
    
    return signature_hex, signer_address

def get_x402_client():
    """
    Returns a configured x402 HTTP client for making payments.
    
    This function:
    1. Gets the agent's private key from environment
    2. Configures the facilitator URL
    3. Creates an x402 HTTP client
    4. Registers the EVM payment scheme for Base Sepolia
    5. Returns the configured client
    """
    print("[get_x402_client] Creating x402 client...")
    
    print("[get_x402_client] Creating base x402 client...")
    from eth_account import Account
    from x402 import x402Client
    from x402.mechanisms.evm import EthAccountSigner
    from x402.mechanisms.evm.exact.register import register_exact_evm_client

    private_key = os.getenv("AGENT_PRIVATE_KEY")
    if not private_key:
        raise ValueError("AGENT_PRIVATE_KEY not set in .env - cannot create x402 client")

    # Remove '0x' prefix if accidentally included
    if private_key.startswith("0x"):
        private_key = private_key[2:]

    account = Account.from_key(private_key)
    signer = EthAccountSigner(account)
    print(f"[get_x402_client] ✅ Private key loaded for wallet: {account.address}")

    client = x402Client()
    register_exact_evm_client(client, signer)
    return client

def check_erc8004_reputation(agent_address: str) -> dict:
        """
        Mock ERC-8004 Agent Identity & Reputation lookup.
        In production, this queries an on-chain registry mapping agent addresses 
        to verified creator identities, supported protocols, and success rates.
        """
        if not agent_address:
            return {"is_verified": False, "reputation_score": 0}
        
        return {
            "is_verified": True,
            "reputation_score": 98.5,
            "total_transactions": 1432,
            "agent_type": "Verified_Merchant",
            "status": "Active"
        }
async def get_or_create_session(app_name: str, user_id: str):
    """Get or create a session for the given app and user"""
    sessions = await SESSION_SERVICE.list_sessions(user_id=user_id, app_name=app_name)
    if sessions:
        return sessions[0]
    
    return await SESSION_SERVICE.create_session(user_id=user_id, app_name=app_name)

def build_invocation_context(agent, session, session_service, state: dict = None, user_content: dict = None):
    """Build an invocation context for running an agent"""
    from google.adk.core.invocation_context import InvocationContext
    
    if state:
        session.state.update(state)
    
    context = InvocationContext(
        agent=agent,
        session=session,
        session_service=session_service,
        user_content=user_content
    )
    
    return context