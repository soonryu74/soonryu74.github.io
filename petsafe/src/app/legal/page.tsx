import type { Metadata } from "next";
import Link from "next/link";
import { getStore } from "@/lib/session";
import { PageHeader } from "@/components/ui";
import { formatKst } from "@/lib/dates";
import { FLAG_LABELS, resolveFlags } from "@/lib/flags";

export const metadata: Metadata = { title: "법무·신뢰센터" };

export default async function LegalPage() {
  const store = await getStore();
  const [docs, flagRows] = await Promise.all([store.listLegalDocuments(), store.getFlags().catch(() => [])]);
  const flags = resolveFlags(flagRows);
  return (
    <div className="space-y-4">
      <PageHeader title="법무·신뢰센터" lead="가입할 때 동의한 문서와 같은 버전을 그대로 공개해요." />
      <ul className="grid sm:grid-cols-2 gap-3">
        {docs.map((d) => (
          <li key={d.id} className="card">
            <Link href={`/legal/${d.document_type}`} className="h3 hover:underline">{d.title}</Link>
            <p className="text-sm text-muted">버전 {d.version} · 시행 {formatKst(d.effective_at)}{d.required ? " · 필수 동의" : ""}</p>
          </li>
        ))}
      </ul>
      <section className="card" aria-labelledby="principles-h">
        <h2 id="principles-h" className="h2 mb-2">우리가 지키는 원칙</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>안전·법정·신고 정보는 무료이며 유료 벽 뒤에 두지 않아요.</li>
          <li>진단명·약·용량·치료 결정을 제시하지 않아요.</li>
          <li>보험 가입을 권유하거나 상품 순위를 매기지 않아요.</li>
          <li>24시간·응급·동반 가능 여부를 추정하지 않고, 확인되지 않았으면 &lsquo;미확인&rsquo;으로 표시해요.</li>
          <li>검색 포털의 리뷰·사진을 복제하지 않고, 공공데이터와 적법한 자료만 써요.</li>
          <li>정밀 위치를 저장하지 않아요. 위치 권한은 버튼을 눌렀을 때만 요청해요.</li>
          <li>건강·보험·위치·신고 정보를 광고에 쓰지 않아요.</li>
          <li>광고·유료 제휴가 생기면 콘텐츠 가까이에 &lsquo;광고&rsquo; 또는 &lsquo;유료 제휴&rsquo;로 표시해요.</li>
        </ul>
      </section>
      <section className="card" aria-labelledby="flags-h">
        <h2 id="flags-h" className="h2 mb-2">법률 검토 후에만 켜지는 기능</h2>
        <ul className="divide-y divide-line">
          {(Object.keys(FLAG_LABELS) as (keyof typeof FLAG_LABELS)[]).map((k) => (
            <li key={k} className="py-2 flex items-center justify-between gap-2">
              <span>{FLAG_LABELS[k]}</span>
              <span className={`badge ${flags[k] ? "badge-info" : "badge-muted"}`}>{flags[k] ? "사용 중" : "꺼짐"}</span>
            </li>
          ))}
        </ul>
      </section>
      <section className="card" aria-labelledby="req-h">
        <h2 id="req-h" className="h2 mb-2">요청·신고</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>내 데이터 내려받기·탈퇴: <Link href="/account" className="link">내 계정</Link></li>
          <li>시설 정보 오류: 각 시설 상세 화면의 &lsquo;정보가 달라요&rsquo;</li>
          <li>저작권 침해·개인정보 문의 창구: 사업자 정보 확정 후 게시 예정 (준비 중)</li>
        </ul>
      </section>
    </div>
  );
}
