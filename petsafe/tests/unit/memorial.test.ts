import { describe, expect, it } from "vitest";
import { daysBetween, memorialMilestone, milestoneText, summarizeCare } from "@/lib/memorial";
import type { HealthEvent } from "@/lib/types";

const ev = (event_type: HealthEvent["event_type"], occurred_at: string, value_json: Record<string, unknown> = {}): HealthEvent => ({ id: occurred_at + event_type, pet_id: "p", event_type, occurred_at, value_json, note: null, created_at: occurred_at });

describe("추모 계산", () => {
  it("함께한 날(시작일 포함)", () => {
    expect(daysBetween("2020-01-01", "2020-01-01")).toBe(1);
    expect(daysBetween("2020-01-01", "2021-01-01")).toBe(367);
    expect(daysBetween(null, "2021-01-01")).toBeNull();
    expect(daysBetween("2022-01-02", "2022-01-01")).toBeNull();
  });
  it("100일·기일만 알림", () => {
    expect(memorialMilestone("2026-01-01", "2026-04-10")).toEqual({ kind: "days", n: 100 });
    expect(memorialMilestone("2025-09-25", "2026-09-25")).toEqual({ kind: "years", n: 1 });
    expect(memorialMilestone("2024-02-29", "2025-02-28")).toEqual({ kind: "years", n: 1 });
    expect(memorialMilestone("2025-09-25", "2025-09-25")).toBeNull();
    expect(memorialMilestone("2025-09-25", "2025-10-01")).toBeNull();
    expect(memorialMilestone(null, "2026-01-01")).toBeNull();
    expect(milestoneText("초코", { kind: "years", n: 1 })).toContain("1년");
  });
  it("돌봄 요약", () => {
    const s = summarizeCare([
      ev("task_done", "2025-01-02T00:00:00Z", { title: "산책" }),
      ev("task_done", "2025-01-03T00:00:00Z", { title: "산책" }),
      ev("task_done", "2025-01-04T00:00:00Z", { title: "체중 재기" }),
      ev("visit", "2024-12-01T00:00:00Z"),
      ev("weight", "2025-02-01T00:00:00Z", { weight_kg: 5 }),
      ev("observation", "2025-02-02T00:00:00Z"),
    ]);
    expect(s).toMatchObject({ totalRecords: 6, tasksDone: 3, visits: 1, weights: 1, observations: 1, firstRecord: "2024-12-01T00:00:00Z", lastRecord: "2025-02-02T00:00:00Z" });
    expect(s.topTasks[0]).toEqual({ title: "산책", count: 2 });
    expect(summarizeCare([]).firstRecord).toBeNull();
  });
});
