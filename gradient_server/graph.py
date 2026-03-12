"""
shopping_concierge/graph.py
===========================
Replaces: shopping_concierge/conductor.py  (Google ADK ShoppingConciergeConductor)

Builds the compiled LangGraph StateGraph that wires together:
  • OrchestratorNode  – interprets the user intent, routes work
  • ShoppingNode      – UCP product discovery
  • MerchantNode      – builds and returns the CartMandate
  • VaultNode         – SKALE BITE v2 budget encryption / decryption
  • SettlementNode    – x402 cryptographic on-chain settlement

State schema
------------
All nodes read from and write to a single TypedDict so that LangGraph's
MemorySaver checkpointer can serialise the full conversation automatically.
No manual session.db management is needed — Gradient's stateless HTTP layer
plus LangGraph's checkpointer give you persistence for free.
"""

from __future__ import annotations

import json
import logging
import re
from typing import Annotated, Any, Sequence

from langchain_core.messages import BaseMessage, HumanMessage, AIMessage
from langchain_openai import ChatOpenAI          # swap to ChatAnthropic if preferred
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, StateGraph
from langgraph.graph.message import add_messages
from typing_extensions import TypedDict

# ── Local tools (unchanged from ADK version) ────────────────────────────────
from .x402_settlement_tool import X402SettlementTool
from .skale_bite import skale_bite               # SkaleBite singleton
from .ucp_search_tool import UCPCommerceSearchTool

logger = logging.getLogger(__name__)

# ── Shared LLM (Gradient injects GRADIENT_MODEL_ACCESS_KEY automatically) ───
_llm = ChatOpenAI(
    model="gpt-4o-mini",          # or any model your Gradient plan supports
    temperature=0.2,
)

# ── State schema ─────────────────────────────────────────────────────────────

class AgentState(TypedDict):
    # add_messages merges incoming message lists rather than overwriting them,
    # which is exactly what LangGraph's checkpointer needs for history tracking.
    messages:       Annotated[Sequence[BaseMessage], add_messages]

    # Intermediate artefacts written by individual nodes
    project_plan:   str | None          # OrchestratorNode output
    product_list:   list[dict] | None   # ShoppingNode output
    cart_mandate:   dict | None         # MerchantNode output
    encrypted_budget: dict | None       # VaultNode output
    receipts:       list[dict] | None   # SettlementNode output


# ── Node implementations ──────────────────────────────────────────────────────

def _last_human_text(state: AgentState) -> str:
    """Return the most recent human message text."""
    for msg in reversed(state["messages"]):
        if isinstance(msg, HumanMessage):
            return msg.content
    return ""


async def orchestrator_node(state: AgentState) -> dict:
    """
    Replaces: orchestrator_agent.py (LlmAgent → ProjectOrchestrator)

    Interprets the user's request and produces a plain-English project plan
    (a comma-separated list of items to source via UCP).
    """
    user_text = _last_human_text(state)

    system = (
        "You are the Lead Project Orchestrator for Cart-Blanche. "
        "Given the user's request, output ONLY a comma-separated list of "
        "concrete product items for the Shopping Agent to find via UCP. "
        "No preamble. No explanation. Just the item list."
    )
    response = await _llm.ainvoke(
        [{"role": "system", "content": system},
         {"role": "user",   "content": user_text}]
    )
    plan = response.content.strip()
    logger.info("[OrchestratorNode] plan='%s'", plan[:120])
    return {
        "project_plan": plan,
        "messages": [AIMessage(content=f"🔎 Searching for: {plan}", name="Orchestrator")],
    }


async def shopping_node(state: AgentState) -> dict:
    """
    Replaces: shopping_agent.py (GradientAI Llama2 → LangChain-compatible async call)

    Calls the UCPCommerceSearchTool for each item in the plan and aggregates results.
    """
    plan: str = state.get("project_plan") or _last_human_text(state)
    search_tool = UCPCommerceSearchTool()

    # Each comma-separated item becomes one UCP query
    items   = [i.strip() for i in plan.split(",") if i.strip()]
    results = []
    for item in items:
        try:
            # run_async expects args dict + tool_context (None is fine here)
            found = await search_tool.run_async(args={"query": item}, tool_context=None)
            if isinstance(found, list):
                results.extend(found)
        except Exception as exc:
            logger.warning("[ShoppingNode] UCP query '%s' failed: %s", item, exc)

    summary = f"Found {len(results)} product(s) across {len(items)} search(es)."
    logger.info("[ShoppingNode] %s", summary)
    return {
        "product_list": results,
        "messages": [AIMessage(content=summary, name="ShoppingAgent")],
    }


async def merchant_node(state: AgentState) -> dict:
    """
    Replaces: merchant_agent.py (LlmAgent → MerchantAgent)

    Builds a CartMandate JSON from the discovered product list.
    Only proceeds if the user has explicitly approved (looks for approval language).
    """
    user_text  = _last_human_text(state)
    products   = state.get("product_list") or []
    plan       = state.get("project_plan", "")

    APPROVAL_PHRASES = {"looks good", "i approve", "let's do it", "approve", "that's alright", "confirmed"}
    user_approved = any(p in user_text.lower() for p in APPROVAL_PHRASES)

    if not user_approved:
        # Present the plan to the user for review — do NOT fabricate approval
        product_lines = "\n".join(
            f"  • {p.get('name', '?')} — ${p.get('price', '?')} ({p.get('vendor', '?')})"
            for p in products
        ) or "  (No products found yet — UCP search may still be running.)"

        reply = (
            f"Here is your proposed cart for **{plan}**:\n\n"
            f"{product_lines}\n\n"
            "Reply **'Looks good'** to generate the CartMandate and proceed to payment."
        )
        return {"messages": [AIMessage(content=reply, name="MerchantAgent")]}

    # User approved — build the CartMandate
    total = sum(float(str(p.get("price", 0)).replace("$", "").replace(",", ""))
                for p in products)
    mandate = {
        "total_budget_amount": int(total * 1_000_000),   # USDC 6-decimal
        "currency": "USDC",
        "chain_id": 324705682,                           # SKALE Base Sepolia
        "merchants": [
            {
                "name":             p.get("name", "Unknown"),
                "merchant_address": p.get("merchant_address",
                                         "0xFe5e03799Fe833D93e950d22406F9aD901Ff3Bb9"),
                "amount": int(
                    float(str(p.get("price", 0)).replace("$", "").replace(",", ""))
                    * 1_000_000
                ),
            }
            for p in products
        ],
    }

    mandate_json = json.dumps(mandate, indent=2)
    reply = (
        "✅ CartMandate ready. Please sign the EIP-712 payload via MetaMask "
        "to authorise this batch transaction:\n\n"
        f"```json\n{mandate_json}\n```"
    )
    logger.info("[MerchantNode] CartMandate built for %d vendor(s).", len(products))
    return {
        "cart_mandate": mandate,
        "messages": [AIMessage(content=reply, name="MerchantAgent")],
    }


async def vault_node(state: AgentState) -> dict:
    """
    Replaces: vault_agent.py BITE v2 encrypt/decrypt logic.

    Encrypts the total budget using SKALE BITE v2 threshold encryption.
    This node only runs after a CartMandate exists.
    """
    mandate = state.get("cart_mandate")
    if not mandate:
        return {}

    budget = mandate.get("total_budget_amount", 0)
    try:
        encrypted = skale_bite.encrypt(budget)
        logger.info("[VaultNode] Budget encrypted via SKALE BITE v2.")
    except Exception as exc:
        logger.warning("[VaultNode] Encryption failed: %s", exc)
        encrypted = {"encrypted": False, "error": str(exc)}

    return {"encrypted_budget": encrypted}


async def settlement_node(state: AgentState) -> dict:
    """
    Replaces: x402_settlement.py (ForceToolPaymentProcessor)

    Detects a MetaMask EIP-712 signature in the latest user message,
    then calls X402SettlementTool to execute on-chain batch settlement.
    """
    user_text = _last_human_text(state)
    mandate   = state.get("cart_mandate")

    # Look for a raw 0x… EIP-712 signature in the message
    sig_match = re.search(r"(0x[a-fA-F0-9]{130,})", user_text)
    if not sig_match or not mandate:
        # Nothing to settle yet
        return {}

    signature = sig_match.group(1)
    logger.info("[SettlementNode] Signature detected: %s…", signature[:15])

    payment_mandate = {
        "signature":    signature,
        "cart_mandate": mandate,
        "user_wallet_address": None,   # recovered on-chain from the signature
    }

    tool = X402SettlementTool()
    try:
        result   = await tool.run_async(args={"payment_mandate": payment_mandate}, tool_context=None)
        receipts = result.get("receipts", [])
        receipt_json = json.dumps(result, indent=2)
        reply = (
            "✅ **Payment Complete!** Your transactions have been settled on SKALE.\n\n"
            f"```json\n{receipt_json}\n```"
        )
        logger.info("[SettlementNode] %d transaction(s) settled.", len(receipts))
        return {
            "receipts": receipts,
            "messages": [AIMessage(content=reply, name="PaymentProcessor")],
        }
    except Exception as exc:
        logger.exception("[SettlementNode] Settlement failed.")
        return {
            "messages": [AIMessage(content=f"❌ Settlement error: {exc}", name="PaymentProcessor")]
        }


# ── Router: decide which node runs next ──────────────────────────────────────

def _router(state: AgentState) -> str:
    """
    Simple linear router — the graph advances through stages based on
    what state keys have been populated so far.

    Stage 0 → orchestrator   (no plan yet)
    Stage 1 → shopping       (plan exists, no products)
    Stage 2 → merchant       (products exist, no mandate OR user just approved)
    Stage 3 → vault          (mandate exists, not yet encrypted)
    Stage 4 → settlement     (signature present in latest message)
    Stage 5 → END
    """
    user_text = _last_human_text(state)

    # Settlement: signature in current message + mandate present
    if state.get("cart_mandate") and re.search(r"0x[a-fA-F0-9]{130,}", user_text):
        return "settlement"

    # Vault: mandate built, budget not yet encrypted
    if state.get("cart_mandate") and not state.get("encrypted_budget"):
        return "vault"

    # Merchant: products found (or user approval message)
    if state.get("product_list") is not None:
        return "merchant"

    # Shopping: plan exists, no products yet
    if state.get("project_plan"):
        return "shopping"

    # Default: start with the orchestrator
    return "orchestrator"


# ── Graph factory ─────────────────────────────────────────────────────────────

def build_graph() -> Any:
    """
    Constructs and compiles the Cart-Blanche LangGraph.

    Returns a compiled graph with an in-process MemorySaver checkpointer.
    For production, swap MemorySaver for SqliteSaver or a Postgres checkpointer
    so conversation history survives pod restarts.
    """
    builder = StateGraph(AgentState)

    # Register nodes
    builder.add_node("orchestrator", orchestrator_node)
    builder.add_node("shopping",     shopping_node)
    builder.add_node("merchant",     merchant_node)
    builder.add_node("vault",        vault_node)
    builder.add_node("settlement",   settlement_node)

    # Conditional entrypoint: route to the correct stage on every invocation
    builder.set_conditional_entry_point(
        _router,
        {
            "orchestrator": "orchestrator",
            "shopping":     "shopping",
            "merchant":     "merchant",
            "vault":        "vault",
            "settlement":   "settlement",
        },
    )

    # After each node, re-evaluate routing (allows multi-step runs per call)
    for node in ("orchestrator", "shopping", "merchant", "vault"):
        builder.add_conditional_edges(node, _router, {
            "orchestrator": "orchestrator",
            "shopping":     "shopping",
            "merchant":     "merchant",
            "vault":        "vault",
            "settlement":   "settlement",
            END:            END,
        })

    # Settlement is always terminal for this invocation
    builder.add_edge("settlement", END)

    # MemorySaver gives each thread_id its own isolated checkpoint partition.
    # Replace with SqliteSaver("checkpoints.db") for lightweight persistence.
    checkpointer = MemorySaver()
    return builder.compile(checkpointer=checkpointer)