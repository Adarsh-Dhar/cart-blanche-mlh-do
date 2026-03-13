"""
agents/settlement.py — Settlement Agent
========================================
Purpose:
  - Detects a MetaMask EIP-712 signature (0x… 132 hex chars) in the user's
    latest message.
  - Calls X402SettlementTool which:
      1. Verifies the signature against the CartMandate on SKALE.
      2. Executes a per-vendor batch payment transaction on SKALE.
      3. Writes an Order + OrderItems row to Prisma for audit.
  - Emits the TX receipts as a JSON code block so the frontend's
    TransactionReceipt component can render them as a rich card.

Output state keys set:
  receipts, steps
"""

from __future__ import annotations

import json
import logging
import re

from langchain_core.messages import AIMessage, HumanMessage

from ..state import AgentState
from ..tool.x402_settlement import X402SettlementTool

logger = logging.getLogger(__name__)

_settlement_tool = X402SettlementTool()

# EIP-712 signature: 0x followed by exactly 130 hex chars (65 bytes)
_SIG_RE = re.compile(r"(0x[a-fA-F0-9]{130,})")


def _last_human(state: AgentState) -> str:
    for msg in reversed(state["messages"]):
        if isinstance(msg, HumanMessage):
            return msg.content
    return ""


async def settlement_node(state: AgentState) -> dict:
    steps     = state.get("steps", 0)
    mandate   = state.get("cart_mandate")
    user_text = _last_human(state)

    # ── Pre-flight: need an active mandate ───────────────────────────────────
    if not mandate:
        logger.warning("[Settlement] No cart_mandate in state.")
        return {
            "steps": steps + 1,
            "messages": [AIMessage(
                content=(
                    "⚠️ No active cart mandate found. "
                    "Please start a new shopping request."
                ),
                name="PaymentProcessor",
            )],
        }

    # ── Pre-flight: need the signature ───────────────────────────────────────
    sig_match = _SIG_RE.search(user_text)
    if not sig_match:
        return {
            "steps": steps + 1,
            "messages": [AIMessage(
                content=(
                    "⏳ Waiting for your MetaMask signature.\n\n"
                    "If the MetaMask popup didn't appear, please paste your "
                    "EIP-712 signature (starts with **0x**) here."
                ),
                name="PaymentProcessor",
            )],
        }

    signature = sig_match.group(1)
    logger.info("[Settlement] Signature received: %s…", signature[:20])

    # ── Execute settlement ────────────────────────────────────────────────────
    try:
        result = await _settlement_tool.run_async(
            args={
                "payment_mandate": {
                    "signature":           signature,
                    "cart_mandate":        mandate,
                    "user_wallet_address": None,  # recovered on-chain from sig
                }
            },
            tool_context=None,
        )
    except Exception as exc:
        logger.exception("[Settlement] X402SettlementTool raised an error.")
        return {
            "steps": steps + 1,
            "messages": [AIMessage(
                content=(
                    f"❌ **Payment processor error:** {exc}\n\n"
                    "Your funds have NOT been charged. "
                    "Please try again or contact support."
                ),
                name="PaymentProcessor",
            )],
        }

    receipts     = result.get("receipts", [])
    vendor_count = len(receipts)
    total_usd    = sum(r.get("amount_usd", 0) for r in receipts)

    logger.info(
        "[Settlement] ✅ %d TX confirmed, total $%.2f USD.",
        vendor_count, total_usd,
    )

    reply = (
        f"✅ **Payment Complete!** {vendor_count} transaction(s) "
        f"confirmed on SKALE.\n\n"
        f"**Total charged: ${total_usd:.2f} USD**\n\n"
        f"```json\n{json.dumps(result, indent=2)}\n```"
    )

    return {
        "receipts": receipts,
        "steps":    steps + 1,
        "messages": [AIMessage(content=reply, name="PaymentProcessor")],
    }