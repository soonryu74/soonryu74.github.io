import { useRef } from "react";
import { fmt, pathOf, nearestIndex, clientXY } from "../lib";

function Gridlines({ lo, hi, y, W, L, R, ticks = 4 }) {
  const lines = [];
  for (let k = 0; k <= ticks; k++) {
    const v = lo + ((hi - lo) * k) / ticks;
    const yy = y(v);
    lines.push(
      <g key={k}>
        <line x1={L} x2={W - R} y1={yy} y2={yy} style={{ stroke: "var(--grid)" }} strokeWidth="1" />
        <text className="axis" x={L - 6} y={yy + 3.5} textAnchor="end">{v.toFixed(0)}</text>
      </g>
    );
  }
  return lines;
}

function XAxis({ years, x, H }) {
  const step = Math.max(1, Math.ceil(years.length / 5));
  const labels = [];
  for (let i = 0; i < years.length; i += step)
    labels.push(<text key={years[i]} className="axis" x={x(i)} y={H - 8} textAnchor="middle">{years[i]}</text>);
  return labels;
}

/* 연도별 추이: 선택 지역 vs 전국 중앙값 */
export function TrendChart({ d, region, yearIdx, setTip }) {
  const svgRef = useRef(null);
  const W = 560, H = 260, L = 40, R = 16, T = 14, B = 28;
  const ys = d.years;
  const rSeries = d.sido[region], nSeries = d.national;
  const all = rSeries.concat(nSeries).filter((v) => v != null);
  const lo = Math.floor(Math.min(...all) - 1), hi = Math.ceil(Math.max(...all) + 1);
  const x = (i) => L + ((W - L - R) * i) / Math.max(1, ys.length - 1);
  const y = (v) => T + (H - T - B) * (1 - (v - lo) / (hi - lo));
  const cx = x(yearIdx);

  const onMove = (ev) => {
    const i = nearestIndex(ev, svgRef.current, W, L, R, ys.length);
    const { x: px, y: py } = clientXY(ev);
    setTip({ x: px, y: py, title: `${ys[i]}년`,
      rows: [[region, fmt(rSeries[i]) + d.unit], ["전국", fmt(nSeries[i]) + d.unit]] });
  };

  return (
    <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="연도별 추이 선 그래프">
      <Gridlines lo={lo} hi={hi} y={y} W={W} L={L} R={R} />
      <XAxis years={ys} x={x} H={H} />
      <line x1={cx} x2={cx} y1={T} y2={H - B} style={{ stroke: "var(--baseline)" }} strokeWidth="1" strokeDasharray="3 3" />
      <path d={pathOf(nSeries, x, y)} fill="none" style={{ stroke: "var(--series-2)" }} strokeWidth="2" strokeLinejoin="round" />
      <path d={pathOf(rSeries, x, y)} fill="none" style={{ stroke: "var(--series-1)" }} strokeWidth="2" strokeLinejoin="round" />
      {rSeries[yearIdx] != null && (
        <circle cx={cx} cy={y(rSeries[yearIdx])} r="4" style={{ fill: "var(--series-1)", stroke: "var(--surface-1)" }} strokeWidth="2" />
      )}
      {nSeries[yearIdx] != null && (
        <circle cx={cx} cy={y(nSeries[yearIdx])} r="4" style={{ fill: "var(--series-2)", stroke: "var(--surface-1)" }} strokeWidth="2" />
      )}
      <rect x={L} y={T} width={W - L - R} height={H - T - B} fill="transparent"
        onMouseMove={onMove} onTouchMove={onMove}
        onMouseLeave={() => setTip(null)} onTouchEnd={() => setTip(null)} />
    </svg>
  );
}

/* 지역 간 격차: 시도 최소–최대 범위 밴드 + 전국 중앙값 */
export function GapChart({ d, sido, setTip }) {
  const svgRef = useRef(null);
  const W = 560, H = 240, L = 40, R = 16, T = 14, B = 28;
  const ys = d.years;
  const colVals = (i) => sido.map((s) => d.sido[s][i]).filter((v) => v != null);
  const mins = ys.map((_, i) => { const c = colVals(i); return c.length ? Math.min(...c) : null; });
  const maxs = ys.map((_, i) => { const c = colVals(i); return c.length ? Math.max(...c) : null; });
  const allv = mins.concat(maxs).filter((v) => v != null);
  const lo = Math.floor(Math.min(...allv) - 1), hi = Math.ceil(Math.max(...allv) + 1);
  const x = (i) => L + ((W - L - R) * i) / Math.max(1, ys.length - 1);
  const y = (v) => T + (H - T - B) * (1 - (v - lo) / (hi - lo));

  let band = "";
  maxs.forEach((v, i) => { if (v != null) band += (band ? " L" : "M") + x(i).toFixed(1) + " " + y(v).toFixed(1); });
  for (let i = ys.length - 1; i >= 0; i--)
    if (mins[i] != null) band += ` L${x(i).toFixed(1)} ${y(mins[i]).toFixed(1)}`;
  band += " Z";

  const onMove = (ev) => {
    const i = nearestIndex(ev, svgRef.current, W, L, R, ys.length);
    const gap = maxs[i] != null && mins[i] != null ? maxs[i] - mins[i] : null;
    const { x: px, y: py } = clientXY(ev);
    setTip({ x: px, y: py, title: `${ys[i]}년`,
      rows: [["최대", fmt(maxs[i]) + d.unit], ["중앙값", fmt(d.national[i]) + d.unit],
             ["최소", fmt(mins[i]) + d.unit], ["격차", fmt(gap) + "%p"]] });
  };

  return (
    <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="지역 간 격차 범위 그래프">
      <Gridlines lo={lo} hi={hi} y={y} W={W} L={L} R={R} />
      <XAxis years={ys} x={x} H={H} />
      <path d={band} style={{ fill: "var(--band)" }} />
      <path d={pathOf(d.national, x, y)} fill="none" style={{ stroke: "var(--series-2)" }} strokeWidth="2" />
      <rect x={L} y={T} width={W - L - R} height={H - T - B} fill="transparent"
        onMouseMove={onMove} onTouchMove={onMove}
        onMouseLeave={() => setTip(null)} onTouchEnd={() => setTip(null)} />
    </svg>
  );
}
