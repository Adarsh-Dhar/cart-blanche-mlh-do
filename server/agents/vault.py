"""
agents/vault.py — Vault / Privacy Agent
========================================
Purpose:
  - Takes the total USDC budget from `cart_mandate` and encrypts it via
    the SKALE BITE v2 threshold encryption protocol (mock in dev, real in prod).
  - Stores the result in `encrypted_budget` for audit / privacy purposes.

This node is intentionally SILENT — it emits no user-facing message because
it runs automatically (and instantly) between merchant approval and the
MetaMask signature prompt.

Output state keys set:
  encrypted_budget, steps
"""

from __future__ import annotations

import logging

from ..state import AgentState
from ..tool.skale_bite import skale_bite

logger = logging.getLogger(__name__)


async def vault_node(state: AgentState) -> dict:
    steps   = state.get("steps", 0)
    mandate = state.get("cart_mandate")

    if not mandate:
        logger.warning("[Vault] No cart_mandate found in state — skipping encryption.")
        return {"steps": steps + 1}

    budget = mandate.get("total_budget_amount", 0)

    try:
        encrypted = skale_bite.encrypt(budget)
        logger.info(
            "[Vault] Budget %d USDC units encrypted "
            "(vault_id=%s, protocol=%s).",
            budget,
            encrypted.get("vault_id", "?"),
            encrypted.get("protocol", "?"),
        )
    except Exception as exc:
        logger.warning("[Vault] BITE encryption failed: %s", exc)
        encrypted = {
            "encrypted": False,
            "amount":    budget,
            "error":     str(exc),
        }

    return {
        "encrypted_budget": encrypted,
        "steps":            steps + 1,
    }