import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/lib/generated-prisma";

// GET /api/products - List all products with optional filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "20");
    const skip = (page - 1) * limit;

    const vendorId = searchParams.get("vendorId");
    const categoryId = searchParams.get("categoryId");
    const availability = searchParams.get("availability");
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const search = searchParams.get("search");
    const sortBy = searchParams.get("sortBy") ?? "createdAt";
    const sortOrder = (searchParams.get("sortOrder") ?? "desc") as "asc" | "desc";

    const where: Prisma.ProductWhereInput = {
      ...(vendorId && { vendorId }),
      ...(categoryId && { categoryId }),
      ...(availability && { availability }),
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
          { name: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
          { sku: { contains: search, mode: "insensitive" } },
          { productID: { contains: search, mode: "insensitive" } },
        ],
      }),
    };

    const allowedSortFields = ["createdAt", "updatedAt", "price", "name", "stockQuantity"];
    const orderByField = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";

    const [products, total] = await prisma.$transaction([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        include: {
          vendor: { select: { id: true, name: true, logoUrl: true } },
          category: { select: { id: true, name: true, slug: true } },
        },
        orderBy: { [orderByField]: sortOrder },
      }),
      prisma.product.count({ where }),
    ]);

    return NextResponse.json({
      data: products,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("[GET /api/products]", error);
    return NextResponse.json({
      error: "Failed to fetch products",
      message: error instanceof Error ? error.message : String(error),
      stack: process.env.NODE_ENV === "development" && error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}

// POST /api/products - Create a new product
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
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

    if (!productID || !sku || !name || !description || price === undefined || !vendorId || !categoryId) {
      return NextResponse.json(
        { error: "Missing required fields: productID, sku, name, description, price, vendorId, categoryId" },
        { status: 400 }
      );
    }

    // Check uniqueness constraints
    const [existingProductID, existingSku, existingGtin] = await Promise.all([
      prisma.product.findUnique({ where: { productID } }),
      prisma.product.findUnique({ where: { sku } }),
      gtin ? prisma.product.findUnique({ where: { gtin } }) : Promise.resolve(null),
    ]);

    if (existingProductID) {
      return NextResponse.json({ error: "Product ID already in use" }, { status: 409 });
    }
    if (existingSku) {
      return NextResponse.json({ error: "SKU already in use" }, { status: 409 });
    }
    if (existingGtin) {
      return NextResponse.json({ error: "GTIN already in use" }, { status: 409 });
    }

    // Validate relations
    const [vendor, category] = await Promise.all([
      prisma.vendor.findUnique({ where: { id: vendorId } }),
      prisma.category.findUnique({ where: { id: categoryId } }),
    ]);

    if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    if (!category) return NextResponse.json({ error: "Category not found" }, { status: 404 });

    const product = await prisma.product.create({
      data: {
        productID,
        sku,
        ...(gtin && { gtin }),
        ...(mpn && { mpn }),
        name,
        description,
        images: images ?? [],
        price: new Prisma.Decimal(price),
        ...(currency && { currency }),
        ...(stockQuantity !== undefined && { stockQuantity }),
        ...(availability && { availability }),
        ...(condition && { condition }),
        vendorId,
        categoryId,
      },
      include: {
        vendor: { select: { id: true, name: true } },
        category: { select: { id: true, name: true, slug: true } },
      },
    });

    return NextResponse.json({ data: product }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/products]", error);
    return NextResponse.json({
      error: "Failed to create product",
      message: error instanceof Error ? error.message : String(error),
      stack: process.env.NODE_ENV === "development" && error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}