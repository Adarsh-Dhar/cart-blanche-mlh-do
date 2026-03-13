"""
state.py — Shared AgentState definition
========================================
Single source of truth for the LangGraph state schema.
Imported by graph.py and every agent module.
"""

from __future__ import annotations

from typing import Annotated, Sequence

from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages
from typing_extensions import TypedDict

# Maximum node executions allowed per user turn before hard-stopping.
# Prevents runaway loops and protects GitHub Models API quota.
MAX_STEPS: int = 10


class AgentState(TypedDict):
    # ── Conversation history ──────────────────────────────────────────────────
    messages: Annotated[Sequence[BaseMessage], add_messages]

    # ── Orchestrator outputs ──────────────────────────────────────────────────
    project_plan: str | None        # comma-separated product search terms
    budget_usd:   float | None      # optional spend ceiling parsed by orchestrator

    # ── Shopping Agent output ─────────────────────────────────────────────────
    # None  = not yet searched
    # []    = searched, nothing found
    # [...]  = list of product dicts from Prisma / UCPCommerceSearchTool
    product_list: list | None

    # ── Merchant Agent output ─────────────────────────────────────────────────
    cart_mandate: dict | None       # EIP-712-ready mandate for MetaMask signing

    # ── Vault Agent output ────────────────────────────────────────────────────
    encrypted_budget: dict | None   # SKALE BITE v2 ciphertext

    # ── Settlement Agent output ───────────────────────────────────────────────
    receipts: list | None           # list of on-chain TX receipts

    # ── Loop-prevention ───────────────────────────────────────────────────────
    steps:         int              # incremented by every node; stops at MAX_STEPS
    _orchestrated: bool             # True once orchestrator ran this turn
    _shopped:      bool             # True once shopping_node ran this turn