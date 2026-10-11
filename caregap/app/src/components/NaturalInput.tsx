import { useState } from 'react';
import { structureText, remoteAiAvailable, type AiResult } from '../adapters/ai';
import { CONCERNS } from '../engine/defaults';
import { useStore } from '../state/store';
import type { ConcernId } from '../types';

const label = (id: ConcernId) => CONCERNS.find((c) => c.id === id)?.label ?? id;

/** 말로 설명하기 → 후보 추출 → 사용자 확인 후 적용 */
export default function NaturalInput() {
  const { setInput } = useStore();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [result, setResult] = useState<AiResult | null>(null);
  const [picked, setPicked] = useState<Set<ConcernId>>(new Set());
  const [applied, setApplied] = useState(false);
  const [busy, setBusy] = useState(false);

  const analyze = async () => {
    setBusy(true);
    setApplied(false);
    const r = await structureText(text, remoteAiAvailable());
    setResult(r);
    setPicked(new Set(r.items.map((i) => i.id)));
    setBusy(false);
  };

  const apply = () => {
    setInput((prev) => {
      const concerns = { ...prev.concerns };
      picked.forEach((id) => (concerns[id] = true));
      return { ...prev, concerns };
    });
    setApplied(true);
    setResult(null);
  };

  if (!open) {
    return (
      <button type="button" className="btn btn-soft" onClick={() => setOpen(true)}>
        ✍️ 체크 대신 말로 설명하기
      </button>
    );
  }

  return (
    <section className="nl-box" aria-labelledby="nl-title">
      <h2 id="nl-title" className="h3">말로 설명하기</h2>
      <p className="field-help">
        예: “엄마가 최근에 자꾸 넘어지고 밤에 혼자 계셔서 걱정돼요.” — 이름·병명 등은 적지 않으셔도 됩니다.
        {remoteAiAvailable()
          ? ' 설정된 AI 서버로 문장이 전송됩니다.'
          : ' 문장은 외부로 전송되지 않고 이 브라우저 안의 키워드 규칙으로 분석합니다.'}
      </p>
      <label htmlFor="nl-text" className="sr-only">걱정되는 점</label>
      <textarea id="nl-text" rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="걱정되는 점을 편하게 적어 주세요" />
      <button type="button" className="btn btn-primary" disabled={!text.trim() || busy} onClick={analyze}>
        {busy ? '분석 중…' : '내용 정리하기'}
      </button>

      {result && (
        <div className="nl-confirm" role="region" aria-live="polite" aria-label="정리 결과 확인">
          {result.error && <p className="error-text">{result.error}</p>}
          {result.items.length === 0 ? (
            <p>문장에서 체크 항목에 해당하는 내용을 찾지 못했습니다. 위 목록에서 직접 골라 주세요.</p>
          ) : (
            <>
              <p className="nl-head"><b>다음 내용으로 이해했습니다.</b> 맞는 것만 남겨 주세요.</p>
              <ul className="nl-list">
                {result.items.map((i) => (
                  <li key={i.id}>
                    <label className="check-inline">
                      <input
                        type="checkbox"
                        checked={picked.has(i.id)}
                        onChange={(e) => {
                          const n = new Set(picked);
                          if (e.target.checked) n.add(i.id); else n.delete(i.id);
                          setPicked(n);
                        }}
                      />
                      {label(i.id)}
                    </label>
                    <small className="muted">근거: “{i.evidence}”</small>
                  </li>
                ))}
              </ul>
              <p className="muted small">
                분석 방식: {result.engine === 'remote-ai' ? 'AI 엔드포인트' : '키워드 규칙(AI API 미연결)'} · 확인 전에는 반영되지 않습니다.
              </p>
              <div className="row-gap">
                <button type="button" className="btn btn-primary" onClick={apply} disabled={picked.size === 0}>맞아요</button>
                <button type="button" className="btn btn-ghost" onClick={() => setResult(null)}>수정하기</button>
              </div>
            </>
          )}
        </div>
      )}
      {applied && <p className="ok-text" role="status">체크 목록에 반영했습니다. 위 목록에서 다시 확인해 주세요.</p>}
    </section>
  );
}
