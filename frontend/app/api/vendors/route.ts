import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@/lib/generated/prisma/client';

// GET /api/vendors
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page   = Math.max(1, parseInt(searchParams.get('page')  ?? '1'));
    const limit  = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20')));
    const skip   = (page - 1) * limit;
    const search = searchParams.get('search')?.trim() || undefined;
    const sortBy = searchParams.get('sortBy') ?? 'createdAt';
    const sortOrder = (searchParams.get('sortOrder') ?? 'desc') as 'asc' | 'desc';

    const allowed = ['createdAt', 'updatedAt', 'name'];
    const orderByField = allowed.includes(sortBy) ? sortBy : 'createdAt';

    const where: Prisma.VendorWhereInput = search
      ? {
          OR: [
            { name:        { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            { pubkey:      { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [vendors, total] = await prisma.$transaction([
      prisma.vendor.findMany({
        where,
        skip,
        take: limit,
        include: { _count: { select: { products: true, orders: true } } },
        orderBy: { [orderByField]: sortOrder },
      }),
      prisma.vendor.count({ where }),
    ]);

    return NextResponse.json({
      data: vendors,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('[GET /api/vendors]', error);
    return NextResponse.json({ error: 'Failed to fetch vendors' }, { status: 500 });
  }
}

// POST /api/vendors
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, logoUrl, pubkey } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }
    if (!pubkey?.trim()) {
      return NextResponse.json({ error: 'pubkey is required' }, { status: 400 });
    }

    const existing = await prisma.vendor.findUnique({ where: { pubkey: pubkey.trim() } });
    if (existing) {
      return NextResponse.json({ error: 'A vendor with this pubkey already exists' }, { status: 409 });
    }

    const vendor = await prisma.vendor.create({
      data: {
        name:        name.trim(),
        pubkey:      pubkey.trim(),
        description: description?.trim() || null,
        logoUrl:     logoUrl?.trim()     || null,
      },
    });

    return NextResponse.json({ data: vendor }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/vendors]', error);
    return NextResponse.json({ error: 'Failed to create vendor' }, { status: 500 });
  }
}