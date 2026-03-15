"""
agents/settlement.py — Settlement Agent
Emits structured receipt JSON so the frontend renders the ReceiptCard.
No raw prose JSON — only the clean settled payload.
"""
from __future__ import annotations
import json
import logging

from langchain_core.messages import AIMessage
from ..state import AgentState
from ..tool.x402_settlement import X402SettlementTool
from ..db import get_db

logger = logging.getLogger(__name__)
_settlement_tool = X402SettlementTool()


async def _save_agent_response(state: AgentState, rtype: str, text: str) -> None:
    chat_id = state.get("chat_id")
    if not chat_id:
        return
    try:
        db = await get_db()
        await db.agentresponse.create(data={"type": rtype, "text": text, "chatId": chat_id})
    except Exception as exc:
        logger.warning("[DB] Settlement AgentResponse save failed: %s", exc)


async def _has_active_session(chat_id: str | None) -> bool:
    try:
        import datetime
        db = await get_db()
        record = await db.smartwallet.find_first(
            where={"expiresAt": {"gt": datetime.datetime.utcnow()}}
        )
        return record is not None
    except Exception as exc:
        logger.warning("[Settlement] Could not check session key: %s", exc)
        return False


async def settlement_node(state: AgentState) -> dict:
    steps   = state.get("steps", 0)
    mandate = state.get("cart_mandate")
    chat_id = state.get("chat_id")

    if not mandate:
        return {
            "steps": steps + 1,
            "messages": [AIMessage(
                content="No active cart mandate. Please start a new request.",
                name="PaymentProcessor",
            )],
        }

    has_session = await _has_active_session(chat_id)

    if not has_session:
        msg = (
            "**Smart Wallet not set up yet.**\n\n"
            "Visit the [Wallet page](/wallet) to deposit USDC and authorize the agent. "
            "Once done, payments settle automatically."
        )
        return {
            "steps": steps + 1,
            "messages": [AIMessage(content=msg, name="PaymentProcessor")],
        }

    logger.info("[Settlement] Settling autonomously for chat %s…", chat_id)

    try:
        result = await _settlement_tool.run_async(
            args={
                "payment_mandate": {
                    "cart_mandate":        mandate,
                    "chat_id":             chat_id,
                    "user_wallet_address": None,
                }
            },
            tool_context=None,
        )
    except Exception as exc:
        logger.exception("[Settlement] Error during settlement")
        error_msg = str(exc)
        # Give actionable guidance for spend limit errors
        if "spend limit" in error_msg.lower():
            return {
                "steps": steps + 1,
                "messages": [AIMessage(
                    content=(
                        f"**Payment blocked:** {error_msg}\n\n"
                        "→ Visit the [Wallet page](/wallet) and set a higher spend limit, then try again."
                    ),
                    name="PaymentProcessor",
                )],
            }
        return {
            "steps": steps + 1,
            "messages": [AIMessage(
                content=f"**Payment error:** {error_msg}",
                name="PaymentProcessor",
            )],
        }

    receipts  = result.get("receipts", [])
    total_usd = sum(r.get("amount_usd", 0) for r in receipts)

    await _save_agent_response(state, "RECEIPT", json.dumps(result))

    # Emit ONLY the structured receipt payload.
    # The frontend's classifyContent detects "status":"settled" and renders ReceiptCard.
    # Zero prose — clean card only.
    receipt_json = json.dumps({
        "status":   "settled",
        "receipts": receipts,
        "network":  result.get("network", "SKALE"),
        "details":  result.get("details", ""),
    })

    return {
        "receipts": receipts,
        "steps":    steps + 1,
        "messages": [AIMessage(content=receipt_json, name="PaymentProcessor")],
    }