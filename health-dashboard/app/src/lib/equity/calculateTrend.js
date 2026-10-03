import { isNum } from "./calculateGap.js";
import { toUnfavorable } from "./normalizeIndicator.js";

/* 최근 추세 — 순수 함수. 단년 증감으로 추세를 말하지 않는다: 최근 window년 안에 유효 연도가 minPoints개 이상일 때만 직선 기울기를 구한다. */
export function olsSlope(points) {
  const p = points.filter(([x, y]) => isNum(x) && isNum(y));
  if (p.length < 2) return null;
  const n = p.length, mx = p.reduce((a, q) => a + q[0], 0) / n, my = p.reduce((a, q) => a + q[1], 0) / n;
  let sxy = 0, sxx = 0;
  for (const [x, y] of p) { sxy += (x - mx) * (y - my); sxx += (x - mx) ** 2; }
  return sxx ? sxy / sxx : null;
}

/** series: [[연도, 값|null], …]. endYear 포함 최근 window개 연도 → { slope, n, y0, y1 } 또는 null(유효 연도 부족) */
export function recentTrend(series, { endYear, window = 5, minPoints = 3 } = {}) {
  const end = endYear ?? Math.max(...series.map((s) => s[0]));
  const pts = series.filter(([y, v]) => y > end - window && y <= end && isNum(v));
  if (pts.length < minPoints) return null;
  const slope = olsSlope(pts);
  if (slope == null) return null;
  return { slope, n: pts.length, y0: pts[0][0], y1: pts[pts.length - 1][0] };
}

/** 비교 집단 기울기 분포 속 위치 → 3분위(악화 쪽 1/3 · 가운데 · 개선 쪽 1/3, 점수에 사용)와 라벨.
 *  라벨은 실제 변화 크기로 정한다: 연간 변화가 기준값(전국 중앙값)의 1% 미만이면 「변화 적음」, 그 밖은 방향대로 「악화 경향」「개선 경향」.
 *  기준값이 없으면 분위와 방향이 함께 맞을 때만 악화·개선. */
export const STABLE_REL = 0.01;
export function trendClass(slope, direction, poolSlopes, ref = null) {
  const mine = toUnfavorable(slope, direction);
  const pool = poolSlopes.map((s) => toUnfavorable(s, direction)).filter(isNum);
  if (!isNum(mine) || pool.length < 6) return null;
  let better = 0, tie = 0;
  for (const p of pool) { if (p === mine) tie++; else if (p < mine) better++; }
  const u = (better + tie / 2) / pool.length;            // 1에 가까울수록 불리(악화) 쪽
  const tertile = u >= 2 / 3 ? 2 : u <= 1 / 3 ? 0 : 1;
  const rel = isNum(ref) && ref !== 0 ? mine / Math.abs(ref) : null;
  const key = rel != null
    ? (Math.abs(rel) < STABLE_REL ? "stable" : rel > 0 ? "worsening" : "improving")
    : (tertile === 2 && mine > 0 ? "worsening" : tertile === 0 && mine < 0 ? "improving" : "stable");
  return { u, tertile, rel, key, label: TREND_LABEL[key], score: tertile === 2 ? 1 : tertile === 1 ? 0.5 : 0, dirSlope: mine };
}
export const TREND_LABEL = { worsening: "악화 경향", stable: "변화 적음", improving: "개선 경향" };
