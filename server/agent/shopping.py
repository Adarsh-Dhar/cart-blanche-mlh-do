"""
agents/shopping.py — Shopping / Discovery Agent
================================================
Purpose:
  - Splits `project_plan` into individual search terms.
  - Calls UCPCommerceSearchTool for each term against the Prisma DB.
  - De-duplicates results by product ID.
  - Applies optional budget filter (state["budget_usd"]) — drops products
    whose price exceeds the ceiling UNLESS no affordable alternative exists,
    in which case it warns but still shows the cheapest option.
  - Returns a formatted product table and sets `product_list` in state.
  - Sets `_shopped = True` so the router moves to merchant and never
    re-runs this node in the same turn.

Output state keys set:
  product_list, _shopped, steps
"""

from __future__ import annotations

import logging

from langchain_core.messages import AIMessage

from ..state import AgentState, MAX_STEPS
from ..tool.ucp_search import UCPCommerceSearchTool

logger = logging.getLogger(__name__)

_ucp_tool = UCPCommerceSearchTool()


def _build_table(products: list[dict]) -> str:
    lines = [f"| {'#':<3} | {'Product':<38} | {'Vendor':<22} | {'Price':>8} |"]
    lines.append(f"|{'-'*5}|{'-'*40}|{'-'*24}|{'-'*10}|")
    for i, p in enumerate(products, 1):
        lines.append(
            f"| {i:<3} | {p['name'][:38]:<38} | {p['vendor'][:22]:<22} | ${p['price']:>7.2f} |"
        )
    return "\n".join(lines)


async def shopping_node(state: AgentState) -> dict:
    steps  = state.get("steps", 0)
    budget = state.get("budget_usd") or 0.0

    # ── Hard stop ────────────────────────────────────────────────────────────
    if steps >= MAX_STEPS:
        return {
            "product_list": [],
            "_shopped": True,
            "steps": steps + 1,
            "messages": [AIMessage(
                content="Search limit reached. Please start a new request.",
                name="ShoppingAgent",
            )],
        }

    plan: str = state.get("project_plan") or ""
    if not plan:
        return {
            "product_list": [],
            "_shopped": True,
            "steps": steps + 1,
            "messages": [AIMessage(
                content="⚠️ No search plan found. Please describe what you need.",
                name="ShoppingAgent",
            )],
        }

    items = [i.strip() for i in plan.split(",") if i.strip()]
    logger.info("[Shopping] Searching %d term(s): %s", len(items), items)

    # ── Query UCP / Prisma for each item ──────────────────────────────────────
    all_products: list[dict] = []
    seen_ids: set[str] = set()

    for item in items:
        try:
            results = await _ucp_tool.run_async(args={"query": item}, tool_context=None)
            for p in results:
                if p["id"] not in seen_ids:
                    seen_ids.add(p["id"])
                    all_products.append(p)
        except Exception as exc:
            logger.warning("[Shopping] Query '%s' failed: %s", item, exc)

    if not all_products:
        return {
            "product_list": [],
            "_shopped": True,
            "steps": steps + 1,
            "messages": [AIMessage(
                content=(
                    "⚠️ No in-stock products found for your request.\n\n"
                    "Try broadening your search — for example, use generic terms "
                    "like *'headphones'* instead of a specific brand."
                ),
                name="ShoppingAgent",
            )],
        }

    # ── Budget filtering ──────────────────────────────────────────────────────
    budget_warning = ""
    if budget > 0:
        within_budget = [p for p in all_products if p["price"] <= budget]
        if within_budget:
            all_products = within_budget
        else:
            # No product fits the budget — keep cheapest and warn
            cheapest = min(all_products, key=lambda p: p["price"])
            all_products = [cheapest]
            budget_warning = (
                f"\n\n⚠️ **Budget note:** Nothing found under **${budget:.0f}**. "
                f"Showing the cheapest available option (${cheapest['price']:.2f})."
            )

    # ── Format table ──────────────────────────────────────────────────────────
    table = _build_table(all_products)
    total = sum(p["price"] for p in all_products)

    reply = (
        f"Found **{len(all_products)}** product(s) matching your request:\n\n"
        f"```\n{table}\n```\n\n"
        f"**Estimated total: ${total:.2f}**{budget_warning}\n\n"
        "Reply **'Looks good'** to confirm this cart and proceed to payment, "
        "or describe what you'd like to change."
    )

    logger.info("[Shopping] %d product(s) selected (budget=$%.2f).", len(all_products), budget)
    return {
        "product_list": all_products,
        "_shopped":     True,
        "steps":        steps + 1,
        "messages": [AIMessage(content=reply, name="ShoppingAgent")],
    }