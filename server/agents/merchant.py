"""
agents/merchant.py — Merchant Checkout Agent (v2)
==================================================
Fixes from v1:
  • Reads from state["product_list"] (was incorrectly reading "selected_products")
  • Actually GENERATES the cart_mandate dict (v1 never set this key!)
  • Groups items by vendor and produces a per-vendor merchant list for x402
  • Emits the mandate as a ```json block so the frontend MetaMask hook picks it up
"""

from __future__ import annotations

import json
import logging

from langchain_core.messages import AIMessage

from ..state import AgentState

logger = logging.getLogger(__name__)

# Fallback payment address used only when a vendor has no pubkey
_FALLBACK_ADDRESS = "0xFe5e03799Fe833D93e950d22406F9aD901Ff3Bb9"
_CHAIN_ID = 324705682   # SKALE testnet


async def merchant_node(state: AgentState) -> dict:
    print("\n--- MERCHANT CHECKOUT ---")

    products = state.get("product_list") or []
    budget   = state.get("budget_usd", 0.0) or 0.0

    if not products:
        return {
            "messages": [AIMessage(
                content=(
                    "⚠️ No products in cart. "
                    "Please start a new shopping request to find items first."
                ),
                name="MerchantAgent",
            )],
        }

    # ── Group products by vendor ───────────────────────────────────────────
    vendor_groups: dict[str, dict] = {}
    for p in products:
        # Prefer vendor_id (Prisma cuid) as the grouping key
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
        vendor_groups[vid]["total"] = round(
            vendor_groups[vid]["total"] + p["price"], 2
        )

    total_usd = round(sum(p["price"] for p in products), 2)

    # Primary merchant = vendor with highest spend (used for EIP-712 signing)
    primary = max(vendor_groups.values(), key=lambda v: v["total"])
    primary_address = primary["merchant_address"] or _FALLBACK_ADDRESS

    # ── Build EIP-712 compatible CartMandate ──────────────────────────────
    cart_mandate = {
        "merchant_address":   primary_address,
        "amount":             total_usd,          # USD float; settlement tool handles conversion
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

    # ── Format the cart review message ────────────────────────────────────
    lines = ["Here is your confirmed cart:\n"]
    for p in products:
        lines.append(
            f"- **{p['name']}** — ${p['price']:.2f} "
            f"_(via {p.get('vendor', 'Unknown')})_"
        )

    lines.append(f"\n**Total: ${total_usd:.2f} USD**")

    if budget > 0 and total_usd > budget:
        lines.append(
            f"\n⚠️ Note: total exceeds your stated budget of **${budget:.0f}**."
        )

    vendor_count = len(vendor_groups)
    lines.append(
        f"\nThis will split across **{vendor_count} vendor(s)**. "
        "Please sign the EIP-712 CartMandate below to authorise payment:"
    )

    review       = "\n".join(lines)
    mandate_json = json.dumps(cart_mandate, indent=2)

    logger.info(
        "[Merchant] Mandate ready — $%.2f USD across %d vendor(s).",
        total_usd, vendor_count,
    )

    return {
        "cart_mandate": cart_mandate,
        "messages": [AIMessage(
            content=f"{review}\n\n```json\n{mandate_json}\n```",
            name="MerchantAgent",
        )],
    }