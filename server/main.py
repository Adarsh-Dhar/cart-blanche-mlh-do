"""
main.py — Cart-Blanche API Server
===================================
Start with:
    uvicorn server.main:app --reload --port 8000

Required env vars (server/.env):
    GITHUB_TOKEN            = "github_pat_..."
    GITHUB_MODEL_NAME       = "gpt-4o-mini"   # optional, this is the default
    SKALE_AGENT_PRIVATE_KEY = "<hex key>"
    DATABASE_URL            = "postgresql://..."
    RPC_URL                 = "https://sepolia.base.org"
"""

from __future__ import annotations

# ── IMPORTANT: load .env BEFORE any local imports ─────────────────────────────
# Every local module (llm.py, db.py, tools) reads os.environ at import time.
# load_dotenv() must run first or they will see empty strings.
import os
from dotenv import load_dotenv

_here = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(_here, ".env"))            # server/.env  (primary)
load_dotenv(os.path.join(_here, "..", ".env"))      # project root (fallback)

# ── Stdlib ─────────────────────────────────────────────────────────────────────
import asyncio
import json
import logging
from typing import Any

# ── Third-party ────────────────────────────────────────────────────────────────
from fastapi import Body, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from langchain_core.messages import AIMessage

# ── Local (safe to import now that env vars are loaded) ────────────────────────
from .graph import build_graph

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)

# ── App ────────────────────────────────────────────────────────────────────────
app = FastAPI(title="Cart-Blanche API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Compile the LangGraph once at startup.
# MemorySaver keeps per-thread conversation history in RAM (no extra DB needed).
_graph = build_graph()
logger.info("[Cart-Blanche] LangGraph compiled — 5 agents ready.")


# ── Graceful DB shutdown ───────────────────────────────────────────────────────
import atexit

def _shutdown() -> None:
    try:
        from .db import prisma
        loop = asyncio.get_event_loop()
        if loop.is_running():
            loop.create_task(prisma.disconnect())
        elif not loop.is_closed():
            loop.run_until_complete(prisma.disconnect())
        logger.info("[Cart-Blanche] Prisma disconnected.")
    except Exception as exc:
        logger.warning("[Cart-Blanche] Shutdown warning: %s", exc)

atexit.register(_shutdown)


# ── Routes ─────────────────────────────────────────────────────────────────────

@app.post("/apps/shopping_concierge/users/{user_id}/sessions/{session_id}")
async def session_init(
    user_id: str,
    session_id: str,
    payload: Any = Body(None),
):
    """
    Session pre-flight called by the frontend before the first message.
    LangGraph MemorySaver handles per-thread history automatically, so this
    is a no-op — it just needs to return 200.
    """
    return {"status": "ok", "session_id": session_id}


@app.post("/run_sse")
async def run_sse(payload: Any = Body(None)):
    """
    Main streaming endpoint.

    Accepts ADK-style payload:
        {
          "session_id":  "abc-123",
          "new_message": { "role": "user", "parts": [{ "text": "..." }] }
        }

    Streams Server-Sent Events shaped as:
        data: {"content": {"parts": [{"text": "..."}], "role": "model"}}
        ...
        data: [DONE]
    """
    if payload is None:
        payload = {}

    # Extract user text — support both ADK parts format and plain "message" key
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
    """Simple liveness check."""
    return {
        "status": "ok",
        "agents": ["orchestrator", "shopping", "merchant", "vault", "settlement"],
        "llm":    os.environ.get("GITHUB_MODEL_NAME", "gpt-4o-mini"),
        "db":     "prisma/postgresql",
    }


# ── Helpers ────────────────────────────────────────────────────────────────────

def _sse(parts_dict: dict) -> str:
    """Wrap a dict as a valid Server-Sent Event data line."""
    event = {"content": {"parts": [parts_dict], "role": "model"}}
    return f"data: {json.dumps(event)}\n\n"