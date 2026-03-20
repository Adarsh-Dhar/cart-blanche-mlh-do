import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/categories
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const flat     = searchParams.get('flat') === 'true';
    const parentId = searchParams.get('parentId') || undefined;
    const search   = searchParams.get('search')?.trim() || undefined;

    if (flat) {
      const where = {
        ...(parentId !== undefined && { parentId: parentId || null }),
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { slug: { contains: search, mode: 'insensitive' as const } },
          ],
        }),
      };

      const categories = await prisma.category.findMany({
        where,
        include: {
          parent:   { select: { id: true, name: true } },
          _count:   { select: { products: true } },
        },
        orderBy: { name: 'asc' },
      });
      return NextResponse.json({ data: categories });
    }

    // Tree mode: top-level with nested children (3 levels deep)
    const categories = await prisma.category.findMany({
      where: { parentId: null },
      include: {
        children: {
          include: {
            children: {
              include: { _count: { select: { products: true } } },
            },
            _count: { select: { products: true } },
          },
        },
        _count: { select: { products: true } },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ data: categories });
  } catch (error) {
    console.error('[GET /api/categories]', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}

// POST /api/categories
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, slug, parentId } = body;

    if (!name?.trim()) return NextResponse.json({ error: 'name is required' }, { status: 400 });
    if (!slug?.trim()) return NextResponse.json({ error: 'slug is required' }, { status: 400 });

    const normalized = { name: name.trim(), slug: slug.trim().toLowerCase() };

    const existing = await prisma.category.findFirst({
      where: { OR: [{ name: normalized.name }, { slug: normalized.slug }] },
    });
    if (existing) {
      const field = existing.name === normalized.name ? 'name' : 'slug';
      return NextResponse.json(
        { error: `A category with this ${field} already exists` },
        { status: 409 },
      );
    }

    if (parentId) {
      const parent = await prisma.category.findUnique({ where: { id: parentId } });
      if (!parent) return NextResponse.json({ error: 'Parent category not found' }, { status: 404 });
    }

    const category = await prisma.category.create({
      data: { ...normalized, ...(parentId && { parentId }) },
      include: { parent: true },
    });

    return NextResponse.json({ data: category }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/categories]', error);
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}