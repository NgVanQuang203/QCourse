import { PrismaClient } from '@prisma/client';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import ws from 'ws';

// Required for neon websocket connections in node.js runtime
neonConfig.webSocketConstructor = ws;

const connectionString = `${process.env.DATABASE_URL}`;

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

// Initialize Neon connection pool
const pool = new Pool({ connectionString });
// Initialize Prisma Adapter (bypass TS mismatch between neondatabase and prisma)
// @ts-expect-error Type mismatch in pg definition
const adapter = new PrismaNeon(pool);


export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
