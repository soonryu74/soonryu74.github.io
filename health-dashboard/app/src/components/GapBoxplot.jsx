import { useRef } from "react";
import { fmt, val, boxStats, poolFor, label, ITEMS } from "../data";
import { gapMeasures, distSummary, QUANTILE_MIN_N } from "../lib/gapMeasures";
import Cite from "./Cite";
import { nearestIndex, clientXY, Gridlines, XAxis } from "./svgUtil";

/* 격차: 연도별 비교 집단 분포 상자그림 + 선택 지역 점 (CIAT 패널 6 재현) */
export default function GapBoxplot({ ind, item, year, sel, scope, setTip }) {
  const svgRef = useRef(null);
  const W = 560, H = 260, L = 40, R = 16, T = 14, B = 28;
  const ys = ind.years;
  const pool = poolFor(sel, scope, ind);
  const stats = ys.map((y) => boxStats(pool.map((r) => val(ind, item, y, r.c))));
  // 연도별 최댓값·최솟값 지역명
  const ext = ys.map((y) => {
    let mx = null, mn = null;
    for (const r of pool) { const v = val(ind, item, y, r.c); if (v == null) continue; if (!mx || v > mx.v) mx = { r, v }; if (!mn || v < mn.v) mn = { r, v }; }
    return { mx, mn };
  });
  const mine = ys.map((y) => val(ind, item, y, sel.c));
  const allv = stats.flatMap((s) => (s ? [s.min, s.max] : [])).concat(mine.filter((v) => v != null));
  if (!allv.length) return <div className="empty">표시할 자료가 없습니다</div>;
  const lo = Math.floor(Math.min(...allv) - 1), hi = Math.ceil(Math.max(...allv) + 1);
  const x = (i) => L + ((W - L - R) * (i + 0.5)) / ys.length;
  const y = (v) => T + (H - T - B) * (1 - (v - lo) / (hi - lo));
  const bw = Math.min(18, ((W - L - R) / ys.length) * 0.6);

  const onMove = (ev) => {
    const i = Math.max(0, Math.min(ys.length - 1, Math.floor(((clientXY(ev).x - svgRef.current.getBoundingClientRect().left) /
      svgRef.current.getBoundingClientRect().width * W - L) / ((W - L - R) / ys.length))));
    const s = stats[i];
    const { x: px, y: py } = clientXY(ev);
    setTip({ x: px, y: py, title: `${ys[i]}년 (n=${s?.n ?? 0})`,
      rows: s ? [[`최대 · ${ext[i].mx ? label(ext[i].mx.r) : ""}`, fmt(s.max)], ["3사분위", fmt(s.q3)], ["중앙값", fmt(s.med)], ["1사분위", fmt(s.q1)], [`최소 · ${ext[i].mn ? label(ext[i].mn.r) : ""}`, fmt(s.min)],
                 [label(sel), fmt(mine[i])]] : [["자료", "없음"]] });
  };

  return (
    <>
      <div className="legend">
        <span><i className="sw" style={{ background: "var(--band-solid)", height: 10 }} />집단 1–3사분위(상자)·최소–최대(수염)</span>
        <span><i className="sw dot" style={{ background: "var(--series-1)" }} />{label(sel)}</span>
      </div>
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="연도별 격차 상자그림">
        <Gridlines lo={lo} hi={hi} y={y} W={W} L={L} R={R} />
        <XAxis years={ys} x={(i) => x(i)} H={H} />
        {stats.map((s, i) => s && (
          <g key={ys[i]}>
            <line x1={x(i)} x2={x(i)} y1={y(s.max)} y2={y(s.q3)} className="whisker" />
            <line x1={x(i)} x2={x(i)} y1={y(s.q1)} y2={y(s.min)} className="whisker" />
            <rect x={x(i) - bw / 2} y={y(s.q3)} width={bw} height={Math.max(1, y(s.q1) - y(s.q3))} className="box" rx="2" />
            <line x1={x(i) - bw / 2} x2={x(i) + bw / 2} y1={y(s.med)} y2={y(s.med)} className="medline" />
          </g>
        ))}
        {mine.map((v, i) => v != null && (
          <circle key={ys[i]} cx={x(i)} cy={y(v)} r={ys[i] === year ? 5 : 3.2}
            style={{ fill: "var(--series-1)", stroke: "var(--surface-1)" }} strokeWidth="1.5" />
        ))}
        <rect x={L} y={T} width={W - L - R} height={H - T - B} fill="transparent"
          onMouseMove={onMove} onTouchMove={onMove} onMouseLeave={() => setTip(null)} onTouchEnd={() => setTip(null)} />
      </svg>
      <GapTable ind={ind} item={item} year={year} pool={pool} ext={ext[ys.indexOf(year)]} />
      <DistSummary ind={ind} item={item} year={year} pool={pool} />
      <DecileGap ind={ind} item={item} year={year} pool={pool} />
    </>
  );
}

/* 격차 읽기 — 같은 해·같은 비교 지역을 세 가지 방식으로 계산해 절대(%p)·상대(배)를 함께 보여 준다.
   노은정(2026-09-29) 발표: 「격차를 제시할 때 무엇과 비교했는지(기준)와 어떻게 계산했는지(방식)를 반드시 함께 표기」. */
function GapTable({ ind, item, year, pool, ext }) {
  const g = gapMeasures(pool.map((r) => val(ind, item, year, r.c)));
  if (!g) return null;
  const du = ind.unit === "%" ? "%p" : ` ${ind.unit}`;
  const rel = (x) => (x == null ? "–" : `${fmt(x, 2)}배`);
  const rows = [
    { m: "최댓값 − 최솟값", calc: ext?.mx && ext?.mn ? `${label(ext.mx.r)} ${fmt(g.max)} − ${label(ext.mn.r)} ${fmt(g.min)}` : `${fmt(g.max)} − ${fmt(g.min)}`, abs: g.maxMin.abs, r: g.maxMin.rel,
      note: "가장 단순하지만 극단 지역 한 곳이 바뀌면 크게 흔들림" },
    { m: "상·하위 20% 경계값 차이", calc: g.p80 != null ? `${fmt(g.p80)} − ${fmt(g.p20)}` : null, abs: g.boundary?.abs, r: g.boundary?.rel,
      note: "분포 가운데 60%의 폭. 극단값 영향이 거의 없어 추이 추적에 적합(HP2030 지역 건강수명 격차 방식)" },
    { m: "상·하위 20% 평균 차이", calc: g.quintile ? `${fmt(g.quintile.hi)} − ${fmt(g.quintile.lo)} (각 ${g.quintile.k}곳 평균)` : null, abs: g.quintile?.abs, r: g.quintile?.rel,
      note: "양 끝 20% 지역 전체의 수준. 취약 지역 전체가 좋아졌는지 볼 때(HP2030 소득 격차 방식)" },
  ];
  return (
    <div className="gap-read gap-main">
      <div className="gr-head"><b>격차 읽기 — {year}년</b> <span className="muted">기준: 비교 지역 {g.n}곳 · {ITEMS[item] || item} · 중앙값 {fmt(g.med)}{ind.unit === "%" ? "%" : ` ${ind.unit}`}</span></div>
      <div className="tbl-wrap"><table className="gr-tbl">
        <thead><tr><th>방식</th><th>계산</th><th className="num">절대 격차</th><th className="num">상대 격차</th><th>특징</th></tr></thead>
        <tbody>{rows.map((x) => (
          <tr key={x.m} className={x.calc == null ? "gr-na" : ""}><th scope="row">{x.m}</th>
            {x.calc == null ? <td colSpan={3} className="muted">비교 지역이 {QUANTILE_MIN_N}곳 이하라 쓰지 않음(20%가 몇 곳뿐이라 불안정)</td>
              : <><td>{x.calc}</td><td className="num"><b>{fmt(x.abs)}{du}</b></td><td className="num">{rel(x.r)}</td></>}
            <td className="muted">{x.note}</td></tr>))}</tbody>
      </table></div>
      <div className="desc">절대 격차는 줄여야 할 부담의 양(단위 %p), 상대 격차는 몇 배인지입니다. 유병률이 낮으면 상대 격차는 쉽게 커지므로 둘을 함께 봅니다. 「격차가 줄었다」는 불리한 쪽이 좋아져서인지(끌어올림), 양호한 쪽이 나빠져서인지(하향 수렴) 함께 확인해야 합니다.</div>
    </div>
  );
}

/* 분포 요약지표(연구자용) — 순서가 없는 지역 집단 전체의 퍼짐. WHO HEAT Plus 기술노트 v4.0 의 비가중 지표.
   COV(변동계수, 상대) · MDMU(평균으로부터의 평균 절대차, 절대) · IDISU(격차지수, 상대). 보건소 단위 인구가 없어 인구 가중 지표(BGV·Theil)는 쓰지 않는다. */
function DistSummary({ ind, item, year, pool }) {
  const cur = distSummary(pool.map((r) => val(ind, item, year, r.c)));
  if (!cur) return null;
  const du = ind.unit === "%" ? "%p" : ` ${ind.unit}`;
  const rows = ind.years.filter((y) => y <= year).slice(-10)
    .map((y) => ({ y, d: distSummary(pool.map((r) => val(ind, item, y, r.c))) })).filter((r) => r.d);
  const pct = (v) => (v == null ? "–" : `${fmt(v)}%`);
  return (
    <details className="gap-read dist-sum">
      <summary><b>분포 요약지표(연구자용)</b> <span className="muted">— {year}년 COV {pct(cur.cov)} · MDMU {fmt(cur.mdmu)}{du} · IDISU {pct(cur.idisu)} (비교 지역 {cur.n}곳)</span></summary>
      <div className="desc">
        양 끝만 보는 「격차 읽기」와 달리 <b>모든 비교 지역의 퍼짐</b>을 한 숫자로 요약합니다(순서가 없는 지역 집단용, WHO HEAT 정의<Cite k="heat" />).
        <b> COV</b>(변동계수) = 표준편차 ÷ 평균 × 100 · <b>MDMU</b> = 각 지역 값과 평균의 차이(절대값)의 평균 · <b>IDISU</b>(격차지수) = MDMU ÷ 평균 × 100.
        MDMU 는 절대(단위 {du.trim()}), COV·IDISU 는 상대(%)라 함께 봅니다.
      </div>
      <div className="tbl-wrap"><table className="gr-tbl">
        <thead><tr><th>연도</th><th className="num">평균</th><th className="num">MDMU(절대)</th><th className="num">COV(상대)</th><th className="num">IDISU(상대)</th><th className="num">지역 수</th></tr></thead>
        <tbody>{rows.map(({ y, d }) => (
          <tr key={y} className={y === year ? "row-cur" : undefined}><th scope="row">{y}</th><td className="num">{fmt(d.mean)}</td><td className="num">{fmt(d.mdmu)}{du}</td>
            <td className="num">{pct(d.cov)}</td><td className="num">{pct(d.idisu)}</td><td className="num">{d.n}</td></tr>))}</tbody>
      </table></div>
      <div className="desc muted">비가중 — 표본이 작은 지역의 불안정한 값도 같은 비중으로 들어갑니다. 지역별 인구로 가중하는 지표(BGV·Theil)는 보건소 단위 인구 자료가 없어 넣지 않았습니다. 해마다 참여 지역 수가 다르면 비교에 주의하세요.</div>
    </details>
  );
}

/* 상·하위 10% 평균 격차 추세 — 김동현 외(2025) 효과성 분석 연구의 격차 지표.
   최댓값−최솟값은 극단값 한 곳에 흔들리므로, 값이 높은 10% 지역 평균과 낮은 10% 지역 평균의 절대차(%p)·상대비(배)를 함께 본다.
   30곳 이하 집단(17개 시도 등)은 10%가 1~3곳이라 생략한다(건강격차 검토 P1 원칙). */
function DecileGap({ ind, item, year, pool }) {
  if (pool.length <= 30) return <div className="desc muted" style={{ marginTop: 6 }}>상·하위 10% 평균 격차 추세는 비교 집단이 30곳을 넘을 때만 보여 줍니다(지금 {pool.length}곳 — 10%가 3곳 이하라 불안정).</div>;
  const ys = ind.years;
  const rows = ys.map((y) => {
    const v = pool.map((r) => val(ind, item, y, r.c)).filter((x) => x != null).sort((a, b) => a - b);
    if (v.length < 20) return null;
    const k = Math.max(1, Math.round(v.length * 0.1));
    const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
    const lo = mean(v.slice(0, k)), hi = mean(v.slice(-k));
    return { y, lo, hi, abs: hi - lo, rel: lo > 0 ? hi / lo : null, k, n: v.length };
  });
  const ok = rows.filter(Boolean);
  if (ok.length < 2) return null;
  const du = ind.unit === "%" ? "%p" : ` ${ind.unit}`;
  const first = ok[0], last = ok[ok.length - 1], cur = rows[ys.indexOf(year)];
  const Spark = ({ get, title, f }) => {
    const W = 270, H = 96, L = 34, R = 8, T = 8, B = 20;
    const pts = ok.filter((r) => get(r) != null);
    if (pts.length < 2) return null;
    const vs = pts.map(get), mn = Math.min(...vs), mx = Math.max(...vs), pad = (mx - mn) * 0.15 || Math.abs(mx) * 0.05 || 1;
    const lo = mn - pad, hi = mx + pad;
    const px = (y) => L + ((W - L - R) * (y - ys[0])) / Math.max(1, ys[ys.length - 1] - ys[0]);
    const py = (v) => T + (H - T - B) * (1 - (v - lo) / (hi - lo));
    const d = pts.map((r, i) => `${i ? "L" : "M"}${px(r.y).toFixed(1)},${py(get(r)).toFixed(1)}`).join("");
    const c = cur && get(cur) != null ? cur : null;
    return (
      <div className="dg-spark">
        <div className="dg-title">{title}</div>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={title}>
          <text x={L - 4} y={py(mx) + 4} textAnchor="end" className="axis">{f(mx)}</text>
          <text x={L - 4} y={py(mn) + 4} textAnchor="end" className="axis">{f(mn)}</text>
          <text x={px(pts[0].y)} y={H - 4} textAnchor="start" className="axis">{pts[0].y}</text>
          <text x={px(pts[pts.length - 1].y)} y={H - 4} textAnchor="end" className="axis">{pts[pts.length - 1].y}</text>
          <path d={d} className="dg-line" />
          {c && <circle cx={px(c.y)} cy={py(get(c))} r="4" className="dg-dot" />}
        </svg>
      </div>
    );
  };
  const chg = last.abs - first.abs;
  return (
    <div className="decile-gap">
      <div className="dg-head"><b>상·하위 10% 평균 격차 추세</b> <span className="muted">— 값이 높은 10%({last.k}곳) 평균과 낮은 10% 평균의 차이</span></div>
      <div className="dg-sparks">
        <Spark get={(r) => r.abs} title={`절대 격차(${du.trim()})`} f={(v) => fmt(v, 1)} />
        <Spark get={(r) => r.rel} title="상대 격차(배)" f={(v) => fmt(v, 2)} />
      </div>
      <div className="desc">
        {cur && <>{year}년 높은 10% 평균 <b>{fmt(cur.hi)}</b> · 낮은 10% 평균 <b>{fmt(cur.lo)}</b> → 절대 격차 <b>{fmt(cur.abs)}{du}</b>{cur.rel != null && <> · 상대 격차 <b>{fmt(cur.rel, 2)}배</b></>}. </>}
        {first.y}→{last.y}년 절대 격차 {fmt(first.abs)}→{fmt(last.abs)}{du}({chg > 0 ? "▲" : chg < 0 ? "▼" : ""}{fmt(Math.abs(chg))}{du}, {chg > 0 ? "벌어짐" : chg < 0 ? "좁혀짐" : "변화 없음"}).
        {" "}표본조사 지표는 극단 10%에 표본오차가 몰려 격차가 과장될 수 있습니다.
      </div>
    </div>
  );
}
