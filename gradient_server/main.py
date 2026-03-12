"""
Cart-Blanche — DigitalOcean Gradient Agent Platform Entrypoint
==============================================================
Replaces: server/server_entry.py  +  server/shopping_concierge/conductor.py
Framework: LangGraph hierarchical multi-agent system

Invoke locally:
    curl -X POST http://localhost:7860 \
         -H "Authorization: Bearer $DIGITALOCEAN_API_TOKEN" \
         -H "Content-Type: application/json" \
         -d '{"message": "Find me noise-canceling headphones under $200", "thread_id": "user-abc-123"}'
"""

import os
import json
import logging
from typing import Any

from dotenv import load_dotenv
from gradient_adk import entrypoint, RequestContext

# ── LangGraph orchestrator ──────────────────────────────────────────────────
# The shopping_concierge package must sit alongside this main.py.
# Its internal graph is built in shopping_concierge/graph.py (see notes below).
from shopping_concierge.graph import build_graph

load_dotenv()

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

# Build the compiled LangGraph once at module load-time so it is reused
# across warm invocations (Gradient keeps the process alive between requests).
_graph = build_graph()


# ── Helper: extract a human-readable reply from LangGraph state ─────────────

def _extract_reply(final_state: dict) -> str:
    """
    Pull the last assistant message out of the LangGraph messages list.
    LangGraph stores messages as LangChain BaseMessage objects or plain dicts
    depending on how your graph is configured.
    """
    messages = final_state.get("messages", [])
    if not messages:
        return "No response generated."

    last = messages[-1]

    # LangChain BaseMessage
    if hasattr(last, "content"):
        return last.content

    # Plain dict (e.g. {"role": "assistant", "content": "..."})
    if isinstance(last, dict):
        return last.get("content", str(last))

    return str(last)


def _extract_cart(final_state: dict) -> list[dict]:
    """
    Pull cart / receipt data out of the graph state if it exists.
    Your graph nodes should write settled receipts to state["receipts"].
    """
    return final_state.get("receipts", [])


# ── Gradient entrypoint ──────────────────────────────────────────────────────

@entrypoint
async def main(payload: dict, context: RequestContext) -> dict[str, Any]:
    """
    Single entrypoint consumed by the Gradient platform.

    Expected payload keys
    ---------------------
    message   : str   – the user's natural-language request (required)
    thread_id : str   – conversation / session identifier (optional,
                        defaults to Gradient's own invocation id so every
                        call gets its own isolated checkpointer partition)

    How thread_id flows into LangGraph
    -----------------------------------
    LangGraph uses a ``config`` dict with a ``"configurable"`` sub-key to
    route messages to the correct in-memory (or persisted) checkpointer
    partition.  Passing the same thread_id on every turn of a conversation
    gives the graph access to its full message history automatically —
    no manual session.db code required.

        config = {"configurable": {"thread_id": thread_id}}
        state  = await graph.ainvoke(input, config=config)

    Gradient's RequestContext
    --------------------------
    context.invocation_id – unique ID for this specific HTTP call (use as
                            fallback thread_id for stateless / one-shot calls)
    context.metadata      – dict of headers / caller info forwarded by Gradient
    """

    # ── 1. Parse payload ────────────────────────────────────────────────────
    user_message: str = payload.get("message", "").strip()
    if not user_message:
        return {
            "status": "error",
            "message": "Payload must include a non-empty 'message' field.",
        }

    # thread_id drives LangGraph's checkpointer — same id = shared history.
    # Fall back to Gradient's per-invocation id for one-shot calls.
    thread_id: str = payload.get("thread_id") or context.invocation_id

    logger.info(
        "[Cart-Blanche] Invocation %s | thread=%s | msg='%s...'",
        context.invocation_id,
        thread_id,
        user_message[:80],
    )

    # ── 2. Build LangGraph config ────────────────────────────────────────────
    #
    # This is the critical bridge between Gradient's stateless HTTP layer and
    # LangGraph's stateful checkpointer.  Every node in your graph that calls
    # `state["messages"]` will automatically see the full conversation history
    # for this thread_id without any additional session management on your part.
    #
    langgraph_config = {
        "configurable": {
            "thread_id": thread_id,
            # Optional: surface Gradient metadata inside graph nodes via
            # config["configurable"]["gradient_metadata"]
            "gradient_metadata": {
                "invocation_id": context.invocation_id,
            },
        }
    }

    # ── 3. Invoke LangGraph ──────────────────────────────────────────────────
    try:
        graph_input = {"messages": [("user", user_message)]}

        final_state: dict = await _graph.ainvoke(graph_input, config=langgraph_config)

        reply   = _extract_reply(final_state)
        cart    = _extract_cart(final_state)

        logger.info("[Cart-Blanche] thread=%s completed successfully.", thread_id)

        return {
            "status":    "success",
            "thread_id": thread_id,          # echo back so the frontend can persist it
            "response":  reply,
            "cart":      cart,               # [] unless a settlement has been executed
        }

    except Exception as exc:
        logger.exception("[Cart-Blanche] thread=%s raised an error.", thread_id)
        return {
            "status":    "error",
            "thread_id": thread_id,
            "message":   str(exc),
        }