// GET /api/decks — list all decks for current user
// POST /api/decks — create a new deck
import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const CreateDeckSchema = z.object({
  name:         z.string().min(1).max(100),
  description:  z.string().max(500).optional().nullable(),
  color:        z.string().default('#6366f1'),
  type:         z.enum(['FLASHCARD', 'QUIZ']).default('FLASHCARD'),
  folderId:     z.string().optional().nullable(),
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
            select: { nextDueDate: true, repetitions: true, interval: true }
          }
        }
      }
    },
    orderBy: { updatedAt: 'desc' },
  });

  // Fetch highest quiz scores in bulk for QUIZ decks
  const quizDeckIds = decks.filter(d => d.type === 'QUIZ').map(d => d.id);
  const highestScores: Record<string, number> = {};
  if (quizDeckIds.length > 0) {
    const topAttempts = await prisma.quizAttempt.findMany({
      where: { userId, deckId: { in: quizDeckIds } },
      orderBy: { score: 'desc' },
      select: { deckId: true, score: true, totalQuestions: true },
    });
    // Keep only highest per deck
    for (const a of topAttempts) {
      if (highestScores[a.deckId] === undefined) {
        // Store as 10-point scale
        highestScores[a.deckId] = a.totalQuestions > 0
          ? parseFloat(((a.score / a.totalQuestions) * 10).toFixed(1))
          : 0;
      }
    }
  }

  // Map to include calculated stats
  const decksWithStats = decks.map(deck => {
    const total = deck._count.cards;

    if (deck.type === 'QUIZ') {
      // Quiz decks: show highest score, no SM2 mastery
      return {
        ...deck,
        dueCount: 0,
        masteredCount: 0,
        learningCount: 0,
        highestScore: highestScores[deck.id] ?? 0,
        cards: undefined,
      };
    }

    // Flashcard decks: full SM2 stats
    const dueCount = deck.cards.filter(c =>
      c.sm2Progress.length > 0 && c.sm2Progress[0].nextDueDate <= now
    ).length + (total - deck.cards.filter(c => c.sm2Progress.length > 0).length);

    // Mastered: interval >= 7 days (long-term memory proven)
    const mastered = deck.cards.filter(c =>
      c.sm2Progress.length > 0 && c.sm2Progress[0].interval >= 7
    ).length;

    // Learning: reviewed but not yet mastered (1 <= interval < 7)
    const learning = deck.cards.filter(c =>
      c.sm2Progress.length > 0 && c.sm2Progress[0].interval > 0 && c.sm2Progress[0].interval < 7
    ).length;

    const futureDates = deck.cards
      .flatMap(c => c.sm2Progress || [])
      .map(p => new Date(p.nextDueDate).getTime())
      .filter(t => t > now.getTime());
    const nextDue = futureDates.length > 0 ? Math.min(...futureDates) : null;

    return {
      ...deck,
      dueCount,
      masteredCount: mastered,
      learningCount: learning,
      nextDue,
      highestScore: 0,
      cards: undefined,
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
