/* Health Equity Radar 틀을 WHO STEPS 국가 집계에 적용 — 한국용 순수 함수(app/src/lib/equity)를 그대로 불러 쓴다(코드 재사용 = 이식성의 증거).
   국가 자료는 지역이 아니라 국가 단위 1개라, 「우선 검토」는 국가 안 하위집단(성·연령·도시/농촌) 격차로 판정한다.
   지역 순위·추세·박탈 요소는 자료가 없어 쓰지 않는다. 검증 PASS 지표만 판정한다.
   사용: node scripts/who/radar_who.mjs <aggregated.json>  (같은 파일에 radar 필드를 써 넣는다) */
import { readFileSync, writeFileSync } from "node:fs";
import { gapOf, ciIncludes } from "../../app/src/lib/equity/calculateGap.js";

const NAMES = { smoking: "current tobacco smoking", inactive: "insufficient physical activity", bmi25: "overweight or obesity (BMI ≥ 25)", raisedbp: "raised blood pressure", raisedglu: "raised fasting blood glucose" };
const GROUP_EN = { men: "men", women: "women", urban: "urban residents", rural: "rural residents" };
const gname = (g) => GROUP_EN[g] || `adults aged ${g}`;
const REL_REVIEW = 0.2; // 국가값보다 20% 이상 불리 + 95% CI 가 국가값을 포함하지 않으면 「review first」

export function radarFor(agg) {
  const out = [];
  for (const [key, ind] of Object.entries(agg.indicators)) {
    if (ind.verdict !== "PASS") { out.push({ key, status: "not_shown", why: `validation ${ind.verdict}` }); continue; }
    const nat = ind.groups["18-69"];
    const subs = Object.entries(ind.groups).filter(([g]) => g !== "18-69");
    const rows = subs.map(([g, v]) => {
      const gap = gapOf(v.pct, nat.pct, "lower_is_better");
      const inc = ciIncludes({ lo: v.lo, hi: v.hi }, nat.pct);
      return { group: g, pct: v.pct, lo: v.lo, hi: v.hi, n: v.n, gap_pp: +gap.abs.toFixed(1), rel: gap.dirRel == null ? null : +gap.dirRel.toFixed(3), ciIncludesNational: inc };
    }).sort((a, b) => (b.rel ?? -9) - (a.rel ?? -9));
    const worst = rows[0];
    const tier = worst && worst.rel >= REL_REVIEW && worst.ciIncludesNational === false ? "review_first" : worst && worst.rel > 0 ? "watch" : "no_clear_gap";
    const reasons = [];
    if (worst) {
      reasons.push(`${NAMES[key]}: ${worst.pct}% among ${gname(worst.group)} (95% CI ${worst.lo}–${worst.hi}) vs ${nat.pct}% nationally — ${worst.gap_pp > 0 ? "+" : ""}${worst.gap_pp} percentage points.`);
      reasons.push(worst.ciIncludesNational === false ? "The subgroup's 95% CI does not include the national value." : "The subgroup's 95% CI includes the national value, so the difference may be sampling variation.");
    }
    out.push({ key, status: tier, national: { pct: nat.pct, lo: nat.lo, hi: nat.hi, n: nat.n }, worst, subgroups: rows, reasons });
  }
  return { method: "Within-country subgroup gaps using the same direction-aware gap and CI-overlap functions as the Korean Health Equity Radar (app/src/lib/equity). No regional ranking, trend or deprivation component (not available in national STEPS files).", threshold_relative: REL_REVIEW, items: out };
}

if (process.argv[2]) {
  const p = process.argv[2]; const agg = JSON.parse(readFileSync(p, "utf8"));
  agg.radar = radarFor(agg); writeFileSync(p, JSON.stringify(agg, null, 1));
  for (const it of agg.radar.items) console.log(it.key, it.status, it.worst ? `${it.worst.group} ${it.worst.pct}% vs ${it.national.pct}%` : it.why || "");
}
