// src/lib/auth.ts
// NextAuth.js v5 configuration
// Docs: https://authjs.dev/

import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import bcrypt from 'bcryptjs';
import { prisma } from './db';

// Extend the default Session/JWT types
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      streak?: number;
    };
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  // ── Prisma adapter for DB session storage ─────────────────────────────────
  adapter: PrismaAdapter(prisma) as Parameters<typeof NextAuth>[0]['adapter'],

  // ── Providers ──────────────────────────────────────────────────────────────
  providers: [
    // Google OAuth
    Google({
      clientId:     process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt:        'consent',
          access_type:   'offline',
          response_type: 'code',
        },
      },
    }),

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
          id:    user.id,
          email: user.email,
          name:  user.name,
          image: user.image,
        };
      },
    }),
  ],

  // ── Callbacks ──────────────────────────────────────────────────────────────
  callbacks: {
    async session({ session, token }) {
      if (token.sub && session.user) {
        session.user.id = token.sub;

        // Attach streak to session (read from DB — cached in Redis in production)
        try {
          const user = await prisma.user.findUnique({
            where:  { id: token.sub },
            select: { streak: true },
          });
          session.user.streak = user?.streak ?? 0;
        } catch {
          session.user.streak = 0;
        }
      }
      return session;
    },

    async jwt({ token, user }) {
      if (user) token.sub = user.id;
      return token;
    },
  },

  // ── Custom pages ───────────────────────────────────────────────────────────
  pages: {
    signIn:  '/auth/login',
    newUser: '/onboarding',     // Redirect new users to onboarding
    error:   '/auth/error',
  },

  // ── Session strategy ───────────────────────────────────────────────────────
  session: {
    strategy:  'jwt',
    maxAge:    30 * 24 * 60 * 60, // 30 days
  },
});
