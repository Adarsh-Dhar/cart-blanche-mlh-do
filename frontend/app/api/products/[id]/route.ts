import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/lib/generated/prisma/client" // Import Prisma namespace for Decimal type;


type Params = { params: Promise<{ id: string }> };

// GET /api/products/[id] - Get a single product
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    let product = null;
    try {
      product = await prisma.product.findUnique({
        where: { id },
        include: {
          vendor: true,
          category: {
            include: { parent: true },
          },
        },
      });
    } catch (relationError) {
      console.error("[Relation error in product fetch]", relationError);
      // Try fallback: fetch without relations
      product = await prisma.product.findUnique({ where: { id } });
    }
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    return NextResponse.json({ data: product });
  } catch (error) {
    console.error("[GET /api/products/[id]]", error);
    return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 });
  }
}

// PUT /api/products/[id] - Update a product
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const {
      productID,
      sku,
      gtin,
      mpn,
      name,
      description,
      images,
      price,
      currency,
      stockQuantity,
      availability,
      condition,
      vendorId,
      categoryId,
    } = body;

    // Check uniqueness conflicts for fields being changed
    if (productID && productID !== existing.productID) {
      const conflict = await prisma.product.findUnique({ where: { productID } });
      if (conflict) return NextResponse.json({ error: "Product ID already in use" }, { status: 409 });
    }
    if (sku && sku !== existing.sku) {
      const conflict = await prisma.product.findUnique({ where: { sku } });
      if (conflict) return NextResponse.json({ error: "SKU already in use" }, { status: 409 });
    }
    if (gtin && gtin !== existing.gtin) {
      const conflict = await prisma.product.findUnique({ where: { gtin } });
      if (conflict) return NextResponse.json({ error: "GTIN already in use" }, { status: 409 });
    }

    // Validate foreign keys if being changed
    if (vendorId && vendorId !== existing.vendorId) {
      const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
      if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }
    if (categoryId && categoryId !== existing.categoryId) {
      const category = await prisma.category.findUnique({ where: { id: categoryId } });
      if (!category) return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(productID !== undefined && { productID }),
        ...(sku !== undefined && { sku }),
        ...(gtin !== undefined && { gtin }),
        ...(mpn !== undefined && { mpn }),
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(images !== undefined && { images }),
        ...(price !== undefined && { price: new Prisma.Decimal(price) }),
        ...(currency !== undefined && { currency }),
        ...(stockQuantity !== undefined && { stockQuantity }),
        ...(availability !== undefined && { availability }),
        ...(condition !== undefined && { condition }),
        ...(vendorId !== undefined && { vendorId }),
        ...(categoryId !== undefined && { categoryId }),
      },
      include: {
        vendor: { select: { id: true, name: true } },
        category: { select: { id: true, name: true, slug: true } },
      },
    });

    return NextResponse.json({ data: product });
  } catch (error) {
    console.error("[PUT /api/products/[id]]", error);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

// DELETE /api/products/[id] - Delete a product
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    const existing = await prisma.product.findUnique({
      where: { id },
      include: { _count: { select: { orderItems: true } } },
    });

    if (!existing) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    if (existing._count.orderItems > 0) {
      return NextResponse.json(
        { error: "Cannot delete product that has been ordered. Consider marking it out of stock instead." },
        { status: 409 }
      );
    }

    await prisma.product.delete({ where: { id } });

    return NextResponse.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("[DELETE /api/products/[id]]", error);
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}