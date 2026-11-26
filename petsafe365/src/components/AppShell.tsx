"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { SessionProvider } from "@/lib/hooks";
import { isExampleMode } from "@/lib/repo";

const TABS = [
  { href: "/today", label: "오늘" },
  { href: "/pets", label: "우리 아이" },
  { href: "/map", label: "지도" },
  { href: "/shop", label: "용품" },
  { href: "/more", label: "더보기" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const active = (href: string) => pathname === href || pathname.startsWith(href + "/");
  return (
    <SessionProvider>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-card focus:px-3 focus:py-2">
        본문으로 건너뛰기
      </a>
      {isExampleMode ? (
        <p role="note" className="bg-warn px-4 py-1.5 text-center text-sm text-white">
          예시 모드예요. 입력한 내용은 이 기기에만 저장되고 실제 서비스 데이터가 아니에요.
        </p>
      ) : null}
      <header className="sticky top-0 z-20 border-b border-line bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-2">
          <Link href="/" className="shrink-0 text-lg font-bold text-brand">
            펫안심365
          </Link>
          <nav aria-label="주요 메뉴" className="hidden flex-1 gap-1 md:flex">
            {TABS.map((t) => (
              <Link key={t.href} href={t.href} aria-current={active(t.href) ? "page" : undefined} className={`rounded-[10px] px-3 py-2 font-medium ${active(t.href) ? "bg-tint text-brand" : "text-muted hover:text-ink"}`}>
                {t.label}
              </Link>
            ))}
          </nav>
          <Link href="/emergency" className="ml-auto inline-flex min-h-11 items-center gap-1.5 rounded-[12px] bg-danger px-3 font-semibold text-white">
            <span aria-hidden="true">✚</span> 긴급 도움
          </Link>
        </div>
      </header>
      <main id="main" className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 pb-28 pt-6 md:pb-12">
        {children}
      </main>
      <nav aria-label="하단 메뉴" className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-card pb-[env(safe-area-inset-bottom)] md:hidden">
        <ul className="mx-auto grid max-w-lg grid-cols-5">
          {TABS.map((t) => (
            <li key={t.href}>
              <Link href={t.href} aria-current={active(t.href) ? "page" : undefined} className={`flex min-h-14 items-center justify-center text-sm font-medium ${active(t.href) ? "text-brand" : "text-muted"}`}>
                <span className={active(t.href) ? "border-b-2 border-brand pb-0.5" : ""}>{t.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </SessionProvider>
  );
}
