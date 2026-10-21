// node --test movesafe/tests/engine.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { angleDeg, frameMetrics, visibilityCheck, LM, smoothMetrics } from '../js/pose-metrics.js';
import { RepCounter, LandingDetector, evaluateRep, evaluateLanding, summarizeSession, EXERCISES, THR } from '../js/exercise-rules.js';
import { makeFrame, squatSequence, landingSequence, DEMO_PROFILES } from '../js/demo-motion.js';
import { dailyTargets, sweatRate, supplementDoses, dopingWatch, ACTIVITY } from '../js/nutrition.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const doping = JSON.parse(readFileSync(path.join(here, '..', 'data', 'doping-watch.json'), 'utf8'));
const routines = JSON.parse(readFileSync(path.join(here, '..', 'data', 'routines.json'), 'utf8'));
const supplements = JSON.parse(readFileSync(path.join(here, '..', 'data', 'supplements.json'), 'utf8'));

function runSquat(frames, exercise = 'squat') {
  const rc = new RepCounter(EXERCISES[exercise]);
  const evals = [];
  let prev = null;
  for (const fr of frames) {
    const m = smoothMetrics(prev, frameMetrics(fr.lm2d, fr.lm3d), 0.6); prev = m;
    const rep = rc.update(m, fr.t);
    if (rep) evals.push(evaluateRep(rep, exercise));
  }
  return evals;
}
function runLanding(frames) {
  const ld = new LandingDetector();
  const evals = [];
  for (const fr of frames) { const l = ld.update(frameMetrics(fr.lm2d, fr.lm3d), fr.t); if (l) evals.push(evaluateLanding(l)); }
  return evals;
}

test('angleDeg: 직각·일직선·3D', () => {
  assert.ok(Math.abs(angleDeg({ x: 1, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 1 }) - 90) < 1e-9);
  assert.ok(Math.abs(angleDeg({ x: -1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 }) - 180) < 1e-9);
  assert.ok(Math.abs(angleDeg({ x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }) - 90) < 1e-9);
  assert.equal(angleDeg({ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 1 }), null);
});

test('makeFrame: 서기 = 무릎 ~180°, depth 1 = ~90°, valgus 는 KASR 을 낮춤', () => {
  const stand = frameMetrics(...Object.values(makeFrame({ depth: 0 })));
  assert.ok(stand.ok); assert.ok(stand.kneeMin > 175, `서기 무릎각 ${stand.kneeMin}`);
  assert.ok(stand.kasr > 0.9 && stand.kasr < 1.1);
  const deep = frameMetrics(...Object.values(makeFrame({ depth: 1 })));
  assert.ok(Math.abs(deep.kneeMin - 90) < 2, `깊은 스쿼트 무릎각 ${deep.kneeMin}`);
  assert.ok(deep.kasr > 0.85, `정상 KASR ${deep.kasr}`);
  const valg = frameMetrics(...Object.values(makeFrame({ depth: 1, valgus: 1 })));
  assert.ok(valg.kasr < THR.kasr, `외반 KASR ${valg.kasr}`);
  assert.ok(Math.max(valg.medialL, valg.medialR) >= THR.medial);
  const lean = frameMetrics(...Object.values(makeFrame({ depth: 0.5, lean: 14 })));
  assert.ok(Math.abs(lean.trunkLean - 14) < 1.5, `기울기 ${lean.trunkLean}`);
  const asym = frameMetrics(...Object.values(makeFrame({ depth: 1, asym: 20 })));
  assert.ok(asym.kneeAsym > 15);
});

test('visibilityCheck: 가려진 관절 → ok=false, frameMetrics 도 ok=false', () => {
  const { lm2d, lm3d } = makeFrame({});
  lm2d[LM.L_KNEE].visibility = 0.2;
  const v = visibilityCheck(lm2d);
  assert.equal(v.ok, false); assert.deepEqual(v.missing, [LM.L_KNEE]);
  assert.equal(frameMetrics(lm2d, lm3d).ok, false);
});

test('스쿼트 샘플: 좋은 자세 5회 → 5회 감지, 점수 ≥ 90, 외반 플래그 없음', () => {
  const evals = runSquat(DEMO_PROFILES.squat_good.make());
  assert.equal(evals.length, 5);
  for (const e of evals) { assert.ok(e.score >= 90, `점수 ${e.score} ${JSON.stringify(e.flags)}`); assert.ok(!e.flags.some((f) => f.code === 'valgus')); }
});

test('스쿼트 샘플: 무릎 안쪽 쏠림 → 모든 반복에 valgus, 점수 ≤ 70', () => {
  const evals = runSquat(DEMO_PROFILES.squat_valgus.make());
  assert.equal(evals.length, 5);
  for (const e of evals) { assert.ok(e.flags.some((f) => f.code === 'valgus'), JSON.stringify(e)); assert.ok(e.score <= 70); }
  const s = summarizeSession(evals);
  assert.ok(s.routines.includes('hip')); assert.equal(s.count, 5);
});

test('스쿼트 샘플: 얕고 빠름 → shallow + fast', () => {
  const evals = runSquat(DEMO_PROFILES.squat_shallow.make());
  assert.ok(evals.length >= 4, `감지 ${evals.length}`);
  for (const e of evals) { assert.ok(e.flags.some((f) => f.code === 'shallow' || f.code === 'partial')); }
  assert.ok(evals.some((e) => e.flags.some((f) => f.code === 'fast')));
  assert.ok(summarizeSession(evals).routines.includes('mobility'));
});

test('런지 샘플: 비대칭·기울기 → asym + lean', () => {
  const evals = runSquat(DEMO_PROFILES.lunge_asym.make(), 'lunge');
  assert.equal(evals.length, 4);
  for (const e of evals) { assert.ok(e.flags.some((f) => f.code === 'asym')); assert.ok(e.flags.some((f) => f.code === 'lean')); }
  const s = summarizeSession(evals);
  assert.ok(s.routines.includes('unilateral') && s.routines.includes('core'));
});

test('착지 샘플: 부드러운 착지 3회 감지·점수 높음, 딱딱+모임 → stiff + valgus', () => {
  const soft = runLanding(DEMO_PROFILES.landing_soft.make());
  assert.equal(soft.length, 3);
  for (const e of soft) assert.ok(e.score >= 85, JSON.stringify(e));
  const stiff = runLanding(DEMO_PROFILES.landing_stiff.make());
  assert.equal(stiff.length, 3);
  for (const e of stiff) { assert.ok(e.flags.some((f) => f.code === 'stiff'), JSON.stringify(e)); assert.ok(e.flags.some((f) => f.code === 'valgus')); }
  assert.ok(summarizeSession(stiff).routines.includes('landing'));
});

test('summarizeSession: 빈 세션, 루틴 키가 routines.json 에 존재', () => {
  const empty = summarizeSession([]);
  assert.equal(empty.count, 0); assert.deepEqual(empty.routines, ['warmup']);
  for (const k of ['warmup', 'hip', 'landing', 'mobility', 'core', 'unilateral']) assert.ok(routines.routines[k], k);
});

test('nutrition.dailyTargets: 70 kg 보통 활동 유지', () => {
  const t = dailyTargets({ weightKg: 70, activity: 'moderate', goal: 'maintain', age: 35 });
  assert.ok(t.ok);
  assert.deepEqual(t.carb.g, [350, 490]);
  assert.deepEqual(t.protein.g, [84, 140]);
  assert.deepEqual(t.fluid.preMl, [350, 490]);
  assert.deepEqual(t.protein.perMeal, [21, 28]);
  const old = dailyTargets({ weightKg: 60, age: 70 });
  assert.ok(old.notes.length >= 1 && old.protein.perKg[0] >= 1.2);
  assert.equal(dailyTargets({ weightKg: 5 }).ok, false);
  for (const k of Object.keys(ACTIVITY)) assert.ok(ACTIVITY[k].carb[0] < ACTIVITY[k].carb[1]);
});

test('nutrition.sweatRate: 2 kg 손실 90분, 500 mL 섭취', () => {
  const s = sweatRate({ preKg: 70, postKg: 68, fluidMl: 500, durationMin: 90 });
  assert.ok(s.ok);
  assert.equal(s.lossKg, 2.5); assert.equal(s.ratePerH, 1.67); assert.equal(s.pctLoss, 2.9);
  assert.deepEqual(s.replaceL, [2.5, 3]);
  assert.ok(s.warn.length === 1);
  assert.equal(sweatRate({}).ok, false);
});

test('nutrition.supplementDoses: 체중 비례', () => {
  const d = supplementDoses(80);
  assert.equal(d.caffeine.range, '240~480 mg');
  assert.equal(d.bicarbonate.range, '16~24 g');
  assert.equal(supplementDoses(0), null);
  for (const s of supplements.items) assert.ok(s.dose && s.caution && s.ref);
});

test('nutrition.dopingWatch: 키워드 매칭·정렬·대소문자', () => {
  const hits = dopingWatch('종합감기약(슈도에페드린), 커피, Ostarine 보충제, 벤토린 흡입', doping.items);
  const ids = hits.map((h) => h.id);
  assert.deepEqual(ids, ['sarms', 'pseudoephedrine', 'caffeine', 'salbutamol']);
  assert.equal(dopingWatch('', doping.items).length, 0);
  assert.equal(dopingWatch('비타민 C', doping.items).length, 0);
  for (const it of doping.items) assert.ok(['prohibited_always', 'prohibited_in_competition', 'particular_sports', 'monitored', 'allowed'].includes(it.status), it.id);
});

test('sequence 생성기: 프레임 수·시간 단조 증가', () => {
  const s = squatSequence({ reps: 2, fps: 30 }); const l = landingSequence({ jumps: 1, fps: 30 });
  for (const seq of [s, l]) for (let i = 1; i < seq.length; i++) assert.ok(seq[i].t > seq[i - 1].t);
  assert.ok(s.length > 60 && l.length > 60);
});
