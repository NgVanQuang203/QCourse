'use client';
// Wrapper to provide NextAuth session to client components
import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';

export function SessionProvider({ children, session }: { children: ReactNode, session?: any }) {
  // session prop allows instant hydration from server side
  return <NextAuthSessionProvider session={session} refetchInterval={30}>{children}</NextAuthSessionProvider>;
}

