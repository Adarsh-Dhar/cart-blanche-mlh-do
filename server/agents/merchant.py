# server/agents/merchant.py
from typing import TypedDict

class AgentState(TypedDict):
    query: str
    plan: str
    budget_usd: float
    selected_products: list
    merchant_review: str
    payment_mandate: dict
    settlement_status: str

async def merchant_node(state: AgentState) -> dict:
    print("\n--- MERCHANT CHECKOUT ---")
    products = state.get("selected_products", [])
    budget = state.get("budget_usd", 0.0)
    
    if not products:
        return {"merchant_review": "I couldn't find any products matching your request."}

    total_price = sum(p["price"] for p in products)
    
    review = "Here is your optimized cart:\n\n"
    for p in products:
        review += f"- **{p['name']}**: ${p['price']:.2f} (via {p.get('merchant', 'Unknown')})\n"
        
    review += f"\n**Total: ${total_price:.2f} USD**\n"
    
    if budget > 0 and total_price > budget:
        review += f"\n⚠️ **Warning:** The total exceeds your stated budget of ${budget:.2f}. "
        review += "I selected the cheapest available options for each category.\n"

    review += "\nReply 'Looks good' to confirm and generate the payment mandate, or tell me what you'd like to change."
    
    print("Merchant review generated.")
    return {"merchant_review": review}