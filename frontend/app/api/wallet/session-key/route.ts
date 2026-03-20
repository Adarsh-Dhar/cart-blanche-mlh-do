import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/wallet/session-key  – create or update a SmartWallet record
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
    } = body;

    const required = {
      smartWalletAddress,
      sessionKeyPublic,
      sessionKeyEncryptedPrivate,
      spendLimitUsdc,
      expiresAt,
      ownerEoa,
    };
    const missing = Object.entries(required)
      .filter(([, v]) => v === undefined || v === null || v === '')
      .map(([k]) => k);

    if (missing.length) {
      return NextResponse.json(
        { error: `Missing required fields: ${missing.join(', ')}` },
        { status: 400 },
      );
    }

    const expiresAtDate = new Date(expiresAt);
    if (isNaN(expiresAtDate.getTime())) {
      return NextResponse.json({ error: 'expiresAt must be a valid ISO date string' }, { status: 400 });
    }

    const ownerEoaLower = ownerEoa.toLowerCase();

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
        ownerEoa: ownerEoaLower,
        smartWalletAddress,
        sessionKeyPublic,
        sessionKeyEncryptedPrivate,
        spendLimitUsdc,
        expiresAt: expiresAtDate,
        ...(chatId       && { chatId }),
        ...(fundingAsset && { fundingAsset }),
      },
    });

    // Never return the encrypted private key
    const { sessionKeyEncryptedPrivate: _stripped, ...safe } = wallet;
    return NextResponse.json({ data: safe }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/wallet/session-key]', error);
    return NextResponse.json({ error: 'Failed to save session key' }, { status: 500 });
  }
}

// GET /api/wallet/session-key  – fetch active session for ownerEoa / chatId
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ownerEoa = searchParams.get('ownerEoa');
    const chatId   = searchParams.get('chatId');

    const where: Record<string, unknown> = {
      expiresAt: { gt: new Date() },
    };
    if (ownerEoa) where.ownerEoa = ownerEoa.toLowerCase();
    if (chatId)   where.chatId   = chatId;

    const wallet = await (prisma as any).smartWallet.findFirst({
      where,
      orderBy: { createdAt: 'desc' },
    });

    if (!wallet) return NextResponse.json({ data: null }, { status: 200 });

    const { sessionKeyEncryptedPrivate: _stripped, ...safe } = wallet;
    return NextResponse.json({ data: safe });
  } catch (error) {
    console.error('[GET /api/wallet/session-key]', error);
    return NextResponse.json({ error: 'Failed to fetch session key' }, { status: 500 });
  }
}