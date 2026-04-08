// src/app/api/auth/register/route.ts
// [CACHE BUST: FORCING TURBOPACK TO RECOMPILE ROUTE]
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const RegisterSchema = z.object({
  name:     z.string().min(1),
  email:    z.string().email(),
  password: z.string().min(8),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = RegisterSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { name, email, password } = parsed.data;

    // Check if user exists
    const existing = await prisma.user.findUnique({
      where: { email },
    });
    if (existing) {
      return Response.json({ error: 'Email đã được sử dụng.' }, { status: 400 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    // Generate a initial nickname from email
    let nickname = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    
    // Check if nickname is taken, if so, append random string
    const nickTaken = await prisma.user.findUnique({ where: { nickname } });
    if (nickTaken) {
      nickname = `${nickname}${Math.floor(Math.random() * 1000)}`;
    }

    const user = await prisma.user.create({
      data: {
        name: name || 'Người dùng mới',
        email,
        passwordHash: hashedPassword,
        nickname,
        avatarColor: 'linear-gradient(135deg, #6366f1, #a855f7)',
        mood: '😊',
      },
    });

    return Response.json({ ok: true, userId: user.id }, { status: 201 });
  } catch (error: any) {
    console.error('Registration error:', error);
    
    // Provide more detail if Prisma fails
    if (error.code === 'P2002') {
      const target = error.meta?.target?.[0] || 'trường dữ liệu';
      return Response.json({ error: `Thông tin ${target} đã tồn tại.` }, { status: 400 });
    }

    return Response.json({ 
      error: 'Máy chủ gặp lỗi khi đăng ký.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined 
    }, { status: 500 });
  }
}
