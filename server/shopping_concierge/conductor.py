from .shopping_agent import ShoppingAgent
from .merchant_agent import MerchantAgent
from .vault_agent import VaultAgent
from .skale_bite import SkaleBite
from .x402_settlement import PaymentProcessorAgent

class ShoppingConciergeConductor:
    def __init__(self):
        self.shopping_agent = ShoppingAgent()
        self.merchant_agent = MerchantAgent()
        self.vault_agent = VaultAgent()
        self.payment_processor_agent = PaymentProcessorAgent()
        self.skale_bite = SkaleBite()

    def process_decryption(self, encrypted_budget, merchant_response):
        decrypt_status = self.skale_bite.decrypt_request(encrypted_budget["ciphertext"])
        cart_amount = merchant_response["cart_mandate"].get("amount")
        print(f"[BITE] Decryption request status: {decrypt_status}")
        return {
            "decryption_status": decrypt_status,
            "proceed_to_settlement": True,
            "cart_mandate": merchant_response["cart_mandate"]
        }

conductor = ShoppingConciergeConductor()
