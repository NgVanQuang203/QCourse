// src/lib/auth.ts
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import bcrypt from 'bcryptjs';
import { prisma } from './db';
import { authConfig } from './auth.config';

import type { NextAuthConfig } from 'next-auth';

const config: NextAuthConfig = {
  ...authConfig,
  adapter: PrismaAdapter(prisma),

  providers: [
    ...authConfig.providers,
    // Email + Password
    Credentials({
      name: 'Email & Mật khẩu',
      credentials: {
        email:    { label: 'Email',     type: 'email'    },
        password: { label: 'Mật khẩu', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        // No user or Google-only account (no password)
        if (!user?.passwordHash) return null;

        const passwordValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );

        if (!passwordValid) return null;

        return {
          id:     user.id,
          email:  user.email,
          name:   user.name,
          image:  user.image,
          streak: user.streak,
        };
      },
    }),
  ],
};

export const { handlers, auth, signIn, signOut } = NextAuth(config);
