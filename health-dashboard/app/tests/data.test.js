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
