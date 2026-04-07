// src/middleware.ts — Route protection
// Runs on every request BEFORE the page renders (Edge runtime)
import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

// Routes that require authentication
const PROTECTED = ['/profile', '/flashcard', '/quiz', '/library'];
// Routes that should redirect AWAY if already logged in
const AUTH_ROUTES = ['/auth/login', '/auth/register'];

export default auth((req) => {
  const { nextUrl, auth: session } = req;
  const isLoggedIn = !!session?.user;
  const path = nextUrl.pathname;

  // Redirect logged-in users away from login/register
  if (isLoggedIn && AUTH_ROUTES.some(r => path.startsWith(r))) {
    return NextResponse.redirect(new URL('/', nextUrl));
  }

  // Redirect unauthenticated users to login
  if (!isLoggedIn && PROTECTED.some(r => path.startsWith(r))) {
    const loginUrl = new URL('/auth/login', nextUrl);
    loginUrl.searchParams.set('callbackUrl', path);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  // Run middleware on all routes except static files and Next.js internals
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
};
