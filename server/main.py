"""
main.py — Cart-Blanche Gradient Entrypoint
==========================================
Gradient platform lifecycle:
  • Module-level code runs once on pod startup
  • @entrypoint is called on every HTTP request (warm reuse)
  • atexit closes the Prisma DB connection cleanly on pod shutdown

Payload schema:
  { "message": "...", "thread_id": "optional-session-id" }

thread_id → LangGraph MemorySaver key.
  Same thread_id = shared conversation history across turns.
  Omit it (or vary it per call) for stateless one-shot requests.
"""

from __future__ import annotations

import atexit
import asyncio
import logging
import os
import sys
from typing import Any

from dotenv import load_dotenv
from gradient_adk import entrypoint, RequestContext

from .graph import build_graph
from .samples.rest.python.server.db import manager

# Add the 'server' directory explicitly to the Python path
server_dir = os.path.dirname(os.path.abspath(__file__))
if server_dir not in sys.path:
    sys.path.insert(0, server_dir)

# Add the parent directory of the server folder to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Add the samples/rest/python/server directory to the Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../samples/rest/python/server')))

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ── Build LangGraph once at pod startup ──────────────────────────────────────
_graph = build_graph()
logger.info("[Cart-Blanche] LangGraph compiled and ready.")

# ── Clean DB disconnect on pod shutdown ──────────────────────────────────────
# REPLACE the _shutdown function (around line 52) with this:
def _shutdown():
    try:
        # Get the current loop or create one to run the async close task
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # If the loop is already running, create a task
            loop.create_task(manager.close())
        else:
            # If the loop is closed/not running, use run_until_complete
            loop.run_until_complete(manager.close())
        logger.info("[Cart-Blanche] Database connections closed safely.")
    except Exception as e:
        logger.error(f"[Cart-Blanche] Error during shutdown: {e}")

atexit.register(_shutdown)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _extract_reply(final_state: dict) -> str:
    messages = final_state.get("messages", [])
    if not messages:
        return "No response generated."
    last = messages[-1]
    return last.content if hasattr(last, "content") else str(last)

def _extract_cart(final_state: dict) -> list[dict]:
    return final_state.get("receipts") or []


# ── Gradient entrypoint ───────────────────────────────────────────────────────

@entrypoint
async def main(payload: dict, context: RequestContext) -> dict[str, Any]:
    user_message: str = payload.get("message", "").strip()
    if not user_message:
        return {"status": "error", "message": "'message' field is required."}

    thread_id: str = payload.get("thread_id") or context.invocation_id

    logger.info(
        "[Cart-Blanche] inv=%s thread=%s msg='%s'",
        context.invocation_id, thread_id, user_message[:80],
    )

    langgraph_config = {
        "configurable": {
            "thread_id": thread_id,
            "gradient_invocation_id": context.invocation_id,
        }
    }

    try:
        final_state = await _graph.ainvoke(
            {"messages": [("user", user_message)]},
            config=langgraph_config,
        )
        return {
            "status":    "success",
            "thread_id": thread_id,
            "response":  _extract_reply(final_state),
            "cart":      _extract_cart(final_state),
        }

    except Exception as exc:
        logger.exception("[Cart-Blanche] thread=%s error.", thread_id)
        return {"status": "error", "thread_id": thread_id, "message": str(exc)}