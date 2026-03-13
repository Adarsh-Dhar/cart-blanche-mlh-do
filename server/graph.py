"""
graph.py — Cart-Blanche LangGraph
==================================
Wires the five agents into a directed graph with a linear post-node router
that defaults to END (no loops).

Conversation flow per turn:

  NEW REQUEST
      │
      ▼
  orchestrator_node  (interprets intent, extracts products + budget)
      │
      ▼
  shopping_node      (searches Prisma DB, applies budget filter)
      │
      ■ STOP — wait for user: "Looks good" / change request
      │
  merchant_node      (shows cart, builds CartMandate on approval)
      │
      ▼
  vault_node         (encrypts budget via SKALE BITE v2, silent)
      │
      ■ STOP — wait for MetaMask signature (0x…)
      │
  settlement_node    (verifies sig, pays on SKALE, records in Prisma)
      │
      END
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

_SIG_RE = re.compile(r"0x[a-fA-F0-9]{130,}")

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


# ── Entry-point router ────────────────────────────────────────────────────────

def _entry_router(state: AgentState) -> str:
    if state.get("steps", 0) >= MAX_STEPS:
        return END

    user_text = _last_human_text(state)

    if state.get("cart_mandate") and _SIG_RE.search(user_text):
        return "settlement"

    if state.get("cart_mandate") and not state.get("encrypted_budget"):
        return "vault"

    if state.get("product_list") is not None and not state.get("cart_mandate"):
        return "merchant"

    if state.get("project_plan") and not state.get("_shopped"):
        return "shopping"

    return "orchestrator"


# ── Post-node router ──────────────────────────────────────────────────────────

def _post_node_router(state: AgentState) -> str:
    if state.get("steps", 0) >= MAX_STEPS:
        return END

    # orchestrator done → go search (no user input needed)
    if state.get("_orchestrated") and not state.get("_shopped"):
        return "shopping"

    # shopping done → stop, show results, wait for approval
    if state.get("_shopped") and not state.get("cart_mandate"):
        return END

    # merchant approved → encrypt budget (silent, automatic)
    if state.get("cart_mandate") and not state.get("encrypted_budget"):
        return "vault"

    # vault done → stop, wait for MetaMask signature
    if state.get("encrypted_budget") and state.get("cart_mandate"):
        return END

    # settlement done → always end
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

    builder.add_edge("settlement", END)

    return builder.compile(checkpointer=MemorySaver())