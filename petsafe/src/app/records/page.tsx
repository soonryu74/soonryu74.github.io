import type { Metadata } from "next";
import Link from "next/link";
import { getActivePet, requireMember } from "@/lib/guard";
import { AuthRequired, EmptyState, PageHeader } from "@/components/ui";
import { PetSwitcher } from "@/components/pets/pet-switcher";
import { formatKst, kstDate } from "@/lib/dates";
import { DOCUMENT_TYPES } from "@/lib/validation";
import { EventForm, UploadForm, EventList, DocumentDelete } from "./record-forms";

export const metadata: Metadata = { title: "건강 기록" };

export default async function RecordsPage() {
  const m = await requireMember("/records");
  if (!m) return <AuthRequired what="건강 기록" next="/records" />;
  const { pets, active } = await getActivePet(m.store);
  if (!active) return (<div><PageHeader title="건강 기록" /><EmptyState title="먼저 우리 아이를 등록해 주세요" action={<Link className="btn btn-primary" href="/onboarding">등록하기</Link>} /></div>);
  const [events, docs] = await Promise.all([m.store.listEvents(active.id, 200), m.store.listDocuments(active.id)]);
  const weights = events.filter((e) => e.event_type === "weight").slice(0, 8);
  const costTotal = events.filter((e) => e.event_type === "cost").reduce((s, e) => s + Number((e.value_json as { amount_krw?: number }).amount_krw ?? 0), 0);
  return (
    <div className="space-y-4">
      <PageHeader title={`${active.name}의 건강 기록`} lead="체중·관찰·진료·검사·비용과 문서를 한곳에. 모두 본인만 볼 수 있어요." />
      <PetSwitcher pets={pets} activeId={active.id} next="/records" />

      <section aria-labelledby="add-h" className="card">
        <h2 id="add-h" className="h2 mb-2">기록 추가</h2>
        <EventForm petId={active.id} today={kstDate()} />
      </section>

      {(weights.length > 0 || costTotal > 0) && (
        <section aria-labelledby="sum-h" className="card">
          <h2 id="sum-h" className="h2 mb-2">요약</h2>
          {weights.length > 0 && (
            <div>
              <h3 className="h3">최근 체중</h3>
              <table className="w-full text-sm mt-1">
                <caption className="sr-only">최근 체중 기록</caption>
                <thead><tr className="text-left text-muted"><th scope="col" className="py-1">날짜</th><th scope="col">체중</th></tr></thead>
                <tbody>{weights.map((w) => <tr key={w.id} className="border-t border-line"><td className="py-1">{formatKst(w.occurred_at)}</td><td>{String((w.value_json as { weight_kg?: number }).weight_kg)}kg</td></tr>)}</tbody>
              </table>
            </div>
          )}
          {costTotal > 0 && <p className="mt-2">기록한 비용 합계: <strong>{costTotal.toLocaleString("ko-KR")}원</strong></p>}
        </section>
      )}

      <section aria-labelledby="tl-h" className="card">
        <h2 id="tl-h" className="h2 mb-2">타임라인</h2>
        <EventList events={events} petId={active.id} />
      </section>

      <section id="documents" aria-labelledby="docs-h" className="card scroll-mt-20">
        <h2 id="docs-h" className="h2 mb-1">비공개 문서</h2>
        <p className="hint mb-2">영수증·검사결과·접종기록 등. PDF·JPG·PNG·WEBP·HEIC, 10MB 이하. 비공개 저장소에 보관되고 열 때마다 짧은 시간만 유효한 링크가 만들어져요.</p>
        <UploadForm petId={active.id} />
        {docs.length === 0 ? <p className="text-muted mt-3">저장된 문서가 없어요.</p> : (
          <ul className="divide-y divide-line mt-3">
            {docs.map((d) => (
              <li key={d.id} className="py-2 flex flex-wrap items-center gap-2">
                <span className="badge badge-muted">{DOCUMENT_TYPES[d.document_type as keyof typeof DOCUMENT_TYPES] ?? d.document_type}</span>
                <a className="link flex-1 min-w-0 break-all" href={`/api/documents/${d.id}`} target="_blank" rel="noopener noreferrer">{d.original_name}<span className="sr-only"> (새 창)</span></a>
                <span className="text-xs text-muted">{Math.ceil(d.size / 1024)}KB · {formatKst(d.created_at)}</span>
                <DocumentDelete id={d.id} name={d.original_name} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
