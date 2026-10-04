/* 우선 검토 계산 단위 테스트(지시서 18절 1~6) — 순수 함수만 사용 */
import test from "node:test";
import assert from "node:assert/strict";
import { DIRECTION, directionOf, toUnfavorable } from "../src/lib/equity/normalizeIndicator.js";
import { medianOf, gapOf, gapScore, unfavorablePercentile, ciIncludes } from "../src/lib/equity/calculateGap.js";
import { recentTrend, trendClass } from "../src/lib/equity/calculateTrend.js";
import { combine, depScore, tierOf, pickTop, WEIGHTS } from "../src/lib/equity/calculatePriority.js";
import { buildReasons, buildReasonsEn } from "../src/lib/equity/buildReasons.js";

const L = DIRECTION.LOWER, H = DIRECTION.HIGHER;

test("1. 낮을수록 좋은 지표: 중앙값보다 높으면 불리(+), 백분위도 불리 쪽", () => {
  assert.equal(directionOf(true), L);
  const g = gapOf(22.8, 17.9, L);
  assert.ok(g.dirAbs > 0 && g.dirRel > 0);
  assert.ok(Math.abs(g.abs - 4.9) < 1e-9);
  const pos = unfavorablePercentile(30, [10, 15, 20, 25, 30], L);
  assert.equal(pos.rank, 5);                // 양호한 순 5위 = 가장 불리
  assert.ok(pos.u > 0.8);
  assert.ok(gapScore(g.dirRel) > 0.9);
});

test("2. 높을수록 좋은 지표: 중앙값보다 낮으면 불리(+), 높으면 양호(−)", () => {
  assert.equal(directionOf(false), H);
  assert.ok(gapOf(30, 40, H).dirAbs > 0);
  assert.ok(gapOf(50, 40, H).dirAbs < 0);
  assert.equal(gapScore(gapOf(50, 40, H).dirRel), 0);    // 양호 쪽은 0
  const pos = unfavorablePercentile(10, [10, 15, 20, 25, 30], H);
  assert.equal(pos.rank, 5);
  assert.equal(directionOf(null), DIRECTION.CONTEXT);
  assert.equal(toUnfavorable(3, DIRECTION.CONTEXT), null); // 방향 없음은 계산 안 함
});

test("3. 결측은 0으로 처리하지 않는다", () => {
  assert.equal(medianOf([null, 10, undefined, 20, NaN]), 15);           // 0이 섞였다면 10
  assert.equal(gapOf(null, 10, L), null);
  assert.equal(unfavorablePercentile(null, [1, 2, 3], L), null);
  const pos = unfavorablePercentile(2, [1, null, 3, null], L);
  assert.equal(pos.n, 2);                                               // 결측 지역은 분모에서 빠짐
  assert.equal(depScore(null), null);
  assert.equal(depScore(undefined), null);
  assert.equal(depScore(0), null);                                      // 없는 분위를 0점으로 만들지 않음
});

test("4. 박탈지수가 없으면 남은 가중치로 재정규화", () => {
  const full = combine({ gap: 1, rank: 1, trend: 1, dep: 1 });
  assert.ok(Math.abs(full.score - 1) < 1e-9);
  const noDep = combine({ gap: 1, rank: 0.5, trend: 0.5, dep: null });
  const wsum = Object.values(noDep.weights).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(wsum - 1) < 1e-9);
  assert.deepEqual(noDep.used, ["gap", "rank", "trend"]);
  const expect = (WEIGHTS.gap * 1 + WEIGHTS.rank * 0.5 + WEIGHTS.trend * 0.5) / (WEIGHTS.gap + WEIGHTS.rank + WEIGHTS.trend);
  assert.ok(Math.abs(noDep.score - expect) < 1e-9);
  assert.equal(combine({ gap: null, rank: 1, trend: 1, dep: 1 }), null); // 격차 없으면 계산 안 함
});

test("5. 최근 5년 유효 연도가 3개 미만이면 추세를 평가하지 않는다", () => {
  assert.equal(recentTrend([[2021, null], [2022, 10], [2023, null], [2024, null], [2025, 12]], { endYear: 2025 }), null);
  const t = recentTrend([[2021, 10], [2022, null], [2023, 11], [2024, null], [2025, 12]], { endYear: 2025 });
  assert.ok(t && Math.abs(t.slope - 0.5) < 1e-9 && t.n === 3);
  assert.equal(recentTrend([[2019, 1], [2020, 2], [2025, 3]], { endYear: 2025 }), null);   // 창 밖 연도는 세지 않음
  assert.equal(trendClass(1, L, [1, 2]), null);                                             // 비교 집단 기울기 부족
  const pool = [-2, -1.5, -1, -0.5, 0, 0.5, 1];
  assert.equal(trendClass(0.1, L, pool, 30).key, "stable");      // 연 0.1 ÷ 30 = 0.3% < 1% → 변화 적음
  assert.equal(trendClass(1.0, L, pool, 30).key, "worsening");   // 낮을수록 좋은 지표가 오름
  assert.equal(trendClass(1.0, H, pool, 30).key, "improving");   // 높을수록 좋은 지표가 오름
  const r = buildReasons({ unit: "%", direction: L, gap: gapOf(20, 18, L), ref: 18, trend: null, trendCls: null });
  assert.ok(r.some((x) => x.k === "trend" && x.t.includes("평가하지 않음")));
});

test("6. 동률·근접 차이를 과도하게 구분하지 않는다", () => {
  const pool = [10, 12, 12, 12, 14];
  const a = unfavorablePercentile(12, pool, L), b = unfavorablePercentile(12, [...pool], L);
  assert.equal(a.u, b.u);
  assert.equal(a.rank, 2);                                   // 동률 3곳은 같은 순위
  // 신뢰구간이 중앙값을 포함하면 다른 조건이 모두 불리해도 「우선 검토」로 올리지 않는다
  const inc = ciIncludes({ lo: 17, hi: 23 }, 18);
  assert.equal(inc, true);
  assert.equal(tierOf({ dirRel: 0.2, u: 0.95, score: 0.9, ciIncludesRef: inc, n: 258 }), "watch");
  assert.equal(tierOf({ dirRel: 0.2, u: 0.95, score: 0.9, ciIncludesRef: false, n: 258 }), "priority");
  assert.equal(tierOf({ dirRel: 0.2, u: 0.95, score: 0.9, ciIncludesRef: null, n: 5 }), "insufficient");   // 비교 집단 부족
  assert.equal(tierOf({ dirRel: 0.2, u: 0.95, score: 0.9, ciIncludesRef: false, unstable: true, n: 258 }), "watch");   // 불안정 값(RSE>20%)
});

test("상위 3개는 같은 영역을 반복하지 않는다", () => {
  const rows = [
    { tier: "priority", score: 0.9, domain: "흡연", id: "a" }, { tier: "priority", score: 0.85, domain: "흡연", id: "b" },
    { tier: "priority", score: 0.7, domain: "음주", id: "c" }, { tier: "watch", score: 0.8, domain: "신체활동", id: "d" }, { tier: "ok", score: 0.99, domain: "x", id: "e" },
  ];
  assert.deepEqual(pickTop(rows).map((r) => r.id), ["a", "c", "d"]);
});

test("근거 문장은 인과 표현 없이 병렬 서술", () => {
  const r = buildReasons({ unit: "%", direction: L, gap: gapOf(22.8, 17.9, L), ref: 17.9, pos: { u: 0.9, rank: 230, n: 258 }, poolName: "전국", trend: null, trendCls: null, depQ: 5, ciIncludesRef: null });
  const txt = r.map((x) => x.t).join(" ");
  assert.ok(txt.includes("4.9%p 높음"));
  assert.ok(txt.includes("불리한 방향 상위 10%"));
  assert.ok(txt.includes("지역이며, 이 지표도 불리한 수준"));
  for (const bad of ["때문", "높아서", "원인", "가장 위험", "최악", "정책 실패"]) assert.ok(!txt.includes(bad), bad);
});

test("영어 근거 문장은 한국어와 같은 숫자를 쓰고 인과·예측 표현이 없다", () => {
  const row = { unit: "%", direction: L, gap: gapOf(22.8, 17.9, L), ref: 17.9, pos: { u: 0.9, rank: 230, n: 258 }, poolName: "전국 조사 단위(보건소)", trend: null, trendCls: null, depQ: 5, ciIncludesRef: null };
  const en = buildReasonsEn(row).map((x) => x.t).join(" ");
  assert.ok(en.includes("4.9 pp higher than the national median (17.9%)"));
  assert.ok(en.includes("least favourable 10% of 258 survey units nationwide"));
  assert.ok(en.includes("quintile 5"));
  assert.equal(buildReasonsEn(row).length, buildReasons(row).length);
  assert.ok(!/[가-힣]/.test(en), "no Korean in English reasons");
  for (const bad of ["because", "cause", "predict", "risk of", "worst"]) assert.ok(!en.toLowerCase().includes(bad), bad);
});

test("지역 보고서 문장 초안: 계산된 사실만, 인과·처방 표현 없음", async () => {
  const { draftParagraphs, strengthsOf, trendGroups } = await import("../src/lib/report.js");
  const mk = (id, name, tier, dirAbs, u, trendKey) => ({ id, name, domain: "흡연", unit: "%", v: 20, ref: 18, tier, gap: { abs: 2, dirAbs }, pos: { u, n: 258, rank: 1 }, trendCls: trendKey ? { key: trendKey, u: 0.5 } : null });
  const rows = [mk("a", "현재흡연율", "priority", 2, 0.9, "worsening"), mk("b", "걷기 실천율", "ok", -3, 0.1, "improving"), mk("c", "비만율", "watch", 1, 0.6, null)];
  const p = { rows, top: [rows[0]], counts: { priority: 1, watch: 1, ok: 1, insufficient: 0 } };
  const s = strengthsOf(rows);
  assert.deepEqual(s.map((r) => r.id), ["b"]);
  const t = draftParagraphs({ regionName: "가나시", p, strengths: s, trends: trendGroups(rows), dep: { q: 4, year: 2020 }, hle: null, poolDesc: "전국 중앙값", basis: "3년 평균" }).join(" ");
  assert.ok(t.includes("「우선 검토」 1개") && t.includes("「현재흡연율」") && t.includes("「걷기 실천율」") && t.includes("4분위"));
  for (const bad of ["때문", "원인으로", "해야 한다", "효과가 있", "최악", "위험 지역"]) assert.ok(!t.includes(bad), bad);
});
