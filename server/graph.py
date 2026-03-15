"""
graph.py — Cart-Blanche LangGraph (Smart Wallet + Session Key edition)
=======================================================================
Turn-by-turn flow:

  Turn 1 — new shopping request
    orchestrator_node  →  shopping_node  →  STOP (show products)

  Turn 2 — user says "Looks good"  (state restored from MemorySaver checkpoint)
    merchant_node  →  vault_node  →  settlement_node  →  END
    (fully autonomous — no MetaMask popup)

The critical fix vs the original: the entry router checks for product_list
in the CURRENT checkpoint state (loaded by MemorySaver), NOT just the
fields passed in init_state. This means "Looks good" correctly routes to
merchant even though init_state only contains the new message.
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

_AFFIRMATION_KEYWORDS = {
    "looks good", "confirm", "proceed", "yes", "ok", "approve",
    "go ahead", "do it", "buy it", "let's do it", "sounds good",
    "perfect", "great", "checkout", "purchase", "sure", "yep", "yup",
}


def _last_human_text(state: AgentState) -> str:
    for msg in reversed(state.get("messages", [])):
        if isinstance(msg, HumanMessage):
            return msg.content.lower().strip()
        if isinstance(msg, tuple) and msg[0] == "user":
            return msg[1].lower().strip()
    return ""


def _is_affirmation(text: str) -> bool:
    import re
    return any(
        re.search(rf'\b{re.escape(k)}\b', text)
        for k in _AFFIRMATION_KEYWORDS
    )


# ── Entry-point router ────────────────────────────────────────────────────────
def _entry_router(state: AgentState) -> str:
    if state.get("steps", 0) >= MAX_STEPS:
        logger.warning("[Router:entry] Step limit — forcing END.")
        return END

    # Settlement already has receipts — END
    if state.get("receipts") is not None:
        return END

    # Vault ran but settlement hasn't → settlement
    if state.get("encrypted_budget") and state.get("cart_mandate") and not state.get("receipts"):
        return "settlement"

    # Mandate exists but vault not yet run → vault
    if state.get("cart_mandate") and not state.get("encrypted_budget"):
        return "vault"

    # Check if the latest human message is an affirmation
    last_text = _last_human_text(state)
    if last_text and _is_affirmation(last_text):
        # If we have products staged → go to merchant
        if state.get("product_list") is not None and len(state.get("product_list", [])) > 0:
            logger.info("[Router:entry] Affirmation + product_list → merchant")
            return "merchant"
        # Products might already have been shown in a previous turn,
        # cart_mandate not set yet → merchant
        if not state.get("cart_mandate"):
            logger.info("[Router:entry] Affirmation (no product_list in state) → orchestrator to re-shop")
            # Fall through to orchestrator which will re-run shopping if needed

    # Products shown, no mandate yet → wait (this path means we just finished shopping)
    if state.get("product_list") is not None and not state.get("cart_mandate"):
        # We are here only if it's NOT an affirmation — just showed products, waiting
        return END

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

    # orchestrator just ran → shopping
    if state.get("_orchestrated") and not state.get("_shopped"):
        return "shopping"

    # shopping just ran → STOP, show products, wait for confirmation
    if state.get("_shopped") and not state.get("cart_mandate"):
        return END

    # merchant just set mandate → vault
    if state.get("cart_mandate") and not state.get("encrypted_budget"):
        return "vault"

    # vault just ran → settlement
    if state.get("encrypted_budget") and state.get("cart_mandate") and not state.get("receipts"):
        return "settlement"

    # settlement complete → END
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