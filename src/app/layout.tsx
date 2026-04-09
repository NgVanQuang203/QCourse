import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import Navbar from "@/components/Navbar";
import { ThemeProvider } from "@/components/ThemeProvider";
import { SessionProvider } from "@/components/SessionProvider";
import { StoreWrapper } from "@/components/StoreWrapper";
import "./globals.css";


const font = Be_Vietnam_Pro({
  variable: "--font-sans",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: "Q-Card | Nền Tảng Học Tập Thông Minh",
  description: "Flashcard & trắc nghiệm với thuật toán Spaced Repetition SM-2",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning className={`${font.variable}`}>
      <body>
        <ThemeProvider>
          <SessionProvider>
            <StoreWrapper>
              <Navbar />
              {/* Offset fixed navbar */}
              <div style={{ paddingTop: 'var(--nav-height)' }}>
                {children}
              </div>
              <Toaster 
                position="bottom-right"
                toastOptions={{
                  style: {
                    background: 'var(--surface-hover)',
                    color: 'var(--foreground)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    fontWeight: 600,
                  },
                }}
              />
            </StoreWrapper>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

