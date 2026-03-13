"""
agents/merchant.py — Merchant Checkout Agent (Silent Version)
============================================================
Removed all conversational text wrappers to allow the React 
ProductListCard component to handle the UI exclusively.
"""

from __future__ import annotations
import json
import logging
from langchain_core.messages import AIMessage
from server.state import AgentState

logger = logging.getLogger(__name__)

# Fallback payment address used only when a vendor has no pubkey
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
        "merchant_address":   primary_address,
        "amount":             total_usd,
        "total_budget_amount": total_usd,
        "currency":           "USDC",
        "chain_id":           _CHAIN_ID,
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

    # 3. Create ONLY the raw Markdown Table (No intro or outro text)
    # This is what your frontend 'MarkdownProductCards' component parses.
    lines = [f"| {'#':<3} | {'Product':<38} | {'Vendor':<22} | {'Price':>8} |"]
    lines.append(f"|{'-'*5}|{'-'*40}|{'-'*24}|{'-'*10}|")
    for i, p in enumerate(products, 1):
        v_name = p.get('vendor', 'Unknown Vendor')
        lines.append(
            f"| {i:<3} | {p['name'][:38]:<38} | "
            f"{v_name[:22]:<22} | ${p['price']:>7.2f} |"
        )
    
    table = "\n".join(lines)

    logger.info("[Merchant] Mandate ready - total: $%.2f", total_usd)

    # 4. Return state without extra messages. 
    # The AIMessage now contains ONLY the table, which your UI will transform 
    # into the 'Your Cart' layout.
    return {
        "cart_mandate": cart_mandate,
        "_merchant_reviewed": True,
        "messages": [AIMessage(
            content=table,
            name="MerchantAgent",
        )],
    }