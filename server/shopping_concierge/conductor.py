


from google.adk.agents import SequentialAgent
from .orchestrator_agent import orchestrator_agent
from .shopping_agent import shopping_agent
from .merchant_agent import merchant_agent
from .vault_agent import vault_agent
from .skale_bite import skale_bite
from .x402_settlement import payment_processor_agent

class ShoppingConciergeConductor(SequentialAgent):
    def __init__(self):
        super().__init__(
            name="shopping_concierge",
            sub_agents=[  # 🚨 FIX: This MUST be sub_agents! 🚨
                orchestrator_agent,
                shopping_agent.llm_agent,
                merchant_agent,
                vault_agent.llm_agent,
                payment_processor_agent
            ]
        )

    def process_decryption(self, encrypted_budget, merchant_response):
        decrypt_status = skale_bite.decrypt_request(encrypted_budget["ciphertext"])
        cart_amount = merchant_response["cart_mandate"].get("amount")
        print(f"[BITE] Decryption request status: {decrypt_status}")
        return {
            "decryption_status": decrypt_status,
            "proceed_to_settlement": True,
            "cart_mandate": merchant_response["cart_mandate"]
        }

conductor = ShoppingConciergeConductor()
