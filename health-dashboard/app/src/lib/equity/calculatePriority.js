import { isNum } from "./calculateGap.js";

/* 우선 검토 등급 — 순수 함수.
   점수는 화면 내부용 기술 점수이며 공식 지수가 아니다. 화면에는 숫자 대신 등급(우선 검토·관찰 필요·상대적으로 양호·자료 부족)만 보인다. */
export const WEIGHTS = Object.freeze({ gap: 0.35, rank: 0.25, trend: 0.2, dep: 0.2 });
export const THRESHOLDS = Object.freeze({ priorityU: 0.75, priorityScore: 0.55, watchU: 0.5, watchScore: 0.4, minPool: 10 });

/** 박탈 5분위(1 = 가장 덜 박탈 … 5 = 가장 박탈) → 0~1. 분위가 없으면 null(0 아님) */
export function depScore(q) {
  return Number.isInteger(q) && q >= 1 && q <= 5 ? (q - 1) / 4 : null;
}

/** 요소 점수 가중합. 값이 없는 요소는 빼고 남은 가중치로 다시 나눈다(재정규화).
 *  격차·순위가 없으면 계산하지 않는다(null). */
export function combine(parts, weights = WEIGHTS) {
  if (!isNum(parts.gap) || !isNum(parts.rank)) return null;
  const used = Object.keys(weights).filter((k) => isNum(parts[k]));
  const wsum = used.reduce((a, k) => a + weights[k], 0);
  const norm = Object.fromEntries(used.map((k) => [k, weights[k] / wsum]));
  const score = used.reduce((a, k) => a + norm[k] * parts[k], 0);
  return { score, used, weights: norm };
}

/** 등급. 표본오차 범위(95% 신뢰구간이 전국 중앙값을 포함)이거나 불안정 값(상대표준오차 20% 초과)이면 「우선 검토」로 올리지 않는다. */
export function tierOf({ dirRel, u, score, ciIncludesRef, unstable = false, n, t = THRESHOLDS }) {
  if (!isNum(u) || !isNum(score) || !isNum(dirRel) || !(n >= t.minPool)) return "insufficient";
  if (dirRel > 0 && u >= t.priorityU && score >= t.priorityScore && ciIncludesRef !== true && !unstable) return "priority";
  if (dirRel > 0 && (u >= t.watchU || score >= t.watchScore)) return "watch";
  return "ok";
}
export const TIERS = {
  priority: { label: "우선 검토", icon: "▲", cls: "eq-t-priority" },
  watch: { label: "관찰 필요", icon: "●", cls: "eq-t-watch" },
  ok: { label: "상대적으로 양호", icon: "✓", cls: "eq-t-ok" },
  insufficient: { label: "자료 부족", icon: "?", cls: "eq-t-na" },
};

/** 상위 k개: 우선 검토 → 관찰 필요 순, 점수 높은 순, 같은 영역은 하나만 */
export function pickTop(rows, k = 3) {
  const order = { priority: 0, watch: 1 };
  const cand = rows.filter((r) => r.tier in order).sort((a, b) => order[a.tier] - order[b.tier] || b.score - a.score);
  const seen = new Set(), out = [];
  for (const r of cand) { if (seen.has(r.domain)) continue; seen.add(r.domain); out.push(r); if (out.length === k) break; }
  return out;
}
