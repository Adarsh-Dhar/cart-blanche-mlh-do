import { config } from "dotenv";
const result = config({ path: ".env.local" });
console.log("Dotenv result:", result);

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Debug log to confirm PRISMA_ACCELERATE_URL
console.log("PRISMA_ACCELERATE_URL:", process.env.PRISMA_ACCELERATE_URL);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    accelerateUrl: process.env.PRISMA_ACCELERATE_URL, // Added accelerateUrl configuration
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;