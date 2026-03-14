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

    // agentMessage.text can be empty when the agent sends a pure JSON payload
    // (e.g. product_list or cart_mandate) with no surrounding prose
    if (!userMessage?.text) {
      return NextResponse.json(
        { error: "userMessage.text is required" },
        { status: 400 }
      );
    }
    if (agentMessage === undefined || agentMessage === null) {
      return NextResponse.json(
        { error: "agentMessage is required" },
        { status: 400 }
      );
    }

    const chat = await prisma.chat.findUnique({ where: { id: chatId } });
    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    // Capture explicit timestamps so user is always strictly before agent
    const userTimestamp  = new Date();
    const agentTimestamp = new Date(userTimestamp.getTime() + 1); // +1 ms

    // 1. Create the UserRequest first (so its timestamp is earlier)
    const userRequest = await prisma.userRequest.create({
      data: {
        type:      userMessage.type ?? "TEXT",
        text:      userMessage.text,
        chatId,
        timestamp: userTimestamp,
      },
    });

    // 2. Create the AgentResponse, linking back to the UserRequest
    const agentResponse = await prisma.agentResponse.create({
      data: {
        type:          agentMessage.type ?? "TEXT",
        text:          agentMessage.text ?? "",
        chatId,
        timestamp:     agentTimestamp,
        userRequestId: userRequest.id,
      },
    });

    // 3. Back-link the UserRequest to the AgentResponse
    await prisma.userRequest.update({
      where: { id: userRequest.id },
      data:  { agentResponseId: agentResponse.id },
    });

    return NextResponse.json({ data: { userRequest, agentResponse } }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/chats/[id]/messages]", error);
    return NextResponse.json({ error: "Failed to save message" }, { status: 500 });
  }
}