import type { DayIndex, ScheduleEntry } from '../types';

export const MIN_PER_DAY = 1440;

/** "HH:MM" → 분. "24:00" 허용. 형식이 틀리면 null */
export function toMinutes(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const mm = Number(m[2]);
  if (mm > 59 || h > 24 || (h === 24 && mm !== 0)) return null;
  return h * 60 + mm;
}

export function fmtMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export interface Segment {
  day: DayIndex;
  start: number; // 분, 포함
  end: number; // 분, 미포함 (최대 1440)
  entry: ScheduleEntry;
  /** 자정을 넘어 이어진 뒷부분인지 */
  continued: boolean;
}

export function validateEntry(e: Pick<ScheduleEntry, 'start' | 'end'>): string | null {
  const s = toMinutes(e.start);
  const t = toMinutes(e.end);
  if (s === null || t === null) return '시간 형식을 확인해 주세요 (예: 09:00)';
  if (s === 1440) return '시작 시간은 24:00이 될 수 없습니다';
  if (s === t) return '시작과 끝 시간이 같습니다';
  return null;
}

/** 일정을 요일별 구간으로 나눈다. 끝이 시작보다 이르면 다음 날로 이어진 일정(예: 22:00–07:00). */
export function toSegments(entries: ScheduleEntry[]): Segment[] {
  const out: Segment[] = [];
  for (const e of entries) {
    if (validateEntry(e)) continue;
    const s = toMinutes(e.start)!;
    const t = toMinutes(e.end)!;
    if (t > s) {
      out.push({ day: e.day, start: s, end: t, entry: e, continued: false });
    } else {
      out.push({ day: e.day, start: s, end: MIN_PER_DAY, entry: e, continued: false });
      if (t > 0) out.push({ day: ((e.day + 1) % 7) as DayIndex, start: 0, end: t, entry: e, continued: true });
    }
  }
  return out.sort((a, b) => a.day - b.day || a.start - b.start);
}

/** 요일×분 단위 덮임 표(7×1440). pred 를 만족하는 구간만 칠한다. */
export function coverage(segments: Segment[], pred: (s: Segment) => boolean): Uint8Array[] {
  const grid = Array.from({ length: 7 }, () => new Uint8Array(MIN_PER_DAY));
  for (const seg of segments) {
    if (!pred(seg)) continue;
    grid[seg.day].fill(1, seg.start, seg.end);
  }
  return grid;
}

/** 하루 안의 시간 창 [start, end) — end<=start 이면 자정을 넘는 창(예: 18:00–09:00) */
export function inWindow(minute: number, start: number, end: number): boolean {
  return end > start ? minute >= start && minute < end : minute >= start || minute < end;
}

/** 덮이지 않은 분(minute) 수를 창 안에서 센다 */
export function uncoveredInWindow(grid: Uint8Array[], start: number, end: number): number {
  let n = 0;
  for (let d = 0; d < 7; d++) {
    const row = grid[d];
    for (let m = 0; m < MIN_PER_DAY; m++) if (!row[m] && inWindow(m, start, end)) n++;
  }
  return n;
}

export function overlapMinutes(aStart: number, aEnd: number, bStart: number, bEnd: number): number {
  return Math.max(0, Math.min(aEnd, bEnd) - Math.max(aStart, bStart));
}

/** 하루를 '일정 구간'과 '빈 구간'으로 나눈 타임라인(모바일 카드·공유 카드용) */
export interface DayBlock {
  start: number;
  end: number;
  segments: Segment[]; // 비어 있으면 등록된 일정 없음
}

export function dayTimeline(segments: Segment[], day: DayIndex): DayBlock[] {
  const daySegs = segments.filter((s) => s.day === day);
  const points = new Set<number>([0, MIN_PER_DAY]);
  for (const s of daySegs) {
    points.add(s.start);
    points.add(s.end);
  }
  const sorted = [...points].sort((a, b) => a - b);
  const blocks: DayBlock[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    const active = daySegs.filter((s) => s.start < b && s.end > a);
    const prev = blocks[blocks.length - 1];
    const key = active.map((s) => s.entry.id).join(',');
    if (prev && prev.segments.map((s) => s.entry.id).join(',') === key) prev.end = b;
    else blocks.push({ start: a, end: b, segments: active });
  }
  return blocks;
}
