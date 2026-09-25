import type { Metadata } from "next";
import Link from "next/link";
import { getStore } from "@/lib/session";
import { getActivePet, missingConsents } from "@/lib/guard";
import { redirect } from "next/navigation";
import { CLAIM_DOCUMENTS, INSURANCE_DISCLAIMER, TREATMENT_CATEGORIES } from "@/content/insurance";
import { RESULT_LABELS } from "@/lib/insurance";
import { PageHeader, Disclaimer, EmptyState } from "@/components/ui";
import { PetSwitcher } from "@/components/pets/pet-switcher";
import { formatKst } from "@/lib/dates";
import { telHref } from "@/lib/contacts";
import { PolicyForm, TermForm, CheckForm, TermDelete, PolicyDelete, ClaimChecklist } from "./insurance-forms";

export const metadata: Metadata = { title: "보험·비용" };

const RESULT_CLS = { likely_covered: "badge-ok", check_terms: "badge-warn", generally_excluded: "badge-muted" } as const;
const CLASS_LABEL = { covered: "보장", excluded: "면책·제외", conditional: "조건부", unknown: "불명확" } as const;
const won = (n: number | null | undefined) => (n == null ? "미입력" : `${n.toLocaleString("ko-KR")}원`);

export default async function InsurancePage({ searchParams }: { searchParams: Promise<{ policy?: string }> }) {
  const sp = await searchParams;
  const store = await getStore();
  if (store.user && (await missingConsents(store)).length) redirect("/consent?next=/insurance");
  const member = store.user ? await getActivePet(store) : null;
  const active = member?.active ?? null;
  const policies = active ? await store.listPolicies(active.id) : [];
  const policy = policies.find((p) => p.id === sp.policy) ?? policies[0] ?? null;
  const [terms, checks] = policy ? await Promise.all([store.listTerms(policy.id), store.listChecks(policy.id)]) : [[], []];

  return (
    <div className="space-y-4">
      <PageHeader title="보험·비용" lead="내가 가입한 보험의 약관을 정리하고, 진료 유형별로 무엇을 확인해야 하는지 알려줘요." />
      <Disclaimer>{INSURANCE_DISCLAIMER}</Disclaimer>

      {!store.user ? (
        <div className="card">
          <p className="h3">내 보험 약관 정리하기</p>
          <p className="text-muted">로그인하면 가입한 보험의 상품명·갱신일·자기부담금·약관 조항을 저장하고 진료 유형별로 확인할 수 있어요.</p>
          <Link href="/login?next=/insurance" className="btn btn-primary mt-3">로그인</Link>
        </div>
      ) : !active ? (
        <EmptyState title="먼저 우리 아이를 등록해 주세요" action={<Link className="btn btn-primary" href="/onboarding">등록하기</Link>} />
      ) : (
        <>
          <PetSwitcher pets={member!.pets} activeId={active.id} next="/insurance" />
          <section className="card" aria-labelledby="pol-h">
            <h2 id="pol-h" className="h2 mb-2">{active.name}의 보험</h2>
            {policies.length > 1 && (
              <nav aria-label="보험 선택" className="flex flex-wrap gap-2 mb-3">
                {policies.map((p) => <Link key={p.id} href={`/insurance?policy=${p.id}`} aria-current={p.id === policy?.id ? "page" : undefined} className={`btn btn-sm ${p.id === policy?.id ? "btn-primary" : "btn-outline"}`}>{p.insurer} {p.product_name}</Link>)}
              </nav>
            )}
            {policy ? (
              <div>
                <p className="h3 break-words">{policy.insurer} · {policy.product_name}</p>
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm mt-2">
                  <dt className="font-bold">약관 버전</dt><dd>{policy.terms_version ?? "미입력"}</dd>
                  <dt className="font-bold">가입일</dt><dd>{policy.joined_at ? formatKst(policy.joined_at) : "미입력"}</dd>
                  <dt className="font-bold">갱신일</dt><dd>{policy.renewal_at ? formatKst(policy.renewal_at) : "미입력"}</dd>
                  <dt className="font-bold">연간 한도</dt><dd>{won(policy.coverage_json.annual_limit)}</dd>
                  <dt className="font-bold">1회 한도</dt><dd>{won(policy.coverage_json.per_visit_limit)}</dd>
                  <dt className="font-bold">보상 비율</dt><dd>{policy.coverage_json.coverage_rate != null ? `${policy.coverage_json.coverage_rate}%` : "미입력"}</dd>
                  <dt className="font-bold">자기부담금(1회)</dt><dd>{won(policy.deductible_json.per_visit)}</dd>
                  <dt className="font-bold">고객센터</dt><dd>{policy.customer_center ? <a className="link" href={telHref(policy.customer_center)}>{policy.customer_center}</a> : "미입력"}</dd>
                </dl>
                <p className="text-xs text-muted mt-1">사용자가 직접 입력한 정보예요.</p>
                <PolicyDelete policyId={policy.id} />
              </div>
            ) : <p className="text-muted">아직 입력한 보험이 없어요.</p>}
            <details className="mt-3" open={!policy}>
              <summary className="cursor-pointer link">보험 정보 {policy ? "추가" : "입력하기"}</summary>
              <PolicyForm petId={active.id} />
            </details>
          </section>

          {policy && (
            <>
              <section className="card" aria-labelledby="check-h">
                <h2 id="check-h" className="h2 mb-1">진료 유형별 확인</h2>
                <p className="hint mb-2">입력한 약관 조항이 있으면 그것을, 없으면 일반 안내를 근거로 세 단계 중 하나로 보여줘요.</p>
                <CheckForm policyId={policy.id} />
                {checks.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {checks.map((c) => (
                      <li key={c.id} className="rounded-xl border border-line p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold">{TREATMENT_CATEGORIES.find((t) => t.key === c.input_json.category)?.label}</span>
                          <span className={`badge ${RESULT_CLS[c.result]}`}>{RESULT_LABELS[c.result]}</span>
                          <time className="text-xs text-muted ml-auto" dateTime={c.checked_at}>{formatKst(c.checked_at, true)}</time>
                        </div>
                        <p className="text-sm mt-1"><span className="font-bold">근거({c.evidence_json.evidence_type === "user_clause" ? "내가 입력한 약관" : "일반 안내"})</span> {c.evidence_json.evidence_text}{c.evidence_json.clause_reference ? ` [${c.evidence_json.clause_reference}]` : ""}</p>
                        <p className="text-xs text-muted">약관 버전: {c.evidence_json.terms_version ?? "미입력"}</p>
                        <p className="text-xs text-[#78350F] mt-1">최종 지급 여부는 보험사가 약관과 심사를 통해 결정합니다.</p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="card" aria-labelledby="terms-h">
                <h2 id="terms-h" className="h2 mb-1">내 약관 조항</h2>
                <p className="hint mb-2">약관 원문에서 보장·면책 문구를 옮겨 적어 두세요. 판정의 근거로 쓰여요.</p>
                {terms.length === 0 ? <p className="text-muted">저장된 조항이 없어요.</p> : (
                  <ul className="divide-y divide-line">
                    {terms.map((t) => (
                      <li key={t.id} className="py-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="badge badge-muted">{TREATMENT_CATEGORIES.find((c) => c.key === t.category)?.label}</span>
                          <span className="badge badge-info">{CLASS_LABEL[t.classification]}</span>
                          {t.clause_reference && <span className="text-xs text-muted">{t.clause_reference}</span>}
                          <span className="ml-auto"><TermDelete policyId={policy.id} termId={t.id} /></span>
                        </div>
                        <p className="text-sm mt-1 whitespace-pre-line break-words">{t.clause_text}</p>
                      </li>
                    ))}
                  </ul>
                )}
                <details className="mt-3"><summary className="cursor-pointer link">조항 추가</summary><TermForm policyId={policy.id} /></details>
              </section>
            </>
          )}
        </>
      )}

      <section className="card" aria-labelledby="claim-h">
        <h2 id="claim-h" className="h2 mb-1">청구 서류 체크리스트</h2>
        <p className="hint mb-2">보험사마다 요구 서류가 달라요. 청구 전 고객센터에 확인하세요. 체크 표시는 이 기기에만 남아요.</p>
        <ClaimChecklist items={CLAIM_DOCUMENTS} />
      </section>

      <section className="card" aria-labelledby="guide-h">
        <h2 id="guide-h" className="h2 mb-2">진료 유형별 일반 안내</h2>
        <ul className="divide-y divide-line">
          {TREATMENT_CATEGORIES.map((c) => (
            <li key={c.key} className="py-2">
              <div className="flex flex-wrap items-center gap-2"><span className="font-bold">{c.label}</span><span className={`badge ${RESULT_CLS[c.defaultResult]}`}>{RESULT_LABELS[c.defaultResult]}</span></div>
              <p className="text-sm text-muted">{c.generalNote}</p>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted mt-2">특정 보험상품의 추천·순위·가입 연결은 제공하지 않아요.</p>
      </section>
    </div>
  );
}
