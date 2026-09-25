"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { createPetAction } from "@/app/actions/pets";
import { SubmitButton } from "@/components/submit-button";
import { FormMessage, type FormState } from "@/components/form-message";
import { BodyFields, HealthFields, LifeFields, SpeciesNameFields } from "@/components/pets/pet-fields";

const DRAFT_KEY = "petsafe365:onboarding-draft";
const STEPS = ["기본 정보", "나이·몸", "건강", "생활·등록"];

export function OnboardingForm() {
  const [state, action] = useActionState<FormState, FormData>(createPetAction, null);
  const [step, setStep] = useState(0);
  const [stepError, setStepError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // 중단 후 재개: 이 기기(localStorage)에 초안 보관. 서버에는 제출 전까지 저장하지 않는다.
  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw) as { values: Record<string, string>; step: number };
        for (const [k, v] of Object.entries(draft.values)) {
          const els = form.querySelectorAll<HTMLInputElement>(`[name="${CSS.escape(k)}"]`);
          els.forEach((el) => {
            if (el.type === "radio" || el.type === "checkbox") el.checked = el.value === v;
            else el.value = v;
          });
        }
        queueMicrotask(() => setStep(Math.min(draft.step ?? 0, STEPS.length - 1)));
      }
    } catch { /* 저장소 접근 불가 시 무시 */ }
  }, []);

  useEffect(() => { headingRef.current?.focus(); }, [step]);

  // 서버 검증 오류가 있는 단계로 이동
  useEffect(() => {
    if (!state?.errors) return;
    const keys = Object.keys(state.errors);
    const stepOf = (k: string) => (["species", "name"].includes(k) ? 0 : ["birth_date", "weight_kg", "sex", "neutered"].includes(k) ? 1 : ["diseases", "allergies"].includes(k) ? 2 : 3);
    queueMicrotask(() => setStep(Math.min(...keys.map(stepOf))));
  }, [state]);

  function saveDraft() {
    const form = formRef.current;
    if (!form) return;
    const values: Record<string, string> = {};
    new FormData(form).forEach((v, k) => { if (typeof v === "string") values[k] = v; });
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ values, step })); } catch { /* ignore */ }
  }

  function goNext() {
    const form = formRef.current!;
    if (step === 0) {
      const fd = new FormData(form);
      if (!fd.get("species") || !String(fd.get("name") ?? "").trim()) { setStepError("종류와 이름을 입력해 주세요."); return; }
    }
    setStepError(null);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  return (
    <form ref={formRef} action={action} onChange={saveDraft} onSubmit={() => { try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ } }} className="card mt-4 space-y-4" noValidate>
      <ol className="flex gap-1" aria-label="진행 단계">
        {STEPS.map((s, i) => (
          <li key={s} className={`flex-1 h-1.5 rounded-full ${i <= step ? "bg-primary" : "bg-line"}`} aria-current={i === step ? "step" : undefined}>
            <span className="sr-only">{i + 1}단계 {s}{i < step ? " 완료" : ""}</span>
          </li>
        ))}
      </ol>
      <h2 ref={headingRef} tabIndex={-1} className="h2">{step + 1}/{STEPS.length} · {STEPS[step]}</h2>
      <div hidden={step !== 0} className="space-y-4"><SpeciesNameFields errors={state?.errors} /></div>
      <div hidden={step !== 1} className="space-y-4"><BodyFields errors={state?.errors} /></div>
      <div hidden={step !== 2} className="space-y-4"><HealthFields errors={state?.errors} /></div>
      <div hidden={step !== 3} className="space-y-4"><LifeFields errors={state?.errors} /></div>
      {stepError && <p role="alert" className="err">{stepError}</p>}
      <div className="flex gap-2">
        {step > 0 && <button type="button" className="btn btn-outline" onClick={() => setStep((s) => s - 1)}>이전</button>}
        {step < STEPS.length - 1 ? (
          <>
            <button type="button" className="btn btn-primary flex-1" onClick={goNext}>다음</button>
            {step > 0 && <SubmitButton className="btn btn-outline" pendingText="등록 중…">여기까지 저장</SubmitButton>}
          </>
        ) : (
          <SubmitButton className="btn btn-primary flex-1" pendingText="등록 중…">등록하고 오늘 할 일 보기</SubmitButton>
        )}
      </div>
      <FormMessage state={state} />
    </form>
  );
}
