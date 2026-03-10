import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma, OrderStatus } from "@prisma/client";

// GET /api/orders - List all orders
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "20");
    const skip = (page - 1) * limit;

    const status = searchParams.get("status") as OrderStatus | null;
    const userWallet = searchParams.get("userWallet");
    const txHash = searchParams.get("txHash");

    const where: Prisma.OrderWhereInput = {
      ...(status && { status }),
      ...(userWallet && { userWallet: { equals: userWallet, mode: "insensitive" } }),
      ...(txHash && { txHash }),
    };

    const [orders, total] = await prisma.$transaction([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        include: {
          items: {
            include: {
              product: { select: { id: true, name: true, images: true, sku: true } },
              vendor: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.order.count({ where }),
    ]);

    return NextResponse.json({
      data: orders,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("[GET /api/orders]", error);
    return NextResponse.json({
      error: "Failed to fetch orders",
      message: error instanceof Error ? error.message : String(error),
      stack: process.env.NODE_ENV === "development" && error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}

// POST /api/orders - Create a new order
// Body: { userWallet?, txHash?, items: [{ productId, quantity }] }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userWallet, txHash, items } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Order must contain at least one item" },
        { status: 400 }
      );
    }

    // Validate each item has productId and quantity
    for (const item of items) {
      if (!item.productId || typeof item.quantity !== "number" || item.quantity < 1) {
        return NextResponse.json(
          { error: "Each item must have a valid productId and quantity >= 1" },
          { status: 400 }
        );
      }
    }

    // Fetch all products in one query
    const productIds: string[] = items.map((i: { productId: string }) => i.productId);
    const products: Product[] = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    if (products.length !== productIds.length) {
      const foundIds = new Set(products.map((p) => p.id));
      const missing = productIds.filter((id) => !foundIds.has(id));
      return NextResponse.json(
        { error: `Products not found: ${missing.join(", ")}` },
        { status: 404 }
      );
    }

    // Check stock availability
    const productMap = new Map(products.map((p: Product) => [p.id, p]));
    for (const item of items) {
      const product = productMap.get(item.productId)!;
      if (product.stockQuantity < item.quantity) {
        return NextResponse.json(
          { error: `Insufficient stock for product "${product.name}". Available: ${product.stockQuantity}` },
          { status: 409 }
        );
      }
    }

    // Calculate total
    let totalAmount = new Prisma.Decimal(0);
    for (const item of items) {
      const product = productMap.get(item.productId)!;
      totalAmount = totalAmount.add(product.price.mul(item.quantity));
    }

    // Create order + items + decrement stock in a transaction
    const order = await prisma.$transaction(async (tx: typeof prisma) => {
      const newOrder = await tx.order.create({
        data: {
          totalAmount,
          ...(userWallet && { userWallet }),
          ...(txHash && { txHash }),
          items: {
            create: items.map((item: { productId: string; quantity: number }) => {
              const product = productMap.get(item.productId)!;
              return {
                quantity: item.quantity,
                price: product.price,
                productId: item.productId,
                vendorId: product.vendorId,
              };
            }),
          },
        },
        include: {
          items: {
            include: {
              product: { select: { id: true, name: true, sku: true } },
              vendor: { select: { id: true, name: true } },
            },
          },
        },
      });

      // Decrement stock for each product
      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stockQuantity: { decrement: item.quantity } },
        });
      }

      return newOrder;
    });

    return NextResponse.json({ data: order }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/orders]", error);
    return NextResponse.json({
      error: "Failed to create order",
      message: error instanceof Error ? error.message : String(error),
      stack: process.env.NODE_ENV === "development" && error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}