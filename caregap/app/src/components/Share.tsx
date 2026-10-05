import { useMemo, useRef, useState } from 'react';
import { useStore } from '../state/store';
import { evaluate } from '../engine/evaluate';
import { buildShareCard, shareText, type ShareCard } from '../engine/share';
import NeedsInput from './NeedsInput';

export default function Share() {
  const { input, hasData } = useStore();
  const result = useMemo(() => evaluate(input), [input]);
  const [opt, setOpt] = useState({ includeAgeBand: false, includeRegion: false });
  const [status, setStatus] = useState('');
  const card = useMemo(() => buildShareCard(input, result, opt), [input, result, opt]);
  const text = shareText(card);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  if (!hasData) return <NeedsInput />;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setStatus('복사했습니다. 카카오톡·문자에 붙여넣으세요.');
    } catch {
      setStatus('복사가 차단되었습니다. 아래 글을 길게 눌러 직접 복사해 주세요.');
    }
  };
  const nativeShare = async () => {
    if (!navigator.share) return copy();
    try {
      await navigator.share({ title: card.title, text });
      setStatus('공유 창을 열었습니다.');
    } catch {
      setStatus('공유를 취소했습니다.');
    }
  };
  const saveImage = () => {
    const c = canvasRef.current!;
    drawCard(c, card);
    const a = document.createElement('a');
    a.href = c.toDataURL('image/png');
    a.download = 'caregap-weekly-care-plan.png';
    a.click();
    setStatus('이미지를 저장했습니다.');
  };

  return (
    <div className="page narrow">
      <p className="eyebrow">가족 공유</p>
      <h1 className="page-title">가족과 공유</h1>
      <p className="lead-sm">형제·자매와 이번 주 돌봄계획을 나눠 보세요. 이름·주민번호 등은 처음부터 받지 않으며, 메모 내용도 공유 카드에 넣지 않습니다.</p>

      <fieldset className="field share-opts">
        <legend>포함할 정보 (기본: 제외)</legend>
        <label className="check-inline"><input type="checkbox" checked={opt.includeAgeBand} onChange={(e) => setOpt({ ...opt, includeAgeBand: e.target.checked })} /> 연령대(예: 80대)</label>
        <label className="check-inline"><input type="checkbox" checked={opt.includeRegion} onChange={(e) => setOpt({ ...opt, includeRegion: e.target.checked })} /> 시·군·구</label>
      </fieldset>

      <figure className="share-card" data-testid="share-card" aria-label="공유 카드 미리보기">
        <div className="sc-head">
          <span className="sc-brand">CareGap</span>
          <h2>{card.title}</h2>
          {card.meta.length > 0 && <p className="sc-meta">{card.meta.join(' · ')}</p>}
        </div>
        <ul className="sc-days">
          {card.days.map((d) => (
            <li key={d.day}>
              <b>{d.day}</b>
              <span className={d.items.length ? '' : 'muted'}>{d.items.length ? d.items.join(' · ') : '등록된 돌봄 없음'}</span>
            </li>
          ))}
        </ul>
        <div className="sc-checks">
          <b>확인 필요</b>
          <p>{card.checks.length ? card.checks.join(' · ') : '없음 (현재 입력 기준)'}</p>
        </div>
        <figcaption className="sc-foot">{card.footer}</figcaption>
      </figure>

      <div className="share-actions">
        <button type="button" className="btn btn-primary" onClick={nativeShare}>공유하기</button>
        <button type="button" className="btn btn-outline" onClick={copy}>글로 복사</button>
        <button type="button" className="btn btn-outline" onClick={saveImage}>이미지로 저장</button>
      </div>
      <p className="ok-text" role="status" aria-live="polite">{status}</p>

      <details className="share-text">
        <summary>공유될 글 보기</summary>
        <pre data-testid="share-text">{text}</pre>
      </details>
      <canvas ref={canvasRef} className="sr-only" aria-hidden="true" />
    </div>
  );
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(t).width > maxW && cur) {
      lines.push(cur);
      cur = w;
    } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}

/** 공유용 PNG — 외부 라이브러리 없이 Canvas 2D로 그린다 */
export function drawCard(c: HTMLCanvasElement, card: ShareCard) {
  const W = 1080;
  const P = 72;
  const font = '"Pretendard Variable", Pretendard, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
  const ctx = c.getContext('2d')!;
  ctx.font = `500 34px ${font}`;
  const dayLines = card.days.map((d) => wrap(ctx, d.items.length ? d.items.join(' · ') : '등록된 돌봄 없음', W - P * 2 - 90));
  ctx.font = `600 38px ${font}`;
  const checkLines = wrap(ctx, card.checks.length ? card.checks.join(' · ') : '없음 (현재 입력 기준)', W - P * 2 - 48);
  const H = 300 + dayLines.reduce((a, l) => a + l.length * 48 + 28, 0) + 140 + checkLines.length * 52 + 120;
  c.width = W;
  c.height = H;
  ctx.fillStyle = '#F7F3EC';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#2F5D57';
  ctx.fillRect(0, 0, W, 16);
  ctx.fillStyle = '#6B5E4F';
  ctx.font = `600 28px ${font}`;
  ctx.fillText('CareGap', P, 100);
  ctx.fillStyle = '#1E2B28';
  ctx.font = `800 60px ${font}`;
  ctx.fillText(card.title, P, 180);
  ctx.fillStyle = '#6B5E4F';
  ctx.font = `500 30px ${font}`;
  if (card.meta.length) ctx.fillText(card.meta.join(' · '), P, 230);
  let y = 300;
  card.days.forEach((d, i) => {
    ctx.fillStyle = '#2F5D57';
    ctx.font = `800 36px ${font}`;
    ctx.fillText(d.day, P, y + 36);
    ctx.fillStyle = d.items.length ? '#1E2B28' : '#8A7F72';
    ctx.font = `500 34px ${font}`;
    dayLines[i].forEach((l, j) => ctx.fillText(l, P + 90, y + 36 + j * 48));
    y += dayLines[i].length * 48 + 28;
    ctx.fillStyle = '#E6DED2';
    ctx.fillRect(P, y - 12, W - P * 2, 2);
  });
  y += 30;
  ctx.fillStyle = '#FBEFE3';
  const boxH = 90 + checkLines.length * 52;
  ctx.fillRect(P, y, W - P * 2, boxH);
  ctx.fillStyle = '#9A4A22';
  ctx.font = `800 32px ${font}`;
  ctx.fillText('! 확인 필요', P + 24, y + 52);
  ctx.fillStyle = '#1E2B28';
  ctx.font = `600 38px ${font}`;
  checkLines.forEach((l, j) => ctx.fillText(l, P + 24, y + 104 + j * 52));
  ctx.fillStyle = '#8A7F72';
  ctx.font = `500 26px ${font}`;
  ctx.fillText(card.footer, P, H - 50);
}
