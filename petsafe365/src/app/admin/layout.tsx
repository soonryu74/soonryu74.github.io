"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Forbidden, Loading, LoginRequired } from "@/components/ui";
import { useSession } from "@/lib/hooks";

// 이 화면 차단은 사용 편의를 위한 것일 뿐이다. 실제 권한 통제는 DB 의 RLS 정책이 한다.
// (화면을 우회해도 RLS 가 관리자·검수자가 아닌 계정의 읽기·쓰기를 막아야 한다.)
const NAV = [
  { href: "/admin", label: "대시보드" },
  { href: "/admin/content", label: "콘텐츠" },
  { href: "/admin/contacts", label: "연락처" },
  { href: "/admin/facilities", label: "시설" },
  { href: "/admin/legal", label: "문서 버전" },
  { href: "/admin/flags", label: "기능 플래그" },
  { href: "/admin/audit", label: "감사로그" },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useSession();
  const pathname = usePathname();
  if (loading) return <Loading />;
  if (!user) return <LoginRequired what="운영 화면" />;
  if (user.role !== "admin" && user.role !== "reviewer") return <Forbidden />;
  return (
    <>
      <nav aria-label="운영 메뉴" className="-mx-4 overflow-x-auto px-4">
        <ul className="flex w-max gap-1">
          {NAV.map((n) => {
            const active = n.href === "/admin" ? pathname === "/admin" : pathname === n.href || pathname.startsWith(n.href + "/");
            return (
              <li key={n.href}>
                <Link href={n.href} aria-current={active ? "page" : undefined} className={`inline-flex min-h-12 items-center whitespace-nowrap rounded-[10px] px-3 font-medium ${active ? "bg-tint text-brand" : "text-muted hover:text-ink"}`}>
                  {n.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      {children}
    </>
  );
}
