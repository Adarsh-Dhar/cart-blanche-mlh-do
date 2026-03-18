/**
 * app/api/wallet/session-key/route.ts
 * ──────────────────────────────────────────────────────────────────────────────
 * POST /api/wallet/session-key
 *   Saves / upserts a SmartWallet record (burner wallet + encrypted session key).
 *
 * GET /api/wallet/session-key
 *   Returns the active SmartWallet record for the current ownerEoa (if any).
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ── POST — save / upsert a new session key registration ───────────────────────
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
      fundingAsset,
    } = body as {
      smartWalletAddress:         string;
      sessionKeyPublic:           string;
      sessionKeyEncryptedPrivate: string;
      spendLimitUsdc:             number;
      expiresAt:                  string;   // ISO string
      ownerEoa:                   string;
      chatId?:                    string;
      fundingAsset?:              string;
    };

    if (
      !smartWalletAddress ||
      !sessionKeyPublic   ||
      !sessionKeyEncryptedPrivate ||
      !spendLimitUsdc     ||
      !expiresAt          ||
      !ownerEoa
    ) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const ownerEoaLower = ownerEoa.toLowerCase();
    const expiresAtDate = new Date(expiresAt);

    // Build data payload — only include optional fields when present
    const data: Record<string, unknown> = {
      smartWalletAddress,
      sessionKeyPublic,
      sessionKeyEncryptedPrivate,
      spendLimitUsdc,
      expiresAt:   expiresAtDate,
      ownerEoa:    ownerEoaLower,
    };
    if (chatId)       data.chatId       = chatId;
    if (fundingAsset) data.fundingAsset = fundingAsset;

    // Prisma upsert: update if ownerEoa already exists, create otherwise
    const wallet = await (prisma as any).smartWallet.upsert({
      where:  { ownerEoa: ownerEoaLower },
      update: {
        smartWalletAddress,
        sessionKeyPublic,
        sessionKeyEncryptedPrivate,
        spendLimitUsdc,
        expiresAt: expiresAtDate,
        ...(chatId       && { chatId }),
        ...(fundingAsset && { fundingAsset }),
      },
      create: {
        ownerEoa:    ownerEoaLower,
        smartWalletAddress,
        sessionKeyPublic,
        sessionKeyEncryptedPrivate,
        spendLimitUsdc,
        expiresAt: expiresAtDate,
        ...(chatId       && { chatId }),
        ...(fundingAsset && { fundingAsset }),
      },
    });

    // Never return the encrypted private key to the frontend
    const { sessionKeyEncryptedPrivate: _stripped, ...safe } = wallet;
    return NextResponse.json({ data: safe }, { status: 201 });

  } catch (error) {
    console.error("[POST /api/wallet/session-key]", error);
    return NextResponse.json({ error: "Failed to save session key" }, { status: 500 });
  }
}

// ── GET — fetch the active session key for a given ownerEoa ───────────────────
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ownerEoa = searchParams.get("ownerEoa");
    const chatId   = searchParams.get("chatId");

    // Build where clause: always filter out expired sessions
    const where: Record<string, unknown> = {
      expiresAt: { gt: new Date() },
    };
    if (ownerEoa) where.ownerEoa = ownerEoa.toLowerCase();
    if (chatId)   where.chatId   = chatId;

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
    return NextResponse.json({ error: "Failed to fetch session key" }, { status: 500 });
  }
}