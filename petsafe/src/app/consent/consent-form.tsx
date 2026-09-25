"use client";
import { useActionState } from "react";
import { submitConsent } from "@/app/actions/auth";
import { SubmitButton } from "@/components/submit-button";
import { FormMessage, type FormState } from "@/components/form-message";

export function ConsentForm({ next, docs }: { next: string; docs: { type: string; title: string; version: string }[] }) {
  const [state, action] = useActionState<FormState, FormData>(submitConsent, null);
  return (
    <form action={action} className="card mt-4 space-y-3">
      <input type="hidden" name="next" value={next} />
      <fieldset className="space-y-3">
        <legend className="label mb-1">필수 동의</legend>
        {docs.map((d) => (
          <div key={d.type} className="flex items-start gap-3">
            <input id={`c-${d.type}`} name={d.type} type="checkbox" className="mt-1 size-5 accent-[#0F766E]" required aria-invalid={!!state?.errors?.[d.type]} />
            <label htmlFor={`c-${d.type}`} className="flex-1">
              <span className="font-bold">[필수] {d.title}</span> 동의
              <span className="block text-xs text-muted">버전 {d.version} · <a className="link" href={`/legal/${d.type}`} target="_blank" rel="noopener noreferrer">전문 보기<span className="sr-only"> (새 창)</span></a></span>
              {state?.errors?.[d.type] && <span className="err block">{state.errors[d.type]}</span>}
            </label>
          </div>
        ))}
      </fieldset>
      <fieldset className="border-t border-line pt-3">
        <legend className="label mb-1">선택 동의</legend>
        <div className="flex items-start gap-3">
          <input id="c-marketing" name="marketing" type="checkbox" className="mt-1 size-5 accent-[#0F766E]" />
          <label htmlFor="c-marketing" className="flex-1">[선택] 새 기능·안전 소식 이메일 받기 <span className="block text-xs text-muted">동의하지 않아도 모든 기능을 쓸 수 있어요.</span></label>
        </div>
      </fieldset>
      <SubmitButton className="btn btn-primary w-full">동의하고 시작하기</SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}
