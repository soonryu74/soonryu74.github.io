/* MoveSafe AI — 자세 지표 (순수 함수, 브라우저·Node 공용)
 *
 * 입력: MediaPipe Pose Landmarker 결과
 *   lm2d : 33개 {x,y,z,visibility} (이미지 정규화 좌표 0~1, y 아래가 +)
 *   lm3d : 33개 {x,y,z} (worldLandmarks, 미터, 골반 중심 원점) — 있으면 관절 각도에 사용
 * 모든 각도는 도(°). 정면 촬영을 전제로 한다.
 */

export const LM = {
  NOSE: 0, L_EYE: 2, R_EYE: 5, L_EAR: 7, R_EAR: 8,
  L_SHOULDER: 11, R_SHOULDER: 12, L_ELBOW: 13, R_ELBOW: 14, L_WRIST: 15, R_WRIST: 16,
  L_HIP: 23, R_HIP: 24, L_KNEE: 25, R_KNEE: 26, L_ANKLE: 27, R_ANKLE: 28,
  L_HEEL: 29, R_HEEL: 30, L_FOOT: 31, R_FOOT: 32,
};

export const REQUIRED = [LM.L_SHOULDER, LM.R_SHOULDER, LM.L_HIP, LM.R_HIP, LM.L_KNEE, LM.R_KNEE, LM.L_ANKLE, LM.R_ANKLE];

export const DEG = 180 / Math.PI;

/** 점 b 에서의 각도 (a-b-c), 2D 또는 3D */
export function angleDeg(a, b, c) {
  const v1 = [a.x - b.x, a.y - b.y, (a.z ?? 0) - (b.z ?? 0)];
  const v2 = [c.x - b.x, c.y - b.y, (c.z ?? 0) - (b.z ?? 0)];
  const dot = v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2];
  const n1 = Math.hypot(...v1), n2 = Math.hypot(...v2);
  if (n1 === 0 || n2 === 0) return null;
  const cos = Math.min(1, Math.max(-1, dot / (n1 * n2)));
  return Math.acos(cos) * DEG;
}

export function dist2(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
export function mid(a, b) { return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: ((a.z ?? 0) + (b.z ?? 0)) / 2 }; }

/** 필수 관절이 모두 보이는지 */
export function visibilityCheck(lm2d, thr = 0.5) {
  const missing = REQUIRED.filter((i) => !lm2d?.[i] || (lm2d[i].visibility ?? 1) < thr);
  return { ok: missing.length === 0, missing };
}

/**
 * 한 프레임의 지표.
 *  kneeL/kneeR     무릎 굴곡각(180=완전히 폄). 3D 있으면 3D.
 *  hipL/hipR       엉덩관절각(어깨-엉덩-무릎)
 *  trunkLean       몸통 좌우 기울기(정면, 수직 대비 °)
 *  kasr            무릎 간격 ÷ 발목 간격 (Knee–Ankle Separation Ratio). 0.8 미만이면 무릎 모임(외반) 경향
 *  medialL/medialR 각 다리에서 무릎이 발목보다 몸 중심선 쪽으로 들어간 정도(골반 폭 대비). 0.15 이상이면 안쪽 쏠림
 *  hipY            골반 중심 y (정규화, 점프·착지 감지용)
 *  footWidth       발목 간격 ÷ 골반 폭
 */
export function frameMetrics(lm2d, lm3d = null) {
  const vis = visibilityCheck(lm2d);
  if (!vis.ok) return { ok: false, missing: vis.missing };
  const P = lm3d && lm3d.length === 33 ? lm3d : lm2d;
  const kneeL = angleDeg(P[LM.L_HIP], P[LM.L_KNEE], P[LM.L_ANKLE]);
  const kneeR = angleDeg(P[LM.R_HIP], P[LM.R_KNEE], P[LM.R_ANKLE]);
  const hipL = angleDeg(P[LM.L_SHOULDER], P[LM.L_HIP], P[LM.L_KNEE]);
  const hipR = angleDeg(P[LM.R_SHOULDER], P[LM.R_HIP], P[LM.R_KNEE]);

  const sh = mid(lm2d[LM.L_SHOULDER], lm2d[LM.R_SHOULDER]);
  const hp = mid(lm2d[LM.L_HIP], lm2d[LM.R_HIP]);
  const trunkLean = Math.atan2(Math.abs(sh.x - hp.x), Math.abs(hp.y - sh.y) || 1e-6) * DEG;

  const hipW = dist2(lm2d[LM.L_HIP], lm2d[LM.R_HIP]) || 1e-6;
  const kneeSep = Math.abs(lm2d[LM.L_KNEE].x - lm2d[LM.R_KNEE].x);
  const ankleSep = Math.abs(lm2d[LM.L_ANKLE].x - lm2d[LM.R_ANKLE].x) || 1e-6;
  const kasr = kneeSep / ankleSep;
  const midX = hp.x;
  const medial = (knee, ankle) => (Math.abs(ankle.x - midX) - Math.abs(knee.x - midX)) / hipW;
  return {
    ok: true,
    kneeL, kneeR, kneeMin: Math.min(kneeL, kneeR), kneeAsym: Math.abs(kneeL - kneeR),
    hipL, hipR,
    trunkLean,
    kasr,
    medialL: medial(lm2d[LM.L_KNEE], lm2d[LM.L_ANKLE]),
    medialR: medial(lm2d[LM.R_KNEE], lm2d[LM.R_ANKLE]),
    hipY: hp.y,
    footWidth: ankleSep / hipW,
  };
}

/** 지수이동평균 스무딩 (지표 객체용) */
export function smoothMetrics(prev, cur, alpha = 0.5) {
  if (!prev || !prev.ok || !cur.ok) return cur;
  const o = { ...cur };
  for (const k of ['kneeL', 'kneeR', 'kneeMin', 'kneeAsym', 'hipL', 'hipR', 'trunkLean', 'kasr', 'medialL', 'medialR', 'hipY', 'footWidth']) {
    if (typeof cur[k] === 'number' && typeof prev[k] === 'number') o[k] = prev[k] + alpha * (cur[k] - prev[k]);
  }
  return o;
}
