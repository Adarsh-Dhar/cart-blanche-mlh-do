// app/api/chats/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type Params = { params: Promise<{ id: string }> };

// GET /api/chats/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    const chat = await prisma.chat.findUnique({
      where: { id },
      include: {
        userRequests:   { orderBy: { timestamp: 'asc' } },
        agentResponses: { orderBy: { timestamp: 'asc' } },
      },
    });

    if (!chat) return NextResponse.json({ error: 'Chat not found' }, { status: 404 });

    // Build interleaved timeline
    const timeline = [
      ...chat.userRequests.map((r) => ({
        role:             'user' as const,
        id:               r.id,
        type:             r.type,
        text:             r.text,
        timestamp:        r.timestamp,
        linkedResponseId: r.agentResponseId ?? null,
      })),
      ...chat.agentResponses.map((r) => ({
        role:            'agent' as const,
        id:              r.id,
        type:            r.type,
        text:            r.text,
        timestamp:       r.timestamp,
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
    console.error('[GET /api/chats/[id]]', error);
    return NextResponse.json({ error: 'Failed to fetch chat' }, { status: 500 });
  }
}

// DELETE /api/chats/[id]
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    const existing = await prisma.chat.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Chat not found' }, { status: 404 });

    // Unlink 1:1 FK before cascade-deleting children
    await prisma.userRequest.updateMany({
      where: { chatId: id },
      data:  { agentResponseId: null },
    });

    await prisma.$transaction([
      prisma.agentResponse.deleteMany({ where: { chatId: id } }),
      prisma.userRequest.deleteMany(  { where: { chatId: id } }),
      prisma.chat.delete(             { where: { id } }),
    ]);

    return NextResponse.json({ message: 'Chat deleted successfully' });
  } catch (error) {
    console.error('[DELETE /api/chats/[id]]', error);
    return NextResponse.json({ error: 'Failed to delete chat' }, { status: 500 });
  }
}