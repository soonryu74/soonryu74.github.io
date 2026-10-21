/* MoveSafe AI — 운동별 규칙·반복 감지·점수·피드백·루틴 추천 (순수 함수)
 *
 * 임계값 근거(화면·about 에 동일하게 표기):
 *  - 무릎 모임(동적 외반): KASR < 0.80 또는 무릎 안쪽 변위 ≥ 골반 폭의 15% (착지 과제 스크리닝 문헌의 KASR 컷오프 참고)
 *  - 스쿼트 깊이: 무릎 굴곡 100° 이하 = 충분, 100~120 = 부분, 120 초과 = 얕음
 *  - 착지 무릎 굴곡: 착지 후 0.3초 내 최소 무릎각 > 140° = 딱딱한 착지
 *  - 몸통 좌우 기울기 > 10°, 좌우 무릎각 차 > 15° = 비대칭
 * 이 값들은 선별용 출발점이며 진단 기준이 아니다.
 */

export const EXERCISES = {
  squat: { label: '스쿼트', view: '정면', downThr: 140, upThr: 160, cue: '발은 어깨너비, 무릎은 발끝 방향, 가슴 세우기' },
  lunge: { label: '런지', view: '정면', downThr: 135, upThr: 160, cue: '앞무릎이 발끝 방향을 향하게, 골반은 수평' },
  landing: { label: '점프 착지', view: '정면', cue: '소리 없이 부드럽게, 무릎을 굽혀 충격 흡수' },
};

export const THR = { kasr: 0.8, medial: 0.15, depthGood: 100, depthPartial: 120, lean: 10, asym: 15, stiffLanding: 140, softLanding: 120 };

/** 반복(렙) 감지 상태기계: 무릎 최소각 기준 */
export class RepCounter {
  constructor({ downThr = 140, upThr = 160 } = {}) {
    this.downThr = downThr; this.upThr = upThr;
    this.phase = 'up'; this.reps = []; this.cur = null;
  }
  update(m, t) {
    if (!m.ok) return null;
    if (this.phase === 'up' && m.kneeMin < this.downThr) {
      this.phase = 'down';
      this.cur = { tStart: t, bottom: { ...m }, tBottom: t, frames: 1 };
      return null;
    }
    if (this.phase === 'down') {
      this.cur.frames++;
      if (m.kneeMin < this.cur.bottom.kneeMin) { this.cur.bottom = { ...m }; this.cur.tBottom = t; }
      if (m.kneeMin > this.upThr) {
        this.phase = 'up';
        const rep = { ...this.cur, tEnd: t, duration: (t - this.cur.tStart) / 1000 };
        this.reps.push(rep); this.cur = null;
        return rep;
      }
    }
    return null;
  }
}

/** 점프·착지 감지: 골반 y 기준선 대비 상승 후 복귀 */
export class LandingDetector {
  constructor({ jumpThr = 0.04, windowMs = 300 } = {}) {
    this.jumpThr = jumpThr; this.windowMs = windowMs;
    this.baseline = null; this.state = 'ground'; this.landings = []; this.cur = null; this.samples = [];
  }
  update(m, t) {
    if (!m.ok) return null;
    if (this.baseline == null) { this.samples.push(m.hipY); if (this.samples.length >= 10) this.baseline = this.samples.reduce((a, b) => a + b, 0) / this.samples.length; return null; }
    const rise = this.baseline - m.hipY; // 위로 올라가면 +
    if (this.state === 'ground') {
      if (rise > this.jumpThr) this.state = 'air';
      else if (rise < -0.01 && m.kneeMin > 165) this.baseline = this.baseline * 0.9 + m.hipY * 0.1; // 서 있을 때 기준선 보정
    } else if (this.state === 'air') {
      if (rise <= this.jumpThr * 0.5) { this.state = 'landing'; this.cur = { tLand: t, minKnee: m.kneeMin, minKasr: m.kasr, maxLean: m.trunkLean, maxAsym: m.kneeAsym, maxMedial: Math.max(m.medialL, m.medialR) }; }
    } else if (this.state === 'landing') {
      this.cur.minKnee = Math.min(this.cur.minKnee, m.kneeMin);
      this.cur.minKasr = Math.min(this.cur.minKasr, m.kasr);
      this.cur.maxLean = Math.max(this.cur.maxLean, m.trunkLean);
      this.cur.maxAsym = Math.max(this.cur.maxAsym, m.kneeAsym);
      this.cur.maxMedial = Math.max(this.cur.maxMedial, m.medialL, m.medialR);
      if (t - this.cur.tLand >= this.windowMs) {
        this.state = 'ground';
        const l = { ...this.cur }; this.landings.push(l); this.cur = null; return l;
      }
    }
    return null;
  }
}

/** 한 반복(스쿼트·런지) 평가 → {score, flags:[{code,label,cue,severity}], detail} */
export function evaluateRep(rep, exercise = 'squat') {
  const b = rep.bottom; const flags = []; let score = 100;
  const depth = b.kneeMin;
  if (depth > THR.depthPartial) { flags.push(f('shallow', '깊이가 얕음', `무릎 ${depth.toFixed(0)}°. 가능한 범위에서 엉덩이를 더 내리기(통증 없을 때)`, 'warn')); score -= 20; }
  else if (depth > THR.depthGood) { flags.push(f('partial', '부분 깊이', `무릎 ${depth.toFixed(0)}°. 허벅지가 수평에 가깝게`, 'info')); score -= 8; }
  const valgus = b.kasr < THR.kasr || Math.max(b.medialL, b.medialR) >= THR.medial;
  if (valgus) { flags.push(f('valgus', '무릎 안쪽 쏠림', `무릎 간격/발목 간격 ${b.kasr.toFixed(2)} (기준 ${THR.kasr}). 무릎을 발끝(바깥) 방향으로 밀기`, 'high')); score -= 30; }
  if (b.trunkLean > THR.lean) { flags.push(f('lean', '몸통 좌우 기울기', `${b.trunkLean.toFixed(0)}° (기준 ${THR.lean}°). 체중을 양발에 고르게`, 'warn')); score -= 15; }
  if (b.kneeAsym > THR.asym) { flags.push(f('asym', '좌우 비대칭', `좌우 무릎각 차 ${b.kneeAsym.toFixed(0)}° (기준 ${THR.asym}°). 한쪽으로 무게가 쏠림`, 'warn')); score -= 15; }
  if (rep.duration < 0.8) { flags.push(f('fast', '너무 빠름', `${rep.duration.toFixed(1)}초. 내려갈 때 2초 이상 천천히`, 'info')); score -= 5; }
  return { exercise, score: Math.max(0, score), flags, depth, kasr: b.kasr, lean: b.trunkLean, asym: b.kneeAsym, duration: rep.duration };
}

/** 착지 평가 */
export function evaluateLanding(l) {
  const flags = []; let score = 100;
  if (l.minKnee > THR.stiffLanding) { flags.push(f('stiff', '딱딱한 착지', `착지 후 최소 무릎각 ${l.minKnee.toFixed(0)}° (기준 ${THR.stiffLanding}°). 무릎·엉덩이를 굽혀 소리 없이 착지`, 'high')); score -= 30; }
  else if (l.minKnee > THR.softLanding) { flags.push(f('medium', '충격 흡수 보통', `최소 무릎각 ${l.minKnee.toFixed(0)}°. 조금 더 깊게 받기`, 'info')); score -= 10; }
  if (l.minKasr < THR.kasr || l.maxMedial >= THR.medial) { flags.push(f('valgus', '착지 시 무릎 모임', `무릎/발목 간격 ${l.minKasr.toFixed(2)} (기준 ${THR.kasr}). 착지 순간 무릎을 벌려 받기`, 'high')); score -= 30; }
  if (l.maxLean > THR.lean) { flags.push(f('lean', '몸통 기울기', `${l.maxLean.toFixed(0)}°`, 'warn')); score -= 10; }
  if (l.maxAsym > THR.asym) { flags.push(f('asym', '좌우 비대칭 착지', `좌우 무릎각 차 ${l.maxAsym.toFixed(0)}°`, 'warn')); score -= 15; }
  return { exercise: 'landing', score: Math.max(0, score), flags, minKnee: l.minKnee, kasr: l.minKasr, lean: l.maxLean, asym: l.maxAsym };
}

function f(code, label, cue, severity) { return { code, label, cue, severity }; }

/** 세션 요약: 평균 점수, 플래그 빈도, 추천 루틴 키 */
export function summarizeSession(evals) {
  if (!evals.length) return { count: 0, avgScore: null, flagCounts: {}, routines: ['warmup'], topIssues: [] };
  const flagCounts = {};
  for (const e of evals) for (const fl of e.flags) flagCounts[fl.code] = (flagCounts[fl.code] || 0) + 1;
  const avgScore = Math.round(evals.reduce((s, e) => s + e.score, 0) / evals.length);
  const n = evals.length;
  const freq = (c) => (flagCounts[c] || 0) / n;
  const routines = ['warmup'];
  if (freq('valgus') >= 0.3) routines.push('hip');
  if (freq('stiff') + freq('medium') >= 0.3) routines.push('landing');
  if (freq('shallow') + freq('partial') >= 0.5) routines.push('mobility');
  if (freq('lean') >= 0.3) routines.push('core');
  if (freq('asym') >= 0.3) routines.push('unilateral');
  const topIssues = Object.entries(flagCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([code, c]) => ({ code, count: c, ratio: c / n }));
  return { count: n, avgScore, flagCounts, routines, topIssues };
}

export const FLAG_LABELS = { shallow: '깊이 얕음', partial: '부분 깊이', valgus: '무릎 안쪽 쏠림', lean: '몸통 기울기', asym: '좌우 비대칭', fast: '속도 빠름', stiff: '딱딱한 착지', medium: '충격 흡수 보통' };
