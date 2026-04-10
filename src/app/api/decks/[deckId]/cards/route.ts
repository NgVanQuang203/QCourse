// POST /api/decks/[deckId]/cards — Add card(s) to a deck
// Supports single card or bulk array
import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

type Ctx = { params: Promise<{ deckId: string }> };

const CardSchema = z.object({
  front:              z.string().min(1),
  back:               z.string(),
  hint:               z.string().optional(),
  imageUrl:           z.string().url().optional(),
  // Quiz fields
  options:            z.array(z.string()).min(2).max(4).optional(),
  correctOptionIndex: z.number().min(0).max(3).optional(),
});

const BulkSchema = z.object({
  cards: z.array(CardSchema).min(1).max(500),
});

export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'Chưa đăng nhập' }, { status: 401 });

  const { deckId } = await params;
  
  const deck = await prisma.deck.findFirst({ where: { id: deckId, userId: session.user.id } });
  if (!deck) return Response.json({ error: 'Không tìm thấy' }, { status: 404 });

  let body;
  try {
    body = await req.json();
  } catch (err: any) {
    console.error('JSON Parse Error in POST cards:', err?.message);
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Accept both single card or { cards: [...] }
  const dataToValidate = Array.isArray(body.cards)
    ? body
    : { cards: [body] };

  const parsed = BulkSchema.safeParse(dataToValidate);
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });

  try {
    let count = 0;
    for (const c of parsed.data.cards) {
      await prisma.card.create({
        data: {
          front: c.front,
          back: c.back,
          hint: c.hint,
          imageUrl: c.imageUrl,
          deckId: deckId,
          options: c.options ? c.options : undefined,
          correctOptionIndex: c.correctOptionIndex,
        }
      });
      count++;
    }

    return Response.json({ count }, { status: 201 });
  } catch (err: any) {
    console.error("Prisma Error logging card insert:", err);
    return Response.json({ error: err?.message || 'Database error occurred' }, { status: 500 });
  }
}
