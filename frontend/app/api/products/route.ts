import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@/lib/generated/prisma/client';

// GET /api/products
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page       = Math.max(1, parseInt(searchParams.get('page')  ?? '1'));
    const limit      = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20')));
    const skip       = (page - 1) * limit;
    const search     = searchParams.get('search')?.trim()       || undefined;
    const vendorId   = searchParams.get('vendorId')             || undefined;
    const categoryId = searchParams.get('categoryId')           || undefined;
    const avail      = searchParams.get('availability')         || undefined;
    const condition  = searchParams.get('condition')            || undefined;
    const minPrice   = searchParams.get('minPrice')             || undefined;
    const maxPrice   = searchParams.get('maxPrice')             || undefined;
    const sortBy     = searchParams.get('sortBy')               ?? 'createdAt';
    const sortOrder  = (searchParams.get('sortOrder') ?? 'desc') as 'asc' | 'desc';

    const allowedSort = ['createdAt', 'updatedAt', 'price', 'name', 'stockQuantity'];
    const orderField  = allowedSort.includes(sortBy) ? sortBy : 'createdAt';

    const where: Prisma.ProductWhereInput = {
      ...(vendorId   && { vendorId }),
      ...(categoryId && { categoryId }),
      ...(avail      && { availability: avail }),
      ...(condition  && { condition }),
      ...(minPrice || maxPrice
        ? {
            price: {
              ...(minPrice && { gte: new Prisma.Decimal(minPrice) }),
              ...(maxPrice && { lte: new Prisma.Decimal(maxPrice) }),
            },
          }
        : {}),
      ...(search && {
        OR: [
          { name:        { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { sku:         { contains: search, mode: 'insensitive' } },
          { productID:   { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [products, total] = await prisma.$transaction([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        include: {
          vendor:   { select: { id: true, name: true, logoUrl: true } },
          category: { select: { id: true, name: true, slug: true, parent: { select: { id: true, name: true } } } },
        },
        orderBy: { [orderField]: sortOrder },
      }),
      prisma.product.count({ where }),
    ]);

    return NextResponse.json({
      data: products,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('[GET /api/products]', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

// POST /api/products
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      productID, sku, gtin, mpn, name, description, images,
      price, currency, stockQuantity, availability, condition,
      vendorId, categoryId,
    } = body;

    const missing = ['productID', 'sku', 'name', 'description', 'vendorId', 'categoryId'].filter(
      (k) => !body[k]?.toString().trim(),
    );
    if (missing.length) {
      return NextResponse.json(
        { error: `Missing required fields: ${missing.join(', ')}` },
        { status: 400 },
      );
    }
    if (price === undefined || isNaN(parseFloat(price))) {
      return NextResponse.json({ error: 'price must be a valid number' }, { status: 400 });
    }

    // Uniqueness checks
    const [dupID, dupSKU, dupGTIN] = await Promise.all([
      prisma.product.findUnique({ where: { productID } }),
      prisma.product.findUnique({ where: { sku } }),
      gtin ? prisma.product.findUnique({ where: { gtin } }) : null,
    ]);
    if (dupID)   return NextResponse.json({ error: 'Product ID already in use' },  { status: 409 });
    if (dupSKU)  return NextResponse.json({ error: 'SKU already in use' },          { status: 409 });
    if (dupGTIN) return NextResponse.json({ error: 'GTIN already in use' },         { status: 409 });

    // FK checks
    const [vendor, category] = await Promise.all([
      prisma.vendor.findUnique({ where: { id: vendorId } }),
      prisma.category.findUnique({ where: { id: categoryId } }),
    ]);
    if (!vendor)   return NextResponse.json({ error: 'Vendor not found' },   { status: 404 });
    if (!category) return NextResponse.json({ error: 'Category not found' }, { status: 404 });

    const product = await prisma.product.create({
      data: {
        productID,
        sku,
        gtin:          gtin || null,
        mpn:           mpn  || null,
        name,
        description,
        images:        images ?? [],
        price:         new Prisma.Decimal(price),
        currency:      currency ?? 'USD',
        stockQuantity: stockQuantity !== undefined ? parseInt(stockQuantity) : 0,
        availability:  availability ?? 'IN_STOCK',
        condition:     condition    ?? 'NEW',
        vendorId,
        categoryId,
      },
      include: {
        vendor:   { select: { id: true, name: true, logoUrl: true } },
        category: { select: { id: true, name: true, slug: true } },
      },
    });

    return NextResponse.json({ data: product }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/products]', error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}