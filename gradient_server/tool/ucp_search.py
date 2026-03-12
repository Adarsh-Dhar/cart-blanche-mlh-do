"""
ucp_search_tool.py — Universal Commerce Protocol search via Prisma DB
=====================================================================
Replaces the old stub that hit http://localhost:8182/ucp/v1/search.

The UCP "network" for Cart-Blanche IS the Prisma PostgreSQL database.
Each Product row is a UCP listing; the Vendor.pubkey is the merchant_address
used by the x402 settlement tool for on-chain payment routing.

Search strategy (all case-insensitive):
  1. Product.name       CONTAINS query term
  2. Product.description CONTAINS query term
  3. Category.name      CONTAINS query term
Results are de-duplicated by product ID, sorted by price ascending so the
ShoppingAgent always surfaces the best value option first.

Returned dict shape (matches what graph.py merchant_node expects):
  {
    "id":               str,   # Prisma product cuid
    "product_id":       str,   # e.g. "HPN-MID"
    "name":             str,
    "description":      str,
    "price":            float,
    "currency":         str,
    "vendor":           str,   # Vendor.name
    "merchant_address": str,   # Vendor.pubkey — used for x402 payment routing
    "category":         str,
    "stock":            int,
    "images":           list[str],
  }
"""

from __future__ import annotations

import logging
from typing import Any

from ..db import get_db

logger = logging.getLogger(__name__)


class UCPCommerceSearchTool:
    """
    Async UCP product search backed by the Prisma PostgreSQL database.

    Compatible with the BaseTool interface used in graph nodes:
        result = await tool.run_async(args={"query": "headphones"}, tool_context=None)
    """

    name = "ucp_commerce_search"
    description = (
        "Search for real products and vendors in the Cart-Blanche UCP catalogue. "
        "Returns price, vendor, and merchant wallet address for x402 settlement."
    )

    async def run_async(
        self,
        *,
        args: dict[str, Any],
        tool_context: Any,          # None when called directly from graph nodes
    ) -> list[dict[str, Any]]:

        query: str = (args.get("query") or "").strip()
        if not query:
            logger.warning("[UCPSearch] Empty query received.")
            return []

        logger.info("[UCPSearch] Querying Prisma for: '%s'", query)

        db = await get_db()

        # ── Prisma query ─────────────────────────────────────────────────────
        # Search name, description, AND category name in one round-trip using OR.
        # include={"vendor": True, "category": True} avoids N+1 queries.
        raw_products = await db.product.find_many(
            where={
                "AND": [
                    {"stockQuantity": {"gt": 0}},   # only in-stock items
                    {
                        "OR": [
                            {"name":        {"contains": query, "mode": "insensitive"}},
                            {"description": {"contains": query, "mode": "insensitive"}},
                            {"category":    {"is": {"name": {"contains": query, "mode": "insensitive"}}}},
                        ]
                    },
                ]
            },
            include={"vendor": True, "category": True},
            order={"price": "asc"},     # cheapest first for the agent
            take=10,                    # cap at 10 results per query term
        )

        # ── Normalise to UCP shape ────────────────────────────────────────────
        results: list[dict[str, Any]] = []
        seen_ids: set[str] = set()

        for p in raw_products:
            if p.id in seen_ids:
                continue
            seen_ids.add(p.id)

            results.append({
                "id":               p.id,
                "product_id":       p.productID,
                "name":             p.name,
                "description":      p.description,
                "price":            float(p.price),
                "currency":         p.currency,
                "vendor":           p.vendor.name if p.vendor else "Unknown",
                # pubkey IS the merchant wallet — used directly in x402 settlement
                "merchant_address": p.vendor.pubkey if p.vendor else "0x0000000000000000000000000000000000000000",
                "category":         p.category.name if p.category else "Uncategorised",
                "stock":            p.stockQuantity,
                "images":           p.images or [],
            })

        logger.info(
            "[UCPSearch] '%s' → %d result(s) (in-stock, price-asc).", query, len(results)
        )
        return results