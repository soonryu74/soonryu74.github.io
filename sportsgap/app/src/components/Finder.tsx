import { useMemo, useState } from 'react';
import { DATA, REGION_NAMES } from '../data';
import { EMPTY_NEEDS, matchFacilities, parseNeeds, type Needs } from '../engine/match';

const TYPES = ['체육관', '수영장', '생활체육공원', '걷기길', '파크골프장', '게이트볼장', '다목적구장', '장애인체육관'];
const EXAMPLES = [
  '80세 엄마가 휠체어를 쓰셔요. 비 와도 갈 수 있는 곳',
  '무릎이 안 좋은 70대 아버지가 운동할 곳',
  '발달장애가 있는 아이와 함께 갈 수 있는 체육관',
];

export default function Finder() {
  const [region, setRegion] = useState('수원시');
  const [text, setText] = useState('');
  const [needs, setNeeds] = useState<Needs>(EMPTY_NEEDS);
  const [understood, setUnderstood] = useState<string[]>([]);
  const [here, setHere] = useState<{ lat: number; lng: number }>();
  const [geoMsg, setGeoMsg] = useState('');

  const results = useMemo(
    () => matchFacilities(DATA.facilities.filter((f) => f.region === region), needs, here).slice(0, 8),
    [region, needs, here],
  );

  const read = (t: string) => {
    setText(t);
    const p = parseNeeds(t);
    setNeeds(p.needs);
    setUnderstood(p.understood);
  };
  const toggle = (k: keyof Omit<Needs, 'types'>) => setNeeds({ ...needs, [k]: !needs[k] });
  const toggleType = (t: string) => setNeeds({ ...needs, types: needs.types.includes(t) ? needs.types.filter((x) => x !== t) : [...needs.types, t] });
  const locate = () => {
    if (!navigator.geolocation) return setGeoMsg('이 브라우저는 위치 기능을 지원하지 않아요.');
    setGeoMsg('위치를 확인하는 중…');
    navigator.geolocation.getCurrentPosition(
      (p) => { setHere({ lat: p.coords.latitude, lng: p.coords.longitude }); setGeoMsg('가까운 순으로 정렬했어요. 위치는 이 기기에서만 씁니다.'); },
      () => setGeoMsg('위치를 쓸 수 없어요. 시군만으로 찾아 드릴게요.'),
    );
  };

  return (
    <div>
      <h1>운동할 곳 찾기</h1>
      <p className="muted">상황을 말로 적거나 조건을 눌러 주세요. 어떤 조건으로 알아들었는지 그대로 보여 드려요.</p>
      <div className="finder">
        <section className="card">
          <label className="field">
            <span>사는 곳</span>
            <select value={region} onChange={(e) => setRegion(e.target.value)}>
              {REGION_NAMES.map((n) => <option key={n}>{n}</option>)}
            </select>
          </label>
          <label className="field">
            <span>상황을 말로 적기</span>
            <textarea rows={3} value={text} placeholder={EXAMPLES[0]} onChange={(e) => read(e.target.value)} />
          </label>
          <div className="chips" aria-label="예시 문장">
            {EXAMPLES.map((e) => <button key={e} className="chip ghost" onClick={() => read(e)}>{e}</button>)}
          </div>
          {understood.length > 0 && <p className="understood" role="status">알아들은 조건: <b>{understood.join(' · ')}</b></p>}
          <fieldset>
            <legend>필요한 조건</legend>
            <div className="chips">
              <button className="chip" aria-pressed={needs.wheelchair} onClick={() => toggle('wheelchair')}>♿ 무장애(휠체어)</button>
              <button className="chip" aria-pressed={needs.senior} onClick={() => toggle('senior')}>어르신 프로그램</button>
              <button className="chip" aria-pressed={needs.disabled} onClick={() => toggle('disabled')}>장애인 프로그램</button>
              <button className="chip" aria-pressed={needs.indoor} onClick={() => toggle('indoor')}>실내</button>
            </div>
          </fieldset>
          <fieldset>
            <legend>운동 종류</legend>
            <div className="chips">
              {TYPES.map((t) => <button key={t} className="chip" aria-pressed={needs.types.includes(t)} onClick={() => toggleType(t)}>{t}</button>)}
            </div>
          </fieldset>
          <button className="btn" onClick={locate}>내 위치에서 가까운 순</button>
          {geoMsg && <p className="small muted" role="status">{geoMsg}</p>}
        </section>
        <section aria-label="추천 시설">
          <h2 className="results-h">{region} 추천 {results.length}곳</h2>
          <ol className="results">
            {results.map(({ f, reasons, missing, km }, i) => (
              <li key={f.id} className="card result">
                <div className="result-top">
                  <span className="no">{i + 1}</span>
                  <div>
                    <h3>{f.name}</h3>
                    <p className="small muted">{f.type}{f.indoor ? ' · 실내' : ' · 실외'}{km !== undefined ? ` · 약 ${km.toFixed(1)}km` : ''}</p>
                  </div>
                </div>
                <ul className="tags">
                  {f.barrierFree && <li className="t ok">♿ 무장애</li>}
                  {f.senior && <li className="t">어르신 프로그램</li>}
                  {f.disabledProg && <li className="t">장애인 프로그램</li>}
                </ul>
                {reasons.length > 0 && <p className="small">✓ 맞는 조건: {reasons.join(', ')}</p>}
                {missing.length > 0 && <p className="small warn-text">! 다른 점: {missing.join(', ')}</p>}
                <a className="small" href={`https://map.kakao.com/link/map/${encodeURIComponent(f.name)},${f.lat},${f.lng}`} target="_blank" rel="noreferrer">지도에서 위치 보기</a>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
