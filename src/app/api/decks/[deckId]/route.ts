// GET /api/decks/[deckId] — get single deck + cards
// PATCH /api/decks/[deckId] — update deck
// DELETE /api/decks/[deckId] — delete deck
import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

type Ctx = { params: Promise<{ deckId: string }> };

async function getDeckOrFail(deckId: string, userId: string) {
  const deck = await prisma.deck.findFirst({ where: { id: deckId, userId } });
  return deck;
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'Chưa đăng nhập' }, { status: 401 });

  const { deckId } = await params;
  const deck = await prisma.deck.findFirst({
    where:   { id: deckId, userId: session.user.id },
    include: { 
      cards: { 
        orderBy: { createdAt: 'asc' },
        include: {
          sm2Progress: {
                where: { userId: session.user.id }
          }
        }
      } 
    },
  });

  if (!deck) return Response.json({ error: 'Không tìm thấy' }, { status: 404 });
  return Response.json({ deck });
}

const PatchSchema = z.object({
  name:         z.string().min(1).max(100).optional(),
  description:  z.string().max(500).optional(),
  color:        z.string().optional(),
  timeLimitSec: z.number().min(10).max(300).optional(),
  isPublic:     z.boolean().optional(),
  folderId:     z.string().nullable().optional(),   // ← FIX: allow moving between folders
  type:         z.enum(['FLASHCARD', 'QUIZ']).optional(),
});

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'Chưa đăng nhập' }, { status: 401 });

  const { deckId } = await params;
  const deck = await getDeckOrFail(deckId, session.user.id);
  if (!deck) return Response.json({ error: 'Không tìm thấy' }, { status: 404 });

  const body = await req.json();
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const updated = await prisma.deck.update({
    where: { id: deckId },
    data:  parsed.data,
  });

  return Response.json({ deck: updated });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'Chưa đăng nhập' }, { status: 401 });

  const { deckId } = await params;
  const deck = await getDeckOrFail(deckId, session.user.id);
  if (!deck) return Response.json({ error: 'Không tìm thấy' }, { status: 404 });

  await prisma.deck.delete({ where: { id: deckId } });
  return Response.json({ ok: true });
}
