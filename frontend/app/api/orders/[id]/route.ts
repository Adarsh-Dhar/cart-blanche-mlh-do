import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma, OrderStatus } from "@prisma/client";

type Params = { params: Promise<{ id: string }> };

// Log a warning if OrderStatus is undefined
if (!OrderStatus) {
  console.warn("Warning: OrderStatus is undefined. Check Prisma client generation and schema.");
}

// Ensure OrderStatus is defined before using Object.values
const VALID_STATUSES = OrderStatus ? Object.values(OrderStatus) : [];

// Valid status transitions to prevent illegal state changes
const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING:    [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
  PROCESSING: [OrderStatus.PAID, OrderStatus.CANCELLED],
  PAID:       [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
  SHIPPED:    [OrderStatus.DELIVERED],
  DELIVERED:  [],
  CANCELLED:  [],
};

// GET /api/orders/[id] - Get a single order
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: {
              include: {
                vendor: { select: { id: true, name: true, logoUrl: true } },
                category: { select: { id: true, name: true } },
              },
            },
            vendor: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({ data: order });
  } catch (error) {
    console.error("[GET /api/orders/[id]]", error);
    return NextResponse.json({ error: "Failed to fetch order" }, { status: 500 });
  }
}

// PUT /api/orders/[id] - Update order status or crypto fields
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, txHash, userWallet } = body;

    const existing = await prisma.order.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Validate status if being changed
    if (status) {
      if (!VALID_STATUSES.includes(status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` },
          { status: 400 }
        );
      }

      const allowedTransitions = STATUS_TRANSITIONS[existing.status];
      if (!allowedTransitions.includes(status)) {
        return NextResponse.json(
          {
            error: `Cannot transition from ${existing.status} to ${status}. Allowed transitions: ${
              allowedTransitions.length > 0 ? allowedTransitions.join(", ") : "none"
            }`,
          },
          { status: 400 }
        );
      }
    }

    // Prevent overwriting an existing txHash
    if (txHash && existing.txHash && txHash !== existing.txHash) {
      return NextResponse.json(
        { error: "Transaction hash is already set and cannot be changed" },
        { status: 409 }
      );
    }

    const order = await prisma.order.update({
      where: { id },
      data: {
        ...(status !== undefined && { status }),
        ...(txHash !== undefined && { txHash }),
        ...(userWallet !== undefined && { userWallet }),
      },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true } },
            vendor: { select: { id: true, name: true } },
          },
        },
      },
    });

    return NextResponse.json({ data: order });
  } catch (error) {
    console.error("[PUT /api/orders/[id]]", error);
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}

// DELETE /api/orders/[id] - Cancel and delete an order (only if PENDING or CANCELLED)
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    const existing = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const deletableStatuses: OrderStatus[] = [OrderStatus.PENDING, OrderStatus.CANCELLED];
    if (!deletableStatuses.includes(existing.status)) {
      return NextResponse.json(
        {
          error: `Only PENDING or CANCELLED orders can be deleted. Current status: ${existing.status}`,
        },
        { status: 409 }
      );
    }


    // Restore stock and delete order + order items in a transaction
    await prisma.$transaction(async (tx) => {
      // Restore stock for PENDING orders
      if (existing.status === OrderStatus.PENDING) {
        for (const item of existing.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stockQuantity: { increment: item.quantity } },
          });
        }
      }

      // Delete all order items for this order
      await tx.orderItem.deleteMany({ where: { orderId: id } });

      // Now delete the order itself
      await tx.order.delete({ where: { id } });
    });

    return NextResponse.json({ message: "Order deleted successfully" });
  } catch (error) {
    console.error("[DELETE /api/orders/[id]]", error);
    return NextResponse.json({ error: "Failed to delete order" }, { status: 500 });
  }
}