import { describe, expect, it } from "vitest";
import { generateInitialTasks, isVisibleToday, lifeStageOf, nextDueAt, templateMatches } from "@/lib/rules";
import { CARE_TASK_TEMPLATES } from "@/content/care-task-templates";
import type { Pet } from "@/lib/types";

const base: Pet = {
  id: "p", owner_id: "u", species: "dog", name: "초코", birth_date: "2022-01-01", estimated_birth: false, sex: "male",
  neutered: true, weight_kg: 5, indoor: true, multi_pet: false, registration_status: "not_registered", insurance_status: "not_insured",
  primary_vet_name: null, primary_vet_phone: null, created_at: "", updated_at: "",
};
const JULY = new Date("2026-07-10T03:00:00Z");
const JAN = new Date("2026-01-10T03:00:00Z");

describe("규칙 엔진", () => {
  it("첫 등록 시 기본 할 일 3개를 만들고 법정 의무를 먼저 둔다", () => {
    const tasks = generateInitialTasks(base, CARE_TASK_TEMPLATES, JULY);
    expect(tasks).toHaveLength(3);
    expect(tasks[0].priority).toBe("legal");
    expect(tasks.map((t) => t.template_key)).toContain("dog_registration_check");
  });

  it("등록한 반려견에게는 동물등록 확인을 만들지 않는다", () => {
    const tasks = generateInitialTasks({ ...base, registration_status: "registered" }, CARE_TASK_TEMPLATES, JULY);
    expect(tasks.map((t) => t.template_key)).not.toContain("dog_registration_check");
  });

  it("고양이에게 반려견 전용 템플릿을 주지 않는다", () => {
    const cat = { ...base, species: "cat" as const, registration_status: "not_applicable" as const };
    const tasks = generateInitialTasks(cat, CARE_TASK_TEMPLATES, JULY, 20);
    expect(tasks.every((t) => !t.template_key?.startsWith("dog_"))).toBe(true);
    expect(tasks.map((t) => t.template_key)).toContain("cat_litter");
  });

  it("진드기 확인은 계절(3~11월)에만 해당한다", () => {
    const tick = CARE_TASK_TEMPLATES.find((t) => t.key === "dog_tick_check")!;
    expect(templateMatches(tick, base, JULY)).toBe(true);
    expect(templateMatches(tick, base, JAN)).toBe(false);
  });

  it("생애주기: 견 8세, 묘 11세부터 노령", () => {
    const now = new Date("2026-09-01T00:00:00Z");
    expect(lifeStageOf({ species: "dog", birth_date: "2018-01-01" }, now)).toBe("senior");
    expect(lifeStageOf({ species: "cat", birth_date: "2018-01-01" }, now)).toBe("adult");
    expect(lifeStageOf({ species: "cat", birth_date: "2026-03-01" }, now)).toBe("young");
    expect(lifeStageOf({ species: "cat", birth_date: null }, now)).toBeNull();
  });

  it("반복 할 일의 다음 기한은 완료 시각 이후", () => {
    const due = "2026-09-01T12:00:00.000Z";
    expect(nextDueAt(due, "daily", new Date("2026-09-01T13:00:00Z"))).toBe("2026-09-02T12:00:00.000Z");
    expect(nextDueAt(due, "daily", new Date("2026-09-03T13:00:00Z"))).toBe("2026-09-04T12:00:00.000Z");
    expect(nextDueAt(due, "weekly", new Date("2026-09-01T13:00:00Z"))).toBe("2026-09-08T12:00:00.000Z");
    expect(nextDueAt(due, null)).toBeNull();
  });

  it("오늘 화면: 미룬 할 일은 내일까지 숨기고, 완료는 오늘 완료분만", () => {
    const now = new Date("2026-09-24T03:00:00Z"); // KST 12시
    expect(isVisibleToday({ due_at: "2026-09-24T12:00:00Z", status: "snoozed", snoozed_until: "2026-09-25T00:00:00Z", completed_at: null }, now)).toBe(false);
    expect(isVisibleToday({ due_at: "2026-09-20T12:00:00Z", status: "pending", snoozed_until: null, completed_at: null }, now)).toBe(true); // 기한 지남
    expect(isVisibleToday({ due_at: "2026-09-24T12:00:00Z", status: "done", snoozed_until: null, completed_at: "2026-09-23T10:00:00Z" }, now)).toBe(false);
    expect(isVisibleToday({ due_at: "2026-09-24T12:00:00Z", status: "done", snoozed_until: null, completed_at: "2026-09-24T01:00:00Z" }, now)).toBe(true);
  });
});
