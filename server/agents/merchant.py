"""
agents/merchant.py — Merchant Checkout Agent
==============================================
Emits the cart mandate as a typed JSON block so the frontend's
CartMandateCard component can render it as an interactive signing card.
"""

from __future__ import annotations
import json
import logging
from langchain_core.messages import AIMessage
from server.state import AgentState

logger = logging.getLogger(__name__)

_FALLBACK_ADDRESS = "0xFe5e03799Fe833D93e950d22406F9aD901Ff3Bb9"
_CHAIN_ID = 324705682   # SKALE testnet

async def merchant_node(state: AgentState) -> dict:
    print("\n--- MERCHANT CHECKOUT ---")

    products = state.get("product_list") or []
    if not products:
        return {
            "_merchant_reviewed": True,
            "messages": [AIMessage(
                content="⚠️ No products in cart to checkout.",
                name="MerchantAgent",
            )],
        }

    # 1. Group products by vendor for the X402 mandate
    vendor_groups: dict[str, dict] = {}
    for p in products:
        vid = p.get("vendor_id") or p.get("vendor", "unknown")
        if vid not in vendor_groups:
            vendor_groups[vid] = {
                "name":             p.get("vendor", "Unknown Vendor"),
                "merchant_address": p.get("merchant_address") or _FALLBACK_ADDRESS,
                "vendor_id":        vid,
                "products":         [],
                "total":            0.0,
            }
        vendor_groups[vid]["products"].append(p)
        vendor_groups[vid]["total"] = round(vendor_groups[vid]["total"] + p["price"], 2)

    total_usd = round(sum(p["price"] for p in products), 2)
    primary = max(vendor_groups.values(), key=lambda v: v["total"])
    primary_address = primary["merchant_address"] or _FALLBACK_ADDRESS

    # 2. Build the EIP-712 compatible CartMandate
    cart_mandate = {
        "merchant_address":    primary_address,
        "amount":              total_usd,
        "total_budget_amount": total_usd,
        "currency":            "USDC",
        "chain_id":            _CHAIN_ID,
        "merchants": [
            {
                "name":             vg["name"],
                "merchant_address": vg["merchant_address"] or _FALLBACK_ADDRESS,
                "vendor_id":        vg["vendor_id"],
                "amount":           vg["total"],
                "products": [
                    {
                        "product_id": p.get("product_id") or p.get("id", ""),
                        "vendor_id":  p.get("vendor_id", ""),
                        "name":       p["name"],
                        "price":      p["price"],
                    }
                    for p in vg["products"]
                ],
            }
            for vg in vendor_groups.values()
        ],
    }

    # 3. Emit the mandate as a typed JSON block — the frontend CartMandateCard
    #    component detects `"type": "cart_mandate"` and renders a signing UI.
    mandate_payload = {"type": "cart_mandate", **cart_mandate}

    reply = (
        f"```json\n{json.dumps(mandate_payload, indent=2)}\n```"
    )

    logger.info("[Merchant] Mandate ready — total: $%.2f, %d vendor(s)",
                total_usd, len(vendor_groups))

    return {
        "cart_mandate":      cart_mandate,
        "_merchant_reviewed": True,
        "messages": [AIMessage(content=reply, name="MerchantAgent")],
    }