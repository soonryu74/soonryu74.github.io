import { useEffect, useMemo, useRef, useState } from "react";
import { DS, INDICATORS, RBY, SIDOS, label, DEFAULT_RANK_OPT, KDH_SOURCE, TIER_INFO } from "./data";
import { IndicatorPicker, RegionPicker, YearControl, ItemToggle } from "./components/Pickers";
import Kpis from "./components/Kpis";
import TrendChart from "./components/TrendChart";
import ChoroplethMap from "./components/ChoroplethMap";
import RankPanel from "./components/RankPanel";
import YearTable from "./components/YearTable";
import GapBoxplot from "./components/GapBoxplot";
import EquityPanel from "./components/EquityPanel";
import Profile from "./components/Profile";
import Compare, { NAT, MAX_CMP } from "./components/Compare";
import EvidencePanel from "./components/EvidencePanel";
import Tooltip from "./components/Tooltip";
import UnitsView from "./components/UnitsView";
import CONTACT from "../../data/contact.json";
import NcdView from "./components/NcdView";
import CorrelationView from "./components/CorrelationView";
import HotspotView from "./components/HotspotView";
import ChronicleView from "./components/ChronicleView";
import KpiView from "./components/KpiView";
import SourcesView from "./components/SourcesView";
import FeedbackView from "./components/FeedbackView";
import ExportButtons from "./components/ExportButtons";

const DEFAULT_IND = INDICATORS.find((i) => i.id === "DT_H_SM") || INDICATORS[0];

// URL 해시(#ind=…&sido=…)로 화면 상태를 공유 가능하게
function readHash() {
  const h = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const ind = INDICATORS.find((i) => i.id === h.get("ind"));
  const sgg = h.get("sgg"), sido = h.get("sido");
  const sgg0 = RBY.get(sgg)?.l === "sub" ? RBY.get(sgg).p : sgg;   // 세부 단위 코드는 소속 시군구로
  return {
    ind: ind || DEFAULT_IND,
    item: h.get("item") === "crude" ? "crude" : "std",   // 방법론 v1: 표준화율 기본
    // 세부 단위(보건소) 코드는 시군구 선택으로 쓰지 않는다 — 부모 시군구로 올림
    sido: RBY.get(sido)?.l === "sido" ? sido : (RBY.get(sgg0)?.l === "sgg" ? RBY.get(sgg0).p : "001"),
    sgg: RBY.get(sgg0)?.l === "sgg" ? sgg0 : null,
    year: h.get("year") ? +h.get("year") : null,
    scope: h.get("scope") === "sido" ? "sido" : "nation",
    view: ["profile", "compare", "units", "ncd", "corr", "hot", "chronicle", "kpi", "sources", "feedback"].includes(h.get("view")) ? h.get("view") : "analysis",
    ncdInd: h.get("nind") || null,
    cmp: (h.get("cmp") || "").split(",").filter((c) => c === NAT || RBY.has(c)).slice(0, MAX_CMP),
    rankOpt: {
      weights: h.get("w") === "panel" ? "panel" : h.get("w") === "custom" && h.get("cw")
        ? Object.fromEntries(h.get("cw").split(",").map((v, i) => [DS.domains[i], Math.max(0, Math.min(30, +v || 0))]))
        : "equal",
      smooth: h.get("sm") === "1" ? 1 : 3,
      league: h.get("lg") === "nation" ? "nation" : "league",
      exclude: h.get("ex") !== "0",
    },
  };
}

export default function App() {
  const init = useMemo(readHash, []);
  const [ind, setInd] = useState(init.ind);
  const [item, setItem] = useState(init.item);
  const [sido, setSido] = useState(init.sido);
  const [sgg, setSgg] = useState(init.sgg);
  const [yearSel, setYearSel] = useState(init.year);
  const [scope, setScope] = useState(init.scope);   // 순위·격차 비교 범위: nation | sido
  // 지도 범위(CIAT 단계구분도와 동일): sidoAll = 전국 시도 · nation = 전국 시군구 · sido = 시도 내 시군구
  const [mapMode, setMapMode] = useState("auto");
  const [mapLabels, setMapLabels] = useState(true);
  const [view, setView] = useState(init.view);      // analysis | profile | compare
  // 「의견·문의」에 자동으로 붙일 「보고 있던 화면」 주소 — 문의 탭이 아닌 마지막 화면의 해시를 기억
  const [feedbackFrom, setFeedbackFrom] = useState(() => window.location.href);
  useEffect(() => { if (view !== "feedback") setFeedbackFrom(window.location.href); }, [view, window.location.hash]);
  const [cmp, setCmp] = useState(init.cmp);         // 비교 대상 코드 목록 (NAT = 전국 중앙값)
  const [rankOpt, setRankOpt] = useState(init.rankOpt); // 순위 산출 방식 (방법론 v1)
  const [ncdInd, setNcdInd] = useState(init.ncdInd);     // 지식베이스 지표 필터
  const [playing, setPlaying] = useState(false);
  const bodyRef = useRef(null);   // 재생을 누르면 본문(그래프)이 화면에 들어오도록 스크롤
  const [tip, setTip] = useState(null);
  const [theme, setTheme] = useState(() => document.documentElement.getAttribute("data-theme") || null);

  const sel = RBY.get(sgg || sido);
  const years = ind.years;
  const year = yearSel != null && years.includes(yearSel) ? yearSel : years[years.length - 1];

  useEffect(() => {
    const h = new URLSearchParams({ ind: ind.id, item, sido, ...(sgg ? { sgg } : {}), year: String(year), scope, view,
      ...(cmp.length ? { cmp: cmp.join(",") } : {}),
      w: typeof rankOpt.weights === "object" ? "custom" : rankOpt.weights, sm: String(rankOpt.smooth), lg: rankOpt.league, ex: rankOpt.exclude ? "1" : "0",
      ...(typeof rankOpt.weights === "object" ? { cw: DS.domains.map((d) => rankOpt.weights[d] ?? 0).join(",") } : {}),
      ...(ncdInd ? { nind: ncdInd } : {}) });
    window.history.replaceState(null, "", "#" + h.toString());
  }, [ind, item, sido, sgg, year, scope, view, cmp, rankOpt, ncdInd]);

  // 주소창 해시가 바뀌면(링크 붙여넣기·뒤로가기) 화면 상태를 다시 읽는다
  useEffect(() => {
    const onHash = () => {
      const h = readHash();
      setInd(h.ind); setItem(h.item); setSido(h.sido); setSgg(h.sgg);
      setYearSel(h.year); setScope(h.scope); setView(h.view); setCmp(h.cmp);
      setRankOpt(h.rankOpt); setNcdInd(h.ncdInd); setPlaying(false);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

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
    if (!playing) {
      if (years.indexOf(year) >= years.length - 1) setYearSel(years[0]);
      // 모바일에선 선택 영역이 한 화면을 채워 그래프가 화면 밖에 있다 → 본문 첫 카드로 이동
      const el = bodyRef.current;
      if (el) {
        const top = el.getBoundingClientRect().top + window.scrollY - 6;
        if (window.scrollY < top - 4) window.scrollTo({ top, behavior: "smooth" });
      }
    }
    setPlaying((p) => !p);
  };

  const selectRegion = (code) => {
    const r = RBY.get(code);
    if (!r) return;
    if (r.l === "sido") { setSido(r.c); setSgg(null); }
    else if (r.l === "sub") { const p = RBY.get(r.p); if (p) { setSido(p.p); setSgg(p.c); } }   // 보건소 세부 단위 → 소속 시군구
    else { setSido(r.p); setSgg(r.c); }
  };
  const [fs, setFs] = useState(() => { try { return Number(localStorage.getItem("hd-fs") || 0); } catch { return 0; } });
  const bumpFs = (d) => setFs((v) => { const n = Math.max(-1, Math.min(2, v + d)); try { localStorage.setItem("hd-fs", String(n)); } catch {} return n; });
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
  // 지도 범위: 「자동」이면 시도를 고르면 그 시도 내 시군구, 시군구를 고르면 비교 범위를 따른다
  const mapSidoCode = sel.l === "sido" ? sel.c : sel.p;
  const mapScope = mapMode !== "auto" ? mapMode : sel.l === "sido" ? "sido" : scope === "sido" ? "sido" : "nation";
  const mapScopeName = mapScope === "sidoAll" ? "전국 시도" : mapScope === "sido" ? `${RBY.get(mapSidoCode)?.n || ""} 시군구` : "전국 시군구";

  return (
    <div className={`viz-root fs-${fs}${playing ? " playing" : ""}`}>
      <div className="wrap">
        <header className="top">
          <div>
            <button type="button" className="title title-home" title="처음 화면(지표 분석)으로"
              onClick={() => { setView("analysis"); window.scrollTo({ top: 0, behavior: "smooth" }); }}>지역 건강프로파일 대시보드</button>
            <div className="subtitle">지역사회건강조사 {INDICATORS.filter((i) => !i.outcome).length}개 지표 · 건강수명 · 결과·환경 DB {INDICATORS.filter((i) => i.kdh).length}개 지표 · 시도/시군구 · {DS.years[0]}–{DS.years[DS.years.length - 1]}
              <span className="sub-note">건강수준 모니터링과 목표치 설정 지원 도구입니다. 보건소 사업 실적(투입·산출) 자료를 담고 있지 않아 사업 성과 평가 도구가 아닙니다.</span></div>
          </div>
          <div className="topright">
            <div className="seg views">
              <button className={`seg-btn ${view === "analysis" ? "on" : ""}`} onClick={() => setView("analysis")}>지표 분석</button>
              <button className={`seg-btn ${view === "profile" ? "on" : ""}`} onClick={() => setView("profile")}>지역 프로파일</button>
              <button className={`seg-btn ${view === "kpi" ? "on" : ""}`} onClick={() => setView("kpi")}>성과지표</button>
              <button className={`seg-btn ${view === "compare" ? "on" : ""}`} onClick={() => setView("compare")}>
                지역 비교{cmp.length ? <small className="cnt">{cmp.length}</small> : null}
              </button>
              <button className={`seg-btn ${view === "ncd" ? "on" : ""}`} onClick={() => setView("ncd")}>예방·관리</button>
              <button className={`seg-btn ${view === "corr" ? "on" : ""}`} onClick={() => setView("corr")}>연관지표</button>
              <button className={`seg-btn ${view === "hot" ? "on" : ""}`} onClick={() => setView("hot")}>핫스팟</button>
              <button className={`seg-btn ${view === "chronicle" ? "on" : ""}`} onClick={() => setView("chronicle")}>연대기 전시관</button>
              <button className={`seg-btn ${view === "units" ? "on" : ""}`} onClick={() => setView("units")}>조사 단위</button>
              <button className={`seg-btn ${view === "sources" ? "on" : ""}`} onClick={() => setView("sources")}>자료원</button>
              <button className={`seg-btn fb-tab ${view === "feedback" ? "on" : ""}`} onClick={() => setView("feedback")} title="수정 의견·오류 신고·자료 문의">의견·문의</button>
            </div>
            <button className="themebtn" onClick={() => bumpFs(-1)} disabled={fs <= -1} title="글자 작게">A−</button>
            <button className="themebtn" onClick={() => bumpFs(1)} disabled={fs >= 2} title="글자 크게">A+</button>
            <button className="themebtn" onClick={toggleTheme}>{theme === "dark" ? "☀ 라이트" : "☾ 다크"}</button>
          </div>
        </header>

        {playing && (
          <div className="playbar" role="status" aria-live="polite">
            <button className="pb-stop" onClick={() => setPlaying(false)} aria-label="정지">■</button>
            <b className="pb-year">{year}년</b>
            <span className="pb-track"><span className="pb-fill" style={{ width: `${(((years.indexOf(year) + 1) / years.length) * 100).toFixed(0)}%` }} /></span>
            <span className="pb-ind">{ind.name}</span>
          </div>
        )}

        {!["units", "ncd", "corr", "hot", "chronicle", "sources", "feedback"].includes(view) && <div className="controls">
          {view !== "profile" && view !== "kpi" && <IndicatorPicker ind={ind} onChange={(i) => { setInd(i); setPlaying(false); }} />}
          {view !== "compare" && <RegionPicker sido={sido} sgg={sgg} onSido={(c) => { setSido(c); setSgg(null); }} onSgg={setSgg} />}
          {view !== "compare" && view !== "kpi" && (
            <div className="ctrl">
              <label>비교 담기</label>
              <button className={`themebtn ${inCmp ? "on" : ""}`} onClick={addToCompare} disabled={!inCmp && cmp.length >= MAX_CMP}
                title="지역 비교 화면에 이 지역을 추가/제거">
                {inCmp ? "✓ 담김 (빼기)" : "+ 비교에 추가"}
              </button>
            </div>
          )}
          {view !== "compare" && view !== "kpi" && sel.l === "sgg" && (
            <div className="ctrl">
              <label>비교 범위</label>
              <div className="seg">
                <button className={`seg-btn ${scope === "nation" ? "on" : ""}`} onClick={() => setScope("nation")}>전국</button>
                <button className={`seg-btn ${scope === "sido" ? "on" : ""}`} onClick={() => setScope("sido")}>{RBY.get(sel.p).n}</button>
              </div>
            </div>
          )}
          <ItemToggle item={item} onChange={setItem} ind={ind} />
          {view !== "profile" && view !== "kpi" && <YearControl years={years} year={year} onYear={(y) => { setYearSel(y); setPlaying(false); }} playing={playing} onPlay={togglePlay} />}
        </div>}

        <div ref={bodyRef} className="body-anchor" />

        {view === "feedback" ? (
          <FeedbackView currentUrl={feedbackFrom} />
        ) : view === "sources" ? (
          <SourcesView />
        ) : view === "units" ? (
          <UnitsView setTip={setTip} />
        ) : view === "corr" ? (
          <CorrelationView setTip={setTip} />
        ) : view === "kpi" ? (
          <KpiView item={item} sel={sel} onPick={(i, y) => { setInd(i); if (y) setYearSel(y); setView("analysis"); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
        ) : view === "chronicle" ? (
          <ChronicleView setTip={setTip} onPick={(i, y) => { setInd(i); if (y) setYearSel(y); setView("analysis"); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
        ) : view === "hot" ? (
          <HotspotView setTip={setTip} onPick={(i, code, y) => { const r = RBY.get(code); if (!r) return; setInd(i); if (r.l === "sgg") { setSido(r.p); setSgg(code); } else { setSido(code); setSgg(null); } if (y) setYearSel(y); setView("analysis"); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
        ) : view === "ncd" ? (
          <NcdView filterInd={ncdInd} onClearInd={() => setNcdInd(null)} sidoFull={RBY.get(sido)?.n}
            onPickInd={(i) => { if (i) { setInd(i); setView("analysis"); window.scrollTo({ top: 0, behavior: "smooth" }); } }} />
        ) : view === "compare" ? (
          <Compare ind={ind} item={item} year={year} codes={cmp} onCodes={setCmp} onYear={(y) => setYearSel(y)} sel={sel}
            onPick={(i, y) => { setInd(i); setYearSel(y); window.scrollTo({ top: 0, behavior: "smooth" }); }} setTip={setTip} />
        ) : view === "analysis" ? (
          <>
            <Kpis ind={ind} item={item} year={year} sel={sel} />
            <div className="grid2">
              <div className="card span2 mapcard">
                <div className="cardhead">
                  <div>
                    <h3>{year}년 {ind.name} — {mapScopeName} 단계구분도</h3>
                    <ExportButtons name={`${year}_${ind.name}_지도_${mapScopeName}`} />
                    <div className="desc">7단계 분위({mapScopeName} 기준) · 지역을 누르면 선택 · ▶ 로 연도 애니메이션</div>
                  </div>
                </div>
                <div className="seg map-seg">
                  {[["sidoAll", "전국 시도"], ["nation", "전국 시군구"], ["sido", "시도 내 시군구"]].map(([k, nm]) => (
                    <button key={k} className={`seg-btn ${mapScope === k ? "on" : ""}`} onClick={() => setMapMode(k)}>{nm}</button>
                  ))}
                  {mapScope === "sido" && (
                    <select className="map-sido" value={mapSidoCode} onChange={(e) => selectRegion(e.target.value)}
                      title="지도에 표시할 시도">
                      {SIDOS.map((s) => <option key={s.c} value={s.c}>{s.n}</option>)}
                    </select>
                  )}
                  <button className={`seg-btn ${mapLabels ? "on" : ""}`} style={{ marginLeft: "auto" }}
                    onClick={() => setMapLabels(!mapLabels)}
                    title={mapLabels ? "지도 위 지역명을 숨깁니다" : "지도 위에 지역명을 표시합니다"}>
                    🏷 지역명{mapLabels ? "" : " 꺼짐"}</button>
                </div>
                <ChoroplethMap ind={ind} item={item} year={year} sel={sel} scope={mapScope}
                  showLabels={mapLabels} onSelect={selectRegion} setTip={setTip} />
              </div>

              <div className="card">
                <h3>{ind.name} 추이</h3>
                <ExportButtons name={`${ind.name}_추이_${label(sel)}`} />
                <div className="desc">{years[0]}–{years[years.length - 1]} · {ind.src}</div>
                {ind.note && <div className="desc indnote">⚠ {ind.note}</div>}
                {ind.tier && TIER_INFO[ind.tier] && (
                  <div className="desc tierline">
                    <span className={`tbadge ${TIER_INFO[ind.tier].color}`}>{ind.tier}</span>
                    <b>권장 측정 주기 {TIER_INFO[ind.tier].cycle}</b> · 순위 비교 {TIER_INFO[ind.tier].rankable === true ? "가능" : TIER_INFO[ind.tier].rankable === false ? "부적합" : TIER_INFO[ind.tier].rankable} · {TIER_INFO[ind.tier].desc}
                    {" "}<span className="muted">(WHO/IHP+ 결과사슬 기준 · docs/지역보건사업_평가이론_v1.md)</span>
                  </div>
                )}
                {ind.dirNote && <div className="desc dirnote"><b>{ind.bad === true ? "높을수록 나쁨" : ind.bad === false ? "높을수록 좋음" : "방향 없음(맥락 지표)"}</b> — {ind.dirNote}{ind.dirRefs?.length ? <> · 근거: {ind.dirRefs.map((r, i) => <a key={i} className="src" style={{ whiteSpace: "normal" }} href={r.url} target="_blank" rel="noreferrer">{r.name}</a>).reduce((a, b) => [a, ", ", b])}</> : null}</div>}
                <TrendChart ind={ind} item={item} year={year} sel={sel} setTip={setTip} />
              </div>

              <div className="card">
                <h3>순위</h3>
                <ExportButtons name={`${year}_${ind.name}_순위_${scopeLabel}`} kinds={["list"]} />
                <div className="desc">{year}년 · 양호한 순 ({ind.bad == null ? "값 큰 순" : ind.bad ? "낮을수록 양호" : "높을수록 양호"})</div>
                <RankPanel ind={ind} item={item} year={year} sel={sel} scope={scope} onSelect={selectRegion} onYear={(y) => { setYearSel(y); setPlaying(false); }} />
              </div>

              <div className="card">
                <h3>연도별 추이표</h3>
                <ExportButtons name={`${ind.name}_연도별_${label(sel)}`} kinds={["csv"]} />
                <div className="desc">수치 · 순위 · 증감량 · 증감률 (행을 누르면 연도 이동)</div>
                <YearTable ind={ind} item={item} sel={sel} year={year} onYear={(y) => setYearSel(y)} />
              </div>

              <div className="card">
                <h3>지역 간 격차 — {scopeLabel}</h3>
                <ExportButtons name={`${ind.name}_격차_${scopeLabel}`} />
                <div className="desc">연도별 분포(상자그림)와 {label(sel)}의 위치</div>
                <GapBoxplot ind={ind} item={item} year={year} sel={sel} scope={scope} setTip={setTip} />
              </div>

              <div className="card">
                <h3>건강형평성 — 지역박탈 5분위별 분포</h3>
                <ExportButtons name={`${year}_${ind.name}_박탈분위`} kinds={["svg", "png"]} />
                <div className="desc">{year}년 · 전국 시군구를 지역박탈지수(근사)로 5등분해 {ind.name} 분포를 비교</div>
                <EquityPanel ind={ind} item={item} year={year} sel={sel} setTip={setTip} />
              </div>
              <EvidencePanel ind={ind} />
            </div>
          </>
        ) : (
          <Profile item={item} sel={sel} scope={scope} rankOpt={rankOpt} onRankOpt={setRankOpt} onPick={pickFromProfile} setTip={setTip}
            onRecommend={(name) => { setNcdInd(name); setView("ncd"); window.scrollTo({ top: 0, behavior: "smooth" }); }} onRegion={selectRegion} />
        )}

        <footer>
          자료원: 질병관리청 「지역사회건강조사」 — 통계청 KOSIS 공유서비스(openAPI), 수집일 {DS.generated}.
          {KDH_SOURCE && <> 사망률·감염병·의료이용·자원·인구·환경 지표: <a className="src" style={{ whiteSpace: "normal" }} href={KDH_SOURCE.url} target="_blank" rel="noreferrer">{KDH_SOURCE.name}</a>.</>}
          지도 경계: 통계청 2018 행정구역(행정구역 변경분은 최신 코드로 연결).<br />
          전국 기준값은 전 시군구 중앙값. 표준화율은 연령 표준화 값으로 지역 간 비교에 적합합니다.
          구조는 질병관리청 수도권질병대응센터 CIAT를 참조했습니다.
          {" "}<button type="button" className="linkbtn" onClick={() => { setView("feedback"); window.scrollTo({ top: 0, behavior: "smooth" }); }}>수정 의견·문의 보내기 →</button>
        </footer>
        {CONTACT.credit && (
          <div className="site-credit">기획·제작 {CONTACT.credit.org} · <a href={CONTACT.credit.url} target="_blank" rel="noopener noreferrer">{CONTACT.credit.urlLabel || CONTACT.credit.url}</a> · {CONTACT.credit.date}</div>
        )}
      </div>
      <Tooltip tip={tip} />
    </div>
  );
}
