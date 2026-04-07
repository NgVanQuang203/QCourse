// POST /api/decks/[deckId]/cards — Add card(s) to a deck
// Supports single card or bulk array
import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

type Ctx = { params: Promise<{ deckId: string }> };

const CardSchema = z.object({
  front:              z.string().min(1),
  back:               z.string().min(1),
  hint:               z.string().optional(),
  imageUrl:           z.string().url().optional(),
  // Quiz fields
  options:            z.array(z.string()).length(4).optional(),
  correctOptionIndex: z.number().min(0).max(3).optional(),
});

const BulkSchema = z.object({
  cards: z.array(CardSchema).min(1).max(500),
});

export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'Chưa đăng nhập' }, { status: 401 });

  const { deckId } = await params;

  // Verify deck ownership
  const deck = await prisma.deck.findFirst({
    where: { id: deckId, userId: session.user.id },
  });
  if (!deck) return Response.json({ error: 'Không tìm thấy' }, { status: 404 });

  const body = await req.json();

  // Accept both single card or { cards: [...] }
  const dataToValidate = Array.isArray(body.cards)
    ? body
    : { cards: [body] };

  const parsed = BulkSchema.safeParse(dataToValidate);
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const created = await prisma.card.createMany({
    data: parsed.data.cards.map(c => ({ ...c, deckId })),
  });

  return Response.json({ count: created.count }, { status: 201 });
}
