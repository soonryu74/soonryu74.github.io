import type { Metadata } from "next";
import { requireStaff } from "@/lib/guard";
import { AuthRequired, Forbidden, PageHeader } from "@/components/ui";
import { AdminNav } from "./admin-nav";

export const metadata: Metadata = { title: "운영 대시보드" };

const LABELS: Record<string, string> = {
  users: "회원", pets: "반려동물", content_in_review: "검수 대기 콘텐츠", content_published: "게시 중 콘텐츠",
  facilities: "시설", facility_reports_open: "미처리 오류신고", contacts_pending: "확인 대기 연락처",
};

export default async function AdminPage() {
  const r = await requireStaff("reviewer");
  if (r === "anon") return <AuthRequired what="운영 화면" next="/admin" />;
  if (r === "forbidden") return <Forbidden />;
  const counts = await r.store.admin.counts();
  await r.store.audit("admin.dashboard_viewed", "admin", null);
  return (
    <div>
      <PageHeader title="운영 대시보드" lead={`${r.user.email} · ${r.user.role === "admin" ? "관리자" : "검수자"}`} />
      <AdminNav current="/admin" />
      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(counts).map(([k, v]) => (
          <div key={k} className="card"><dt className="text-sm text-muted">{LABELS[k] ?? k}</dt><dd className="text-2xl font-extrabold">{v.toLocaleString("ko-KR")}</dd></div>
        ))}
      </dl>
      <p className="text-sm text-muted mt-3">데이터 동기화 현황: 공공데이터 수집기는 키 설정 후 `npm run import:hospitals` 로 실행해요. 실행 기록은 facility_sync_logs 에 남아요.</p>
    </div>
  );
}
