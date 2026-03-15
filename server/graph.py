"""
graph.py — Cart-Blanche LangGraph (Smart Wallet + Session Key edition)
=======================================================================
Updated routing: settlement no longer waits for a MetaMask signature.
Instead it checks for an active SmartWallet session key in Prisma and
settles via ERC-4337 UserOperation automatically.

New turn-by-turn flow:

  Turn 1 — new shopping request
    orchestrator_node  →  shopping_node  →  STOP (show products)

  Turn 2 — user says "Looks good"
    merchant_node  →  vault_node  →  settlement_node  →  END
    (settlement is now AUTONOMOUS — no MetaMask popup)

Key change from old graph:
  OLD: Turn 2 stopped after vault to show CartMandateCard.
       Turn 3 required a MetaMask signature to trigger settlement.
  NEW: After vault, the graph immediately proceeds to settlement.
       Settlement checks the DB for a session key and signs a UserOp.
"""

from __future__ import annotations

import logging
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

_ALL_ROUTES: dict[str, str] = {
    "orchestrator": "orchestrator",
    "shopping":     "shopping",
    "merchant":     "merchant",
    "vault":        "vault",
    "settlement":   "settlement",
    END:             END,
}


def _last_human_text(state: AgentState) -> str:
    for msg in reversed(state.get("messages", [])):
        if isinstance(msg, HumanMessage):
            return msg.content
    return ""


# ── Entry-point router ────────────────────────────────────────────────────────
def _entry_router(state: AgentState) -> str:
    if state.get("steps", 0) >= MAX_STEPS:
        logger.warning("[Router:entry] Step limit — forcing END.")
        return END

    # Mandate exists but vault not yet run → vault (then settlement)
    if state.get("cart_mandate") and not state.get("encrypted_budget"):
        return "vault"

    # Mandate + vault done but not yet settled → settlement
    if state.get("cart_mandate") and state.get("encrypted_budget") and not state.get("receipts"):
        return "settlement"

    # Products shown, awaiting "Looks good" → merchant
    if state.get("product_list") is not None and not state.get("cart_mandate"):
        return "merchant"

    # Plan set but not yet searched → shopping
    if state.get("project_plan") and not state.get("_shopped"):
        return "shopping"

    # Default: new request
    return "orchestrator"


# ── Post-node router ──────────────────────────────────────────────────────────
def _post_node_router(state: AgentState) -> str:
    if state.get("steps", 0) >= MAX_STEPS:
        logger.warning("[Router:post] Step limit — forcing END.")
        return END

    # orchestrator just ran → automatically proceed to shopping
    if state.get("_orchestrated") and not state.get("_shopped"):
        return "shopping"

    # shopping just ran → STOP, show products, wait for "Looks good"
    if state.get("_shopped") and not state.get("cart_mandate"):
        return END

    # merchant just set mandate → run vault
    if state.get("cart_mandate") and not state.get("encrypted_budget"):
        return "vault"

    # vault just ran → proceed directly to settlement (no signature needed)
    if state.get("encrypted_budget") and state.get("cart_mandate") and not state.get("receipts"):
        return "settlement"

    # settlement just ran → always END
    if state.get("receipts") is not None:
        return END

    return END


# ── Graph factory ─────────────────────────────────────────────────────────────
def build_graph() -> Any:
    builder = StateGraph(AgentState)

    builder.add_node("orchestrator", orchestrator_node)
    builder.add_node("shopping",     shopping_node)
    builder.add_node("merchant",     merchant_node)
    builder.add_node("vault",        vault_node)
    builder.add_node("settlement",   settlement_node)

    builder.set_conditional_entry_point(_entry_router, _ALL_ROUTES)

    for node in ("orchestrator", "shopping", "merchant", "vault"):
        builder.add_conditional_edges(node, _post_node_router, _ALL_ROUTES)

    # Settlement is terminal
    builder.add_edge("settlement", END)

    return builder.compile(checkpointer=MemorySaver())