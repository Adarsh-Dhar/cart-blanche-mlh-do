"""
agents/shopping.py — Shopping Agent (v6)
=========================================
Alias map and relevance scoring are built DYNAMICALLY from the live
catalog fetched by catalog.py. Fully supports colon-less semantic parsing.
"""
from __future__ import annotations
import json
import logging
from langchain_core.messages import AIMessage
from server.state import AgentState, MAX_STEPS
from server.db import get_db
from .catalog  import build_alias_map, get_raw_products

logger = logging.getLogger(__name__)

# ── Permanent safety-net aliases ──────────────────────────────────────────────
_HARDCODED_ALIASES: dict[str, list[str]] = {
    "gpu cluster":              ["H100", "GPU cluster", "GPU", "compute"],
    "vps server":               ["VPS", "dedicated server", "virtual private"],
    "etl pipeline":             ["ETL", "data pipeline", "managed pipeline"],
    "gpt-4 token voucher":      ["GPT-4", "token proxy", "50M", "OpenAI"],
    "vector database":          ["vector", "vector DB", "Pinecone", "RAG", "embeddings"],
    "neon cyber ui kit":        ["Neon", "Cyber", "UI Kit", "Figma kit"],
    "cinematic ambient audio":  ["cinematic", "ambient", "audio bundle", "loop"],
    "podcast production kit":   ["podcast", "jingle", "intro music"],
    "jetbrains ide":            ["JetBrains", "IntelliJ", "WebStorm", "PyCharm"],
    "docker pro":               ["Docker", "container", "Docker Pro"],
    "ai coding assistant":      ["AI coding", "Copilot", "coding assistant", "lifetime"],
    "aws voucher":              ["AWS", "Solutions Architect", "Amazon certification"],
    "vpn pro":                  ["VPN", "Enterprise VPN", "WireGuard"],
    "font collection":          ["font", "typography", "typeface", "premium font"],
}

async def _get_merged_aliases() -> dict[str, list[str]]:
    """Merge dynamic aliases (from live DB) with permanent hardcoded aliases."""
    dynamic = await build_alias_map()
    merged  = dict(_HARDCODED_ALIASES)       
    for key, variants in dynamic.items():
        if key in merged:
            existing = {v.lower() for v in merged[key]}
            for v in variants:
                if v.lower() not in existing:
                    merged[key].append(v)
        else:
            merged[key] = variants
    return merged

def _find_aliases(term: str, alias_map: dict[str, list[str]]) -> list[str]:
    term_lower = term.strip().lower()
    if term_lower in alias_map:
        return alias_map[term_lower]
    for key, variants in alias_map.items():
        if key in term_lower or term_lower in key:
            return variants
        if any(v.lower() in term_lower for v in variants[:3]):
            return variants
    stemmed = term_lower.rstrip("s") if term_lower.endswith("s") else term_lower
    return [term, stemmed] if stemmed != term_lower else [term]

async def _search_term(term: str, alias_map: dict[str, list[str]]) -> list[dict]:
    """Directly searches the cached catalog bypassing complex Prisma OR filters."""
    products = await get_raw_products()
    variants = _find_aliases(term, alias_map)
    
    results = []
    seen_ids = set()

    for p in products:
        name_lower = p.get('name', '').lower()
        desc_lower = p.get('description', '').lower()
        
        score = 0
        for variant in variants:
            v_lower = variant.lower()
            if v_lower == name_lower:
                score = max(score, 100)
            elif v_lower in name_lower:
                score = max(score, 50)
            elif v_lower in desc_lower:
                score = max(score, 10)
                
        if score > 0 and p.get("id") not in seen_ids:
            seen_ids.add(p.get("id"))
            
            # Safely extract nested properties
            vendor_name = p.get("vendor", {}).get("name", "Unknown") if isinstance(p.get("vendor"), dict) else "Unknown"
            vendor_address = p.get("vendor", {}).get("pubkey", "") if isinstance(p.get("vendor"), dict) else ""
            category_name = p.get("category", {}).get("name", "") if isinstance(p.get("category"), dict) else ""
            
            mapped_product = {
                "id": p.get("id"),
                "product_id": p.get("productID", ""),
                "name": p.get("name", ""),
                "description": p.get("description", ""),
                "price": float(p.get("price", 0.0)),
                "currency": "USD",
                "vendor": vendor_name,
                "merchant_address": vendor_address,
                "category": category_name,
                "stock": p.get("stockQuantity", 999),
                "images": p.get("images", []),
                "_relevance": score
            }
            results.append(mapped_product)

    results.sort(key=lambda x: (-x.get('_relevance', 0), x.get('price', 0)))
    return results[:5]

async def _save_agent_response(state: AgentState, rtype: str, text: str) -> None:
    chat_id = state.get("chat_id")
    if not chat_id: return
    try:
        db = await get_db()
        await db.agentresponse.create(data={"type": rtype, "text": text, "chatId": chat_id})
    except Exception as exc:
        logger.warning("[DB] Shopping AgentResponse save failed: %s", exc)

async def shopping_node(state: AgentState) -> dict:
    print("\n--- SHOPPING AGENT (v6 — semantic parsing) ---")
    steps = state.get("steps", 0)

    if steps >= MAX_STEPS:
        return {"product_list": [], "_shopped": True, "steps": steps + 1, "messages": [AIMessage(content="Search limit reached.", name="ShoppingAgent")]}

    plan             = state.get("project_plan", "")
    budget           = state.get("budget_usd", 0.0) or 0.0
    item_preferences = state.get("item_preferences") or {}

    if not plan:
        return {"product_list": [], "_shopped": True, "steps": steps + 1, "messages": [AIMessage(content="No search plan found.", name="ShoppingAgent")]}

    print(f"Plan: {plan}  Budget: ${budget}  Prefs: {item_preferences}")
    alias_map = await _get_merged_aliases()

    term_slots: list[dict] = []
    for raw_term in [c.strip() for c in plan.split(";") if c.strip()]:
        cat_name = "Catalog"
        term = raw_term
        if ":" in raw_term:
            parts = raw_term.split(":", 1)
            cat_name = parts[0].strip()
            term = parts[1].strip()
            
        print(f"  Searching '{term}' ({cat_name})...")
        options = await _search_term(term, alias_map)
        
        if options:
            best = options[0]
            print(f"    -> {len(options)} results | top: {best['name']} (${best['price']}) rel={best.get('_relevance',0)}")
            term_slots.append({"category": cat_name, "term": term, "options": options})
        else:
            print(f"    -> no results for '{term}'")

    if not term_slots:
        return {
            "product_list": [], "_shopped": True, "steps": steps + 1,
            "messages": [AIMessage(content="I couldn't find matching items in the catalog.", name="ShoppingAgent")]
        }

    selected: list[dict] = []
    selected_ids: set[str] = set()
    remaining = budget

    for slot in term_slots:
        pref  = item_preferences.get(slot["category"], "auto").lower()
        avail = [p for p in slot["options"] if p["id"] not in selected_ids]
        if not avail: continue

        if pref == "budget":
            fits   = [p for p in avail if p["price"] <= remaining] if budget > 0 else avail
            chosen = fits[0] if fits else avail[0]
        else:
            if budget > 0:
                fits = [p for p in avail if p["price"] <= remaining]
                if fits:
                    fits.sort(key=lambda x: (-x.get("_relevance", 0), -x["price"]))
                    chosen = fits[0]
                else:
                    chosen = avail[0]
            else:
                avail_s = sorted(avail, key=lambda x: (-x.get("_relevance", 0), -x["price"]))
                chosen  = avail_s[0]

        selected.append({"slot": slot, "product": chosen})
        selected_ids.add(chosen["id"])
        remaining = round(remaining - chosen["price"], 2)

    if budget > 0:
        def _all_candidates() -> list[dict]:
            pool = [{"slot": s, "product": p} for s in term_slots for p in s["options"] if p["id"] not in selected_ids]
            pool.sort(key=lambda x: (-x["product"].get("_relevance", 0), -x["product"]["price"]))
            return pool

        improved = True
        while improved and remaining >= 1.0:
            improved = False
            for candidate in _all_candidates():
                if candidate["product"]["price"] <= remaining:
                    selected.append(candidate)
                    selected_ids.add(candidate["product"]["id"])
                    remaining = round(remaining - candidate["product"]["price"], 2)
                    improved  = True
                    break

    final_products = [s["product"] for s in selected]
    total_spent    = round(sum(p["price"] for p in final_products), 2)

    payload = {
        "type":             "product_list",
        "total":            total_spent,
        "budget":           budget,
        "remaining_budget": round(remaining, 2),
        "products": [
            {
                "id":               p.get("id", ""),
                "product_id":       p.get("product_id", ""),
                "name":             p.get("name", ""),
                "description":      p.get("description", ""),
                "price":            round(p.get("price", 0.0), 2),
                "currency":         p.get("currency", "USD"),
                "vendor":           p.get("vendor", "Unknown"),
                "merchant_address": p.get("merchant_address", ""),
                "images":           p.get("images", []),
                "relevance_score":  p.get("_relevance", 0),
            }
            for p in final_products
        ],
    }
    payload_json = json.dumps(payload, indent=2)
    await _save_agent_response(state, "PRODUCT_LIST", payload_json)

    lines = ["Here's what I found for you:\n"]
    for p in final_products:
        lines.append(f"  - {p['name']} — ${p['price']:.2f}  [{p.get('vendor', '')}]")
    lines.append(f"\nTotal: ${total_spent:.2f}")
    if budget > 0 and remaining > 0:
        lines.append(f"Remaining budget: ${remaining:.2f}")
    lines.append("\nDoes this look good? Reply 'confirm' to proceed to checkout.")

    return {
        "product_list": final_products,
        "_shopped":     True,
        "steps":        steps + 1,
        "messages":     [
            AIMessage(content="\n".join(lines), name="ShoppingAgent"),
            AIMessage(content=f"```json\n{payload_json}\n```", name="ShoppingAgent"),
        ],
    }