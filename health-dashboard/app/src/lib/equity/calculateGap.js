import { toUnfavorable, isBetter, isDirectional } from "./normalizeIndicator.js";

/* 격차와 상대 위치 — 순수 함수. 결측(null·undefined·NaN)은 절대 0으로 바꾸지 않고 계산에서 뺀다. */
export const isNum = (v) => typeof v === "number" && Number.isFinite(v);
export const validValues = (values) => values.filter(isNum);

export function medianOf(values) {
  const a = validValues(values).sort((x, y) => x - y);
  if (!a.length) return null;
  const m = a.length >> 1;
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

/** 지역 값과 기준값(전국 중앙값)의 차이. dirAbs·dirRel 은 불리한 쪽이 + */
export function gapOf(v, ref, direction) {
  if (!isNum(v) || !isNum(ref)) return null;
  const abs = v - ref;
  const rel = ref !== 0 ? abs / Math.abs(ref) : null;
  return { abs, rel, dirAbs: toUnfavorable(abs, direction), dirRel: rel == null ? null : toUnfavorable(rel, direction) };
}

/** 격차 점수 0~1: 불리한 쪽 상대차가 cap(기본 30%)이면 최대. 양호한 쪽은 0.
 *  값이 작은 지표의 상대차 부풀림(0.1 vs 0.4 = 300%)을 상한으로 막는다. */
export function gapScore(dirRel, cap = 0.3) {
  if (!isNum(dirRel)) return null;
  return Math.max(0, Math.min(1, dirRel / cap));
}

/** 값 기준 불리 백분위 u(0~1): 비교 집단 중 나보다 양호한 지역의 비율(동률은 절반).
 *  u가 1에 가까울수록 불리한 쪽. 동률은 같은 u를 갖는다(근소한 차이를 과장하지 않기 위한 출발점).
 *  rank = 양호한 순 순위(동률은 같은 순위). 선택 지역이 집단에 없어도(다보건소 시 등) 값으로 위치를 구한다. */
export function unfavorablePercentile(v, poolValues, direction) {
  const vals = validValues(poolValues);
  if (!isNum(v) || !vals.length || !isDirectional(direction)) return null;
  let better = 0, tie = 0;
  for (const p of vals) {
    if (p === v) tie++;
    else if (isBetter(p, v, direction)) better++;
  }
  return { u: (better + tie / 2) / vals.length, rank: better + 1, n: vals.length };
}

/** 상대 위치를 구간으로만 말한다(표본오차 때문에 정확한 순위를 강조하지 않음). n ≤ 30 이면 순위 그대로 */
export function positionBand(u) {
  if (!isNum(u)) return null;
  if (u >= 0.9) return { key: "worst10", label: "불리한 쪽 상위 10%" };
  if (u >= 0.75) return { key: "low", label: "하위권(불리한 쪽 25%)" };
  if (u > 0.25) return { key: "mid", label: "중간권" };
  return { key: "high", label: "상위권(양호한 쪽 25%)" };
}

/** 95% 신뢰구간이 기준값을 포함하는가(표본오차 범위의 차이일 수 있음) */
export function ciIncludes(ci, ref) {
  if (!ci || !isNum(ci.lo) || !isNum(ci.hi) || !isNum(ref)) return null;
  return ci.lo <= ref && ref <= ci.hi;
}
