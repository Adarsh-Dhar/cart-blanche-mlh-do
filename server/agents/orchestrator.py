"""
agents/orchestrator.py — Orchestrator Agent
============================================
Purpose:
  - Receives the raw user message.
  - Calls GPT-4o-mini (via GitHub Models) to extract:
      * A comma-separated list of concrete products to search for.
      * An optional budget ceiling (e.g. "$200") parsed from natural language.
  - Resets all downstream state so the graph starts fresh every new request.
  - Sets `_orchestrated = True` so the post-node router never re-runs this
    node in the same turn.

Output state keys set:
  project_plan, budget_usd, product_list (reset), cart_mandate (reset),
  encrypted_budget (reset), receipts (reset), _orchestrated, _shopped, steps
"""

from __future__ import annotations

import logging
import re

from langchain_core.messages import AIMessage, HumanMessage

from ..llm import llm
from ..state import AgentState, MAX_STEPS

logger = logging.getLogger(__name__)

_SYSTEM_PROMPT = """\
You are the Lead Project Orchestrator for Cart-Blanche, an AI shopping concierge.

Given the user's request you must extract two things:

1. PRODUCTS: A comma-separated list of concrete product names to search for.
   Example: "noise cancelling headphones, USB-C hub, backpack"

2. BUDGET (optional): If the user mentions a spending limit, extract it as a
   plain number in USD. If no budget is mentioned output 0.

Respond ONLY in this exact format — no preamble, no explanation:
PRODUCTS: <comma-separated list>
BUDGET: <number or 0>
"""


def _parse_response(text: str) -> tuple[str, float]:
    """Parse the two-line LLM response into (plan_string, budget_float)."""
    plan   = ""
    budget = 0.0
    for line in text.splitlines():
        line = line.strip()
        if line.upper().startswith("PRODUCTS:"):
            plan = line.split(":", 1)[1].strip().strip(".")
        elif line.upper().startswith("BUDGET:"):
            raw    = line.split(":", 1)[1].strip()
            digits = re.sub(r"[^\d.]", "", raw)
            try:
                budget = float(digits) if digits else 0.0
            except ValueError:
                budget = 0.0
    return plan, budget


async def orchestrator_node(state: AgentState) -> dict:
    steps = state.get("steps", 0)

    # ── Hard stop ─────────────────────────────────────────────────────────────
    if steps >= MAX_STEPS:
        return {
            "messages": [AIMessage(
                content="⚠️ I seem to be stuck in a loop. Could you rephrase your request?",
                name="Orchestrator",
            )],
            "steps":          steps + 1,
            "_orchestrated":  True,
        }

    # ── Extract last human message ────────────────────────────────────────────
    user_text = ""
    for msg in reversed(state["messages"]):
        if isinstance(msg, HumanMessage):
            user_text = msg.content
            break

    if not user_text.strip():
        return {
            "messages": [AIMessage(
                content="I didn't receive a message. What are you looking for today?",
                name="Orchestrator",
            )],
            "steps":         steps + 1,
            "_orchestrated": True,
        }

    # ── Call LLM ──────────────────────────────────────────────────────────────
    try:
        response = await llm.ainvoke([
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user",   "content": user_text},
        ])
        plan, budget_usd = _parse_response(response.content or "")
    except Exception as exc:
        logger.error("[Orchestrator] LLM error: %s", exc)
        return {
            "messages": [AIMessage(
                content=f"⚠️ Could not reach the AI model. Please try again.\n\nError: {exc}",
                name="Orchestrator",
            )],
            "steps":         steps + 1,
            "_orchestrated": True,
        }

    # ── Validation ────────────────────────────────────────────────────────────
    if not plan:
        return {
            "messages": [AIMessage(
                content=(
                    "I couldn't identify specific products from your message. "
                    "Could you try something like: *'I need wireless headphones "
                    "and a laptop stand under $300'*?"
                ),
                name="Orchestrator",
            )],
            "steps":         steps + 1,
            "_orchestrated": True,
        }

    budget_note = f" (budget: **${budget_usd:.0f}**)" if budget_usd else ""
    logger.info("[Orchestrator] plan='%s' budget=$%.2f", plan[:140], budget_usd)

    return {
        "project_plan":     plan,
        "budget_usd":       budget_usd,
        # Reset all downstream state for this fresh turn
        "product_list":     None,
        "cart_mandate":     None,
        "encrypted_budget": None,
        "receipts":         None,
        "_orchestrated":    True,
        "_shopped":         False,
        "steps":            steps + 1,
        "messages": [AIMessage(
            content=f"🔎 Searching for: **{plan}**{budget_note}",
            name="Orchestrator",
        )],
    }