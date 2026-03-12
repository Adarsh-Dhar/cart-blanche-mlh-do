"""
graph.py — Cart-Blanche LangGraph
==================================
All nodes now use real Prisma-backed tools.
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
from typing import Annotated, Any, Sequence

from langchain_core.messages import AIMessage, BaseMessage, HumanMessage
from langchain_openai import ChatOpenAI
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, StateGraph
from langgraph.graph.message import add_messages
from typing_extensions import TypedDict

# Local tools — all at the same directory level as graph.py
from tool.ucp_search import UCPCommerceSearchTool
from tool.x402_settlement import X402SettlementTool
from skale_bite import skale_bite          # SkaleBite singleton

logger = logging.getLogger(__name__)

# ── LLM ──────────────────────────────────────────────────────────────────────
# DigitalOcean Gradient exposes an OpenAI-compatible endpoint.
# Set GRADIENT_MODEL_ACCESS_KEY in your .env; Gradient injects it automatically
# on the platform.  For local dev, point base_url at DO's inference gateway.
_llm = ChatOpenAI(
    model=os.environ.get("GRADIENT_MODEL_NAME", "gpt-4o-mini"),
    api_key=os.environ.get("GRADIENT_MODEL_ACCESS_KEY", os.environ.get("OPENAI_API_KEY", "")),
    base_url=os.environ.get(
        "GRADIENT_BASE_URL",
        "https://inference.do-ai.run/v1",   # DigitalOcean GenAI gateway
    ),
    temperature=0.2,
)


# ── State schema ──────────────────────────────────────────────────────────────

class AgentState(TypedDict):
    messages:         Annotated[Sequence[BaseMessage], add_messages]
    project_plan:     str | None
    product_list:     list[dict] | None
    cart_mandate:     dict | None
    encrypted_budget: dict | None
    receipts:         list[dict] | None


# ── Shared tool instances (created once at module load) ───────────────────────
_ucp_tool        = UCPCommerceSearchTool()
_settlement_tool = X402SettlementTool()


# ── Helpers ───────────────────────────────────────────────────────────────────

def _last_human(state: AgentState) -> str:
    for msg in reversed(state["messages"]):
        if isinstance(msg, HumanMessage):
            return msg.content
    return ""

def _user_approved(text: str) -> bool:
    PHRASES = {"looks good", "i approve", "let's do it", "approve",
               "that's alright", "confirmed", "go ahead", "proceed"}
    low = text.lower()
    return any(p in low for p in PHRASES)


# ── Nodes ─────────────────────────────────────────────────────────────────────

async def orchestrator_node(state: AgentState) -> dict:
    """
    Interprets the user's request.
    Outputs a comma-separated list of concrete product items for the
    Shopping node to query via UCP / Prisma.
    """
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
    plan = response.content.strip().strip(".")
    logger.info("[Orchestrator] plan='%s'", plan[:140])

    return {
        "project_plan": plan,
        "messages": [AIMessage(content=f"🔎 Planning search for: **{plan}**", name="Orchestrator")],
    }


async def shopping_node(state: AgentState) -> dict:
    """
    Queries the Prisma DB via UCPCommerceSearchTool for each item in the plan.
    Attaches product_id and vendor_id to each result so settlement can write
    proper OrderItem rows.
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

    # Format a human-readable product table for the user
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
    Waits for explicit user approval, then builds the CartMandate JSON.
    Uses real product_id and vendor pubkey (merchant_address) from Prisma data.
    """
    user_text = _last_human(state)
    products  = state.get("product_list") or []

    if not _user_approved(user_text):
        # Re-show the cart so the user can review again
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

    # Build the mandate using real Prisma data
    total_usdc_units = sum(
        int(Decimal(str(p["price"])) * 1_000_000) for p in products
    )

    mandate = {
        "total_budget_amount": total_usdc_units,
        "currency":            "USDC",
        "chain_id":            324_705_682,   # SKALE Base Sepolia
        "merchant_address":    products[0]["merchant_address"] if products else
                               "0xFe5e03799Fe833D93e950d22406F9aD901Ff3Bb9",
        "amount":              total_usdc_units,
        "merchants": [
            {
                "name":             p["name"],
                # Use the real Vendor.pubkey from Prisma as payment destination
                "merchant_address": p["merchant_address"],
                "amount":           int(Decimal(str(p["price"])) * 1_000_000),
                # Carry IDs forward so settlement can write OrderItems
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
    Detects a MetaMask EIP-712 signature in the user's message, then:
      1. Verifies signature on-chain (SKALE)
      2. Executes multi-vendor batch TX
      3. Writes Order + OrderItems to Prisma
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
                    "signature":          signature,
                    "cart_mandate":       mandate,
                    "user_wallet_address": None,  # recovered from signature on-chain
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
            content=f"❌ Settlement error: {exc}", name="PaymentProcessor"
        )]}


# ── Router ────────────────────────────────────────────────────────────────────

def _router(state: AgentState) -> str:
    user_text = _last_human(state)

    # If user pasted a 0x signature AND mandate exists → settle
    if state.get("cart_mandate") and re.search(r"0x[a-fA-F0-9]{130,}", user_text):
        return "settlement"

    # Mandate built but budget not yet encrypted
    if state.get("cart_mandate") and not state.get("encrypted_budget"):
        return "vault"

    # Products in state → show to user / await approval
    if state.get("product_list") is not None:
        return "merchant"

    # Plan exists → run UCP search
    if state.get("project_plan"):
        return "shopping"

    # Fresh conversation → orchestrate
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

    # Every non-terminal node re-routes after completing
    for node in ("orchestrator", "shopping", "merchant", "vault"):
        builder.add_conditional_edges(node, _router, all_routes)

    builder.add_edge("settlement", END)

    # MemorySaver = in-process per thread_id isolation.
    # Swap for SqliteSaver / AsyncPostgresSaver in production.
    return builder.compile(checkpointer=MemorySaver())