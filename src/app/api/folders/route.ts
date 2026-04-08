// GET /api/folders — list all folders for current user
// POST /api/folders — create a new folder
import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const FolderSchema = z.object({
  name: z.string().min(1).max(60),
  icon: z.string().default('📁'),
  type: z.enum(['FLASHCARD', 'QUIZ']).default('FLASHCARD'),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'Chưa đăng nhập' }, { status: 401 });

  const folders = await prisma.folder.findMany({
    where: { userId: session.user.id },
    include: { _count: { select: { decks: true } } },
    orderBy: { createdAt: 'asc' },
  });

  return Response.json({ folders });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'Chưa đăng nhập' }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = FolderSchema.safeParse(body);
    if (!parsed.success) return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });

    const folder = await prisma.folder.create({
      data: { ...parsed.data, userId: session.user.id },
      include: { _count: { select: { decks: true } } },
    });

    return Response.json({ folder }, { status: 201 });
  } catch (err: any) {
    return Response.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
