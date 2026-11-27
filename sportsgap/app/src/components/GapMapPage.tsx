import { useMemo, useState } from 'react';
import { DATA } from '../data';
import { avgDensity, neededToAverage, scoreRegions, W } from '../engine/score';
import GapMap from './GapMap';

const LEGEND = [
  { lv: 1, label: '매우 부족', range: '60 미만' },
  { lv: 2, label: '부족', range: '60~84' },
  { lv: 3, label: '보통', range: '85~114' },
  { lv: 4, label: '양호', range: '115~149' },
  { lv: 5, label: '충분', range: '150 이상' },
];

export default function GapMapPage({ region }: { region?: string }) {
  const [sim, setSim] = useState<Record<string, number>>({});
  const scores = useMemo(() => scoreRegions(DATA.regions, DATA.facilities, sim), [sim]);
  const base = useMemo(() => scoreRegions(DATA.regions, DATA.facilities), []);
  const avg = useMemo(() => avgDensity(DATA.regions, DATA.facilities), []);
  const sel = scores.find((s) => s.name === region);
  const selBase = base.find((s) => s.name === region);
  const stat = DATA.regions.find((r) => r.name === region);
  const ranked = [...scores].sort((a, b) => a.index - b.index);
  const select = (n: string) => { window.location.hash = `#/map/${encodeURIComponent(n)}`; };
  const add = sim[region ?? ''] ?? 0;

  return (
    <div>
      <h1>시군별 생활체육 접근성 격차 지도</h1>
      <p className="muted">65세 이상 + 등록장애인 1만 명당 공공체육시설 점수를 경기도 평균(=100)과 비교했어요. 숫자가 낮을수록 가까운 운동 공간이 부족한 곳입니다.</p>
      <div className="map-layout">
        <div className="card map-card">
          <GapMap scores={scores} selected={region} onSelect={select} points={region ? DATA.facilities.filter((f) => f.region === region) : undefined} />
          <ul className="legend" aria-label="등급 범례">
            {LEGEND.map((l) => <li key={l.lv}><span className={`sw lv${l.lv}`} aria-hidden="true" />{l.lv}단계 {l.label} <small>({l.range})</small></li>)}
          </ul>
        </div>
        <div className="side">
          {sel && stat && selBase ? (
            <section className="card detail" aria-live="polite">
              <h2>{sel.name} <span className={`badge lv${sel.grade.level}`}>{sel.grade.level}단계 · {sel.grade.label}</span></h2>
              <p className="big">접근성 지수 <b>{sel.index}</b> <small>/ 경기도 평균 100 · 31곳 중 부족한 순 {sel.rank}위</small></p>
              <dl className="kv">
                <dt>65세 이상</dt><dd>{stat.age65.toLocaleString()}명</dd>
                <dt>등록장애인</dt><dd>{stat.disabled.toLocaleString()}명</dd>
                <dt>공공체육시설</dt><dd>{selBase.facilities}곳 (장애인 체육시설 {selBase.barrierFree}곳)</dd>
                <dt>대상 1만 명당 점수</dt><dd>{selBase.density.toFixed(1)}점 (경기도 {avg.toFixed(1)}점)</dd>
              </dl>
              <div className="sim">
                <h3>우선 투자 시뮬레이션</h3>
                <p className="small muted">장애인 체육시설(무장애) + 장애인 강좌 + 어르신 친화 종목을 갖춘 시설 1곳 = {W.base + W.barrierFree + W.senior + W.disabledProg}점</p>
                <label className="sim-row">
                  <span>새 시설</span>
                  <input type="range" min={0} max={20} value={add} onChange={(e) => setSim({ ...sim, [sel.name]: Number(e.target.value) })} aria-label="추가할 시설 수" />
                  <b>{add}곳</b>
                </label>
                <p>지수 {selBase.index} → <b>{sel.index}</b> ({sel.grade.label})</p>
                <p className="small">경기도 평균(100)까지 필요한 시설: <b>{neededToAverage(selBase, avg)}곳</b></p>
              </div>
            </section>
          ) : (
            <section className="card"><h2>시군을 눌러 보세요</h2><p className="muted">지도나 아래 목록에서 시군을 고르면 인구·시설 내역과 투자 시뮬레이션이 나와요.</p></section>
          )}
          <section className="card">
            <h2>부족한 순위</h2>
            <ol className="rank">
              {ranked.map((s) => (
                <li key={s.name}>
                  <button className={s.name === region ? 'on' : ''} onClick={() => select(s.name)}>
                    <span className="r">{s.rank}</span><span className="n">{s.name}</span>
                    <span className="bar" aria-hidden="true"><i className={`lv${s.grade.level}`} style={{ width: `${Math.min(100, s.index / 2)}%` }} /></span>
                    <span className="v">{s.index}</span>
                  </button>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}
