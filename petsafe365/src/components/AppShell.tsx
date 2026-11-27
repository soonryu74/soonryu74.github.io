"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { SessionProvider } from "@/lib/hooks";
import { isExampleMode } from "@/lib/repo";
import { BRAND, SAFETY_APP_ENABLED, isSafetyRoute } from "@/lib/site";

const SAFETY_TABS = [
  { href: "/today", label: "오늘" },
  { href: "/pets", label: "우리 아이" },
  { href: "/map", label: "지도" },
  { href: "/shop", label: "용품" },
  { href: "/more", label: "더보기" },
];
const SHOP_TABS = [
  { href: "/", label: "홈" },
  { href: "/shop", label: "놀이 친구" },
  { href: "/legal", label: "우리 약속" },
  { href: "/more", label: "내 정보" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const tabs = SAFETY_APP_ENABLED ? SAFETY_TABS : SHOP_TABS;
  const active = (href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/"));
  const closed = !SAFETY_APP_ENABLED && isSafetyRoute(pathname);
  const wide = !SAFETY_APP_ENABLED && pathname === "/";
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
          <Link href="/" className="shrink-0 py-2 text-lg font-bold tracking-tight text-brand">
            {BRAND}
          </Link>
          <nav aria-label="주요 메뉴" className="hidden flex-1 gap-1 md:flex">
            {tabs.map((t) => (
              <Link key={t.href} href={t.href} aria-current={active(t.href) ? "page" : undefined} className={`rounded-[10px] px-3 py-2 font-medium ${active(t.href) ? "bg-tint text-brand" : "text-muted hover:text-ink"}`}>
                {t.label}
              </Link>
            ))}
          </nav>
          {SAFETY_APP_ENABLED ? (
            <Link href="/emergency" className="ml-auto inline-flex min-h-11 items-center gap-1.5 rounded-[12px] bg-danger px-3 font-semibold text-white">
              <span aria-hidden="true">✚</span> 긴급 도움
            </Link>
          ) : (
            <Link href="/shop" className="ml-auto inline-flex min-h-11 items-center rounded-[12px] bg-brand px-4 font-semibold text-white">
              놀이 친구 보기
            </Link>
          )}
        </div>
      </header>
      <main id="main" className={`mx-auto flex w-full flex-1 flex-col gap-6 pb-28 md:pb-12 ${wide ? "max-w-none" : "max-w-5xl px-4 pt-6"}`}>
        {closed ? <Closed /> : children}
      </main>
      <nav aria-label="하단 메뉴" className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-card pb-[env(safe-area-inset-bottom)] md:hidden">
        <ul className="mx-auto grid max-w-lg" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
          {tabs.map((t) => (
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

function Closed() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-[16px] border border-dashed border-line px-4 py-12 text-center">
      <h1 className="text-2xl font-bold">이 기능은 지금 닫혀 있어요</h1>
      <p className="text-muted">돌봄 기록과 안전 안내는 준비가 끝나면 다시 열게요. 지금은 놀이 친구 가게만 운영해요.</p>
      <Link href="/shop" className="inline-flex min-h-12 items-center rounded-[14px] bg-brand px-5 font-semibold text-white">
        놀이 친구 보러 가기
      </Link>
    </div>
  );
}
