import { PrismaClient } from '@prisma/client';
import { Pool } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';

const url = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_nqHWLs5Zc9XB@ep-autumn-hall-a13gjvvc-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

try {
  console.log("Creating Pool with URL length:", url.length);
  const pool = new Pool({ connectionString: url });
  
  console.log("Creating Adapter");
  const adapter = new PrismaNeon(pool);

  console.log("Creating PrismaClient");
  const prisma = new PrismaClient({ adapter });

  console.log("Connecting database...");
  prisma.$connect().then(() => {
    console.log("Connected successfully!");
    process.exit(0);
  }).catch(e => {
    console.error("Prisma connect error:", e);
    process.exit(1);
  });
} catch (e) {
  console.error("Init error:", e);
  process.exit(1);
}
