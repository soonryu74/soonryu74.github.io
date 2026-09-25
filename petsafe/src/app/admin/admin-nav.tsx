import Link from "next/link";

export function AdminNav({ current }: { current: string }) {
  const items = [["/admin", "대시보드"], ["/admin/content", "콘텐츠 CMS"], ["/admin/facilities", "시설·오류신고"], ["/admin/legal", "문서·연락처"], ["/admin/audit", "감사로그"]];
  return (
    <nav aria-label="운영 메뉴" className="flex flex-wrap gap-2 mb-4">
      {items.map(([href, label]) => <Link key={href} href={href} aria-current={current === href ? "page" : undefined} className={`btn btn-sm ${current === href ? "btn-primary" : "btn-outline"}`}>{label}</Link>)}
    </nav>
  );
}
