import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type Params = { params: Promise<{ id: string }> };

// GET /api/vendors/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    const vendor = await prisma.vendor.findUnique({
      where: { id },
      include: {
        _count: { select: { products: true, orders: true } },
      },
    });

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    return NextResponse.json({ data: vendor });
  } catch (error) {
    console.error('[GET /api/vendors/[id]]', error);
    return NextResponse.json({ error: 'Failed to fetch vendor' }, { status: 500 });
  }
}

// PUT /api/vendors/[id]
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body   = await request.json();
    const { name, description, logoUrl, pubkey } = body;

    const existing = await prisma.vendor.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    if (name !== undefined && !name.trim()) {
      return NextResponse.json({ error: 'name cannot be empty' }, { status: 400 });
    }

    if (pubkey && pubkey !== existing.pubkey) {
      const conflict = await prisma.vendor.findUnique({ where: { pubkey } });
      if (conflict) {
        return NextResponse.json(
          { error: 'Another vendor is already using this pubkey' },
          { status: 409 },
        );
      }
    }

    const vendor = await prisma.vendor.update({
      where: { id },
      data: {
        ...(name        !== undefined && { name:        name.trim()        }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(logoUrl     !== undefined && { logoUrl:     logoUrl?.trim()     || null }),
        ...(pubkey      !== undefined && { pubkey:      pubkey.trim()       }),
      },
    });

    return NextResponse.json({ data: vendor });
  } catch (error) {
    console.error('[PUT /api/vendors/[id]]', error);
    return NextResponse.json({ error: 'Failed to update vendor' }, { status: 500 });
  }
}

// DELETE /api/vendors/[id]
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    const existing = await prisma.vendor.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    if (existing._count.products > 0) {
      return NextResponse.json(
        { error: `Cannot delete vendor with ${existing._count.products} product(s). Remove products first.` },
        { status: 409 },
      );
    }

    await prisma.vendor.delete({ where: { id } });

    return NextResponse.json({ message: 'Vendor deleted successfully' });
  } catch (error) {
    console.error('[DELETE /api/vendors/[id]]', error);
    return NextResponse.json({ error: 'Failed to delete vendor' }, { status: 500 });
  }
}