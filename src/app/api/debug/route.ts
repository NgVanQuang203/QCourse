import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  return Response.json({
    databaseUrl: process.env.DATABASE_URL,
    type: typeof process.env.DATABASE_URL,
    directUrl: process.env.DIRECT_URL
  });
}
