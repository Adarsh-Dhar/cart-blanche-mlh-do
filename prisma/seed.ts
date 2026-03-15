import { PrismaClient } from '../frontend/lib/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import "dotenv/config";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool as any);
const prisma = new PrismaClient({ adapter });

async function main() {
  // 1. Create Digital Vendors
  const infraVendor = await prisma.vendor.upsert({
    where: { pubkey: '0xFe5e03799Fe833D93e950d22406F9aD901Ff3Bb9' },
    update: {},
    create: {
      name: "BitCompute Cloud",
      description: "High-performance GPU credits and API throughput vouchers.",
      pubkey: '0xFe5e03799Fe833D93e950d22406F9aD901Ff3Bb9',
      logoUrl: "https://api.placeholder.com/150/0000FF?text=BitCompute",
    },
  });

  const creativeVendor = await prisma.vendor.upsert({
    where: { pubkey: '0x90C768dDfeA2352511FeEE464BED8b550994d3eB' },
    update: {},
    create: {
      name: "AssetStream Digital",
      description: "Premium UI kits, 3D assets, and royalty-free cinematic audio.",
      pubkey: '0x90C768dDfeA2352511FeEE464BED8b550994d3eB',
      logoUrl: "https://api.placeholder.com/150/FF00FF?text=AssetStream",
    },
  });

  const softwareVendor = await prisma.vendor.upsert({
    where: { pubkey: '0xAE0F008660E94CB67203C2Eac3660C4e0Aff6948' },
    update: {},
    create: {
      name: "DevVault Pro",
      description: "SaaS licenses, IDE plugins, and advanced developer certifications.",
      pubkey: '0xAE0F008660E94CB67203C2Eac3660C4e0Aff6948',
      logoUrl: "https://api.placeholder.com/150/00FF00?text=DevVault",
    },
  });

  // 2. Create Categories
  const categories = [
    { name: 'Cloud & Compute', slug: 'compute' },
    { name: 'Creative Assets', slug: 'creative' },
    { name: 'SaaS Subscriptions', slug: 'saas' },
    { name: 'Developer Tools', slug: 'dev-tools' },
    { name: 'Education Vouchers', slug: 'edu' },
  ];

  const categoryMap: Record<string, string> = {};
  for (const cat of categories) {
    const created = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
    categoryMap[cat.name] = created.id;
  }

  // 3. Define the Digital Inventory
  const products = [
    // BitCompute (Compute)
    { productID: 'GPU-H100-100H', name: '100 Hours H100 GPU Cluster', price: 250, cat: 'Cloud & Compute', vendor: infraVendor.id },
    { productID: 'API-GPT4-50M', name: '50M Token Proxy Voucher', price: 99, cat: 'Cloud & Compute', vendor: infraVendor.id },
    
    // AssetStream (Creative)
    { productID: 'UI-NEON-PRO', name: 'Neon-Cyber UI Kit (Figma)', price: 45, cat: 'Creative Assets', vendor: creativeVendor.id },
    { productID: '3D-SCI-FI-PACK', name: 'Sci-Fi Modular Base (Unreal 5)', price: 120, cat: 'Creative Assets', vendor: creativeVendor.id },
    { productID: 'AUD-CIN-LOOP', name: 'Cinematic Ambient Audio Bundle', price: 35, cat: 'Creative Assets', vendor: creativeVendor.id },
    
    // DevVault (Software/Edu)
    { productID: 'JS-IDE-1YR', name: 'JetBrains All Products (1 Year)', price: 289, cat: 'Developer Tools', vendor: softwareVendor.id },
    { productID: 'CO-PILOT-PRO', name: 'AI Coding Assistant Pro (Lifetime)', price: 499, cat: 'SaaS Subscriptions', vendor: softwareVendor.id },
    { productID: 'AWS-CERT-VOUCH', name: 'AWS Solutions Architect Voucher', price: 150, cat: 'Education Vouchers', vendor: softwareVendor.id },
    { productID: 'VERCEL-PRO-3MO', name: 'Vercel Pro (3 Month Credit)', price: 60, cat: 'SaaS Subscriptions', vendor: softwareVendor.id },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { productID: p.productID },
      update: {},
      create: {
        productID: p.productID,
        sku: p.productID,
        name: p.name,
        description: `Instant digital delivery for ${p.name}. License keys generated upon payment confirmation.`,
        price: p.price,
        vendorId: p.vendor,
        categoryId: categoryMap[p.cat],
        stockQuantity: 9999, // Infinite for digital
        images: [`https://api.placeholder.com/400/300?text=${encodeURIComponent(p.name)}`],
      },
    });
  }

  console.log("Digital products seeded successfully.");
}

main().finally(async () => {
  await prisma.$disconnect();
  await pool.end();
});