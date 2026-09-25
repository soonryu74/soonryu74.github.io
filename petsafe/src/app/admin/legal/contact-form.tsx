"use client";
import { useActionState } from "react";
import { updateContactAction } from "@/app/actions/admin";
import { SubmitButton } from "@/components/submit-button";
import { FormMessage, type FormState } from "@/components/form-message";
import type { OfficialContactRow } from "@/lib/types";

export function ContactForm({ contact: c }: { contact: OfficialContactRow }) {
  const [state, action] = useActionState<FormState, FormData>(updateContactAction, null);
  return (
    <form action={action} className="rounded-xl border border-line p-3 space-y-2">
      <input type="hidden" name="id" value={c.id} />
      <p className="font-bold">{c.organization} <span className="badge badge-muted">{c.category}</span> <span className="text-xs text-muted">확인일 {c.verified_at ?? "없음"}</span></p>
      <div className="grid sm:grid-cols-4 gap-2">
        <div className="field"><label className="label" htmlFor={`ph-${c.id}`}>전화</label><input id={`ph-${c.id}`} name="phone" className="input" defaultValue={c.phone ?? ""} /></div>
        <div className="field"><label className="label" htmlFor={`url-${c.id}`}>링크</label><input id={`url-${c.id}`} name="url" className="input" defaultValue={c.url ?? ""} /></div>
        <div className="field"><label className="label" htmlFor={`src-${c.id}`}>근거 주소</label><input id={`src-${c.id}`} name="source_url" className="input" defaultValue={c.source_url ?? ""} /></div>
        <div className="field"><label className="label" htmlFor={`st-${c.id}`}>상태</label>
          <select id={`st-${c.id}`} name="status" className="input" defaultValue={c.status}><option value="active">게시</option><option value="pending_verification">확인 대기</option><option value="retired">종료</option></select></div>
      </div>
      <SubmitButton className="btn btn-outline btn-sm">확인 기록</SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}
