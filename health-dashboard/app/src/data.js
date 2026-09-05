// 데이터셋 접근 계층: 인덱스, 값 조회, 통계 헬퍼
import RAW from "../../data/dataset.json";

export const DS = RAW;
export const YEARS_ALL = RAW.years;
export const DOMAINS = RAW.domains;
export const REGIONS = RAW.regions;
export const RIDX = new Map(REGIONS.map((r, i) => [r.c, i]));
export const RBY = new Map(REGIONS.map((r) => [r.c, r]));
export const SIDOS = REGIONS.filter((r) => r.l === "sido");
export const SGG_ALL = REGIONS.filter((r) => r.l === "sgg");
export const SGG_BY_SIDO = Object.fromEntries(SIDOS.map((s) => [s.c, SGG_ALL.filter((r) => r.p === s.c)]));
export const SUBS_BY_SGG = {};
REGIONS.filter((r) => r.l === "sub").forEach((r) => (SUBS_BY_SGG[r.p] ??= []).push(r));

export const INDICATORS = RAW.indicators;
export const IND_BY_ID = Object.fromEntries(INDICATORS.map((d) => [d.id, d]));
export const IND_BY_DOMAIN = Object.fromEntries(DOMAINS.map((d) => [d, INDICATORS.filter((i) => i.domain === d)]));

export const ITEMS = { crude: "조율", std: "표준화율" };

export const fmt = (v, digits = 1) => (v == null ? "–" : v.toFixed(digits));
export const label = (r) => (!r ? "" : r.l === "sido" ? r.n : `${r.s} ${r.n}`);
export const sidoOf = (code) => (code.startsWith("0071") ? "0071" : code.slice(0, 3));

/** 지표·항목·연도·지역 → 값(%) 또는 null */
export function val(ind, item, year, code) {
  const yi = ind.years.indexOf(year);
  const ri = RIDX.get(code);
  if (yi < 0 || ri == null) return null;
  const v = RAW.values[ind.id][item][yi][ri];
  return v == null ? null : v / 10;
}

/** 지역의 전 연도 시계열 */
export const series = (ind, item, code) => ind.years.map((y) => val(ind, item, y, code));

/** 지표에서 해당 지역의 값이 있는 최신 연도 */
export function latestYear(ind, item, code) {
  for (let i = ind.years.length - 1; i >= 0; i--)
    if (val(ind, item, ind.years[i], code) != null) return ind.years[i];
  return null;
}

/** 비교 집단: 시군구 선택 시 전국/시도 내 시군구, 시도 선택 시 17개 시도 */
export function poolFor(sel, scope) {
  if (!sel) return SIDOS;
  if (sel.l === "sido") return SIDOS;
  return scope === "sido" ? SGG_BY_SIDO[sel.p] : SGG_ALL;
}

/** 방향 보정 비교: "a가 b보다 양호"면 음수 */
export function betterCmp(ind) {
  return ind.bad ? (a, b) => a - b : (a, b) => b - a;
}

/** 집단 내 순위표 [{r, v}] (양호한 순). 결측 제외 */
export function ranked(ind, item, year, pool) {
  const cmp = betterCmp(ind);
  return pool
    .map((r) => ({ r, v: val(ind, item, year, r.c) }))
    .filter((x) => x.v != null)
    .sort((a, b) => cmp(a.v, b.v));
}

/** 백분위(0~100, 높을수록 양호): 집단 중 나보다 나쁜 비율 (+동률 절반) */
export function percentile(ind, v, poolVals) {
  if (v == null || !poolVals.length) return null;
  let worse = 0, tie = 0;
  for (const p of poolVals) {
    if (p === v) tie++;
    else if (ind.bad ? p > v : p < v) worse++;
  }
  return ((worse + tie / 2) / poolVals.length) * 100;
}

export function median(arr) {
  const a = arr.filter((v) => v != null).sort((x, y) => x - y);
  if (!a.length) return null;
  const m = a.length >> 1;
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

export function quantile(sorted, q) {
  if (!sorted.length) return null;
  const pos = (sorted.length - 1) * q, lo = Math.floor(pos), hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

/** 상자그림 통계 */
export function boxStats(vals) {
  const a = vals.filter((v) => v != null).sort((x, y) => x - y);
  if (!a.length) return null;
  return { min: a[0], q1: quantile(a, 0.25), med: quantile(a, 0.5), q3: quantile(a, 0.75), max: a[a.length - 1], n: a.length };
}

/** 전국 기준값: 전 시군구 중앙값 */
export function nationalMedian(ind, item, year) {
  return median(SGG_ALL.map((r) => val(ind, item, year, r.c)));
}

/** 7단계 분위 경계 (단계구분도용) */
export function classBreaks(vals, k = 7) {
  const a = vals.filter((v) => v != null).sort((x, y) => x - y);
  if (a.length < 2) return [];
  const br = [];
  for (let i = 1; i < k; i++) br.push(quantile(a, i / k));
  return br;
}
export const classOf = (v, breaks) => (v == null ? 0 : breaks.filter((b) => v > b).length + 1);

/** 집단 전체의 지표 백분위 한 번에 계산: Map(code → pct). 결측 지역은 제외 */
export function allPercentiles(ind, item, year, pool) {
  const vals = pool.map((r) => [r.c, val(ind, item, year, r.c)]).filter(([, v]) => v != null);
  const sorted = vals.map(([, v]) => v).sort((a, b) => a - b);
  const n = sorted.length, out = new Map();
  if (!n) return out;
  // 이분탐색으로 "나보다 나쁜 수" 계산
  const lower = (x) => { let lo = 0, hi = n; while (lo < hi) { const m = (lo + hi) >> 1; if (sorted[m] < x) lo = m + 1; else hi = m; } return lo; };
  const upper = (x) => { let lo = 0, hi = n; while (lo < hi) { const m = (lo + hi) >> 1; if (sorted[m] <= x) lo = m + 1; else hi = m; } return lo; };
  for (const [c, v] of vals) {
    const below = lower(v), tie = upper(v) - below;
    const worse = ind.bad ? n - upper(v) : below;
    out.set(c, ((worse + tie / 2) / n) * 100);
  }
  return out;
}

/**
 * 집단 내 모든 지역의 영역 점수·종합 점수와 순위.
 * weights: {영역: 가중치} (없으면 균등). year: 지표별 최신 연도 사용(연도 지정 시 해당 연도, 없으면 최신).
 * 반환: { byCode: Map(code → {domains:{d:{score,rank}}, overall:{score,rank}}), n: {d: 집단 크기} }
 */
export function domainRanking(item, pool, weights = null, year = null) {
  const pctByInd = {};
  for (const ind of INDICATORS) {
    if (ind.bad == null) continue;
    const y = year != null && ind.years.includes(year) ? year : ind.years[ind.years.length - 1];
    pctByInd[ind.id] = allPercentiles(ind, item, y, pool);
  }
  const rows = pool.map((r) => {
    const domains = {};
    for (const d of DOMAINS) {
      const xs = INDICATORS.filter((i) => i.domain === d && pctByInd[i.id]?.has(r.c)).map((i) => pctByInd[i.id].get(r.c));
      if (xs.length) domains[d] = { score: xs.reduce((a, b) => a + b, 0) / xs.length, k: xs.length };
    }
    let wsum = 0, acc = 0;
    for (const d in domains) { const w = weights ? (weights[d] ?? 0) : 1; acc += domains[d].score * w; wsum += w; }
    return { c: r.c, domains, overall: wsum ? acc / wsum : null, k: Object.keys(domains).length };
  });
  const byCode = new Map(rows.map((x) => [x.c, x]));
  const n = {};
  for (const d of DOMAINS) {
    const s = rows.filter((x) => x.domains[d]).sort((a, b) => b.domains[d].score - a.domains[d].score);
    s.forEach((x, i) => (x.domains[d].rank = i + 1)); n[d] = s.length;
  }
  const full = rows.filter((x) => x.overall != null && x.k >= DOMAINS.length - 1).sort((a, b) => b.overall - a.overall);
  full.forEach((x, i) => (x.overallRank = i + 1)); n.overall = full.length;
  return { byCode, n };
}
