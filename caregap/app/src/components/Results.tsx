import { useMemo, useState } from 'react';
import { useStore } from '../state/store';
import { evaluate, traceDomain } from '../engine/evaluate';
import type { DomainResult, Facts, GapStatus } from '../types';
import NeedsInput from './NeedsInput';

export const STATUS_TEXT: Record<GapStatus, string> = {
  check: '확인 필요',
  covered: '돌봄 확인됨',
  no_gap: '현재 입력상 공백 발견 안 됨',
};
export const STATUS_MARK: Record<GapStatus, string> = { check: '!', covered: '✓', no_gap: '–' };

export default function Results() {
  const { input, hasData } = useStore();
  const result = useMemo(() => evaluate(input), [input]);
  if (!hasData) return <NeedsInput />;

  const checks = result.domains.filter((d) => d.status === 'check');
  const covered = result.domains.filter((d) => d.status === 'covered');
  const noGap = result.domains.filter((d) => d.status === 'no_gap');

  return (
    <div className="page narrow">
      <p className="eyebrow">STEP 결과 2 · Care Gap</p>
      <h1 className="result-title" data-testid="result-summary">
        {result.checkCount > 0 ? (
          <>현재 입력을 기준으로<br />확인이 필요한 돌봄 영역 <span className="accent">{result.checkCount}개</span>가 발견되었습니다.</>
        ) : (
          <>현재 입력을 기준으로<br />확인이 필요한 돌봄 영역이 발견되지 않았습니다.</>
        )}
      </h1>
      <p className="lead-sm">
        11개 돌봄 영역을 정해진 규칙으로 점검한 결과입니다. 진단이나 위험 예측이 아니며, 가족이 함께 확인해 볼 지점을 정리한 것입니다.
      </p>

      <div className="status-legend" aria-label="상태 표시 안내">
        {(['check', 'covered', 'no_gap'] as GapStatus[]).map((s) => (
          <span key={s} className={`badge badge-${s}`}><span className="badge-mark" aria-hidden="true">{STATUS_MARK[s]}</span>{STATUS_TEXT[s]}</span>
        ))}
      </div>

      {checks.length > 0 && (
        <section aria-labelledby="sec-check">
          <h2 id="sec-check" className="group-title">확인 필요 <span className="count">{checks.length}</span></h2>
          {checks.map((d) => <GapCard key={d.domain.id} d={d} facts={result.facts} />)}
        </section>
      )}
      {covered.length > 0 && (
        <section aria-labelledby="sec-covered">
          <h2 id="sec-covered" className="group-title">돌봄 확인됨 <span className="count">{covered.length}</span></h2>
          {covered.map((d) => <GapCard key={d.domain.id} d={d} facts={result.facts} />)}
        </section>
      )}
      <section aria-labelledby="sec-nogap">
        <h2 id="sec-nogap" className="group-title">현재 입력상 공백 발견 안 됨 <span className="count">{noGap.length}</span></h2>
        <p className="muted small">입력하지 않은 걱정은 공백으로 만들지 않습니다. 상황이 다르면 입력을 고쳐 다시 확인하세요.</p>
        {noGap.map((d) => <GapCard key={d.domain.id} d={d} facts={result.facts} compact />)}
      </section>

      <div className="step-actions sticky-actions">
        <a className="btn btn-ghost" href="#/map">Care Map 보기</a>
        <a className="btn btn-primary" href="#/share">가족과 공유</a>
      </div>
    </div>
  );
}

function GapCard({ d, facts, compact }: { d: DomainResult; facts: Facts; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const id = `why-${d.domain.id}`;
  return (
    <article className={`gap-card status-${d.status} ${compact ? 'compact' : ''}`} data-testid={`gap-${d.domain.id}`} data-status={d.status}>
      <div className="gap-head">
        <span className="gap-icon" aria-hidden="true">{d.domain.icon}</span>
        <div className="gap-titles">
          <span className={`badge badge-${d.status}`}><span className="badge-mark" aria-hidden="true">{STATUS_MARK[d.status]}</span>{STATUS_TEXT[d.status]}</span>
          <h3>{d.domain.label}</h3>
        </div>
      </div>
      <p className="gap-reason">{d.reason}</p>
      {d.matches.length > 1 && (
        <ul className="gap-more">
          {d.matches.slice(1).map((m) => <li key={m.ruleId}>{m.reason}</li>)}
        </ul>
      )}

      {d.status === 'check' && (
        <div className="gap-check">
          <h4>가족이 확인해 볼 것</h4>
          <ul>{d.domain.checkItems.map((c) => <li key={c}>{c}</li>)}</ul>
        </div>
      )}

      <div className="gap-actions">
        <button type="button" className="btn btn-soft btn-sm" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
          {open ? '설명 닫기' : '왜 이 결과가 나왔나요?'}
        </button>
        {d.status !== 'no_gap' && (
          <a className="btn btn-outline btn-sm" href={`#/services/${d.domain.id}`}>관련 서비스 찾아보기</a>
        )}
      </div>
      {open && <Explain d={d} facts={facts} id={id} />}
    </article>
  );
}

function Explain({ d, facts, id }: { d: DomainResult; facts: Facts; id: string }) {
  const traces = traceDomain(d.domain.id, facts);
  const matched = traces.filter((t) => t.matched && t.rule.result === (d.status === 'covered' ? 'covered' : 'check'));
  return (
    <div className="explain" id={id} data-testid={`explain-${d.domain.id}`}>
      <p className="explain-intro">{d.domain.description}</p>
      {matched.length > 0 ? (
        matched.map((t) => (
          <ol key={t.rule.id} className="flow">
            <li className="flow-step">
              <span className="flow-label">사용자 입력 · 일정 계산</span>
              <ul>
                {t.conditions.filter((c) => c.passed).map((c, i) => (
                  <li key={i}><b>{c.label}</b> = {c.actualText}</li>
                ))}
              </ul>
            </li>
            <li className="flow-arrow" aria-hidden="true">↓</li>
            <li className="flow-step">
              <span className="flow-label">적용 규칙</span>
              <p><code>{t.rule.id}</code> — 아래 조건을 모두 만족하면 “{t.rule.result === 'check' ? '확인 필요' : '돌봄 확인됨'}”</p>
              <ul className="rule-conds">
                {t.conditions.filter((c) => c.passed).map((c, i) => <li key={i}>{c.label} {c.expectedText}</li>)}
              </ul>
            </li>
            <li className="flow-arrow" aria-hidden="true">↓</li>
            <li className="flow-step flow-result">
              <span className="flow-label">결과</span>
              <p><b>{d.domain.label} {t.rule.result === 'check' ? '확인 필요' : '돌봄 확인됨'}</b></p>
            </li>
          </ol>
        ))
      ) : (
        <div className="flow">
          <p>이 영역의 규칙 {traces.length}개 중 조건을 모두 만족한 규칙이 없습니다.</p>
          <ul className="rule-conds">
            {traces.map((t) => {
              const failed = t.conditions.find((c) => !c.passed);
              return (
                <li key={t.rule.id}>
                  <code>{t.rule.id}</code>: {failed ? <>“{failed.label}” 이(가) {failed.actualText} (조건 {failed.expectedText})</> : '조건 미충족'}
                </li>
              );
            })}
          </ul>
        </div>
      )}
      <p className="muted small">규칙은 공개된 파일(care_gap_rules.json)로 정해져 있으며, AI가 임의로 판단하지 않습니다.</p>
    </div>
  );
}
