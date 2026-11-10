// 판정 엔진을 화면·소리·저장과 잇는 곳.
import { useCallback, useEffect, useRef, useState } from 'react';
import { startAlarm, stopAlarm } from './alarm';
import type { Thresholds } from './config';
import { initialState, step, type Effect, type EngineEvent, type EngineState } from './engine';
import type { HrSource } from './source';
import { loadLog, saveLog, type StoredLog } from './storage';

export type Position =
  | { state: 'none' }
  | { state: 'pending' }
  | { state: 'ok'; lat: number; lon: number; accuracy: number }
  | { state: 'failed' };

type WakeLockLike = { release: () => Promise<void> };

export function useMonitor(cfg: Thresholds) {
  const [engine, setEngine] = useState<EngineState>(() => initialState(Date.now()));
  const [log, setLog] = useState<StoredLog[]>(() => loadLog());
  const [position, setPosition] = useState<Position>({ state: 'none' });
  const [source, setSource] = useState<HrSource | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const engineRef = useRef(engine);
  const cfgRef = useRef(cfg);
  cfgRef.current = cfg;
  const sourceRef = useRef<HrSource | null>(null);
  const logRef = useRef(log);
  const wakeRef = useRef<WakeLockLike | null>(null);

  const locate = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setPosition({ state: 'failed' });
      return;
    }
    setPosition((p) => (p.state === 'ok' ? p : { state: 'pending' }));
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setPosition({
          state: 'ok',
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      () => setPosition((p) => (p.state === 'ok' ? p : { state: 'failed' })),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 30_000 },
    );
  }, []);

  const applyEffects = useCallback(
    (effects: Effect[]) => {
      const added: StoredLog[] = [];
      for (const fx of effects) {
        switch (fx.type) {
          case 'log':
            added.push({ ...fx.entry, mock: sourceRef.current?.kind !== 'bluetooth' });
            break;
          case 'alarm':
            if (fx.on) startAlarm();
            else stopAlarm();
            break;
          case 'locate':
            locate();
            break;
          case 'release_alert':
            setPosition({ state: 'none' });
            break;
          // reserve / cancel_reserve / confirm_alert: 보호자 알림 경로. 5단계(서버 연동)에서 잇는다.
          default:
            break;
        }
      }
      if (added.length) {
        logRef.current = [...logRef.current, ...added];
        saveLog(logRef.current);
        setLog(logRef.current);
      }
    },
    [locate],
  );

  const dispatch = useCallback(
    (ev: EngineEvent) => {
      const r = step(engineRef.current, ev, cfgRef.current);
      engineRef.current = r.state;
      setEngine(r.state);
      applyEffects(r.effects);
    },
    [applyEffects],
  );

  // 시간 경과: 연결 끊김 판정과 본인 확인 카운트다운에 쓴다.
  useEffect(() => {
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (engineRef.current.status !== 'idle') dispatch({ type: 'tick', t });
    }, 250);
    return () => clearInterval(id);
  }, [dispatch]);

  // 감시 중에는 화면이 꺼지지 않게 한다. 탭이 다시 보이면 다시 잡는다.
  const monitoring = engine.status !== 'idle';
  useEffect(() => {
    if (!monitoring) return;
    const acquire = async () => {
      try {
        const wl = (navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<WakeLockLike> } })
          .wakeLock;
        if (wl && document.visibilityState === 'visible') wakeRef.current = await wl.request('screen');
      } catch {
        /* 미지원·거부 시에는 안내 문구로 대신한다 */
      }
    };
    void acquire();
    const onVisible = () => {
      if (document.visibilityState === 'visible') void acquire();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      void wakeRef.current?.release().catch(() => undefined);
      wakeRef.current = null;
    };
  }, [monitoring]);

  const start = useCallback(
    (src: HrSource) => {
      sourceRef.current?.stop();
      sourceRef.current = src;
      setSource(src);
      dispatch({ type: 'start', t: Date.now() });
      src.start({
        onSample: (bpm, contact) => dispatch({ type: 'sample', t: Date.now(), bpm, contact }),
        onLinkLost: () => dispatch({ type: 'link_lost', t: Date.now() }),
      });
    },
    [dispatch],
  );

  const stop = useCallback(() => {
    const s = engineRef.current.status;
    if (s === 'checking' || s === 'alert') return;
    sourceRef.current?.stop();
    sourceRef.current = null;
    setSource(null);
    dispatch({ type: 'stop', t: Date.now() });
  }, [dispatch]);

  const clearLog = useCallback(() => {
    logRef.current = [];
    saveLog([]);
    setLog([]);
  }, []);

  useEffect(
    () => () => {
      sourceRef.current?.stop();
      stopAlarm();
    },
    [],
  );

  return {
    engine,
    log,
    position,
    source,
    now,
    start,
    stop,
    clearLog,
    ok: () => dispatch({ type: 'ok', t: Date.now() }),
    sos: () => dispatch({ type: 'sos', t: Date.now() }),
    dismiss: () => dispatch({ type: 'dismiss', t: Date.now(), by: 'self' }),
  };
}
