import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type Params = { params: Promise<{ id: string }> };

// GET /api/categories/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        parent:   true,
        children: { include: { _count: { select: { products: true } } } },
        _count:   { select: { products: true } },
      },
    });

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    return NextResponse.json({ data: category });
  } catch (error) {
    console.error('[GET /api/categories/[id]]', error);
    return NextResponse.json({ error: 'Failed to fetch category' }, { status: 500 });
  }
}

// PUT /api/categories/[id]
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body   = await request.json();
    const { name, slug, parentId } = body;

    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Category not found' }, { status: 404 });

    if (parentId === id) {
      return NextResponse.json({ error: 'A category cannot be its own parent' }, { status: 400 });
    }

    // Uniqueness checks (only if changed)
    if (name && name !== existing.name) {
      const c = await prisma.category.findUnique({ where: { name } });
      if (c) return NextResponse.json({ error: 'Category name already in use' }, { status: 409 });
    }
    if (slug && slug !== existing.slug) {
      const c = await prisma.category.findUnique({ where: { slug } });
      if (c) return NextResponse.json({ error: 'Category slug already in use' }, { status: 409 });
    }

    if (parentId) {
      const parent = await prisma.category.findUnique({ where: { id: parentId } });
      if (!parent) return NextResponse.json({ error: 'Parent category not found' }, { status: 404 });

      // Prevent circular hierarchy
      let cursor: string | null = parentId;
      while (cursor) {
        if (cursor === id) {
          return NextResponse.json(
            { error: 'Setting this parent would create a circular hierarchy' },
            { status: 400 },
          );
        }
        const p = await prisma.category.findUnique({ where: { id: cursor }, select: { parentId: true } });
        cursor = p?.parentId ?? null;
      }
    }

    const category = await prisma.category.update({
      where: { id },
      data: {
        ...(name     !== undefined && { name }),
        ...(slug     !== undefined && { slug: slug.toLowerCase() }),
        ...(parentId !== undefined && { parentId: parentId || null }),
      },
      include: { parent: true, children: true },
    });

    return NextResponse.json({ data: category });
  } catch (error) {
    console.error('[PUT /api/categories/[id]]', error);
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 });
  }
}

// DELETE /api/categories/[id]
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    const existing = await prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { products: true, children: true } } },
    });

    if (!existing) return NextResponse.json({ error: 'Category not found' }, { status: 404 });

    if (existing._count.products > 0) {
      return NextResponse.json(
        { error: `Cannot delete: ${existing._count.products} product(s) are in this category.` },
        { status: 409 },
      );
    }
    if (existing._count.children > 0) {
      return NextResponse.json(
        { error: `Cannot delete: this category has ${existing._count.children} subcategory(s).` },
        { status: 409 },
      );
    }

    await prisma.category.delete({ where: { id } });

    return NextResponse.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('[DELETE /api/categories/[id]]', error);
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
  }
}