import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const BulkMoveSchema = z.object({
  ids: z.array(z.string()),
  folderId: z.string().nullable(),
});

const BulkDeleteSchema = z.object({
  ids: z.array(z.string()),
});

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'Chưa đăng nhập' }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = BulkMoveSchema.safeParse(body);
    if (!parsed.success) return Response.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 });

    const { ids, folderId } = parsed.data;

    await prisma.deck.updateMany({
      where: {
        id: { in: ids },
        userId: session.user.id,
      },
      data: { folderId },
    });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: 'Lỗi server' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'Chưa đăng nhập' }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = BulkDeleteSchema.safeParse(body);
    if (!parsed.success) return Response.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 });

    const { ids } = parsed.data;

    await prisma.deck.deleteMany({
      where: {
        id: { in: ids },
        userId: session.user.id,
      },
    });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
