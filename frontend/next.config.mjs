/** @type {import('next').NextConfig} */

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // turbopack config removed for Next.js 14 compatibility
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      // Force Prisma client to always use Node.js build
      // '@prisma/client': path.resolve(__dirname, 'lib/generated-prisma/index.js'),
      // './generated-prisma': path.resolve(__dirname, 'lib/generated-prisma'),
    };
    return config;
  },
};

export default nextConfig
