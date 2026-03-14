"""agents/settlement.py — Settlement Agent — saves receipt as AgentResponse"""
from __future__ import annotations
import json, logging, re
from langchain_core.messages import AIMessage, HumanMessage
from ..state import AgentState
from ..tool.x402_settlement import X402SettlementTool
from ..db import get_db

logger = logging.getLogger(__name__)
_settlement_tool = X402SettlementTool()
_SIG_RE = re.compile(r"(0x[a-fA-F0-9]{130,})")


async def _save_agent_response(state: AgentState, rtype: str, text: str) -> None:
    chat_id = state.get("chat_id")
    if not chat_id: return
    try:
        db = await get_db()
        await db.agentresponse.create(data={"type": rtype, "text": text, "chatId": chat_id})
    except Exception as exc:
        logger.warning("[DB] Settlement AgentResponse save failed: %s", exc)


def _last_human(state: AgentState) -> str:
    for msg in reversed(state["messages"]):
        if isinstance(msg, HumanMessage): return msg.content
    return ""


async def settlement_node(state: AgentState) -> dict:
    steps     = state.get("steps", 0)
    mandate   = state.get("cart_mandate")
    user_text = _last_human(state)

    if not mandate:
        return {"steps":steps+1,"messages":[AIMessage(
            content="No active cart mandate. Please start a new request.",name="PaymentProcessor")]}

    sig_match = _SIG_RE.search(user_text)
    if not sig_match:
        return {"steps":steps+1,"messages":[AIMessage(
            content="Waiting for your MetaMask signature.",name="PaymentProcessor")]}

    signature = sig_match.group(1)
    logger.info("[Settlement] Signature: %s...", signature[:20])

    try:
        result = await _settlement_tool.run_async(
            args={"payment_mandate":{"signature":signature,"cart_mandate":mandate,"user_wallet_address":None}},
            tool_context=None,
        )
    except Exception as exc:
        logger.exception("[Settlement] Error")
        return {"steps":steps+1,"messages":[AIMessage(
            content=f"Payment processor error: {exc}",name="PaymentProcessor")]}

    receipts  = result.get("receipts",[])
    total_usd = sum(r.get("amount_usd",0) for r in receipts)

    reply = (
        f"Payment Complete! {len(receipts)} transaction(s) confirmed on SKALE.\n\n"
        f"Total charged: ${total_usd:.2f} USD\n\n"
        f"```json\n{json.dumps(result,indent=2)}\n```"
    )

    await _save_agent_response(state, "RECEIPT", json.dumps(result))

    return {"receipts":receipts,"steps":steps+1,
            "messages":[AIMessage(content=reply,name="PaymentProcessor")]}