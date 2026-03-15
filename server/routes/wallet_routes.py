"""
routes/wallet_routes.py — Smart Wallet & Session Key API endpoints
===================================================================
These routes are called by the Next.js frontend when the user:
  1. Registers a new session key after deploying / recharging their Smart Wallet
  2. Queries the current session status (for the in-chat banner)

Endpoints:
  POST /api/wallet/session-key   — Save a new SmartWallet + session key record
  GET  /api/wallet/session-key   — Fetch the active record for an EOA
  GET  /api/wallet/status        — Lightweight "has active session?" check

These are mounted under /api in main.py via:
    app.include_router(wallet_router, prefix="/api")
"""

from __future__ import annotations

import datetime
import logging
from typing import Any

from fastapi import APIRouter, Body, HTTPException
from pydantic import BaseModel

from ..db import get_db

logger = logging.getLogger(__name__)

wallet_router = APIRouter(tags=["wallet"])


# ── Request / Response schemas ────────────────────────────────────────────────

class SessionKeyRegistration(BaseModel):
    ownerEoa:                   str
    smartWalletAddress:         str
    sessionKeyPublic:           str
    sessionKeyEncryptedPrivate: str
    spendLimitUsdc:             float
    expiresAt:                  str    # ISO 8601 datetime string
    chatId:                     str | None = None


class SessionKeyResponse(BaseModel):
    id:                  str
    ownerEoa:            str
    smartWalletAddress:  str
    sessionKeyPublic:    str
    spendLimitUsdc:      float
    expiresAt:           str
    chatId:              str | None
    createdAt:           str


# ── POST /api/wallet/session-key ─────────────────────────────────────────────

@wallet_router.post("/wallet/session-key")
async def save_session_key(registration: SessionKeyRegistration):
    """
    Called by the frontend after on-chain session key registration completes.
    Upserts a SmartWallet record in Prisma keyed by ownerEoa.
    """
    try:
        db = await get_db()

        data = {
            "ownerEoa":                   registration.ownerEoa.lower(),
            "smartWalletAddress":         registration.smartWalletAddress,
            "sessionKeyPublic":           registration.sessionKeyPublic,
            "sessionKeyEncryptedPrivate": registration.sessionKeyEncryptedPrivate,
            "spendLimitUsdc":             registration.spendLimitUsdc,
            "expiresAt":                  datetime.datetime.fromisoformat(
                                              registration.expiresAt.replace("Z", "+00:00")
                                          ),
        }
        if registration.chatId:
            data["chatId"] = registration.chatId

        record = await db.smartwallet.upsert(
            where={"ownerEoa": registration.ownerEoa.lower()},
            data={"update": data, "create": data},
        )

        logger.info(
            "[WalletRoutes] Session key saved for EOA %s → smart wallet %s",
            registration.ownerEoa[:10], registration.smartWalletAddress[:10],
        )

        # Don't expose the encrypted private key in the response
        return {
            "status": "ok",
            "data": {
                "id":                 record.id,
                "ownerEoa":           record.ownerEoa,
                "smartWalletAddress": record.smartWalletAddress,
                "sessionKeyPublic":   record.sessionKeyPublic,
                "spendLimitUsdc":     record.spendLimitUsdc,
                "expiresAt":          record.expiresAt.isoformat(),
                "chatId":             record.chatId,
                "createdAt":          record.createdAt.isoformat(),
            },
        }

    except Exception as exc:
        logger.exception("[WalletRoutes] save_session_key error: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))


# ── GET /api/wallet/session-key ──────────────────────────────────────────────

@wallet_router.get("/wallet/session-key")
async def get_session_key(ownerEoa: str | None = None, chatId: str | None = None):
    """
    Return the active SmartWallet session key for the given EOA or chatId.
    Returns null data if no active (non-expired) session exists.
    """
    try:
        db = await get_db()
        now = datetime.datetime.utcnow()

        where: dict = {"expiresAt": {"gt": now}}
        if ownerEoa:
            where["ownerEoa"] = ownerEoa.lower()
        if chatId:
            where["chatId"] = chatId

        record = await db.smartwallet.find_first(
            where=where,
            order={"createdAt": "desc"},
        )

        if record is None:
            return {"data": None}

        return {
            "data": {
                "id":                 record.id,
                "ownerEoa":           record.ownerEoa,
                "smartWalletAddress": record.smartWalletAddress,
                "sessionKeyPublic":   record.sessionKeyPublic,
                "spendLimitUsdc":     record.spendLimitUsdc,
                "expiresAt":          record.expiresAt.isoformat(),
                "chatId":             record.chatId,
                "createdAt":          record.createdAt.isoformat(),
            }
        }

    except Exception as exc:
        logger.exception("[WalletRoutes] get_session_key error: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))


# ── GET /api/wallet/status ───────────────────────────────────────────────────

@wallet_router.get("/wallet/status")
async def wallet_status(chatId: str | None = None):
    """
    Lightweight check used by the frontend SmartWalletBanner.
    Returns { active: bool, expiresAt: str | null }
    """
    try:
        db = await get_db()
        now = datetime.datetime.utcnow()

        where: dict = {"expiresAt": {"gt": now}}
        if chatId:
            where["chatId"] = chatId

        record = await db.smartwallet.find_first(where=where)

        return {
            "active":    record is not None,
            "expiresAt": record.expiresAt.isoformat() if record else None,
            "spendLimitUsdc": record.spendLimitUsdc if record else None,
        }

    except Exception as exc:
        logger.exception("[WalletRoutes] wallet_status error: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))