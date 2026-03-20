import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { OrderStatus, Prisma } from '@/lib/generated/prisma/client';

// GET /api/orders
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page       = Math.max(1, parseInt(searchParams.get('page')  ?? '1'));
    const limit      = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20')));
    const skip       = (page - 1) * limit;
    const status     = searchParams.get('status')     as OrderStatus | null;
    const userWallet = searchParams.get('userWallet') || undefined;
    const txHash     = searchParams.get('txHash')     || undefined;
    const vendorId   = searchParams.get('vendorId')   || undefined;
    const dateFrom   = searchParams.get('dateFrom')   || undefined;
    const dateTo     = searchParams.get('dateTo')     || undefined;

    const validStatuses = ['PENDING', 'PROCESSING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` }, { status: 400 });
    }

    const where: Prisma.OrderWhereInput = {
      ...(status     && { status }),
      ...(userWallet && { userWallet: { equals: userWallet, mode: 'insensitive' } }),
      ...(txHash     && { txHash }),
      ...(vendorId   && { items: { some: { vendorId } } }),
      ...(dateFrom || dateTo
        ? {
            createdAt: {
              ...(dateFrom && { gte: new Date(dateFrom) }),
              ...(dateTo   && { lte: new Date(dateTo)   }),
            },
          }
        : {}),
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
              vendor:  { select: { id: true, name: true, logoUrl: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.order.count({ where }),
    ]);

    return NextResponse.json({
      data: orders,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('[GET /api/orders]', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}

// POST /api/orders
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userWallet, txHash, items } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Order must contain at least one item' }, { status: 400 });
    }

    for (const item of items) {
      if (!item.productId) {
        return NextResponse.json({ error: 'Each item must have a productId' }, { status: 400 });
      }
      if (typeof item.quantity !== 'number' || item.quantity < 1) {
        return NextResponse.json({ error: 'Each item must have quantity >= 1' }, { status: 400 });
      }
    }

    const productIds = [...new Set<string>(items.map((i: { productId: string }) => i.productId))];
    const products   = await prisma.product.findMany({ where: { id: { in: productIds } } });

    if (products.length !== productIds.length) {
      const found   = new Set(products.map((p) => p.id));
      const missing = productIds.filter((id) => !found.has(id));
      return NextResponse.json({ error: `Products not found: ${missing.join(', ')}` }, { status: 404 });
    }

    const productMap = new Map(products.map((p) => [p.id, p]));

    for (const item of items) {
      const product = productMap.get(item.productId)!;
      if (product.stockQuantity < item.quantity) {
        return NextResponse.json(
          { error: `Insufficient stock for "${product.name}". Available: ${product.stockQuantity}` },
          { status: 409 },
        );
      }
    }

    // Aggregate quantities if same product appears multiple times
    const quantityMap = new Map<string, number>();
    for (const item of items) {
      quantityMap.set(item.productId, (quantityMap.get(item.productId) ?? 0) + item.quantity);
    }

    let totalAmount = new Prisma.Decimal(0);
    for (const [productId, qty] of quantityMap) {
      const p = productMap.get(productId)!;
      totalAmount = totalAmount.add(p.price.mul(qty));
    }

    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          totalAmount,
          ...(userWallet && { userWallet }),
          ...(txHash     && { txHash }),
          items: {
            create: [...quantityMap.entries()].map(([productId, qty]) => {
              const p = productMap.get(productId)!;
              return { quantity: qty, price: p.price, productId, vendorId: p.vendorId };
            }),
          },
        },
        include: {
          items: {
            include: {
              product: { select: { id: true, name: true, sku: true } },
              vendor:  { select: { id: true, name: true } },
            },
          },
        },
      });

      for (const [productId, qty] of quantityMap) {
        await tx.product.update({
          where: { id: productId },
          data:  { stockQuantity: { decrement: qty } },
        });
      }

      return newOrder;
    });

    return NextResponse.json({ data: order }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/orders]', error);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}