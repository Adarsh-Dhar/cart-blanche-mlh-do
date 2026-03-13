"""
agents/shopping.py — Shopping Agent (v2)
=========================================
Key improvements over v1:
  - Searches per TERM (not per category group), so "Stationery: notebook, pen,
    pencil, highlighter" yields up to 4 separate products.
  - Normalises plural search terms (notebooks→notebook, pens→pen) so they
    actually match DB product names like "Notebook (3-Pack)" and "Gel Pen Set".
  - Respects per-category preferences ("premium" / "budget") stored in
    AgentState.item_preferences.
  - Returns a structured ```json product_list block so the frontend can render
    interactive product cards with deep-links to /products/[id].
"""

from __future__ import annotations

import json
import logging

from langchain_core.messages import AIMessage

from server.state import AgentState, MAX_STEPS
from server.tool.ucp_search import UCPCommerceSearchTool

logger = logging.getLogger(__name__)
_ucp_tool = UCPCommerceSearchTool()


# ── Term normalisation ─────────────────────────────────────────────────────────

def _search_variants(term: str) -> list[str]:
    """
    Return an ordered list of search variants for *term*, singular first.

    Examples:
      "notebooks"    → ["notebook", "notebooks"]
      "highlighters" → ["highlighter", "highlighters"]
      "pens"         → ["pen", "pens"]
      "backpack"     → ["backpack"]   (no change — already singular)
    """
    term = term.strip().lower()
    variants: list[str] = []

    # Strip common English plural suffixes to expose the stem
    plural_rules = [
        ("ighters", "ighter"),   # highlighters → highlighter
        ("ifiers", "ifier"),
        ("ifiers", "ify"),
        ("iers",   "ier"),
        ("ches",   "ch"),        # watches → watch
        ("shes",   "sh"),        # dishes  → dish
        ("xes",    "x"),         # boxes   → box
        ("ses",    "s"),         # glasses → glass
        ("ies",    "y"),         # batteries → battery
        ("ves",    "f"),         # knives → knife
        ("s",      ""),          # notebooks → notebook, pens → pen
    ]

    singular: str | None = None
    for suffix, replacement in plural_rules:
        if term.endswith(suffix) and len(term) - len(suffix) >= 2:
            singular = term[: -len(suffix)] + replacement
            break

    if singular and singular != term:
        variants = [singular, term]   # singular first for better DB hits
    else:
        variants = [term]

    return variants


# ── Single-term async search ───────────────────────────────────────────────────

async def _search_term(term: str) -> list[dict]:
    """
    Search the DB for *term*, trying singular variant first.
    Returns results sorted price-ascending (cheapest → priciest).
    """
    seen_ids: set[str] = set()
    all_results: list[dict] = []

    for variant in _search_variants(term):
        try:
            results = await _ucp_tool.run_async(
                args={"query": variant}, tool_context=None
            )
            for r in results:
                if r["id"] not in seen_ids:
                    seen_ids.add(r["id"])
                    all_results.append(r)
        except Exception as exc:
            logger.warning("[Shopping] Search failed for '%s': %s", variant, exc)

        if all_results:
            break  # stop as soon as any variant yields results

    return sorted(all_results, key=lambda x: x["price"])


# ── Node ───────────────────────────────────────────────────────────────────────

async def shopping_node(state: AgentState) -> dict:
    print("\n--- SHOPPING AGENT ---")
    steps = state.get("steps", 0)

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

    plan             = state.get("project_plan", "")
    budget           = state.get("budget_usd",  0.0) or 0.0
    item_preferences = state.get("item_preferences") or {}

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

    print(f"Plan: {plan}")
    print(f"Budget: ${budget}")
    print(f"Preferences: {item_preferences}")

    categories = [c.strip() for c in plan.split(";") if c.strip()]

    # ── 1. Collect options for every individual search term ────────────────
    # term_slots = list of {category, term, options: [...]}
    term_slots: list[dict] = []

    for cat_str in categories:
        if ":" not in cat_str:
            continue
        cat_name, terms_str = cat_str.split(":", 1)
        cat_name     = cat_name.strip()
        search_terms = [t.strip() for t in terms_str.split(",") if t.strip()]

        for term in search_terms:
            print(f"  Searching '{term}' ({cat_name})…")
            options = await _search_term(term)
            if options:
                print(f"    → {len(options)} result(s)")
                term_slots.append({
                    "category": cat_name,
                    "term":     term,
                    "options":  options,
                })
            else:
                print(f"    → no results")

    if not term_slots:
        return {
            "product_list": [],
            "_shopped": True,
            "steps": steps + 1,
            "messages": [AIMessage(
                content=(
                    "⚠️ No in-stock products found for your request.\n\n"
                    "Try more generic terms — e.g. *'backpack'* instead of a brand name, "
                    "or *'pen'* instead of *'ballpoint pen'*."
                ),
                name="ShoppingAgent",
            )],
        }

    # ── 2. Initial selection: one unique product per term ─────────────────
    # Priority: respect per-category preference; default = cheapest.
    # Globally tracked selected_ids prevents the same product appearing twice.

    selected: list[dict]   = []   # [{slot, product}]
    selected_ids: set[str] = set()

    for slot in term_slots:
        cat_name = slot["category"]
        pref     = item_preferences.get(cat_name, "auto").lower()
        available = [p for p in slot["options"] if p["id"] not in selected_ids]

        if not available:
            logger.info(
                "[Shopping] Skipping '%s' — all options already in cart.", slot["term"]
            )
            continue

        if pref == "premium":
            chosen = available[-1]   # most expensive
        elif pref == "budget":
            chosen = available[0]    # cheapest
        else:
            chosen = available[0]    # cheapest by default (upgrade loop below)

        selected.append({"slot": slot, "product": chosen})
        selected_ids.add(chosen["id"])

    current_total: float = sum(s["product"]["price"] for s in selected)

    # ── 3. Budget upgrade loop: swap to higher tiers if headroom allows ───
    if budget > 0 and current_total < budget:
        made_upgrade = True
        while made_upgrade:
            made_upgrade = False
            for item in selected:
                cat_name = item["slot"]["category"]
                pref     = item_preferences.get(cat_name, "auto").lower()
                if pref == "budget":
                    continue  # user explicitly wants to save here

                options  = item["slot"]["options"]
                current  = item["product"]
                cur_idx  = next(
                    (i for i, p in enumerate(options) if p["id"] == current["id"]), 0
                )

                if cur_idx + 1 >= len(options):
                    continue

                next_item  = options[cur_idx + 1]
                # Skip if another term already claimed this product
                if next_item["id"] in selected_ids and next_item["id"] != current["id"]:
                    continue

                price_diff = next_item["price"] - current["price"]
                if current_total + price_diff <= budget:
                    selected_ids.discard(current["id"])
                    item["product"] = next_item
                    selected_ids.add(next_item["id"])
                    current_total += price_diff
                    made_upgrade = True

    # ── 4. Build final product list ────────────────────────────────────────
    final_products: list[dict] = [s["product"] for s in selected]
    current_total = round(sum(p["price"] for p in final_products), 2)

    print(
        f"\n[Shopping] Done — {len(final_products)} item(s) selected, "
        f"total ${current_total:.2f}"
    )

    # ── 5. Structured JSON payload for the frontend ProductListCard ────────
    product_payload = {
        "type": "product_list",
        "products": [
            {
                "id":               p["id"],
                "product_id":       p.get("product_id", ""),
                "name":             p["name"],
                "price":            round(p["price"], 2),
                "currency":         p.get("currency", "USD"),
                "vendor":           p.get("vendor", "Unknown"),
                "vendor_id":        p.get("vendor_id", ""),
                "merchant_address": p.get("merchant_address", ""),
                "category":         p.get("category", ""),
                "stock":            p.get("stock", 0),
                "images":           p.get("images", []),
            }
            for p in final_products
        ],
        "total":  current_total,
        "budget": budget,
    }

    budget_note = ""
    if budget > 0 and current_total > budget:
        budget_note = (
            f"\n\n⚠️ **Budget note:** Total (${current_total:.2f}) slightly exceeds "
            f"your ${budget:.0f} budget — I picked the most affordable options available."
        )

    reply = f"```json\n{json.dumps(product_payload, indent=2)}\n```"

    return {
        "product_list": final_products,
        "_shopped":     True,
        "steps":        steps + 1,
        "messages":     [AIMessage(content=reply, name="ShoppingAgent")],
    }