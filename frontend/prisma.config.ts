import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "lib/generated-prisma/schema.prisma",
  migrations: {
    path: "lib/generated-prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});