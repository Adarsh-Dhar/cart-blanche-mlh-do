"""
graph.py — Cart-Blanche LangGraph (GitHub Models Edition)
==========================================================
LLM provider: GitHub Models → GPT-4o-mini
Endpoint:     https://models.inference.ai.azure.com
Auth:         GITHUB_TOKEN environment variable (Personal Access Token)

Node data flow:

  User message
      │
      ▼
  orchestrator_node   → project_plan (comma-separated item list)
      │
      ▼
  shopping_node       → product_list  (from Prisma via UCPCommerceSearchTool)
      │
      ▼
  merchant_node       → cart_mandate  (awaits user approval, then builds JSON)
      │
      ▼
  vault_node          → encrypted_budget (SKALE BITE v2)
      │
      ▼
  settlement_node     → receipts + Order in Prisma  (x402 + EIP-712 sig)
      │
      ▼
     END
"""

from __future__ import annotations

import json
import logging
import os
import re
from decimal import Decimal
from typing import Annotated, Any, Sequence, TypedDict, List

from langchain_core.messages import AIMessage, BaseMessage, HumanMessage
from langchain_openai import ChatOpenAI
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, StateGraph
from langgraph.graph.message import add_messages
from typing_extensions import TypedDict

# Local tools
from .tool.ucp_search import UCPCommerceSearchTool
from .tool.x402_settlement import X402SettlementTool
from .tool.skale_bite import skale_bite

logger = logging.getLogger(__name__)

# ── LLM: GitHub Models (OpenAI-compatible) ───────────────────────────────────
# Get your free GitHub PAT at: https://github.com/settings/tokens
# Add to server/.env:  GITHUB_TOKEN="github_pat_..."
_llm = ChatOpenAI(
    model=os.environ.get("GITHUB_MODEL_NAME", "gpt-4o-mini"),
    api_key=os.environ.get("GITHUB_TOKEN", ""),
    base_url="https://models.inference.ai.azure.com",
    temperature=0.2,
)


# ── State schema ──────────────────────────────────────────────────────────────

class AgentState(TypedDict):
    messages: Annotated[List[BaseMessage], "The conversation history"]
    cart: List[dict]
    steps: int  # Added step counter to prevent infinite loops


# ── Shared tool instances ─────────────────────────────────────────────────────
_ucp_tool        = UCPCommerceSearchTool()
_settlement_tool = X402SettlementTool()


# ── Helpers ───────────────────────────────────────────────────────────────────

def _last_human(state: AgentState) -> str:
    for msg in reversed(state["messages"]):
        if isinstance(msg, HumanMessage):
            return msg.content
    return ""


def _user_approved(text: str) -> bool:
    PHRASES = {
        "looks good", "i approve", "let's do it", "approve",
        "that's alright", "confirmed", "go ahead", "proceed",
    }
    low = text.lower()
    return any(p in low for p in PHRASES)


# ── Nodes ─────────────────────────────────────────────────────────────────────

async def orchestrator_node(state: AgentState) -> dict:
    """
    Interprets the user's request via GPT-4o-mini on GitHub Models.
    Outputs a comma-separated list of concrete product items for the
    Shopping node to query.
    """
    current_steps = state.get("steps", 0)
    
    # Safety Check: Stop after 5 loops to prevent token drain
    if current_steps >= 5:
        return {
            "messages": [AIMessage(content="I'm having trouble processing that request. Please try again with more detail.")],
            "steps": current_steps + 1
        }

    user_text = _last_human(state)

    system = (
        "You are the Lead Project Orchestrator for Cart-Blanche, an AI shopping concierge. "
        "Given the user's request, output ONLY a comma-separated list of concrete product "
        "names to search for (e.g. 'noise cancelling headphones, USB-C hub, backpack'). "
        "No preamble, no numbers, no explanation — just the comma-separated list."
    )
    response = await _llm.ainvoke([
        {"role": "system", "content": system},
        {"role": "user",   "content": user_text},
    ])
    
    # Logic Guard: If the model returns nothing, don't let it loop
    if not response.content and not response.tool_calls:
        return {
            "messages": [AIMessage(content="I didn't understand that. Could you rephrase your request?")],
            "steps": current_steps + 1
        }

    plan = response.content.strip().strip(".")
    logger.info("[Orchestrator] plan='%s'", plan[:140])

    return {
        "project_plan": plan,
        "messages": [AIMessage(
            content=f"🔎 Planning search for: **{plan}**",
            name="Orchestrator",
        )],
        "steps": current_steps + 1
    }


async def shopping_node(state: AgentState) -> dict:
    """
    Queries the Prisma DB via UCPCommerceSearchTool for each item in the plan.
    """
    plan: str = state.get("project_plan") or _last_human(state)
    items = [i.strip() for i in plan.split(",") if i.strip()]

    all_products: list[dict] = []
    seen_ids: set[str] = set()

    for item in items:
        try:
            results = await _ucp_tool.run_async(args={"query": item}, tool_context=None)
            for p in results:
                if p["id"] not in seen_ids:
                    seen_ids.add(p["id"])
                    all_products.append(p)
        except Exception as exc:
            logger.warning("[Shopping] UCP query '%s' failed: %s", item, exc)

    if all_products:
        lines = [f"| {'Product':<40} | {'Vendor':<25} | {'Price':>8} |"]
        lines.append(f"|{'-'*42}|{'-'*27}|{'-'*10}|")
        for p in all_products:
            lines.append(
                f"| {p['name'][:40]:<40} | {p['vendor'][:25]:<25} | "
                f"${p['price']:>7.2f} |"
            )
        table = "\n".join(lines)
        reply = (
            f"Found **{len(all_products)}** product(s) across "
            f"**{len(items)}** search term(s):\n\n```\n{table}\n```\n\n"
            "Reply **'Looks good'** to build the CartMandate and proceed to payment."
        )
    else:
        reply = (
            "⚠️ No in-stock products found for your request. "
            "Try rephrasing or broadening your search."
        )

    logger.info("[Shopping] %d unique product(s) found.", len(all_products))
    return {
        "product_list": all_products,
        "messages": [AIMessage(content=reply, name="ShoppingAgent")],
    }


async def merchant_node(state: AgentState) -> dict:
    """
    Awaits explicit user approval, then builds the CartMandate JSON.
    """
    user_text = _last_human(state)
    products  = state.get("product_list") or []

    if not _user_approved(user_text):
        product_lines = "\n".join(
            f"  • **{p['name']}** — ${p['price']:.2f} ({p['vendor']})"
            for p in products
        ) or "  *(no products loaded yet)*"

        return {"messages": [AIMessage(
            content=(
                f"Here is your cart:\n\n{product_lines}\n\n"
                "Reply **'Looks good'** to confirm and generate the CartMandate."
            ),
            name="MerchantAgent",
        )]}

    total_usdc_units = sum(
        int(Decimal(str(p["price"])) * 1_000_000) for p in products
    )

    mandate = {
        "total_budget_amount": total_usdc_units,
        "currency":            "USDC",
        "chain_id":            324_705_682,
        "merchant_address":    products[0]["merchant_address"] if products else
                               "0xFe5e03799Fe833D93e950d22406F9aD901Ff3Bb9",
        "amount":              total_usdc_units,
        "merchants": [
            {
                "name":             p["name"],
                "merchant_address": p["merchant_address"],
                "amount":           int(Decimal(str(p["price"])) * 1_000_000),
                "product_id":       p.get("product_id"),
                "vendor_id":        p.get("vendor_id"),
            }
            for p in products
        ],
    }

    mandate_json = json.dumps(mandate, indent=2)
    reply = (
        "✅ **CartMandate ready.** Sign the EIP-712 payload via MetaMask to authorise "
        "this batch transaction:\n\n"
        f"```json\n{mandate_json}\n```\n\n"
        "Paste your MetaMask signature (0x…) here to proceed."
    )
    logger.info("[Merchant] CartMandate: %d vendor(s), total %d USDC units.",
                len(products), total_usdc_units)
    return {
        "cart_mandate": mandate,
        "messages": [AIMessage(content=reply, name="MerchantAgent")],
    }


async def vault_node(state: AgentState) -> dict:
    """Encrypts the total budget via SKALE BITE v2 threshold encryption."""
    mandate = state.get("cart_mandate")
    if not mandate:
        return {}

    budget = mandate.get("total_budget_amount", 0)
    try:
        encrypted = skale_bite.encrypt(budget)
        logger.info("[Vault] Budget %d encrypted via SKALE BITE v2.", budget)
    except Exception as exc:
        logger.warning("[Vault] BITE encryption failed: %s", exc)
        encrypted = {"encrypted": False, "error": str(exc)}

    return {"encrypted_budget": encrypted}


async def settlement_node(state: AgentState) -> dict:
    """
    Detects a MetaMask EIP-712 signature, verifies it, executes on-chain
    settlement, and records the order in Prisma.
    """
    user_text = _last_human(state)
    mandate   = state.get("cart_mandate")

    sig_match = re.search(r"(0x[a-fA-F0-9]{130,})", user_text)
    if not sig_match or not mandate:
        return {}

    signature = sig_match.group(1)
    logger.info("[Settlement] Signature detected: %s…", signature[:18])

    try:
        result = await _settlement_tool.run_async(
            args={
                "payment_mandate": {
                    "signature":           signature,
                    "cart_mandate":        mandate,
                    "user_wallet_address": None,
                }
            },
            tool_context=None,
        )

        receipts     = result.get("receipts", [])
        receipt_json = json.dumps(result, indent=2)
        reply = (
            "✅ **Payment Complete!** Your transactions have been confirmed on SKALE "
            "and the order has been recorded.\n\n"
            f"```json\n{receipt_json}\n```"
        )
        logger.info("[Settlement] %d TX confirmed.", len(receipts))
        return {
            "receipts": receipts,
            "messages": [AIMessage(content=reply, name="PaymentProcessor")],
        }

    except Exception as exc:
        logger.exception("[Settlement] Failed.")
        return {"messages": [AIMessage(
            content=f"❌ Settlement error: {exc}", name="PaymentProcessor",
        )]}


# ── Router ────────────────────────────────────────────────────────────────────

def _router(state: AgentState) -> str:
    user_text = _last_human(state)

    if state.get("cart_mandate") and re.search(r"0x[a-fA-F0-9]{130,}", user_text):
        return "settlement"

    if state.get("cart_mandate") and not state.get("encrypted_budget"):
        return "vault"

    if state.get("product_list") is not None:
        return "merchant"

    if state.get("project_plan"):
        return "shopping"

    return "orchestrator"


# ── Graph factory ─────────────────────────────────────────────────────────────

def build_graph() -> Any:
    builder = StateGraph(AgentState)

    builder.add_node("orchestrator", orchestrator_node)
    builder.add_node("shopping",     shopping_node)
    builder.add_node("merchant",     merchant_node)
    builder.add_node("vault",        vault_node)
    builder.add_node("settlement",   settlement_node)

    all_routes = {
        "orchestrator": "orchestrator",
        "shopping":     "shopping",
        "merchant":     "merchant",
        "vault":        "vault",
        "settlement":   "settlement",
        END:            END,
    }

    builder.set_conditional_entry_point(_router, all_routes)

    for node in ("orchestrator", "shopping", "merchant", "vault"):
        builder.add_conditional_edges(node, _router, all_routes)

    builder.add_edge("settlement", END)

    return builder.compile(checkpointer=MemorySaver())


# ── Orchestrator logic ───────────────────────────────────────────────────────

def orchestrator(state: AgentState):
    # Determine if user is searching or paying
    response = llm.invoke(state["messages"])
    return {"messages": [response]}