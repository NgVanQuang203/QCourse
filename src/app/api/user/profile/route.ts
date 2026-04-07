// GET /api/user/profile — get current user profile
// PATCH /api/user/profile — update name, nickname, bio, mood
import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'Chưa đăng nhập' }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true, name: true, nickname: true, email: true,
      image: true, avatarColor: true, mood: true, bio: true,
      streak: true, maxStreak: true, createdAt: true,
    },
  });

  return Response.json({ user });
}

const UpdateSchema = z.object({
  name:        z.string().min(2).max(50).optional(),
  nickname:    z.string().min(2).max(30).optional(),
  bio:         z.string().max(200).optional(),
  mood:        z.string().max(4).optional(),
  avatarColor: z.string().max(100).optional(),
});

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'Chưa đăng nhập' }, { status: 401 });

  const body = await req.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });

  // Check nickname uniqueness if provided
  if (parsed.data.nickname) {
    const existing = await prisma.user.findUnique({
      where: { nickname: parsed.data.nickname },
    });
    if (existing && existing.id !== session.user.id) {
      return Response.json({ error: 'Nickname này đã được sử dụng' }, { status: 409 });
    }
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data:  parsed.data,
    select: { id: true, name: true, nickname: true, bio: true, mood: true, avatarColor: true },
  });

  return Response.json({ user });
}
