import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import Navbar from "@/components/Navbar";
import { ThemeProvider } from "@/components/ThemeProvider";
import { SessionProvider } from "@/components/SessionProvider";
import { auth } from "@/lib/auth";

import { StoreWrapper } from "@/components/StoreWrapper";
import { ToastProvider } from "@/components/Toast";
import "./globals.css";

const font = Be_Vietnam_Pro({
  variable: "--font-sans",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Q-Card | Nền Tảng Học Tập Thông Minh",
  description: "Flashcard & trắc nghiệm với thuật toán Spaced Repetition SM-2",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html lang="vi" suppressHydrationWarning className={`${font.variable}`}>
      <body>
        <ThemeProvider>
          <SessionProvider session={session}>
            <StoreWrapper>
              <ToastProvider>
                <Navbar />
                {/* Offset fixed navbar */}
                <div style={{ paddingTop: 'var(--nav-height)' }}>
                  {children}
                </div>
              </ToastProvider>
            </StoreWrapper>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

