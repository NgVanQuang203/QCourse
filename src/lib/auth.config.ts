import type { NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';

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
      allowDangerousEmailAccountLinking: true,
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

    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      
      const isAuthPage = nextUrl.pathname.startsWith('/auth');
      const isPublicPage = nextUrl.pathname === '/'; // Landing page
      
      // Explicitly protect library, flashcard, quiz, and profile paths
      const isProtectedRoute = 
        nextUrl.pathname.startsWith('/library') || 
        nextUrl.pathname.startsWith('/flashcard') || 
        nextUrl.pathname.startsWith('/quiz') || 
        nextUrl.pathname.startsWith('/profile');

      if (isAuthPage) {
        // If logged in, don't show login/register pages
        if (isLoggedIn) return Response.redirect(new URL('/', nextUrl));
        return true;
      }

      if (isProtectedRoute) {
        if (isLoggedIn) return true;
        return false; // Force redirect to sign in
      }

      // Allow all other public pages
      return true;
    },
  },
  // ── Custom pages ───────────────────────────────────────────────────────────
  pages: {
    signIn:  '/auth/login',
    // newUser: '/onboarding', // Remove to prevent 404 on new Google signup
    error:   '/auth/error',
  },
  // ── Session strategy ───────────────────────────────────────────────────────
  session: {
    strategy:  'jwt',
    maxAge:    30 * 24 * 60 * 60, // 30 days
  },
} satisfies NextAuthConfig;
