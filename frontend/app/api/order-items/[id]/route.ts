import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Decimal } from "@prisma/client";

type Params = { params: Promise<{ id: string }> };

// GET /api/order-items/[id] - Get a single order item
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    const item = await prisma.orderItem.findUnique({
      where: { id },
      include: {
        product: {
          include: {
            category: { select: { id: true, name: true } },
          },
        },
        vendor: true,
        order: { select: { id: true, status: true, totalAmount: true, createdAt: true } },
      },
    });

    if (!item) {
      return NextResponse.json({ error: "Order item not found" }, { status: 404 });
    }

    return NextResponse.json({ data: item });
  } catch (error) {
    console.error("[GET /api/order-items/[id]]", error);
    return NextResponse.json({ error: "Failed to fetch order item" }, { status: 500 });
  }
}

// PUT /api/order-items/[id] - Update an order item quantity (only for PENDING orders)
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { quantity } = body;

    if (quantity === undefined || typeof quantity !== "number" || quantity < 1) {
      return NextResponse.json(
        { error: "quantity must be a number >= 1" },
        { status: 400 }
      );
    }

    const existing = await prisma.orderItem.findUnique({
      where: { id },
      include: {
        order: true,
        product: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Order item not found" }, { status: 404 });
    }

    if (existing.order.status !== "PENDING") {
      return NextResponse.json(
        { error: "Order items can only be modified on PENDING orders" },
        { status: 409 }
      );
    }

    const quantityDiff = quantity - existing.quantity; // positive = need more stock

    if (quantityDiff > 0 && existing.product.stockQuantity < quantityDiff) {
      return NextResponse.json(
        {
          error: `Insufficient stock. Requested additional: ${quantityDiff}, Available: ${existing.product.stockQuantity}`,
        },
        { status: 409 }
      );
    }

    const updatedItem = await prisma.$transaction(async (tx) => {
      // Adjust stock
      await tx.product.update({
        where: { id: existing.productId },
        data: { stockQuantity: { decrement: quantityDiff } },
      });

      // Update line item price
      const newLineTotal = existing.product.price.mul(quantity);
      const oldLineTotal = existing.price.mul(existing.quantity);
      const totalDiff = newLineTotal.sub(oldLineTotal);

      // Update order total
      await tx.order.update({
        where: { id: existing.orderId },
        data: { totalAmount: { increment: totalDiff as unknown as Decimal } },
      });

      return tx.orderItem.update({
        where: { id },
        data: { quantity },
        include: {
          product: { select: { id: true, name: true } },
          order: { select: { id: true, status: true, totalAmount: true } },
        },
      });
    });

    return NextResponse.json({ data: updatedItem });
  } catch (error) {
    console.error("[PUT /api/order-items/[id]]", error);
    return NextResponse.json({ error: "Failed to update order item" }, { status: 500 });
  }
}

// DELETE /api/order-items/[id] - Remove an item from a PENDING order
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    const existing = await prisma.orderItem.findUnique({
      where: { id },
      include: {
        order: { include: { _count: { select: { items: true } } } },
        product: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Order item not found" }, { status: 404 });
    }

    if (existing.order.status !== "PENDING") {
      return NextResponse.json(
        { error: "Order items can only be removed from PENDING orders" },
        { status: 409 }
      );
    }

    if (existing.order._count.items === 1) {
      return NextResponse.json(
        { error: "Cannot remove the last item from an order. Delete the order instead." },
        { status: 409 }
      );
    }

    await prisma.$transaction(async (tx) => {
      // Restore stock
      await tx.product.update({
        where: { id: existing.productId },
        data: { stockQuantity: { increment: existing.quantity } },
      });

      // Subtract from order total
      const lineTotal = existing.price.mul(existing.quantity);
      await tx.order.update({
        where: { id: existing.orderId },
        data: { totalAmount: { decrement: lineTotal as unknown as Decimal } },
      });

      await tx.orderItem.delete({ where: { id } });
    });

    return NextResponse.json({ message: "Order item removed successfully" });
  } catch (error) {
    console.error("[DELETE /api/order-items/[id]]", error);
    return NextResponse.json({ error: "Failed to delete order item" }, { status: 500 });
  }
}