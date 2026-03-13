# server/agents/orchestrator.py
from __future__ import annotations
import logging

from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from server.llm import llm
from server.state import AgentState

logger = logging.getLogger(__name__)

_SYSTEM_PROMPT = """\
You are the Lead Project Orchestrator. The user will give you a shopping request.
Your job is to break this request down into specific search queries for a Shopping Agent and extract the total budget.

You must output exactly two things, and nothing else:
1. PRODUCTS: A semicolon-separated list of product categories and their specific search terms. 
   Format must exactly be: "Category: search term 1, search term 2; Category: search term 1"
   Example: "Bags: backpack, duffel bag; Electronics: scientific calculator"
   CRITICAL: Group similar items into the same category to avoid buying duplicates. 
2. BUDGET: A plain number representing the total budget in USD (e.g., 500). If no budget is specified, use 0.

Example input: "Help me buy a laptop and a mouse under $1000"
Example output:
PRODUCTS: Computer: laptop; Accessories: wireless mouse
BUDGET: 1000
"""

async def orchestrator_node(state: AgentState) -> dict:
    print("\n--- ORCHESTRATOR ---")
    
    # 1. Extract the user's query from the state's message history 
    # (since main.py seeds it into `messages` array)
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
                name="Orchestrator"
            )],
            "_orchestrated": True
        }

    # 2. Query the LLM
    messages = [
        SystemMessage(content=_SYSTEM_PROMPT),
        HumanMessage(content=query)
    ]
    
    response = await llm.ainvoke(messages)
    content = response.content.strip()
    
    plan = ""
    budget = 0.0
    
    # 3. Parse the LLM output
    for line in content.split('\n'):
        if line.startswith("PRODUCTS:"):
            plan = line.replace("PRODUCTS:", "").strip()
        elif line.startswith("BUDGET:"):
            try:
                budget_str = line.replace("BUDGET:", "").strip()
                budget = float(budget_str)
            except ValueError:
                budget = 0.0

    print(f"Extracted Plan (Categories): {plan}")
    print(f"Extracted Budget: ${budget}")
    
    budget_note = f" (budget: **${budget:.0f}**)" if budget > 0 else ""

    # 4. Return matching the AgentState schema with an AIMessage for the UI
    return {
        "query": query,
        "project_plan": plan, 
        "budget_usd": budget,
        "_orchestrated": True,
        "_shopped": False, # Reset downstream agent flags for a fresh flow
        "product_list": None,
        "cart_mandate": None,
        "messages": [AIMessage(
            content=f"🔎 Searching for: **{plan}**{budget_note}",
            name="Orchestrator"
        )]
    }