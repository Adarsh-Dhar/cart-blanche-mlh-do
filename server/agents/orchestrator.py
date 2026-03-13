"""
agents/orchestrator.py — Lead Orchestrator (v2)
================================================
Now extracts three things from the user's message:
  1. PRODUCTS  — semicolon-separated "Category: term, term" search plan
  2. BUDGET    — total USD ceiling (0 = no limit)
  3. PREFERENCES — per-category tier hints ("premium" / "budget" / "auto")
     e.g. "I want a nice backpack but save on stationery"
          → PREFERENCES: Bags=premium; Stationery=budget
"""

from __future__ import annotations
import logging

from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from server.llm   import llm
from server.state import AgentState

logger = logging.getLogger(__name__)

_SYSTEM_PROMPT = """\
You are the Lead Project Orchestrator for a smart shopping assistant.
The user will give you a shopping request. Your job is to output EXACTLY three lines.

────────────────────────────────────────────────────────────
OUTPUT FORMAT (three lines, no extra text before or after):
────────────────────────────────────────────────────────────
PRODUCTS: <semicolon-separated "Category: term1, term2" pairs>
BUDGET: <plain USD number, e.g. 500; use 0 if no budget mentioned>
PREFERENCES: <semicolon-separated "Category=tier" pairs, or "none">

Rules for PRODUCTS:
• Use clear category names: Bags, Stationery, Electronics, Clothing, Lunchware, etc.
• One search term per need — "Stationery: notebook, pen, pencil, highlighter" means
  the user wants FOUR separate stationery products.
• Use simple, generic, singular or short terms: "notebook" not "spiral-bound notebooks",
  "pen" not "ballpoint pen", "backpack" not "hiking backpack brand X".
• Group items into the category they belong to.

Rules for PREFERENCES:
• Only include categories where the user expressed a clear preference.
• Use "premium" for words like: nice, premium, best, high-end, splurge, quality.
• Use "budget" for words like: cheap, save, affordable, basic, cheapest.
• Use "auto" (or omit) when no preference is stated.
• If no preferences at all, output: PREFERENCES: none

────────────────────────────────────────────────────────────
EXAMPLES
────────────────────────────────────────────────────────────
Input: "Help me buy school supplies and a backpack under $200"
PRODUCTS: Stationery: notebook, pen, pencil; Bags: backpack
BUDGET: 200
PREFERENCES: none

Input: "School shopping under $500. I want a really nice backpack but keep stationery cheap"
PRODUCTS: Stationery: notebook, pen, pencil, highlighter; Bags: backpack; Electronics: calculator
BUDGET: 500
PREFERENCES: Bags=premium; Stationery=budget

Input: "Get me noise cancelling headphones, a power bank, and a hoodie. Budget $300. Premium everything."
PRODUCTS: Electronics: noise cancelling headphones, power bank; Clothing: hoodie
BUDGET: 300
PREFERENCES: Electronics=premium; Clothing=premium
"""


async def orchestrator_node(state: AgentState) -> dict:
    print("\n--- ORCHESTRATOR ---")

    # Extract user query from messages
    query = state.get("query")
    if not query:
        for msg in reversed(state.get("messages", [])):
            if isinstance(msg, HumanMessage) or getattr(msg, "type", "") == "human":
                query = msg.content
                break

    if not query:
        return {
            "messages": [AIMessage(
                content="I didn't receive a message. What are you looking for today?",
                name="Orchestrator",
            )],
            "_orchestrated": True,
        }

    # Call the LLM
    response = await llm.ainvoke([
        SystemMessage(content=_SYSTEM_PROMPT),
        HumanMessage(content=query),
    ])
    content = response.content.strip()

    plan        = ""
    budget      = 0.0
    preferences: dict[str, str] = {}

    for line in content.splitlines():
        line = line.strip()
        if line.startswith("PRODUCTS:"):
            plan = line.replace("PRODUCTS:", "").strip()
        elif line.startswith("BUDGET:"):
            try:
                budget = float(line.replace("BUDGET:", "").strip())
            except ValueError:
                budget = 0.0
        elif line.startswith("PREFERENCES:"):
            pref_str = line.replace("PREFERENCES:", "").strip()
            if pref_str.lower() != "none":
                for pair in pref_str.split(";"):
                    pair = pair.strip()
                    if "=" in pair:
                        cat, tier = pair.split("=", 1)
                        preferences[cat.strip()] = tier.strip().lower()

    print(f"Plan:        {plan}")
    print(f"Budget:      ${budget}")
    print(f"Preferences: {preferences}")

    budget_note = f" within a **${budget:.0f}** budget" if budget > 0 else ""
    pref_notes  = ""
    if preferences:
        parts = [f"{cat} → {tier}" for cat, tier in preferences.items()]
        pref_notes = f"  _(preferences: {', '.join(parts)})_"

    return {
        # "query":            query,
        "project_plan":     plan,
        # "budget_usd":       budget,
        # "item_preferences": preferences,
        "_orchestrated":    True,
        "_shopped":         False,
        "product_list":     None,
        "cart_mandate":     None,
    }