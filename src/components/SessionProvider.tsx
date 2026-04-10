'use client';
// Wrapper to provide NextAuth session to client components
import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';

export function SessionProvider({ children }: { children: ReactNode }) {
  // refetchInterval: 30 seconds - to sync session state with DB deletions
  return <NextAuthSessionProvider refetchInterval={30}>{children}</NextAuthSessionProvider>;
}
