import type { NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';

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

  interface User {
    streak?: number;
  }
}


export const authConfig = {
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
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

    // Email + Password - authorize logic must be in auth.ts if it needs Prisma, 
    // BUT NextAuth v5 docs say credentials provider CAN be used if prisma gets imported.
    // Wait, if we import prisma here, it breaks Edge again.
    // However, Credentials provider is only executed on the Node runtime (during login action), 
    // so we can actually keep it in auth.ts or pass the authorize function conditionally.
  ],
  // ── Callbacks ──────────────────────────────────────────────────────────────
  callbacks: {
    async session({ session, token }) {
      if (token.sub && session.user) {
        session.user.id = token.sub;
        session.user.streak = (token.streak as number) ?? 0;
      }
      return session;
    },

    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.sub = user.id;
        token.streak = user.streak ?? 0;
      }
      if (trigger === "update" && session?.streak !== undefined) {
        token.streak = session.streak;
      }
      return token;
    },
  },
  // ── Custom pages ───────────────────────────────────────────────────────────
  pages: {
    signIn:  '/auth/login',
    newUser: '/onboarding',
    error:   '/auth/error',
  },
  // ── Session strategy ───────────────────────────────────────────────────────
  session: {
    strategy:  'jwt',
    maxAge:    30 * 24 * 60 * 60, // 30 days
  },
} satisfies NextAuthConfig;
