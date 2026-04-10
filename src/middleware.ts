import NextAuth from "next-auth";
import { authConfig } from "./lib/auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  // Protect all routes except internal Next.js paths and common static files
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
