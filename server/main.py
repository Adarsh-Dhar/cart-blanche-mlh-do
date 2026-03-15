"""
main.py — Cart-Blanche API Server (Smart Wallet + Session Key edition)
"""

from __future__ import annotations

import os
from dotenv import load_dotenv

_here = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(_here, ".env"))
load_dotenv(os.path.join(_here, "..", ".env"))

import asyncio
import json
import logging
import re
from typing import Any

from fastapi import Body, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from langchain_core.messages import AIMessage

from .graph import build_graph
from .db    import get_db
from .routes.wallet_routes import wallet_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(title="Cart-Blanche API", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(wallet_router, prefix="/api")

_graph = build_graph()
logger.info("[Cart-Blanche] LangGraph compiled — 5 agents ready.")

_session_chat: dict[str, str] = {}
_session_has_products: set[str] = set()

_AFFIRMATION_KEYWORDS = {
    "looks good", "confirm", "proceed", "yes", "ok", "approve",
    "go ahead", "do it", "buy it", "let's do it", "sounds good",
    "perfect", "great", "checkout", "purchase", "sure", "yep", "yup",
}


def _is_affirmation(text: str) -> bool:
    lower = text.lower().strip()
    return any(
        re.search(rf'\b{re.escape(k)}\b', lower)
        for k in _AFFIRMATION_KEYWORDS
    )


async def _ensure_chat(session_id: str) -> str:
    if session_id in _session_chat:
        return _session_chat[session_id]
    db = await get_db()
    try:
        existing = await db.chat.find_unique(where={"id": session_id})
        if existing:
            _session_chat[session_id] = existing.id
            return existing.id
    except Exception:
        pass
    chat = await db.chat.create(data={"id": session_id})
    _session_chat[session_id] = chat.id
    return chat.id


async def _save_user_request(chat_id: str, text: str, request_type: str) -> str:
    db = await get_db()
    req = await db.userrequest.create(data={"type": request_type, "text": text, "chatId": chat_id})
    return req.id


import atexit

def _shutdown() -> None:
    try:
        from .db import prisma
        loop = asyncio.get_event_loop()
        if loop.is_running():
            loop.create_task(prisma.disconnect())
        elif not loop.is_closed():
            loop.run_until_complete(prisma.disconnect())
    except Exception as exc:
        logger.warning("[Cart-Blanche] Shutdown warning: %s", exc)

atexit.register(_shutdown)


@app.post("/apps/shopping_concierge/users/{user_id}/sessions/{session_id}")
async def session_init(user_id: str, session_id: str, payload: Any = Body(None)):
    return {"status": "ok", "session_id": session_id}


@app.post("/run_sse")
async def run_sse(payload: Any = Body(None)):
    if payload is None:
        payload = {}

    user_text: str = ""
    new_message = payload.get("new_message") or {}
    parts = new_message.get("parts") or []
    if parts and isinstance(parts, list):
        user_text = parts[0].get("text", "")
    if not user_text:
        user_text = payload.get("message", "")

    session_id: str = payload.get("session_id") or "default-session"
    logger.info("[run_sse] session=%s  text='%s'", session_id, user_text[:100])

    async def event_generator():
        if not user_text.strip():
            yield _sse({"text": "Empty message received."})
            yield "data: [DONE]\n\n"
            return

        is_affirm    = _is_affirmation(user_text)
        request_type = "AFFIRMATION" if is_affirm else "DISCOVERY"

        chat_id         = None
        user_request_id = None
        try:
            chat_id         = await _ensure_chat(session_id)
            user_request_id = await _save_user_request(chat_id, user_text, request_type)
        except Exception as exc:
            logger.warning("[DB] Could not persist UserRequest: %s", exc)

        try:
            config = {"configurable": {"thread_id": session_id}}

            if is_affirm and session_id in _session_has_products:
                logger.info("[run_sse] Affirmation — using checkpoint state for %s", session_id)
                init_state: dict = {
                    "messages":        [("user", user_text)],
                    "chat_id":         chat_id,
                    "user_request_id": user_request_id,
                }
            else:
                if is_affirm:
                    logger.warning("[run_sse] Affirmation but no staged products for %s", session_id)
                init_state = {
                    "messages":         [("user", user_text)],
                    "chat_id":          chat_id,
                    "user_request_id":  user_request_id,
                    "query":            user_text,
                    "project_plan":     None,
                    "budget_usd":       None,
                    "item_preferences": None,
                    "product_list":     None,
                    "cart_mandate":     None,
                    "encrypted_budget": None,
                    "receipts":         None,
                    "_orchestrated":    False,
                    "_shopped":         False,
                    "steps":            0,
                }

            # Track which message IDs we've already sent to avoid duplicates.
            # stream_mode="values" re-emits the full message list after every node,
            # so without deduplication the same message gets sent multiple times.
            sent_message_ids: set[int] = set()

            async for event in _graph.astream(init_state, config=config, stream_mode="values"):
                messages = event.get("messages", [])
                if not messages:
                    continue

                # Emit only NEW messages in this event snapshot
                for msg in messages:
                    if not isinstance(msg, AIMessage):
                        continue

                    # Use object identity as a dedup key
                    msg_key = id(msg)
                    if msg_key in sent_message_ids:
                        continue
                    sent_message_ids.add(msg_key)

                    text_content = getattr(msg, "content", None) or str(msg)
                    if not text_content:
                        continue

                    agent_name = getattr(msg, "name", None) or "Agent"
                    logger.info("[run_sse] Emitting from %s: %s…", agent_name, str(text_content)[:80])
                    yield _sse({"text": text_content, "agent": agent_name})

                # Update product staging state
                if event.get("product_list"):
                    _session_has_products.add(session_id)
                    logger.info("[run_sse] Products staged for %s", session_id)
                if event.get("receipts") is not None:
                    _session_has_products.discard(session_id)
                    logger.info("[run_sse] Settlement done, cleared staging for %s", session_id)

            yield "data: [DONE]\n\n"

        except Exception as exc:
            logger.exception("[run_sse] Stream error")
            yield _sse({"text": f"Server error: {exc}"})
            yield "data: [DONE]\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@app.get("/health")
async def health():
    return {
        "status":  "ok",
        "agents":  ["orchestrator", "shopping", "merchant", "vault", "settlement"],
        "llm":     os.environ.get("GITHUB_MODEL_NAME", "gpt-4o-mini"),
        "db":      "prisma/postgresql",
        "wallet":  "ERC-4337 Smart Wallet + Session Key",
    }


def _sse(parts_dict: dict) -> str:
    event = {"content": {"parts": [parts_dict], "role": "model"}}
    return f"data: {json.dumps(event)}\n\n"