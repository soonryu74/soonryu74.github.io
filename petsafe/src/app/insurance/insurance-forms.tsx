"use client";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { addTermAction, createPolicyAction, deletePolicyAction, deleteTermAction, runCheckAction } from "@/app/actions/insurance";
import { SubmitButton } from "@/components/submit-button";
import { FieldError, FormMessage, type FormState } from "@/components/form-message";
import { TREATMENT_CATEGORIES } from "@/content/insurance";

function F({ id, label, name, type = "text", err, req, ...rest }: { id: string; label: string; name: string; type?: string; err?: string; req?: boolean } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="field">
      <label htmlFor={id} className="label">{label}{req ? <span className="req" aria-hidden="true">*</span> : <span className="opt">선택</span>}</label>
      <input id={id} name={name} type={type} className="input" aria-invalid={!!err} aria-describedby={err ? `${id}-err` : undefined} {...rest} />
      <FieldError id={`${id}-err`} error={err} />
    </div>
  );
}

export function PolicyForm({ petId }: { petId: string }) {
  const [state, action] = useActionState<FormState, FormData>(createPolicyAction, null);
  const e = state?.errors;
  return (
    <form action={action} className="space-y-3 mt-3" noValidate>
      <input type="hidden" name="pet_id" value={petId} />
      <div className="grid sm:grid-cols-2 gap-2">
        <F id="p-ins" name="insurer" label="보험사" req err={e?.insurer} maxLength={80} />
        <F id="p-prod" name="product_name" label="상품명" req err={e?.product_name} maxLength={120} />
        <F id="p-ver" name="terms_version" label="약관 버전(약관 표지의 개정일 등)" err={e?.terms_version} maxLength={60} />
        <F id="p-cc" name="customer_center" label="보험사 고객센터" type="tel" err={e?.customer_center} />
        <F id="p-join" name="joined_at" label="가입일" type="date" err={e?.joined_at} />
        <F id="p-renew" name="renewal_at" label="갱신일" type="date" err={e?.renewal_at} />
        <F id="p-annual" name="annual_limit" label="연간 한도(원)" type="number" inputMode="numeric" min={0} err={e?.annual_limit} />
        <F id="p-visit" name="per_visit_limit" label="1회 한도(원)" type="number" inputMode="numeric" min={0} err={e?.per_visit_limit} />
        <F id="p-rate" name="coverage_rate" label="보상 비율(%)" type="number" min={0} max={100} err={e?.coverage_rate} />
        <F id="p-ded" name="deductible_per_visit" label="자기부담금 1회(원)" type="number" inputMode="numeric" min={0} err={e?.deductible_per_visit} />
      </div>
      <SubmitButton>보험 정보 저장</SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}

export function TermForm({ policyId }: { policyId: string }) {
  const [state, action] = useActionState<FormState, FormData>(addTermAction, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok) ref.current?.reset(); }, [state]);
  return (
    <form ref={ref} action={action} className="space-y-3 mt-3" noValidate>
      <input type="hidden" name="policy_id" value={policyId} />
      <div className="grid sm:grid-cols-3 gap-2">
        <div className="field">
          <label htmlFor="t-cat" className="label">진료 유형</label>
          <select id="t-cat" name="category" className="input">{TREATMENT_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}</select>
        </div>
        <div className="field">
          <label htmlFor="t-class" className="label">약관상 구분</label>
          <select id="t-class" name="classification" className="input" defaultValue="unknown">
            <option value="covered">보장</option><option value="excluded">면책·제외</option><option value="conditional">조건부(특약·기간 등)</option><option value="unknown">잘 모르겠음</option>
          </select>
        </div>
        <F id="t-ref" name="clause_reference" label="조항 번호" maxLength={80} placeholder="예: 제5조 2항" />
      </div>
      <div className="field">
        <label htmlFor="t-text" className="label">약관 문구<span className="req" aria-hidden="true">*</span></label>
        <textarea id="t-text" name="clause_text" rows={3} maxLength={2000} className="input" aria-invalid={!!state?.errors?.clause_text} aria-describedby={state?.errors?.clause_text ? "t-text-err" : undefined} />
        <FieldError id="t-text-err" error={state?.errors?.clause_text} />
      </div>
      <SubmitButton>조항 저장</SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}

export function CheckForm({ policyId }: { policyId: string }) {
  const [state, action] = useActionState<FormState, FormData>(runCheckAction, null);
  return (
    <form action={action} className="flex flex-wrap gap-2 items-end">
      <input type="hidden" name="policy_id" value={policyId} />
      <div className="field flex-1 min-w-[12rem]">
        <label htmlFor="c-cat" className="label">진료 유형 또는 영수증 항목</label>
        <select id="c-cat" name="category" className="input">{TREATMENT_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}</select>
      </div>
      <SubmitButton pendingText="확인 중…">확인하기</SubmitButton>
      <div className="w-full"><FormMessage state={state} /></div>
    </form>
  );
}

export function TermDelete({ policyId, termId }: { policyId: string; termId: string }) {
  const [pending, start] = useTransition();
  return <button type="button" className="text-xs link" disabled={pending} onClick={() => { if (confirm("이 조항을 삭제할까요?")) start(() => deleteTermAction(policyId, termId)); }}>삭제</button>;
}

export function PolicyDelete({ policyId }: { policyId: string }) {
  const [pending, start] = useTransition();
  return <button type="button" className="btn btn-outline btn-sm mt-3" disabled={pending} onClick={() => { if (confirm("이 보험 정보와 조항·확인 기록을 모두 삭제할까요?")) start(() => deletePolicyAction(policyId)); }}>{pending ? "삭제 중…" : "보험 정보 삭제"}</button>;
}

const CLAIM_KEY = "petsafe365:claim-checklist";
export function ClaimChecklist({ items }: { items: string[] }) {
  const [checked, setChecked] = useState<string[]>([]);
  useEffect(() => { try { const v = JSON.parse(localStorage.getItem(CLAIM_KEY) ?? "[]"); if (Array.isArray(v)) queueMicrotask(() => setChecked(v)); } catch { /* ignore */ } }, []);
  function toggle(item: string, on: boolean) {
    const next = on ? [...checked, item] : checked.filter((x) => x !== item);
    setChecked(next);
    try { localStorage.setItem(CLAIM_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  }
  return (
    <ul className="space-y-1">
      {items.map((it, i) => (
        <li key={it}><label className="flex items-center gap-2 min-h-[40px]"><input id={`claim-${i}`} type="checkbox" className="size-5 accent-[#0F766E]" checked={checked.includes(it)} onChange={(e) => toggle(it, e.target.checked)} /> {it}</label></li>
      ))}
    </ul>
  );
}
