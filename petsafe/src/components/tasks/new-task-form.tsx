"use client";
import { useActionState, useRef, useEffect } from "react";
import { createTaskAction } from "@/app/actions/tasks";
import { SubmitButton } from "@/components/submit-button";
import { FieldError, FormMessage, type FormState } from "@/components/form-message";

export function NewTaskForm({ petId, today }: { petId: string; today: string }) {
  const [state, action] = useActionState<FormState, FormData>(createTaskAction, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok) ref.current?.reset(); }, [state]);
  return (
    <form ref={ref} action={action} className="space-y-3" noValidate>
      <input type="hidden" name="pet_id" value={petId} />
      <div className="field">
        <label htmlFor="task-title" className="label">할 일<span className="req" aria-hidden="true">*</span></label>
        <input id="task-title" name="title" className="input" maxLength={120} required placeholder="예: 수의사 안내대로 귀 세정" aria-invalid={!!state?.errors?.title} aria-describedby={state?.errors?.title ? "task-title-err" : undefined} />
        <FieldError id="task-title-err" error={state?.errors?.title} />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <div className="field">
          <label htmlFor="task-date" className="label">날짜</label>
          <input id="task-date" name="due_date" type="date" className="input" defaultValue={today} required />
          <FieldError id="task-date-err" error={state?.errors?.due_date} />
        </div>
        <div className="field">
          <label htmlFor="task-time" className="label">시간</label>
          <input id="task-time" name="due_time" type="time" className="input" defaultValue="21:00" />
        </div>
        <div className="field col-span-2 sm:col-span-1">
          <label htmlFor="task-repeat" className="label">반복</label>
          <select id="task-repeat" name="repeat_rule" className="input" defaultValue="none">
            <option value="none">반복 없음</option><option value="daily">매일</option><option value="weekly">매주</option><option value="monthly">매월</option>
          </select>
        </div>
      </div>
      <SubmitButton>추가</SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}
