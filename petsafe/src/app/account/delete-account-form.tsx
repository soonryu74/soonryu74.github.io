"use client";
import { useActionState } from "react";
import { deleteAccountAction } from "@/app/actions/account";
import { SubmitButton } from "@/components/submit-button";
import { FieldError, FormMessage, type FormState } from "@/components/form-message";

export function DeleteAccountForm() {
  const [state, action] = useActionState<FormState, FormData>(deleteAccountAction, null);
  return (
    <form action={action} className="mt-3 space-y-2">
      <div className="field">
        <label htmlFor="del-confirm" className="label">확인을 위해 &lsquo;탈퇴합니다&rsquo;를 입력하세요</label>
        <input id="del-confirm" name="confirm" className="input" autoComplete="off" aria-invalid={!!state?.errors?.confirm} aria-describedby={state?.errors?.confirm ? "del-confirm-err" : undefined} />
        <FieldError id="del-confirm-err" error={state?.errors?.confirm} />
      </div>
      <SubmitButton className="btn btn-danger" pendingText="처리 중…">탈퇴하기</SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}
