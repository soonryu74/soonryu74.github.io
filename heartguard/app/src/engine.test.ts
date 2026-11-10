import { describe, expect, it } from 'vitest';
import { DEFAULT_THRESHOLDS, type Thresholds } from './config';
import { run, type Effect, type EngineEvent, type LogEntry } from './engine';
import { scenarioById, type ScenarioId } from './scenarios';

const cfg = DEFAULT_THRESHOLDS;

/** 시나리오를 seconds초 동안 1초 간격 수신 + 0.25초 간격 시간 경과로 흘린다. */
function play(id: ScenarioId, seconds: number, extra: EngineEvent[] = [], c: Thresholds = cfg) {
  const sc = scenarioById(id);
  const events: EngineEvent[] = [{ type: 'start', t: 0 }];
  for (let ms = 0; ms <= seconds * 1000; ms += 250) {
    if (ms % 1000 === 0) {
      const m = sc.at(ms / 1000);
      if (m) events.push({ type: 'sample', t: ms, bpm: m.bpm, contact: m.contact });
    }
    events.push({ type: 'tick', t: ms });
  }
  events.push(...extra);
  events.sort((a, b) => a.t - b.t);
  return run(events, c);
}

const logs = (fx: Effect[]): LogEntry[] =>
  fx.filter((e): e is Extract<Effect, { type: 'log' }> => e.type === 'log').map((e) => e.entry);
const count = (fx: Effect[], type: Effect['type']) => fx.filter((e) => e.type === type).length;
const alerts = (fx: Effect[]) => count(fx, 'confirm_alert');

describe('정상', () => {
  it('정상 심박이면 정상 상태이고 경보·본인 확인이 없다', () => {
    const r = play('normal', 120);
    expect(r.state.status).toBe('normal');
    expect(alerts(r.effects)).toBe(0);
    expect(count(r.effects, 'reserve')).toBe(0);
  });

  it('30~40 사이는 범위 밖으로 표시만 하고 경보는 없다', () => {
    const events: EngineEvent[] = [{ type: 'start', t: 0 }];
    for (let i = 0; i < 60; i++) events.push({ type: 'sample', t: i * 1000, bpm: 35 });
    const r = run(events, cfg);
    expect(r.state.status).toBe('normal');
    expect(r.state.outOfRange).toBe(true);
    expect(alerts(r.effects)).toBe(0);
  });
});

describe('저심박 지속', () => {
  it('30 미만이 10초 이어지면 본인 확인, 30초 무응답이면 경보 1회', () => {
    const r = play('low', 70);
    expect(r.state.status).toBe('alert');
    expect(alerts(r.effects)).toBe(1);
    expect(count(r.effects, 'reserve')).toBe(1);

    const l = logs(r.effects);
    const check = l.find((e) => e.to === 'checking')!;
    const alert = l.find((e) => e.to === 'alert')!;
    expect(check.reason).toBe('LOW_HR_SUSTAINED');
    expect(alert.reason).toBe('NO_RESPONSE');
    expect(alert.cause).toBe('LOW_HR_SUSTAINED');
    expect(alert.t - check.t).toBe(cfg.checkMs);
  });

  it('30 미만이 10초에 못 미치면 본인 확인에 들어가지 않는다', () => {
    const events: EngineEvent[] = [{ type: 'start', t: 0 }];
    for (let i = 0; i < 5; i++) events.push({ type: 'sample', t: i * 1000, bpm: 70 });
    for (let i = 5; i < 13; i++) events.push({ type: 'sample', t: i * 1000, bpm: 25 });
    for (let i = 13; i < 30; i++) events.push({ type: 'sample', t: i * 1000, bpm: 70 });
    const r = run(events, { ...cfg, dropMode: 'off' });
    expect(count(r.effects, 'reserve')).toBe(0);
    expect(r.state.status).toBe('normal');
  });

  it('"괜찮아요"를 누르면 경보가 가지 않고 예약이 취소된다', () => {
    const first = play('low', 25);
    expect(first.state.status).toBe('checking');
    const started = first.state.checkStartedAt!;

    const r = play('low', 70, [{ type: 'ok', t: started + 20_000 }]);
    expect(alerts(r.effects)).toBe(0);
    expect(count(r.effects, 'cancel_reserve')).toBe(1);
    expect(logs(r.effects).some((e) => e.reason === 'USER_OK')).toBe(true);
  });

  it('해제 뒤 2분 동안은 같은 사유로 다시 들어가지 않고, 그 뒤에는 다시 들어간다', () => {
    const first = play('low', 25);
    const started = first.state.checkStartedAt!;
    const ok: EngineEvent = { type: 'ok', t: started + 5_000 };

    const within = play('low', (started + 5_000 + cfg.cooldownMs) / 1000 - 5, [ok]);
    expect(count(within.effects, 'reserve')).toBe(1);

    const after = play('low', (started + 5_000 + cfg.cooldownMs) / 1000 + 5, [ok]);
    expect(count(after.effects, 'reserve')).toBe(2);
  });
});

describe('급락 규칙', () => {
  it('기록만 모드: 급락은 기록에 남고 본인 확인·경보는 없다', () => {
    const r = play('dropRecover', 60);
    expect(logs(r.effects).filter((e) => e.reason === 'SUDDEN_DROP_LOGGED')).toHaveLength(1);
    expect(count(r.effects, 'reserve')).toBe(0);
    expect(alerts(r.effects)).toBe(0);
    expect(r.state.status).toBe('normal');
  });

  it('경보 모드: 급락 후 5초 회복이 없으면 본인 확인으로 간다', () => {
    const r = play('dropRecover', 16, [], { ...cfg, dropMode: 'alert' });
    expect(r.state.status).toBe('checking');
    expect(r.state.checkReason).toBe('SUDDEN_DROP');
  });

  it('급락했다가 5초 안에 회복하면 아무 일도 없다', () => {
    const events: EngineEvent[] = [{ type: 'start', t: 0 }];
    for (let i = 0; i < 8; i++) events.push({ type: 'sample', t: i * 1000, bpm: 80 });
    for (let i = 8; i < 11; i++) events.push({ type: 'sample', t: i * 1000, bpm: 36 });
    for (let i = 11; i < 40; i++) events.push({ type: 'sample', t: i * 1000, bpm: 78 });
    const r = run(events, { ...cfg, dropMode: 'alert' });
    expect(count(r.effects, 'reserve')).toBe(0);
    expect(logs(r.effects).some((e) => e.reason === 'SUDDEN_DROP_LOGGED')).toBe(false);
  });

  it('급락 직후 연결이 끊겨도 본인 확인은 계속되어 경보로 간다', () => {
    const c: Thresholds = { ...cfg, dropMode: 'alert' };
    const before = play('dropRecover', 16, [], c);
    const started = before.state.checkStartedAt!;
    const r = run(
      [
        { type: 'link_lost', t: started + 1_000 },
        { type: 'tick', t: started + 15_000 },
        { type: 'tick', t: started + c.checkMs },
      ],
      c,
      before.state,
    );
    expect(r.state.status).toBe('alert');
    expect(alerts(r.effects)).toBe(1);
  });
});

describe('경보가 아닌 상태', () => {
  it('수신이 10초 이상 멈추면 연결 끊김이고 경보는 없다. 다시 오면 정상', () => {
    const mid = play('disconnect', 25);
    expect(mid.state.status).toBe('disconnected');
    const lost = logs(mid.effects).find((e) => e.reason === 'NO_SIGNAL')!;
    expect(lost.t).toBe(7_000 + cfg.silenceMs);

    const r = play('disconnect', 60);
    expect(r.state.status).toBe('normal');
    expect(alerts(r.effects)).toBe(0);
    expect(count(r.effects, 'reserve')).toBe(0);
  });

  it('연결 해제 신호가 오면 바로 연결 끊김이고 경보는 없다', () => {
    const r = run(
      [
        { type: 'start', t: 0 },
        { type: 'sample', t: 1000, bpm: 70 },
        { type: 'link_lost', t: 2000 },
        { type: 'tick', t: 60_000 },
      ],
      cfg,
    );
    expect(r.state.status).toBe('disconnected');
    expect(alerts(r.effects)).toBe(0);
  });

  it('심박 0이 이어지면 미착용이고 경보는 없다. 다시 오면 정상', () => {
    const mid = play('unworn', 20);
    expect(mid.state.status).toBe('unworn');
    const r = play('unworn', 60);
    expect(r.state.status).toBe('normal');
    expect(alerts(r.effects)).toBe(0);
    expect(count(r.effects, 'reserve')).toBe(0);
  });

  it('접촉 미감지(지원 기기)는 값이 낮아도 미착용이다', () => {
    const events: EngineEvent[] = [{ type: 'start', t: 0 }];
    for (let i = 0; i < 40; i++) events.push({ type: 'sample', t: i * 1000, bpm: 20, contact: false });
    const r = run(events, cfg);
    expect(r.state.status).toBe('unworn');
    expect(count(r.effects, 'reserve')).toBe(0);
  });

  it('값이 드문드문 오면 의심이 아니라 연결 끊김 쪽으로 본다', () => {
    const r = run(
      [
        { type: 'start', t: 0 },
        { type: 'sample', t: 0, bpm: 70 },
        { type: 'sample', t: 1000, bpm: 25 },
        { type: 'tick', t: 11_000 },
        { type: 'sample', t: 12_000, bpm: 25 },
        { type: 'tick', t: 22_000 },
      ],
      cfg,
    );
    expect(count(r.effects, 'reserve')).toBe(0);
    expect(r.state.status).toBe('disconnected');
  });
});

describe('SOS와 해제', () => {
  it('SOS는 본인 확인 없이 바로 경보', () => {
    const r = play('normal', 5, [{ type: 'sos', t: 5_100 }]);
    expect(r.state.status).toBe('alert');
    expect(r.state.alertReason).toBe('MANUAL_SOS');
    expect(count(r.effects, 'reserve')).toBe(0);
    expect(alerts(r.effects)).toBe(1);
  });

  it('연결이 끊긴 상태에서도 SOS는 동작한다', () => {
    const r = run([{ type: 'start', t: 0 }, { type: 'sos', t: 1000 }], cfg);
    expect(r.state.status).toBe('alert');
  });

  it('본인이 해제하면 기록하고 평소 상태로 돌아간다', () => {
    const r = play('normal', 10, [
      { type: 'sos', t: 5_100 },
      { type: 'dismiss', t: 8_100, by: 'self' },
    ]);
    expect(r.state.status).toBe('normal');
    expect(count(r.effects, 'release_alert')).toBe(1);
    expect(logs(r.effects).some((e) => e.reason === 'USER_DISMISS')).toBe(true);
    const alarm = r.effects.filter((e) => e.type === 'alarm');
    expect(alarm[alarm.length - 1]).toEqual({ type: 'alarm', on: false });
  });

  it('본인 확인·경보 중에는 감시 종료가 되지 않는다', () => {
    const r = play('normal', 5, [
      { type: 'sos', t: 5_100 },
      { type: 'stop', t: 5_200 },
    ]);
    expect(r.state.status).toBe('alert');
  });
});

describe('기록', () => {
  it('모든 상태 변화가 이전 상태·새 상태·사유와 함께 남는다', () => {
    const r = play('low', 70);
    const l = logs(r.effects);
    expect(l.map((e) => e.to)).toEqual(['disconnected', 'normal', 'normal', 'checking', 'alert']);
    expect(l[2].reason).toBe('SUDDEN_DROP_LOGGED');
    for (let i = 1; i < l.length; i++) expect(l[i].from).toBe(l[i - 1].to);
  });
});
