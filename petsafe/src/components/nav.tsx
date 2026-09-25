"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/today", label: "오늘", icon: "✅" },
  { href: "/pets", label: "우리 아이", icon: "🐾" },
  { href: "/map", label: "지도", icon: "📍" },
  { href: "/records", label: "기록", icon: "📒" },
  { href: "/more", label: "더보기", icon: "☰" },
];

const DESKTOP = [
  { href: "/today", label: "오늘" },
  { href: "/pets", label: "우리 아이" },
  { href: "/map", label: "지도" },
  { href: "/records", label: "기록" },
  { href: "/health", label: "건강" },
  { href: "/insurance", label: "보험" },
  { href: "/reports", label: "신고" },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="주요 메뉴" className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-line pb-[env(safe-area-inset-bottom)]">
      <ul className="grid grid-cols-5">
        {TABS.map((t) => {
          const active = isActive(pathname, t.href);
          return (
            <li key={t.href}>
              <Link href={t.href} aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center justify-center min-h-[60px] text-xs font-bold ${active ? "text-primary" : "text-muted"}`}>
                <span aria-hidden="true" className="text-lg leading-none mb-1">{t.icon}</span>
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function DesktopNav({ isStaff }: { isStaff: boolean }) {
  const pathname = usePathname();
  const items = isStaff ? [...DESKTOP, { href: "/admin", label: "관리" }] : DESKTOP;
  return (
    <nav aria-label="주요 메뉴" className="hidden md:flex items-center gap-1 ml-4">
      {items.map((t) => (
        <Link key={t.href} href={t.href} aria-current={isActive(pathname, t.href) ? "page" : undefined}
          className={`px-3 py-2 rounded-lg font-bold text-sm ${isActive(pathname, t.href) ? "bg-[#E6F4F1] text-primary" : "text-ink hover:bg-slate-100"}`}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
