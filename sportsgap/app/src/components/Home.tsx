import { useMemo } from 'react';
import { DATA } from '../data';
import { scoreRegions } from '../engine/score';
import GapMap from './GapMap';

export default function Home() {
  const scores = useMemo(() => scoreRegions(DATA.regions, DATA.facilities), []);
  const low = [...scores].sort((a, b) => a.index - b.index).slice(0, 3);
  const target = DATA.regions.reduce((s, r) => s + r.age65 + r.disabled, 0);
  return (
    <div className="home">
      <section className="hero">
        <div>
          <p className="eyebrow">경기도 31개 시군 · 어르신·장애인 생활체육</p>
          <h1>가까운 곳에서, 무리 없이<br />운동할 수 있는 곳을 찾아요</h1>
          <p className="lead">휠체어를 쓰시는지, 무릎이 불편하신지 말로 적으면 조건에 맞는 공공체육시설을 골라 드려요. 행정 담당자는 어느 시군에 시설이 부족한지 지도로 바로 봅니다.</p>
          <div className="cta">
            <a className="btn btn-primary" href="#/find">운동할 곳 찾기</a>
            <a className="btn" href="#/map">시군별 격차 지도 보기</a>
          </div>
        </div>
        <a href="#/map" className="hero-map" aria-label="격차 지도로 이동">
          <GapMap scores={scores} compact />
        </a>
      </section>
      <section className="stats" aria-label="한눈에 보기">
        <div className="stat"><b>{DATA.facilities.length.toLocaleString()}</b><span>공공체육시설</span></div>
        <div className="stat"><b>{DATA.facilities.filter((f) => f.barrierFree).length.toLocaleString()}</b><span>장애인 체육시설</span></div>
        <div className="stat"><b>{Math.round(target / 10000).toLocaleString()}만 명</b><span>65세 이상 + 등록장애인</span></div>
        <div className="stat warn"><b>{low.map((l) => l.name).join(' · ')}</b><span>접근성 지수 하위 3곳</span></div>
      </section>
      <section className="two">
        <a className="card link-card" href="#/find">
          <h2>시민용 · 운동할 곳 찾기</h2>
          <p>“80세 엄마가 휠체어를 쓰셔요, 비 와도 갈 수 있는 곳” 처럼 말로 적으면 무장애·실내·장애인 강좌·어르신 친화 종목 조건을 알아듣고 가까운 순으로 보여 줍니다.</p>
        </a>
        <a className="card link-card" href="#/map">
          <h2>행정용 · 격차 지도</h2>
          <p>대상 인구 1만 명당 시설 점수를 경기도 평균(100)과 비교합니다. 시설을 몇 곳 더 지으면 평균에 닿는지 바로 계산해 봅니다.</p>
        </a>
      </section>
    </div>
  );
}
