"use client";
import { useState, type FormEvent } from "react";
import { Badge, Button, Card, EmptyState, ErrorState, Field, LinkButton, Loading, LoginRequired, Notice, PageHeader, SelectField, TextareaField, formatDate } from "@/components/ui";
import { usePets, useAsync, useSession } from "@/lib/hooks";
import { getRepo } from "@/lib/repo";
import { INSURANCE_CATEGORIES, INSURANCE_DISCLAIMER, INSURANCE_FINAL_NOTE, RESULT_LABEL, classifyInsurance } from "@/lib/rules";
import type { InsuranceCheck, InsuranceClassification, InsurancePolicy, InsuranceResult, InsuranceTerm, Pet } from "@/lib/types";

const CLASS_LABEL: Record<InsuranceClassification, string> = { covered: "보장으로 적혀 있음", check: "조건부·확인 필요", excluded: "면책으로 적혀 있음" };
const CLASS_TONE: Record<InsuranceClassification, "safe" | "warn" | "neutral"> = { covered: "safe", check: "warn", excluded: "neutral" };
const RESULT_TONE: Record<InsuranceResult, "safe" | "warn" | "neutral"> = { likely_covered: "safe", check_terms: "warn", generally_excluded: "neutral" };
const EVIDENCE_LABEL: Record<InsuranceCheck["evidence_json"]["type"], string> = { user_clause: "내가 입력한 약관 조항", general_guide: "일반 안내 (검수 전)" };
// 보험사마다 다른 일반 예시일 뿐이다.
const CLAIM_DOCS = ["진료비 영수증", "진료비 세부내역서", "보험금 청구서 (보험사 양식)", "통장 사본", "개인정보 처리 동의서 (보험사 양식)", "진료 기록이나 소견서 (보험사가 요청할 때)"];

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return `${formatDate(iso)} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const ErrorText = ({ children }: { children: string | null }) =>
  children ? (
    <p role="alert" className="text-sm text-danger">
      {children}
    </p>
  ) : null;

// ---- (1) 내 보험 정보 ----
function PolicyForm({ pet, policy, onSaved }: { pet: Pet; policy: InsurancePolicy | null; onSaved: () => void }) {
  const [insurer, setInsurer] = useState(policy?.insurer ?? "");
  const [productName, setProductName] = useState(policy?.product_name ?? "");
  const [termsVersion, setTermsVersion] = useState(policy?.terms_version ?? "");
  const [joinedAt, setJoinedAt] = useState(policy?.joined_at?.slice(0, 10) ?? "");
  const [renewalAt, setRenewalAt] = useState(policy?.renewal_at?.slice(0, 10) ?? "");
  const [annualLimit, setAnnualLimit] = useState(policy?.coverage_json?.annual_limit ?? "");
  const [deductible, setDeductible] = useState(policy?.deductible_json?.text ?? "");
  const [errors, setErrors] = useState<{ insurer?: string; productName?: string }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!insurer.trim()) next.insurer = "보험사 이름을 적어 주세요.";
    if (!productName.trim()) next.productName = "상품명을 적어 주세요.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setSubmitError(null);
    setSaved(false);
    setBusy(true);
    const values = {
      pet_id: pet.id,
      insurer: insurer.trim(),
      product_name: productName.trim(),
      terms_version: termsVersion.trim() || null,
      joined_at: joinedAt || null,
      renewal_at: renewalAt || null,
      coverage_json: annualLimit.trim() ? { annual_limit: annualLimit.trim() } : {},
      deductible_json: deductible.trim() ? { text: deductible.trim() } : {},
      user_confirmed_at: new Date().toISOString(),
    };
    try {
      if (policy) await getRepo().update("insurance_policies", policy.id, values);
      else await getRepo().insert("insurance_policies", values);
      setSaved(true);
      onSaved();
    } catch {
      setSubmitError("저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
      <Field id="ins-insurer" label="보험사" value={insurer} onChange={(e) => setInsurer(e.target.value)} error={errors.insurer} />
      <Field id="ins-product" label="상품명" value={productName} onChange={(e) => setProductName(e.target.value)} error={errors.productName} />
      <Field id="ins-terms-version" label="약관 버전" optional hint="약관 표지나 증권에 적힌 판·개정일을 적어 주세요." value={termsVersion} onChange={(e) => setTermsVersion(e.target.value)} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="ins-joined" label="가입일" optional type="date" value={joinedAt} onChange={(e) => setJoinedAt(e.target.value)} />
        <Field id="ins-renewal" label="갱신일" optional type="date" value={renewalAt} onChange={(e) => setRenewalAt(e.target.value)} />
      </div>
      <Field id="ins-limit" label="연간 한도" optional placeholder="증권에 적힌 그대로" value={annualLimit} onChange={(e) => setAnnualLimit(e.target.value)} />
      <Field id="ins-deductible" label="자기부담금" optional placeholder="증권에 적힌 그대로" value={deductible} onChange={(e) => setDeductible(e.target.value)} />
      <ErrorText>{submitError}</ErrorText>
      <Button type="submit" disabled={busy}>
        {busy ? "저장하는 중이에요" : policy ? "보험 정보 고치기" : "보험 정보 저장"}
      </Button>
      <p role="status" aria-live="polite" className="text-sm text-safe">
        {saved ? "저장했어요." : ""}
      </p>
    </form>
  );
}

// ---- (2) 약관 조항 입력 ----
function TermsSection({ policy, terms, onChanged }: { policy: InsurancePolicy; terms: InsuranceTerm[]; onChanged: () => void }) {
  const [category, setCategory] = useState<string>(INSURANCE_CATEGORIES[0]);
  const [clauseText, setClauseText] = useState("");
  const [reference, setReference] = useState("");
  const [classification, setClassification] = useState<InsuranceClassification>("check");
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const add = async (e: FormEvent) => {
    e.preventDefault();
    if (!clauseText.trim()) {
      setError("약관에 적힌 문구를 옮겨 적어 주세요.");
      return;
    }
    setError(null);
    setSubmitError(null);
    setSaved(false);
    setBusy(true);
    try {
      await getRepo().insert("insurance_terms", { policy_id: policy.id, category, clause_text: clauseText.trim(), clause_reference: reference.trim() || null, classification, source_document_id: null });
      setClauseText("");
      setReference("");
      setSaved(true);
      onChanged();
    } catch {
      setSubmitError("조항을 저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    setRemoveError(null);
    setBusy(true);
    try {
      await getRepo().remove("insurance_terms", id);
      setConfirmId(null);
      onChanged();
    } catch {
      setRemoveError("지우지 못했어요. 잠시 뒤 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={add} className="flex flex-col gap-3" noValidate>
        <SelectField id="term-category" label="항목" value={category} onChange={(e) => setCategory(e.target.value)}>
          {INSURANCE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </SelectField>
        <TextareaField id="term-text" label="약관 문구" placeholder="약관에 적힌 문장을 그대로 옮겨 적어 주세요." value={clauseText} onChange={(e) => setClauseText(e.target.value)} error={error} />
        <Field id="term-ref" label="조항 위치" optional placeholder="예: 제3조 2항, 12쪽" value={reference} onChange={(e) => setReference(e.target.value)} />
        <SelectField id="term-class" label="약관에 어떻게 적혀 있나요?" value={classification} onChange={(e) => setClassification(e.target.value as InsuranceClassification)}>
          {(Object.keys(CLASS_LABEL) as InsuranceClassification[]).map((k) => (
            <option key={k} value={k}>
              {CLASS_LABEL[k]}
            </option>
          ))}
        </SelectField>
        <ErrorText>{submitError}</ErrorText>
        <Button type="submit" variant="ghost" disabled={busy}>
          조항 추가
        </Button>
        <p role="status" aria-live="polite" className="text-sm text-safe">
          {saved ? "조항을 저장했어요." : ""}
        </p>
      </form>

      {terms.length === 0 ? (
        <EmptyState title="입력한 조항이 아직 없어요" description="조항을 입력하면 그 문구를 근거로 확인해 드려요." />
      ) : (
        <ul className="flex flex-col gap-3">
          {terms.map((t) => (
            <li key={t.id} className="flex flex-col gap-2 rounded-[14px] border border-line p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="brand">{t.category}</Badge>
                <Badge tone={CLASS_TONE[t.classification]}>{CLASS_LABEL[t.classification]}</Badge>
              </div>
              <p className="whitespace-pre-line break-words">{t.clause_text}</p>
              {t.clause_reference ? <p className="break-words text-sm text-muted">위치: {t.clause_reference}</p> : null}
              {confirmId === t.id ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm">이 조항을 지울까요?</span>
                  <Button variant="danger" disabled={busy} onClick={() => remove(t.id)}>
                    지우기
                  </Button>
                  <Button variant="ghost" disabled={busy} onClick={() => setConfirmId(null)}>
                    취소
                  </Button>
                </div>
              ) : (
                <Button variant="ghost" className="self-start" onClick={() => setConfirmId(t.id)}>
                  삭제
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      <ErrorText>{removeError}</ErrorText>
    </div>
  );
}

function CheckResult({ check }: { check: InsuranceCheck }) {
  const ev = check.evidence_json;
  return (
    <div className="flex flex-col gap-2 rounded-[14px] border border-line p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="brand">{check.input_json.category}</Badge>
        <Badge tone={RESULT_TONE[check.result]}>{RESULT_LABEL[check.result]}</Badge>
      </div>
      <dl className="flex flex-col gap-1 text-sm">
        <div className="flex gap-2">
          <dt className="shrink-0 font-medium">근거 유형</dt>
          <dd>{EVIDENCE_LABEL[ev.type] ?? ev.type}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="shrink-0 font-medium">근거 문구</dt>
          <dd className="min-w-0 whitespace-pre-line break-words">{ev.text}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="shrink-0 font-medium">조항 위치</dt>
          <dd className="min-w-0 break-words">{ev.reference || "적지 않음"}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="shrink-0 font-medium">약관 버전</dt>
          <dd className="min-w-0 break-words">{ev.terms_version || "적지 않음"}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="shrink-0 font-medium">판정 시각</dt>
          <dd>{formatDateTime(check.checked_at)}</dd>
        </div>
      </dl>
      <p className="font-semibold">{INSURANCE_FINAL_NOTE}</p>
    </div>
  );
}

// ---- (3) 확인하기 ----
function CheckSection({ policy, terms, onSaved }: { policy: InsurancePolicy; terms: InsuranceTerm[]; onSaved: () => void }) {
  const [category, setCategory] = useState<string>(INSURANCE_CATEGORIES[0]);
  const [result, setResult] = useState<InsuranceCheck | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setError(null);
    setBusy(true);
    const verdict = classifyInsurance(category, terms);
    try {
      const row = await getRepo().insert("insurance_checks", {
        policy_id: policy.id,
        input_json: { category },
        result: verdict.result,
        evidence_json: { type: verdict.evidence.type, text: verdict.evidence.text, reference: verdict.evidence.reference, terms_version: policy.terms_version },
        checked_at: new Date().toISOString(),
      });
      setResult(row);
      onSaved();
    } catch {
      setResult(null);
      setError("확인 기록을 저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <SelectField
        id="check-category"
        label="어떤 진료·비용인가요?"
        value={category}
        onChange={(e) => {
          setCategory(e.target.value);
          setResult(null);
        }}
      >
        {INSURANCE_CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </SelectField>
      <Button onClick={run} disabled={busy}>
        {busy ? "확인하는 중이에요" : "확인하기"}
      </Button>
      <ErrorText>{error}</ErrorText>
      <div aria-live="polite">{result ? <CheckResult check={result} /> : null}</div>
      <p className="text-sm text-muted">결과는 &lsquo;{RESULT_LABEL.likely_covered}&rsquo;, &lsquo;{RESULT_LABEL.check_terms}&rsquo;, &lsquo;{RESULT_LABEL.generally_excluded}&rsquo; 세 가지로만 보여 드려요. {INSURANCE_FINAL_NOTE}.</p>
    </div>
  );
}

function ClaimChecklist() {
  const [checked, setChecked] = useState<string[]>([]);
  const toggle = (doc: string) => setChecked((c) => (c.includes(doc) ? c.filter((d) => d !== doc) : [...c, doc]));
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted">일반 예시예요. 보험사마다 달라요. 청구 전에 보험사 안내를 꼭 확인해 주세요. 체크 표시는 저장되지 않아요.</p>
      <ul className="flex flex-col">
        {CLAIM_DOCS.map((doc, i) => (
          <li key={doc}>
            <label htmlFor={`claim-${i}`} className="flex min-h-12 items-center gap-3">
              <input id={`claim-${i}`} type="checkbox" className="size-5 shrink-0" checked={checked.includes(doc)} onChange={() => toggle(doc)} />
              <span>{doc}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PetInsurance({ pet }: { pet: Pet }) {
  const state = useAsync(async () => {
    const repo = getRepo();
    const policies = await repo.list("insurance_policies", { eq: { pet_id: pet.id }, order: { column: "created_at", ascending: false } });
    const policy = policies[0] ?? null;
    if (!policy) return { policy, terms: [] as InsuranceTerm[], checks: [] as InsuranceCheck[] };
    const [terms, checks] = await Promise.all([
      repo.list("insurance_terms", { eq: { policy_id: policy.id }, order: { column: "created_at" } }),
      repo.list("insurance_checks", { eq: { policy_id: policy.id }, order: { column: "checked_at", ascending: false }, limit: 10 }),
    ]);
    return { policy, terms, checks };
  }, [pet.id]);

  if (state.loading) return <Loading />;
  if (state.error || !state.data) return <ErrorState onRetry={state.reload} />;
  const { policy, terms, checks } = state.data;
  const needPolicy = <p className="text-muted">먼저 위에서 보험 정보를 저장해 주세요.</p>;

  return (
    <>
      <Card as="section" className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">1. 내 보험 정보</h2>
        <p className="text-sm text-muted">
          {pet.name}의 보험 증권에 적힌 내용을 그대로 옮겨 적어 주세요.
          {policy?.user_confirmed_at ? ` 마지막으로 확인한 날: ${formatDate(policy.user_confirmed_at)}` : ""}
        </p>
        <PolicyForm key={policy ? `${policy.id}:${policy.updated_at}` : "new"} pet={pet} policy={policy} onSaved={state.reload} />
      </Card>

      <Card as="section" className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">2. 약관 조항 입력</h2>
        <p className="text-sm text-muted">내 약관에 적힌 보장·면책 문구를 옮겨 적으면, 그 문구를 근거로 확인해요.</p>
        {policy ? <TermsSection policy={policy} terms={terms} onChanged={state.reload} /> : needPolicy}
      </Card>

      <Card as="section" className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">3. 확인하기</h2>
        {policy ? <CheckSection policy={policy} terms={terms} onSaved={state.reload} /> : needPolicy}
      </Card>

      <Card as="section" className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">4. 청구 서류 체크리스트</h2>
        <ClaimChecklist />
      </Card>

      <Card as="section" className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">5. 최근 확인 기록</h2>
        {checks.length === 0 ? (
          <EmptyState title="확인한 기록이 아직 없어요" description="위에서 확인하면 여기에 남아요." />
        ) : (
          <ul className="flex flex-col gap-3">
            {checks.map((c) => (
              <li key={c.id}>
                <CheckResult check={c} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

export default function InsurancePage() {
  const { user, loading: sessionLoading } = useSession();
  const { pets, current, select, loading, error, reload } = usePets();

  return (
    <>
      <PageHeader title="보험·비용" description="내 약관을 이해하고 청구를 준비하는 도구예요." />
      <Notice tone="warn">{INSURANCE_DISCLAIMER}</Notice>
      {sessionLoading ? (
        <Loading />
      ) : !user ? (
        <LoginRequired what="보험·비용 화면" />
      ) : loading ? (
        <Loading />
      ) : error ? (
        <ErrorState onRetry={reload} />
      ) : !current ? (
        <EmptyState title="먼저 우리 아이를 등록해 주세요" description="보험 정보는 아이마다 따로 적어요." action={<LinkButton href="/pets">우리 아이 등록하러 가기</LinkButton>} />
      ) : (
        <>
          {pets.length > 1 ? (
            <SelectField id="ins-pet" label="누구의 보험인가요?" value={current.id} onChange={(e) => select(e.target.value)}>
              {pets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </SelectField>
          ) : (
            <p className="font-medium">{current.name}의 보험</p>
          )}
          <PetInsurance key={current.id} pet={current} />
        </>
      )}
    </>
  );
}
