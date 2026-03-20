import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { $Enums } from '@/lib/generated/prisma/client';

type Params = { params: Promise<{ id: string }> };

const VALID_STATUSES  = Object.values($Enums.OrderStatus);
const STATUS_TRANSITIONS: Record<$Enums.OrderStatus, $Enums.OrderStatus[]> = {
  PENDING:    [$Enums.OrderStatus.PROCESSING, $Enums.OrderStatus.CANCELLED],
  PROCESSING: [$Enums.OrderStatus.PAID,       $Enums.OrderStatus.CANCELLED],
  PAID:       [$Enums.OrderStatus.SHIPPED,    $Enums.OrderStatus.CANCELLED],
  SHIPPED:    [$Enums.OrderStatus.DELIVERED],
  DELIVERED:  [],
  CANCELLED:  [],
};

// GET /api/orders/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: {
              include: {
                vendor:   { select: { id: true, name: true, logoUrl: true } },
                category: { select: { id: true, name: true } },
              },
            },
            vendor: true,
          },
        },
      },
    });

    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    return NextResponse.json({ data: order });
  } catch (error) {
    console.error('[GET /api/orders/[id]]', error);
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 });
  }
}

// PUT /api/orders/[id]  – update status / txHash / userWallet
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { id }               = await params;
    const body                 = await request.json();
    const { status, txHash, userWallet } = body;

    const existing = await prisma.order.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    if (status !== undefined) {
      if (!VALID_STATUSES.includes(status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
          { status: 400 },
        );
      }
      const allowed = STATUS_TRANSITIONS[existing.status as $Enums.OrderStatus] ?? [];
      if (status !== existing.status && !allowed.includes(status)) {
        return NextResponse.json(
          {
            error: `Cannot transition from ${existing.status} to ${status}. Allowed: ${
              allowed.length ? allowed.join(', ') : 'none'
            }`,
          },
          { status: 400 },
        );
      }
    }

    if (txHash && existing.txHash && txHash !== existing.txHash) {
      return NextResponse.json(
        { error: 'Transaction hash is already set and cannot be changed' },
        { status: 409 },
      );
    }

    const order = await prisma.order.update({
      where: { id },
      data: {
        ...(status     !== undefined && { status }),
        ...(txHash     !== undefined && { txHash }),
        ...(userWallet !== undefined && { userWallet }),
      },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true } },
            vendor:  { select: { id: true, name: true } },
          },
        },
      },
    });

    return NextResponse.json({ data: order });
  } catch (error) {
    console.error('[PUT /api/orders/[id]]', error);
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}

// DELETE /api/orders/[id]  – only PENDING or CANCELLED
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    const existing = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!existing) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    const deletable = [$Enums.OrderStatus.PENDING, $Enums.OrderStatus.CANCELLED];
    if (!deletable.includes(existing.status as any)) {
      return NextResponse.json(
        { error: `Only PENDING or CANCELLED orders can be deleted. Current status: ${existing.status}` },
        { status: 409 },
      );
    }

    await prisma.$transaction(async (tx) => {
      if (existing.status === $Enums.OrderStatus.PENDING) {
        for (const item of existing.items) {
          await tx.product.update({
            where: { id: item.productId },
            data:  { stockQuantity: { increment: item.quantity } },
          });
        }
      }
      await tx.orderItem.deleteMany({ where: { orderId: id } });
      await tx.order.delete({ where: { id } });
    });

    return NextResponse.json({ message: 'Order deleted successfully' });
  } catch (error) {
    console.error('[DELETE /api/orders/[id]]', error);
    return NextResponse.json({ error: 'Failed to delete order' }, { status: 500 });
  }
}