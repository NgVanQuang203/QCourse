import NextAuth from "next-auth";
import { authConfig } from "./lib/auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  // Protect all routes except auth-related and static assets
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
