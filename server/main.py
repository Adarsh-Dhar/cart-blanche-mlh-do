"""
main.py — Cart-Blanche API Server
===================================
Saves every user turn as a UserRequest and every agent reply as an
AgentResponse in Prisma, keyed by session_id → Chat.
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
from typing import Any

from fastapi import Body, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from langchain_core.messages import AIMessage

from .graph import build_graph
from .db    import get_db

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(title="Cart-Blanche API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_graph = build_graph()
logger.info("[Cart-Blanche] LangGraph compiled — 5 agents ready.")

# ── session_id → Prisma Chat.id  (in-memory; survives server lifetime) ────────
_session_chat: dict[str, str] = {}


async def _ensure_chat(session_id: str) -> str:
    """Return (or lazily create) the Prisma Chat record for this session."""
    if session_id in _session_chat:
        return _session_chat[session_id]

    db = await get_db()
    chat = await db.chat.create(data={})
    _session_chat[session_id] = chat.id
    logger.info("[DB] Chat %s created for session %s", chat.id, session_id)
    return chat.id


async def _save_user_request(chat_id: str, text: str, request_type: str) -> str:
    """Persist a UserRequest and return its id."""
    db = await get_db()
    req = await db.userrequest.create(data={
        "type":   request_type,
        "text":   text,
        "chatId": chat_id,
    })
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
            yield _sse({"text": "⚠️ Empty message received. Please type something!"})
            yield "data: [DONE]\n\n"
            return

        # ── Classify request type & persist UserRequest ────────────────────
        lower = user_text.lower().strip()
        if any(k in lower for k in ("looks good", "confirm", "proceed", "yes", "ok")):
            request_type = "AFFIRMATION"
        elif any(lower.startswith(sig) for sig in ("0x", "here is my signature")):
            request_type = "SIGNATURE"
        else:
            request_type = "DISCOVERY"

        try:
            chat_id         = await _ensure_chat(session_id)
            user_request_id = await _save_user_request(chat_id, user_text, request_type)
        except Exception as exc:
            logger.warning("[DB] Could not persist UserRequest: %s", exc)
            chat_id         = None
            user_request_id = None

        try:
            config = {"configurable": {"thread_id": session_id}}

            # Inject DB ids into graph state so agent nodes can persist responses
            init_state: dict = {
                "messages":       [("user", user_text)],
                "chat_id":        chat_id,
                "user_request_id": user_request_id,
            }

            async for event in _graph.astream(init_state, config=config, stream_mode="values"):
                messages = event.get("messages", [])
                if not messages:
                    continue

                last = messages[-1]
                if not isinstance(last, AIMessage):
                    continue

                text = getattr(last, "content", None) or str(last)
                if not text:
                    continue

                yield _sse({"text": text})

            yield "data: [DONE]\n\n"

        except Exception as exc:
            logger.exception("[run_sse] Stream error")
            yield _sse({"text": f"⚠️ Server error: {exc}"})
            yield "data: [DONE]\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "agents": ["orchestrator", "shopping", "merchant", "vault", "settlement"],
        "llm":    os.environ.get("GITHUB_MODEL_NAME", "gpt-4o-mini"),
        "db":     "prisma/postgresql",
    }


def _sse(parts_dict: dict) -> str:
    event = {"content": {"parts": [parts_dict], "role": "model"}}
    return f"data: {json.dumps(event)}\n\n"