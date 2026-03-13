"""
state.py — Shared AgentState definition
========================================
Single source of truth for the LangGraph state schema.
Imported by server/graph.py and every agent in server/agents/.
"""

from __future__ import annotations

from typing import Annotated, Sequence

from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages
from typing_extensions import TypedDict

# Hard ceiling on node executions per user turn.
# Protects the GitHub Models API quota against runaway loops.
MAX_STEPS: int = 10


class AgentState(TypedDict):
    # ── Conversation history ──────────────────────────────────────────────────
    messages: Annotated[Sequence[BaseMessage], add_messages]

    # ── Orchestrator inputs ──────────────────────────────────────────────────────
    query: str | None  # User's query text

    # ── Orchestrator outputs ──────────────────────────────────────────────────
    project_plan: str | None    # comma-separated product search terms
    budget_usd:   float | None  # optional spend ceiling parsed from user message

    # ── Shopping Agent output ─────────────────────────────────────────────────
    # None  = not yet searched
    # []    = searched, nothing found
    # [...]  = list of product dicts from UCPCommerceSearchTool
    product_list: list | None

    # ── Merchant Agent output ─────────────────────────────────────────────────
    cart_mandate: dict | None   # EIP-712-ready mandate dict for MetaMask

    # ── Vault Agent output ────────────────────────────────────────────────────
    encrypted_budget: dict | None  # SKALE BITE v2 ciphertext

    # ── Settlement Agent output ───────────────────────────────────────────────
    receipts: list | None       # list of on-chain TX receipt dicts

    # ── Loop-prevention counters ──────────────────────────────────────────────
    steps:         int   # incremented by every node; hard-stops at MAX_STEPS
    _orchestrated: bool  # True once orchestrator has run this turn
    _shopped:      bool  # True once shopping_node has run this turn