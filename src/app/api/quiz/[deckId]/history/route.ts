import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

type Ctx = { params: Promise<{ deckId: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'Chưa đăng nhập' }, { status: 401 });

  const userId = session.user.id;
  const { deckId } = await params;

  try {
    const attempts = await prisma.quizAttempt.findMany({
      where: { userId, deckId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const highest = await prisma.quizAttempt.findFirst({
      where: { userId, deckId },
      orderBy: { score: 'desc' },
    });

    return Response.json({ attempts, highestScore: highest?.score ?? 0 });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
