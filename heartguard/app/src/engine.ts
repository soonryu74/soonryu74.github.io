// 상태 판정 엔진. 시계·통신·화면과 분리된 순수 함수다.
// 입력: 시각이 붙은 사건 하나 → 출력: 새 상태 + 해야 할 일 목록.
import type { Thresholds } from './config';

export type Status = 'idle' | 'normal' | 'unworn' | 'disconnected' | 'checking' | 'alert';

export type Reason =
  | 'STARTED'
  | 'STOPPED'
  | 'HR_OK'
  | 'NO_CONTACT'
  | 'HR_ZERO'
  | 'NO_SIGNAL'
  | 'LINK_LOST'
  | 'LOW_HR_SUSTAINED'
  | 'SUDDEN_DROP'
  | 'SUDDEN_DROP_LOGGED'
  | 'NO_RESPONSE'
  | 'MANUAL_SOS'
  | 'USER_OK'
  | 'USER_DISMISS'
  | 'GUARDIAN_DISMISS';

export type EngineEvent =
  | { type: 'start'; t: number }
  | { type: 'stop'; t: number }
  /** contact: true 접촉됨, false 접촉 안 됨, null 기기가 접촉 정보를 보내지 않음 */
  | { type: 'sample'; t: number; bpm: number; contact?: boolean | null }
  | { type: 'link_lost'; t: number }
  | { type: 'tick'; t: number }
  | { type: 'ok'; t: number }
  | { type: 'sos'; t: number }
  | { type: 'dismiss'; t: number; by: 'self' | 'guardian' };

export interface LogEntry {
  t: number;
  from: Status;
  to: Status;
  bpm: number | null;
  reason: Reason;
  /** 무응답 경보일 때, 본인 확인을 시작하게 한 원래 사유 */
  cause?: Reason;
}

export type Effect =
  | { type: 'log'; entry: LogEntry }
  | { type: 'alarm'; on: boolean }
  /** 위치 조회를 미리 시작한다(저장은 경보 확정 때만) */
  | { type: 'locate' }
  /** 서버 예약 경보 등록(5단계에서 연결) */
  | { type: 'reserve'; fireAt: number; cause: Reason }
  | { type: 'cancel_reserve' }
  | { type: 'confirm_alert'; t: number; bpm: number | null; reason: Reason; cause?: Reason }
  | { type: 'release_alert'; t: number; by: 'self' | 'guardian' };

export interface EngineState {
  status: Status;
  since: number;
  /** 마지막으로 받은 값(0 포함) */
  lastBpm: number | null;
  lastSampleAt: number | null;
  /** 마지막으로 받은 0보다 큰 값. 경보에 싣는 "마지막 심박" */
  lastValidBpm: number | null;
  /** 정상 범위(normalMin~normalMax) 밖의 값이 오고 있음(표시용, 경보 아님) */
  outOfRange: boolean;
  lowSince: number | null;
  lowCount: number;
  window: { t: number; bpm: number }[];
  dropSince: number | null;
  dropRef: number | null;
  checkStartedAt: number | null;
  checkReason: Reason | null;
  alertStartedAt: number | null;
  alertReason: Reason | null;
  alertCause: Reason | null;
  /** 사유별 재진입 금지 종료 시각 */
  cooldownUntil: Partial<Record<Reason, number>>;
}

export function initialState(t = 0): EngineState {
  return {
    status: 'idle',
    since: t,
    lastBpm: null,
    lastSampleAt: null,
    lastValidBpm: null,
    outOfRange: false,
    lowSince: null,
    lowCount: 0,
    window: [],
    dropSince: null,
    dropRef: null,
    checkStartedAt: null,
    checkReason: null,
    alertStartedAt: null,
    alertReason: null,
    alertCause: null,
    cooldownUntil: {},
  };
}

export interface StepResult {
  state: EngineState;
  effects: Effect[];
}

export function step(prev: EngineState, ev: EngineEvent, cfg: Thresholds): StepResult {
  const s: EngineState = { ...prev, window: prev.window, cooldownUntil: { ...prev.cooldownUntil } };
  const fx: Effect[] = [];
  const t = ev.t;

  const go = (to: Status, reason: Reason, cause?: Reason) => {
    const entry: LogEntry = { t, from: s.status, to, bpm: s.lastBpm, reason };
    if (cause) entry.cause = cause;
    fx.push({ type: 'log', entry });
    s.status = to;
    s.since = t;
  };
  const resetTrackers = () => {
    s.lowSince = null;
    s.lowCount = 0;
    s.dropSince = null;
    s.dropRef = null;
    s.window = [];
  };
  const inCooldown = (r: Reason) => (s.cooldownUntil[r] ?? 0) > t;
  /** 본인 확인·경보가 끝난 뒤 돌아갈 상태 */
  const restingStatus = (): Status => {
    if (s.lastSampleAt === null || t - s.lastSampleAt >= cfg.silenceMs) return 'disconnected';
    return s.lastBpm === 0 ? 'unworn' : 'normal';
  };
  const enterChecking = (reason: Reason) => {
    go('checking', reason);
    s.checkStartedAt = t;
    s.checkReason = reason;
    fx.push({ type: 'alarm', on: true });
    fx.push({ type: 'locate' });
    fx.push({ type: 'reserve', fireAt: t + cfg.checkMs + 10_000, cause: reason });
  };
  const enterAlert = (reason: Reason, cause?: Reason) => {
    go('alert', reason, cause);
    s.alertStartedAt = t;
    s.alertReason = reason;
    s.alertCause = cause ?? null;
    s.checkStartedAt = null;
    s.checkReason = null;
    fx.push({ type: 'alarm', on: true });
    fx.push({ type: 'locate' });
    const confirm: Effect = { type: 'confirm_alert', t, bpm: s.lastValidBpm, reason };
    if (cause) confirm.cause = cause;
    fx.push(confirm);
  };

  switch (ev.type) {
    case 'start': {
      if (s.status !== 'idle') break;
      resetTrackers();
      s.lastBpm = null;
      s.lastSampleAt = null;
      s.lastValidBpm = null;
      s.outOfRange = false;
      go('disconnected', 'STARTED');
      break;
    }

    case 'stop': {
      // 본인 확인·경보 중에는 종료하지 않는다(먼저 응답·해제해야 한다).
      if (s.status === 'idle' || s.status === 'checking' || s.status === 'alert') break;
      resetTrackers();
      go('idle', 'STOPPED');
      break;
    }

    case 'sample': {
      if (s.status === 'idle') break;
      s.lastBpm = ev.bpm;
      s.lastSampleAt = t;
      if (ev.bpm > 0) s.lastValidBpm = ev.bpm;
      // 본인 확인·경보 중에는 값만 갱신한다. 사람의 응답으로만 끝난다.
      if (s.status === 'checking' || s.status === 'alert') break;

      // 미착용: 접촉 미감지 또는 심박 0. 경보가 아니다.
      if (ev.contact === false || ev.bpm <= 0) {
        resetTrackers();
        s.outOfRange = false;
        if (s.status !== 'unworn') go('unworn', ev.contact === false ? 'NO_CONTACT' : 'HR_ZERO');
        break;
      }

      s.outOfRange = ev.bpm < cfg.normalMin || ev.bpm > cfg.normalMax;

      // 급락 기준이 되는 최근 최고값(이번 값 넣기 전)
      s.window = s.window.filter((p) => t - p.t <= cfg.dropWindowMs);
      const ref = s.window.reduce((m, p) => Math.max(m, p.bpm), 0);
      s.window = [...s.window, { t, bpm: ev.bpm }];

      // 규칙 1: 저심박 지속
      if (ev.bpm < cfg.lowBpm) {
        if (s.lowSince === null) {
          s.lowSince = t;
          s.lowCount = 0;
        }
        s.lowCount += 1;
        if (
          t - s.lowSince >= cfg.lowHoldMs &&
          s.lowCount >= cfg.lowMinSamples &&
          !inCooldown('LOW_HR_SUSTAINED')
        ) {
          if (s.status !== 'normal') go('normal', 'HR_OK');
          enterChecking('LOW_HR_SUSTAINED');
          break;
        }
      } else {
        s.lowSince = null;
        s.lowCount = 0;
      }

      // 규칙 2: 급락 후 회복 없음
      if (cfg.dropMode !== 'off') {
        if (s.dropSince === null) {
          if (ref >= cfg.normalMin && ev.bpm <= ref * cfg.dropRatio) {
            s.dropSince = t;
            s.dropRef = ref;
          }
        } else if (s.dropRef !== null && ev.bpm > s.dropRef * cfg.dropRatio) {
          s.dropSince = null;
          s.dropRef = null;
        }
        if (s.dropSince !== null && t - s.dropSince >= cfg.dropHoldMs && !inCooldown('SUDDEN_DROP')) {
          if (cfg.dropMode === 'alert') {
            if (s.status !== 'normal') go('normal', 'HR_OK');
            s.dropSince = null;
            s.dropRef = null;
            enterChecking('SUDDEN_DROP');
            break;
          }
          // 기록만: 상태는 그대로 두고 기록 한 줄만 남긴다.
          fx.push({
            type: 'log',
            entry: { t, from: s.status, to: s.status, bpm: ev.bpm, reason: 'SUDDEN_DROP_LOGGED' },
          });
          s.cooldownUntil.SUDDEN_DROP = t + cfg.cooldownMs;
          s.dropSince = null;
          s.dropRef = null;
        }
      }

      if (s.status !== 'normal') go('normal', 'HR_OK');
      break;
    }

    case 'link_lost': {
      // 연결 끊김은 경보가 아니다. 단, 이미 시작된 본인 확인·경보는 그대로 진행한다.
      if (s.status === 'normal' || s.status === 'unworn') {
        resetTrackers();
        go('disconnected', 'LINK_LOST');
      }
      break;
    }

    case 'tick': {
      if (s.status === 'checking' && s.checkStartedAt !== null) {
        if (t - s.checkStartedAt >= cfg.checkMs) {
          enterAlert('NO_RESPONSE', s.checkReason ?? undefined);
        }
      } else if (s.status === 'normal' || s.status === 'unworn') {
        if (s.lastSampleAt !== null && t - s.lastSampleAt >= cfg.silenceMs) {
          resetTrackers();
          go('disconnected', 'NO_SIGNAL');
        }
      }
      break;
    }

    case 'ok': {
      if (s.status !== 'checking') break;
      if (s.checkReason) s.cooldownUntil[s.checkReason] = t + cfg.cooldownMs;
      s.checkStartedAt = null;
      s.checkReason = null;
      s.lowSince = null;
      s.lowCount = 0;
      fx.push({ type: 'alarm', on: false });
      fx.push({ type: 'cancel_reserve' });
      go(restingStatus(), 'USER_OK');
      break;
    }

    case 'sos': {
      if (s.status === 'idle' || s.status === 'alert') break;
      if (s.status === 'checking') fx.push({ type: 'cancel_reserve' });
      enterAlert('MANUAL_SOS');
      break;
    }

    case 'dismiss': {
      if (s.status !== 'alert') break;
      const cause = s.alertCause;
      if (cause) s.cooldownUntil[cause] = t + cfg.cooldownMs;
      s.alertStartedAt = null;
      s.alertReason = null;
      s.alertCause = null;
      s.lowSince = null;
      s.lowCount = 0;
      fx.push({ type: 'alarm', on: false });
      fx.push({ type: 'release_alert', t, by: ev.by });
      go(restingStatus(), ev.by === 'self' ? 'USER_DISMISS' : 'GUARDIAN_DISMISS');
      break;
    }
  }

  return { state: s, effects: fx };
}

/** 사건 목록을 차례로 흘려보낸다(테스트·모의 재생용). */
export function run(
  events: EngineEvent[],
  cfg: Thresholds,
  from: EngineState = initialState(),
): { state: EngineState; effects: Effect[] } {
  let state = from;
  const effects: Effect[] = [];
  for (const ev of events) {
    const r = step(state, ev, cfg);
    state = r.state;
    effects.push(...r.effects);
  }
  return { state, effects };
}
