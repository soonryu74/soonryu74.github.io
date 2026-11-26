// 여러 테이블을 묶는 업무 동작. 화면은 이 함수들을 통해서만 복합 작업을 한다.
import { getRepo } from "./repo";
import { nextDue, pickInitialTemplates } from "./rules";
import type { CareTask, ContentCard, ContentVersion, FeatureFlagKey, ID, Insert, LegalDocument, Pet, SessionUser } from "./types";

export async function audit(action: string, entityType: string, entityId: string | null, metadata: Record<string, unknown> = {}) {
  const repo = getRepo();
  const user = await repo.auth.getUser();
  if (!user) return;
  await repo.insert("audit_logs", { actor_id: user.id, action, entity_type: entityType, entity_id: entityId, metadata_json: metadata });
}

/** 반려동물을 등록하고 규칙 엔진으로 기본 할 일을 만든다. */
export async function createPetWithTasks(user: SessionUser, values: Omit<Insert<"pets">, "owner_id" | "deleted_at">): Promise<Pet> {
  const repo = getRepo();
  const pet = await repo.insert("pets", { ...values, owner_id: user.id, deleted_at: null });
  const templates = await repo.list("care_task_templates");
  const now = new Date();
  const picked = pickInitialTemplates(pet, templates, now);
  for (const [index, t] of picked.entries()) {
    await repo.insert("care_tasks", {
      pet_id: pet.id, template_id: t.id, title: t.title, due_at: now.toISOString(), repeat_rule: t.repeat_rule,
      priority: index, status: "open", completed_at: null, note: null, created_by: user.id,
    });
  }
  return pet;
}

/** 할 일을 완료 처리하고 타임라인에 남긴다. 반복 일정이면 다음 일정을 만든다. */
export async function completeTask(task: CareTask, note?: string): Promise<void> {
  const repo = getRepo();
  const now = new Date();
  await repo.update("care_tasks", task.id, { status: "done", completed_at: now.toISOString(), note: note ?? task.note });
  await repo.insert("health_events", {
    pet_id: task.pet_id, event_type: "task_done", occurred_at: now.toISOString(), value_json: { task_id: task.id, title: task.title }, note: note ?? null, visibility: "private",
  });
  const due = nextDue(now, task.repeat_rule);
  if (due) {
    await repo.insert("care_tasks", {
      pet_id: task.pet_id, template_id: task.template_id, title: task.title, due_at: due.toISOString(), repeat_rule: task.repeat_rule,
      priority: task.priority, status: "open", completed_at: null, note: null, created_by: task.created_by,
    });
  }
}

export async function snoozeTask(task: CareTask, days = 1): Promise<void> {
  const due = new Date();
  due.setDate(due.getDate() + days);
  await getRepo().update("care_tasks", task.id, { status: "snoozed", due_at: due.toISOString() });
}

/** 오늘 보여 줄 할 일: 기한이 오늘까지인 미완료 + 오늘 완료한 것. */
export function tasksForToday(tasks: CareTask[], now: Date): CareTask[] {
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  return tasks
    .filter((t) => (t.status !== "done" && new Date(t.due_at) <= end) || (t.status === "done" && t.completed_at !== null && new Date(t.completed_at) >= start))
    .sort((a, b) => Number(a.status === "done") - Number(b.status === "done") || a.priority - b.priority);
}

/** 반려동물 삭제: 연관된 일정·기록·문서·보험 메모를 함께 지운다. */
export async function deletePetCascade(petId: ID): Promise<void> {
  const repo = getRepo();
  for (const doc of await repo.list("documents", { eq: { pet_id: petId } })) await repo.files.remove(doc);
  if (repo.mode === "example") {
    for (const table of ["care_tasks", "health_events", "pet_conditions"] as const) {
      for (const row of await repo.list(table, { eq: { pet_id: petId } as never })) await repo.remove(table, row.id);
    }
    for (const policy of await repo.list("insurance_policies", { eq: { pet_id: petId } })) {
      for (const table of ["insurance_terms", "insurance_checks"] as const) {
        for (const row of await repo.list(table, { eq: { policy_id: policy.id } as never })) await repo.remove(table, row.id);
      }
      await repo.remove("insurance_policies", policy.id);
    }
  }
  // 실제 DB 는 외래키 on delete cascade 로 연관 행이 함께 삭제된다.
  await repo.remove("pets", petId);
}

export async function recordConsents(user: SessionUser, docs: LegalDocument[], marketing: boolean): Promise<void> {
  const repo = getRepo();
  const now = new Date().toISOString();
  for (const d of docs) {
    await repo.insert("user_consents", { user_id: user.id, document_type: d.document_type, document_version: d.version, consented_at: now, ip_hash: null });
  }
  if (marketing) {
    await repo.insert("user_consents", { user_id: user.id, document_type: "marketing", document_version: "1", consented_at: now, ip_hash: null });
  }
}

export async function getFlags(): Promise<Record<FeatureFlagKey, boolean>> {
  const flags: Record<FeatureFlagKey, boolean> = {
    paymentsEnabled: false, partnerSubscriptionsEnabled: false, insuranceReferralEnabled: false,
    preciseLocationStorageEnabled: false, publicReviewsEnabled: false, adsEnabled: false,
  };
  try {
    for (const row of await getRepo().list("feature_flags")) if (row.key in flags) flags[row.key] = row.enabled === true;
  } catch {
    // 불러오지 못하면 모두 꺼진 상태로 둔다.
  }
  return flags;
}

export async function getContent(slug: string): Promise<{ card: ContentCard; version: ContentVersion | null } | null> {
  const repo = getRepo();
  const [card] = await repo.list("content_cards", { eq: { slug } });
  if (!card) return null;
  const version = card.current_version_id ? await repo.get("content_versions", card.current_version_id) : null;
  return { card, version };
}
