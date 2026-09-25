// 추모 페이지 계산: 함께한 날, 기일, 기록에 남은 돌봄 요약. 판단·평가 문구는 만들지 않는다.
import type { HealthEvent } from "@/lib/types";

const DAY = 86400000;
const toUtc = (ymd: string) => Date.UTC(+ymd.slice(0, 4), +ymd.slice(5, 7) - 1, +ymd.slice(8, 10));

/** start~end 사이 날짜 수(시작일 포함). 잘못된 값이면 null */
export function daysBetween(start: string | null, end: string): number | null {
  if (!start || !/^\d{4}-\d{2}-\d{2}/.test(start)) return null;
  const n = Math.round((toUtc(end) - toUtc(start.slice(0, 10))) / DAY) + 1;
  return n > 0 ? n : null;
}

export type Milestone = { kind: "days"; n: number } | { kind: "years"; n: number };

/** 오늘이 떠나보낸 날로부터 100일째이거나 기일(1년 단위)이면 알려 준다 */
export function memorialMilestone(passedAt: string | null | undefined, today: string): Milestone | null {
  if (!passedAt) return null;
  const days = Math.round((toUtc(today) - toUtc(passedAt)) / DAY);
  if (days <= 0) return null;
  if (days === 99) return { kind: "days", n: 100 }; // 떠난 날을 1일로 세는 관례
  const years = +today.slice(0, 4) - +passedAt.slice(0, 4);
  if (years >= 1 && today.slice(5, 10) === passedAt.slice(5, 10)) return { kind: "years", n: years };
  // 2월 29일에 떠난 경우 평년에는 2월 28일에 알림
  if (years >= 1 && passedAt.slice(5, 10) === "02-29" && today.slice(5, 10) === "02-28" && !isLeap(+today.slice(0, 4))) return { kind: "years", n: years };
  return null;
}

function isLeap(y: number) { return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0; }

export function milestoneText(name: string, m: Milestone): string {
  return m.kind === "days" ? `오늘은 ${name}를(을) 떠나보낸 지 ${m.n}일이에요.` : `오늘은 ${name}를(을) 떠나보낸 지 ${m.n}년이 되는 날이에요.`;
}

export type CareSummary = {
  totalRecords: number;
  tasksDone: number;
  visits: number;        // 진료·검사
  weights: number;
  observations: number;  // 관찰·투약 메모
  firstRecord: string | null;
  lastRecord: string | null;
  topTasks: { title: string; count: number }[];
};

export function summarizeCare(events: HealthEvent[]): CareSummary {
  const dates = events.map((e) => e.occurred_at).sort();
  const taskCounts = new Map<string, number>();
  for (const e of events) {
    if (e.event_type !== "task_done") continue;
    const t = String((e.value_json as { title?: string }).title ?? "").trim();
    if (t) taskCounts.set(t, (taskCounts.get(t) ?? 0) + 1);
  }
  const count = (...types: string[]) => events.filter((e) => types.includes(e.event_type)).length;
  return {
    totalRecords: events.length,
    tasksDone: count("task_done"),
    visits: count("visit", "exam"),
    weights: count("weight"),
    observations: count("observation", "medication_note"),
    firstRecord: dates[0] ?? null,
    lastRecord: dates.at(-1) ?? null,
    topTasks: [...taskCounts.entries()].map(([title, c]) => ({ title, count: c })).sort((a, b) => b.count - a.count).slice(0, 5),
  };
}
