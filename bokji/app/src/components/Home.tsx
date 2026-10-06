import { useEffect, useRef, useState } from 'react';
import demo from '../data/demoCases.json';
import { interpretSituation, remoteAiAvailable } from '../adapters/ai';
import { prefillAnswers } from '../engine/facts';
import { startListening, sttSupported, type Listener } from '../engine/speech';
import { go } from '../state/router';
import { useStore } from '../state/store';
import { EMPTY_ANSWERS, type Answers, type Who } from '../types';
import { SafetyNotice } from './shared';

const EXAMPLES = [
  '혼자 사는데 도움이 필요해요',
  '병원 가기 어려워요',
  '돈이 부족해요',
  '장애가 있어 생활이 불편해요',
  '부모님이 받을 수 있는 지원을 찾고 싶어요',
];

export default function Home() {
  const { text, setText, answers, patchAnswers, setAnswers, setInterp, reset } = useStore();
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const listener = useRef<Listener | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const stt = sttSupported();

  useEffect(() => () => listener.current?.stop(), []);

  function toggleMic() {
    if (listening) { listener.current?.stop(); setListening(false); return; }
    setError('');
    const base = text.trim();
    const l = startListening(
      (t) => setText(base ? `${base} ${t}` : t),
      (err) => { setListening(false); if (err && err !== 'aborted') setError('음성을 알아듣지 못했어요. 다시 누르거나 글로 적어 주세요.'); },
    );
    if (!l) { setError('이 브라우저는 음성 입력을 지원하지 않아요. 글로 적어 주세요.'); return; }
    listener.current = l;
    setListening(true);
  }

  async function next() {
    const t = text.trim();
    if (!t && !answers.who) { setError('상황을 한 줄만 적거나, 아래 예시 중 하나를 눌러 주세요.'); taRef.current?.focus(); return; }
    setBusy(true);
    const interp = t ? await interpretSituation(t) : null;
    setInterp(interp);
    setAnswers(prefillAnswers({ ...EMPTY_ANSWERS, who: answers.who }, interp));
    setBusy(false);
    go('start/1');
  }

  function runDemo(d: (typeof demo)[number]) {
    reset();
    setText(d.text);
    interpretSituation(d.text).then((interp) => {
      setInterp(interp);
      setAnswers(d.answers as Answers);
      go('result');
    });
  }

  function pickWho(w: Who) { patchAnswers({ who: w }); }

  return (
    <div className="page narrow">
      <section className="hero">
        <p className="eyebrow">말하면 찾아주고, 순서대로 알려주는 복지 길잡이</p>
        <h1>무엇이 <span className="accent">필요하신가요?</span></h1>
        <p className="lead">상황을 말하거나 적어 주세요. 먼저 확인할 지원 3가지와 <b>오늘 할 일</b>을 쉬운 말로 정리해 드립니다.</p>
      </section>

      <section aria-labelledby="who-title" className="who">
        <h2 id="who-title" className="section-title">누구를 위한 도움인가요?</h2>
        <div className="who-grid" role="radiogroup" aria-labelledby="who-title">
          <button type="button" role="radio" aria-checked={answers.who === 'self'} className={`choice ${answers.who === 'self' ? 'on' : ''}`} onClick={() => pickWho('self')}>
            <span className="choice-icon" aria-hidden="true">🙂</span>
            <b>나를 위한 도움</b>
            <span className="choice-desc">내 상황을 직접 알아봐요</span>
          </button>
          <button type="button" role="radio" aria-checked={answers.who === 'family'} className={`choice ${answers.who === 'family' ? 'on' : ''}`} onClick={() => pickWho('family')}>
            <span className="choice-icon" aria-hidden="true">👨‍👩‍👧</span>
            <b>가족을 위한 도움</b>
            <span className="choice-desc">부모님·자녀 등을 대신 알아봐요(보호자 모드)</span>
          </button>
        </div>
      </section>

      <section aria-labelledby="say-title" className="say">
        <h2 id="say-title" className="section-title">말하거나 입력해 주세요</h2>
        <div className="say-row">
          <button
            type="button"
            className={`mic ${listening ? 'on' : ''}`}
            onClick={toggleMic}
            aria-pressed={listening}
            aria-label={listening ? '말하기 멈춤' : '마이크로 말하기'}
            data-testid="mic-button"
          >
            <span aria-hidden="true">🎤</span>
            <span className="mic-label">{listening ? '듣고 있어요…' : '말하기'}</span>
          </button>
          <div className="say-text">
            <label htmlFor="situation" className="sr-only">상황을 적어 주세요</label>
            <textarea
              id="situation"
              ref={taRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              placeholder="예: 78세 어머니가 혼자 사시고 무릎이 안 좋아 병원 가기 어렵습니다."
              aria-describedby="say-help"
            />
            <p id="say-help" className="small muted">
              {stt ? '마이크를 누르고 말하면 글로 바뀝니다. ' : '이 브라우저는 음성 입력이 안 돼요. 글로 적어 주세요. '}
              나이, 혼자 사는지, 어떤 점이 힘든지를 적으면 더 정확해요. 이름이나 주민번호는 적지 마세요.
            </p>
          </div>
        </div>
        {error && <p className="alert" role="alert">{error}</p>}

        <p className="small muted" style={{ marginTop: 8 }}>이런 말로 시작해도 돼요:</p>
        <div className="chips" role="group" aria-label="예시 문장">
          {EXAMPLES.map((ex) => (
            <button key={ex} type="button" className="chip" onClick={() => { setText(ex); taRef.current?.focus(); }}>{ex}</button>
          ))}
        </div>

        <div className="hero-cta">
          <button type="button" className="btn btn-primary btn-lg btn-block" onClick={next} disabled={busy} data-testid="start-button">
            {busy ? '읽는 중…' : '다음 — 몇 가지만 여쭤볼게요'}
          </button>
        </div>
        <p className="small muted">질문은 최대 7개, 모두 큰 버튼으로 답합니다. 소득·재산 금액은 묻지 않아요.{remoteAiAvailable() ? ' (AI 연결됨)' : ''}</p>
      </section>

      <section aria-labelledby="demo-title" className="demo">
        <h2 id="demo-title" className="section-title">시연 예시 바로 보기</h2>
        <ul className="demo-list">
          {demo.map((d) => (
            <li key={d.id}>
              <button type="button" className="demo-btn" onClick={() => runDemo(d)} data-testid={`demo-${d.id}`}>
                <span className="demo-tag">예시 {d.id}</span>
                <b>{d.title}</b>
                <span className="demo-text">“{d.text}”</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="how-title" className="how">
        <h2 id="how-title" className="section-title">이렇게 도와드려요</h2>
        <ol className="step-list">
          <li><span className="num">1</span><div><b>상황을 이해해요</b><p>말씀하신 내용을 ‘혼자 지내심’, ‘병원 가기 어려움’처럼 정리하고, 맞는지 큰 버튼으로 확인합니다.</p></div></li>
          <li><span className="num">2</span><div><b>먼저 확인할 지원 3가지</b><p>공식 제도 목록(화이트리스트)에서만 고릅니다. 없는 제도를 지어내지 않아요.</p></div></li>
          <li><span className="num">3</span><div><b>오늘 할 일 1·2·3</b><p>어디에 전화할지, 뭐라고 말할지, 무엇을 준비할지까지. 가족에게 보내기도 됩니다.</p></div></li>
        </ol>
        <SafetyNotice />
      </section>
    </div>
  );
}
