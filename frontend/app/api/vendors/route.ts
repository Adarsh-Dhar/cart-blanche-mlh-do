import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/vendors - List all vendors
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "20");
    const skip = (page - 1) * limit;

    const [vendors, total] = await prisma.$transaction([
      prisma.vendor.findMany({
        skip,
        take: limit,
        include: {
          _count: { select: { products: true, orders: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.vendor.count(),
    ]);

    return NextResponse.json({
      data: vendors,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("[GET /api/vendors]", error);
    return NextResponse.json({
      error: "Failed to fetch vendors",
      message: error instanceof Error ? error.message : String(error),
      stack: process.env.NODE_ENV === "development" && error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}

// POST /api/vendors - Create a new vendor
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, logoUrl, pubkey } = body;

    if (!name || !pubkey) {
      return NextResponse.json(
        { error: "Missing required fields: name, pubkey" },
        { status: 400 }
      );
    }

    const existing = await prisma.vendor.findUnique({ where: { pubkey } });
    if (existing) {
      return NextResponse.json(
        { error: "A vendor with this pubkey already exists" },
        { status: 409 }
      );
    }

    const vendor = await prisma.vendor.create({
      data: { name, description, logoUrl, pubkey },
    });

    return NextResponse.json({ data: vendor }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/vendors]", error);
    return NextResponse.json({
      error: "Failed to create vendor",
      message: error instanceof Error ? error.message : String(error),
      stack: process.env.NODE_ENV === "development" && error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}