import type { Facility, RegionStat } from '../types';

/**
 * 생활체육 접근성 지수 — 설명할 수 있는 단순한 식만 쓴다.
 * 공급 점수: 시설 1곳 = 1점, 무장애(장애인 체육시설) +0.5, 어르신 친화 종목·장애인 강좌 각 +0.25
 * 대상 인구: 65세 이상 + 등록장애인 (일부 겹칠 수 있음 → 시군끼리 비교하는 용도)
 * 접근성 지수: (대상 인구 1만 명당 공급 점수) ÷ (경기도 전체 같은 값) × 100  → 100이 경기도 평균
 */
export const W = { base: 1, barrierFree: 0.5, senior: 0.25, disabledProg: 0.25 };

export function facilityPoints(f: Facility): number {
  return W.base + (f.barrierFree ? W.barrierFree : 0) + (f.senior ? W.senior : 0) + (f.disabledProg ? W.disabledProg : 0);
}

export interface RegionScore {
  name: string;
  target: number;
  facilities: number;
  barrierFree: number;
  supply: number;
  /** 대상 인구 1만 명당 공급 점수 */
  density: number;
  index: number;
  grade: Grade;
  rank: number;
}

export interface Grade { level: 1 | 2 | 3 | 4 | 5; label: string }

export function gradeOf(index: number): Grade {
  if (index < 60) return { level: 1, label: '매우 부족' };
  if (index < 85) return { level: 2, label: '부족' };
  if (index < 115) return { level: 3, label: '보통' };
  if (index < 150) return { level: 4, label: '양호' };
  return { level: 5, label: '충분' };
}

export const targetOf = (r: RegionStat) => r.age65 + r.disabled;

export function scoreRegions(regions: RegionStat[], facilities: Facility[], extra: Record<string, number> = {}): RegionScore[] {
  const by = new Map<string, Facility[]>();
  for (const f of facilities) by.set(f.region, [...(by.get(f.region) ?? []), f]);
  const raw = regions.map((r) => {
    const fs = by.get(r.name) ?? [];
    const add = extra[r.name] ?? 0; // 시뮬레이션: 무장애 + 프로그램 시설 추가
    const supply = fs.reduce((s, f) => s + facilityPoints(f), 0) + add * (W.base + W.barrierFree + W.senior + W.disabledProg);
    const target = targetOf(r);
    return { name: r.name, target, facilities: fs.length + add, barrierFree: fs.filter((f) => f.barrierFree).length + add, supply, density: target ? supply / (target / 10000) : 0 };
  });
  // 기준(경기도 평균)은 시뮬레이션 전 실제 값으로 고정해야 비교가 흔들리지 않는다
  const baseSupply = regions.reduce((s, r) => s + (by.get(r.name) ?? []).reduce((a, f) => a + facilityPoints(f), 0), 0);
  const baseTarget = regions.reduce((s, r) => s + targetOf(r), 0);
  const avg = baseTarget ? baseSupply / (baseTarget / 10000) : 1;
  const scored = raw.map((x) => {
    const index = Math.round((x.density / avg) * 100);
    return { ...x, index, grade: gradeOf(index), rank: 0 };
  });
  [...scored].sort((a, b) => a.index - b.index).forEach((s, i) => (s.rank = i + 1));
  return scored;
}

/** 지수를 경기도 평균(100)까지 올리려면 무장애·프로그램 시설이 몇 곳 더 필요한가 */
export function neededToAverage(s: RegionScore, avgDensity: number): number {
  const full = W.base + W.barrierFree + W.senior + W.disabledProg;
  const need = (avgDensity * (s.target / 10000) - s.supply) / full;
  return Math.max(0, Math.ceil(need));
}

export function avgDensity(regions: RegionStat[], facilities: Facility[]): number {
  const supply = facilities.reduce((s, f) => s + facilityPoints(f), 0);
  const target = regions.reduce((s, r) => s + targetOf(r), 0);
  return target ? supply / (target / 10000) : 0;
}
