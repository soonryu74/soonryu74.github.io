import type { Metadata } from "next";
import { requireStaff } from "@/lib/guard";
import { AuthRequired, Forbidden, PageHeader } from "@/components/ui";
import { formatKst } from "@/lib/dates";
import { AdminNav } from "../admin-nav";

export const metadata: Metadata = { title: "감사로그" };

export default async function AuditPage() {
  const r = await requireStaff("admin");
  if (r === "anon") return <AuthRequired what="운영 화면" next="/admin/audit" />;
  if (r === "forbidden") return <Forbidden />;
  const logs = await r.store.admin.listAudit(300);
  await r.store.audit("admin.audit_viewed", "audit_logs", null);
  return (
    <div>
      <PageHeader title="감사로그" lead="관리자 변경·다운로드·민감정보 접근 기록. 수정·삭제할 수 없어요." />
      <AdminNav current="/admin/audit" />
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">최근 감사로그</caption>
          <thead><tr className="text-left text-muted"><th scope="col" className="py-1 pr-2">시각</th><th scope="col" className="pr-2">행위자</th><th scope="col" className="pr-2">행위</th><th scope="col" className="pr-2">대상</th><th scope="col">내용</th></tr></thead>
          <tbody>{logs.map((l) => (
            <tr key={l.id} className="border-t border-line align-top"><td className="py-1 pr-2 whitespace-nowrap">{formatKst(l.created_at, true)}</td><td className="pr-2">{l.actor_role ?? "-"} {l.actor_id ? l.actor_id.slice(0, 8) : "(탈퇴·시스템)"}</td><td className="pr-2">{l.action}</td><td className="pr-2">{l.entity_type}{l.entity_id ? `:${l.entity_id.slice(0, 8)}` : ""}</td><td className="break-all text-xs">{JSON.stringify(l.metadata_json)}</td></tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}
