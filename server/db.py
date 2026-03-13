"""
db.py — Prisma async client singleton
======================================
Provides a single shared `prisma` instance used by all tool files.
DATABASE_URL must be set in the environment before this module is imported
(main.py calls load_dotenv() before any local imports).
"""

from __future__ import annotations

import atexit
import asyncio
import logging

from prisma import Prisma

logger = logging.getLogger(__name__)

# Module-level singleton — one connection for the lifetime of the process
prisma = Prisma()


async def get_db() -> Prisma:
    """Return the connected Prisma client, connecting lazily on first call."""
    if not prisma.is_connected():
        await prisma.connect()
        logger.info("[DB] Prisma connected.")
    return prisma


def _sync_disconnect() -> None:
    """Best-effort disconnect called by atexit (handles both sync and async loops)."""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            loop.create_task(prisma.disconnect())
        elif not loop.is_closed():
            loop.run_until_complete(prisma.disconnect())
        logger.info("[DB] Prisma disconnected.")
    except Exception as exc:
        logger.warning("[DB] Disconnect warning: %s", exc)


atexit.register(_sync_disconnect)