import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { AppShell } from "@/components/AppShell";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "펫안심365", template: "%s | 펫안심365" },
  description: "오늘 할 일부터, 위급한 순간까지. 반려견·반려묘 보호자를 위한 안전 플랫폼.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = { themeColor: "#27308f", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
