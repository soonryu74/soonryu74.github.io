import { useEffect, useMemo, useRef, useState } from 'react';
import { testAlarm, unlock } from './alarm';
import { DEFAULT_THRESHOLDS, DISCLAIMER, type DropMode, type Thresholds } from './config';
import { formatTime, REASON, STATUS, toCsv } from './labels';
import { SCENARIOS, type ScenarioId } from './scenarios';
import { MockSource } from './source';
import { loadConsent, loadSettings, saveConsent, saveSettings, type StoredLog } from './storage';
import { useMonitor, type Position } from './useMonitor';

type View = 'main' | 'log' | 'settings';

const bluetoothSupported = typeof navigator !== 'undefined' && 'bluetooth' in navigator;

export function App() {
  const [consent, setConsent] = useState(loadConsent);
  const [cfg, setCfg] = useState<Thresholds>(loadSettings);
  const [view, setView] = useState<View>('main');
  const [scenario, setScenario] = useState<ScenarioId>('normal');
  const m = useMonitor(cfg);
  const { status } = m.engine;

  const updateCfg = (next: Thresholds) => {
    setCfg(next);
    saveSettings(next);
  };

  const startMock = () => {
    unlock();
    setScenario('normal');
    m.start(new MockSource('normal'));
    setView('main');
  };

  const pickScenario = (id: ScenarioId) => {
    setScenario(id);
    if (m.source instanceof MockSource) m.source.setScenario(id);
  };

  if (!consent) {
    return (
      <Consent
        onAgree={() => {
          unlock();
          saveConsent(true);
          setConsent(true);
        }}
      />
    );
  }

  // 본인 확인과 경보는 어떤 화면에 있든 전체 화면으로 덮는다.
  if (status === 'checking') {
    const left = Math.max(0, cfg.checkMs - (m.now - (m.engine.checkStartedAt ?? m.now)));
    return <Checking secondsLeft={Math.ceil(left / 1000)} mock={m.source?.kind === 'mock'} onOk={m.ok} />;
  }
  if (status === 'alert') {
    return (
      <Alert
        startedAt={m.engine.alertStartedAt ?? m.now}
        reason={REASON[m.engine.alertReason ?? 'NO_RESPONSE']}
        cause={m.engine.alertCause ? REASON[m.engine.alertCause] : null}
        bpm={m.engine.lastValidBpm}
        position={m.position}
        mock={m.source?.kind === 'mock'}
        onDismiss={m.dismiss}
      />
    );
  }

  return (
    <div className="page">
      <header className="top">
        <h1>하트가드</h1>
        <p className="sub">심박 이상 안심 알림 · 시제품</p>
      </header>

      {view === 'main' && status === 'idle' && <Start onMock={startMock} />}
      {view === 'main' && status !== 'idle' && (
        <Main
          m={m}
          cfg={cfg}
          scenario={scenario}
          onScenario={pickScenario}
        />
      )}
      {view === 'log' && <LogView log={m.log} onClear={m.clearLog} />}
      {view === 'settings' && <Settings cfg={cfg} onChange={updateCfg} />}

      <nav className="tabs" aria-label="화면 이동">
        {(
          [
            ['main', '홈'],
            ['log', '기록'],
            ['settings', '설정'],
          ] as [View, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            className={view === id ? 'tab on' : 'tab'}
            aria-current={view === id ? 'page' : undefined}
            onClick={() => setView(id)}
          >
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}

function Consent({ onAgree }: { onAgree: () => void }) {
  const [checked, setChecked] = useState(false);
  return (
    <div className="page">
      <header className="top">
        <h1>하트가드</h1>
        <p className="sub">심박 이상 안심 알림 · 시제품</p>
      </header>
      <section className="card">
        <h2>시작하기 전에</h2>
        <p className="notice">{DISCLAIMER}</p>
        <ul className="plain">
          <li>공모전 시연과 실험을 위한 시제품입니다.</li>
          <li>119에 자동으로 신고하지 않습니다. 필요하면 직접 전화해야 합니다.</li>
          <li>화면이 꺼지거나 다른 앱으로 넘어가면 동작이 멈춥니다.</li>
          <li>지금 단계에서는 기록이 이 기기에만 저장됩니다.</li>
        </ul>
        <label className="check">
          <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
          <span>위 내용을 읽었고 이해했습니다.</span>
        </label>
        <button className="btn primary big" disabled={!checked} onClick={onAgree}>
          동의하고 시작
        </button>
      </section>
    </div>
  );
}

function Start({ onMock }: { onMock: () => void }) {
  return (
    <>
      <section className="card">
        <h2>워치 연결</h2>
        {bluetoothSupported ? (
          <p>워치 연결 기능은 다음 단계에서 추가됩니다. 지금은 모의 모드로 전 과정을 확인할 수 있습니다.</p>
        ) : (
          <p>
            이 브라우저는 워치 연결(웹 블루투스)을 지원하지 않습니다. 안드로이드 크롬이나 PC 크롬·엣지에서 열어
            주세요. 모의 모드는 여기서도 됩니다.
          </p>
        )}
        <button className="btn big" disabled>
          워치 연결 (준비 중)
        </button>
      </section>

      <section className="card">
        <h2>모의 모드</h2>
        <p>워치 없이 정해진 심박 시나리오를 재생합니다. 판정과 경보는 실제와 같은 방식으로 동작합니다.</p>
        <button className="btn primary big" onClick={onMock}>
          모의 모드 시작
        </button>
      </section>

      <section className="card">
        <h2>경보음 확인</h2>
        <p>웹앱은 폰 음량을 바꿀 수 없습니다. 미디어 음량을 올린 뒤 소리가 들리는지 확인해 주세요.</p>
        <button className="btn" onClick={testAlarm}>
          경보음 미리 듣기
        </button>
      </section>
    </>
  );
}

function Main({
  m,
  cfg,
  scenario,
  onScenario,
}: {
  m: ReturnType<typeof useMonitor>;
  cfg: Thresholds;
  scenario: ScenarioId;
  onScenario: (id: ScenarioId) => void;
}) {
  const { engine, now } = m;
  const st = STATUS[engine.status];
  const mock = m.source?.kind === 'mock';
  const showBpm = engine.status === 'normal' && engine.lastBpm !== null;
  const ago = engine.lastSampleAt === null ? null : Math.max(0, Math.round((now - engine.lastSampleAt) / 1000));
  const current = SCENARIOS.find((s) => s.id === scenario);

  return (
    <>
      {mock && <div className="mockbar">[모의] 실제 심박이 아닙니다</div>}

      <section className={`card status s-${engine.status}`} aria-live="polite">
        <div className="badge">
          <span className="icon" aria-hidden="true">
            {st.icon}
          </span>
          <span>{st.label}</span>
        </div>
        <div className="bpm">
          <span className="num">{showBpm ? engine.lastBpm : '--'}</span>
          <span className="unit">회/분</span>
        </div>
        <p className="hint">
          {engine.status === 'normal' && engine.outOfRange
            ? `정상 범위(${cfg.normalMin}~${cfg.normalMax}) 밖의 심박입니다. 기록만 합니다.`
            : st.hint}
        </p>
        <p className="meta">
          {ago === null ? '아직 받은 값이 없습니다.' : `마지막 수신 ${ago}초 전`}
        </p>
      </section>

      <HoldButton holdMs={cfg.sosHoldMs} onFire={m.sos} />

      {mock && (
        <section className="card">
          <h2>모의 시나리오</h2>
          <div className="chips">
            {SCENARIOS.map((s) => (
              <button
                key={s.id}
                className={s.id === scenario ? 'chip on' : 'chip'}
                aria-pressed={s.id === scenario}
                onClick={() => onScenario(s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>
          {current && <p className="meta">{current.expect}</p>}
        </section>
      )}

      <section className="card">
        <p className="meta">감시 중에는 화면을 켜 두어야 합니다. 화면이 꺼지면 동작이 멈춥니다.</p>
        <button className="btn" onClick={m.stop}>
          감시 종료
        </button>
      </section>
    </>
  );
}

/** 길게 눌러야 동작하는 SOS 버튼. 실수로 스친 것은 무시한다. */
function HoldButton({ holdMs, onFire }: { holdMs: number; onFire: () => void }) {
  const [progress, setProgress] = useState(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const fireRef = useRef(onFire);
  fireRef.current = onFire;

  const cancel = () => {
    startRef.current = null;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    setProgress(0);
  };
  const loop = () => {
    if (startRef.current === null) return;
    const p = (performance.now() - startRef.current) / holdMs;
    if (p >= 1) {
      cancel();
      fireRef.current();
      return;
    }
    setProgress(p);
    rafRef.current = requestAnimationFrame(loop);
  };
  const begin = () => {
    if (startRef.current !== null) return;
    startRef.current = performance.now();
    rafRef.current = requestAnimationFrame(loop);
  };
  useEffect(() => cancel, []);

  const sec = Math.round(holdMs / 1000);
  return (
    <button
      className="sos"
      onPointerDown={begin}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onKeyDown={(e) => {
        if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) begin();
      }}
      onKeyUp={cancel}
      onContextMenu={(e) => e.preventDefault()}
    >
      <span className="fill" style={{ width: `${progress * 100}%` }} aria-hidden="true" />
      <span className="label">
        SOS
        <small>{progress > 0 ? '계속 누르고 계세요' : `${sec}초 길게 누르면 바로 경보`}</small>
      </span>
    </button>
  );
}

function Checking({ secondsLeft, mock, onOk }: { secondsLeft: number; mock: boolean; onOk: () => void }) {
  return (
    <button className="full checking" onClick={onOk} autoFocus>
      {mock && <span className="mocktag">[모의]</span>}
      <span className="q">괜찮으신가요?</span>
      <span className="count" aria-live="off">
        {secondsLeft}
      </span>
      <span className="ok">괜찮아요</span>
      <span className="small">화면 아무 곳이나 누르세요. {secondsLeft}초 안에 누르지 않으면 경보로 넘어갑니다.</span>
    </button>
  );
}

function Alert({
  startedAt,
  reason,
  cause,
  bpm,
  position,
  mock,
  onDismiss,
}: {
  startedAt: number;
  reason: string;
  cause: string | null;
  bpm: number | null;
  position: Position;
  mock: boolean;
  onDismiss: () => void;
}) {
  return (
    <div className="full alert" role="alert">
      {mock && <span className="mocktag">[모의]</span>}
      <h1>
        <span aria-hidden="true">! </span>경보
      </h1>
      <p className="pending">
        보호자 알림은 아직 연결되지 않았습니다(다음 단계에서 추가). 지금은 이 폰에서만 경보가 울립니다.
      </p>
      <dl>
        <dt>시각</dt>
        <dd>{formatTime(startedAt)}</dd>
        <dt>사유</dt>
        <dd>{cause ? `${cause} → ${reason}` : reason}</dd>
        <dt>마지막 심박</dt>
        <dd>{bpm === null ? '없음' : `${bpm}회/분`}</dd>
        <dt>위치</dt>
        <dd>
          {position.state === 'ok' && (
            <a
              href={`https://www.google.com/maps?q=${position.lat},${position.lon}`}
              target="_blank"
              rel="noreferrer"
            >
              {position.lat.toFixed(5)}, {position.lon.toFixed(5)} (오차 약 {Math.round(position.accuracy)}m)
            </a>
          )}
          {position.state === 'pending' && '확인 중…'}
          {position.state === 'failed' && '위치 확인 실패'}
          {position.state === 'none' && '없음'}
        </dd>
      </dl>
      <a className="btn call" href="tel:119">
        119 전화하기
      </a>
      <p className="small">자동으로 신고되지 않습니다. 필요하면 위 버튼을 눌러 직접 전화하세요.</p>
      <button className="btn dismiss" onClick={onDismiss}>
        괜찮습니다 · 경보 해제
      </button>
    </div>
  );
}

function LogView({ log, onClear }: { log: StoredLog[]; onClear: () => void }) {
  const rows = useMemo(() => [...log].reverse(), [log]);
  const download = () => {
    const blob = new Blob([toCsv(log)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `heartguard-log-${formatTime(Date.now()).replace(/[: ]/g, '-')}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <section className="card">
      <h2>기록</h2>
      <p className="meta">상태가 바뀔 때만 남깁니다. 이 기기에만 저장됩니다. 총 {log.length}건</p>
      <div className="row">
        <button className="btn" onClick={download} disabled={log.length === 0}>
          CSV 내보내기
        </button>
        <button
          className="btn"
          disabled={log.length === 0}
          onClick={() => {
            if (window.confirm('이 기기의 기록을 모두 지울까요?')) onClear();
          }}
        >
          모두 지우기
        </button>
      </div>
      {rows.length === 0 ? (
        <p>아직 기록이 없습니다.</p>
      ) : (
        <ul className="log">
          {rows.map((e, i) => (
            <li key={`${e.t}-${i}`}>
              <div className="when">
                {formatTime(e.t)}
                {e.mock && <span className="tag">모의</span>}
              </div>
              <div className="what">
                {e.from === e.to ? STATUS[e.to].label : `${STATUS[e.from].label} → ${STATUS[e.to].label}`}
                {e.bpm !== null && <span className="bpmtag">{e.bpm}회/분</span>}
              </div>
              <div className="why">
                {REASON[e.reason]}
                {e.cause && ` (원래 사유: ${REASON[e.cause]})`}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function NumField({
  label,
  value,
  unit,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <span className="input">
        <input
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={value}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (Number.isFinite(v) && v >= min && v <= max) onChange(v);
          }}
        />
        <em>{unit}</em>
      </span>
    </label>
  );
}

function Settings({ cfg, onChange }: { cfg: Thresholds; onChange: (c: Thresholds) => void }) {
  const set = (patch: Partial<Thresholds>) => onChange({ ...cfg, ...patch });
  return (
    <>
      <section className="card">
        <h2>판정 기준</h2>
        <p className="meta">실제 워치로 측정해 본 뒤 고칩니다. 바꾸면 바로 적용됩니다.</p>
        <NumField label="정상 범위 최소" value={cfg.normalMin} unit="회/분" min={30} max={80} onChange={(v) => set({ normalMin: v })} />
        <NumField label="정상 범위 최대" value={cfg.normalMax} unit="회/분" min={100} max={230} onChange={(v) => set({ normalMax: v })} />
        <NumField label="낮은 심박 기준(미만)" value={cfg.lowBpm} unit="회/분" min={10} max={50} onChange={(v) => set({ lowBpm: v })} />
        <NumField label="낮은 심박 지속 시간" value={cfg.lowHoldMs / 1000} unit="초" min={3} max={60} onChange={(v) => set({ lowHoldMs: v * 1000 })} />
        <NumField label="수신 없음 → 연결 끊김" value={cfg.silenceMs / 1000} unit="초" min={5} max={60} onChange={(v) => set({ silenceMs: v * 1000 })} />
        <NumField label="본인 확인 시간" value={cfg.checkMs / 1000} unit="초" min={10} max={120} onChange={(v) => set({ checkMs: v * 1000 })} />
        <NumField label="해제 뒤 재확인 쉬는 시간" value={cfg.cooldownMs / 1000} unit="초" min={0} max={600} onChange={(v) => set({ cooldownMs: v * 1000 })} />
        <label className="field">
          <span>급락 규칙(15초 안에 절반 이하)</span>
          <select value={cfg.dropMode} onChange={(e) => set({ dropMode: e.target.value as DropMode })}>
            <option value="log">기록만 (권장)</option>
            <option value="alert">본인 확인까지</option>
            <option value="off">끔</option>
          </select>
        </label>
        <button className="btn" onClick={() => onChange(DEFAULT_THRESHOLDS)}>
          처음 값으로 되돌리기
        </button>
      </section>

      <section className="card">
        <h2>보호자 관리</h2>
        <p>보호자 초대와 알림은 다음 단계(서버 연동)에서 추가됩니다.</p>
      </section>

      <section className="card">
        <h2>고지</h2>
        <p className="notice">{DISCLAIMER}</p>
        <ul className="plain">
          <li>119에 자동으로 신고하지 않습니다.</li>
          <li>워치가 값을 보내지 않으면 "연결 끊김"이나 "미착용"으로 보며, 이때는 경보가 울리지 않습니다.</li>
          <li>화면이 꺼지거나 다른 앱으로 넘어가면 동작이 멈춥니다.</li>
        </ul>
      </section>
    </>
  );
}
