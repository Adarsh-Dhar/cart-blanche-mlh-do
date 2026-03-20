import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type Params = { params: Promise<{ id: string }> };

// POST /api/chats/[id]/messages
// Saves one user+agent turn atomically.
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id: chatId } = await params;
    const body           = await request.json();

    const {
      userMessage,
      agentMessage,
    } = body as {
      userMessage:  { type?: string; text: string };
      agentMessage: { type?: string; text?: string; agentName?: string };
    };

    if (!userMessage?.text?.trim()) {
      return NextResponse.json({ error: 'userMessage.text is required' }, { status: 400 });
    }
    if (!agentMessage) {
      return NextResponse.json({ error: 'agentMessage is required' }, { status: 400 });
    }

    const chat = await prisma.chat.findUnique({ where: { id: chatId } });
    if (!chat) return NextResponse.json({ error: 'Chat not found' }, { status: 404 });

    const userTs  = new Date();
    const agentTs = new Date(userTs.getTime() + 1); // +1ms so agent is strictly after user

    const userRequest = await prisma.userRequest.create({
      data: {
        type:      userMessage.type  ?? 'TEXT',
        text:      userMessage.text.trim(),
        chatId,
        timestamp: userTs,
      },
    });

    const agentResponse = await prisma.agentResponse.create({
      data: {
        type:          agentMessage.type ?? 'TEXT',
        text:          agentMessage.text ?? '',
        chatId,
        timestamp:     agentTs,
        userRequestId: userRequest.id,
      },
    });

    // Back-link userRequest → agentResponse
    await prisma.userRequest.update({
      where: { id: userRequest.id },
      data:  { agentResponseId: agentResponse.id },
    });

    return NextResponse.json({ data: { userRequest, agentResponse } }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/chats/[id]/messages]', error);
    return NextResponse.json({ error: 'Failed to save message' }, { status: 500 });
  }
}