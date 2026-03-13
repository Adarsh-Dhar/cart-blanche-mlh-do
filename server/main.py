"""
main.py — Cart-Blanche API Server (GitHub Models Edition)
==========================================================
Start:
    uvicorn server.main:app --reload --port 8000

Required env vars (server/.env):
    GITHUB_TOKEN             = "github_pat_..."
    GITHUB_MODEL_NAME        = "gpt-4o-mini"          # optional
    SKALE_AGENT_PRIVATE_KEY  = "<hex key, no 0x>"
    DATABASE_URL             = "postgresql://..."
"""

from __future__ import annotations

# ── Load .env BEFORE any local imports read os.environ ───────────────────────
import os
from dotenv import load_dotenv

_here = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(_here, ".env"))           # server/.env
load_dotenv(os.path.join(_here, "..", ".env"))     # project root .env (fallback)

# ── Stdlib ────────────────────────────────────────────────────────────────────
import asyncio
import atexit
import json
import logging
from typing import Any

# ── Third-party ───────────────────────────────────────────────────────────────
from fastapi import FastAPI, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from langchain_core.messages import AIMessage

# ── Local ─────────────────────────────────────────────────────────────────────
from .graph import build_graph

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(title="Cart-Blanche API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Build graph once at startup (MemorySaver keeps per-thread history in RAM)
_graph = build_graph()
logger.info("[Cart-Blanche] LangGraph compiled — 5 agents ready.")


# ── Graceful shutdown ─────────────────────────────────────────────────────────
def _shutdown() -> None:
    try:
        from .db import prisma
        loop = asyncio.get_event_loop()
        if loop.is_running():
            loop.create_task(prisma.disconnect())
        elif not loop.is_closed():
            loop.run_until_complete(prisma.disconnect())
        logger.info("[Cart-Blanche] DB disconnected.")
    except Exception as exc:
        logger.warning("[Cart-Blanche] Shutdown: %s", exc)

atexit.register(_shutdown)


# ── Session init stub (frontend calls this before every turn) ─────────────────
@app.post("/apps/shopping_concierge/users/{user_id}/sessions/{session_id}")
async def session_init(user_id: str, session_id: str, payload: Any = Body(None)):
    """
    No-op: LangGraph MemorySaver handles per-thread history automatically.
    Returns 200 so the frontend's pre-flight request succeeds.
    """
    return {"status": "ok", "session_id": session_id}


# ── Main SSE streaming endpoint ───────────────────────────────────────────────
@app.post("/run_sse")
async def run_sse(payload: Any = Body(None)):
    """
    Accepts ADK-style payload:
        {
          "session_id":  "test-session-001",
          "new_message": { "role": "user", "parts": [{ "text": "..." }] }
        }

    Streams SSE events shaped as:
        data: {"content": {"parts": [{"text": "..."}], "role": "model"}}
        data: [DONE]
    """
    if payload is None:
        payload = {}

    # Extract user text from ADK message format
    user_text: str = ""
    new_message = payload.get("new_message") or {}
    parts = new_message.get("parts") or []
    if parts and isinstance(parts, list):
        user_text = parts[0].get("text", "")
    if not user_text:
        user_text = payload.get("message", "")

    session_id: str = payload.get("session_id") or "default-session"
    logger.info("[run_sse] session=%s text='%s'", session_id, user_text[:80])

    async def event_generator():
        if not user_text.strip():
            yield _sse({"text": "⚠️ Empty message received."})
            yield "data: [DONE]\n\n"
            return

        try:
            config = {"configurable": {"thread_id": session_id}}

            async for event in _graph.astream(
                {"messages": [("user", user_text)]},
                config=config,
                stream_mode="values",
            ):
                messages = event.get("messages", [])
                if not messages:
                    continue

                last = messages[-1]
                if not isinstance(last, AIMessage):
                    continue

                text = last.content if hasattr(last, "content") else str(last)
                if not text:
                    continue

                yield _sse({"text": text})

            yield "data: [DONE]\n\n"

        except Exception as exc:
            logger.exception("[run_sse] Stream error")
            yield _sse({"text": f"⚠️ Server error: {exc}"})
            yield "data: [DONE]\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


def _sse(parts_dict: dict) -> str:
    """Format a dict as a valid SSE data line."""
    event = {"content": {"parts": [parts_dict], "role": "model"}}
    return f"data: {json.dumps(event)}\n\n"


# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {
        "status": "ok",
        "agents": ["orchestrator", "shopping", "merchant", "vault", "settlement"],
        "llm":    "github-models/gpt-4o-mini",
    }