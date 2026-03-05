import uvicorn
from typing import Any
from fastapi import FastAPI
from x402.http import FacilitatorConfig, HTTPFacilitatorClient, PaymentOption
from x402.http.middleware.fastapi import PaymentMiddlewareASGI
from x402.http.types import RouteConfig
from x402.mechanisms.evm.exact import ExactEvmServerScheme
from x402.server import x402ResourceServer

app = FastAPI()

RECIPIENT_ADDRESS = "0xFe5e03799Fe833D93e950d22406F9aD901Ff3Bb9"
NETWORK_ID = "eip155:84532"

facilitator = HTTPFacilitatorClient(
    FacilitatorConfig(url="https://x402.org/facilitator")
)
server = x402ResourceServer(facilitator)
server.register(NETWORK_ID, ExactEvmServerScheme())

# FINAL FIX: Use PaymentOption object, and pass `price` as a string.
routes: dict = {
    "GET /checkout": RouteConfig(
        accepts=[
            PaymentOption(
                network=NETWORK_ID,
                scheme="exact",
                pay_to=RECIPIENT_ADDRESS,
                price="0.01"  # <-- MUST be a string!
            )
        ],
        mime_type="application/json",
        description="Checkout Payment for Headphones",
    ),
}

app.add_middleware(PaymentMiddlewareASGI, routes=routes, server=server)

@app.get("/checkout")
async def checkout_endpoint() -> dict[str, Any]:
    return {
        "status": "paid",
        "message": "Payment successful! Your order is confirmed."
    }

if __name__ == "__main__":
    print("Merchant Server running on port 8001...")
    uvicorn.run(app, host="0.0.0.0", port=8001)