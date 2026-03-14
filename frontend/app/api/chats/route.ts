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
          // Include the first user request text as a preview
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