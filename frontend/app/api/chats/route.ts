import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/chats - list all chat sessions, newest first
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page  = parseInt(searchParams.get("page")  ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "20");
    const skip  = (page - 1) * limit;

    const [chats, total] = await prisma.$transaction([
      prisma.chat.findMany({
        skip,
        take: limit,
        orderBy: { startTime: "desc" },
        include: {
          _count: { select: { userRequests: true, agentResponses: true } },
          userRequests: {
            take: 1,
            orderBy: { timestamp: "asc" },
            select: { id: true, type: true, text: true, timestamp: true },
          },
        },
      }),
      prisma.chat.count(),
    ]);

    return NextResponse.json({
      data: chats,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("[GET /api/chats]", error);
    return NextResponse.json({ error: "Failed to fetch chats" }, { status: 500 });
  }
}

// POST /api/chats - create or idempotently fetch a chat session
// Body: { id? } — if id is provided, upsert that specific chat
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { id } = body as { id?: string };

    if (id) {
      // Idempotent: find existing or create with the given id
      const existing = await prisma.chat.findUnique({ where: { id } });
      if (existing) {
        return NextResponse.json({ data: existing }, { status: 200 });
      }
      const chat = await prisma.chat.create({ data: { id } });
      return NextResponse.json({ data: chat }, { status: 201 });
    }

    // No id supplied — create a fresh chat with an auto-generated cuid
    const chat = await prisma.chat.create({ data: {} });
    return NextResponse.json({ data: chat }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/chats]", error);
    return NextResponse.json({ error: "Failed to create chat" }, { status: 500 });
  }
}