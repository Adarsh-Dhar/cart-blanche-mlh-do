"""
agents/merchant.py — Merchant / Cart Approval Agent
====================================================
Purpose:
  - Presents the selected products to the user for review.
  - Waits for explicit approval ("looks good", "approve", "yes", etc.).
  - On approval, builds a fully-structured `cart_mandate` dict:
      * Converts prices to USDC 6-decimal units (price × 1,000,000).
      * Uses real Vendor.pubkey addresses carried in product["merchant_address"]
        by the Shopping Agent — no hardcoded fallbacks in merchants[].
      * Includes per-vendor breakdown in `merchants[]` for batch settlement.
  - Emits the CartMandate as a JSON code block so the frontend can detect it
    and trigger the MetaMask EIP-712 signing flow automatically.

Output state keys set:
  cart_mandate, steps
"""

from __future__ import annotations

import json
import logging
from decimal import Decimal

from langchain_core.messages import AIMessage, HumanMessage

from ..state import AgentState

logger = logging.getLogger(__name__)

_APPROVAL_PHRASES = {
    "looks good", "i approve", "let's do it", "approve",
    "that's alright", "confirmed", "go ahead", "proceed",
    "yes", "ok", "okay", "sure", "do it", "pay", "purchase",
    "checkout", "check out", "confirm",
}


def _user_approved(text: str) -> bool:
    low = text.lower()
    return any(phrase in low for phrase in _APPROVAL_PHRASES)


def _last_human(state: AgentState) -> str:
    for msg in reversed(state["messages"]):
        if isinstance(msg, HumanMessage):
            return msg.content
    return ""


def _build_mandate(products: list[dict]) -> dict:
    """
    Build a CartMandate ready for EIP-712 MetaMask signing.
    All amounts are in USDC 6-decimal integer units.
    merchant_address comes from Vendor.pubkey in Prisma (set by shopping_node).
    """
    total_usdc = sum(
        int(Decimal(str(p["price"])) * 1_000_000)
        for p in products
    )
    # primary_address is used for the EIP-712 domain digest — first vendor's pubkey
    primary_address = products[0]["merchant_address"] if products else ""

    return {
        "total_budget_amount": total_usdc,
        "currency":            "USDC",
        "chain_id":            324_705_682,    # SKALE Base Sepolia
        "merchant_address":    primary_address,
        "amount":              total_usdc,
        "merchants": [
            {
                "name":             p["name"],
                "merchant_address": p["merchant_address"],  # Vendor.pubkey
                "amount":           int(Decimal(str(p["price"])) * 1_000_000),
                "product_id":       p.get("product_id"),
                "vendor_id":        p.get("vendor_id"),
            }
            for p in products
        ],
    }


async def merchant_node(state: AgentState) -> dict:
    steps    = state.get("steps", 0)
    products = state.get("product_list") or []
    user_txt = _last_human(state)

    # ── Not yet approved — show (or re-show) the cart ─────────────────────────
    if not _user_approved(user_txt):
        if not products:
            return {
                "steps": steps + 1,
                "messages": [AIMessage(
                    content=(
                        "Your cart is empty. Tell me what you're looking for "
                        "and I'll find the best options!"
                    ),
                    name="MerchantAgent",
                )],
            }

        product_lines = "\n".join(
            f"  {i}. **{p['name']}** — ${p['price']:.2f}  *(via {p['vendor']})*"
            for i, p in enumerate(products, 1)
        )
        total = sum(p["price"] for p in products)

        return {
            "steps": steps + 1,
            "messages": [AIMessage(
                content=(
                    f"Here is your cart:\n\n{product_lines}\n\n"
                    f"**Total: ${total:.2f} USD**\n\n"
                    "Reply **'Looks good'** to confirm and generate the "
                    "payment mandate, or tell me what you'd like to change."
                ),
                name="MerchantAgent",
            )],
        }

    # ── User approved — build the CartMandate ─────────────────────────────────
    if not products:
        return {
            "steps": steps + 1,
            "messages": [AIMessage(
                content="⚠️ No products to purchase. Please search for something first.",
                name="MerchantAgent",
            )],
        }

    mandate      = _build_mandate(products)
    total_usd    = sum(p["price"] for p in products)
    vendor_count = len(products)

    logger.info(
        "[Merchant] CartMandate built: %d vendor(s), %d USDC units ($%.2f).",
        vendor_count, mandate["total_budget_amount"], total_usd,
    )

    reply = (
        f"✅ **Cart confirmed!** {vendor_count} item(s) — "
        f"**${total_usd:.2f} USD** total.\n\n"
        "Please sign the EIP-712 CartMandate via MetaMask to authorise "
        "this batch payment:\n\n"
        f"```json\n{json.dumps(mandate, indent=2)}\n```\n\n"
        "MetaMask will open automatically. Once signed, paste your signature "
        "here (starting with **0x…**) to complete the purchase."
    )

    return {
        "cart_mandate": mandate,
        "steps":        steps + 1,
        "messages": [AIMessage(content=reply, name="MerchantAgent")],
    }