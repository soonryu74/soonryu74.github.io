import { useRef } from "react";
import { fmt, val, boxStats, poolFor, label } from "../data";
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
      {(() => { const i = ys.indexOf(year); const e = ext[i]; const s = stats[i];
        return e && s ? <div className="desc" style={{ marginTop: 4 }}>{year}년 최댓값 <b>{label(e.mx.r)} {fmt(e.mx.v)}</b> · 최솟값 <b>{label(e.mn.r)} {fmt(e.mn.v)}</b> · 격차 {fmt(e.mx.v - e.mn.v)}{ind.unit === "%" ? "%p" : " " + ind.unit} (n={s.n})</div> : null; })()}
      <DecileGap ind={ind} item={item} year={year} pool={pool} />
    </>
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
