// src/app/library/layout.tsx
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function LibraryLayout({ children }: { children: React.ReactNode }) {
  // Server-side auth verification (Iron-clad: checks DB existence)
  const session = await auth();
  
  if (!session?.user) {
    redirect("/auth/login");
  }

  return <>{children}</>;
}
