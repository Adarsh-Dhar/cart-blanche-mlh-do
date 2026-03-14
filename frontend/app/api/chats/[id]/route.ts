import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// NOTE: params must be awaited in Next.js 15+ app router
type Params = { params: Promise<{ id: string }> };

// GET /api/chats/[id] - get a single chat session with all requests + responses
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const chat = await prisma.chat.findUnique({
      where: { id },
      include: {
        userRequests: {
          orderBy: { timestamp: "asc" },
        },
        agentResponses: {
          orderBy: { timestamp: "asc" },
        },
      },
    });

    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    // Build an interleaved timeline sorted by timestamp for easy rendering
    const timeline = [
      ...chat.userRequests.map((r: { id: any; type: any; text: any; timestamp: string | number | Date; agentResponseId: any; }) => ({
        role:      "user" as const,
        id:        r.id,
        type:      r.type,
        text:      r.text,
        timestamp: new Date(r.timestamp),
        linkedResponseId: r.agentResponseId ?? null,
      })),
      ...chat.agentResponses.map((r: { id: any; type: any; text: any; timestamp: string | number | Date; userRequestId: any; }) => ({
        role:      "agent" as const,
        id:        r.id,
        type:      r.type,
        text:      r.text,
        timestamp: new Date(r.timestamp),
        linkedRequestId: r.userRequestId ?? null,
      })),
    ].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    return NextResponse.json({
      data: {
        id:             chat.id,
        name:           chat.name,
        startTime:      chat.startTime,
        lastUpdated:    chat.lastUpdated,
        userRequests:   chat.userRequests,
        agentResponses: chat.agentResponses,
        timeline,
      },
    });
  } catch (error) {
    console.error("[GET /api/chats/[id]]", error);
    return NextResponse.json({ error: "Failed to fetch chat" }, { status: 500 });
  }
}

// DELETE /api/chats/[id] - delete a chat and all its messages
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const existing = await prisma.chat.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    // Must unlink 1:1 FK before deleting children
    await prisma.userRequest.updateMany({
      where: { chatId: id },
      data:  { agentResponseId: null },
    });
    await prisma.$transaction([
      prisma.agentResponse.deleteMany({ where: { chatId: id } }),
      prisma.userRequest.deleteMany({ where: { chatId: id } }),
      prisma.chat.delete({ where: { id } }),
    ]);

    return NextResponse.json({ message: "Chat deleted successfully" });
  } catch (error) {
    console.error("[DELETE /api/chats/[id]]", error);
    return NextResponse.json({ error: "Failed to delete chat" }, { status: 500 });
  }
}