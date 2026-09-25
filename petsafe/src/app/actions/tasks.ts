"use server";
import { revalidatePath } from "next/cache";
import { getStore } from "@/lib/session";
import { fieldErrors, formToObject, taskActionSchema, taskCreateSchema } from "@/lib/validation";
import { nextDueAt, snoozeUntil } from "@/lib/rules";
import type { FormState } from "@/components/form-message";

export async function createTaskAction(_: FormState, fd: FormData): Promise<FormState> {
  const store = await getStore();
  if (!store.user) return { ok: false, message: "로그인이 필요해요." };
  const parsed = taskCreateSchema.safeParse(formToObject(fd));
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error), message: "입력 내용을 확인해 주세요." };
  const d = parsed.data;
  if (!(await store.getPet(d.pet_id))) return { ok: false, message: "반려동물을 찾을 수 없어요." };
  const due = new Date(`${d.due_date}T${d.due_time}:00+09:00`);
  if (Number.isNaN(due.getTime())) return { ok: false, errors: { due_date: "날짜를 확인해 주세요." } };
  // 보호자가 직접 정한 일정은 템플릿보다 우선(priority=legal 다음이 아닌 별도: 'general' + 템플릿 없음)
  await store.createTasks(d.pet_id, [{ template_key: null, title: d.title, description: d.note ?? null, due_at: due.toISOString(), repeat_rule: d.repeat_rule, priority: "general" }]);
  revalidatePath("/today");
  revalidatePath("/");
  return { ok: true, message: "할 일을 추가했어요." };
}

export async function taskAction(_: FormState, fd: FormData): Promise<FormState> {
  const store = await getStore();
  if (!store.user) return { ok: false, message: "로그인이 필요해요." };
  const parsed = taskActionSchema.safeParse(formToObject(fd));
  if (!parsed.success) return { ok: false, message: "요청을 처리할 수 없어요." };
  const { task_id, action, note } = parsed.data;
  const task = await store.getTask(task_id);
  if (!task) return { ok: false, message: "할 일을 찾을 수 없어요." };
  const now = new Date();

  if (action === "complete") {
    if (task.status === "done") return { ok: true, message: "이미 완료했어요." };
    await store.updateTask(task.id, { status: "done", completed_at: now.toISOString(), snoozed_until: null });
    await store.createEvent(task.pet_id, { event_type: "task_done", occurred_at: now.toISOString(), value_json: { task_id: task.id, title: task.title }, note: task.note });
    const next = nextDueAt(task.due_at, task.repeat_rule, now);
    if (next) {
      await store.createTasks(task.pet_id, [{ template_key: task.template_key ?? null, template_id: task.template_id, title: task.title, description: task.description, due_at: next, repeat_rule: task.repeat_rule, priority: task.priority }]);
    }
  } else if (action === "snooze") {
    await store.updateTask(task.id, { status: "snoozed", snoozed_until: snoozeUntil(now) });
  } else if (action === "skip") {
    await store.updateTask(task.id, { status: "skipped" });
  } else if (action === "note") {
    await store.updateTask(task.id, { note: note ?? null });
  } else if (action === "undo") {
    await store.updateTask(task.id, { status: "pending", completed_at: null, snoozed_until: null });
  }
  revalidatePath("/today");
  revalidatePath("/");
  const msg = { complete: "완료했어요. 기록에 남겼어요.", snooze: "내일 아침으로 미뤘어요.", skip: "오늘은 건너뛰었어요.", note: "메모를 저장했어요.", undo: "되돌렸어요." }[action];
  return { ok: true, message: msg };
}
