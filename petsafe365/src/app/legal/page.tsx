"use client";
import Link from "next/link";
import { Badge, Card, EmptyState, ErrorState, LinkButton, Loading, PageHeader, formatDate } from "@/components/ui";
import { getFlags } from "@/lib/domain";
import { useAsync } from "@/lib/hooks";
import { getRepo } from "@/lib/repo";
import type { FeatureFlagKey, LegalDocument } from "@/lib/types";

const TYPE_LABEL: Record<LegalDocument["document_type"], string> = {
  terms: "이용약관", privacy: "개인정보 처리방침", location: "위치정보 이용 안내", copyright: "저작권·콘텐츠 정책", refund: "환불·청약철회 정책", ads: "광고·제휴 표시 정책",
};
const TYPE_ORDER = Object.keys(TYPE_LABEL);

const PRINCIPLES: { title: string; body: string }[] = [
  { title: "안전 정보는 무료예요", body: "긴급 도움, 신고, 법정 의무, 감염병 정보는 돈을 받지 않고 보여 드려요." },
  { title: "진단하지 않아요", body: "진단명, 약, 용량, 치료법을 알려 주지 않아요. 전화하기, 기록하기, 병원 가기 같은 행동만 안내해요." },
  { title: "보험 가입을 권하지 않아요", body: "보험 상품을 추천하거나 순위를 매기지 않아요. 내 약관을 이해하고 청구를 준비하는 것만 도와요." },
  { title: "광고는 광고라고 표시해요", body: "광고와 유료 제휴에는 표시를 붙여요. 긴급 도움, 신고, 감염병, 보험 화면에는 광고를 싣지 않아요." },
  { title: "위치를 저장하지 않아요", body: "'내 주변 찾기'를 눌렀을 때만 위치 권한을 요청하고, 좌표를 계정에 저장하지 않아요." },
];

const FLAG_LABEL: Record<FeatureFlagKey, { name: string; note: string }> = {
  paymentsEnabled: { name: "앱 안 결제", note: "사업자 신고와 결제대행사 심사 뒤에 켜요." },
  partnerSubscriptionsEnabled: { name: "파트너 유료 구독", note: "제휴 업체용 유료 기능이에요." },
  insuranceReferralEnabled: { name: "보험 가입 연결", note: "별도 인가·제휴 전에는 켜지 않아요." },
  preciseLocationStorageEnabled: { name: "정밀 위치 저장", note: "기본은 저장하지 않아요." },
  publicReviewsEnabled: { name: "공개 후기", note: "운영 기준을 정한 뒤에 켜요." },
  adsEnabled: { name: "광고", note: "월 이용자 5천 명 이후 관리자 승인으로 켜요." },
};

export default function LegalPage() {
  const docs = useAsync(() => getRepo().list("legal_documents", { eq: { status: "published" }, order: { column: "effective_at", ascending: false } }), []);
  const flags = useAsync(getFlags, []);

  // 같은 종류가 여러 버전이면 시행일이 가장 늦은 것 하나만 보여 준다.
  const latest = (docs.data ?? [])
    .filter((d, i, all) => all.findIndex((o) => o.document_type === d.document_type) === i)
    .sort((a, b) => TYPE_ORDER.indexOf(a.document_type) - TYPE_ORDER.indexOf(b.document_type));

  return (
    <>
      <PageHeader title="법무·신뢰센터" description="약관과 정책, 그리고 펫안심365가 지키는 약속을 모았어요." />

      <section aria-labelledby="legal-docs" className="flex flex-col gap-3">
        <h2 id="legal-docs" className="text-lg font-bold">
          약관·정책
        </h2>
        {docs.loading ? (
          <Loading />
        ) : docs.error ? (
          <ErrorState onRetry={docs.reload} />
        ) : latest.length === 0 ? (
          <EmptyState title="게시된 문서가 아직 없어요" description="문서를 준비하는 대로 올릴게요." />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {latest.map((d) => (
              <Card as="li" key={d.id} className="flex flex-col gap-2">
                <Link href={`/legal/${d.document_type}`} className="text-base font-bold underline-offset-2 hover:underline">
                  {TYPE_LABEL[d.document_type] ?? d.document_type}
                </Link>
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
                  <span>버전 {d.version}</span>
                  <span>시행일 {formatDate(d.effective_at)}</span>
                  {d.version.includes("draft") ? <Badge tone="warn">운영 초안</Badge> : null}
                </div>
                <LinkButton href={`/legal/${d.document_type}`} variant="ghost">
                  읽기
                </LinkButton>
              </Card>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="legal-trust" className="flex flex-col gap-3">
        <h2 id="legal-trust" className="text-lg font-bold">
          우리가 지키는 약속
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {PRINCIPLES.map((p) => (
            <Card as="li" key={p.title}>
              <p className="font-semibold">{p.title}</p>
              <p className="mt-1 text-muted">{p.body}</p>
            </Card>
          ))}
        </ul>
      </section>

      <section aria-labelledby="legal-flags" className="flex flex-col gap-3">
        <h2 id="legal-flags" className="text-lg font-bold">
          지금 켜져 있는 기능
        </h2>
        <p className="text-sm text-muted">아래 기능은 관리자가 승인해야 켜져요. 지금 상태를 그대로 보여 드려요.</p>
        {flags.loading ? (
          <Loading />
        ) : flags.error || !flags.data ? (
          <ErrorState onRetry={flags.reload} />
        ) : (
          <Card>
            <table className="w-full table-fixed text-left">
              <caption className="sr-only">기능별 켜짐·꺼짐 상태</caption>
              <thead>
                <tr className="border-b border-line text-sm text-muted">
                  <th scope="col" className="py-2 font-medium">
                    기능
                  </th>
                  <th scope="col" className="w-16 py-2 text-right font-medium">
                    상태
                  </th>
                </tr>
              </thead>
              <tbody>
                {(Object.keys(FLAG_LABEL) as FeatureFlagKey[]).map((key) => (
                  <tr key={key} className="border-b border-line last:border-b-0">
                    <th scope="row" className="py-2 pr-2 font-normal">
                      <span className="font-medium">{FLAG_LABEL[key].name}</span>
                      <span className="block break-words text-sm text-muted">{FLAG_LABEL[key].note}</span>
                    </th>
                    <td className="py-2 text-right align-top">{flags.data?.[key] ? <Badge tone="safe">켜짐</Badge> : <Badge>꺼짐</Badge>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </section>

      <section aria-labelledby="legal-data" className="flex flex-col gap-3">
        <h2 id="legal-data" className="text-lg font-bold">
          내 정보 관리
        </h2>
        <Card className="flex flex-col gap-2">
          <p>언제든 탈퇴할 수 있고, 탈퇴하면 저장한 정보가 삭제돼요.</p>
          <LinkButton href="/more" variant="ghost">
            탈퇴·데이터 삭제
          </LinkButton>
        </Card>
      </section>
    </>
  );
}
