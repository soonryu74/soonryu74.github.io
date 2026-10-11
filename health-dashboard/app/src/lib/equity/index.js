/* Health Equity Radar — 우선 검토 지표 계산을 대시보드 자료(data.js)에 연결하는 어댑터.
   계산식은 같은 폴더의 순수 함수(normalizeIndicator·calculateGap·calculateTrend·calculatePriority·buildReasons)에 있고,
   여기서는 「어떤 값을 어떤 비교 집단과 견줄지」만 정한다. 진단·예측·정책효과 추정이 아니라 지역보건 검토 순서를 돕는 표시다. */
import { INDICATORS, SIDOS, natPool, val, valSmooth, ci, hasSe, depOf, RBY, isSurvey } from "../../data";
import { isDirectional } from "./normalizeIndicator.js";
import { medianOf, gapOf, gapScore, unfavorablePercentile, positionBand, ciIncludes, validValues } from "./calculateGap.js";
import { recentTrend, trendClass } from "./calculateTrend.js";
import { combine, depScore, tierOf, pickTop, TIERS, WEIGHTS, THRESHOLDS } from "./calculatePriority.js";
import { buildReasons } from "./buildReasons.js";

export { TIERS, WEIGHTS, THRESHOLDS };
export const TREND_WINDOW = 5;     // 최근 5개 연도
export const TREND_MIN = 3;        // 유효 연도 3개 이상일 때만 추세 평가
export const STALE_YEARS = 3;      // 지역 값이 지표 최신 연도보다 3년 넘게 오래되면 자료 부족

/** 후보 지표: 방향이 있는 지표 중 지역박탈 자체와 자원(투입·과정) 지표를 뺀 「건강문제」 지표 */
export const CANDIDATES = INDICATORS.filter((i) => isDirectional(i.direction) && !i.dep && i.tier !== "투입·과정");
/** 기본 후보(core): 지역사회건강조사 지표 — 258개 조사 단위 비교·95% 신뢰구간·예방·관리 자료 연결이 모두 가능한 지표.
 *  전체(all): 사망률·검진·감염병·환경 등 시군구 자료까지(표본오차 정보가 없고 연결 자료가 적다). */
export const CORE = CANDIDATES.filter((i) => isSurvey(i));
export const SCOPES = { core: { label: "지역사회건강조사 지표", n: CORE.length }, all: { label: "전체 방향 지표", n: CANDIDATES.length } };

const cache = new Map();
const memo = (key, fn) => { if (!cache.has(key)) cache.set(key, fn()); return cache.get(key); };

/** 비교 집단 값 분포(같은 평활 기준) */
function poolValues(ind, item, y, k, pool, pk) {
  return memo(`v|${ind.id}|${item}|${y}|${k}|${pk}`, () => pool.map((r) => valSmooth(ind, item, y, r.c, k)));
}
/** 비교 집단 최근 기울기 분포 */
function poolSlopes(ind, item, y, pool, pk) {
  return memo(`s|${ind.id}|${item}|${y}|${pk}`, () => pool.map((r) => recentTrend(seriesOf(ind, item, r.c, y), { endYear: y, window: TREND_WINDOW, minPoints: TREND_MIN })?.slope ?? null));
}
function seriesOf(ind, item, code, y) {
  return ind.years.filter((x) => x > y - TREND_WINDOW && x <= y).map((x) => [x, val(ind, item, x, code)]);
}
function latestFor(ind, item, code) {
  for (let i = ind.years.length - 1; i >= 0; i--) if (val(ind, item, ind.years[i], code) != null) return ind.years[i];
  return null;
}

/** 한 지표의 우선 검토 판정 */
export function assess(ind, sel, item = "std", { smooth = 3 } = {}) {
  const isSido = sel.l === "sido";
  const nat = natPool(ind);
  const pool = isSido ? SIDOS : nat;
  const pk = isSido ? "sido" : isSurvey(ind) ? "hc" : "sgg";
  const npk = isSurvey(ind) ? "hc" : "sgg";
  const poolName = isSido ? "17개 시도" : isSurvey(ind) ? "전국 조사 단위(보건소)" : "전국 시군구";
  const base = { ind, id: ind.id, name: ind.name, domain: ind.domain, unit: ind.unit, direction: ind.direction, poolName, survey: isSurvey(ind) };
  const lastY = ind.years[ind.years.length - 1];
  const y = latestFor(ind, item, sel.c);
  if (y == null || lastY - y > STALE_YEARS) return { ...base, tier: "insufficient", why: y == null ? "이 지역 값 없음" : `최근 값이 ${y}년(지표 최신 ${lastY}년)` };
  const k = smooth;
  const v = valSmooth(ind, item, y, sel.c, k);
  const ref = medianOf(poolValues(ind, item, y, k, nat, npk));
  const vals = poolValues(ind, item, y, k, pool, pk);
  const nValid = validValues(vals).length;
  const gap = gapOf(v, ref, ind.direction);
  const pos = unfavorablePercentile(v, vals, ind.direction);
  const trend = recentTrend(seriesOf(ind, item, sel.c, y), { endYear: y, window: TREND_WINDOW, minPoints: TREND_MIN });
  const trendCls = trend ? trendClass(trend.slope, ind.direction, poolSlopes(ind, item, y, pool, pk), ref) : null;
  const dep = isSido ? null : depOf(sel.c);
  const depQ = Number.isInteger(dep?.q) ? dep.q : null;
  // 표본오차: 단년 95% 신뢰구간이 같은 해 전국 중앙값을 포함하는지
  const c = hasSe(ind) ? ci(ind, item, y, sel.c) : null;
  const refY = c ? medianOf(poolValues(ind, item, y, 1, nat, npk)) : null;
  const ciInc = c ? ciIncludes(c, refY) : null;
  const parts = { gap: gapScore(gap?.dirRel), rank: pos?.u ?? null, trend: trendCls?.score ?? null, dep: depScore(depQ) };
  const comb = combine(parts);
  const tier = tierOf({ dirRel: gap?.dirRel, u: pos?.u, score: comb?.score, ciIncludesRef: ciInc, unstable: !!c?.unstable, n: nValid });
  const inPool = pool.some((r) => r.c === sel.c);
  const row = { ...base, y, k, v, ref, refY, gap, pos, band: positionBand(pos?.u), trend, trendCls, depQ, ci: c, ciIncludesRef: ciInc,
    parts, score: comb?.score ?? null, used: comb?.used ?? [], weights: comb?.weights ?? null, tier, inPool, nValid };
  row.reasons = buildReasons(row);
  return row;
}

/** 지역의 우선 검토 지표 전체 판정 + 상위 3개(영역당 1개) */
export function priorityFor(sel, item = "std", opts = {}) {
  if (!sel) return null;
  const smooth = opts.smooth ?? 3;
  const scope = opts.scope === "all" ? "all" : "core";
  return memo(`p|${sel.c}|${item}|${smooth}|${scope}`, () => {
    const rows = (scope === "all" ? CANDIDATES : CORE).map((ind) => assess(ind, sel, item, { smooth }));
    const counts = { priority: 0, watch: 0, ok: 0, insufficient: 0 };
    rows.forEach((r) => counts[r.tier]++);
    const dep = sel.l === "sido" ? null : depOf(sel.c);
    return { sel, scope, rows, top: pickTop(rows, 3), counts, dep, sido: sel.l === "sido" ? sel : RBY.get(sel.p) };
  });
}

/** 최근 개선 폭이 큰 지표(개선 경향 중 비교 집단 대비 가장 좋은 쪽) */
export function mostImproved(p) {
  return p.rows.filter((r) => r.trendCls?.key === "improving").sort((a, b) => a.trendCls.u - b.trendCls.u)[0] || null;
}
