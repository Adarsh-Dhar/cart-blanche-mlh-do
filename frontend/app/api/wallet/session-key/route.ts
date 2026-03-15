/**
 * app/api/wallet/session-key/route.ts
 * ────────────────────────────────────────────────────────────────────────────
 * POST /api/wallet/session-key
 *   Called by the frontend after the user registers a session key on-chain.
 *   Saves the SmartWallet record (including the encrypted session key private
 *   half) to Prisma.
 *
 * GET /api/wallet/session-key
 *   Returns the active SmartWallet record for the current EOA (if any, and
 *   not yet expired).  Used by the frontend to show/hide the "already active"
 *   banner and by the backend agent to check authorisation before settling.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ── POST — save / upsert a new session key registration ──────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      smartWalletAddress,
      sessionKeyPublic,
      sessionKeyEncryptedPrivate,
      spendLimitUsdc,
      expiresAt,
      ownerEoa,
      chatId,
    } = body as {
      smartWalletAddress: string;
      sessionKeyPublic: string;
      sessionKeyEncryptedPrivate: string;
      spendLimitUsdc: number;
      expiresAt: string;       // ISO string
      ownerEoa: string;
      chatId?: string;
    };

    if (
      !smartWalletAddress ||
      !sessionKeyPublic ||
      !sessionKeyEncryptedPrivate ||
      !spendLimitUsdc ||
      !expiresAt ||
      !ownerEoa
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Upsert: one SmartWallet record per ownerEoa
    const wallet = await (prisma as any).smartWallet.upsert({
      where: { ownerEoa: ownerEoa.toLowerCase() },
      update: {
        smartWalletAddress,
        sessionKeyPublic,
        sessionKeyEncryptedPrivate,
        spendLimitUsdc,
        expiresAt: new Date(expiresAt),
        ...(chatId && { chatId }),
      },
      create: {
        ownerEoa: ownerEoa.toLowerCase(),
        smartWalletAddress,
        sessionKeyPublic,
        sessionKeyEncryptedPrivate,
        spendLimitUsdc,
        expiresAt: new Date(expiresAt),
        ...(chatId && { chatId }),
      },
    });

    return NextResponse.json({ data: wallet }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/wallet/session-key]", error);
    return NextResponse.json(
      { error: "Failed to save session key" },
      { status: 500 }
    );
  }
}

// ── GET — fetch the active session key for a given ownerEoa ──────────────────
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ownerEoa = searchParams.get("ownerEoa");

    const where = ownerEoa
      ? { ownerEoa: ownerEoa.toLowerCase(), expiresAt: { gt: new Date() } }
      : { expiresAt: { gt: new Date() } };

    const wallet = await (prisma as any).smartWallet.findFirst({
      where,
      orderBy: { createdAt: "desc" },
    });

    if (!wallet) {
      return NextResponse.json({ data: null }, { status: 200 });
    }

    // Never return the encrypted private key to the frontend
    const { sessionKeyEncryptedPrivate: _stripped, ...safe } = wallet;
    return NextResponse.json({ data: safe });
  } catch (error) {
    console.error("[GET /api/wallet/session-key]", error);
    return NextResponse.json(
      { error: "Failed to fetch session key" },
      { status: 500 }
    );
  }
}