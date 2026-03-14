"""
agents/shopping.py — Shopping Agent (v3)
Saves the product_list payload as an AgentResponse in Prisma.
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
    if not chat_id: return
    try:
        db = await get_db()
        await db.agentresponse.create(data={"type": rtype, "text": text, "chatId": chat_id})
    except Exception as exc:
        logger.warning("[DB] Shopping AgentResponse save failed: %s", exc)


def _search_variants(term: str) -> list[str]:
    term = term.strip().lower()
    for suffix, replacement in [
        ("ighters","ighter"),("ifiers","ifier"),("iers","ier"),
        ("ches","ch"),("shes","sh"),("xes","x"),("ses","s"),
        ("ies","y"),("ves","f"),("s",""),
    ]:
        if term.endswith(suffix) and len(term)-len(suffix) >= 2:
            s = term[:-len(suffix)] + replacement
            return [s, term] if s != term else [term]
    return [term]


async def _search_term(term: str) -> list[dict]:
    seen: set[str] = set()
    results: list[dict] = []
    for variant in _search_variants(term):
        try:
            for r in await _ucp_tool.run_async(args={"query": variant}, tool_context=None):
                if r["id"] not in seen:
                    seen.add(r["id"]); results.append(r)
        except Exception as exc:
            logger.warning("[Shopping] Search failed '%s': %s", variant, exc)
        if results: break
    return sorted(results, key=lambda x: x["price"])


async def shopping_node(state: AgentState) -> dict:
    print("\n--- SHOPPING AGENT ---")
    steps = state.get("steps", 0)

    if steps >= MAX_STEPS:
        return {"product_list":[],"_shopped":True,"steps":steps+1,
                "messages":[AIMessage(content="Search limit reached.",name="ShoppingAgent")]}

    plan             = state.get("project_plan","")
    budget           = state.get("budget_usd",0.0) or 0.0
    item_preferences = state.get("item_preferences") or {}

    if not plan:
        return {"product_list":[],"_shopped":True,"steps":steps+1,
                "messages":[AIMessage(content="No search plan found.",name="ShoppingAgent")]}

    print(f"Plan:{plan}  Budget:${budget}  Prefs:{item_preferences}")
    term_slots: list[dict] = []
    for cat_str in [c.strip() for c in plan.split(";") if c.strip()]:
        if ":" not in cat_str: continue
        cat_name, terms_str = cat_str.split(":",1)
        for term in [t.strip() for t in terms_str.split(",") if t.strip()]:
            print(f"  Searching '{term}' ({cat_name.strip()})...")
            options = await _search_term(term)
            if options:
                print(f"    -> {len(options)} result(s)")
                term_slots.append({"category":cat_name.strip(),"term":term,"options":options})
            else:
                print("    -> no results")

    if not term_slots:
        return {"product_list":[],"_shopped":True,"steps":steps+1,
                "messages":[AIMessage(content="No in-stock products found.",name="ShoppingAgent")]}

    selected: list[dict] = []
    selected_ids: set[str] = set()
    for slot in term_slots:
        pref = item_preferences.get(slot["category"],"auto").lower()
        avail = [p for p in slot["options"] if p["id"] not in selected_ids]
        if not avail: continue
        chosen = avail[-1] if pref=="premium" else avail[0]
        selected.append({"slot":slot,"product":chosen}); selected_ids.add(chosen["id"])

    current_total = sum(s["product"]["price"] for s in selected)

    if budget > 0 and current_total < budget:
        improved = True
        while improved:
            improved = False
            for item in selected:
                if item_preferences.get(item["slot"]["category"],"auto").lower()=="budget": continue
                cur = item["product"]; best=None; best_diff=0.0
                for cand in item["slot"]["options"]:
                    if cand["id"]==cur["id"] or cand["id"] in selected_ids: continue
                    diff = cand["price"]-cur["price"]
                    if diff>0 and current_total+diff<=budget and diff>best_diff:
                        best_diff=diff; best=cand
                if best:
                    selected_ids.discard(cur["id"]); selected_ids.add(best["id"])
                    current_total=round(current_total+best_diff,2); item["product"]=best; improved=True

    final_products = [s["product"] for s in selected]
    current_total  = round(sum(p["price"] for p in final_products),2)
    print(f"\n[Shopping] Done — {len(final_products)} items, total ${current_total:.2f}")

    payload = {
        "type":"product_list","total":current_total,"budget":budget,
        "products":[{"id":p["id"],"product_id":p.get("product_id",""),
            "name":p["name"],"price":round(p["price"],2),"currency":p.get("currency","USD"),
            "vendor":p.get("vendor","Unknown"),"vendor_id":p.get("vendor_id",""),
            "merchant_address":p.get("merchant_address",""),"category":p.get("category",""),
            "stock":p.get("stock",0),"images":p.get("images",[])} for p in final_products],
    }
    payload_json = json.dumps(payload, indent=2)
    await _save_agent_response(state, "PRODUCT_LIST", payload_json)
    return {
        "product_list":final_products,"_shopped":True,"steps":steps+1,
        "messages":[AIMessage(content=f"```json\n{payload_json}\n```",name="ShoppingAgent")],
    }