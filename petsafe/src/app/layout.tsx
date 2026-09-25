import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  title: { default: "펫안심365 — 오늘 할 일부터, 위급한 순간까지", template: "%s | 펫안심365" },
  description: "반려견·반려묘의 오늘 할 일, 긴급 도움, 주변 동물병원, 보험 약관 확인, 분실·학대 신고, 인수공통감염병 예방정보를 한 흐름으로.",
  manifest: "/manifest.webmanifest",
  robots: { index: false, follow: false }, // 정식 공개 전까지 검색 노출 차단
};

export const viewport: Viewport = { themeColor: "#0F766E", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
