import { PrismaClient } from "./generated-prisma";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};


// TODO: Update with your actual adapter or accelerateUrl if using Accelerate or a custom adapter.
// See: https://pris.ly/d/client-constructor
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    // Example: Uncomment and configure one of the following as needed:
    // adapter: myPrismaAdapter,
    // accelerateUrl: process.env.PRISMA_ACCELERATE_URL,
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;