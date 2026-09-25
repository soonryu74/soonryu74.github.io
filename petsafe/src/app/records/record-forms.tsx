"use client";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { createEventAction, deleteDocumentAction, deleteEventAction, uploadDocumentAction } from "@/app/actions/records";
import { SubmitButton } from "@/components/submit-button";
import { FieldError, FormMessage, type FormState } from "@/components/form-message";
import { Timeline } from "@/components/records/timeline";
import { DOCUMENT_TYPES, EVENT_TYPES } from "@/lib/validation";
import type { HealthEvent } from "@/lib/types";

export function EventForm({ petId, today }: { petId: string; today: string }) {
  const [state, action] = useActionState<FormState, FormData>(createEventAction, null);
  const [type, setType] = useState<keyof typeof EVENT_TYPES>("weight");
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok) { ref.current?.reset(); } }, [state]);
  const e = state?.errors;
  return (
    <form ref={ref} action={action} className="space-y-3" noValidate>
      <input type="hidden" name="pet_id" value={petId} />
      <div className="grid grid-cols-2 gap-2">
        <div className="field">
          <label htmlFor="ev-type" className="label">종류</label>
          <select id="ev-type" name="event_type" className="input" value={type} onChange={(x) => setType(x.target.value as keyof typeof EVENT_TYPES)}>
            {Object.entries(EVENT_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="ev-date" className="label">날짜</label>
          <input id="ev-date" name="occurred_date" type="date" className="input" defaultValue={today} max={today} required />
        </div>
      </div>
      {type === "weight" && (
        <div className="field">
          <label htmlFor="ev-weight" className="label">체중(kg)<span className="req" aria-hidden="true">*</span></label>
          <input id="ev-weight" name="weight_kg" type="number" step="0.01" min="0.05" inputMode="decimal" className="input" aria-invalid={!!e?.weight_kg} aria-describedby={e?.weight_kg ? "ev-weight-err" : undefined} />
          <FieldError id="ev-weight-err" error={e?.weight_kg} />
        </div>
      )}
      {type === "cost" && (
        <div className="grid grid-cols-2 gap-2">
          <div className="field">
            <label htmlFor="ev-amount" className="label">금액(원)<span className="req" aria-hidden="true">*</span></label>
            <input id="ev-amount" name="amount_krw" type="number" min="0" inputMode="numeric" className="input" aria-invalid={!!e?.amount_krw} aria-describedby={e?.amount_krw ? "ev-amount-err" : undefined} />
            <FieldError id="ev-amount-err" error={e?.amount_krw} />
          </div>
          <div className="field">
            <label htmlFor="ev-place" className="label">장소<span className="opt">선택</span></label>
            <input id="ev-place" name="place" className="input" maxLength={80} />
          </div>
        </div>
      )}
      {(type === "visit" || type === "exam") && (
        <div className="field">
          <label htmlFor="ev-place2" className="label">병원<span className="opt">선택</span></label>
          <input id="ev-place2" name="place" className="input" maxLength={80} />
        </div>
      )}
      <div className="field">
        <label htmlFor="ev-note" className="label">메모{type === "weight" || type === "cost" ? <span className="opt">선택</span> : <span className="req" aria-hidden="true">*</span>}</label>
        <textarea id="ev-note" name="note" rows={2} maxLength={1000} className="input" placeholder={type === "medication_note" ? "수의사가 처방한 내용을 그대로 적어 두세요." : "관찰한 내용"} aria-invalid={!!e?.note} aria-describedby={e?.note ? "ev-note-err" : undefined} />
        <FieldError id="ev-note-err" error={e?.note} />
      </div>
      <SubmitButton>기록하기</SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}

export function EventList({ events, petId }: { events: HealthEvent[]; petId: string }) {
  const [pending, start] = useTransition();
  return (
    <Timeline events={events} onDelete={(ev) => ev.event_type === "task_done" ? null : (
      <button type="button" className="text-xs link ml-auto" disabled={pending} aria-label={`${ev.occurred_at} 기록 삭제`}
        onClick={() => { if (confirm("이 기록을 삭제할까요?")) start(() => deleteEventAction(petId, ev.id)); }}>삭제</button>
    )} />
  );
}

export function UploadForm({ petId }: { petId: string }) {
  const [state, action] = useActionState<FormState, FormData>(uploadDocumentAction, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok) ref.current?.reset(); }, [state]);
  const e = state?.errors;
  return (
    <form ref={ref} action={action} className="space-y-3" noValidate>
      <input type="hidden" name="pet_id" value={petId} />
      <div className="grid sm:grid-cols-2 gap-2">
        <div className="field">
          <label htmlFor="doc-type" className="label">문서 종류</label>
          <select id="doc-type" name="document_type" className="input" defaultValue="receipt">
            {Object.entries(DOCUMENT_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <FieldError id="doc-type-err" error={e?.document_type} />
        </div>
        <div className="field">
          <label htmlFor="doc-file" className="label">파일</label>
          <input id="doc-file" name="file" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,application/pdf,image/*" className="input py-2" aria-invalid={!!e?.file} aria-describedby={e?.file ? "doc-file-err" : undefined} />
          <FieldError id="doc-file-err" error={e?.file} />
        </div>
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="rights_confirmed" className="mt-1 size-4 accent-[#0F766E]" aria-invalid={!!e?.rights_confirmed} />
        <span>본인 소유 자료이고, 다른 사람의 얼굴·연락처 등 개인정보가 드러나지 않음을 확인했어요.</span>
      </label>
      <FieldError id="doc-rights-err" error={e?.rights_confirmed} />
      <SubmitButton pendingText="올리는 중…">비공개로 올리기</SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}

export function DocumentDelete({ id, name }: { id: string; name: string }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" className="btn btn-outline btn-sm" disabled={pending} aria-label={`${name} 삭제`}
      onClick={() => { if (confirm(`'${name}'을(를) 영구 삭제할까요?`)) start(() => deleteDocumentAction(id)); }}>
      {pending ? "삭제 중…" : "삭제"}
    </button>
  );
}
