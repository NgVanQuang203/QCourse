// POST /api/register — Create a new user account with email + password
import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/db';

const RegisterSchema = z.object({
  name:     z.string().min(2, 'Tên phải có ít nhất 2 ký tự').max(50),
  email:    z.string().email('Email không hợp lệ'),
  password: z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = RegisterSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, email, password } = parsed.data;

    // Check if email already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return Response.json(
        { error: 'Email này đã được sử dụng' },
        { status: 409 }
      );
    }

    // Hash password (cost factor 12)
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: { name, email, passwordHash },
      select: { id: true, name: true, email: true },
    });

    return Response.json({ user }, { status: 201 });
  } catch (err) {
    console.error('[register]', err);
    return Response.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
