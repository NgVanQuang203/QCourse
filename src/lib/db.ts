// src/lib/db.ts
// Standard PrismaClient — works in Node.js runtime (API routes, Server Actions)
// Neon serverless adapter is NOT needed for Node.js routes; only for Edge runtime.
// The pooled DATABASE_URL (Neon pooler) works fine with standard PrismaClient.
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
