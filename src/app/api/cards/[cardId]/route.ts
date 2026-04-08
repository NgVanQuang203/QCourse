// src/app/api/cards/[cardId]/route.ts
// PATCH  /api/cards/[cardId] - Cập nhật nội dung thẻ
// DELETE /api/cards/[cardId] - Xóa thẻ
import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

type Ctx = { params: Promise<{ cardId: string }> };

async function verifyCardOwnership(cardId: string, userId: string) {
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    include: { deck: true },
  });
  if (!card || card.deck.userId !== userId) return null;
  return card;
}

const UpdateCardSchema = z.object({
  front:              z.string().min(1).optional(),
  back:               z.string().min(1).optional(),
  hint:               z.string().optional(),
  imageUrl:           z.string().url().optional(),
  options:            z.array(z.string()).length(4).optional(),
  correctOptionIndex: z.number().min(0).max(3).optional(),
});

export async function GET(req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'Chưa đăng nhập' }, { status: 401 });

  const { cardId } = await params;
  const card = await verifyCardOwnership(cardId, session.user.id);
  
  if (!card) return Response.json({ error: 'Không tìm thấy thẻ hoặc không có quyền truy cập' }, { status: 404 });

  return Response.json({ card });
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'Chưa đăng nhập' }, { status: 401 });

  const { cardId } = await params;
  const card = await verifyCardOwnership(cardId, session.user.id);
  if (!card) return Response.json({ error: 'Không tìm thấy thẻ hoặc không có quyền truy cập' }, { status: 404 });

  const body = await req.json();
  const parsed = UpdateCardSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const updated = await prisma.card.update({
    where: { id: cardId },
    data: parsed.data,
  });

  return Response.json({ card: updated });
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'Chưa đăng nhập' }, { status: 401 });

  const { cardId } = await params;
  const card = await verifyCardOwnership(cardId, session.user.id);
  if (!card) return Response.json({ error: 'Không tìm thấy thẻ hoặc không có quyền truy cập' }, { status: 404 });

  await prisma.card.delete({
    where: { id: cardId },
  });

  return Response.json({ ok: true });
}
