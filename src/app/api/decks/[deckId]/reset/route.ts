import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

type Ctx = { params: Promise<{ deckId: string }> };

export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'Chưa đăng nhập' }, { status: 401 });

  const { deckId } = await params;
  const userId = session.user.id;

  try {
    const deck = await prisma.deck.findUnique({
      where: { id: deckId },
      include: { cards: { select: { id: true } } },
    });

    if (!deck || deck.userId !== userId) {
      return Response.json({ error: 'Không thể reset bộ tài liệu này' }, { status: 403 });
    }

    // Reset Flashcard SM2 progress
    const cardIds = deck.cards.map(c => c.id);
    if (cardIds.length > 0) {
      await prisma.sM2Progress.deleteMany({
        where: { userId, cardId: { in: cardIds } },
      });
    }

    // Reset Quiz attempt history
    await prisma.quizAttempt.deleteMany({
      where: { userId, deckId },
    });

    return Response.json({ ok: true });
  } catch (err: any) {
    console.error('Reset Progress ERR:', err);
    return Response.json({ error: 'Không thể reset tiến độ' }, { status: 500 });
  }
}
