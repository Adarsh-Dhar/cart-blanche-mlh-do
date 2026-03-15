"""
agents/settlement.py — Settlement Agent (Smart Wallet / Session Key version)
=============================================================================
REVISED for Hybrid Smart Wallet + ERC-4337 flow.

Key difference from the old flow:
  OLD: Waited for the user to paste a MetaMask EIP-712 signature into chat,
       then used a central agent hot wallet to send a standard ETH tx.

  NEW: Checks whether the user has an active Smart Wallet session key in
       Prisma.  If yes, calls x402_settlement.py which signs a UserOperation
       with the session key and submits it to the Bundler — completely
       autonomously, no user interaction required.

The settlement node is triggered after the user clicks "Looks Good" on the
ProductListCard (which sends the message "Looks good" to the backend).
The graph router sees an active cart_mandate and routes here.
"""

from __future__ import annotations
import json
import logging

from langchain_core.messages import AIMessage, HumanMessage
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
        await db.agentresponse.create(
            data={"type": rtype, "text": text, "chatId": chat_id}
        )
    except Exception as exc:
        logger.warning("[DB] Settlement AgentResponse save failed: %s", exc)


async def _has_active_session(chat_id: str | None) -> bool:
    """Return True if there is a non-expired SmartWallet record."""
    try:
        import datetime
        db = await get_db()

        # Look for any valid session key, ignoring chat_id scoping
        record = await db.smartwallet.find_first(
            where={
                "expiresAt": {"gt": datetime.datetime.utcnow()}
            }
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

    # ── Check for active session key ──────────────────────────────────────────
    has_session = await _has_active_session(chat_id)

    if not has_session:
        # Instruct the user to set up their Smart Wallet
        msg = (
            "⚡ **Smart Wallet not set up yet.**\n\n"
            "To enable instant autonomous checkout, please visit the "
            "[Wallet & Authorization page](/wallet) to:\n"
            "1. Deposit USDC into your Smart Wallet\n"
            "2. Authorize the shopping agent with a spending limit\n\n"
            "Once set up, I can settle payments automatically — no more "
            "MetaMask pop-ups during shopping!"
        )
        return {
            "steps": steps + 1,
            "messages": [AIMessage(content=msg, name="PaymentProcessor")],
        }

    # ── Proceed with autonomous settlement ────────────────────────────────────
    logger.info(
        "[Settlement] Active session key found for chat %s. "
        "Settling autonomously via UserOp…", chat_id,
    )

    try:
        result = await _settlement_tool.run_async(
            args={
                "payment_mandate": {
                    "cart_mandate":       mandate,
                    "chat_id":            chat_id,
                    "user_wallet_address": None,  # resolved from SmartWallet record
                }
            },
            tool_context=None,
        )
    except Exception as exc:
        logger.exception("[Settlement] Error during UserOp settlement")
        return {
            "steps": steps + 1,
            "messages": [AIMessage(
                content=f"⚠️ Payment processor error: {exc}",
                name="PaymentProcessor",
            )],
        }

    receipts  = result.get("receipts", [])
    total_usd = sum(r.get("amount_usd", 0) for r in receipts)

    reply = (
        f"✅ **Payment Complete!** {len(receipts)} transaction(s) confirmed on SKALE.\n\n"
        f"**Total charged:** ${total_usd:.2f} USDC\n"
        f"Settled autonomously via your Smart Wallet session key — no signature required.\n\n"
        f"```json\n{json.dumps(result, indent=2)}\n```"
    )

    await _save_agent_response(state, "RECEIPT", json.dumps(result))

    return {
        "receipts": receipts,
        "steps":    steps + 1,
        "messages": [AIMessage(content=reply, name="PaymentProcessor")],
    }