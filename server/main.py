"""
main.py — Cart-Blanche Server (GitHub Models Edition)
======================================================
Runs as a plain FastAPI + Uvicorn server.
No DigitalOcean Gradient SDK required.

Start with:
    cd cart-blanche-nova-ai
    uvicorn server.main:app --reload --port 8000

Environment variables (server/.env):
    GITHUB_TOKEN="github_pat_..."          # GitHub PAT for GitHub Models API
    GITHUB_MODEL_NAME="gpt-4o-mini"        # optional, this is the default
    SKALE_AGENT_PRIVATE_KEY="..."          # hex private key, no 0x prefix
    DATABASE_URL="postgresql://..."        # Prisma DB connection string
"""

from __future__ import annotations

# ── Load .env FIRST — before any local imports that read os.environ ──────────
import os
from dotenv import load_dotenv

# Walk up from server/ to find .env in the project root or server/
_here = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(_here, ".env"))          # server/.env
load_dotenv(os.path.join(_here, "..", ".env"))    # project root .env (fallback)

# ── Standard library ─────────────────────────────────────────────────────────
import asyncio
import atexit
import json
import logging
import sys
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

# ── FastAPI app ───────────────────────────────────────────────────────────────
app = FastAPI(title="Cart-Blanche API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Build LangGraph once at startup ──────────────────────────────────────────
_graph = build_graph()
logger.info("[Cart-Blanche] LangGraph compiled and ready.")


# ── Shutdown hook ─────────────────────────────────────────────────────────────
def _shutdown() -> None:
    """Best-effort DB disconnect on process exit."""
    try:
        from .db import prisma
        loop = asyncio.get_event_loop()
        if loop.is_running():
            loop.create_task(prisma.disconnect())
        elif not loop.is_closed():
            loop.run_until_complete(prisma.disconnect())
        logger.info("[Cart-Blanche] DB disconnected.")
    except Exception as exc:
        logger.warning("[Cart-Blanche] Shutdown warning: %s", exc)

atexit.register(_shutdown)


# ── Session initialisation (no-op stub kept for frontend compat) ─────────────
@app.post("/apps/shopping_concierge/users/{user_id}/sessions/{session_id}")
async def session_init(user_id: str, session_id: str, payload: Any = Body(None)):
    """
    The frontend calls this before every conversation turn.
    LangGraph's MemorySaver already handles per-thread state, so this
    endpoint just returns 200 OK to keep the frontend happy.
    """
    return {"status": "ok", "session_id": session_id}


# ── Main SSE streaming endpoint ───────────────────────────────────────────────
@app.post("/run_sse")
async def run_sse(payload: Any = Body(None)):
    """
    Accepts the ADK-style payload the frontend sends:
        {
          "app_name": "shopping_concierge",
          "user_id":  "guest_user",
          "session_id": "test-session-001",
          "new_message": { "role": "user", "parts": [{ "text": "..." }] }
        }

    Streams responses back as Server-Sent Events in the shape the frontend
    parser expects:
        data: {"content": {"parts": [{"text": "..."}], "role": "model"}}
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
            yield "data: " + json.dumps({
                "content": {
                    "parts": [{"text": "⚠️ Empty message received."}],
                    "role": "model",
                }
            }) + "\n\n"
            yield "data: [DONE]\n\n"
            return

        try:
            langgraph_config = {"configurable": {"thread_id": session_id}}

            async for event in _graph.astream(
                {"messages": [("user", user_text)]},
                config=langgraph_config,
                stream_mode="values",
            ):
                messages = event.get("messages", [])
                if not messages:
                    continue

                last = messages[-1]
                # Only forward AI / assistant messages to the UI
                if not isinstance(last, AIMessage):
                    continue

                text = last.content if hasattr(last, "content") else str(last)
                if not text:
                    continue

                sse_event = {
                    "content": {
                        "parts": [{"text": text}],
                        "role":  "model",
                    }
                }
                yield f"data: {json.dumps(sse_event)}\n\n"

            yield "data: [DONE]\n\n"

        except Exception as exc:
            logger.exception("[run_sse] Unhandled error in stream")
            error_event = {
                "content": {
                    "parts": [{"text": f"⚠️ Server error: {exc}"}],
                    "role":  "model",
                }
            }
            yield f"data: {json.dumps(error_event)}\n\n"
            yield "data: [DONE]\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {"status": "ok", "llm": "github-models/gpt-4o-mini"}


@app.post("/chat")
async def chat(payload: dict):
    user_msg = payload.get("message")
    thread_id = payload.get("thread_id", "default")
    
    # Run the graph
    inputs = {"messages": [user_msg]}
    config = {"configurable": {"thread_id": thread_id}}
    result = await graph.ainvoke(inputs, config=config)
    
    return {
        "response": result["messages"][-1].content,
        "status": "success"
    }