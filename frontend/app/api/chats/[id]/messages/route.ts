import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

// POST /api/chats/[id]/messages - save one user+agent turn
// Body: {
//   userMessage:  { type: string; text: string }
//   agentMessage: { type: string; text: string; agentName?: string }
// }
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id: chatId } = await params;
    const body = await request.json();
    const { userMessage, agentMessage } = body as {
      userMessage:  { type: string; text: string };
      agentMessage: { type: string; text: string; agentName?: string };
    };

    if (!userMessage?.text || !agentMessage?.text) {
      return NextResponse.json(
        { error: "Both userMessage and agentMessage (with text) are required" },
        { status: 400 }
      );
    }

    const chat = await prisma.chat.findUnique({ where: { id: chatId } });
    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    // 1. Create the AgentResponse first (no FK to UserRequest yet)
    const agentResponse = await prisma.agentResponse.create({
      data: {
        type:   agentMessage.type   ?? "TEXT",
        text:   agentMessage.text,
        chatId,
      },
    });

    // 2. Create the UserRequest, linking to the AgentResponse
    const userRequest = await prisma.userRequest.create({
      data: {
        type:            userMessage.type ?? "TEXT",
        text:            userMessage.text,
        chatId,
        agentResponseId: agentResponse.id,
      },
    });

    // 3. Back-link the AgentResponse to the UserRequest
    await prisma.agentResponse.update({
      where: { id: agentResponse.id },
      data:  { userRequestId: userRequest.id },
    });

    return NextResponse.json({ data: { userRequest, agentResponse } }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/chats/[id]/messages]", error);
    return NextResponse.json({ error: "Failed to save message" }, { status: 500 });
  }
}