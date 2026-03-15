"""
agents/shopping.py — Shopping Agent (v6)
=========================================
Alias map and relevance scoring are now built DYNAMICALLY from the live
catalog fetched by catalog.py — the shopping agent will automatically
handle any new product added to the database without code changes.

The static _HARDCODED_ALIASES table provides a permanent safety net for
terms the auto-generator might not produce (e.g. brand abbreviations,
industry jargon).  These are MERGED with the dynamic aliases, so both
sources contribute to search coverage.
"""
from __future__ import annotations
import json, logging
from langchain_core.messages import AIMessage
from server.state import AgentState, MAX_STEPS
from server.tool.ucp_search import UCPCommerceSearchTool
from server.db import get_db
from .catalog  import build_alias_map, get_raw_products

logger = logging.getLogger(__name__)
_ucp_tool = UCPCommerceSearchTool()


# ── Permanent safety-net aliases ──────────────────────────────────────────────
# Brand abbreviations and domain jargon the auto-generator might miss.
# Merged on top of the dynamically generated map at runtime.
_HARDCODED_ALIASES: dict[str, list[str]] = {
    # Compute
    "gpu cluster":              ["H100", "GPU cluster", "GPU", "compute"],
    "a100 instance":            ["A100", "deep learning", "GPU"],
    "rtx 4090 instance":        ["RTX 4090", "RTX", "GPU instance"],
    "cloud storage":            ["cloud storage", "object storage", "S3"],
    "cdn bandwidth":            ["CDN", "bandwidth", "content delivery"],
    "vps server":               ["VPS", "dedicated server", "virtual private"],
    "etl pipeline":             ["ETL", "data pipeline", "managed pipeline"],
    "bi dashboard":             ["BI", "dashboard builder", "analytics dashboard"],
    # AI
    "gpt-4 token voucher":      ["GPT-4", "token proxy", "50M", "OpenAI"],
    "claude api voucher":       ["Claude", "Anthropic", "100M token"],
    "llm fine-tuning":          ["fine-tuning", "fine-tune", "LLM training", "custom model"],
    "image generation credits": ["image generation", "Stable Diffusion", "FLUX", "AI image"],
    "prompt engineering pack":  ["prompt", "prompt pack", "system prompts"],
    "vector database":          ["vector", "vector DB", "Pinecone", "RAG", "embeddings"],
    "tts credit":               ["TTS", "text-to-speech", "voice synthesis", "ElevenLabs"],
    # Creative
    "neon cyber ui kit":        ["Neon", "Cyber", "UI Kit", "Figma kit"],
    "saas dashboard ui kit":    ["SaaS dashboard", "admin template", "Framer"],
    "ios component library":    ["iOS", "SwiftUI", "mobile component", "HIG"],
    "icon pack":                ["icon", "SVG icon", "icon set"],
    "sci-fi 3d pack":           ["Sci-Fi", "Unreal", "3D pack", "modular base"],
    "fantasy rpg pack":         ["Fantasy", "RPG", "environment pack", "dungeon"],
    "motion title pack":        ["After Effects", "title template", "transitions"],
    "stock photos":             ["stock photo", "royalty-free images"],
    "lut pack":                 ["LUT", "colour grading", "DaVinci"],
    # Audio
    "cinematic ambient audio":  ["cinematic", "ambient", "audio bundle", "loop"],
    "game sound effects":       ["SFX", "sound effects", "game audio", "FMOD"],
    "royalty-free music library":["royalty-free music", "music library", "stems"],
    "podcast production kit":   ["podcast", "jingle", "intro music"],
    # Dev Tools
    "jetbrains ide":            ["JetBrains", "IntelliJ", "WebStorm", "PyCharm"],
    "vs code extensions":       ["VS Code", "VSCode", "extension bundle", "GitLens"],
    "postman team plan":        ["Postman", "API testing", "mock server"],
    "datagrip":                 ["DataGrip", "database IDE", "SQL IDE"],
    "docker pro":               ["Docker", "container", "Docker Pro"],
    "github pro":               ["GitHub", "GitHub Pro", "private repos"],
    # SaaS
    "ai coding assistant":      ["AI coding", "Copilot", "coding assistant", "lifetime"],
    "vercel pro":               ["Vercel", "Vercel Pro", "deployment credit"],
    "notion team":              ["Notion", "team plan", "workspace"],
    "figma professional":       ["Figma", "Figma Pro", "design collaboration"],
    "mixpanel growth":          ["Mixpanel", "product analytics", "funnel"],
    "sendgrid essentials":      ["SendGrid", "email API", "transactional email"],
    # Education
    "aws voucher":              ["AWS", "Solutions Architect", "Amazon certification"],
    "gcp voucher":              ["GCP", "Google Cloud", "data engineer cert"],
    "azure fundamentals":       ["Azure", "AZ-900", "Microsoft cert"],
    "cka voucher":              ["CKA", "Kubernetes", "CNCF", "k8s"],
    "udemy bundle":             ["Udemy", "course bundle", "100 courses"],
    "full-stack bootcamp":      ["full-stack", "web dev bootcamp", "React Node"],
    "ml engineering bootcamp":  ["ML engineering", "machine learning bootcamp", "PyTorch"],
    # Game Dev
    "unity asset bundle":       ["Unity", "asset bundle", "Unity Pro", "game pack"],
    "game dev course bundle":   ["game dev course", "Unreal C++", "Unity course"],
    # Security
    "vpn pro":                  ["VPN", "Enterprise VPN", "WireGuard"],
    "pen testing toolkit":      ["Burp Suite", "penetration testing", "pen test"],
    "security audit bundle":    ["security audit", "OWASP checklist", "web app security"],
    "ssl certificate":          ["SSL", "wildcard SSL", "TLS certificate"],
    "team password manager":    ["password manager", "vault", "team vault"],
    # Design
    "font collection":          ["font", "typography", "typeface", "premium font"],
    "brand identity kit":       ["brand kit", "brand identity", "logo system"],
    "print template pack":      ["print template", "brochure", "flyer"],
    # Marketing
    "seo audit tool":           ["SEO", "rank tracker", "keyword tracking"],
    "social media scheduler":   ["social scheduler", "social media", "Instagram"],
    "email marketing templates":["email template", "newsletter template", "HTML email"],
}


async def _get_merged_aliases() -> dict[str, list[str]]:
    """Merge dynamic aliases (from live DB) with permanent hardcoded aliases."""
    dynamic = await build_alias_map()
    merged  = dict(_HARDCODED_ALIASES)       # start with hardcoded
    for key, variants in dynamic.items():
        if key in merged:
            # Extend the hardcoded list with any dynamic variants not already present
            existing = {v.lower() for v in merged[key]}
            for v in variants:
                if v.lower() not in existing:
                    merged[key].append(v)
        else:
            merged[key] = variants
    return merged


def _relevance_score(product: dict, term: str, alias_variants: list[str]) -> int:
    """
    Score 0-5: how well this product matches the search term.
    Uses both the search term keywords AND the alias variants for matching.
    """
    combined = (product.get("name", "") + " " + product.get("description", "")).lower()
    score    = 0
    # Match against the search term words
    for word in term.lower().split():
        if len(word) > 3 and word in combined:
            score += 1
    # Match against alias variants (up to first 4)
    for variant in alias_variants[:4]:
        if variant.lower() in combined:
            score += 1
    return min(score, 5)


def _find_aliases(term: str, alias_map: dict[str, list[str]]) -> list[str]:
    term_lower = term.strip().lower()
    # Exact key match
    if term_lower in alias_map:
        return alias_map[term_lower]
    # Substring match (term contains key or key contains term)
    for key, variants in alias_map.items():
        if key in term_lower or term_lower in key:
            return variants
        # Any alias variant appears in the term
        if any(v.lower() in term_lower for v in variants[:3]):
            return variants
    # Fallback: return the term itself and basic suffix-stripped form
    stemmed = term_lower.rstrip("s") if term_lower.endswith("s") else term_lower
    return [term, stemmed] if stemmed != term_lower else [term]


async def _search_term(term: str, alias_map: dict[str, list[str]]) -> list[dict]:
    """Fan out DB searches across alias variants; score and rank results."""
    variants = _find_aliases(term, alias_map)
    seen:    set[str]  = set()
    results: list[dict] = []

    for variant in variants:
        try:
            hits = await _ucp_tool.run_async(args={"query": variant}, tool_context=None)
            for r in hits:
                if r["id"] not in seen:
                    seen.add(r["id"])
                    r["_relevance"] = _relevance_score(r, term, variants)
                    results.append(r)
        except Exception as exc:
            logger.warning("[Shopping] Search failed '%s': %s", variant, exc)
        if results:
            break   # stop at first variant that returns results

    results.sort(key=lambda x: (-x.get("_relevance", 0), x["price"]))
    return results


async def _save_agent_response(state: AgentState, rtype: str, text: str) -> None:
    chat_id = state.get("chat_id")
    if not chat_id:
        return
    try:
        db = await get_db()
        await db.agentresponse.create(data={"type": rtype, "text": text, "chatId": chat_id})
    except Exception as exc:
        logger.warning("[DB] Shopping AgentResponse save failed: %s", exc)


async def shopping_node(state: AgentState) -> dict:
    print("\n--- SHOPPING AGENT (v6 — live aliases) ---")
    steps = state.get("steps", 0)

    if steps >= MAX_STEPS:
        return {
            "product_list": [], "_shopped": True, "steps": steps + 1,
            "messages": [AIMessage(content="Search limit reached.", name="ShoppingAgent")],
        }

    plan             = state.get("project_plan", "")
    budget           = state.get("budget_usd", 0.0) or 0.0
    item_preferences = state.get("item_preferences") or {}

    if not plan:
        return {
            "product_list": [], "_shopped": True, "steps": steps + 1,
            "messages": [AIMessage(content="No search plan found.", name="ShoppingAgent")],
        }

    print(f"Plan: {plan}  Budget: ${budget}  Prefs: {item_preferences}")

    # ── Fetch merged alias map once per invocation ─────────────────────────────
    alias_map = await _get_merged_aliases()

    # ── Phase 1: search all terms ──────────────────────────────────────────────
    term_slots: list[dict] = []
    for cat_str in [c.strip() for c in plan.split(";") if c.strip()]:
        if ":" not in cat_str:
            continue
        cat_name, terms_str = cat_str.split(":", 1)
        for term in [t.strip() for t in terms_str.split(",") if t.strip()]:
            print(f"  Searching '{term}' ({cat_name.strip()})...")
            options = await _search_term(term, alias_map)
            if options:
                best = options[0]
                print(f"    -> {len(options)} results | top: {best['name']} (${best['price']}) rel={best.get('_relevance',0)}")
                term_slots.append({
                    "category": cat_name.strip(),
                    "term":     term,
                    "options":  options,
                })
            else:
                print(f"    -> no results for '{term}'")

    if not term_slots:
        # Fallback: search catalog for partial matches
        db = await get_db()
        products = await db.product.find_many()
        plan_terms = [t.strip() for t in plan.split(';') if t.strip()]
        matched = []
        for p in products:
            for term in plan_terms:
                if term.lower() in p["name"].lower() or term.lower() in p["description"].lower():
                    matched.append(p)
                    break
        if matched:
            return {
                "product_list": matched, "_shopped": True, "steps": steps + 1,
                "messages": [AIMessage(
                    content=f"Fallback: Found {len(matched)} similar products for your request.", name="ShoppingAgent",
                )],
            }
        else:
            return {
                "product_list": [], "_shopped": True, "steps": steps + 1,
                "messages": [AIMessage(
                    content="No in-stock or similar products found for your request.", name="ShoppingAgent",
                )],
            }

    # ── Phase 2: initial selection — one item per term slot ───────────────────
    selected:     list[dict] = []
    selected_ids: set[str]   = set()
    remaining = budget

    for slot in term_slots:
        pref  = item_preferences.get(slot["category"], "auto").lower()
        avail = [p for p in slot["options"] if p["id"] not in selected_ids]
        if not avail:
            continue

        if pref == "budget":
            fits   = [p for p in avail if p["price"] <= remaining] if budget > 0 else avail
            chosen = fits[0] if fits else avail[0]
        else:
            if budget > 0:
                fits = [p for p in avail if p["price"] <= remaining]
                if fits:
                    fits.sort(key=lambda x: (-x.get("_relevance", 0), -x["price"]))
                    chosen = fits[0]
                else:
                    chosen = avail[0]
            else:
                avail_s = sorted(avail, key=lambda x: (-x.get("_relevance", 0), -x["price"]))
                chosen  = avail_s[0]

        selected.append({"slot": slot, "product": chosen})
        selected_ids.add(chosen["id"])
        remaining = round(remaining - chosen["price"], 2)

    # ── Phase 3: budget-fill loop ──────────────────────────────────────────────
    if budget > 0:
        def _all_candidates() -> list[dict]:
            pool = [
                {"slot": slot, "product": p}
                for slot in term_slots
                for p in slot["options"]
                if p["id"] not in selected_ids
            ]
            pool.sort(key=lambda x: (-x["product"].get("_relevance", 0), -x["product"]["price"]))
            return pool

        improved = True
        while improved and remaining >= 1.0:
            improved = False
            for candidate in _all_candidates():
                if candidate["product"]["price"] <= remaining:
                    selected.append(candidate)
                    selected_ids.add(candidate["product"]["id"])
                    remaining = round(remaining - candidate["product"]["price"], 2)
                    improved  = True
                    break

    # ── Phase 4: upgrade existing picks if budget allows ──────────────────────
    if budget > 0:
        for item in selected:
            if item_preferences.get(item["slot"]["category"], "auto").lower() == "budget":
                continue
            cur   = item["product"]
            avail = [
                p for p in item["slot"]["options"]
                if p["id"] not in selected_ids and p["price"] > cur["price"]
            ]
            best: dict | None = None
            best_score = (-1, 0.0)
            for cand in avail:
                delta = cand["price"] - cur["price"]
                score = (cand.get("_relevance", 0), delta)
                if delta <= remaining and score > best_score:
                    best_score = score
                    best = cand
            if best:
                selected_ids.discard(cur["id"])
                selected_ids.add(best["id"])
                remaining = round(remaining - (best["price"] - cur["price"]), 2)
                item["product"] = best

    # ── Build output ───────────────────────────────────────────────────────────
    final_products = [s["product"] for s in selected]
    total_spent    = round(sum(p["price"] for p in final_products), 2)

    util = (
        f"{len(final_products)} items | ${total_spent:.2f} / ${budget:.2f} "
        f"({total_spent / budget * 100:.1f}% utilised)"
        if budget > 0
        else f"{len(final_products)} items | ${total_spent:.2f}"
    )
    print(f"\n[Shopping] Done — {util}")

    payload = {
        "type":             "product_list",
        "total":            total_spent,
        "budget":           budget,
        "remaining_budget": round(remaining, 2),
        "products": [
            {
                "id":               p["id"],
                "product_id":       p.get("product_id", ""),
                "name":             p["name"],
                "description":      p.get("description", ""),
                "price":            round(p["price"], 2),
                "currency":         p.get("currency", "USD"),
                "vendor":           p.get("vendor", "Unknown"),
                "vendor_id":        p.get("vendor_id", ""),
                "merchant_address": p.get("merchant_address", ""),
                "category":         p.get("category", ""),
                "stock":            p.get("stock", 0),
                "images":           p.get("images", []),
                "relevance_score":  p.get("_relevance", 0),
            }
            for p in final_products
        ],
    }
    payload_json = json.dumps(payload, indent=2)
    await _save_agent_response(state, "PRODUCT_LIST", payload_json)

    lines = ["Here's what I found for you:\n"]
    for p in final_products:
        lines.append(f"  - {p['name']} — ${p['price']:.2f}  [{p.get('vendor', '')}]")
    lines.append(f"\nTotal: ${total_spent:.2f}")
    if budget > 0 and remaining > 0:
        lines.append(f"Remaining budget: ${remaining:.2f}")
    lines.append("\nDoes this look good? Reply 'confirm' to proceed to checkout.")

    return {
        "product_list": final_products,
        "_shopped":     True,
        "steps":        steps + 1,
        "messages":     [
            AIMessage(content="\n".join(lines), name="ShoppingAgent"),
            AIMessage(content=f"```json\n{payload_json}\n```", name="ShoppingAgent"),
        ],
    }