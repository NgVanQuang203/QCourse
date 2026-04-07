// POST /api/cards/[cardId]/review — Record SM-2 review for a flashcard
// Body: { quality: 0 | 3 | 4 | 5 }
//   0 = Again (blackout), 3 = Hard, 4 = Good, 5 = Easy
import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { calculateSM2, getVNDateStr, computeNewStreak } from '@/lib/algorithms/sm2';

type Ctx = { params: Promise<{ cardId: string }> };

const ReviewSchema = z.object({
  quality:        z.union([z.literal(0), z.literal(3), z.literal(4), z.literal(5)]),
  minutesSession: z.number().min(0).max(600).default(1), // Track time spent
});

export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'Chưa đăng nhập' }, { status: 401 });

  const { cardId } = await params;
  const body = await req.json();
  const parsed = ReviewSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const { quality, minutesSession } = parsed.data;
  const userId = session.user.id;

  // Get or create SM2 progress for this card
  let progress = await prisma.sM2Progress.findUnique({
    where: { userId_cardId: { userId, cardId } },
  });

  const currentState = {
    interval:     progress?.interval    ?? 1,
    repetitions:  progress?.repetitions ?? 0,
    easeFactor:   progress?.easeFactor  ?? 2.5,
    nextDueDate:  progress?.nextDueDate ?? new Date(),
  };

  const newState = calculateSM2(currentState, quality);

  // Upsert SM2 progress
  progress = await prisma.sM2Progress.upsert({
    where:  { userId_cardId: { userId, cardId } },
    create: {
      userId, cardId,
      interval:     newState.interval,
      repetitions:  newState.repetitions,
      easeFactor:   newState.easeFactor,
      nextDueDate:  newState.nextDueDate,
      lastReviewed: new Date(),
      lastQuality:  quality,
    },
    update: {
      interval:     newState.interval,
      repetitions:  newState.repetitions,
      easeFactor:   newState.easeFactor,
      nextDueDate:  newState.nextDueDate,
      lastReviewed: new Date(),
      lastQuality:  quality,
    },
  });

  // ── Update daily activity log (upsert) ────────────────────────────────────
  const today = getVNDateStr();
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    select: { deckId: true },
  });

  if (card) {
    await prisma.activityLog.upsert({
      where:  { userId_date: { userId, date: today } },
      create: {
        userId, date: today,
        minutesStudied: minutesSession,
        cardsStudied:   1,
        deckIds:        [card.deckId],
      },
      update: {
        minutesStudied: { increment: minutesSession },
        cardsStudied:   { increment: 1 },
        deckIds:        { push: card.deckId },
      },
    });
  }

  // ── Update streak ─────────────────────────────────────────────────────────
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { streak: true, maxStreak: true, lastActiveDate: true },
  });

  if (user) {
    const { newStreak, newMax } = computeNewStreak(
      user.streak, user.maxStreak, user.lastActiveDate
    );
    await prisma.user.update({
      where: { id: userId },
      data:  { streak: newStreak, maxStreak: newMax, lastActiveDate: today },
    });
  }

  return Response.json({
    sm2: {
      interval:    newState.interval,
      repetitions: newState.repetitions,
      easeFactor:  Number(newState.easeFactor.toFixed(2)),
      nextDueDate: newState.nextDueDate,
    },
  });
}
