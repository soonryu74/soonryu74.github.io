// 해야 할 것 엔진: 반려동물 정보 + 버전 템플릿 → 오늘 할 일
import type { CareTaskTemplate, LifeStage } from "@/content/care-task-templates";
import type { Pet, TaskPriority } from "@/lib/types";
import { ageInMonths, kstDayRange, kstMonth } from "@/lib/dates";

// 우선순위: 보호자/수의사 지정(template 없음) > 법정 > 안전 > 건강 > 일반 > 생활
export const PRIORITY_ORDER: TaskPriority[] = ["legal", "safety", "health", "general", "lifestyle"];

export function lifeStageOf(pet: Pick<Pet, "species" | "birth_date">, now = new Date()): LifeStage | null {
  const m = ageInMonths(pet.birth_date, now);
  if (m === null) return null;
  if (m < 12) return "young";
  const seniorMonths = pet.species === "cat" ? 11 * 12 : 8 * 12; // 일반 권고 기준(견 7~8세, 묘 11세 전후)
  return m >= seniorMonths ? "senior" : "adult";
}

export function templateMatches(t: CareTaskTemplate, pet: Pet, now = new Date()): boolean {
  const r = t.rule;
  if (t.species && t.species !== pet.species) return false;
  if (r.species && r.species !== pet.species) return false;
  if (r.lifeStage) {
    const stage = lifeStageOf(pet, now);
    if (!stage || !r.lifeStage.includes(stage)) return false;
  }
  if (r.registrationStatus && !r.registrationStatus.includes(pet.registration_status)) return false;
  if (r.insuranceStatus && !r.insuranceStatus.includes(pet.insurance_status)) return false;
  if (r.indoor !== undefined && pet.indoor !== r.indoor) return false;
  if (r.multiPet !== undefined && pet.multi_pet !== r.multiPet) return false;
  if (r.months && !r.months.includes(kstMonth(now))) return false;
  return true;
}

export type NewTask = {
  template_key: string | null;
  template_id?: string | null;
  title: string;
  description: string | null;
  due_at: string;
  repeat_rule: "daily" | "weekly" | "monthly" | null;
  priority: TaskPriority;
};

export function sortByPriority<T extends { priority: TaskPriority }>(items: T[]): T[] {
  return [...items].sort((a, b) => PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority));
}

/** 첫 등록 시 기본 할 일(기본 3개). 법정·안전 우선. */
export function generateInitialTasks(pet: Pet, templates: CareTaskTemplate[], now = new Date(), count = 3): NewTask[] {
  const { start } = kstDayRange(now);
  const due = new Date(start.getTime() + 21 * 3600 * 1000).toISOString(); // 오늘 21시(KST)
  const matched = sortByPriority(templates.filter((t) => templateMatches(t, pet, now)));
  return matched.slice(0, count).map((t) => ({
    template_key: t.key,
    title: t.title,
    description: t.description,
    due_at: due,
    repeat_rule: t.rule.repeat,
    priority: t.priority,
  }));
}

/** 반복 할 일 완료 시 다음 회차 기한 */
export function nextDueAt(dueAt: string, rule: "daily" | "weekly" | "monthly" | null, completedAt = new Date()): string | null {
  if (!rule) return null;
  const base = new Date(Math.max(new Date(dueAt).getTime(), completedAt.getTime()));
  const d = new Date(new Date(dueAt).getTime());
  // 기한을 규칙 단위로 올리되 완료 시각 이후가 될 때까지
  do {
    if (rule === "daily") d.setUTCDate(d.getUTCDate() + 1);
    else if (rule === "weekly") d.setUTCDate(d.getUTCDate() + 7);
    else d.setUTCMonth(d.getUTCMonth() + 1);
  } while (d.getTime() <= base.getTime());
  return d.toISOString();
}

/** 미루기: 다음날 같은 시각 */
export function snoozeUntil(now = new Date()): string {
  const { start } = kstDayRange(now);
  return new Date(start.getTime() + (24 + 9) * 3600 * 1000).toISOString(); // 내일 09시(KST)
}

/** 오늘 화면에 보일 할 일: 오늘 끝 이전 기한이고 (미완료·미룬 기한 도래) 또는 오늘 완료 */
export function isVisibleToday(t: { due_at: string; status: string; snoozed_until: string | null; completed_at: string | null }, now = new Date()): boolean {
  const { start, end } = kstDayRange(now);
  if (t.status === "done") return !!t.completed_at && new Date(t.completed_at) >= start && new Date(t.completed_at) < end;
  if (t.status === "skipped") return false;
  if (t.status === "snoozed") return !!t.snoozed_until && new Date(t.snoozed_until) < end;
  return new Date(t.due_at) < end;
}
