import { ttsSupported } from '../engine/speech';
import { useStore, type FontScale } from '../state/store';
import { SpeakButton } from './shared';

const FONTS: { v: FontScale; label: string; desc: string }[] = [
  { v: 'normal', label: '기본 (18px)', desc: '보통 크기' },
  { v: 'large', label: '크게 (22px)', desc: '글자가 작게 보이면' },
  { v: 'xlarge', label: '아주 크게 (26px)', desc: '한 줄에 몇 글자만' },
];

export default function Settings() {
  const { settings, setSettings } = useStore();
  return (
    <div className="page narrow">
      <p className="eyebrow">보기 편하게</p>
      <h1 className="page-title">글자·소리 설정</h1>
      <p className="lead-sm">설정은 이 기기에만 저장되고, 다음에 열어도 그대로 유지돼요.</p>

      <section className="card">
        <h2 className="h3" id="font-title">글자 크기</h2>
        <div className="options" role="radiogroup" aria-labelledby="font-title">
          {FONTS.map((f) => (
            <button key={f.v} type="button" role="radio" aria-checked={settings.fontScale === f.v} className={`choice choice-row ${settings.fontScale === f.v ? 'on' : ''}`} onClick={() => setSettings({ fontScale: f.v })} data-testid={`font-${f.v}`}>
              <span className="radio" aria-hidden="true" /><span><b>{f.label}</b><span className="choice-desc">{f.desc}</span></span>
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <h2 className="h3">고대비</h2>
        <label className="switch">
          <input type="checkbox" checked={settings.highContrast} onChange={(e) => setSettings({ highContrast: e.target.checked })} data-testid="contrast-toggle" />
          <span><b>고대비 모드</b><span className="choice-desc">검은 글자·굵은 테두리·노란 초점 표시</span></span>
        </label>
      </section>

      <section className="card">
        <h2 className="h3" id="rate-title">읽어주기 속도</h2>
        {ttsSupported() ? (
          <>
            <div className="options" role="radiogroup" aria-labelledby="rate-title">
              {[{ v: 0.75, l: '느리게' }, { v: 0.9, l: '보통' }, { v: 1.1, l: '빠르게' }].map((r) => (
                <button key={r.v} type="button" role="radio" aria-checked={settings.ttsRate === r.v} className={`choice choice-row ${settings.ttsRate === r.v ? 'on' : ''}`} onClick={() => setSettings({ ttsRate: r.v })}>
                  <span className="radio" aria-hidden="true" /><b>{r.l}</b>
                </button>
              ))}
            </div>
            <SpeakButton text="안녕하세요. 모두의 복지 AI입니다. 이 속도로 읽어 드릴게요." label="이 속도로 들어보기" />
          </>
        ) : (
          <p className="muted">이 브라우저는 소리 읽기를 지원하지 않아요. 크롬·사파리·엣지 최신 버전에서 됩니다.</p>
        )}
      </section>

      <p><a className="btn btn-ghost" href="#/">← 처음으로</a></p>
    </div>
  );
}
