"use client";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { addLetterAction, deleteLetterAction, markPassedAction, toggleRemindersAction, undoPassedAction } from "@/app/actions/memorial";
import { SubmitButton } from "@/components/submit-button";
import { FieldError, FormMessage, type FormState } from "@/components/form-message";

export function MarkPassedForm({ petId, name, today }: { petId: string; name: string; today: string }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState<FormState, FormData>(markPassedAction.bind(null, petId), null);
  if (!open) return <button type="button" className="btn btn-outline btn-sm mt-2" onClick={() => setOpen(true)}>{name}를(을) 떠나보냈어요</button>;
  return (
    <form action={action} className="mt-3 space-y-2">
      <p className="text-sm">마음이 많이 아프시죠. 날짜를 남기면 돌봄 알림을 멈추고, 그동안의 기록으로 &lsquo;함께한 날들&rsquo; 페이지를 만들어 드려요. 기록은 지워지지 않아요.</p>
      <div className="field">
        <label htmlFor="passed_at" className="label">떠나보낸 날</label>
        <input id="passed_at" name="passed_at" type="date" className="input" max={today} defaultValue={today} aria-invalid={!!state?.errors?.passed_at} aria-describedby={state?.errors?.passed_at ? "passed_at-err" : undefined} />
        <FieldError id="passed_at-err" error={state?.errors?.passed_at} />
      </div>
      <div className="flex gap-2">
        <button type="button" className="btn btn-outline btn-sm" onClick={() => setOpen(false)}>취소</button>
        <SubmitButton className="btn btn-primary btn-sm" pendingText="기록 중…">기록하기</SubmitButton>
      </div>
      <FormMessage state={state} />
    </form>
  );
}

export function UndoPassed({ petId }: { petId: string }) {
  const [pending, start] = useTransition();
  return <button type="button" className="text-xs link" disabled={pending} onClick={() => { if (confirm("잘못 기록했나요? 되돌리면 다시 돌봄 대상이 돼요. 이미 멈춘 할 일은 다시 만들어지지 않아요.")) start(() => undoPassedAction(petId)); }}>잘못 눌렀어요 (되돌리기)</button>;
}

export function ReminderToggle({ petId, on }: { petId: string; on: boolean }) {
  const [pending, start] = useTransition();
  return (
    <label className="flex items-center gap-2 text-sm min-h-[40px]">
      <input type="checkbox" className="size-5 accent-[#0F766E]" defaultChecked={on} disabled={pending} onChange={(e) => { const v = e.target.checked; start(() => toggleRemindersAction(petId, v)); }} />
      100일·기일에 홈 화면에서 조용히 알려 주기
    </label>
  );
}

export function LetterForm({ petId, name }: { petId: string; name: string }) {
  const [state, action] = useActionState<FormState, FormData>(addLetterAction.bind(null, petId), null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok) ref.current?.reset(); }, [state]);
  return (
    <form ref={ref} action={action} className="space-y-2">
      <div className="field">
        <label htmlFor="letter" className="label">{name}에게 하고 싶은 말</label>
        <textarea id="letter" name="body" rows={4} maxLength={2000} className="input" aria-invalid={!!state?.errors?.body} aria-describedby={state?.errors?.body ? "letter-err" : undefined} />
        <FieldError id="letter-err" error={state?.errors?.body} />
      </div>
      <SubmitButton className="btn btn-primary btn-sm" pendingText="남기는 중…">편지 남기기</SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}

export function LetterDelete({ petId, id }: { petId: string; id: string }) {
  const [pending, start] = useTransition();
  return <button type="button" className="text-xs link" disabled={pending} onClick={() => { if (confirm("이 편지를 지울까요?")) start(() => deleteLetterAction(petId, id)); }}>지우기</button>;
}
