import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@/lib/generated/prisma/client';

type Params = { params: Promise<{ id: string }> };

// GET /api/order-items/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    const item = await prisma.orderItem.findUnique({
      where: { id },
      include: {
        product: {
          include: { category: { select: { id: true, name: true } } },
        },
        vendor: true,
        order:  { select: { id: true, status: true, totalAmount: true, createdAt: true } },
      },
    });

    if (!item) return NextResponse.json({ error: 'Order item not found' }, { status: 404 });

    return NextResponse.json({ data: item });
  } catch (error) {
    console.error('[GET /api/order-items/[id]]', error);
    return NextResponse.json({ error: 'Failed to fetch order item' }, { status: 500 });
  }
}

// PUT /api/order-items/[id]  – change quantity (PENDING orders only)
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { id }     = await params;
    const body       = await request.json();
    const { quantity } = body;

    if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 1) {
      return NextResponse.json({ error: 'quantity must be a positive integer' }, { status: 400 });
    }

    const existing = await prisma.orderItem.findUnique({
      where: { id },
      include: { order: true, product: true },
    });

    if (!existing) return NextResponse.json({ error: 'Order item not found' }, { status: 404 });

    if (existing.order.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Order items can only be modified on PENDING orders' },
        { status: 409 },
      );
    }

    const diff = quantity - existing.quantity;
    if (diff > 0 && existing.product.stockQuantity < diff) {
      return NextResponse.json(
        { error: `Insufficient stock. Need ${diff} more, only ${existing.product.stockQuantity} available` },
        { status: 409 },
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (diff !== 0) {
        await tx.product.update({
          where: { id: existing.productId },
          data:  { stockQuantity: { decrement: diff } },
        });
      }

      const newLine = existing.product.price.mul(quantity);
      const oldLine = existing.price.mul(existing.quantity);
      const delta   = newLine.sub(oldLine);

      if (!delta.isZero()) {
        await tx.order.update({
          where: { id: existing.orderId },
          data:  { totalAmount: { increment: delta as unknown as Prisma.Decimal } },
        });
      }

      return tx.orderItem.update({
        where: { id },
        data:  { quantity },
        include: {
          product: { select: { id: true, name: true } },
          order:   { select: { id: true, status: true, totalAmount: true } },
        },
      });
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('[PUT /api/order-items/[id]]', error);
    return NextResponse.json({ error: 'Failed to update order item' }, { status: 500 });
  }
}

// DELETE /api/order-items/[id]  – remove from PENDING order (not the last item)
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    const existing = await prisma.orderItem.findUnique({
      where: { id },
      include: {
        order:   { include: { _count: { select: { items: true } } } },
        product: true,
      },
    });

    if (!existing) return NextResponse.json({ error: 'Order item not found' }, { status: 404 });

    if (existing.order.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Order items can only be removed from PENDING orders' },
        { status: 409 },
      );
    }

    if (existing.order._count.items === 1) {
      return NextResponse.json(
        { error: 'Cannot remove the last item from an order. Delete the order instead.' },
        { status: 409 },
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: existing.productId },
        data:  { stockQuantity: { increment: existing.quantity } },
      });

      const line = existing.price.mul(existing.quantity);
      await tx.order.update({
        where: { id: existing.orderId },
        data:  { totalAmount: { decrement: line as unknown as Prisma.Decimal } },
      });

      await tx.orderItem.delete({ where: { id } });
    });

    return NextResponse.json({ message: 'Order item removed successfully' });
  } catch (error) {
    console.error('[DELETE /api/order-items/[id]]', error);
    return NextResponse.json({ error: 'Failed to delete order item' }, { status: 500 });
  }
}