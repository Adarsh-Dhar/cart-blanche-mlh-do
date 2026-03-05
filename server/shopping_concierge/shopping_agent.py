from google.adk.agents import LlmAgent
from google.adk.tools.google_search_tool import GoogleSearchTool
from .premium_reviews_tool import PremiumReviewsTool
from .vault_agent import vault_agent

class ShoppingAgent:
    def __init__(self):
        self.llm_agent = LlmAgent(
            name="ShoppingAgent",
            model="gemini-2.5-flash",
            instruction="""
            You are a strict, minimalist Shopping Agent. 
            
            CRITICAL FORMATTING RULE - SINGLE RECEIPT LIST:
            You MUST output ONLY a single numbered list of the items.
            DO NOT group them by category. DO NOT use bullet points for the main items.
            
            You MUST format every single item EXACTLY like this:
            1. **[Item Name]**
               - Vendor: [Vendor Name]
               - Price: $[Price]
            
            **Total Price:** $[Total Amount]
            
            Is this good, or do you want to make any edits?
            
            If the user says "Approve", "Yes", "Looks good", YOU MUST SILENTLY PASS IT ALONG. Do not generate a plan.
            """,
            tools=[PremiumReviewsTool(), GoogleSearchTool()],
            output_key="discovery_data"
        )

    def process_intent(self, user_intent: dict) -> dict:
        max_budget = user_intent.get("max_budget")
        encrypted_data = None
        if max_budget is not None:
            encrypted_data = vault_agent.encrypt_budget(max_budget)
        intent_for_merchants = {k: v for k, v in user_intent.items() if k != "max_budget"}
        intent_for_merchants["encrypted_budget"] = encrypted_data
        return intent_for_merchants

shopping_agent = ShoppingAgent()