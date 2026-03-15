"""
agents/orchestrator.py — Lead Orchestrator (v6)
================================================
Fully dynamic catalog awareness.  The product list embedded in the system
prompt is fetched LIVE from Prisma on each request (5-min TTL cache).
Adding or editing products in the database is immediately reflected in the
agent's knowledge — no code changes required.

Static sections of the prompt (persona scenarios, mapping rules, output
format) encode domain logic that doesn't change with inventory.  Only
genuinely new PERSONA ARCHETYPES ever need a line added here.
"""

from __future__ import annotations
import logging
import json

from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from server.llm   import llm
from server.state import AgentState
from server.db    import get_db
from .catalog     import build_catalog_prompt, get_raw_products

logger = logging.getLogger(__name__)


# ── Static prompt sections ────────────────────────────────────────────────────

_PERSONA_SCENARIOS = """
=== KNOWN USER PERSONAS — use as intent templates ===

PERSONA: Game Developer
  Signals: "game project", "Unreal", "Unity", "render", "3D assets", "game dev"
  Workflow: GPU credits → 3D environment pack → game audio SFX

PERSONA: Indie Game Dev (budget)
  Signals: "indie", "solo game", "Unity beginner", "small game"
  Workflow: Budget GPU instance → Unity asset bundle → game dev course

PERSONA: UI/UX Designer
  Signals: "mobile app design", "Figma kit", "UI kit", "prototype", "design system"
  Workflow: UI kit → deployment credits → Figma Pro license

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

PERSONA: Content Creator / YouTuber
  Signals: "YouTube", "content creator", "video", "trailer", "colour grade"
  Workflow: Motion title templates → royalty-free music → LUT pack → stock photos

PERSONA: Podcast Creator
  Signals: "podcast", "audio show", "episode", "jingle", "intro music"
  Workflow: Podcast kit → TTS credit → background music library

PERSONA: Cybersecurity Professional
  Signals: "penetration testing", "security audit", "ethical hacker", "OWASP", "pen test"
  Workflow: Pen-testing toolkit → security audit bundle → VPN

PERSONA: Data Engineer / Analyst
  Signals: "data pipeline", "ETL", "warehouse", "BigQuery", "analytics", "BI"
  Workflow: ETL pipeline → BI dashboard → GCP data engineer cert

PERSONA: Brand Designer / Freelancer
  Signals: "branding", "brand identity", "logo", "typography", "client work"
  Workflow: Brand kit → font collection → print templates

PERSONA: Growth Marketer
  Signals: "SEO", "marketing", "rank", "social media", "email campaign"
  Workflow: SEO audit tool → social scheduler → email templates

PERSONA: Cloud Certification Candidate
  Signals: "certification", "exam voucher", "cloud cert", "AWS", "Azure", "GCP", "Kubernetes"
  Workflow: Exam voucher → study course bundle

PERSONA: SaaS Product Team
  Signals: "product team", "analytics", "collaboration", "team workspace", "transactional email"
  Workflow: Team workspace → analytics → transactional email

IMPORTANT: If the user's request doesn't match any persona above, use the catalog
directly — identify the most relevant products by name and category.
"""

_INSTRUCTIONS = """
=== YOUR TASK ===
1. Read the live catalog above carefully.
2. Match the user's request to specific products using their exact names and categories.
3. For ANY product in the catalog — even ones added after this code was written — you
   can reference them by name and category. Do not say a product doesn't exist if it
   appears in the catalog above.
4. Use the persona templates as shortcuts for common workflows.
5. Suggest one complementary product the user didn't ask for if it clearly adds value.

=== OUTPUT FORMAT ===
Output EXACTLY these four lines, nothing else:
PRODUCTS: <semicolon-separated "Category: search term" pairs>
BUDGET: <USD number or 0>
PREFERENCES: <"Category=tier" pairs or "none">
SUGGESTION: <one sentence with product name + price, or "none">

For PRODUCTS, use search terms that match words in the product name or description.
Use the exact category name from the catalog (e.g. "AI & Machine Learning", not "AI").

=== PREFERENCE VALUES ===
premium = best / high-end / top-tier / don't cut corners
budget  = cheap / affordable / save money / entry-level

=== SUGGESTION RULE ===
Only suggest if the product genuinely completes the user's workflow.
Name the product and its price. One sentence. Output "none" if unsure.

=== EXAMPLES ===
Input: "I'm starting a new game project — 100H H100 GPU cluster and a sci-fi 3D pack for UE5. Budget $400."
PRODUCTS: Cloud & Compute: GPU cluster; Creative Assets: sci-fi 3D pack
BUDGET: 400
PREFERENCES: none
SUGGESTION: Complete your game with the Game Sound Effects Library ($65) — 1,000 SFX ready for Unreal Engine.

Input: "Premium Neon-Cyber Figma UI kit and 3 months Vercel Pro. Under $150."
PRODUCTS: Creative Assets: neon cyber UI kit; SaaS Subscriptions: Vercel pro
BUDGET: 150
PREFERENCES: Creative Assets=premium
SUGGESTION: none

Input: "AWS Solutions Architect voucher and 50M GPT-4 token proxy. Budget $300."
PRODUCTS: Education Vouchers: AWS voucher; AI & Machine Learning: GPT-4 token voucher
BUDGET: 300
PREFERENCES: none
SUGGESTION: none
"""

_AFFIRMATION_KEYWORDS = {
    "looks good", "confirm", "proceed", "yes", "ok", "approve",
    "go ahead", "do it", "buy it", "let's do it", "sounds good",
    "perfect", "great", "checkout", "purchase", "sure", "yep", "yup",
}


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


async def _budget_warning(plan: str, budget: float, products: list[dict]) -> str:
    if budget <= 0 or not products:
        return ""
    plan_lower = plan.lower()
    estimated  = sum(
        p["price"] for p in products
        if any(w in plan_lower for w in p["name"].lower().split() if len(w) > 3)
    )
    if estimated > budget * 1.15:
        return (
            f"Your requested items may total around ${estimated:.0f}, "
            f"which exceeds your ${budget:.0f} budget. "
            f"I'll prioritise the best fit within your limit."
        )
    return ""


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
    if query_lower in _AFFIRMATION_KEYWORDS or \
       any(k in query_lower for k in _AFFIRMATION_KEYWORDS):
        return {"_orchestrated": True, "_shopped": False}

    # ── Fetch live catalog ─────────────────────────────────────────────────────
    catalog_block = await build_catalog_prompt()
    system_prompt = _build_system_prompt(catalog_block)

    # ── LLM call ──────────────────────────────────────────────────────────────
    response = await llm.ainvoke([
        SystemMessage(content=system_prompt),
        HumanMessage(content=query),
    ])
    content = response.content.strip()
    # Strip markdown code fences if LLM wraps output
    if "```" in content:
        lines = [l for l in content.splitlines() if not l.strip().startswith("```")]
        content = "\n".join(lines)
    print(f"[DEBUG] Raw LLM response:\n{content}")

    plan        = ""
    budget      = 0.0
    preferences: dict[str, str] = {}
    suggestion  = ""

    for line in content.splitlines():
        line = line.strip()
        if line.startswith("PRODUCTS:"):
            plan = line.replace("PRODUCTS:", "").strip()
        elif line.startswith("BUDGET:"):
            try:
                budget = float(line.replace("BUDGET:", "").strip())
            except ValueError:
                budget = 0.0
        elif line.startswith("PREFERENCES:"):
            raw_pref = line.replace("PREFERENCES:", "").strip()
            if raw_pref.lower() != "none":
                for pair in raw_pref.split(";"):
                    pair = pair.strip()
                    if "=" in pair:
                        cat, tier = pair.split("=", 1)
                        preferences[cat.strip()] = tier.strip().lower()
        elif line.startswith("SUGGESTION:"):
            raw = line.replace("SUGGESTION:", "").strip()
            suggestion = "" if raw.lower() == "none" else raw

    print(f"Plan:        {plan}")
    print(f"Budget:      ${budget}")
    print(f"Preferences: {preferences}")
    print(f"Suggestion:  {suggestion or 'none'}")

    raw_products   = await get_raw_products()
    budget_warn    = await _budget_warning(plan, budget, raw_products)

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