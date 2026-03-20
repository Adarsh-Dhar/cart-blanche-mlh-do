"""
agents/orchestrator.py — Lead Orchestrator (v6)
================================================
Fully dynamic catalog awareness with Semantic Brainstorm RAG.
Prevents HTTP 413 Payload Too Large by dynamically predicting keywords
and aggressively dropping irrelevant items.
"""

from __future__ import annotations
import logging
import json
import re

from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from server.llm   import llm
from server.state import AgentState
from server.db    import get_db
from .catalog     import get_raw_products

# Try to load exact token counter, fallback to heuristic if not installed
try:
    import tiktoken
    _encoder = tiktoken.get_encoding("cl100k_base")
    def count_tokens(text: str) -> int:
        return len(_encoder.encode(text))
    EXACT_TOKENS = True
except ImportError:
    def count_tokens(text: str) -> int:
        return len(text) // 4  # Standard OpenAI heuristic (1 token ≈ 4 chars)
    EXACT_TOKENS = False

logger = logging.getLogger(__name__)


_PERSONA_SCENARIOS = """
=== KNOWN USER PERSONAS — use as intent templates ===

PERSONA: Content Creator / Streamer / Podcaster
  Signals: "youtube", "twitch", "podcast", "stream", "setup", "video"
  Workflow: Podcast production kit → motion title pack → foley SFX → cinematic LUTs

PERSONA: Game Developer
  Signals: "Unreal", "Unity", "Godot", "game dev", "blueprints", "multiplayer", "level design"
  Workflow: UE5 Blueprint library → Game SFX bundle → 3D environment pack → multiplayer template

PERSONA: AI Researcher / ML Engineer
  Signals: "LLM", "GPT-4", "Claude", "Gemini", "fine-tune", "RAG", "vector DB", "inference"
  Workflow: GPT-4/Claude voucher → Managed Vector DB → Fine-tuning job → H100 GPU cluster

PERSONA: Full-Stack / Indie Hacker / Startup
  Signals: "startup", "MVP", "saas", "full stack", "launch", "boilerplate", "nextjs"
  Workflow: Next.js SaaS starter → Vercel Pro → Supabase Pro → Mixpanel Growth

PERSONA: DevOps / Cloud Engineer
  Signals: "DevOps", "Kubernetes", "K8s", "Docker", "CI/CD", "cloud", "Terraform", "AWS"
  Workflow: Managed Kubernetes → Terraform modules → Docker Pro → CKA/CKAD exam voucher

PERSONA: Cybersecurity Professional
  Signals: "pen test", "audit", "SOC2", "GDPR", "OWASP", "WAF", "Zero Trust"
  Workflow: Pen-test toolkit → VPN Pro → Cloud WAF → SOC2 prep kit

PERSONA: Data Engineer / Analyst
  Signals: "ETL", "data warehouse", "BI dashboard", "Snowflake", "BigQuery", "dbt"
  Workflow: Managed ETL pipeline → BI Dashboard Pro → dbt Cloud Dev → Reverse ETL

PERSONA: Marketing & SEO Specialist
  Signals: "SEO", "marketing", "social media", "email campaign", "landing page", "CRO"
  Workflow: SEO audit tool → Social media scheduler → Email template pack → AI ad copy

PERSONA: UX/UI Designer
  Signals: "figma", "wireframe", "brand kit", "design system", "UI kit"
  Workflow: Enterprise design system → Figma Pro → minimal icon set → variable fonts
"""

_INSTRUCTIONS = """
=== YOUR TASK ===
1. Read the live catalog above carefully.
2. Match the user's request to specific products using their exact names.
3. DECOMPOSITION RULE: If the user asks for a "setup", "kit", "bundle", or abstract goal (e.g., "YouTube setup", "Starter pack"), DECOMPOSE it into 2-4 essential individual products from the catalog that fit the goal and budget.
4. For ANY product in the catalog you can reference them by name.
5. Use the persona templates as shortcuts for common workflows.
6. Suggest one complementary product the user didn't ask for if it clearly adds value.

=== OUTPUT FORMAT — CRITICAL ===
You MUST output EXACTLY these four lines and NOTHING else.
NO markdown. NO code fences. NO preamble. NO explanation. Just these four lines:

PRODUCTS: <semicolon-separated product names>
BUDGET: <USD number or 0>
PREFERENCES: <"Category=tier" pairs or "none">
SUGGESTION: <one sentence with product name + price, or "none">

=== EXAMPLES ===
User: "Buy me the H100 GPU Cluster and GPT-4 token proxy"
PRODUCTS: H100 GPU cluster; GPT-4 token voucher
BUDGET: 0
PREFERENCES: none
SUGGESTION: none

User: "Gaming YouTube channel setup under $100"
PRODUCTS: Podcast production kit; Motion title pack; Game sound effects
BUDGET: 100
PREFERENCES: none
SUGGESTION: Add a LUT pack ($15) to make your video colors pop.

User: "full stack dev setup with IDE and deployment"
PRODUCTS: JetBrains IDE; Vercel pro
BUDGET: 0
PREFERENCES: none
SUGGESTION: Add GitHub Pro ($48) to complete your development workflow.
"""

_AFFIRMATION_KEYWORDS = {
    "looks good", "confirm", "proceed", "yes", "ok", "approve",
    "go ahead", "do it", "buy it", "let's do it", "sounds good",
    "perfect", "great", "checkout", "purchase", "sure", "yep", "yup",
}

# Fast-path keyword map: list of trigger keywords → search_term
_PRODUCT_KEYWORD_MAP = [
    (["h100", "gpu cluster", "100 hour", "100h gpu"],      "H100 GPU cluster"),
    (["a100", "200 hour", "200h gpu"],                     "A100 GPU"),
    (["rtx 4090", "rtx4090", "50 hour gpu"],               "RTX 4090"),
    (["cloud storage", "object storage", "1tb storage"],   "cloud storage"),
    (["cdn", "bandwidth credit"],                          "CDN bandwidth"),
    (["vps", "virtual private server"],                    "VPS server"),
    (["etl pipeline", "data pipeline"],                    "ETL pipeline"),
    (["bi dashboard", "dashboard builder"],                "BI dashboard"),
    (["gpt-4", "gpt4", "50m token", "200m token"],         "GPT-4 token voucher"),
    (["claude api", "claude voucher", "100m token"],       "Claude API voucher"),
    (["fine-tun", "finetun"],                              "LLM fine-tuning"),
    (["image gen", "stable diffusion", "flux"],            "image generation credits"),
    (["prompt pack", "prompt engineer"],                   "prompt engineering pack"),
    (["vector db", "vector database", "pinecone", "rag"],  "vector database"),
    (["tts", "text-to-speech", "voice synth"],             "TTS credit"),
    (["neon cyber", "neon-cyber", "figma kit"],            "neon cyber UI kit"),
    (["saas dashboard ui", "admin template"],              "SaaS dashboard UI kit"),
    (["ios component", "swiftui"],                         "iOS component library"),
    (["icon pack", "svg icon"],                            "icon pack"),
    (["sci-fi 3d", "scifi pack", "unreal pack"],           "sci-fi 3D pack"),
    (["fantasy rpg", "dungeon pack"],                      "fantasy RPG pack"),
    (["after effect", "motion title"],                     "motion title pack"),
    (["stock photo"],                                      "stock photos"),
    (["lut pack", "colour grad", "davinci lut"],           "LUT pack"),
    (["cinematic audio", "ambient audio"],                 "cinematic ambient audio"),
    (["game sfx", "sound effect", "game audio"],           "game sound effects"),
    (["music library", "royalty-free music"],              "royalty-free music library"),
    (["podcast kit", "podcast jingle"],                    "podcast production kit"),
    (["jetbrain", "intellij", "webstorm", "pycharm"],      "JetBrains IDE"),
    (["vscode extension", "vs code extension", "gitlens"], "VS Code extensions"),
    (["postman"],                                          "Postman team plan"),
    (["datagrip", "database ide"],                         "DataGrip"),
    (["docker pro", "docker subscription"],                "Docker Pro"),
    (["github pro"],                                       "GitHub Pro"),
    (["ai coding assistant", "copilot pro"],               "AI coding assistant"),
    (["vercel pro", "vercel credit"],                      "Vercel Pro"),
    (["notion team", "notion plan"],                       "Notion team"),
    (["figma pro", "figma professional"],                  "Figma Professional"),
    (["mixpanel"],                                         "Mixpanel Growth"),
    (["sendgrid", "transactional email plan"],             "SendGrid Essentials"),
    (["aws cert", "aws solutions architect"],              "AWS voucher"),
    (["gcp cert", "google cloud cert"],                    "GCP voucher"),
    (["azure cert", "az-900"],                             "Azure fundamentals"),
    (["cka", "kubernetes cert"],                           "CKA voucher"),
    (["udemy bundle", "100 course"],                       "Udemy bundle"),
    (["full-stack bootcamp", "fullstack bootcamp"],        "full-stack bootcamp"),
    (["ml bootcamp", "ml engineering bootcamp"],           "ML engineering bootcamp"),
    (["unity asset bundle", "unity mega bundle"],          "Unity asset bundle"),
    (["game dev course", "unreal course"],                 "game dev course bundle"),
    (["vpn pro", "enterprise vpn"],                        "VPN Pro"),
    (["burp suite", "pen test kit", "penetration test"],   "pen testing toolkit"),
    (["security audit", "owasp checklist"],                "security audit bundle"),
    (["wildcard ssl", "ssl cert"],                         "SSL certificate"),
    (["password manager"],                                 "team password manager"),
    (["font collection", "premium font"],                  "font collection"),
    (["brand kit", "brand identity kit"],                  "brand identity kit"),
    (["print template"],                                   "print template pack"),
    (["seo audit", "rank tracker"],                        "SEO audit tool"),
    (["social scheduler", "social media plan"],            "social media scheduler"),
    (["email marketing template", "newsletter template"],  "email marketing templates"),
]

def _keyword_fallback(query: str) -> str:
    q = query.lower()
    slots: list[str] = []
    seen: set[str] = set()
    for keywords, search_term in _PRODUCT_KEYWORD_MAP:
        if any(kw in q for kw in keywords):
            if search_term not in seen:
                seen.add(search_term)
                slots.append(search_term)
    return "; ".join(slots)

def _extract_budget(query: str) -> float:
    patterns = [
        r"under\s*\$?([\d,]+)", r"budget\s*(?:of\s*)?\$?([\d,]+)",
        r"\$?([\d,]+)\s*budget", r"less\s+than\s*\$?([\d,]+)",
        r"no\s+more\s+than\s*\$?([\d,]+)", r"max(?:imum)?\s*\$?([\d,]+)",
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
    plan = ""
    budget = 0.0
    preferences: dict[str, str] = {}
    suggestion = ""
    cleaned = _clean_llm_output(content)
    
    for line in cleaned.splitlines():
        line = line.replace("**", "").replace("*", "").strip()
        if not line: continue
        upper = line.upper()

        if upper.startswith("PRODUCTS:"):
            plan = line[len("PRODUCTS:"):].strip()
        elif upper.startswith("BUDGET:"):
            raw = line[len("BUDGET:"):].strip()
            nums = re.findall(r"[\d]+\.?\d*", raw.replace(",", ""))
            if nums:
                try: budget = float(nums[0])
                except ValueError: pass
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
    chat_id = state.get("chat_id")
    user_request_id = state.get("user_request_id")
    if not chat_id: return None
    try:
        db = await get_db()
        resp = await db.agentresponse.create(data={
            "type": rtype, "text": text, "chatId": chat_id,
            **({"userRequestId": user_request_id} if user_request_id else {}),
        })
        if user_request_id:
            await db.userrequest.update(where={"id": user_request_id}, data={"agentResponseId": resp.id})
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
    print("\n--- ORCHESTRATOR (v6 — Semantic Brainstorm RAG) ---")

    query = state.get("query")
    if not query:
        for msg in reversed(state.get("messages", [])):
            if isinstance(msg, HumanMessage) or getattr(msg, "type", "") == "human":
                query = msg.content
                break

    if not query:
        return {
            "messages": [AIMessage(content="I didn't receive a message. What are you looking for today?", name="Orchestrator")],
            "_orchestrated": True,
        }

    query_lower = query.lower().strip()
    is_affirmation = any(re.search(rf'\b{re.escape(k)}\b', query_lower) for k in _AFFIRMATION_KEYWORDS)

    if query_lower in _AFFIRMATION_KEYWORDS or is_affirmation:
        return {"_orchestrated": True, "_shopped": False}

    keyword_plan   = _keyword_fallback(query)
    keyword_budget = _extract_budget(query)
    print(f"[Orchestrator] Keyword fast-path: '{keyword_plan}'")

    # ════════════════════════════════════════════════════════════════════════
    # ── Step 2: Semantic Brainstorm RAG (The Bulletproof 8k Token Fix) ──────
    # ════════════════════════════════════════════════════════════════════════
    logger.info("=== [ORCHESTRATOR-ALGO] STARTING SEMANTIC RAG ===")
    
    raw_products = await get_raw_products()
    logger.info(f"[ORCHESTRATOR-ALGO] 1. DB Load: {len(raw_products)} total products.")
    
    # 2A. Brainstorm Search Terms
    _BRAINSTORM_PROMPT = """
    You are an intelligent search routing assistant. 
    Analyze the user's query and brainstorm 10-15 single-word search terms (nouns and verbs) that would likely appear in the names or descriptions of the products they need.
    Think about the individual components of their goal. 
    
    Example Query: "Gaming YouTube channel setup"
    Example Output: podcast, stream, audio, microphone, video, editing, sfx, music, title, creative, lighting, camera
    
    OUTPUT FORMAT: ONLY a comma-separated list of lowercase words.
    """
    
    brainstormed_words = []
    try:
        bs_resp = await llm.ainvoke([SystemMessage(content=_BRAINSTORM_PROMPT), HumanMessage(content=query)])
        content = bs_resp.content if isinstance(bs_resp.content, str) else str(bs_resp.content)
        brainstormed_words = [w.strip().lower() for w in content.split(",") if w.strip()]
        logger.info(f"[ORCHESTRATOR-ALGO] 2. LLM Brainstormed Keywords: {brainstormed_words}")
    except Exception as exc:
        logger.warning(f"[ORCHESTRATOR-ALGO] Brainstorming failed: {exc}")

    # 2B. Combine LLM words with User's direct words
    stop_words = {"a", "an", "the", "and", "or", "but", "if", "for", "with", "setup", "under", "budget", "of", "in", "to", "buy", "me", "i", "need", "some"}
    user_words = set(re.findall(r'\b[a-z0-9]+\b', query_lower)) - stop_words
    
    all_search_keywords = user_words.union(set(brainstormed_words))
    logger.info(f"[ORCHESTRATOR-ALGO] 3. Final Search Sieve: {all_search_keywords}")

    # 2C. Sieve the Catalog (DROP irrelevant items completely)
    catalog_lines = ["=== RELEVANT CATALOG ITEMS ==="]
    kept_count = 0
    dropped_count = 0

    for p in raw_products:
        name = p.get('name', 'Unknown')
        price = p.get('price', 0)
        desc = p.get('description', '')
        
        search_text = f"{name} {desc}".lower()
        
        # Does the product contain ANY of our semantic keywords?
        if any(kw in search_text for kw in all_search_keywords):
            # Keep it, and truncate description to save tokens
            short_desc = desc[:150] + "..." if len(desc) > 150 else desc
            catalog_lines.append(f"- {name} | ${price} | Desc: {short_desc}")
            kept_count += 1
        else:
            # Completely irrelevant product (e.g. VPS server during a music search). DROP IT.
            dropped_count += 1

    logger.info(f"[ORCHESTRATOR-ALGO] 4. Sieve Results: Kept {kept_count} highly relevant products. Dropped {dropped_count} completely.")
        
    catalog_block = "\n".join(catalog_lines)
    
    # Track Exact Tokens
    est_tokens = count_tokens(catalog_block)
    accuracy_msg = "(Exact Tiktoken)" if EXACT_TOKENS else "(Heuristic)"
    logger.info(f"[ORCHESTRATOR-ALGO] 5. Prompt Catalog Tokens: {est_tokens} {accuracy_msg}")
    
    # Emergency fallback just in case the sieve kept too much
    if est_tokens > 6500:
        logger.warning(f"[ORCHESTRATOR-ALGO] Tokens over safe limit ({est_tokens}). Applying emergency truncation to top 50 items.")
        catalog_lines = catalog_lines[:50]
        catalog_block = "\n".join(catalog_lines)
        est_tokens = count_tokens(catalog_block)
        logger.info(f"[ORCHESTRATOR-ALGO] 6. Post-Truncation Tokens: {est_tokens} {accuracy_msg}")

    logger.info("=== [ORCHESTRATOR-ALGO] END OF FILTERING ===")

    # 2D. Run the Main Orchestrator
    system_prompt = _build_system_prompt(catalog_block)

    llm_plan        = ""
    llm_budget      = 0.0
    llm_preferences: dict[str, str] = {}
    llm_suggestion  = ""

    try:
        # Load conversation history from state
        history = state.get("messages", [])
        prompt_msgs = [SystemMessage(content=system_prompt)]
        # Add the last 6 messages for context so it remembers the previous items!
        for msg in history[-6:]:
            if isinstance(msg, tuple):
                role, content = msg
                if role == "user":
                    prompt_msgs.append(HumanMessage(content=content))
                else:
                    prompt_msgs.append(AIMessage(content=content))
            elif isinstance(msg, HumanMessage) or isinstance(msg, AIMessage):
                prompt_msgs.append(msg)
        # Ensure the current query is the final message
        if not prompt_msgs or prompt_msgs[-1].content != query:
            prompt_msgs.append(HumanMessage(content=query))
        response = await llm.ainvoke(prompt_msgs)
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
                    "I'd love to help you build that! Since I don't have a pre-made bundle by that exact name, "
                    "could you tell me what specific types of items you're prioritizing right now? "
                    "Once I know what you need most, I can put together a custom list from the catalog."
                ),
                name="Orchestrator",
            )],
        }

    budget_warn  = ""
    if budget > 0 and raw_products:
        plan_lower = plan.lower()
        estimated  = sum(
            p.get("price", 0) for p in raw_products
            if any(w in plan_lower for w in p.get("name", "").lower().split() if len(w) > 3)
        )
        if estimated > budget * 1.15:
            budget_warn = (
                f"Your items may total ~${estimated:.0f}, "
                f"exceeding your ${budget:.0f} budget. "
                "I'll prioritise the best fit."
            )

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
        "messages":         [AIMessage(content="\n", name="Orchestrator")],
    }