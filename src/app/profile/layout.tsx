// src/app/profile/layout.tsx
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function ProfileLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/auth/login");
  }
  return <>{children}</>;
}
