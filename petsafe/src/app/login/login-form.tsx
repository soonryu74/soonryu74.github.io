"use client";
import { useActionState } from "react";
import { requestLogin } from "@/app/actions/auth";
import { SubmitButton } from "@/components/submit-button";
import { FieldError, FormMessage, type FormState } from "@/components/form-message";

export function LoginForm({ next, demo }: { next: string; demo: boolean }) {
  const [state, action] = useActionState<FormState, FormData>(requestLogin, null);
  return (
    <form action={action} className="card mt-4 space-y-3" noValidate>
      <input type="hidden" name="next" value={next} />
      <div className="field">
        <label htmlFor="email" className="label">이메일<span className="req" aria-hidden="true">*</span></label>
        <input id="email" name="email" type="email" autoComplete="email" required className="input"
          aria-invalid={!!state?.errors?.email} aria-describedby={state?.errors?.email ? "email-err" : undefined} />
        <FieldError id="email-err" error={state?.errors?.email} />
      </div>
      {demo && (
        <p className="rounded-xl border border-[#FCD34D] bg-[#FFFBEB] text-[#78350F] text-sm p-3">
          예시 모드에서는 이메일이 발송되지 않고, 입력한 주소로 예시 계정에 바로 들어갑니다. 저장 내용은 이 서버의 로컬 파일에만 남습니다.
        </p>
      )}
      <SubmitButton className="btn btn-primary w-full" pendingText="보내는 중…">{demo ? "예시 모드로 로그인" : "로그인 링크 받기"}</SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}
