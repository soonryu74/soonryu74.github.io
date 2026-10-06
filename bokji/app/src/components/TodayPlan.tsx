import { useState } from 'react';
import { buildShareText, buildSmsText, buildSpeechText } from '../engine/share';
import { useStore } from '../state/store';
import { PhoneLink, SafetyNotice, SpeakButton } from './shared';

async function copy(text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}

export default function TodayPlan() {
  const { rec, plan, done, toggleDone } = useStore();
  const [msg, setMsg] = useState('');
  const [preview, setPreview] = useState<'none' | 'long' | 'sms'>('none');
  const longText = buildShareText(rec, plan);
  const smsText = buildSmsText(rec, plan);

  async function doCopy(kind: 'long' | 'sms') {
    const ok = await copy(kind === 'long' ? longText : smsText);
    setPreview(kind);
    setMsg(ok ? '복사했어요. 카카오톡이나 문자에 붙여 넣으세요.' : '자동 복사가 안 되는 브라우저예요. 아래 글을 길게 눌러 복사하세요.');
  }

  if (plan.length === 0) {
    return (
      <div className="page narrow">
        <h1 className="page-title">오늘 할 일</h1>
        <p>아직 확인할 지원이 정해지지 않았어요. <a href="#/start/1">질문에 답하기</a> 또는 <a href="#/">처음으로</a>.</p>
        <p>바로 상담하려면 <PhoneLink phone="129" label="보건복지상담센터" />에 전화하세요.</p>
      </div>
    );
  }

  return (
    <div className="page narrow">
      <p className="eyebrow">오늘 할 일</p>
      <h1 className="page-title">오늘은 이 {plan.length}가지만 하면 돼요</h1>
      <p className="lead-sm">한 번에 하나씩. 끝낸 건 체크해 두세요. (이 체크는 이 기기에만 잠시 남고, 탭을 닫으면 지워집니다)</p>
      <div className="row-gap"><SpeakButton text={buildSpeechText(rec, plan)} label="할 일 읽어주기" /></div>

      <ol className="plan-list" data-testid="plan-list">
        {plan.map((a) => {
          const key = `plan-${a.n}`;
          const checked = done.includes(key);
          return (
            <li key={a.n} className={`plan-item ${checked ? 'done' : ''}`} data-testid={`plan-${a.n}`}>
              <label className="plan-check">
                <input type="checkbox" checked={checked} onChange={() => toggleDone(key)} />
                <span className="num" aria-hidden="true">{a.n}</span>
                <span className="plan-title">{a.title}</span>
              </label>
              <div className="plan-body">
                {a.phone && <PhoneLink phone={a.phone} label={a.phone_label} big />}
                <p className="say-box">{a.detail}</p>
                {a.prepare.length > 0 && (
                  <p className="small"><b>준비:</b> {a.prepare.join(', ')}</p>
                )}
                <p className="small">
                  {a.serviceIds.map((id) => <a key={id} href={`#/service/${id}`} className="tag-link">{id === 'welfare-membership' ? '복지멤버십' : '자세히'}</a>)}
                  {a.url && <a href={a.url} target="_blank" rel="noopener noreferrer" className="tag-link">공식 사이트 ↗</a>}
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      <section className="card share" aria-labelledby="share-title">
        <h2 id="share-title" className="h3">가족에게 보내기</h2>
        <p className="small muted">보내는 글에는 이름·나이·지역 같은 개인정보가 들어가지 않아요. 제도 이름과 전화번호, 오늘 할 일만 담깁니다.</p>
        <div className="row-gap">
          <button type="button" className="btn btn-primary" onClick={() => doCopy('long')} data-testid="copy-long">카카오톡용 복사</button>
          <button type="button" className="btn btn-outline" onClick={() => doCopy('sms')} data-testid="copy-sms">문자용 짧게 복사</button>
          <button type="button" className="btn btn-ghost" onClick={() => window.print()}>인쇄하기</button>
        </div>
        {msg && <p className="hint" role="status">{msg}</p>}
        {preview !== 'none' && (
          <textarea className="share-preview" readOnly rows={preview === 'sms' ? 3 : 12} value={preview === 'sms' ? smsText : longText} aria-label="보낼 글 미리보기" data-testid="share-preview" />
        )}
      </section>

      <SafetyNotice />
      <div className="row-gap">
        <a className="btn btn-ghost" href="#/result">← 결과로</a>
        <a className="btn btn-ghost" href="#/emergency">급할 때 연락처</a>
      </div>
    </div>
  );
}
