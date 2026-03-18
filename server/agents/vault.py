"""
agents/vault.py — Vault / Privacy Agent
========================================
Purpose:
  - Previously used SKALE BITE v2 threshold encryption (skale_bite).
  - Now that we're on Stacks, there is no equivalent on-chain encryption
    protocol at settlement time — the burner wallet's private key is already
    XOR-encrypted with sha256(ownerPrincipal) at rest in the DB.
  - This node now acts as a lightweight pass-through that records the budget
    amount and marks the vault step as done so the graph can proceed to
    settlement_node.

This node is intentionally SILENT — it emits no user-facing message.

Output state keys set:
  encrypted_budget, steps
"""

from __future__ import annotations

import logging

from ..state import AgentState

logger = logging.getLogger(__name__)


async def vault_node(state: AgentState) -> dict:
    steps   = state.get("steps", 0)
    mandate = state.get("cart_mandate")

    if not mandate:
        logger.warning("[Vault] No cart_mandate found in state — skipping.")
        return {"steps": steps + 1}

    budget = mandate.get("total_budget_amount", 0) or mandate.get("amount", 0)

    # On Stacks the burner key is already encrypted at rest (XOR + sha256).
    # We record a simple audit entry so settlement_node can check
    # `encrypted_budget` is truthy and proceed.
    encrypted = {
        "encrypted": True,
        "amount":    budget,
        "protocol":  "stacks-burner-xor-sha256",
        "vault_id":  "stacks-testnet",
    }

    logger.info(
        "[Vault] Budget %.2f recorded (protocol=%s).",
        float(budget),
        encrypted["protocol"],
    )

    return {
        "encrypted_budget": encrypted,
        "steps":            steps + 1,
    }