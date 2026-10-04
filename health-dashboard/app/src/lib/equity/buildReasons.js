import { isNum } from "./calculateGap.js";
import { DIRECTION } from "./normalizeIndicator.js";

/* 「왜 우선인가?」 문장 — 계산된 사실만 쓴다. 인과 표현 금지: 박탈과 지표는 「~지역이며 ~도」 병렬로만 서술. */
const f = (v, d = 1) => (isNum(v) ? v.toFixed(d) : "–");
const deltaUnit = (unit) => (unit === "%" ? "%p" : unit ? ` ${unit}` : "");

export function buildReasons(r) {
  const out = [];
  const du = deltaUnit(r.unit);
  if (r.gap && isNum(r.gap.abs)) {
    const hi = r.gap.abs > 0, word = hi ? "높음" : r.gap.abs < 0 ? "낮음" : "같음";
    const fav = r.gap.dirAbs > 0 ? "불리한 방향" : r.gap.dirAbs < 0 ? "양호한 방향" : "";
    out.push({ k: "gap", t: `전국 중앙값(${f(r.ref)}${r.unit})보다 ${f(Math.abs(r.gap.abs))}${du} ${word}${fav ? ` — ${fav}` : ""} (${r.direction === DIRECTION.LOWER ? "낮을수록" : "높을수록"} 좋은 지표)` });
  }
  if (r.pos) {
    if (r.pos.n <= 30) out.push({ k: "rank", t: `${/곳|시도$/.test(r.poolName) ? r.poolName : `${r.poolName} ${r.pos.n}곳`} 중 ${r.pos.rank}위(양호한 순)` });
    else {
      const top = Math.max(1, Math.round((1 - r.pos.u) * 100));
      out.push({ k: "rank", t: r.pos.u >= 0.5 ? `${r.poolName} ${r.pos.n}곳 중 불리한 방향 상위 ${top}%` : `${r.poolName} ${r.pos.n}곳 중 양호한 방향 상위 ${Math.max(1, Math.round(r.pos.u * 100))}%` });
    }
  }
  if (r.trend && r.trendCls) {
    const s = r.trend.slope, sg = s > 0 ? "▲" : s < 0 ? "▼" : "";
    const span = `${r.trend.y0}–${r.trend.y1}년(${r.trend.n}개 연도)`;
    const third = ["개선 쪽 1/3", "가운데 1/3", "악화 쪽 1/3"][r.trendCls.tertile];
    out.push({ k: "trend", t: `최근 ${span} 연간 ${sg}${f(Math.abs(s), 2)}${du}/년 — ${r.trendCls.label}(변화 속도는 비교 집단 중 ${third})` });
  } else out.push({ k: "trend", t: "최근 5년 안 유효 연도가 3개 미만이라 추세는 평가하지 않음" });
  if (Number.isInteger(r.depQ)) {
    out.push({ k: "dep", t: r.depQ >= 4 && r.gap?.dirAbs > 0
      ? `지역박탈지수 ${r.depQ}분위(5 = 가장 박탈) 지역이며, 이 지표도 불리한 수준`
      : `지역박탈지수 ${r.depQ}분위(5 = 가장 박탈) 지역` });
  }
  if (r.ci?.unstable) out.push({ k: "rse", t: `${r.y}년 값의 상대표준오차가 20%를 넘는 불안정 값 — 「우선 검토」로 올리지 않음` });
  if (r.ciIncludesRef === true) out.push({ k: "ci", t: `${r.y}년 단년 값의 95% 신뢰구간이 같은 해 전국 중앙값을 포함 — 표본오차 범위의 차이일 수 있어 「우선 검토」로 올리지 않음` });
  else if (r.ciIncludesRef === false) out.push({ k: "ci", t: `${r.y}년 단년 값 ${f(r.ci.v)}${r.unit}의 95% 신뢰구간(${f(r.ci.lo)}–${f(r.ci.hi)})이 같은 해 전국 중앙값(${f(r.refY)})과 겹치지 않음` });
  return out;
}

/* English mode (Health Equity Radar · international reviewers) — same facts and numbers as buildReasons, no extra claims. */
export const POOL_EN = { "17개 시도": "17 provinces", "전국 조사 단위(보건소)": "survey units nationwide", "전국 시군구": "municipalities nationwide" };
export const TREND_EN = { "악화 경향": "Worsening", "변화 적음": "Little change", "개선 경향": "Improving" };
const deltaUnitEn = (unit) => (unit === "%" ? " pp" : unit ? ` ${unit}` : "");
const ord = (n) => { const s = ["th", "st", "nd", "rd"], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };

export function buildReasonsEn(r) {
  const out = [];
  const du = deltaUnitEn(r.unit);
  const pool = POOL_EN[r.poolName] || r.poolName;
  if (r.gap && isNum(r.gap.abs)) {
    const word = r.gap.abs > 0 ? "higher" : r.gap.abs < 0 ? "lower" : "equal to";
    const fav = r.gap.dirAbs > 0 ? "unfavourable direction" : r.gap.dirAbs < 0 ? "favourable direction" : "";
    out.push({ k: "gap", t: `${f(Math.abs(r.gap.abs))}${du} ${word} than the national median (${f(r.ref)}${r.unit})${fav ? ` — ${fav}` : ""} (${r.direction === DIRECTION.LOWER ? "lower" : "higher"} is better)` });
  }
  if (r.pos) {
    if (r.pos.n <= 30) out.push({ k: "rank", t: `Ranked ${ord(r.pos.rank)} of ${r.pos.n} ${/시도/.test(r.poolName) ? "provinces" : "areas"} (best first)` });
    else {
      const top = Math.max(1, Math.round((1 - r.pos.u) * 100));
      out.push({ k: "rank", t: r.pos.u >= 0.5 ? `Among the least favourable ${top}% of ${r.pos.n} ${pool}` : `Among the most favourable ${Math.max(1, Math.round(r.pos.u * 100))}% of ${r.pos.n} ${pool}` });
    }
  }
  if (r.trend && r.trendCls) {
    const s = r.trend.slope, sg = s > 0 ? "▲" : s < 0 ? "▼" : "";
    const third = ["improving third", "middle third", "worsening third"][r.trendCls.tertile];
    out.push({ k: "trend", t: `${r.trend.y0}–${r.trend.y1} (${r.trend.n} years): ${sg}${f(Math.abs(s), 2)}${du} per year — ${TREND_EN[r.trendCls.label] || r.trendCls.label} (pace in the ${third} of the comparison group)` });
  } else out.push({ k: "trend", t: "Fewer than 3 valid years in the last 5 — trend not assessed" });
  if (Number.isInteger(r.depQ)) {
    out.push({ k: "dep", t: r.depQ >= 4 && r.gap?.dirAbs > 0
      ? `Area deprivation quintile ${r.depQ} (5 = most deprived), and this indicator is also at an unfavourable level`
      : `Area deprivation quintile ${r.depQ} (5 = most deprived)` });
  }
  if (r.ci?.unstable) out.push({ k: "rse", t: `${r.y} estimate has a relative standard error above 20% (unstable) — not placed in “Review first”` });
  if (r.ciIncludesRef === true) out.push({ k: "ci", t: `The 95% confidence interval of the ${r.y} single-year estimate includes that year’s national median — the difference may be sampling error, so it is not placed in “Review first”` });
  else if (r.ciIncludesRef === false) out.push({ k: "ci", t: `${r.y} single-year estimate ${f(r.ci.v)}${r.unit} (95% CI ${f(r.ci.lo)}–${f(r.ci.hi)}) does not overlap that year’s national median (${f(r.refY)})` });
  return out;
}
