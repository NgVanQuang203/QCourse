// POST /api/quiz/submit — Save a completed quiz attempt
import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { scoreQuizAttempt, getVNDateStr, computeNewStreak } from '@/lib/algorithms/sm2';

const AnswerSchema = z.object({
  cardId:       z.string(),
  chosenIndex:  z.number().min(0).max(3),
  correctIndex: z.number().min(0).max(3),
  timeSec:      z.number().min(0),
});

const SubmitSchema = z.object({
  deckId:       z.string(),
  answers:      z.array(AnswerSchema).min(1),
  timeLimitSec: z.number().min(10).max(300).default(60),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'Chưa đăng nhập' }, { status: 401 });

  const body = await req.json();
  const parsed = SubmitSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const { deckId, answers, timeLimitSec } = parsed.data;
  const userId = session.user.id;

  // Verify deck exists
  const deck = await prisma.deck.findFirst({ where: { id: deckId } });
  if (!deck) return Response.json({ error: 'Không tìm thấy bộ đề' }, { status: 404 });

  // Score the attempt
  const result = scoreQuizAttempt(answers, timeLimitSec);
  const timeTakenSec = answers.reduce((sum, a) => sum + a.timeSec, 0);

  // Save attempt
  const attempt = await prisma.quizAttempt.create({
    data: {
      userId, deckId,
      score:          result.correct,
      totalQuestions: result.total,
      timeTakenSec:   Math.round(timeTakenSec),
      grade:          result.grade,
      answers,
    },
  });

  // Update activity log
  const today = getVNDateStr();
  await prisma.activityLog.upsert({
    where:  { userId_date: { userId, date: today } },
    create: { userId, date: today, minutesStudied: Math.ceil(timeTakenSec / 60), cardsStudied: result.total, deckIds: [deckId] },
    update: { minutesStudied: { increment: Math.ceil(timeTakenSec / 60) }, cardsStudied: { increment: result.total } },
  });

  // Update streak
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { streak: true, maxStreak: true, lastActiveDate: true },
  });
  if (user) {
    const { newStreak, newMax } = computeNewStreak(user.streak, user.maxStreak, user.lastActiveDate);
    await prisma.user.update({ where: { id: userId }, data: { streak: newStreak, maxStreak: newMax, lastActiveDate: today } });
  }

  return Response.json({
    attempt: { id: attempt.id, ...result },
  }, { status: 201 });
}
