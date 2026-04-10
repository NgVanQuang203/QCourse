// PATCH /api/folders/[folderId] — rename or change icon
// DELETE /api/folders/[folderId] — delete folder (decks become un-foldered)
import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const UpdateSchema = z.object({
  name: z.string().min(1).max(60).optional(),
  icon: z.string().optional(),
});

export async function PATCH(req: NextRequest, props: { params: Promise<{ folderId: string }> }) {
  const { folderId } = await props.params;
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'Chưa đăng nhập' }, { status: 401 });

  const folder = await prisma.folder.findFirst({
    where: { id: folderId, userId: session.user.id },
  });
  if (!folder) return Response.json({ error: 'Không tìm thấy thư mục' }, { status: 404 });

  const body = await req.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const updated = await prisma.folder.update({
    where: { id: folderId },
    data: parsed.data,
    include: { _count: { select: { decks: true } } },
  });

  return Response.json({ folder: updated });
}

export async function DELETE(_: NextRequest, props: { params: Promise<{ folderId: string }> }) {
  const { folderId } = await props.params;
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'Chưa đăng nhập' }, { status: 401 });

  const folder = await prisma.folder.findFirst({
    where: { id: folderId, userId: session.user.id },
  });
  if (!folder) return Response.json({ error: 'Không tìm thấy thư mục' }, { status: 404 });

  // Delete all decks in this folder first (cascade delete logic)
  await prisma.deck.deleteMany({
    where: { folderId, userId: session.user.id },
  });
  await prisma.folder.delete({ where: { id: folderId } });

  return Response.json({ ok: true });
}
