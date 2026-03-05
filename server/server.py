from fastapi import FastAPI
from google.adk.cli.fast_api import get_fast_api_app

# This helper automatically creates /run, /run_sse, and session routes under /apps/{app_name}/
app: FastAPI = get_fast_api_app(
    agents_dir="shopping_concierge",
    web=False,
    allow_origins=["http://localhost:3000"]  # Adjust as needed for your frontend
)


from fastapi import Request
from fastapi.responses import JSONResponse
import httpx

@app.get("/health")
async def health():
    return {"status": "ok"}

# --- Real AI orchestration for /apps/main/run ---
@app.post("/apps/main/run")
async def main_run(request: Request):
    body = await request.json()
    # Accepts intent_mandate and discovery_data, or legacy fields
    intent_mandate = body.get("intent_mandate")
    discovery_data = body.get("discovery_data", {})

    # Support legacy direct queries
    if not intent_mandate:
        # Try to build intent_mandate from legacy fields
        intent = body.get("intent")
        product_category = body.get("product_category")
        price_constraint = body.get("price_constraint", {})
        if intent and product_category:
            # Example: find_and_purchase_product intent
            features = []
            if "noise-canceling" in product_category.lower():
                features.append("noise-canceling")
            price_max = price_constraint.get("max_price", 200)
            intent_mandate = {
                "action": "search_and_purchase",
                "product": {
                    "type": product_category,
                    "features": features,
                    "price_max": price_max
                },
                "output_preference": "cart_details"
            }
        else:
            return JSONResponse({"result": {"text": "Missing intent_mandate or legacy fields."}}, status_code=400)

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # ShoppingAgent: send intent_mandate, get discovery_data
            shopping_agent_url = "http://localhost:8000/apps/shopping_concierge/run"  # Example endpoint
            shopping_payload = {"intent_mandate": intent_mandate}
            shopping_resp = await client.post(shopping_agent_url, json=shopping_payload)
            if shopping_resp.status_code == 200:
                shopping_result = shopping_resp.json()
                discovery_data = shopping_result.get("discovery_data", {})
            else:
                return JSONResponse({"result": {"text": "ShoppingAgent error."}}, status_code=500)

            # MerchantAgent: send intent_mandate and discovery_data, get cart_mandate
            merchant_agent_url = "http://localhost:8000/apps/shopping_concierge/merchant/run"  # Example endpoint
            merchant_payload = {
                "intent_mandate": intent_mandate,
                "discovery_data": discovery_data
            }
            merchant_resp = await client.post(merchant_agent_url, json=merchant_payload)
            if merchant_resp.status_code == 200:
                merchant_result = merchant_resp.json()
                cart_mandate = merchant_result.get("cart_mandate")
            else:
                return JSONResponse({"result": {"text": "MerchantAgent error."}}, status_code=500)

            if not cart_mandate:
                return JSONResponse({"result": {"text": "No suitable product found."}})

            cart_details = {
                "cart_id": cart_mandate.get("cart_id"),
                "items": cart_mandate.get("items", []),
                "total_price": cart_mandate.get("total_price"),
                "price_valid_until": cart_mandate.get("price_valid_until"),
                "source_agent": cart_mandate.get("source_agent")
            }
            return JSONResponse({
                "result": {
                    "text": "Here are the cart details for the noise-canceling headphones:",
                    "cart": cart_details
                }
            })
    except Exception as e:
        return JSONResponse({"result": {"text": f"Error: {str(e)}"}}, status_code=500)
