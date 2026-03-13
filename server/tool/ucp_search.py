"""
tool/ucp_search.py — Universal Commerce Protocol search via Prisma DB
======================================================================
The UCP "network" for Cart-Blanche IS the Prisma PostgreSQL database.
Each Product row is a UCP listing; Vendor.pubkey is the merchant_address
used by the x402 settlement tool for on-chain payment routing.

Search strategy (all case-insensitive):
  1. Product.name        CONTAINS query term
  2. Product.description CONTAINS query term
  3. Category.name       CONTAINS query term

Results are de-duplicated by product ID and sorted by price ascending.

Returned dict shape — matches what merchant_node / settlement_node expect:
  {
    "id":               str,   # Prisma product cuid
    "product_id":       str,   # Product.productID  e.g. "HPN-MID"
    "vendor_id":        str,   # Product.vendorId   (Prisma cuid)
    "name":             str,
    "description":      str,
    "price":            float,
    "currency":         str,
    "vendor":           str,   # Vendor.name  (display label)
    "merchant_address": str,   # Vendor.pubkey — x402 payment destination
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
    name = "ucp_commerce_search"
    description = (
        "Search for real products and vendors in the Cart-Blanche UCP catalogue. "
        "Returns price, vendor name, and merchant wallet address for x402 settlement."
    )

    async def run_async(
        self,
        *,
        args: dict[str, Any],
        tool_context: Any,          # None when called directly from agent nodes
    ) -> list[dict[str, Any]]:

        query: str = (args.get("query") or "").strip()
        if not query:
            logger.warning("[UCPSearch] Empty query received.")
            return []

        logger.info("[UCPSearch] Querying Prisma for: '%s'", query)
        db = await get_db()

        raw_products = await db.product.find_many(
            where={
                "AND": [
                    {"stockQuantity": {"gt": 0}},           # in-stock only
                    {
                        "OR": [
                            {"name":        {"contains": query, "mode": "insensitive"}},
                            {"description": {"contains": query, "mode": "insensitive"}},
                            {
                                "category": {
                                    "is": {
                                        "name": {"contains": query, "mode": "insensitive"}
                                    }
                                }
                            },
                        ]
                    },
                ]
            },
            include={"vendor": True, "category": True},
            order={"price": "asc"},     # cheapest first
            take=10,                    # cap per query term
        )

        results: list[dict[str, Any]] = []
        seen_ids: set[str] = set()

        for p in raw_products:
            if p.id in seen_ids:
                continue
            seen_ids.add(p.id)

            results.append({
                "id":               p.id,
                "product_id":       p.productID,
                "vendor_id":        p.vendorId,   # needed by settlement → OrderItem
                "name":             p.name,
                "description":      p.description,
                "price":            float(p.price),
                "currency":         p.currency,
                "vendor":           p.vendor.name   if p.vendor   else "Unknown",
                # Vendor.pubkey is the on-chain x402 payment destination
                "merchant_address": p.vendor.pubkey if p.vendor   else "0x0000000000000000000000000000000000000000",
                "category":         p.category.name if p.category else "Uncategorised",
                "stock":            p.stockQuantity,
                "images":           p.images or [],
            })

        logger.info(
            "[UCPSearch] '%s' → %d result(s) (in-stock, price-asc).", query, len(results)
        )
        return results


async def search_ucp(query: str) -> list[dict[str, Any]]:
    """
    Wrapper function for UCPCommerceSearchTool.run_async to provide a simpler interface.
    """
    tool = UCPCommerceSearchTool()
    return await tool.run_async(args={"query": query}, tool_context=None)