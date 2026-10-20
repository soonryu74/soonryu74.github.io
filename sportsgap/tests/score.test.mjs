// node --test sportsgap/tests/  (Node 20+)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { percentile, normalize, rawIndicators, scoreRegions, simulateBudget, proposals, summary, DEFAULT_WEIGHTS, GROUPS } from '../js/score.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(path.join(here, '..', 'data', 'regions.json'), 'utf8'));
const regions = data.regions;
const byName = Object.fromEntries(regions.map((r) => [r.name, r]));

test('데이터: 경기도 31개 시군, 필수 필드, 양수 인구·면적', () => {
  assert.equal(regions.length, 31);
  for (const r of regions) {
    for (const k of ['name', 'code', 'pop_total', 'pop_child_0_14', 'pop_elder_65p', 'area_km2', 'facilities_total', 'facilities_by_type', 'bus_stops']) {
      assert.ok(k in r, `${r.name} 에 ${k} 없음`);
    }
    assert.ok(r.pop_total > 0 && r.area_km2 > 0);
    assert.ok(r.pop_child_0_14 + r.pop_elder_65p < r.pop_total);
    assert.equal(Object.values(r.facilities_by_type).reduce((a, b) => a + b, 0), r.facilities_total);
    assert.ok(r.code.startsWith('41'));
  }
  // 원자료 소계와 일치(문체부 2024 시도별현황: 경기 5,029 - 간이운동장 2,566 = 2,463)
  assert.equal(regions.reduce((s, r) => s + r.facilities_total, 0), 2463);
  assert.equal(regions.reduce((s, r) => s + r.simple_grounds, 0), 2566);
});

test('percentile: 선형보간', () => {
  assert.equal(percentile([1, 2, 3, 4, 5], 50), 3);
  assert.equal(percentile([1, 2, 3, 4], 50), 2.5);
  assert.equal(percentile([10], 95), 10);
  assert.equal(percentile([0, 100], 95), 95);
});

test('normalize: P5~P95 윈저라이즈 + min-max, inverse, null 유지', () => {
  const v = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  const n = normalize(v);
  assert.equal(n[0], 0); assert.equal(n[10], 100); assert.equal(n[5], 50);
  const inv = normalize(v, true);
  assert.equal(inv[0], 100); assert.equal(inv[10], 0);
  const withNull = normalize([1, null, 3]);
  assert.equal(withNull[1], null);
  assert.equal(withNull[0], 0); assert.equal(withNull[2], 100);
  // 이상치 클리핑: 1000 이 P95 를 넘어 100 으로 잘림, 90 도 P95 이상이면 100 에 가까움
  const out = normalize([0, 10, 20, 30, 1000]);
  assert.equal(out[4], 100);
});

test('rawIndicators: 산식 (수원시 실제 값으로 손계산 대조)', () => {
  const s = byName['수원시'];
  const r = rawIndicators(s, { scope: 'all', group: 'elder' });
  assert.equal(r.facilities, s.facilities_total);
  assert.ok(Math.abs(r.supply_per_10k - (s.facilities_total / s.pop_total) * 10000) < 1e-9);
  assert.ok(Math.abs(r.est_km - 0.5 * Math.sqrt(s.area_km2 / s.facilities_total)) < 1e-9);
  assert.ok(Math.abs(r.vuln_ratio - (s.pop_elder_65p / s.pop_total) * 100) < 1e-9);
  assert.ok(Math.abs(r.transit_density - s.bus_stops / s.area_km2) < 1e-9);
  const c = rawIndicators(s, { scope: 'all', group: 'child' });
  assert.ok(Math.abs(c.vuln_ratio - (s.pop_child_0_14 / s.pop_total) * 100) < 1e-9);
  // 시설 0개면 거리 평가불가
  const zero = rawIndicators({ ...s, facilities_total: 0 }, { scope: 'all' });
  assert.equal(zero.est_km, null);
  assert.equal(zero.supply_per_10k, 0);
});

test('scoreRegions: 기본 가중치 합성, 순위 1~31, 점수 0~100', () => {
  const sc = scoreRegions(regions, { scope: 'all', group: 'elder' });
  assert.equal(sc.ranked.length, 31);
  assert.equal(sc.ranked[0].rank, 1);
  assert.equal(sc.ranked[30].rank, 31);
  for (const r of sc.results) {
    assert.equal(r.status, 'ok');
    assert.ok(r.composite >= 0 && r.composite <= 100);
    // 합성 = Σ w_i/Σw × s_i 손계산
    const w = DEFAULT_WEIGHTS; const ws = 100;
    const manual = (w.shortage * r.scores.shortage + w.distance * r.scores.distance + w.vulnerable * r.scores.vulnerable + w.transit * r.scores.transit) / ws;
    assert.ok(Math.abs(manual - r.composite) < 0.051, `${r.name} ${manual} vs ${r.composite}`);
  }
  // 순위는 합성점수 내림차순
  for (let i = 1; i < sc.ranked.length; i++) assert.ok(sc.ranked[i - 1].composite >= sc.ranked[i].composite);
});

test('scoreRegions: 가중치 0 은 명시적 제외, 지표 결측+가중치>0 은 평가불가(재가중치 금지)', () => {
  const sc = scoreRegions(regions, { weights: { shortage: 50, distance: 50, vulnerable: 0, transit: 0 } });
  for (const r of sc.results) {
    const manual = (50 * r.scores.shortage + 50 * r.scores.distance) / 100;
    assert.ok(Math.abs(manual - r.composite) < 0.051);
  }
  // 버스정류장 결측 지역을 만들어 평가불가 확인
  const mod = regions.map((r) => (r.name === '과천시' ? { ...r, bus_stops: undefined } : r));
  const sc2 = scoreRegions(mod, {});
  const gc = sc2.results.find((r) => r.name === '과천시');
  assert.equal(gc.status, 'na');
  assert.deepEqual(gc.missing, ['transit']);
  assert.equal(gc.rank, null);
  assert.equal(sc2.ranked.length, 30);
  // 같은 지역이라도 transit 가중치를 0 으로 두면 평가 가능
  const sc3 = scoreRegions(mod, { weights: { ...DEFAULT_WEIGHTS, transit: 0 } });
  assert.equal(sc3.results.find((r) => r.name === '과천시').status, 'ok');
});

test('scoreRegions: 장애인 집단은 평가불가 플래그', () => {
  assert.equal(GROUPS.disabled.available, false);
  const sc = scoreRegions(regions, { group: 'disabled' });
  assert.ok(sc.results.every((r) => r.status === 'na' && r.missing.includes('vulnerable')));
});

test('simulateBudget: 예산÷단가 = 개소, 탐욕 배분은 합성점수를 낮추고 순위를 바꾼다', () => {
  const opt = { scope: 'life', group: 'elder' };
  const sim = simulateBudget(regions, opt, { budgetEok: 300, unitCostEok: 50 });
  assert.equal(sim.n, 6);
  assert.equal(sim.usedUnits, 6);
  assert.equal(sim.spentEok, 300);
  const totalUnits = sim.allocation.reduce((s, a) => s + a.units, 0);
  assert.equal(totalUnits, 6);
  for (const a of sim.allocation) {
    assert.ok(a.compositeAfter <= a.compositeBefore + 1e-9, `${a.name} 점수가 오르면 안 됨`);
  }
  // 후보 제한
  const sim2 = simulateBudget(regions, opt, { budgetEok: 100, unitCostEok: 50, candidates: ['과천시', '광명시'] });
  assert.ok(sim2.allocation.every((a) => ['과천시', '광명시'].includes(a.name)));
  // objective 비교: 'score' 는 소도시(과천) 편중, 'people' 은 인구 가중
  const simS = simulateBudget(regions, opt, { budgetEok: 100, unitCostEok: 50, objective: 'score' });
  const simP = simulateBudget(regions, opt, { budgetEok: 100, unitCostEok: 50, objective: 'people' });
  assert.equal(simS.objective, 'score'); assert.equal(simP.objective, 'people');
  assert.ok(simS.steps.every((s) => s.drop > 0) && simP.steps.every((s) => s.drop > 0));
  // 예산 부족
  const sim3 = simulateBudget(regions, opt, { budgetEok: 10, unitCostEok: 50 });
  assert.equal(sim3.n, 0); assert.equal(sim3.allocation.length, 0);
});

test('proposals: 3건 이상, 근거·한계 문구 포함, 상위 3개 지역 순서', () => {
  const sc = scoreRegions(regions, { scope: 'all', group: 'elder' });
  const p = proposals(sc, byName);
  assert.ok(p.length >= 3);
  const regionProps = p.filter((x) => x.kind === 'region');
  assert.equal(regionProps.length, 3);
  assert.deepEqual(regionProps.map((x) => x.region), sc.ranked.slice(0, 3).map((x) => x.name));
  for (const x of p) {
    assert.ok(x.title && x.body && x.caveat);
    assert.ok(Array.isArray(x.evidence) && x.evidence.length >= 1);
  }
});

test('summary: 중앙값·평균이 범위 안', () => {
  const sc = scoreRegions(regions, {});
  const s = summary(sc.results);
  for (const k of Object.keys(s)) {
    assert.ok(s[k].min <= s[k].median && s[k].median <= s[k].max);
    assert.ok(s[k].min <= s[k].mean && s[k].mean <= s[k].max);
  }
});
