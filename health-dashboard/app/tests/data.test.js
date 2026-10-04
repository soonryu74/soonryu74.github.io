/* 실제 자료로 확인(지시서 18절 7): 258개 조사 단위 필터와 전국 중앙값이 기존 계산과 일치하는가 */
import test from "node:test";
import assert from "node:assert/strict";
import { INDICATORS, HC_POOL, SGG_ALL, natPool, nationalMedian, isSurvey, RBY } from "../src/data.js";
import { assess, priorityFor, CANDIDATES, CORE } from "../src/lib/equity/index.js";

const byId = (id) => INDICATORS.find((i) => i.id === id);

test("7. 표본조사 지표의 비교 집단은 258개 조사 단위, 전국 중앙값은 기존 nationalMedian 과 같다", () => {
  assert.equal(HC_POOL.length, 258);
  for (const id of ["DT_H_SM", "DT_H_OBE_OBE", "DT_H_EX_WALK", "DT_117075_H_DR_HIGH_WH"]) {
    const ind = byId(id);
    assert.ok(isSurvey(ind));
    assert.equal(natPool(ind).length, 258);
    const y = ind.years[ind.years.length - 1];
    const row = assess(ind, RBY.get("00901"), "std", { smooth: 1 });     // 강릉시
    assert.equal(row.y, y);
    assert.ok(Math.abs(row.ref - nationalMedian(ind, "std", y)) < 1e-9, id);
    assert.equal(row.poolName, "전국 조사 단위(보건소)");
  }
  const kdh = INDICATORS.find((i) => i.kdh && i.direction !== "context");
  assert.equal(natPool(kdh).length, SGG_ALL.length);                   // 시군구 자료는 시군구 풀 유지
});

test("모든 지표에 direction 메타데이터가 있고 bad 와 일치한다", () => {
  for (const i of INDICATORS) {
    assert.ok(["lower_is_better", "higher_is_better", "context"].includes(i.direction), i.id);
    assert.equal(i.direction === "lower_is_better", i.bad === true);
    assert.equal(i.direction === "higher_is_better", i.bad === false);
  }
  assert.ok(CANDIDATES.every((i) => i.direction !== "context" && !i.dep && i.tier !== "투입·과정"));
});

test("지역별 결과: 시군구·시도·다보건소 시 모두 계산되고 상위 3개 영역이 겹치지 않는다", () => {
  for (const code of ["00901", "001", "01103"]) {
    const sel = RBY.get(code);
    if (!sel) continue;
    const p = priorityFor(sel, "std", { smooth: 3 });
    assert.ok(p.rows.length === CORE.length && priorityFor(sel, "std", { smooth: 3, scope: "all" }).rows.length === CANDIDATES.length);
    const doms = p.top.map((r) => r.domain);
    assert.equal(new Set(doms).size, doms.length);
    for (const r of p.rows) if (r.tier !== "insufficient") assert.ok(r.reasons.length >= 2, `${code} ${r.id}`);
    if (sel.l === "sido") assert.ok(p.rows.every((r) => r.depQ == null));   // 시도는 박탈 분위 없음 → 재정규화
  }
});

test("지표별 보고서(전국 취약지역): 비교 집단 전체를 판정하고, 검토 대상은 불리한 쪽 10%, 문장은 사실만", async () => {
  const { buildIndicatorReport, draftIndicatorParagraphs } = await import("../src/lib/indicatorReport.js");
  for (const id of ["DT_H_SM", "DT_117075_H_DR_HIGH_WH"]) {
    const ind = byId(id);
    const m = buildIndicatorReport(ind, "std", 3);
    assert.ok(m && m.n >= 250 && m.n <= 258, `${id} n=${m?.n}`);
    // 검토 대상 = 불리한 쪽 백분위 0.9 이상 → 대략 10%
    assert.ok(m.vulnerable.length >= m.n * 0.08 && m.vulnerable.length <= m.n * 0.12, `${id} vulnerable=${m.vulnerable.length}`);
    assert.ok(m.vulnerable.every((x) => x.a.gap.dirAbs > 0), "검토 대상은 모두 중앙값보다 불리");
    // 낮을수록 좋은 지표 → 검토 대상 값은 모두 경계값 이상
    assert.ok(m.vulnerable.every((x) => x.a.v >= m.cut10 - 1e-9));
    // 시도별 지역 수 합 = 비교 지역 수, 불리한 쪽 20% 합 ≈ 20%
    assert.equal(m.sido.reduce((s, x) => s + x.n, 0), m.n);
    const n20 = m.sido.reduce((s, x) => s + x.n20, 0);
    assert.ok(n20 >= m.n * 0.17 && n20 <= m.n * 0.23, `${id} n20=${n20}`);
    assert.ok(m.series.length >= 5 && m.series.every((s) => s.gap >= 0));
    const t = draftIndicatorParagraphs(m).join(" ");
    assert.ok(t.includes(ind.name) && t.includes("검토 대상"));
    for (const bad of ["때문", "원인으로", "해야 한다", "효과가 있", "최악", "위험 지역"]) assert.ok(!t.includes(bad), bad);
  }
  assert.equal(INDICATORS.filter((i) => i.direction === "context").length > 0, true);
});
