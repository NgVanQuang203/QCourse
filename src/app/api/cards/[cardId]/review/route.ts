// POST /api/cards/[cardId]/review — Record FSRS review (Force Rebuild #1)
// Body: { quality: 1 | 2 | 3 | 4 }
//   1 = Again, 2 = Hard, 3 = Good, 4 = Easy
import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { calculateFSRS, Rating, State, initFSRSState } from '@/lib/algorithms/fsrs';
import { getVNDateStr } from '@/lib/utils/date';
import { computeNewStreak } from '@/lib/utils/streak';

type Ctx = { params: Promise<{ cardId: string }> };

const ReviewSchema = z.object({
  quality:        z.number().min(1).max(5), // 1=Again, 2=Hard, 3=Hard (legacy), 4=Good, 5=Easy
  minutesSession: z.number().min(0).max(600).default(1),
});

export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'Chưa đăng nhập' }, { status: 401 });

  const { cardId } = await params;
  const body = await req.json();
  const parsed = ReviewSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const { quality: rawQuality, minutesSession } = parsed.data;
  const userId = session.user.id;

  // Map quality to FSRS Rating
  let rating: Rating;
  if (rawQuality === 1) rating = Rating.Again;
  else if (rawQuality === 2 || rawQuality === 3) rating = Rating.Hard; // 3 was 'Hard' in old SM2 UI
  else if (rawQuality === 4) rating = Rating.Good;
  else rating = Rating.Easy;

  // Get current progress
  let progress = await prisma.sM2Progress.findUnique({
    where: { userId_cardId: { userId, cardId } },
  });

  // Initialize or Migrate from SM2
  const currentState = progress ? {
    stability:     progress.stability || 0,
    difficulty:    progress.difficulty || 0,
    elapsedDays:   progress.elapsedDays || 0,
    scheduledDays: progress.scheduledDays || 0,
    reps:          progress.reps || progress.repetitions || 0,
    lapses:        progress.lapses || 0,
    state:         (progress.state as State) || (progress.repetitions > 0 ? State.Review : State.New),
    lastReview:    progress.lastReviewed || undefined,
    nextDueDate:   progress.nextDueDate,
  } : initFSRSState();

  // If this is the first FSRS review but we have SM2 history, estimate initial stability
  if (progress && progress.stability === 0 && progress.interval > 0) {
    currentState.stability = progress.interval; // Simple heuristic: use previous interval
    currentState.difficulty = 5.0; // Default middle difficulty
  }

  const newState = calculateFSRS(currentState, rating, new Date());

  // Update progress
  const updatedProgress = await prisma.sM2Progress.upsert({
    where:  { userId_cardId: { userId, cardId } },
    create: {
      userId, cardId,
      stability:     newState.stability,
      difficulty:    newState.difficulty,
      elapsedDays:   newState.elapsedDays,
      scheduledDays: newState.scheduledDays,
      reps:          newState.reps,
      lapses:        newState.lapses,
      state:         newState.state,
      nextDueDate:   newState.nextDueDate,
      lastReviewed:  new Date(),
      lastQuality:   rawQuality,
      // Keep legacy fields updated for compatibility
      interval:      Math.round(newState.scheduledDays) || 1,
      repetitions:   newState.reps,
      easeFactor:    2.5, // Not used by FSRS
    },
    update: {
      stability:     newState.stability,
      difficulty:    newState.difficulty,
      elapsedDays:   newState.elapsedDays,
      scheduledDays: newState.scheduledDays,
      reps:          newState.reps,
      lapses:        newState.lapses,
      state:         newState.state,
      nextDueDate:   newState.nextDueDate,
      lastReviewed:  new Date(),
      lastQuality:   rawQuality,
      interval:      Math.round(newState.scheduledDays) || 1,
      repetitions:   newState.reps,
    },
  });

  // ── Update daily activity log ──
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

  // ── Update streak ──
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
    fsrs: {
      stability:     newState.stability,
      difficulty:    newState.difficulty,
      scheduledDays: newState.scheduledDays,
      nextDueDate:   newState.nextDueDate,
    },
  });
}
