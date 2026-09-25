import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/guard";
import { AuthRequired, Forbidden, PageHeader } from "@/components/ui";
import { formatKst } from "@/lib/dates";
import { FACILITY_LABELS, BUSINESS_STATUS_LABELS } from "@/lib/facility-labels";
import { resolveReportAction } from "@/app/actions/admin";
import { AdminNav } from "../admin-nav";

export const metadata: Metadata = { title: "시설 검증" };

const TYPE: Record<string, string> = { closed: "폐업·휴업", wrong_phone: "전화번호", wrong_hours: "운영시간", wrong_location: "위치", pet_policy: "동반 조건", other: "기타" };

export default async function AdminFacilitiesPage() {
  const r = await requireStaff("admin");
  if (r === "anon") return <AuthRequired what="운영 화면" next="/admin/facilities" />;
  if (r === "forbidden") return <Forbidden />;
  const [reports, facilities] = await Promise.all([r.store.admin.listFacilityReports(), r.store.admin.listFacilitiesAll()]);
  return (
    <div className="space-y-4">
      <PageHeader title="시설·오류신고" lead="오류신고는 48시간 안에 처리하는 것이 목표예요." />
      <AdminNav current="/admin/facilities" />
      <section className="card" aria-labelledby="rep-h">
        <h2 id="rep-h" className="h2 mb-2">오류신고</h2>
        {reports.length === 0 ? <p className="text-muted">접수된 신고가 없어요.</p> : (
          <ul className="divide-y divide-line">
            {reports.map((x) => (
              <li key={x.id} className="py-2 flex flex-wrap items-center gap-2">
                <span className={`badge ${x.status === "open" ? "badge-warn" : "badge-muted"}`}>{x.status === "open" ? "미처리" : x.status === "resolved" ? "반영" : "기각"}</span>
                <Link href={`/facilities/${x.facility_id}`} className="link">{x.facility_name}</Link>
                <span className="badge badge-muted">{TYPE[x.report_type] ?? x.report_type}</span>
                <span className="text-sm flex-1 min-w-0 break-words">{x.details}</span>
                <span className="text-xs text-muted">{formatKst(x.created_at, true)}</span>
                {x.status === "open" && (
                  <form action={resolveReportAction} className="flex gap-1">
                    <input type="hidden" name="id" value={x.id} />
                    <button className="btn btn-primary btn-sm" name="status" value="resolved">반영 완료</button>
                    <button className="btn btn-outline btn-sm" name="status" value="rejected">기각</button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="card" aria-labelledby="fac-h">
        <h2 id="fac-h" className="h2 mb-2">시설 ({facilities.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">시설 목록</caption>
            <thead><tr className="text-left text-muted"><th scope="col" className="py-1 pr-2">이름</th><th scope="col" className="pr-2">유형</th><th scope="col" className="pr-2">허가 상태</th><th scope="col" className="pr-2">출처</th><th scope="col">동기화</th></tr></thead>
            <tbody>{facilities.map((f) => (
              <tr key={f.id} className="border-t border-line"><td className="py-1 pr-2"><Link className="link" href={`/facilities/${f.id}`}>{f.name}</Link>{f.is_example && <span className="badge badge-warn ml-1">예시</span>}</td><td className="pr-2">{FACILITY_LABELS[f.facility_type]}</td><td className="pr-2">{BUSINESS_STATUS_LABELS[f.business_status]}</td><td className="pr-2">{f.source_system}</td><td>{f.last_synced_at ? formatKst(f.last_synced_at) : "-"}</td></tr>
            ))}</tbody>
          </table>
        </div>
        <p className="hint mt-2">중복 병합 후보 검토·업체 검증은 공공데이터 수집 후(Phase 2) 이 화면에 추가돼요.</p>
      </section>
    </div>
  );
}
