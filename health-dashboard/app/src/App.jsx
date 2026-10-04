import { useEffect, useMemo, useRef, useState } from "react";
import Cite from "./components/Cite";
import RefList from "./components/RefList";
import { DS, INDICATORS, RBY, SIDOS, HC_POOL, isSurvey, label, DEFAULT_RANK_OPT, KDH_SOURCE, TIER_INFO, indRef, TREND_START } from "./data";
import { IndicatorPicker, RegionPicker, YearControl, ItemToggle } from "./components/Pickers";
import Kpis from "./components/Kpis";
import TrendChart from "./components/TrendChart";
import ChoroplethMap from "./components/ChoroplethMap";
import RankPanel from "./components/RankPanel";
import YearTable from "./components/YearTable";
import GapBoxplot from "./components/GapBoxplot";
import TrendCard from "./components/TrendCard";
import EquityPanel from "./components/EquityPanel";
import Profile from "./components/Profile";
import Compare, { NAT, MAX_CMP } from "./components/Compare";
import EvidencePanel from "./components/EvidencePanel";
import Tooltip from "./components/Tooltip";
import UnitsView from "./components/UnitsView";
import CONTACT from "../../data/contact.json";
import NcdView from "./components/NcdView";
import Search from "./components/Search";
import HelpContent from "./components/Help";
import CorrelationView from "./components/CorrelationView";
import HotspotView from "./components/HotspotView";
import ChronicleView from "./components/ChronicleView";
import KpiView from "./components/KpiView";
import SourcesView from "./components/SourcesView";
import RadarAbout from "./components/equity/RadarAbout";
import IndInfo from "./components/equity/IndInfo";
import FeedbackView from "./components/FeedbackView";
import RegionReport from "./components/RegionReport";
import IndicatorReport from "./components/IndicatorReport";
import REV from "../../data/reviews.json";
import { BUILD } from "./components/ReviewsCard";
import Home from "./components/Home";
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
    scope: ["sidoAll", "sido", "nation"].includes(h.get("scope")) ? h.get("scope") : (RBY.get(sgg0)?.l === "sgg" ? "nation" : "sido"),
    // 주소에 아무 상태가 없으면(처음 방문) 메인 화면, view=home 도 메인 화면
    view: !window.location.hash.replace(/^#/, "") || h.get("view") === "home" ? "home"
      : ["profile", "compare", "units", "ncd", "corr", "hot", "chronicle", "kpi", "sources", "feedback", "radar", "report", "ireport"].includes(h.get("view")) ? h.get("view") : "analysis",
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
    en: h.get("en") === "1",   // 우선 검토 카드 영어 모드(국제 심사용, /solve 에서 들어옴)
  };
}

// 제목의 지표 수는 참고문헌(data/refs.json)의 지표별 첫 출처로 센다 — 2026-09-24 이전에는 결과지표가 아닌 것을 모두
// 「지역사회건강조사」로 세어 암검진·일반검진이 섞인 52개로 나왔다.
const nSrc = (key) => INDICATORS.filter((i) => indRef(i)?.refs?.[0] === key).length;
const nKdh = INDICATORS.filter((i) => i.kdh).length;

export default function App() {
  const init = useMemo(readHash, []);
  const [helpOpen, setHelpOpen] = useState(false);   // 머리글 「? 도움말」 창(홈 카드 ⑤와 같은 내용, 해시에는 넣지 않음)
  useEffect(() => {
    if (!helpOpen) return;
    const onKey = (e) => { if (e.key === "Escape") setHelpOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [helpOpen]);
  const [ind, setInd] = useState(init.ind);
  const [item, setItem] = useState(init.item);
  const [sido, setSido] = useState(init.sido);
  const [sgg, setSgg] = useState(init.sgg);
  const [yearSel, setYearSel] = useState(init.year);
  const [scope, setScope] = useState(init.scope);   // 비교 범위(지도·순위·격차·연도표 공통): sidoAll(17개 시도) | nation(전국 시군구) | sido(시도 내 시군구)
  // 지도 범위(CIAT 단계구분도와 동일): sidoAll = 전국 시도 · nation = 전국 시군구 · sido = 시도 내 시군구
  const [mapLabels, setMapLabels] = useState(true);
  const [view, setView] = useState(init.view);      // analysis | profile | compare
  // 「의견·문의」에 자동으로 붙일 「보고 있던 화면」 주소 — 문의 탭이 아닌 마지막 화면의 해시를 기억
  const [feedbackFrom, setFeedbackFrom] = useState(() => window.location.href);
  useEffect(() => { if (view !== "feedback") setFeedbackFrom(window.location.href); }, [view, window.location.hash]);
  const [cmp, setCmp] = useState(init.cmp);         // 비교 대상 코드 목록 (NAT = 전국 중앙값)
  const [rankOpt, setRankOpt] = useState(init.rankOpt); // 순위 산출 방식 (방법론 v1)
  const [ncdInd, setNcdInd] = useState(init.ncdInd);     // 지식베이스 지표 필터
  const [en, setEn] = useState(init.en);                 // 우선 검토 카드 영어 모드
  const [ncdQ, setNcdQ] = useState("");                 // 검색에서 넘어온 지식베이스 검색어
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
      ...(ncdInd ? { nind: ncdInd } : {}), ...(en ? { en: "1" } : {}) });
    window.history.replaceState(null, "", "#" + h.toString());
  }, [ind, item, sido, sgg, year, scope, view, cmp, rankOpt, ncdInd, en]);

  // 주소창 해시가 바뀌면(링크 붙여넣기·뒤로가기) 화면 상태를 다시 읽는다
  useEffect(() => {
    const onHash = () => {
      const h = readHash();
      setInd(h.ind); setItem(h.item); setSido(h.sido); setSgg(h.sgg);
      setYearSel(h.year); setScope(h.scope); setView(h.view); setCmp(h.cmp);
      setRankOpt(h.rankOpt); setNcdInd(h.ncdInd); setEn(h.en); setPlaying(false);
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
    if (r.l === "sido") { setSido(r.c); setSgg(null); setScope((sc) => (sc === "sidoAll" ? sc : "sido")); }
    else if (r.l === "sub") { const p = RBY.get(r.p); if (p) { setSido(p.p); setSgg(p.c); } setScope((sc) => (sc === "sidoAll" ? "nation" : sc)); }   // 보건소 세부 단위 → 소속 시군구
    else { setSido(r.p); setSgg(r.c); setScope((sc) => (sc === "sidoAll" ? "nation" : sc)); }
  };
  // 비교 범위 드롭다운 값: sidoAll | nation | sido:<시도코드>. 「시도 내 시군구 — X」를 고르면 선택 지역도 그 시도 안으로 옮긴다
  const scopeValue = scope === "sido" ? `sido:${sel.l === "sido" ? sel.c : sel.p}` : scope;
  const pickScope = (v) => {
    if (v.startsWith("sido:")) { const c = v.slice(5); const cur = sel.l === "sido" ? sel.c : sel.p; if (c !== cur) { setSido(c); setSgg(null); } setScope("sido"); }
    else setScope(v);
  };
  const [fs, setFs] = useState(() => { try { return Number(localStorage.getItem("hd-fs") || 0); } catch { return 0; } });
  const bumpFs = (d) => setFs((v) => { const n = Math.max(-1, Math.min(2, v + d)); try { localStorage.setItem("hd-fs", String(n)); } catch {} return n; });
  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    setTheme(next);
  };
  // 검색 결과로 이동: 메뉴 전환 → (지표·지역 적용) → 카드 제목까지 스크롤하고 잠깐 강조. 화면이 그려질 때까지 80ms 간격으로 최대 20번 찾는다.
  const goCard = (title) => {
    const nz = (t) => String(t || "").toLowerCase().replace(/[\s·()\-_,.「」]/g, "");
    const want = nz(title); let n = 0;
    const t = setInterval(() => {
      const el = [...document.querySelectorAll(".card h3, .card h2, .srccard .sc-head, .reflist h3, .fb-faq summary, details.method-docs summary")].find((e) => nz(e.textContent).includes(want));
      if (el || ++n > 20) {
        clearInterval(t);
        if (!el) return;
        const box = el.closest(".card, .srccard, .reflist, details") || el;
        if (box.tagName === "DETAILS") box.open = true;   // 접힌 목록(방법론 문서·FAQ)은 펼쳐서 보여 준다
        box.scrollIntoView({ behavior: "smooth", block: "start" });
        box.classList.add("srch-hit"); setTimeout(() => box.classList.remove("srch-hit"), 2400);
      }
    }, 80);
  };
  const goSearch = ({ view: v, ind: i, code, card, ncdQ: nq }) => {
    if (i) { setInd(i); setPlaying(false); }
    if (code) selectRegion(code);
    if (nq != null) { setNcdInd(null); setNcdQ(nq); }
    const target = v || (code && ["home", "units", "sources", "feedback", "chronicle", "ncd"].includes(view) ? "analysis" : view);
    if (target !== view) setView(target);
    if (card) goCard(card); else window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const pickFromProfile = (i, y) => { setInd(i); setYearSel(y); setView("analysis"); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const inCmp = cmp.includes(sel.c);
  const addToCompare = () => {
    if (inCmp) { setCmp(cmp.filter((c) => c !== sel.c)); return; }
    if (cmp.length >= MAX_CMP) return;
    // 처음 담을 때는 전국 중앙값을 같이 넣어 비교 기준을 제공
    setCmp(cmp.length ? [...cmp, sel.c] : [NAT, sel.c]);
  };

  const mapSidoCode = sel.l === "sido" ? sel.c : sel.p;
  const scopeLabel = scope === "sidoAll" ? "17개 시도" : scope === "sido" ? `${RBY.get(mapSidoCode)?.n || ""} 내 시군구` : "전국 시군구";
  // 지도·순위·격차·연도표가 모두 같은 비교 범위를 쓴다(2026-10-02 소유자 지시: 범위 선택을 드롭다운 하나로)
  const mapScope = scope;
  const mapScopeName = scope === "sidoAll" ? "전국 시도" : scope === "sido" ? `${RBY.get(mapSidoCode)?.n || ""} 시군구` : "전국 시군구";

  return (
    <div className={`viz-root fs-${fs}${playing ? " playing" : ""}${view === "report" || view === "ireport" ? " view-report" : ""}`}>
      <div className="wrap">
        <header className="top">
          <div>
            <button type="button" className="title title-home" title="처음 화면으로"
              onClick={() => { setView("home"); window.scrollTo({ top: 0, behavior: "smooth" }); }}>지역 건강프로파일 대시보드</button>
            <div className="subtitle">지표 {INDICATORS.length}개 — 지역사회건강조사 {nSrc("chs")}<Cite k="chs" /> · 결과·환경 DB {nKdh}<Cite k="kdh" /> · 국가암검진 {nSrc("cancer")}<Cite k="cancer" /> · 일반검진 {INDICATORS.filter((i) => i.id.startsWith("CHK_")).length}<Cite k="nhis" /> · 건강수명 {nSrc("hle")}<Cite k="hle" /> · 박탈지수 {nSrc("dep")}<Cite k="dep" /> · 시도/시군구 · {DS.years[0]}–{DS.years[DS.years.length - 1]}
              <span className="sub-note">지역 건강수준과 격차를 모니터링하고, 지역보건 검토 우선순위를 탐색할 수 있도록 지원합니다(건강수준 모니터링과 목표치 설정 지원 도구). 본 서비스는 보건소 사업의 투입·산출 자료를 포함하지 않으므로 사업 성과평가나 인과효과 판단에 사용할 수 없습니다.</span></div>
          </div>
          <div className="topright">
            <Search view={view} onGo={goSearch} />
            <button type="button" className="themebtn help-btn" onClick={() => setHelpOpen(true)} title="소개 영상 · 사용설명서 · 활용법 내려받기" aria-haspopup="dialog"><b>?</b> 도움말</button>
            <button type="button" className={`themebtn en-btn ${view === "radar" ? "on" : ""}`} lang="en" onClick={() => { setView("radar"); window.scrollTo({ top: 0, behavior: "smooth" }); }} title="Health Equity Radar — English overview">EN</button>
            <div className="seg views">
              <button className={`seg-btn ${view === "home" ? "on" : ""}`} onClick={() => setView("home")}>홈</button>
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

        {!["home", "units", "ncd", "corr", "hot", "chronicle", "sources", "feedback", "radar"].includes(view) && <div className="controls">
          {view !== "profile" && view !== "kpi" && view !== "report" && <IndicatorPicker ind={ind} onChange={(i) => { setInd(i); setPlaying(false); }} />}
          {view !== "compare" && <RegionPicker sido={sido} sgg={sgg} onSido={(c) => { setSido(c); setSgg(null); setScope((sc) => (sc === "sidoAll" ? sc : "sido")); }} onSgg={(c) => { setSgg(c); if (c) setScope((sc) => (sc === "sidoAll" ? "nation" : sc)); }} />}
          {view !== "compare" && view !== "kpi" && (
            <div className="ctrl">
              <label>비교 담기</label>
              <button className={`themebtn ${inCmp ? "on" : ""}`} onClick={addToCompare} disabled={!inCmp && cmp.length >= MAX_CMP}
                title="지역 비교 화면에 이 지역을 추가/제거">
                {inCmp ? "✓ 담김 (빼기)" : "+ 비교에 추가"}
              </button>
            </div>
          )}
          {(view === "analysis" || (view === "profile" && sel.l === "sgg")) && (
            <div className="ctrl">
              <label>비교 범위</label>
              <select className="scope-sel" value={view === "profile" && scope === "sidoAll" ? "nation" : scopeValue} onChange={(e) => pickScope(e.target.value)}
                title="지도·순위·격차·연도표가 함께 쓰는 비교 집단">
                {view === "analysis" && <optgroup label="시도"><option value="sidoAll">전국 — 17개 시도</option></optgroup>}
                <optgroup label="시군구">
                  <option value="nation">전국 — 시군구{isSurvey(ind) ? ` (조사 단위 ${HC_POOL.length}곳)` : ""}</option>
                </optgroup>
                <optgroup label="시도 내 시군구">
                  {SIDOS.map((s) => <option key={s.c} value={`sido:${s.c}`}>{s.n} 내 시군구</option>)}
                </optgroup>
              </select>
            </div>
          )}
          <ItemToggle item={item} onChange={setItem} ind={ind} />
          {view === "analysis" && ind.direction !== "context" && (
            <div className="ctrl">
              <label>보고서</label>
              <button className="themebtn" onClick={() => { setView("ireport"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                title="이 지표의 전국 취약지역 현황 보고서(시도별·검토 대상 지역·악화 지역·박탈 분위)">📄 전국 취약지역 보고서</button>
            </div>
          )}
          {view !== "profile" && view !== "kpi" && view !== "report" && view !== "ireport" && <YearControl years={years} year={year} onYear={(y) => { setYearSel(y); setPlaying(false); }} playing={playing} onPlay={togglePlay} />}
        </div>}

        <div ref={bodyRef} className="body-anchor" />

        {view === "home" ? (
          <Home sel={sel} setTip={setTip} onGoCard={goSearch}
            onGo={({ view: v, ind: i, code, scope: sc }) => { if (i) setInd(i); if (code) selectRegion(code); if (sc) setScope(sc); setView(v); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
        ) : view === "report" ? (
          <RegionReport key={sel?.c} sel={sel} item={item} smooth={rankOpt.smooth} onBack={() => { setView("profile"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            onIndicatorReport={() => { setView("ireport"); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
        ) : view === "ireport" ? (
          <IndicatorReport key={ind.id} ind={ind} sel={sel} item={item} smooth={rankOpt.smooth}
            onBack={() => { setView("analysis"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            onRegionReport={() => { setView("report"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            onNcd={() => { setNcdInd(ind.name); setView("ncd"); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
) : view === "radar" ? (
          <RadarAbout sel={sel} onGo={(v) => { if (v === "profile-en") { setEn(true); setView("profile"); } else setView(v); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
        ) : view === "feedback" ? (
          <FeedbackView currentUrl={feedbackFrom} />
        ) : view === "sources" ? (
          <SourcesView sel={sel} />
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
          <NcdView filterInd={ncdInd} onClearInd={() => setNcdInd(null)} sidoFull={RBY.get(sido)?.n} initQ={ncdQ}
            onPickInd={(i) => { if (i) { setInd(i); setView("analysis"); window.scrollTo({ top: 0, behavior: "smooth" }); } }} />
        ) : view === "compare" ? (
          <Compare ind={ind} item={item} year={year} codes={cmp} onCodes={setCmp} onYear={(y) => setYearSel(y)} sel={sel} onRegionProfile={(c) => { selectRegion(c); setView("profile"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            onPick={(i, y) => { setInd(i); setYearSel(y); window.scrollTo({ top: 0, behavior: "smooth" }); }} setTip={setTip} />
        ) : view === "analysis" ? (
          <>
            <Kpis ind={ind} item={item} year={year} sel={sel} />
            <div className="grid2">
              <div className="card span2 mapcard">
                <div className="cardhead">
                  <div>
                    <h3>{year}년 {ind.name} — {mapScopeName} 단계구분도<Cite ind={ind} k="geo" /></h3>
                    <ExportButtons name={`${year}_${ind.name}_지도_${mapScopeName}`} />
                    <div className="desc">7단계 분위({mapScopeName} 기준) · 지역을 누르면 선택 · ▶ 로 연도 애니메이션</div>
                  </div>
                </div>
                <div className="seg map-seg">
                  <span className="desc map-scope-note">범위: <b>{mapScopeName}</b> — 위 「비교 범위」에서 바꿉니다</span>
                  <button className={`seg-btn ${mapLabels ? "on" : ""}`} style={{ marginLeft: "auto" }}
                    onClick={() => setMapLabels(!mapLabels)}
                    title={mapLabels ? "지도 위 지역명을 숨깁니다" : "지도 위에 지역명을 표시합니다"}>
                    🏷 지역명{mapLabels ? "" : " 꺼짐"}</button>
                </div>
                <ChoroplethMap ind={ind} item={item} year={year} sel={sel} scope={mapScope}
                  showLabels={mapLabels} onSelect={selectRegion} setTip={setTip} />
              </div>

              <div className="card">
                <h3>{ind.name} 추이<Cite ind={ind} /><IndInfo ind={ind} /></h3>
                <ExportButtons name={`${ind.name}_추이_${label(sel)}`} />
                <div className="desc">{years[0]}–{years[years.length - 1]} · {ind.src}</div>
                {ind.note && <div className="desc indnote">⚠ {ind.note}</div>}
                {ind.tier && TIER_INFO[ind.tier] && (
                  <div className="desc tierline">
                    <span className={`tbadge ${TIER_INFO[ind.tier].color}`}>{ind.tier}</span>
                    <b>권장 측정 주기 {TIER_INFO[ind.tier].cycle}</b> · 순위 비교 {TIER_INFO[ind.tier].rankable === true ? "가능" : TIER_INFO[ind.tier].rankable === false ? "부적합" : TIER_INFO[ind.tier].rankable} · {TIER_INFO[ind.tier].desc}
                    {" "}<span className="muted">(WHO/IHP+ 결과사슬 기준)</span><Cite k="tiers" />
                  </div>
                )}
                {ind.dirNote && <div className="desc dirnote"><b>{ind.bad === true ? "높을수록 나쁨" : ind.bad === false ? "높을수록 좋음" : "방향 없음(맥락 지표)"}</b> — {ind.dirNote}{ind.dirRefs?.length ? <> · 근거: {ind.dirRefs.map((r, i) => <a key={i} className="src" style={{ whiteSpace: "normal" }} href={r.url} target="_blank" rel="noreferrer">{r.name}</a>).reduce((a, b) => [a, ", ", b])}</> : null}<Cite k="dir" /></div>}
                <TrendChart ind={ind} item={item} year={year} sel={sel} setTip={setTip} />
              </div>

              <div className="card">
                <h3>10년 추세 — {TREND_START}년 이후 연간 변화<Cite k="effect" /></h3>
                <ExportButtons name={`${ind.name}_10년추세_${scopeLabel}`} kinds={["svg", "png"]} />
                <div className="desc">지역마다 {TREND_START}년 이후 값의 직선 기울기(연간 변화량) · 비교 집단 안에서 좋음·보통·나쁨 3분위</div>
                <TrendCard ind={ind} item={item} sel={sel} scope={scope} scopeLabel={scopeLabel} setTip={setTip} />
              </div>

              <div className="card">
                <h3>순위<Cite ind={ind} /></h3>
                <ExportButtons name={`${year}_${ind.name}_순위_${scopeLabel}`} kinds={["list"]} />
                <div className="desc">{year}년 · 양호한 순 ({ind.bad == null ? "값 큰 순" : ind.bad ? "낮을수록 양호" : "높을수록 양호"})</div>
                <RankPanel ind={ind} item={item} year={year} sel={sel} scope={scope} onSelect={selectRegion} onYear={(y) => { setYearSel(y); setPlaying(false); }} />
              </div>

              <div className="card">
                <h3>연도별 추이표<Cite ind={ind} /></h3>
                <ExportButtons name={`${ind.name}_연도별_${label(sel)}`} kinds={["csv"]} />
                <div className="desc">수치 · 순위 · 증감량 · 증감률 (행을 누르면 연도 이동)</div>
                <YearTable ind={ind} item={item} sel={sel} year={year} onYear={(y) => setYearSel(y)} />
              </div>

              <div className="card">
                <h3>지역 간 격차 — {scopeLabel}<Cite ind={ind} /></h3>
                <ExportButtons name={`${ind.name}_격차_${scopeLabel}`} />
                <div className="desc">연도별 분포(상자그림)와 {label(sel)}의 위치</div>
                <GapBoxplot ind={ind} item={item} year={year} sel={sel} scope={scope} setTip={setTip} />
              </div>

              <div className="card">
                <h3>건강형평성 — 지역박탈 5분위별 분포<Cite ind={ind} k="dep" /></h3>
                <ExportButtons name={`${year}_${ind.name}_박탈분위`} kinds={["svg", "png"]} />
                <div className="desc">{year}년 · 전국 시군구를 지역박탈지수(근사)로 5등분해 {ind.name} 분포를 비교</div>
                <EquityPanel ind={ind} item={item} year={year} sel={sel} setTip={setTip} />
              </div>
              <EvidencePanel ind={ind} />
            </div>
          </>
        ) : (
          <Profile item={item} sel={sel} scope={scope} rankOpt={rankOpt} onRankOpt={setRankOpt} onPick={pickFromProfile} onGoCard={goSearch} setTip={setTip} lang={en ? "en" : "ko"} onLang={(l) => setEn(l === "en")}
            onRecommend={(name) => { setNcdInd(name); setView("ncd"); window.scrollTo({ top: 0, behavior: "smooth" }); }} onRegion={selectRegion} />
        )}

        {helpOpen && (
          <div className="help-modal" role="dialog" aria-modal="true" aria-label="도움말 — 소개 영상·사용설명서·활용법" onMouseDown={(e) => { if (e.target === e.currentTarget) setHelpOpen(false); }}>
            <div className="card help-box">
              <div className="help-head">
                <h3>처음이세요? — 소개 영상 · 사용설명서 · 활용법</h3>
                <button type="button" className="themebtn" onClick={() => setHelpOpen(false)} aria-label="닫기">✕ 닫기</button>
              </div>
              <HelpContent compact onGo={(g) => { setHelpOpen(false); goSearch(g); }} />
            </div>
          </div>
        )}
        <RefList collapsed={view === "home" || view === "radar"} />
        <footer>
          자료원: 질병관리청 「지역사회건강조사」 — 통계청 KOSIS 공유서비스(openAPI), 수집일 {DS.generated}.
          {KDH_SOURCE && <> 사망률·감염병·의료이용·자원·인구·환경 지표: <a className="src" style={{ whiteSpace: "normal" }} href={KDH_SOURCE.url} target="_blank" rel="noreferrer">{KDH_SOURCE.name}</a>.</>}
          지도 경계: 통계청 2018 행정구역(행정구역 변경분은 최신 코드로 연결).<br />
          전국 기준값은 전 시군구 중앙값. 표준화율은 연령 표준화 값으로 지역 간 비교에 적합합니다.
          구조는 질병관리청 수도권질병대응센터 CIAT를 참조했습니다<Cite k="ciat" />.
          {" "}<button type="button" className="linkbtn" onClick={() => { setView("feedback"); window.scrollTo({ top: 0, behavior: "smooth" }); }}>수정 의견·문의 보내기 →</button>
        </footer>
        {/* 외부 검토 기록 한 줄 — 게시 건수는 data/reviews.json 에서 자동(인증 표시가 아니라 기록으로 가는 길) */}
        <div className="rev-foot">
          외부 검토 — 게시 {REV.reviews.filter((r) => r.status !== "withdrawn").length}건{REV.pending?.active ? " · 요청 진행 중" : ""}
          {" · "}<button type="button" className="linkbtn" onClick={() => goSearch({ view: "sources", card: "외부 검토·자문" })}>기록 보기 →</button>
        </div>
        {CONTACT.credit && (
          <div className="site-credit">기획·제작 {CONTACT.credit.org} · <a href={CONTACT.credit.url} target="_blank" rel="noopener noreferrer">{CONTACT.credit.urlLabel || CONTACT.credit.url}</a> · {CONTACT.credit.date} · 빌드 {BUILD.commit}{BUILD.date ? ` (${BUILD.date})` : ""}</div>
        )}
      </div>
      <Tooltip tip={tip} />
    </div>
  );
}
