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

  const userId = session.user.id;
  const now = new Date();

  const decks = await prisma.deck.findMany({
    where:   { userId },
    include: {
      _count: { select: { cards: true } },
      cards: {
        select: {
          sm2Progress: {
            where: { userId },
            select: { nextDueDate: true, repetitions: true }
          }
        }
      }
    },
    orderBy: { updatedAt: 'desc' },
  });

  // Map to include calculated stats
  const decksWithStats = decks.map(deck => {
    const total = deck._count.cards;
    const dueCount = deck.cards.filter(c => 
      c.sm2Progress.length > 0 && c.sm2Progress[0].nextDueDate <= now
    ).length + (total - deck.cards.filter(c => c.sm2Progress.length > 0).length); // New cards are also "due"

    const mastered = deck.cards.filter(c => 
      c.sm2Progress.length > 0 && c.sm2Progress[0].repetitions >= 2
    ).length;

    return {
      ...deck,
      dueCount,
      masteredCount: mastered,
      // Remove the raw cards data to keep the response light
      cards: undefined 
    };
  });

  return Response.json({ decks: decksWithStats });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'Chưa đăng nhập' }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = CreateDeckSchema.safeParse(body);
    if (!parsed.success) return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });

    const deck = await prisma.deck.create({
      data: { ...parsed.data, userId: session.user.id },
    });

    return Response.json({ deck }, { status: 201 });
  } catch (err: any) {
    console.error('POST /api/decks error:', err);
    return Response.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
