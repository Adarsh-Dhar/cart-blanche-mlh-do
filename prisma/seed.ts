import { PrismaClient, OrderStatus } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  // 1. Create Vendors (Competitors in the UCP Ecosystem)
  const budgetStore = await prisma.vendor.upsert({
    where: { pubkey: '0xFe5e03799Fe833D93e950d22406F9aD901Ff3Bb9' },
    update: {},
    create: {
      name: "ValueGear Essentials",
      description: "Affordable school and office supplies for everyday needs.",
      pubkey: '0xBudgetVendorAddress712...',
      logoUrl: "https://api.placeholder.com/150/budget",
    },
  });

  const midRangeStore = await prisma.vendor.upsert({
    where: { pubkey: '0x90C768dDfeA2352511FeEE464BED8b550994d3eB' },
    update: {},
    create: {
      name: "Scholar's Choice",
      description: "Quality brands and durable gear for serious students.",
      pubkey: '0xMidRangeVendorAddress712...',
      logoUrl: "https://api.placeholder.com/150/scholar",
    },
  });

  const premiumStore = await prisma.vendor.upsert({
    where: { pubkey: '0xAE0F008660E94CB67203C2Eac3660C4e0Aff6948' },
    update: {},
    create: {
      name: "Elite Academy Boutique",
      description: "High-end stationery, designer tech, and premium apparel.",
      pubkey: '0xPremiumVendorAddress712...',
      logoUrl: "https://api.placeholder.com/150/elite",
    },
  });

  // 2. Create Categories
  const categories = [
    { name: 'Backpacks', slug: 'backpacks' },
    { name: 'Stationery', slug: 'stationery' },
    { name: 'Electronics', slug: 'electronics' },
    { name: 'Apparel', slug: 'apparel' },
    { name: 'Lunchware', slug: 'lunchware' },
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

  // 3. Helper for generating product tiers
  const generateTieredProducts = async (
    baseName: string,
    categoryName: string,
    baseSku: string,
    basePrice: number
  ) => {
    const catId = categoryMap[categoryName];
    
    return [
      // Budget Tier
      {
        productID: `${baseSku}-BGT`,
        sku: `${baseSku}-BGT`,
        name: `Basic ${baseName}`,
        description: `Economy version of ${baseName.toLowerCase()} for daily use.`,
        price: basePrice * 0.7,
        vendorId: budgetStore.id,
        categoryId: catId,
        stockQuantity: 500,
        images: ["https://api.placeholder.com/400/300?text=Budget+Item"],
      },
      // Mid-Range Tier
      {
        productID: `${baseSku}-MID`,
        sku: `${baseSku}-MID`,
        name: `Standard ${baseName}`,
        description: `Durable and reliable ${baseName.toLowerCase()} with a 1-year warranty.`,
        price: basePrice,
        vendorId: midRangeStore.id,
        categoryId: catId,
        stockQuantity: 200,
        images: ["https://api.placeholder.com/400/300?text=Standard+Item"],
      },
      // Premium Tier
      {
        productID: `${baseSku}-PRM`,
        sku: `${baseSku}-PRM`,
        name: `Pro ${baseName} Plus`,
        description: `Professional grade ${baseName.toLowerCase()} featuring ergonomic design and premium materials.`,
        price: basePrice * 2.5,
        vendorId: premiumStore.id,
        categoryId: catId,
        stockQuantity: 50,
        images: ["https://api.placeholder.com/400/300?text=Premium+Item"],
      },
    ];
  };

  // 4. Generate the List (34 types * 3 tiers = 102 Products)
  const productTemplates = [
    { name: 'Backpack', cat: 'Backpacks', sku: 'BPK', price: 40 },
    { name: 'Laptop Sleeve', cat: 'Backpacks', sku: 'SLV', price: 25 },
    { name: 'Notebook (3-Pack)', cat: 'Stationery', sku: 'NTB', price: 12 },
    { name: 'Gel Pen Set', cat: 'Stationery', sku: 'PEN', price: 8 },
    { name: 'Mechanical Pencil', cat: 'Stationery', sku: 'PCL', price: 5 },
    { name: 'Highlighter Set', cat: 'Stationery', sku: 'HLT', price: 6 },
    { name: 'Scientific Calculator', cat: 'Electronics', sku: 'CAL', price: 30 },
    { name: 'Noise Cancelling Headphones', cat: 'Electronics', sku: 'HPN', price: 120 },
    { name: 'Portable Power Bank', cat: 'Electronics', sku: 'PWR', price: 35 },
    { name: 'USB-C Hub', cat: 'Electronics', sku: 'HUB', price: 45 },
    { name: 'Wireless Mouse', cat: 'Electronics', sku: 'MSE', price: 25 },
    { name: 'Cotton T-Shirt', cat: 'Apparel', sku: 'TSH', price: 18 },
    { name: 'School Hoodie', cat: 'Apparel', sku: 'HOD', price: 45 },
    { name: 'Canvas Sneakers', cat: 'Apparel', sku: 'SNK', price: 55 },
    { name: 'Insulated Lunch Box', cat: 'Lunchware', sku: 'LNB', price: 20 },
    { name: 'Stainless Steel Water Bottle', cat: 'Lunchware', sku: 'WTR', price: 15 },
    { name: 'Bento Box Set', cat: 'Lunchware', sku: 'BTO', price: 28 },
    // Repeat/Vary more items to hit 100+
    { name: 'Duffel Bag', cat: 'Backpacks', sku: 'DUF', price: 50 },
    { name: 'Planner/Journal', cat: 'Stationery', sku: 'PLN', price: 22 },
    { name: 'Desk Lamp', cat: 'Electronics', sku: 'LMP', price: 30 },
    { name: 'E-Reader', cat: 'Electronics', sku: 'ERD', price: 99 },
    { name: 'Correction Tape (5-Pack)', cat: 'Stationery', sku: 'COR', price: 10 },
    { name: 'Sticky Note Mega-Bundle', cat: 'Stationery', sku: 'STK', price: 15 },
    { name: 'Drawing Tablet', cat: 'Electronics', sku: 'TAB', price: 150 },
    { name: 'Rain Jacket', cat: 'Apparel', sku: 'RNJ', price: 70 },
    { name: 'School Uniform Blazer', cat: 'Apparel', sku: 'BLZ', price: 85 },
    { name: 'Smart Watch', cat: 'Electronics', sku: 'WCH', price: 199 },
    { name: 'Bluetooth Speaker', cat: 'Electronics', sku: 'SPK', price: 60 },
    { name: 'Geometric Math Set', cat: 'Stationery', sku: 'GMS', price: 14 },
    { name: 'Art Marker Set (48 Colors)', cat: 'Stationery', sku: 'MRK', price: 40 },
    { name: 'Stapler & Remover Kit', cat: 'Stationery', sku: 'STP', price: 12 },
    { name: 'Webcam 1080p', cat: 'Electronics', sku: 'CAM', price: 65 },
    { name: 'Polo Shirt', cat: 'Apparel', sku: 'POL', price: 25 },
    { name: 'School Chinos', cat: 'Apparel', sku: 'CHI', price: 40 },
  ];

  for (const template of productTemplates) {
    const tieredItems = await generateTieredProducts(
      template.name,
      template.cat,
      template.sku,
      template.price
    );
    
    for (const item of tieredItems) {
      await prisma.product.upsert({
        where: { productID: item.productID },
        update: {},
        create: item,
      });
    }
  }

  console.log("Seed completed: 3 Vendors, 5 Categories, and 102 Products created.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });