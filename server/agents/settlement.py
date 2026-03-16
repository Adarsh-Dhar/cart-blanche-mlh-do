"""
agents/settlement.py — Settlement Agent

KEY FIX: Always emits structured JSON (never prose text).
This ensures the frontend's pickBestChunk returns receipt(4) > cart_mandate(3),
so the ReceiptCard always replaces the MandateCard — even on failure.

Previously, errors were emitted as prose text (priority 0), which was
permanently hidden behind the mandate card (priority 3), leaving the UI
stuck on "Processing via SKALE network..." forever.
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


def _failure_json(error_msg: str, mandate: dict | None = None) -> str:
    """
    Build a structured failure payload that classifyContent recognises as "receipt"
    so the ReceiptCard (priority 4) replaces the MandateCard (priority 3).
    """
    vendors = (mandate or {}).get("merchants", [])
    failures = [
        {
            "commodity":  v.get("name", "Unknown Vendor"),
            "amount_usd": float(v.get("amount", 0)),
            "error":      error_msg,
        }
        for v in vendors
    ] if vendors else [
        {"commodity": "Settlement", "amount_usd": 0.0, "error": error_msg}
    ]
    return json.dumps({
        "status":   "failed",
        "receipts": [],
        "failures": failures,
        "network":  "SKALE Base Sepolia",
        "details":  error_msg,
    })


async def settlement_node(state: AgentState) -> dict:
    steps   = state.get("steps", 0)
    mandate = state.get("cart_mandate")
    chat_id = state.get("chat_id")

    # ── No mandate ─────────────────────────────────────────────────────────────
    if not mandate:
        payload = _failure_json("No active cart mandate. Please start a new shopping request.")
        await _save_agent_response(state, "RECEIPT", payload)
        return {
            "steps": steps + 1,
            "messages": [AIMessage(content=payload, name="PaymentProcessor")],
        }

    # ── No session key ─────────────────────────────────────────────────────────
    has_session = await _has_active_session(chat_id)
    if not has_session:
        error_msg = (
            "Smart Wallet not set up. "
            "Visit /wallet to deposit USDC and authorize the agent, then try again."
        )
        payload = _failure_json(error_msg, mandate)
        await _save_agent_response(state, "RECEIPT", payload)
        logger.info("[Settlement] No active session key for chat %s", chat_id)
        return {
            "steps": steps + 1,
            "messages": [AIMessage(content=payload, name="PaymentProcessor")],
        }

    logger.info("[Settlement] Settling autonomously for chat %s…", chat_id)

    # ── Run settlement ──────────────────────────────────────────────────────────
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
        # Spend limit exceeded — add actionable hint
        if "spend limit" in error_msg.lower():
            error_msg = f"{error_msg} → Visit /wallet and increase your spend limit, then try again."
        payload = _failure_json(error_msg, mandate)
        await _save_agent_response(state, "RECEIPT", payload)
        return {
            "steps": steps + 1,
            "messages": [AIMessage(content=payload, name="PaymentProcessor")],
        }

    # ── Emit structured receipt (settled or partial) ───────────────────────────
    receipts = result.get("receipts", [])
    await _save_agent_response(state, "RECEIPT", json.dumps(result))

    receipt_json = json.dumps({
        "status":   result.get("status", "settled"),
        "receipts": receipts,
        "failures": result.get("failures", []),
        "network":  result.get("network", "SKALE"),
        "details":  result.get("details", ""),
    })

    return {
        "receipts": receipts,
        "steps":    steps + 1,
        "messages": [AIMessage(content=receipt_json, name="PaymentProcessor")],
    }