import type { Metadata } from "next";
import Link from "next/link";
import { getStore } from "@/lib/session";
import { REPORT_SITUATIONS } from "@/content/official-contacts";
import { PageHeader, ErrorNote } from "@/components/ui";
import { formatKst } from "@/lib/dates";
import { isContactStale, telHref } from "@/lib/contacts";
import type { OfficialContactRow } from "@/lib/types";
import { DraftForm, DraftDelete } from "./report-forms";

export const metadata: Metadata = { title: "분실·발견·신고" };

const EXTRA = { key: "registration", label: "동물등록을 하고 싶어요", intro: "동물등록 대행기관(동물병원 등)이나 시·군·구청에서 할 수 있어요.", evidence: [] as string[] };

function ContactCard({ c }: { c: OfficialContactRow }) {
  const stale = isContactStale(c);
  return (
    <li className="card">
      <p className="h3 break-words">{c.organization}</p>
      {c.description && <p className="text-sm">{c.description}</p>}
      <div className="flex flex-wrap gap-2 mt-2">
        {c.phone && c.status === "active" && <a className="btn btn-primary btn-sm" href={telHref(c.phone)}>📞 {c.phone}</a>}
        {c.url && <a className="btn btn-outline btn-sm" href={c.url} target="_blank" rel="noopener noreferrer">온라인 신고·안내<span className="sr-only"> (새 창)</span></a>}
      </div>
      <p className="text-xs text-muted mt-2">
        {c.coverage_area}{c.available_hours ? ` · ${c.available_hours}` : ""} ·{" "}
        {c.status === "pending_verification" ? <span className="badge badge-warn">운영자 확인 대기 — 번호 미게시</span> : c.verified_at ? <>최근 확인 {formatKst(c.verified_at)}{stale && <span className="badge badge-warn ml-1">확인일 오래됨</span>}</> : "확인일 미기록"}
        {c.source_url && <> · <a className="link" href={c.source_url} target="_blank" rel="noopener noreferrer">근거<span className="sr-only"> (새 창)</span></a></>}
      </p>
    </li>
  );
}

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ situation?: string }> }) {
  const sp = await searchParams;
  const store = await getStore();
  let contacts: OfficialContactRow[] = [];
  let failed = false;
  try { contacts = await store.listContacts(); } catch { failed = true; }
  const all = [...REPORT_SITUATIONS, EXTRA];
  const situation = all.find((s) => s.key === sp.situation) ?? null;
  const drafts = store.user ? await store.listIncidentDrafts().catch(() => []) : [];
  return (
    <div className="space-y-4">
      <PageHeader title="분실·발견·신고" lead="공식 기관 연결이 먼저예요. 여기서는 신고에 필요한 내용을 정리하도록 돕고, 어떤 내용도 공개 게시하지 않아요." />
      {failed && <ErrorNote message="연락처를 불러오지 못했어요. 급하면 112(경찰) 또는 1577-0954(동물보호상담센터)로 연락하세요." />}
      <nav aria-label="상황 선택" className="grid sm:grid-cols-2 gap-2">
        {all.map((s) => (
          <Link key={s.key} href={`/reports?situation=${s.key}`} aria-current={situation?.key === s.key ? "page" : undefined}
            className={`card font-bold hover:border-primary ${situation?.key === s.key ? "border-primary border-2 bg-[#F0FDFA]" : ""}`}>{s.label}</Link>
        ))}
      </nav>

      {situation && (
        <>
          <section aria-labelledby="sit-h" className="space-y-3">
            <h2 id="sit-h" className="h2">{situation.label}</h2>
            <p>{situation.intro}</p>
            {"safetyNote" in situation && typeof situation.safetyNote === "string" && <p className="card border-danger border-2 font-bold">{situation.safetyNote}</p>}
            <ul className="grid sm:grid-cols-2 gap-2">
              {contacts.filter((c) => c.category === situation.key).map((c) => <ContactCard key={c.id} c={c} />)}
            </ul>
          </section>
          {situation.evidence.length > 0 && (
            <section aria-labelledby="draft-h" className="card">
              <h2 id="draft-h" className="h2 mb-1">신고 준비 메모</h2>
              <p className="hint mb-2">원할 때만 저장돼요. 이 기기에만 저장하거나, 로그인했다면 계정에 90일간 보관할 수 있어요. 정밀 위치는 저장하지 않으니 동네·건물 이름 정도로 적어 주세요.</p>
              <DraftForm type={situation.key} evidence={situation.evidence} loggedIn={!!store.user} />
            </section>
          )}
        </>
      )}

      {drafts.length > 0 && (
        <section aria-labelledby="mydrafts-h" className="card">
          <h2 id="mydrafts-h" className="h2 mb-2">계정에 저장한 메모</h2>
          <ul className="divide-y divide-line">
            {drafts.map((d) => (
              <li key={d.id} className="py-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="badge badge-muted">{all.find((s) => s.key === d.incident_type)?.label ?? d.incident_type}</span>
                  <span className="text-xs text-muted">{formatKst(d.created_at, true)} · {formatKst(d.retention_until)} 자동 삭제</span>
                  <span className="ml-auto"><DraftDelete id={d.id} /></span>
                </div>
                <p className="text-sm whitespace-pre-line break-words">{[d.location_text && `장소: ${d.location_text}`, d.details_json.features && `특징: ${d.details_json.features}`, d.details_json.memo].filter(Boolean).join("\n")}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
