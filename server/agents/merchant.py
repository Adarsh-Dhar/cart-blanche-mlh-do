"""agents/merchant.py — Merchant Checkout Agent — saves CartMandate as AgentResponse"""
from __future__ import annotations
import json, logging
from langchain_core.messages import AIMessage
from server.state import AgentState
from server.db import get_db

logger = logging.getLogger(__name__)
_FALLBACK = "0xFe5e03799Fe833D93e950d22406F9aD901Ff3Bb9"
_CHAIN_ID = 324705682


async def _save_agent_response(state: AgentState, rtype: str, text: str) -> None:
    chat_id = state.get("chat_id")
    if not chat_id: return
    try:
        db = await get_db()
        await db.agentresponse.create(data={"type": rtype, "text": text, "chatId": chat_id})
    except Exception as exc:
        logger.warning("[DB] Merchant AgentResponse save failed: %s", exc)


async def merchant_node(state: AgentState) -> dict:
    print("\n--- MERCHANT CHECKOUT ---")
    products = state.get("product_list") or []
    if not products:
        return {"_merchant_reviewed":True,
                "messages":[AIMessage(content="No products in cart.",name="MerchantAgent")]}

    vendor_groups: dict[str, dict] = {}
    for p in products:
        vid = p.get("vendor_id") or p.get("vendor","unknown")
        if vid not in vendor_groups:
            vendor_groups[vid] = {
                "name": p.get("vendor","Unknown Vendor"),
                "merchant_address": p.get("merchant_address") or _FALLBACK,
                "vendor_id": vid, "products": [], "total": 0.0,
            }
        vendor_groups[vid]["products"].append(p)
        vendor_groups[vid]["total"] = round(vendor_groups[vid]["total"]+p["price"],2)

    total_usd = round(sum(p["price"] for p in products),2)
    primary   = max(vendor_groups.values(), key=lambda v: v["total"])

    cart_mandate = {
        "merchant_address":    primary["merchant_address"] or _FALLBACK,
        "amount":              total_usd,
        "total_budget_amount": total_usd,
        "currency":            "USDC",
        "chain_id":            _CHAIN_ID,
        "merchants": [
            {"name":vg["name"],"merchant_address":vg["merchant_address"] or _FALLBACK,
             "vendor_id":vg["vendor_id"],"amount":vg["total"],
             "products":[{"product_id":p.get("product_id") or p.get("id",""),
                          "vendor_id":p.get("vendor_id",""),"name":p["name"],"price":p["price"]}
                         for p in vg["products"]]}
            for vg in vendor_groups.values()
        ],
    }

    mandate_payload = {"type":"cart_mandate", **cart_mandate}
    payload_json    = json.dumps(mandate_payload, indent=2)

    await _save_agent_response(state, "MANDATE", payload_json)
    logger.info("[Merchant] Mandate ready — total: $%.2f, %d vendor(s)", total_usd, len(vendor_groups))

    return {
        "cart_mandate":       cart_mandate,
        "_merchant_reviewed": True,
        "messages": [AIMessage(content=f"```json\n{payload_json}\n```", name="MerchantAgent")],
    }