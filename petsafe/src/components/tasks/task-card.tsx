"use client";
import { useActionState } from "react";
import { taskAction } from "@/app/actions/tasks";
import { FormMessage, type FormState } from "@/components/form-message";
import type { CareTask } from "@/lib/types";

const PRIORITY: Record<string, { label: string; cls: string }> = {
  legal: { label: "법정 의무", cls: "badge-info" },
  safety: { label: "안전", cls: "badge-warn" },
  health: { label: "건강", cls: "badge-ok" },
  general: { label: "내 일정", cls: "badge-muted" },
  lifestyle: { label: "생활", cls: "badge-muted" },
};
const REPEAT: Record<string, string> = { daily: "매일", weekly: "매주", monthly: "매월" };

function ActionButton({ task, action, label, className }: { task: CareTask; action: string; label: string; className: string }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(taskAction, null);
  return (
    <form action={formAction}>
      <input type="hidden" name="task_id" value={task.id} />
      <input type="hidden" name="action" value={action} />
      <button type="submit" className={className} disabled={pending} aria-label={`${task.title} ${label}`}>{pending ? "처리 중…" : label}</button>
      {state && !state.ok && <FormMessage state={state} />}
    </form>
  );
}

export function TaskCard({ task }: { task: CareTask }) {
  const [noteState, noteAction, notePending] = useActionState<FormState, FormData>(taskAction, null);
  const done = task.status === "done";
  const p = PRIORITY[task.priority] ?? PRIORITY.general;
  const overdue = !done && new Date(task.due_at) < new Date(new Date().toDateString());
  return (
    <li className={`card ${done ? "opacity-75" : ""}`}>
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className={`mt-1 size-6 shrink-0 rounded-full border-2 grid place-items-center ${done ? "bg-primary border-primary text-white" : "border-slate-400"}`}>{done ? "✓" : ""}</span>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`badge ${p.cls}`}>{p.label}</span>
            {task.repeat_rule && <span className="badge badge-muted">{REPEAT[task.repeat_rule]}</span>}
            {overdue && <span className="badge badge-danger">기한 지남</span>}
            {task.status === "snoozed" && <span className="badge badge-muted">미룸</span>}
          </div>
          <h3 className={`h3 mt-1 break-words ${done ? "line-through" : ""}`}>{task.title}{done && <span className="sr-only"> (완료)</span>}</h3>
          {task.description && <p className="text-sm text-muted">{task.description}</p>}
          {task.note && <p className="text-sm mt-1 bg-slate-50 rounded-lg p-2 whitespace-pre-line"><span className="font-bold">메모</span> {task.note}</p>}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {done ? (
          <ActionButton task={task} action="undo" label="완료 취소" className="btn btn-outline btn-sm" />
        ) : (
          <>
            <ActionButton task={task} action="complete" label="완료" className="btn btn-primary btn-sm" />
            <ActionButton task={task} action="snooze" label="내일로 미루기" className="btn btn-outline btn-sm" />
          </>
        )}
        <details className="w-full">
          <summary className="cursor-pointer text-sm link inline-block py-2">메모 {task.note ? "수정" : "남기기"}</summary>
          <form action={noteAction} className="mt-2 space-y-2">
            <input type="hidden" name="task_id" value={task.id} />
            <input type="hidden" name="action" value="note" />
            <label htmlFor={`note-${task.id}`} className="sr-only">{task.title} 메모</label>
            <textarea id={`note-${task.id}`} name="note" rows={2} maxLength={500} className="input" defaultValue={task.note ?? ""} />
            <button type="submit" className="btn btn-outline btn-sm" disabled={notePending}>{notePending ? "저장 중…" : "메모 저장"}</button>
            <FormMessage state={noteState} />
          </form>
        </details>
      </div>
    </li>
  );
}
