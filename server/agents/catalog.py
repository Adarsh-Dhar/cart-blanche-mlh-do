"""
agents/catalog.py — Live Catalog Context Builder
==================================================
Fetches the full product catalog from Prisma at runtime so agents are
ALWAYS aware of every product in the database — including anything added
after the code was deployed.

Public API:
  await build_catalog_prompt()   → str   (formatted block for system prompt)
  await build_alias_map()        → dict  (term→[db query variants] for shopping agent)
  await get_raw_products()       → list  (raw dicts for price/budget checks)

All three share a TTL cache (default 5 min).  Pass refresh=True to force
an immediate reload — useful right after a seeding run or vendor sync.
"""

from __future__ import annotations

import asyncio
import logging
import time

from server.db import get_db

logger = logging.getLogger(__name__)

CATALOG_TTL: int = 300          # seconds — re-query DB every 5 minutes

_cache_time:     float = 0.0
_catalog_prompt: str   = ""
_alias_map:      dict[str, list[str]] = {}
_raw_products:   list[dict]           = []
_cache_lock = asyncio.Lock()


# ─────────────────────────────────────────────────────────────────────────────
# PUBLIC
# ─────────────────────────────────────────────────────────────────────────────

async def build_catalog_prompt(refresh: bool = False) -> str:
    await _refresh_if_stale(refresh)
    return _catalog_prompt

async def build_alias_map(refresh: bool = False) -> dict[str, list[str]]:
    await _refresh_if_stale(refresh)
    return dict(_alias_map)

async def get_raw_products(refresh: bool = False) -> list[dict]:
    await _refresh_if_stale(refresh)
    return list(_raw_products)


# ─────────────────────────────────────────────────────────────────────────────
# INTERNAL
# ─────────────────────────────────────────────────────────────────────────────

async def _refresh_if_stale(refresh: bool) -> None:
    global _cache_time
    async with _cache_lock:
        if refresh or (time.monotonic() - _cache_time) > CATALOG_TTL:
            await _load_from_db()
            _cache_time = time.monotonic()


async def _load_from_db() -> None:
    global _catalog_prompt, _alias_map, _raw_products

    logger.info("[Catalog] Refreshing from database...")
    db = await get_db()

    products = await db.product.find_many(
        where={"stockQuantity": {"gt": 0}},
        include={"vendor": True, "category": True},
        order=[{"category": {"name": "asc"}}, {"price": "asc"}],
    )

    raw: list[dict] = []
    for p in products:
        raw.append({
            "id":               p.id,
            "product_id":       p.productID,
            "sku":              p.sku,
            "name":             p.name,
            "description":      p.description,
            "price":            float(p.price),
            "currency":         p.currency,
            "category":         p.category.name  if p.category else "Uncategorised",
            "category_slug":    p.category.slug  if p.category else "",
            "vendor":           p.vendor.name    if p.vendor   else "Unknown",
            "vendor_id":        p.vendorId,
            "merchant_address": p.vendor.pubkey  if p.vendor   else "",
            "stock":            p.stockQuantity,
            "images":           p.images or [],
        })

    _raw_products   = raw
    _catalog_prompt = _build_prompt(raw)
    _alias_map      = _build_alias_map(raw)

    logger.info(
        "[Catalog] Loaded %d products across %d categories from %d vendors.",
        len(raw),
        len({p["category"] for p in raw}),
        len({p["vendor"] for p in raw}),
    )


# ── Prompt builder ─────────────────────────────────────────────────────────────

def _build_prompt(products: list[dict]) -> str:
    if not products:
        return "=== CATALOG IS EMPTY — no products in stock ===\n"

    # Group: vendor → category → [products]
    vendor_map: dict[str, dict[str, list[dict]]] = {}
    for p in products:
        vendor_map.setdefault(p["vendor"], {}).setdefault(p["category"], []).append(p)

    lines: list[str] = ["=== CART-BLANCHE LIVE PRODUCT CATALOG (fetched from database) ===\n"]

    for vendor, categories in sorted(vendor_map.items()):
        lines.append(f"--- VENDOR: {vendor} ---")
        for category, prods in sorted(categories.items()):
            lines.append(f"  [{category}]")
            for p in prods:
                use_cases = _extract_use_cases(p["description"])
                lines.append(
                    f"  {p['product_id']:<22} | {p['name']:<52} | ${p['price']:.0f}"
                )
                if use_cases:
                    lines.append(f"    → {use_cases}")
        lines.append("")

    lines.append("=== END OF CATALOG ===")
    return "\n".join(lines)


# ── Alias map builder ──────────────────────────────────────────────────────────

def _build_alias_map(products: list[dict]) -> dict[str, list[str]]:
    """
    Automatically derive a search alias map from the live product list.
    Key   = normalised product name (lowercase).
    Value = ordered list of DB query strings to try (most specific first).
    """
    alias_map: dict[str, list[str]] = {}

    for p in products:
        variants = _dedupe([
            p["name"],                       # exact name — highest precision
            *_name_subphrases(p["name"]),    # meaningful sub-phrases
            *_top_keywords(p["description"], n=5),  # salient description tokens
            p["category"],                   # category fallback
        ])
        key = p["name"].lower()
        alias_map[key] = variants
        # Also index by productID for direct lookup
        alias_map[p["product_id"].lower()] = variants

    return alias_map


# ── Text helpers ───────────────────────────────────────────────────────────────

_STOPWORDS = {
    "a","an","the","and","or","for","to","of","in","on","at","with","is","are",
    "be","by","up","its","via","per","as","this","that","from","into","it","you",
    "your","we","our","their","any","all","each","which","than","more","most",
    "also","can","will","has","have","been","using","use","ideal","perfect",
    "great","best","premium","instant","ready","includes","included","complete",
    "across","over","including","compatible","supports","support","full","high",
    "providing","allows","designed","featuring","based","built","available",
}

_PRESERVE_PHRASES = [
    "Unreal Engine 5","Unreal Engine","After Effects","Final Cut Pro",
    "DaVinci Resolve","Stable Diffusion XL","Stable Diffusion","PyTorch",
    "TensorFlow","scikit-learn","Next.js","JetBrains","IntelliJ IDEA",
    "VS Code","GitHub Actions","Burp Suite","WireGuard","ElevenLabs",
    "Midjourney","GPT-4","AWS","GCP","Azure","OWASP","FMOD","SwiftUI",
]

def _extract_use_cases(description: str) -> str:
    for marker in ("Ideal for:", "Best for:", "Perfect for:", "Use for:", "Great for:"):
        if marker in description:
            snippet = description.split(marker, 1)[1].split(".")[0].strip()
            return snippet[:120]
    return description.split(".")[0].strip()[:100]


def _top_keywords(text: str, n: int = 5) -> list[str]:
    tokens: list[str] = []
    text_lower = text.lower()

    # Preserve multi-word technical phrases first
    for phrase in _PRESERVE_PHRASES:
        if phrase.lower() in text_lower and phrase not in tokens:
            tokens.append(phrase)

    # Capitalised single words (proper nouns / product names)
    for word in text.split():
        clean = word.strip(".,;:()[]\"'/")
        if (
            len(clean) >= 3
            and clean.lower() not in _STOPWORDS
            and clean not in tokens
            and clean[0].isupper()
        ):
            tokens.append(clean)
        if len(tokens) >= n + len(_PRESERVE_PHRASES):
            break

    return tokens[:n]


def _name_subphrases(name: str) -> list[str]:
    """
    All suffix sub-phrases of a product name that start with a non-numeric word.
    "100 Hours H100 GPU Cluster" → ["H100 GPU Cluster", "GPU Cluster", "H100", "GPU", "Cluster"]
    """
    parts  = name.split()
    result: list[str] = []
    for i in range(len(parts)):
        if parts[i][0].isdigit():
            continue
        phrase = " ".join(parts[i:])
        if phrase != name and len(phrase) > 2:
            result.append(phrase)
    # Individual capitalised tokens
    for part in parts:
        clean = part.strip("()[]")
        if len(clean) >= 3 and not clean.isdigit() and clean[0].isupper():
            if clean not in result:
                result.append(clean)
    return result


def _dedupe(items: list[str]) -> list[str]:
    seen: set[str] = set()
    out:  list[str] = []
    for item in items:
        key = item.lower().strip()
        if key and key not in seen:
            seen.add(key)
            out.append(item.strip())
    return out