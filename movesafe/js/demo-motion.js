/* MoveSafe AI — 합성 샘플 동작 (DEMO). 카메라 없이 파이프라인을 체험·테스트하기 위한 가짜 랜드마크.
 * 실제 사람 데이터가 아니다. 화면에는 항상 'DEMO 샘플' 배지를 붙인다.
 *
 * 3D 골격(미터, y 위가 +)을 운동학적으로 움직인 뒤 2D 이미지 좌표(y 아래가 +)로 투영한다.
 */
import { LM } from './pose-metrics.js';

const SHANK = 0.42, THIGH = 0.45, TRUNK = 0.45, HIP_HALF = 0.10, SH_HALF = 0.19;

/**
 * 한 프레임 생성.
 * depth 0~1 (0=서기, 1=무릎 90°), valgus 0~1 (무릎이 안쪽으로 들어가는 정도), lean ° (몸통 좌우 기울기),
 * asym ° (왼쪽 무릎이 더 펴진 정도), lift m (점프로 몸 전체가 뜬 높이)
 */
export function makeFrame({ depth = 0, valgus = 0, lean = 0, asym = 0, lift = 0 } = {}) {
  const flex = 90 * depth; // 무릎 굴곡 = 180 - flex
  const leg = (side, flexDeg) => {
    const a = (flexDeg * 0.4) / 57.2958, b = (flexDeg * 0.6) / 57.2958; // 정강이 앞 기울기, 허벅지 뒤 기울기
    const xl = side * (HIP_HALF + 0.015 - 0.09 * valgus * Math.max(0.5, depth));
    const ankle = { x: side * (HIP_HALF + 0.02), y: 0 + lift, z: 0 };
    const knee = { x: xl, y: ankle.y + SHANK * Math.cos(a), z: SHANK * Math.sin(a) };
    const hip = { x: side * HIP_HALF, y: knee.y + THIGH * Math.cos(b), z: knee.z - THIGH * Math.sin(b) };
    return { ankle, knee, hip };
  };
  const L = leg(-1, flex - asym), R = leg(1, flex);
  const hipC = { x: 0, y: (L.hip.y + R.hip.y) / 2, z: (L.hip.z + R.hip.z) / 2 };
  const lr = lean / 57.2958;
  const shC = { x: hipC.x + TRUNK * Math.sin(lr), y: hipC.y + TRUNK * Math.cos(lr), z: hipC.z };
  const P = Array.from({ length: 33 }, () => ({ x: 0, y: 0, z: 0 }));
  P[LM.L_HIP] = L.hip; P[LM.R_HIP] = R.hip; P[LM.L_KNEE] = L.knee; P[LM.R_KNEE] = R.knee; P[LM.L_ANKLE] = L.ankle; P[LM.R_ANKLE] = R.ankle;
  P[LM.L_HEEL] = { x: L.ankle.x, y: L.ankle.y - 0.03, z: -0.05 }; P[LM.R_HEEL] = { x: R.ankle.x, y: R.ankle.y - 0.03, z: -0.05 };
  P[LM.L_FOOT] = { x: L.ankle.x - 0.02, y: L.ankle.y - 0.03, z: 0.15 }; P[LM.R_FOOT] = { x: R.ankle.x + 0.02, y: R.ankle.y - 0.03, z: 0.15 };
  P[LM.L_SHOULDER] = { x: shC.x - SH_HALF, y: shC.y, z: shC.z }; P[LM.R_SHOULDER] = { x: shC.x + SH_HALF, y: shC.y, z: shC.z };
  P[LM.L_ELBOW] = { x: shC.x - SH_HALF - 0.05, y: shC.y - 0.28, z: shC.z + 0.05 }; P[LM.R_ELBOW] = { x: shC.x + SH_HALF + 0.05, y: shC.y - 0.28, z: shC.z + 0.05 };
  P[LM.L_WRIST] = { x: shC.x - SH_HALF - 0.02, y: shC.y - 0.5, z: shC.z + 0.15 }; P[LM.R_WRIST] = { x: shC.x + SH_HALF + 0.02, y: shC.y - 0.5, z: shC.z + 0.15 };
  for (let i = 17; i <= 22; i++) P[i] = { ...(i % 2 ? P[LM.L_WRIST] : P[LM.R_WRIST]) };
  P[LM.NOSE] = { x: shC.x, y: shC.y + 0.22, z: shC.z + 0.05 };
  for (let i = 1; i <= 10; i++) P[i] = { x: shC.x + (i % 2 ? -0.04 : 0.04), y: shC.y + 0.24, z: shC.z };
  // 2D 투영: 발목이 화면 0.93, 1 m = 0.42 화면 높이, 정면 카메라
  const lm2d = P.map((p) => ({ x: 0.5 + p.x * 0.42, y: 0.93 - p.y * 0.42, z: -p.z, visibility: 1 }));
  const lm3d = P.map((p) => ({ x: p.x, y: -(p.y - hipC.y), z: p.z }));
  return { lm2d, lm3d };
}

function ease(t) { return 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, t))); }

/** 스쿼트·런지 n회 시퀀스. profile: {valgus, lean, asym, maxDepth, repSec} */
export function squatSequence({ reps = 5, fps = 30, maxDepth = 1, valgus = 0, lean = 0, asym = 0, repSec = 2.4, restSec = 0.6 } = {}) {
  const frames = [];
  let t = 0; const dt = 1000 / fps;
  const push = (depth) => { frames.push({ t, ...makeFrame({ depth, valgus, lean, asym }) }); t += dt; };
  for (let i = 0; i < fps * 0.5; i++) push(0);
  for (let r = 0; r < reps; r++) {
    const n = Math.round(fps * repSec);
    for (let i = 0; i < n; i++) { const u = i / n; push(maxDepth * (u < 0.5 ? ease(u * 2) : 1 - ease((u - 0.5) * 2))); }
    for (let i = 0; i < fps * restSec; i++) push(0);
  }
  return frames;
}

/** 점프 착지 n회. landingDepth 0~1 (0.12 = 딱딱, 0.6 = 부드러움) */
export function landingSequence({ jumps = 3, fps = 30, landingDepth = 0.6, valgus = 0, lean = 0, asym = 0 } = {}) {
  const frames = []; let t = 0; const dt = 1000 / fps;
  const push = (o) => { frames.push({ t, ...makeFrame(o) }); t += dt; };
  for (let i = 0; i < fps * 0.8; i++) push({ depth: 0 });
  for (let j = 0; j < jumps; j++) {
    for (let i = 0; i < fps * 0.3; i++) push({ depth: 0.3 * ease(i / (fps * 0.3)) }); // 반동
    const air = Math.round(fps * 0.45);
    for (let i = 0; i < air; i++) { const u = i / air; push({ depth: 0, lift: 0.28 * 4 * u * (1 - u) }); }
    const land = Math.round(fps * 0.3);
    for (let i = 0; i < land; i++) push({ depth: landingDepth * ease(i / land), valgus, lean, asym });
    for (let i = 0; i < fps * 0.4; i++) push({ depth: landingDepth * (1 - ease(i / (fps * 0.4))) });
    for (let i = 0; i < fps * 0.6; i++) push({ depth: 0 });
  }
  return frames;
}

export const DEMO_PROFILES = {
  squat_good: { label: '스쿼트 — 좋은 자세', exercise: 'squat', make: () => squatSequence({ reps: 5 }) },
  squat_valgus: { label: '스쿼트 — 무릎 안쪽 쏠림', exercise: 'squat', make: () => squatSequence({ reps: 5, valgus: 1 }) },
  squat_shallow: { label: '스쿼트 — 얕고 빠름', exercise: 'squat', make: () => squatSequence({ reps: 5, maxDepth: 0.55, repSec: 1.2 }) },
  lunge_asym: { label: '런지 — 좌우 비대칭·기울기', exercise: 'lunge', make: () => squatSequence({ reps: 4, maxDepth: 0.85, asym: 22, lean: 14 }) },
  landing_soft: { label: '착지 — 부드러운 착지', exercise: 'landing', make: () => landingSequence({ jumps: 3, landingDepth: 0.6 }) },
  landing_stiff: { label: '착지 — 딱딱하고 무릎 모임', exercise: 'landing', make: () => landingSequence({ jumps: 3, landingDepth: 0.12, valgus: 1 }) },
};
