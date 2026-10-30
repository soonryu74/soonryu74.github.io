import { useRef } from "react";
import { DepCalc } from "./CalcExample";
import { DEP, depOf, depQuintiles, depGradient, boxStats, fmt, val, label, poolFor, SGG_ALL } from "../data";
import { clientXY } from "./svgUtil";
import Cite from "./Cite";

/* 경사불평등지수(SII)·상대불평등지수(RII): 박탈 분위는 순서가 있는 집단이므로 순서를 반영한 요약지표(Keppel 2005 지침 10, WHO HEAT).
   지역마다 소속 분위의 누적 비율 중간점(0 = 가장 덜 박탈 … 1 = 가장 박탈)에 놓고 지역 단위 비가중 회귀. */
// 계산은 data.js depGradient(시군구·2020 박탈 분위 고정) — 「격차 읽기」 표·지표별 보고서와 같은 값
const gradient = (ind, item, year) => depGradient(ind, item, year);

const QN = { 1: "1분위(가장 덜 박탈)", 2: "2분위", 3: "3분위", 4: "4분위", 5: "5분위(가장 박탈)" };

/* 건강형평성: 지역박탈지수 5분위별 지표 분포(상자그림) + 선택 지역 위치 */
export default function EquityPanel({ ind, item, year, sel, setTip }) {
  const svgRef = useRef(null);
  if (!DEP.year) return <div className="empty">지역박탈지수 자료가 없습니다</div>;
  const pool = SGG_ALL;                               // 분위는 전국 시군구 기준
  const groups = depQuintiles(pool);
  const stats = [1, 2, 3, 4, 5].map((q) => boxStats(groups[q].map((r) => val(ind, item, year, r.c))));
  const me = depOf(sel.c); const mine = val(ind, item, year, sel.c);
  const allv = stats.flatMap((s) => (s ? [s.min, s.max] : [])).concat(mine != null ? [mine] : []);
  if (!allv.length) return <div className="empty">표시할 자료가 없습니다</div>;
  const W = 560, H = 240, L = 40, R = 16, T = 14, B = 40;
  const lo = Math.floor(Math.min(...allv) - 1), hi = Math.ceil(Math.max(...allv) + 1);
  const x = (i) => L + ((W - L - R) * (i + 0.5)) / 5;
  const y = (v) => T + (H - T - B) * (1 - (v - lo) / (hi - lo));
  const bw = 40;
  const meds = stats.map((s) => s?.med);
  const gap = meds[4] != null && meds[0] != null ? meds[4] - meds[0] : null;
  const onMove = (i) => (ev) => {
    const s = stats[i]; const { x: px, y: py } = clientXY(ev);
    setTip({ x: px, y: py, title: `${QN[i + 1]} (n=${s?.n ?? 0})`, rows: s ? [["최대", fmt(s.max)], ["3사분위", fmt(s.q3)], ["중앙값", fmt(s.med)], ["1사분위", fmt(s.q1)], ["최소", fmt(s.min)]] : [["자료", "없음"]] });
  };
  return (
    <>
      <div className="legend">
        <span><i className="sw" style={{ background: "var(--band-solid)", height: 10 }} />분위별 1–3사분위(상자)·최소–최대(수염)·중앙값(선)</span>
        {mine != null && me?.q && <span><i className="sw dot" style={{ background: "var(--series-1)" }} />{label(sel)} ({me.q}분위, 지수 {fmt(me.idx)})</span>}
      </div>
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="박탈 5분위별 분포">
        {[lo, (lo + hi) / 2, hi].map((v) => (
          <g key={v}><line x1={L} x2={W - R} y1={y(v)} y2={y(v)} style={{ stroke: "var(--grid)" }} /><text x={L - 6} y={y(v) + 4} textAnchor="end" className="tick">{fmt(v, 0)}</text></g>
        ))}
        {stats.map((s, i) => s && (
          <g key={i} onMouseMove={onMove(i)} onMouseLeave={() => setTip(null)}>
            <line x1={x(i)} x2={x(i)} y1={y(s.max)} y2={y(s.q3)} style={{ stroke: "var(--muted)" }} />
            <line x1={x(i)} x2={x(i)} y1={y(s.q1)} y2={y(s.min)} style={{ stroke: "var(--muted)" }} />
            <rect x={x(i) - bw / 2} y={y(s.q3)} width={bw} height={Math.max(1, y(s.q1) - y(s.q3))} rx="3" style={{ fill: "var(--band-solid)", stroke: "var(--muted)" }} />
            <line x1={x(i) - bw / 2} x2={x(i) + bw / 2} y1={y(s.med)} y2={y(s.med)} style={{ stroke: "var(--text-primary)", strokeWidth: 2 }} />
            {me?.q === i + 1 && mine != null && <circle cx={x(i)} cy={y(mine)} r="5" style={{ fill: "var(--series-1)", stroke: "#fff", strokeWidth: 1.5 }} />}
            <text x={x(i)} y={H - B + 16} textAnchor="middle" className="tick">{i + 1}분위</text>
            <text x={x(i)} y={H - B + 30} textAnchor="middle" className="tick" style={{ fill: "var(--muted)" }}>{i === 0 ? "덜 박탈" : i === 4 ? "박탈 큼" : ""}</text>
          </g>
        ))}
      </svg>
      <div className="desc" style={{ marginTop: 6 }}>
        5분위−1분위 중앙값 차이 <b>{gap == null ? "–" : `${gap > 0 ? "+" : ""}${fmt(gap)}${ind.unit === "%" ? "%p" : " " + ind.unit}`}</b>
        {ind.bad != null && gap != null && <> → 박탈이 큰 지역일수록 {(ind.bad ? gap > 0 : gap < 0) ? "나쁨" : "좋음"}</>}
        . 지역박탈지수는 {DEP.year}년 인구주택총조사 집계표로 근사 산출(공식값 아님).
      </div>
      <SiiBlock ind={ind} item={item} year={year} groups={groups} />
      <DepCalc code={sel.c} name={label(sel)} />
    </>
  );
}

function SiiBlock({ ind, item, year, groups }) {
  const g = gradient(ind, item, year, groups);
  if (!g) return null;
  const du = ind.unit === "%" ? "%p" : ` ${ind.unit}`;
  const sgn = (v) => (v > 0 ? "+" : v < 0 ? "−" : "±") + fmt(Math.abs(v));
  const clear = g.lo > 0 || g.hi < 0;                       // 95% 구간이 0을 포함하지 않음
  const worse = ind.bad == null ? null : ind.bad ? g.sii > 0 : g.sii < 0;
  const ys = ind.years.filter((y) => y <= year).slice(-10);
  const trend = ys.map((y) => ({ y, g: gradient(ind, item, y, groups) })).filter((t) => t.g);
  return (
    <div className="gap-read sii-read">
      <div className="gr-head"><b>박탈 경사 — {year}년</b> <span className="muted">순서가 있는 5개 분위를 한 줄로 요약(시군구 {g.n}곳, 지역 단위·비가중)<Cite k={["heat", "whomon"]} /></span></div>
      <div className="tbl-wrap"><table className="gr-tbl">
        <thead><tr><th>지표</th><th className="num">값</th><th>뜻</th></tr></thead>
        <tbody>
          <tr><th scope="row">경사불평등지수(SII, 절대)</th><td className="num"><b>{sgn(g.sii)}{du}</b><br /><small className="muted">95% 구간 {fmt(g.lo)} ~ {fmt(g.hi)}</small></td>
            <td className="muted">가장 덜 박탈한 끝에서 가장 박탈한 끝으로 갈 때 값이 얼마나 달라지는지(회귀선 기준). 5분위−1분위 차이와 달리 가운데 분위까지 모두 씁니다.</td></tr>
          <tr><th scope="row">상대불평등지수(RII, 상대)</th><td className="num"><b>{g.rii == null ? "–" : `${fmt(g.rii, 2)}배`}</b></td>
            <td className="muted">회귀선의 가장 박탈한 끝 값 ÷ 가장 덜 박탈한 끝 값({fmt(g.y1)} ÷ {fmt(g.y0)}). 1이면 경사 없음.</td></tr>
        </tbody>
      </table></div>
      <div className="desc">
        {!clear ? <>95% 구간이 0을 포함 — <b>박탈 분위에 따른 뚜렷한 경사는 확인되지 않습니다.</b></>
          : <>박탈이 큰 지역일수록 값이 <b>{g.sii > 0 ? "높습니다" : "낮습니다"}</b>{worse == null ? " (맥락 지표라 좋고 나쁨은 판단하지 않음)." : worse ? " — 박탈이 큰 쪽이 불리한 방향." : " — 박탈이 큰 쪽이 유리한 방향."}</>}
        {" "}지역 평균끼리의 관계이므로 개인의 소득·학력에 따른 차이를 뜻하지 않습니다(생태학적 비교). 지역박탈지수는 근사 산출값입니다.
      </div>
      {trend.length > 1 && (
        <details className="sii-trend"><summary>최근 {trend.length}개 연도 추이</summary>
          <div className="tbl-wrap"><table className="gr-tbl">
            <thead><tr><th>연도</th><th className="num">SII</th><th className="num">95% 구간</th><th className="num">RII</th></tr></thead>
            <tbody>{trend.map(({ y, g: t }) => (
              <tr key={y}><th scope="row">{y}</th><td className="num">{sgn(t.sii)}{du}</td><td className="num">{fmt(t.lo)} ~ {fmt(t.hi)}</td><td className="num">{t.rii == null ? "–" : `${fmt(t.rii, 2)}배`}</td></tr>))}</tbody>
          </table></div>
          <div className="desc muted">박탈 분위는 {DEP.year}년 기준으로 고정 — 연도별 차이는 지표 값의 변화입니다.</div>
        </details>
      )}
    </div>
  );
}
