"""
agents/shopping.py — Shopping Agent (v4)
=========================================
Strategy:
  1. For every search term, pick the PREMIUM (most expensive) option that
     fits the remaining budget — unless the user explicitly asked for budget tier.
  2. After the initial selection, repeatedly scan ALL available candidates
     (across every searched term) and keep adding the most expensive item
     that still fits within the remaining budget.
  3. This continues until no single remaining candidate fits in the leftover
     budget, ensuring spend is as close to the budget ceiling as possible.
"""
from __future__ import annotations
import json, logging
from langchain_core.messages import AIMessage
from server.state import AgentState, MAX_STEPS
from server.tool.ucp_search import UCPCommerceSearchTool
from server.db import get_db

logger = logging.getLogger(__name__)
_ucp_tool = UCPCommerceSearchTool()


async def _save_agent_response(state: AgentState, rtype: str, text: str) -> None:
    chat_id = state.get("chat_id")
    if not chat_id:
        return
    try:
        db = await get_db()
        await db.agentresponse.create(data={"type": rtype, "text": text, "chatId": chat_id})
    except Exception as exc:
        logger.warning("[DB] Shopping AgentResponse save failed: %s", exc)


def _search_variants(term: str) -> list[str]:
    term = term.strip().lower()
    for suffix, replacement in [
        ("ighters", "ighter"), ("ifiers", "ifier"), ("iers", "ier"),
        ("ches", "ch"), ("shes", "sh"), ("xes", "x"), ("ses", "s"),
        ("ies", "y"), ("ves", "f"), ("s", ""),
    ]:
        if term.endswith(suffix) and len(term) - len(suffix) >= 2:
            s = term[: -len(suffix)] + replacement
            return [s, term] if s != term else [term]
    return [term]


async def _search_term(term: str) -> list[dict]:
    seen: set[str] = set()
    results: list[dict] = []
    for variant in _search_variants(term):
        try:
            for r in await _ucp_tool.run_async(args={"query": variant}, tool_context=None):
                if r["id"] not in seen:
                    seen.add(r["id"])
                    results.append(r)
        except Exception as exc:
            logger.warning("[Shopping] Search failed '%s': %s", variant, exc)
        if results:
            break
    return sorted(results, key=lambda x: x["price"])


async def shopping_node(state: AgentState) -> dict:
    print("\n--- SHOPPING AGENT ---")
    steps = state.get("steps", 0)

    if steps >= MAX_STEPS:
        return {
            "product_list": [], "_shopped": True, "steps": steps + 1,
            "messages": [AIMessage(content="Search limit reached.", name="ShoppingAgent")],
        }

    plan             = state.get("project_plan", "")
    budget           = state.get("budget_usd", 0.0) or 0.0
    item_preferences = state.get("item_preferences") or {}

    if not plan:
        return {
            "product_list": [], "_shopped": True, "steps": steps + 1,
            "messages": [AIMessage(content="No search plan found.", name="ShoppingAgent")],
        }

    print(f"Plan:{plan}  Budget:${budget}  Prefs:{item_preferences}")

    # ── Phase 1: search all terms ─────────────────────────────────────────────
    # term_slots[i] = { category, term, options: [cheapest … most expensive] }
    term_slots: list[dict] = []
    for cat_str in [c.strip() for c in plan.split(";") if c.strip()]:
        if ":" not in cat_str:
            continue
        cat_name, terms_str = cat_str.split(":", 1)
        for term in [t.strip() for t in terms_str.split(",") if t.strip()]:
            print(f"  Searching '{term}' ({cat_name.strip()})...")
            options = await _search_term(term)
            if options:
                print(f"    -> {len(options)} result(s)")
                term_slots.append({
                    "category": cat_name.strip(),
                    "term":     term,
                    "options":  options,   # sorted cheapest → most expensive
                })
            else:
                print("    -> no results")

    if not term_slots:
        return {
            "product_list": [], "_shopped": True, "steps": steps + 1,
            "messages": [AIMessage(content="No in-stock products found.", name="ShoppingAgent")],
        }

    # ── Phase 2: initial selection — one item per term slot ───────────────────
    # Default: pick the MOST EXPENSIVE option that fits the remaining budget
    # (premium-first policy).  Override to cheapest only when user said "budget".
    selected: list[dict] = []     # {"slot": ..., "product": ...}
    selected_ids: set[str] = set()
    remaining = budget

    for slot in term_slots:
        pref = item_preferences.get(slot["category"], "auto").lower()
        avail = [p for p in slot["options"] if p["id"] not in selected_ids]
        if not avail:
            continue

        if pref == "budget":
            # User explicitly wants cheap — pick cheapest regardless
            chosen = avail[0]
        else:
            # Premium-first: pick most expensive that fits remaining budget,
            # fall back down the list until one fits, or take cheapest if
            # nothing fits (we still want the item, budget is a soft ceiling
            # for individual items but hard for total).
            fits = [p for p in reversed(avail) if p["price"] <= remaining] if budget > 0 else list(reversed(avail))
            chosen = fits[0] if fits else avail[0]

        selected.append({"slot": slot, "product": chosen})
        selected_ids.add(chosen["id"])
        remaining = round(remaining - chosen["price"], 2)

    # ── Phase 3: budget-fill loop ─────────────────────────────────────────────
    # Repeatedly find the most expensive candidate across ALL slots that still
    # fits in the remaining budget, and add it to the cart.
    # Stop when nothing fits or remaining budget is negligible (<$1).
    if budget > 0:
        # Build a flat pool of every candidate not yet selected
        def _all_candidates() -> list[dict]:
            """Return all unselected products from every slot, sorted most expensive first."""
            pool: list[dict] = []
            for slot in term_slots:
                for p in slot["options"]:
                    if p["id"] not in selected_ids:
                        pool.append({"slot": slot, "product": p})
            # Sort most expensive first so we always spend as much as possible
            return sorted(pool, key=lambda x: x["product"]["price"], reverse=True)

        improved = True
        while improved and remaining >= 1.0:
            improved = False
            for candidate in _all_candidates():
                price = candidate["product"]["price"]
                if price <= remaining:
                    selected.append(candidate)
                    selected_ids.add(candidate["product"]["id"])
                    remaining = round(remaining - price, 2)
                    improved = True
                    break   # restart scan after each addition (pool changed)

    # ── Phase 4: upgrade existing items if budget still allows ────────────────
    # After the fill loop, if a slot has a pricier variant we haven't added yet
    # and it fits in the remaining budget, swap up.
    if budget > 0:
        for item in selected:
            if item_preferences.get(item["slot"]["category"], "auto").lower() == "budget":
                continue
            cur   = item["product"]
            avail = [
                p for p in item["slot"]["options"]
                if p["id"] not in selected_ids and p["price"] > cur["price"]
            ]
            best: dict | None = None
            best_delta = 0.0
            for cand in avail:
                delta = cand["price"] - cur["price"]
                if delta <= remaining and delta > best_delta:
                    best_delta = delta
                    best = cand
            if best:
                selected_ids.discard(cur["id"])
                selected_ids.add(best["id"])
                remaining = round(remaining - best_delta, 2)
                item["product"] = best

    final_products = [s["product"] for s in selected]
    total_spent    = round(sum(p["price"] for p in final_products), 2)
    print(f"\n[Shopping] Done — {len(final_products)} items, total ${total_spent:.2f} "
          f"(budget ${budget:.2f}, utilisation {total_spent/budget*100:.1f}%)" if budget > 0
          else f"\n[Shopping] Done — {len(final_products)} items, total ${total_spent:.2f}")

    payload = {
        "type":    "product_list",
        "total":   total_spent,
        "budget":  budget,
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
    }
    payload_json = json.dumps(payload, indent=2)
    await _save_agent_response(state, "PRODUCT_LIST", payload_json)

    return {
        "product_list": final_products,
        "_shopped":     True,
        "steps":        steps + 1,
        "messages":     [AIMessage(content=f"```json\n{payload_json}\n```", name="ShoppingAgent")],
    }