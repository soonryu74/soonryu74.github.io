import { useMemo, useState } from "react";
import DATA from "../../data/dashboard_data.json";
import { TrendChart, GapChart } from "./components/charts";
import TileMap from "./components/TileMap";
import { KpiCards, RankList, DataTable } from "./components/panels";
import Tooltip from "./components/Tooltip";

const INDICATORS = Object.keys(DATA.indicators);
const SIDO = DATA.sido;

export default function App() {
  const [ind, setInd] = useState(INDICATORS[0]);
  const [region, setRegion] = useState("서울");
  const [yearSel, setYearSel] = useState(null); // null = 지표의 최신 연도
  const [tip, setTip] = useState(null);

  const d = DATA.indicators[ind];
  const years = d.years;
  // 지표 전환 시 선택 연도가 범위 밖이면 최신 연도로
  const year = yearSel != null && years.includes(yearSel) ? yearSel : years[years.length - 1];
  const yearIdx = years.indexOf(year);

  const [theme, setTheme] = useState(() =>
    document.documentElement.getAttribute("data-theme") || null);
  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    setTheme(next);
  };

  const yearRange = useMemo(() => `${years[0]}–${years[years.length - 1]}`, [years]);

  return (
    <div className="viz-root">
      <div className="wrap">
        <header className="top">
          <div>
            <div className="title">지역 건강프로파일 대시보드</div>
            <div className="subtitle">지역사회건강조사 지표 · 시도/시군구 비교 분석 — v2 실데이터</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span className="badge">KOSIS openAPI 실데이터 ({DATA.generated} 수집)</span>
            <button className="themebtn" onClick={toggleTheme}>
              {theme === "dark" ? "☀ 라이트" : "☾ 다크"}
            </button>
          </div>
        </header>

        <div className="controls">
          <div className="ctrl">
            <label htmlFor="selInd">지표 선택</label>
            <select id="selInd" value={ind} onChange={(e) => setInd(e.target.value)}>
              {INDICATORS.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <div className="ctrl">
            <label htmlFor="selRegion">지역 선택</label>
            <select id="selRegion" value={region} onChange={(e) => setRegion(e.target.value)}>
              {SIDO.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="ctrl yearctrl">
            <label htmlFor="selYear">연도</label>
            <div className="yearrow">
              <input id="selYear" type="range" min="0" max={years.length - 1} value={yearIdx}
                onChange={(e) => setYearSel(years[+e.target.value])} />
              <span className="yearval">{year}년</span>
            </div>
          </div>
        </div>

        <KpiCards d={d} indName={ind} region={region} year={year} yearIdx={yearIdx} />

        <div className="grid2">
          <div className="card">
            <h3>{ind} 추이</h3>
            <div className="desc">선택 지역과 전국 중앙값 비교 ({yearRange})</div>
            <div className="legend">
              <span><i className="sw" style={{ background: "var(--series-1)" }} />{region}</span>
              <span><i className="sw" style={{ background: "var(--series-2)" }} />전국 중앙값</span>
            </div>
            <TrendChart d={d} region={region} yearIdx={yearIdx} setTip={setTip} />
          </div>

          <div className="card">
            <h3>시도 분포 지도</h3>
            <div className="desc">{year}년 {ind} — 타일을 누르면 지역이 선택됩니다</div>
            <TileMap d={d} sido={SIDO} region={region} yearIdx={yearIdx}
              onSelect={setRegion} setTip={setTip} indName={ind} />
          </div>

          <div className="card">
            <h3>시도 순위</h3>
            <div className="desc">{year}년 · 양호한 순 ({d.bad ? "낮을수록" : "높을수록"} 양호)</div>
            <RankList d={d} sido={SIDO} region={region} yearIdx={yearIdx} onSelect={setRegion} />
          </div>

          <div className="card">
            <h3>지역 간 격차 추이</h3>
            <div className="desc">연도별 시도 최솟값–최댓값 범위와 전국 중앙값</div>
            <div className="legend">
              <span><i className="sw" style={{ background: "var(--band)", height: 10 }} />시도 범위(최소–최대)</span>
              <span><i className="sw" style={{ background: "var(--series-2)" }} />전국 중앙값</span>
            </div>
            <GapChart d={d} sido={SIDO} setTip={setTip} />
          </div>
        </div>

        <div className="card">
          <details className="tbl">
            <summary>표로 보기 (선택 연도 · 전체 시도)</summary>
            <DataTable d={d} sido={SIDO} year={year} yearIdx={yearIdx} />
          </details>
        </div>

        <footer>
          자료원: 질병관리청 「지역사회건강조사」, 통계청 KOSIS 공유서비스(openAPI) — 수집일 {DATA.generated}.<br />
          전국값은 17개 시도 중앙값 기준. 지표별 수록 시작연도가 다를 수 있습니다(화면의 연도 축 참조).
          구조는 질병관리청 수도권질병대응센터 CIAT를 참조했습니다.
        </footer>
      </div>
      <Tooltip tip={tip} />
    </div>
  );
}
