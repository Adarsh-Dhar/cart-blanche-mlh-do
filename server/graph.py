"""
graph.py — Cart-Blanche LangGraph
==================================
Wires the five agents into a directed graph with a linear post-node router
that defaults to END after every node (no loops possible).

Turn-by-turn conversation flow:

  Turn 1 — new request
    orchestrator_node  →  shopping_node  →  STOP (show products)

  Turn 2 — user says "Looks good"
    merchant_node  →  vault_node  →  STOP (show mandate, await MetaMask)

  Turn 3 — user pastes 0x signature
    settlement_node  →  END (show receipts)
"""

from __future__ import annotations

import logging
import re
from typing import Any

from langchain_core.messages import HumanMessage
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, StateGraph

from .state import AgentState, MAX_STEPS
from .agents import (
    orchestrator_node,
    shopping_node,
    merchant_node,
    vault_node,
    settlement_node,
)

logger = logging.getLogger(__name__)

# EIP-712 signature pattern
_SIG_RE = re.compile(r"0x[a-fA-F0-9]{130,}")

# Complete route map used by both routers — LangGraph requires all possible
# return values to be listed here.
_ALL_ROUTES: dict[str, str] = {
    "orchestrator": "orchestrator",
    "shopping":     "shopping",
    "merchant":     "merchant",
    "vault":        "vault",
    "settlement":   "settlement",
    END:            END,
}


def _last_human_text(state: AgentState) -> str:
    for msg in reversed(state.get("messages", [])):
        if isinstance(msg, HumanMessage):
            return msg.content
    return ""


# ── Entry-point router ─────────────────────────────────────────────────────────
# Called once per user turn; decides where to re-enter the graph to resume
# an in-progress purchase flow, or starts fresh at the orchestrator.

def _entry_router(state: AgentState) -> str:
    if state.get("steps", 0) >= MAX_STEPS:
        logger.warning("[Router:entry] Step limit — forcing END.")
        return END

    user_text = _last_human_text(state)

    # Signature pasted → settle
    if state.get("cart_mandate") and _SIG_RE.search(user_text):
        return "settlement"

    # Mandate exists but vault not yet run → run vault (then STOP for sig)
    if state.get("cart_mandate") and not state.get("encrypted_budget"):
        return "vault"

    # Products shown, awaiting approval → merchant
    if state.get("product_list") is not None and not state.get("cart_mandate"):
        return "merchant"

    # Plan set but not yet searched → shopping
    if state.get("project_plan") and not state.get("_shopped"):
        return "shopping"

    # Default: new request
    return "orchestrator"


# ── Post-node router ───────────────────────────────────────────────────────────
# After each node completes, continue automatically ONLY when no user input
# is needed for the next step; otherwise default to END.

def _post_node_router(state: AgentState) -> str:
    if state.get("steps", 0) >= MAX_STEPS:
        logger.warning("[Router:post] Step limit — forcing END.")
        return END

    # orchestrator just ran → automatically proceed to shopping
    if state.get("_orchestrated") and not state.get("_shopped"):
        return "shopping"

    # shopping just ran → STOP, show results, wait for "Looks good"
    if state.get("_shopped") and not state.get("cart_mandate"):
        return END

    # merchant just set mandate → run vault silently (no user input needed)
    if state.get("cart_mandate") and not state.get("encrypted_budget"):
        return "vault"

    # vault just ran → STOP, wait for MetaMask signature
    if state.get("encrypted_budget") and state.get("cart_mandate"):
        return END

    # settlement just ran → always END
    if state.get("receipts") is not None:
        return END

    return END


# ── Graph factory ──────────────────────────────────────────────────────────────

def build_graph() -> Any:
    builder = StateGraph(AgentState)

    builder.add_node("orchestrator", orchestrator_node)
    builder.add_node("shopping",     shopping_node)
    builder.add_node("merchant",     merchant_node)
    builder.add_node("vault",        vault_node)
    builder.add_node("settlement",   settlement_node)

    # One conditional entry — decides where to resume or start
    builder.set_conditional_entry_point(_entry_router, _ALL_ROUTES)

    # All non-terminal nodes use the linear post-node router
    for node in ("orchestrator", "shopping", "merchant", "vault"):
        builder.add_conditional_edges(node, _post_node_router, _ALL_ROUTES)

    # Settlement is always terminal
    builder.add_edge("settlement", END)

    return builder.compile(checkpointer=MemorySaver())