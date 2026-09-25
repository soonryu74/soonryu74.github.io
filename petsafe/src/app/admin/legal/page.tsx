import type { Metadata } from "next";
import { requireStaff } from "@/lib/guard";
import { AuthRequired, Forbidden, PageHeader } from "@/components/ui";
import { formatKst } from "@/lib/dates";
import { AdminNav } from "../admin-nav";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = { title: "문서·연락처" };

export default async function AdminLegalPage() {
  const r = await requireStaff("admin");
  if (r === "anon") return <AuthRequired what="운영 화면" next="/admin/legal" />;
  if (r === "forbidden") return <Forbidden />;
  const [docs, stats, contacts] = await Promise.all([r.store.admin.listAllLegalDocuments(), r.store.admin.consentStats(), r.store.admin.listAllContacts()]);
  return (
    <div className="space-y-4">
      <PageHeader title="문서 버전·동의·공식 연락처" />
      <AdminNav current="/admin/legal" />
      <section className="card" aria-labelledby="docs-h">
        <h2 id="docs-h" className="h2 mb-2">법무 문서 버전</h2>
        <table className="w-full text-sm">
          <caption className="sr-only">문서 버전과 동의 수</caption>
          <thead><tr className="text-left text-muted"><th scope="col" className="py-1">문서</th><th scope="col">버전</th><th scope="col">시행일</th><th scope="col">상태</th><th scope="col">동의 수</th></tr></thead>
          <tbody>{docs.map((d) => (
            <tr key={d.id} className="border-t border-line"><td className="py-1">{d.title}</td><td>{d.version}</td><td>{formatKst(d.effective_at)}</td><td>{d.status}</td><td>{stats.find((s) => s.document_type === d.document_type && s.document_version === d.version)?.count ?? 0}</td></tr>
          ))}</tbody>
        </table>
        <p className="hint mt-2">새 버전은 supabase 마이그레이션/시드로 추가하고, 시행일 이후 사용자는 다음 방문 시 다시 동의하게 돼요.</p>
      </section>
      <section className="card" aria-labelledby="ct-h">
        <h2 id="ct-h" className="h2 mb-1">공식 연락처 검증</h2>
        <p className="hint mb-2">저장하면 오늘 날짜로 확인일이 기록되고 감사로그에 남아요. 번호는 공식 근거를 확인한 뒤에만 게시(active)하세요.</p>
        <ul className="space-y-3">{contacts.map((c) => <li key={c.id}><ContactForm contact={c} /></li>)}</ul>
      </section>
    </div>
  );
}
