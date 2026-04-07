// GET /api/decks — list all decks for current user
// POST /api/decks — create a new deck
import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const CreateDeckSchema = z.object({
  name:         z.string().min(1).max(100),
  description:  z.string().max(500).optional(),
  color:        z.string().default('#6366f1'),
  type:         z.enum(['FLASHCARD', 'QUIZ']).default('FLASHCARD'),
  folderId:     z.string().optional(),
  timeLimitSec: z.number().min(10).max(300).default(60),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'Chưa đăng nhập' }, { status: 401 });

  const decks = await prisma.deck.findMany({
    where:   { userId: session.user.id },
    include: { _count: { select: { cards: true } } },
    orderBy: { updatedAt: 'desc' },
  });

  return Response.json({ decks });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'Chưa đăng nhập' }, { status: 401 });

  const body = await req.json();
  const parsed = CreateDeckSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const deck = await prisma.deck.create({
    data: { ...parsed.data, userId: session.user.id },
  });

  return Response.json({ deck }, { status: 201 });
}
