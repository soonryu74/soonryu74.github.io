import { useMemo, useState } from "react";
import { geoMercator, geoPath } from "d3-geo";
import { INDICATORS, HC_POOL, SIDOS, RBY, RISK, ranked, fmt, nationalMedian, unitsOfCity } from "../data";
import ChoroplethMap, { SIDO_FEATS } from "./ChoroplethMap";
import Cite from "./Cite";
import CONTACT from "../../../data/contact.json";

/* 메인(첫) 화면 — 카드 4장: 17개 시도 지도 · 258개 보건소 순위 · 취약인구 · 지자체 계획 수립.
   원칙: 카드 하나에 질문 하나. 자세한 분석은 카드의 버튼으로 해당 메뉴에 넘긴다.
   순위 카드는 상위 10곳만 싣는다(랭킹 기획안 원칙: 하위 공개 대신 「우리 보건소 찾기」). */

// 지도·순위 카드가 함께 쓰는 대표 지표 — 질병관리청 「한눈에 보기」 요약집 지표 중 생활습관 4종
const HEAD = [
  ["DT_H_SM", "흡연"], ["DT_117075_H_DR_HIGH_WH", "고위험음주"], ["DT_H_OBE_OBE", "비만"], ["DT_H_EX_WALK", "걷기"],
];
// 취약인구 카드에 싣는 집단(data/risk.json)
const VULN = [["age65", "65세 이상"], ["alone_n", "독거노인"], ["disab", "등록장애인"], ["bls", "기초생활수급자"], ["age0_4", "0~4세 영유아"], ["foreign_est", "외국인 주민(추정)"]];
const man = (v) => (v >= 10000 ? `${(v / 10000).toFixed(1)}만` : v.toLocaleString());

// 배경: 우리나라 시도 윤곽을 아주 옅게
const BG = (() => {
  const proj = geoMercator().fitExtent([[10, 10], [390, 510]], { type: "FeatureCollection", features: SIDO_FEATS });
  const p = geoPath(proj);
  return SIDO_FEATS.map((f) => p(f)).join(" ");
})();

export default function Home({ sel, setTip, onGo }) {
  const [hid, setHid] = useState(HEAD[0][0]);
  const ind = INDICATORS.find((i) => i.id === hid) || INDICATORS[0];
  const year = ind.years[ind.years.length - 1];
  const dir = ind.bad == null ? "" : ind.bad ? "낮을수록 양호" : "높을수록 양호";

  // ① 시도
  const sidoRows = useMemo(() => ranked(ind, "std", year, SIDOS), [ind, year]);
  const med = nationalMedian(ind, "std", year);

  // ② 258개 조사 단위 순위
  const hcRows = useMemo(() => ranked(ind, "std", year, HC_POOL), [ind, year]);
  const top = hcRows.slice(0, 10);
  const max = hcRows.length ? Math.max(...hcRows.map((x) => x.v)) : 1;
  const unitName = (r) => `${r.s} ${r.hc25 || r.n}`;
  const [q, setQ] = useState("");
  const mineCodes = useMemo(() => {
    if (q.trim()) return hcRows.filter((x) => unitName(x.r).replace(/\s/g, "").includes(q.replace(/\s/g, ""))).slice(0, 4).map((x) => x.r.c);
    if (!sel || sel.l === "sido") return [];
    const inPool = hcRows.some((x) => x.r.c === sel.c);
    return inPool ? [sel.c] : unitsOfCity(sel.c).map((u) => u.c);
  }, [q, sel, hcRows]);
  const mine = mineCodes.map((c) => ({ k: hcRows.findIndex((x) => x.r.c === c), x: hcRows.find((x) => x.r.c === c) })).filter((m) => m.x);

  // ③ 취약인구 — 17개 시도 합계
  const vuln = useMemo(() => {
    const regs = RISK.regions || {};
    const pop = SIDOS.reduce((a, s) => a + (regs[s.c]?.pop || 0), 0);
    const rows = VULN.map(([id, nm]) => {
      const v = SIDOS.reduce((a, s) => a + (regs[s.c]?.[id]?.v || 0), 0);
      const g = (RISK.groups || []).find((x) => x.id === id);
      return { id, nm, v, share: pop ? (v / pop) * 100 : null, est: g?.est };
    });
    const my = sel && regs[sel.c] ? { name: sel.l === "sgg" ? `${sel.s} ${sel.n}` : sel.n, share: regs[sel.c].age65?.v && regs[sel.c].pop ? (regs[sel.c].age65.v / regs[sel.c].pop) * 100 : null } : null;
    return { pop, rows, my, year: RISK.pop_year };
  }, [sel]);
  const vmax = Math.max(...vuln.rows.map((r) => r.share || 0), 1);

  const STEPS = [
    { n: "1", h: "현황 분석", b: "영역 점수 · 강점과 개선 과제 · 건강수명", view: "profile", cta: "지역 프로파일" },
    { n: "2", h: "우선순위", b: "황금다이아몬드 · 하위 지표 × 근거 지침", view: "profile", cta: "우선순위 카드" },
    { n: "3", h: "목표치", b: "핵심성과지표 16개 · 목표치 설정법 5종", view: "kpi", cta: "성과지표" },
    { n: "4", h: "사업 선정", b: "WHO → 국가 → 시도 계획 182개 항목", view: "ncd", cta: "예방·관리" },
  ];

  return (
    <div className="home">
      <svg className="home-bg" viewBox="0 0 400 520" aria-hidden="true" preserveAspectRatio="xMidYMid meet"><path d={BG} /></svg>
      <div className="home-hero">
        <div>
          <h2>우리 지역 건강, 한 화면에서 시작하기</h2>
          <p className="muted">지역사회건강조사 {year}년 · 조사 단위 {HC_POOL.length}곳<Cite k={["chs", "chs25"]} /> — 카드를 눌러 자세한 분석으로 들어가세요.</p>
        </div>
        <div className="seg home-ind" role="group" aria-label="지도·순위 카드의 지표">
          {HEAD.map(([id, nm]) => <button key={id} className={`seg-btn ${hid === id ? "on" : ""}`} onClick={() => setHid(id)}>{nm}</button>)}
        </div>
      </div>

      <div className="home-grid">
        {/* ① 17개 시도 지도 */}
        <section className="card hcard">
          <div className="hc-head"><span className="hc-no">1</span>
            <div><h3>17개 시도 건강 지도<Cite ind={ind} /></h3>
              <div className="desc">{year}년 {ind.name} · 표준화율 · {dir} · 시도를 누르면 그 시도 분석으로</div></div>
          </div>
          <div className="hc-map">
            <ChoroplethMap ind={ind} item="std" year={year} sel={sel} scope="sidoAll" showLabels setTip={setTip}
              onSelect={(c) => onGo({ view: "analysis", ind, code: c })} />
          </div>
          <div className="hc-foot">
            {sidoRows[0] && <>가장 양호 <b>{sidoRows[0].r.s || sidoRows[0].r.n} {fmt(sidoRows[0].v)}{ind.unit}</b> · </>}
            전국 시군구 중앙값 <b>{fmt(med)}{ind.unit}</b>
          </div>
          <button type="button" className="hc-cta" onClick={() => onGo({ view: "analysis", ind })}>지표 분석 열기 →</button>
        </section>

        {/* ② 258개 조사 단위 순위 */}
        <section className="card hcard">
          <div className="hc-head"><span className="hc-no">2</span>
            <div><h3>{HC_POOL.length}개 보건소 순위<Cite ind={ind} k="chs25" /></h3>
              <div className="desc">{year}년 {ind.name} · 상위 10곳 · {dir}</div></div>
          </div>
          <ol className="hc-rank">
            {top.map((x, k) => (
              <li key={x.r.c} className={mineCodes.includes(x.r.c) ? "me" : ""} onClick={() => onGo({ view: "analysis", ind, code: x.r.c })} title="누르면 이 지역 분석으로">
                <span className="hr-n">{k + 1}</span><span className="hr-nm">{unitName(x.r)}</span>
                <span className="hr-bar"><span style={{ width: `${((x.v / max) * 100).toFixed(1)}%` }} /></span>
                <span className="hr-v">{fmt(x.v)}</span>
              </li>
            ))}
          </ol>
          <div className="hc-find">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="우리 보건소 찾기 (예: 강릉, 수원 장안)" aria-label="보건소 이름으로 순위 찾기" />
            {mine.length > 0 && (
              <div className="hc-mine">
                {mine.map(({ k, x }) => <span key={x.r.c}><b>{unitName(x.r)}</b> {k + 1}위 / {hcRows.length} · {fmt(x.v)}{ind.unit}</span>)}
              </div>
            )}
          </div>
          <div className="desc hc-note">표본조사 값이라 이웃한 순위의 차이는 작을 수 있습니다. 하위 순위는 첫 화면에 싣지 않습니다.</div>
          <button type="button" className="hc-cta" onClick={() => onGo({ view: "analysis", ind, scope: "nation" })}>전체 순위·신뢰구간 보기 →</button>
        </section>

        {/* ③ 취약인구 */}
        <section className="card hcard">
          <div className="hc-head"><span className="hc-no">3</span>
            <div><h3>취약인구 규모<Cite k="risk" /></h3>
              <div className="desc">전국 {man(vuln.pop)} 명 중 · {vuln.year}년 주민등록 연앙인구 등 · 막대는 인구 대비 비율</div></div>
          </div>
          <ul className="hc-vuln">
            {vuln.rows.map((r) => (
              <li key={r.id}>
                <span className="hv-nm">{r.nm}</span>
                <span className="hr-bar"><span style={{ width: `${((r.share || 0) / vmax * 100).toFixed(1)}%` }} /></span>
                <span className="hv-v"><b>{man(r.v)}</b> 명 <small className="muted">{r.share != null ? `${r.share.toFixed(1)}%` : ""}</small></span>
              </li>
            ))}
          </ul>
          {vuln.my?.share != null && (
            <div className="hc-foot">{vuln.my.name} 65세 이상 <b>{vuln.my.share.toFixed(1)}%</b> · 전국 {vuln.rows[0].share.toFixed(1)}%</div>
          )}
          <div className="desc hc-note">추정 표시 집단은 유병률 × 인구로 계산한 규모입니다. 집단 간 중복이 있습니다.</div>
          <button type="button" className="hc-cta" onClick={() => onGo({ view: "profile" })}>우리 지역 고위험군 30개 집단 →</button>
        </section>

        {/* ④ 지자체 계획 수립 */}
        <section className="card hcard">
          <div className="hc-head"><span className="hc-no">4</span>
            <div><h3>지자체 계획 수립<Cite k={["hplan", "khepi"]} /></h3>
              <div className="desc">제9기 지역보건의료계획(2027~2030) 수립이 2026년 하반기에 시작됐습니다</div></div>
          </div>
          <ol className="hc-steps">
            {STEPS.map((s) => (
              <li key={s.n}>
                <button type="button" onClick={() => onGo({ view: s.view })}>
                  <span className="hs-n">{s.n}</span>
                  <span className="hs-t"><b>{s.h}</b><small>{s.b}</small></span>
                  <span className="hs-go">{s.cta} →</span>
                </button>
              </li>
            ))}
          </ol>
          <div className="desc hc-note">
            계획서 「현황 분석」 작성 순서는 사용설명서 시나리오 1에 있습니다 ·{" "}
            <a href={CONTACT.manual_pdf} target="_blank" rel="noopener noreferrer">사용설명서 PDF</a>
          </div>
          <button type="button" className="hc-cta" onClick={() => onGo({ view: "profile" })}>우리 지역 현황 분석 시작 →</button>
        </section>
      </div>
    </div>
  );
}
