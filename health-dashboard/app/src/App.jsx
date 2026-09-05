import { useEffect, useMemo, useState } from "react";
import { DS, INDICATORS, RBY, label } from "./data";
import { IndicatorPicker, RegionPicker, YearControl, ItemToggle } from "./components/Pickers";
import Kpis from "./components/Kpis";
import TrendChart from "./components/TrendChart";
import ChoroplethMap from "./components/ChoroplethMap";
import RankPanel from "./components/RankPanel";
import YearTable from "./components/YearTable";
import GapBoxplot from "./components/GapBoxplot";
import Profile from "./components/Profile";
import Compare, { NAT, MAX_CMP } from "./components/Compare";
import Tooltip from "./components/Tooltip";

const DEFAULT_IND = INDICATORS.find((i) => i.id === "DT_H_SM") || INDICATORS[0];

// URL 해시(#ind=…&sido=…)로 화면 상태를 공유 가능하게
function readHash() {
  const h = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const ind = INDICATORS.find((i) => i.id === h.get("ind"));
  const sgg = h.get("sgg"), sido = h.get("sido");
  return {
    ind: ind || DEFAULT_IND,
    item: h.get("item") === "std" ? "std" : "crude",
    sido: RBY.has(sido) ? sido : (RBY.has(sgg) ? RBY.get(sgg).p : "001"),
    sgg: RBY.has(sgg) ? sgg : null,
    year: h.get("year") ? +h.get("year") : null,
    scope: h.get("scope") === "sido" ? "sido" : "nation",
    view: ["profile", "compare"].includes(h.get("view")) ? h.get("view") : "analysis",
    cmp: (h.get("cmp") || "").split(",").filter((c) => c === NAT || RBY.has(c)).slice(0, MAX_CMP),
  };
}

export default function App() {
  const init = useMemo(readHash, []);
  const [ind, setInd] = useState(init.ind);
  const [item, setItem] = useState(init.item);
  const [sido, setSido] = useState(init.sido);
  const [sgg, setSgg] = useState(init.sgg);
  const [yearSel, setYearSel] = useState(init.year);
  const [scope, setScope] = useState(init.scope);   // 순위·격차·지도 비교 범위: nation | sido
  const [view, setView] = useState(init.view);      // analysis | profile | compare
  const [cmp, setCmp] = useState(init.cmp);         // 비교 대상 코드 목록 (NAT = 전국 중앙값)
  const [playing, setPlaying] = useState(false);
  const [tip, setTip] = useState(null);
  const [theme, setTheme] = useState(() => document.documentElement.getAttribute("data-theme") || null);

  const sel = RBY.get(sgg || sido);
  const years = ind.years;
  const year = yearSel != null && years.includes(yearSel) ? yearSel : years[years.length - 1];

  useEffect(() => {
    const h = new URLSearchParams({ ind: ind.id, item, sido, ...(sgg ? { sgg } : {}), year: String(year), scope, view,
      ...(cmp.length ? { cmp: cmp.join(",") } : {}) });
    window.history.replaceState(null, "", "#" + h.toString());
  }, [ind, item, sido, sgg, year, scope, view, cmp]);

  // 연도 애니메이션
  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => {
      setYearSel((y) => {
        const cur = y != null && years.includes(y) ? y : years[years.length - 1];
        const i = years.indexOf(cur);
        if (i >= years.length - 1) { setPlaying(false); return cur; }
        return years[i + 1];
      });
    }, 800);
    return () => clearInterval(t);
  }, [playing, years]);
  const togglePlay = () => {
    if (!playing && years.indexOf(year) >= years.length - 1) setYearSel(years[0]);
    setPlaying((p) => !p);
  };

  const selectRegion = (code) => {
    const r = RBY.get(code);
    if (!r) return;
    if (r.l === "sido") { setSido(r.c); setSgg(null); }
    else { setSido(r.p); setSgg(r.c); }
  };
  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    setTheme(next);
  };
  const pickFromProfile = (i, y) => { setInd(i); setYearSel(y); setView("analysis"); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const inCmp = cmp.includes(sel.c);
  const addToCompare = () => {
    if (inCmp) { setCmp(cmp.filter((c) => c !== sel.c)); return; }
    if (cmp.length >= MAX_CMP) return;
    // 처음 담을 때는 전국 중앙값을 같이 넣어 비교 기준을 제공
    setCmp(cmp.length ? [...cmp, sel.c] : [NAT, sel.c]);
  };

  const scopeLabel = sel.l === "sido" ? "17개 시도" : scope === "sido" ? `${RBY.get(sel.p).n} 내 시군구` : "전국 시군구";

  return (
    <div className="viz-root">
      <div className="wrap">
        <header className="top">
          <div>
            <div className="title">지역 건강프로파일 대시보드</div>
            <div className="subtitle">지역사회건강조사 {INDICATORS.length}개 지표 · 시도/시군구 · {DS.years[0]}–{DS.years[DS.years.length - 1]}</div>
          </div>
          <div className="topright">
            <div className="seg views">
              <button className={`seg-btn ${view === "analysis" ? "on" : ""}`} onClick={() => setView("analysis")}>지표 분석</button>
              <button className={`seg-btn ${view === "profile" ? "on" : ""}`} onClick={() => setView("profile")}>지역 프로파일</button>
              <button className={`seg-btn ${view === "compare" ? "on" : ""}`} onClick={() => setView("compare")}>
                지역 비교{cmp.length ? <small className="cnt">{cmp.length}</small> : null}
              </button>
            </div>
            <button className="themebtn" onClick={toggleTheme}>{theme === "dark" ? "☀ 라이트" : "☾ 다크"}</button>
          </div>
        </header>

        <div className="controls">
          {view !== "profile" && <IndicatorPicker ind={ind} onChange={(i) => { setInd(i); setPlaying(false); }} />}
          {view !== "compare" && <RegionPicker sido={sido} sgg={sgg} onSido={(c) => { setSido(c); setSgg(null); }} onSgg={setSgg} />}
          {view !== "compare" && (
            <div className="ctrl">
              <label>비교 담기</label>
              <button className={`themebtn ${inCmp ? "on" : ""}`} onClick={addToCompare} disabled={!inCmp && cmp.length >= MAX_CMP}
                title="지역 비교 화면에 이 지역을 추가/제거">
                {inCmp ? "✓ 담김 (빼기)" : "+ 비교에 추가"}
              </button>
            </div>
          )}
          {view !== "compare" && sel.l === "sgg" && (
            <div className="ctrl">
              <label>비교 범위</label>
              <div className="seg">
                <button className={`seg-btn ${scope === "nation" ? "on" : ""}`} onClick={() => setScope("nation")}>전국</button>
                <button className={`seg-btn ${scope === "sido" ? "on" : ""}`} onClick={() => setScope("sido")}>{RBY.get(sel.p).n}</button>
              </div>
            </div>
          )}
          <ItemToggle item={item} onChange={setItem} />
          {view !== "profile" && <YearControl years={years} year={year} onYear={(y) => { setYearSel(y); setPlaying(false); }} playing={playing} onPlay={togglePlay} />}
        </div>

        {view === "compare" ? (
          <Compare ind={ind} item={item} year={year} codes={cmp} onCodes={setCmp} onYear={(y) => setYearSel(y)}
            onPick={(i, y) => { setInd(i); setYearSel(y); window.scrollTo({ top: 0, behavior: "smooth" }); }} setTip={setTip} />
        ) : view === "analysis" ? (
          <>
            <Kpis ind={ind} item={item} year={year} sel={sel} />
            <div className="grid2">
              <div className="card span2 mapcard">
                <div className="cardhead">
                  <div>
                    <h3>{year}년 {ind.name} — 시군구 단계구분도</h3>
                    <div className="desc">7단계 분위({scope === "sido" && sel.l === "sgg" ? RBY.get(sel.p).n : "전국"} 기준) · 지역을 누르면 선택 · ▶ 로 연도 애니메이션</div>
                  </div>
                </div>
                <ChoroplethMap ind={ind} item={item} year={year} sel={sel} scope={sel.l === "sgg" ? scope : "nation"}
                  onSelect={selectRegion} setTip={setTip} />
              </div>

              <div className="card">
                <h3>{ind.name} 추이</h3>
                <div className="desc">{years[0]}–{years[years.length - 1]} · {ind.src}</div>
                <TrendChart ind={ind} item={item} year={year} sel={sel} setTip={setTip} />
              </div>

              <div className="card">
                <h3>순위 — {scopeLabel}</h3>
                <div className="desc">{year}년 · 양호한 순 ({ind.bad == null ? "값 큰 순" : ind.bad ? "낮을수록 양호" : "높을수록 양호"})</div>
                <RankPanel ind={ind} item={item} year={year} sel={sel} scope={scope} onSelect={selectRegion} />
              </div>

              <div className="card">
                <h3>연도별 추이표</h3>
                <div className="desc">수치 · 순위 · 증감량 · 증감률 (행을 누르면 연도 이동)</div>
                <YearTable ind={ind} item={item} sel={sel} year={year} onYear={(y) => setYearSel(y)} />
              </div>

              <div className="card">
                <h3>지역 간 격차 — {scopeLabel}</h3>
                <div className="desc">연도별 분포(상자그림)와 {label(sel)}의 위치</div>
                <GapBoxplot ind={ind} item={item} year={year} sel={sel} scope={scope} setTip={setTip} />
              </div>
            </div>
          </>
        ) : (
          <Profile item={item} sel={sel} scope={scope} onPick={pickFromProfile} />
        )}

        <footer>
          자료원: 질병관리청 「지역사회건강조사」 — 통계청 KOSIS 공유서비스(openAPI), 수집일 {DS.generated}.
          지도 경계: 통계청 2018 행정구역(행정구역 변경분은 최신 코드로 연결).<br />
          전국 기준값은 전 시군구 중앙값. 표준화율은 연령 표준화 값으로 지역 간 비교에 적합합니다.
          구조는 질병관리청 수도권질병대응센터 CIAT를 참조했습니다.
        </footer>
      </div>
      <Tooltip tip={tip} />
    </div>
  );
}
