"""
state.py — Shared AgentState definition
========================================
Single source of truth for the LangGraph state schema.
"""

from __future__ import annotations

from typing import Annotated, Sequence

from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages
from typing_extensions import TypedDict

MAX_STEPS: int = 10


class AgentState(TypedDict):
    # ── Conversation history ──────────────────────────────────────────────────
    messages: Annotated[Sequence[BaseMessage], add_messages]

    # ── Session / DB tracking ─────────────────────────────────────────────────
    session_id:      str | None   # frontend session id → used as chat key
    chat_id:         str | None   # Prisma Chat.id (cuid)
    user_request_id: str | None   # Prisma UserRequest.id for the current turn

    # ── Orchestrator inputs ───────────────────────────────────────────────────
    query: str | None

    # ── Orchestrator outputs ──────────────────────────────────────────────────
    project_plan: str | None
    budget_usd:   float | None
    item_preferences: dict | None

    # ── Shopping Agent output ─────────────────────────────────────────────────
    product_list: list | None

    # ── Merchant Agent output ─────────────────────────────────────────────────
    cart_mandate: dict | None

    # ── Vault Agent output ────────────────────────────────────────────────────
    encrypted_budget: dict | None

    # ── Settlement Agent output ───────────────────────────────────────────────
    receipts: list | None

    # ── Loop-prevention counters ──────────────────────────────────────────────
    steps:         int
    _orchestrated: bool
    _shopped:      bool