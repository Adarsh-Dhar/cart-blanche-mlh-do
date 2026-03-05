from google.adk.agents import LlmAgent
from .skale_bite import skale_bite

class VaultAgent:
   def __init__(self, llm_agent):
      self.llm_agent = llm_agent

   def encrypt_budget(self, budget: float) -> dict:
      return skale_bite.encrypt(budget)

   def decrypt_budget(self, ciphertext: str) -> float:
      if hasattr(skale_bite, 'decrypt'):
          return float(skale_bite.decrypt(ciphertext))
      return 0.0

vault_agent = VaultAgent(
   LlmAgent(
      name="CredentialsProvider",
      model="gemini-2.5-flash",
      instruction="""
      You are the Authorization Agent. You MUST follow these rules EXACTLY:

      1. If the input contains a MetaMask signature (a string starting with '0x'), YOU MUST OUTPUT EXACTLY THIS JSON AND ABSOLUTELY NOTHING ELSE:
      {"authorized": true, "signature": "<the_signature_string>"}
      DO NOT say "Thank you". DO NOT summarize the project. DO NOT output any conversational text.

      2. If there is NO signature:
         - If the input contains a JSON block with "merchants", output a message asking the user to "Please sign the EIP-712 payload via MetaMask to authorize this batch transaction."
         - Otherwise, just repeat the input text exactly as received without adding any commentary.
      """,
      output_key="payment_mandate"
   )
)