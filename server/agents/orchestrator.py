"""
agents/orchestrator.py — Lead Orchestrator (v6)
================================================
Fully dynamic catalog awareness.  The product list embedded in the system
prompt is fetched LIVE from Prisma on each request (5-min TTL cache).
"""

from __future__ import annotations
import logging
import json
import re

from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from server.llm   import llm
from server.state import AgentState
from server.db    import get_db
from .catalog     import build_catalog_prompt, get_raw_products

logger = logging.getLogger(__name__)


_PERSONA_SCENARIOS = """
=== KNOWN USER PERSONAS — use as intent templates ===

PERSONA: Game Developer
  Signals: "game project", "Unreal", "Unity", "render", "3D assets", "game dev"
  Workflow: GPU credits → 3D environment pack → game audio SFX

PERSONA: AI Researcher / ML Engineer
  Signals: "AI engineering", "LLM", "GPT-4", "token", "model training", "fine-tune", "RAG"
  Workflow: Token voucher → vector DB → fine-tuning pack or ML bootcamp

PERSONA: Full-Stack Developer
  Signals: "full stack", "backend", "frontend", "deploy", "IDE", "web app"
  Workflow: IDE → deployment (Vercel/VPS) → AI coding assistant or GitHub Pro

PERSONA: DevOps / Cloud Engineer
  Signals: "DevOps", "Kubernetes", "Docker", "CI/CD", "cloud infrastructure"
  Workflow: Docker Pro → Kubernetes cert → VPS for lab environment

PERSONA: Startup / Solo Builder
  Signals: "startup", "MVP", "solo", "side project", "launch", "bootstrapped"
  Workflow: Deployment + UI kit + token voucher → analytics → email sending

PERSONA: Cybersecurity Professional
  Signals: "penetration testing", "security audit", "ethical hacker", "OWASP", "pen test"
  Workflow: Pen-testing toolkit → security audit bundle → VPN

PERSONA: Cloud Certification Candidate
  Signals: "certification", "exam voucher", "cloud cert", "AWS", "Azure", "GCP", "Kubernetes"
  Workflow: Exam voucher → study course bundle
"""

_INSTRUCTIONS = """
=== YOUR TASK ===
1. Read the live catalog above carefully.
2. Match the user's request to specific products using their exact names and categories.
3. For ANY product in the catalog you can reference them by name and category.
4. Use the persona templates as shortcuts for common workflows.
5. Suggest one complementary product the user didn't ask for if it clearly adds value.

=== OUTPUT FORMAT — CRITICAL ===
You MUST output EXACTLY these four lines and NOTHING else.
NO markdown. NO code fences. NO preamble. NO explanation. Just these four lines:

PRODUCTS: <semicolon-separated "Category: search term" pairs>
BUDGET: <USD number or 0>
PREFERENCES: <"Category=tier" pairs or "none">
SUGGESTION: <one sentence with product name + price, or "none">

For PRODUCTS, use search terms that match words in the product name.
Use exact category names from the catalog.

=== EXAMPLES ===
User: "Buy me the H100 GPU Cluster and GPT-4 token proxy"
PRODUCTS: Cloud & Compute: H100 GPU cluster; AI & Machine Learning: GPT-4 token voucher
BUDGET: 0
PREFERENCES: none
SUGGESTION: none

User: "I need AWS cert voucher and 50M GPT-4 tokens under $300"
PRODUCTS: Education Vouchers: AWS voucher; AI & Machine Learning: GPT-4 token voucher
BUDGET: 300
PREFERENCES: none
SUGGESTION: none

User: "full stack dev setup with IDE and deployment"
PRODUCTS: Developer Tools: JetBrains IDE; SaaS Subscriptions: Vercel pro
BUDGET: 0
PREFERENCES: none
SUGGESTION: Add GitHub Pro ($48) to complete your development workflow.
"""

_AFFIRMATION_KEYWORDS = {
    "looks good", "confirm", "proceed", "yes", "ok", "approve",
    "go ahead", "do it", "buy it", "let's do it", "sounds good",
    "perfect", "great", "checkout", "purchase", "sure", "yep", "yup",
}

# Fast-path keyword map: list of trigger keywords → (category, search_term)
_PRODUCT_KEYWORD_MAP = [
    (["h100", "gpu cluster", "100 hour", "100h gpu"],      ("Cloud & Compute", "H100 GPU cluster")),
    (["a100", "200 hour", "200h gpu"],                     ("Cloud & Compute", "A100 GPU")),
    (["rtx 4090", "rtx4090", "50 hour gpu"],               ("Cloud & Compute", "RTX 4090")),
    (["cloud storage", "object storage", "1tb storage"],   ("Cloud & Compute", "cloud storage")),
    (["cdn", "bandwidth credit"],                          ("Cloud & Compute", "CDN bandwidth")),
    (["vps", "virtual private server"],                    ("Cloud & Compute", "VPS server")),
    (["etl pipeline", "data pipeline"],                    ("Data & Analytics", "ETL pipeline")),
    (["bi dashboard", "dashboard builder"],                ("Data & Analytics", "BI dashboard")),
    # AI
    (["gpt-4", "gpt4", "50m token", "200m token", "token proxy",
      "token voucher", "gpt 4 proxy"],                     ("AI & Machine Learning", "GPT-4 token voucher")),
    (["claude api", "claude voucher", "100m token"],       ("AI & Machine Learning", "Claude API voucher")),
    (["fine-tun", "finetun"],                              ("AI & Machine Learning", "LLM fine-tuning")),
    (["image gen", "stable diffusion", "flux", "5000 image", "5k image"],
                                                           ("AI & Machine Learning", "image generation credits")),
    (["prompt pack", "prompt engineer"],                   ("AI & Machine Learning", "prompt engineering pack")),
    (["vector db", "vector database", "pinecone", "rag"],  ("AI & Machine Learning", "vector database")),
    (["tts", "text-to-speech", "voice synth", "elevenlabs"],("AI & Machine Learning", "TTS credit")),
    # Creative
    (["neon cyber", "neon-cyber", "figma kit"],            ("Creative Assets", "neon cyber UI kit")),
    (["saas dashboard ui", "admin template"],              ("Creative Assets", "SaaS dashboard UI kit")),
    (["ios component", "swiftui"],                         ("Creative Assets", "iOS component library")),
    (["icon pack", "svg icon"],                            ("Creative Assets", "icon pack")),
    (["sci-fi 3d", "scifi pack", "unreal pack"],           ("Creative Assets", "sci-fi 3D pack")),
    (["fantasy rpg", "dungeon pack"],                      ("Creative Assets", "fantasy RPG pack")),
    (["after effect", "motion title"],                     ("Creative Assets", "motion title pack")),
    (["stock photo"],                                      ("Creative Assets", "stock photos")),
    (["lut pack", "colour grad", "davinci lut"],           ("Creative Assets", "LUT pack")),
    # Audio
    (["cinematic audio", "ambient audio"],                 ("Audio & Music", "cinematic ambient audio")),
    (["game sfx", "sound effect", "game audio"],           ("Audio & Music", "game sound effects")),
    (["music library", "royalty-free music"],              ("Audio & Music", "royalty-free music library")),
    (["podcast kit", "podcast jingle"],                    ("Audio & Music", "podcast production kit")),
    # Dev Tools
    (["jetbrain", "intellij", "webstorm", "pycharm"],      ("Developer Tools", "JetBrains IDE")),
    (["vscode extension", "vs code extension", "gitlens"], ("Developer Tools", "VS Code extensions")),
    (["postman"],                                          ("Developer Tools", "Postman team plan")),
    (["datagrip", "database ide"],                         ("Developer Tools", "DataGrip")),
    (["docker pro", "docker subscription"],                ("Developer Tools", "Docker Pro")),
    (["github pro"],                                       ("Developer Tools", "GitHub Pro")),
    # SaaS
    (["ai coding assistant", "copilot pro"],               ("SaaS Subscriptions", "AI coding assistant")),
    (["vercel pro", "vercel credit"],                      ("SaaS Subscriptions", "Vercel Pro")),
    (["notion team", "notion plan"],                       ("SaaS Subscriptions", "Notion team")),
    (["figma pro", "figma professional"],                  ("SaaS Subscriptions", "Figma Professional")),
    (["mixpanel"],                                         ("SaaS Subscriptions", "Mixpanel Growth")),
    (["sendgrid", "transactional email plan"],             ("SaaS Subscriptions", "SendGrid Essentials")),
    # Education
    (["aws cert", "aws solutions architect"],              ("Education Vouchers", "AWS voucher")),
    (["gcp cert", "google cloud cert"],                    ("Education Vouchers", "GCP voucher")),
    (["azure cert", "az-900"],                             ("Education Vouchers", "Azure fundamentals")),
    (["cka", "kubernetes cert"],                           ("Education Vouchers", "CKA voucher")),
    (["udemy bundle", "100 course"],                       ("Education Vouchers", "Udemy bundle")),
    (["full-stack bootcamp", "fullstack bootcamp"],        ("Education Vouchers", "full-stack bootcamp")),
    (["ml bootcamp", "ml engineering bootcamp"],           ("Education Vouchers", "ML engineering bootcamp")),
    # Game Dev
    (["unity asset bundle", "unity mega bundle"],         ("Game Development", "Unity asset bundle")),
    (["game dev course", "unreal course"],                ("Game Development", "game dev course bundle")),
    # Security
    (["vpn pro", "enterprise vpn"],                       ("Cybersecurity", "VPN Pro")),
    (["burp suite", "pen test kit", "penetration test"],  ("Cybersecurity", "pen testing toolkit")),
    (["security audit", "owasp checklist"],               ("Cybersecurity", "security audit bundle")),
    (["wildcard ssl", "ssl cert"],                        ("Cybersecurity", "SSL certificate")),
    (["password manager"],                                ("Cybersecurity", "team password manager")),
    # Design
    (["font collection", "premium font"],                 ("Design & Fonts", "font collection")),
    (["brand kit", "brand identity kit"],                 ("Design & Fonts", "brand identity kit")),
    (["print template"],                                  ("Design & Fonts", "print template pack")),
    # Marketing
    (["seo audit", "rank tracker"],                       ("Marketing & SEO", "SEO audit tool")),
    (["social scheduler", "social media plan"],           ("Marketing & SEO", "social media scheduler")),
    (["email marketing template", "newsletter template"], ("Marketing & SEO", "email marketing templates")),
]


def _keyword_fallback(query: str) -> str:
    """Direct keyword matching — bulletproof fallback when LLM parsing fails."""
    q = query.lower()
    slots: list[str] = []
    seen: set[str] = set()
    for keywords, (category, search_term) in _PRODUCT_KEYWORD_MAP:
        if any(kw in q for kw in keywords):
            key = f"{category}:{search_term}"
            if key not in seen:
                seen.add(key)
                slots.append(f"{category}: {search_term}")
    return "; ".join(slots)


def _extract_budget(query: str) -> float:
    patterns = [
        r"under\s*\$?([\d,]+)",
        r"budget\s*(?:of\s*)?\$?([\d,]+)",
        r"\$?([\d,]+)\s*budget",
        r"less\s+than\s*\$?([\d,]+)",
        r"no\s+more\s+than\s*\$?([\d,]+)",
        r"max(?:imum)?\s*\$?([\d,]+)",
    ]
    for pattern in patterns:
        m = re.search(pattern, query, re.IGNORECASE)
        if m:
            try:
                return float(m.group(1).replace(",", ""))
            except ValueError:
                pass
    return 0.0


def _clean_llm_output(content: str) -> str:
    """Strip markdown fences and any preamble before the PRODUCTS: line."""
    content = re.sub(r"```[a-z]*\n?", "", content)
    content = content.replace("```", "")
    lines = content.splitlines()
    start_idx = None
    for i, line in enumerate(lines):
        if re.match(r"^\s*PRODUCTS\s*:", line, re.IGNORECASE):
            start_idx = i
            break
    if start_idx is not None:
        return "\n".join(lines[start_idx:]).strip()
    return content.strip()


def _parse_llm_response(content: str) -> tuple[str, float, dict, str]:
    plan        = ""
    budget      = 0.0
    preferences: dict[str, str] = {}
    suggestion  = ""

    cleaned = _clean_llm_output(content)
    print(f"[DEBUG ORCHESTRATOR] Cleaned LLM output:\n---\n{cleaned}\n---")

    for line in cleaned.splitlines():
        line = line.strip()
        if not line:
            continue
        upper = line.upper()

        if upper.startswith("PRODUCTS:"):
            plan = line[len("PRODUCTS:"):].strip()
        elif upper.startswith("BUDGET:"):
            raw = line[len("BUDGET:"):].strip()
            nums = re.findall(r"[\d]+\.?\d*", raw.replace(",", ""))
            if nums:
                try:
                    budget = float(nums[0])
                except ValueError:
                    pass
        elif upper.startswith("PREFERENCES:"):
            raw_pref = line[len("PREFERENCES:"):].strip()
            if raw_pref.lower() not in ("none", "n/a", ""):
                for pair in raw_pref.split(";"):
                    pair = pair.strip()
                    if "=" in pair:
                        cat, tier = pair.split("=", 1)
                        preferences[cat.strip()] = tier.strip().lower()
        elif upper.startswith("SUGGESTION:"):
            raw = line[len("SUGGESTION:"):].strip()
            suggestion = "" if raw.lower() in ("none", "n/a", "") else raw

    return plan, budget, preferences, suggestion


async def _save_agent_response(state: AgentState, rtype: str, text: str) -> str | None:
    chat_id         = state.get("chat_id")
    user_request_id = state.get("user_request_id")
    if not chat_id:
        return None
    try:
        db = await get_db()
        resp = await db.agentresponse.create(data={
            "type":   rtype,
            "text":   text,
            "chatId": chat_id,
            **({"userRequestId": user_request_id} if user_request_id else {}),
        })
        if user_request_id:
            await db.userrequest.update(
                where={"id": user_request_id},
                data={"agentResponseId": resp.id},
            )
        return resp.id
    except Exception as exc:
        logger.warning("[DB] Orchestrator AgentResponse save failed: %s", exc)
        return None


def _build_system_prompt(catalog_block: str) -> str:
    return (
        "You are the Lead Orchestrator for Cart-Blanche, a premium digital goods marketplace.\n"
        "Your most important capability is deep knowledge of the live product catalog below.\n"
        "This catalog is fetched in real-time from the database — it ALWAYS reflects current inventory.\n"
        "Every product listed here is available for purchase right now.\n\n"
        f"{catalog_block}\n\n"
        f"{_PERSONA_SCENARIOS}\n\n"
        f"{_INSTRUCTIONS}"
    )


async def orchestrator_node(state: AgentState) -> dict:
    print("\n--- ORCHESTRATOR (v6 — live catalog) ---")

    query = state.get("query")
    if not query:
        for msg in reversed(state.get("messages", [])):
            if isinstance(msg, HumanMessage) or getattr(msg, "type", "") == "human":
                query = msg.content
                break

    if not query:
        return {
            "messages": [AIMessage(
                content="I didn't receive a message. What are you looking for today?",
                name="Orchestrator",
            )],
            "_orchestrated": True,
        }

    query_lower = query.lower().strip()

    # Use regex word boundaries (\b) to prevent matching "ok" inside "token"
    is_affirmation = any(
        re.search(rf'\b{re.escape(k)}\b', query_lower) 
        for k in _AFFIRMATION_KEYWORDS
    )

    if query_lower in _AFFIRMATION_KEYWORDS or is_affirmation:
        return {"_orchestrated": True, "_shopped": False}

    # ── Step 1: Keyword fast-path (always run — O(n) cost, never fails) ───────
    keyword_plan   = _keyword_fallback(query)
    keyword_budget = _extract_budget(query)
    print(f"[Orchestrator] Keyword fast-path: '{keyword_plan}'")

    # ── Step 2: LLM for richer plan + suggestion ──────────────────────────────
    catalog_block = await build_catalog_prompt()
    system_prompt = _build_system_prompt(catalog_block)

    llm_plan        = ""
    llm_budget      = 0.0
    llm_preferences: dict[str, str] = {}
    llm_suggestion  = ""

    try:
        response = await llm.ainvoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content=query),
        ])
        raw_content: str = (
            response.content if isinstance(response.content, str) else str(response.content)
        )
        print(f"[DEBUG ORCHESTRATOR] Raw LLM:\n---\n{raw_content}\n---")
        llm_plan, llm_budget, llm_preferences, llm_suggestion = _parse_llm_response(raw_content)
        print(f"[DEBUG ORCHESTRATOR] LLM parsed → plan='{llm_plan}' budget={llm_budget}")
    except Exception as exc:
        logger.warning("[Orchestrator] LLM call failed: %s", exc)

    # ── Step 3: Prefer LLM result; fall back to keyword if LLM empty ──────────
    plan        = llm_plan       if llm_plan       else keyword_plan
    budget      = llm_budget     if llm_budget > 0  else keyword_budget
    preferences = llm_preferences
    suggestion  = llm_suggestion

    print(f"[Orchestrator] FINAL plan: '{plan}' | budget: ${budget}")

    if not plan:
        logger.error("[Orchestrator] All extraction methods failed. query=%s", query[:120])
        return {
            "_orchestrated": True,
            "_shopped":      True,
            "product_list":  [],
            "messages": [AIMessage(
                content=(
                    "I had trouble understanding your request. Please try rephrasing — for example:\n"
                    "'Buy me the H100 GPU Cluster and the GPT-4 token voucher.'"
                ),
                name="Orchestrator",
            )],
        }

    raw_products = await get_raw_products()
    budget_warn  = ""
    if budget > 0 and raw_products:
        plan_lower = plan.lower()
        estimated  = sum(
            p["price"] for p in raw_products
            if any(w in plan_lower for w in p["name"].lower().split() if len(w) > 3)
        )
        if estimated > budget * 1.15:
            budget_warn = (
                f"Your items may total ~${estimated:.0f}, "
                f"exceeding your ${budget:.0f} budget. "
                "I'll prioritise the best fit."
            )

    reply_parts = ["Got it! Here's what I'm sourcing for you:\n"]
    for segment in plan.split(";"):
        segment = segment.strip()
        if ":" in segment:
            cat, terms = segment.split(":", 1)
            for term in [t.strip() for t in terms.split(",") if t.strip()]:
                reply_parts.append(f"  - {term} ({cat.strip()})")
    if budget > 0:
        reply_parts.append(f"\nBudget: ${budget:.0f}")
    if suggestion:
        reply_parts.append(f"\nSuggestion: {suggestion}")
    if budget_warn:
        reply_parts.append(f"\nNote: {budget_warn}")
    reply_parts.append("\nSearching the catalog now...")

    plan_payload = json.dumps({
        "type": "PLAN", "plan": plan,
        "budget": budget, "preferences": preferences, "suggestion": suggestion,
    })
    await _save_agent_response(state, "PLAN", plan_payload)

    return {
        "project_plan":     plan,
        "budget_usd":       budget,
        "item_preferences": preferences,
        "_orchestrated":    True,
        "_shopped":         False,
        "product_list":     None,
        "cart_mandate":     None,
        "messages":         [AIMessage(content="\n".join(reply_parts), name="Orchestrator")],
    }