// prisma.config.ts — Prisma 7 required config file
// Database connection is now configured here, NOT in schema.prisma
import { config } from 'dotenv';
import { defineConfig } from 'prisma/config';

// Load .env.local (Next.js convention) then fallback to .env
config({ path: '.env.local' });
config({ path: '.env' });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL!,
  },
});

