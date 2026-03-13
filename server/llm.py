"""
llm.py — Shared LLM instance (GitHub Models / GPT-4o-mini)
============================================================
Import this anywhere you need the LLM:

    from .llm import llm
    response = await llm.ainvoke([...])

Requires GITHUB_TOKEN in environment. main.py loads .env before any
local imports so this module always sees the correct value.

NOTE: `api_key` and `base_url` are the correct kwargs for
langchain-openai ≥ 0.1.  The old `openai_api_key` / `openai_api_base`
aliases are deprecated and emit warnings in recent versions.
"""

from __future__ import annotations

import os

from langchain_openai import ChatOpenAI

llm = ChatOpenAI(
    model=os.environ.get("GITHUB_MODEL_NAME", "gpt-4o-mini"),
    api_key=os.environ.get("GITHUB_TOKEN", ""),          # NOT openai_api_key
    base_url="https://models.inference.ai.azure.com",    # NOT openai_api_base
    temperature=0.0,   # maximum determinism for structured extraction
)