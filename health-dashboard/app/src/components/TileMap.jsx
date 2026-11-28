import { useMemo } from "react";
import { RBY, fmt, val, classBreaks, classOf, SIDOS, natPool, sidoPoolOf, HC_POOL, isSurvey } from "../data";
import { clientXY } from "./svgUtil";
import LAYOUT from "../../../data/tile_layout.json";

/* 「시군구 1칸」 타일 지도(2026-11-28 소유자 승인: 육각형 지형도는 홍보용으로만, 분석은 모든 지역이 같은 크기인 타일 지도로).
   지역사회건강조사 조사 단위 258곳을 육각형 칸 하나씩 — 서울·광역시 도심 구가 면적 때문에 묻히지 않는다. 위치는 대략(scripts/build_tile_layout.py).
   색·분위·범례는 ChoroplethMap 과 같다(classBreaks 7단계, 결측은 회색 — 0 으로 바꾸지 않음).
   시군구 단위 자료(사망률·검진 등)는 보건소가 여러 곳인 시의 칸들을 그 시 값으로 칠하고 툴팁에 「시 전체 값」이라 적는다. */

const SQ3 = Math.sqrt(3);
const W = 560;
// odd-r(홀수 행이 반 칸 오른쪽) 이웃: 동·남동·남서·서·북서·북동 순서 = 아래 EDGE 순서
const NB = [
  [[1, 0], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1]],
  [[1, 0], [1, 1], [0, 1], [-1, 0], [0, -1], [1, -1]],
];
// 꼭짓점 각도(화면 y 아래, pointy-top): 변 d 는 꼭짓점 d·d+1 사이 — 동(-30°~30°), 남동(30°~90°) …
const CORNER = [-30, 30, 90, 150, 210, 270].map((a) => [Math.cos((a * Math.PI) / 180), Math.sin((a * Math.PI) / 180)]);

const sidoOfUnit = (r) => (r.l === "sub" ? RBY.get(r.p)?.p : r.p);
const shortName = (r) => {
  const n = (r.n || "").split(" ").pop();   // 「남양주 풍양」 → 「풍양」
  return n.length > 2 && /[시군구]$/.test(n) ? n.slice(0, -1) : n;
};

/** 칸 값: 조사 지표는 그 단위 값, 시군구 자료는 세부 단위면 소속 시 값(cityWide), 세종시는 시도 행 값. */
function cellValue(ind, item, year, r, survey) {
  let v = val(ind, item, year, r.c), code = r.c, cityWide = false;
  if (v == null && !survey && r.l === "sub") { v = val(ind, item, year, r.p); code = r.p; cityWide = v != null; }
  if (v == null && r.c === "00711") { v = val(ind, item, year, "0071"); code = "0071"; }
  return { v, code, cityWide };
}

export default function TileMap({ ind, item, year, sel, scope, onSelect, setTip, showLabels = true }) {
  const sidoCode = sel.l === "sgg" ? sel.p : sel.l === "sub" ? RBY.get(sel.p)?.p : sel.c;
  const isSidoAll = scope === "sidoAll";
  const survey = isSurvey(ind);

  // 그릴 칸: 전국 시도 = 17칸 / 시도 내 = 그 시도 칸 / 전국 = 258칸
  const tiles = useMemo(() => {
    if (isSidoAll) return SIDOS.map((r) => ({ r, cr: LAYOUT.sido[r.c] })).filter((t) => t.cr);
    const all = HC_POOL.map((r) => ({ r, cr: LAYOUT.units[r.c] })).filter((t) => t.cr);
    return scope === "sido" ? all.filter((t) => sidoOfUnit(t.r) === sidoCode) : all;
  }, [isSidoAll, scope, sidoCode]);

  // 화면 맞춤: 칸들의 격자 범위로 반지름을 정한다(시도 범위는 확대)
  const geo = useMemo(() => {
    const xs = tiles.map(({ cr }) => cr[0] + 0.5 * (cr[1] & 1)), ys = tiles.map(({ cr }) => cr[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    // 가로는 화면 폭, 세로는 폭의 1.3배 안에 들도록(전국 258칸은 세로로 긴 모양). 시도·17개 시도 범위는 칸을 크게.
    const R = Math.min((W - 8) / ((x1 - x0 + 1) * SQ3), (W * 1.3 - 8) / ((y1 - y0) * 1.5 + 2), isSidoAll ? 56 : 46);
    const cx = (cr) => (cr[0] + 0.5 * (cr[1] & 1) - x0) * SQ3 * R + SQ3 * R / 2 + (W - (x1 - x0 + 1) * SQ3 * R) / 2;
    const cy = (cr) => (cr[1] - y0) * 1.5 * R + R + 4;
    return { R, cx, cy, H: Math.ceil((y1 - y0) * 1.5 * R + 2 * R + 8) };
  }, [tiles, isSidoAll, scope]);

  const breaks = useMemo(() => {
    const pool = isSidoAll ? SIDOS : scope === "sido" ? sidoPoolOf(ind, sidoCode) : natPool(ind);
    return classBreaks(pool.map((r) => val(ind, item, year, r.c)));
  }, [ind, item, year, isSidoAll, scope, sidoCode]);

  const cells = tiles.map((t) => ({ ...t, ...cellValue(ind, item, year, t.r, survey), sido: isSidoAll ? t.r.c : sidoOfUnit(t.r) }));

  // 시도 경계: 이웃 칸이 없거나 다른 시도인 변
  const border = useMemo(() => {
    const at = new Map(cells.map((c) => [c.cr.join(","), c.sido]));
    const { R, cx, cy } = geo;
    let d = "";
    for (const c of cells) {
      const x = cx(c.cr), y = cy(c.cr);
      NB[c.cr[1] & 1].forEach(([dc, dr], k) => {
        const nb = at.get(`${c.cr[0] + dc},${c.cr[1] + dr}`);
        if (nb === c.sido) return;
        const a = CORNER[k], b = CORNER[(k + 1) % 6];
        d += `M${(x + a[0] * R).toFixed(1)},${(y + a[1] * R).toFixed(1)}L${(x + b[0] * R).toFixed(1)},${(y + b[1] * R).toFixed(1)}`;
      });
    }
    return d;
  }, [cells.length, geo, isSidoAll, scope, sidoCode]);   // eslint-disable-line react-hooks/exhaustive-deps

  const hexD = (x, y, R) => CORNER.map(([a, b], k) => `${k ? "L" : "M"}${(x + a * R * 0.96).toFixed(1)},${(y + b * R * 0.96).toFixed(1)}`).join("") + "Z";
  const isSel = (r) => r.c === sel.c || (r.l === "sub" && r.p === sel.c) || (sel.l === "sido" && !isSidoAll && sidoOfUnit(r) === sel.c && scope !== "sido");

  const onMove = (c) => (ev) => {
    const { x, y } = clientXY(ev);
    const r = c.r, parent = r.l === "sub" ? RBY.get(r.p) : null;
    const title = isSidoAll ? r.n : parent ? `${r.s} ${parent.n} · ${r.n}` : `${r.s} ${r.n}`;
    const rows = [[`${ind.name} (${year})`, fmt(c.v) + ind.unit]];
    if (c.cityWide) rows.push(["", `${parent.n} 전체 값(시군구 단위 자료)`]);
    setTip({ x, y, title, rows });
  };
  const onClick = (r) => () => onSelect(r.l === "sub" ? r.p : r.c);

  const pal = ind.bad === true ? "seqr" : ind.bad === false ? "seq" : "seqn";
  const palNote = ind.bad === true ? "진한 붉은색일수록 값이 높음(나쁨)" : ind.bad === false ? "진한 파란색일수록 값이 높음(좋음)" : "진할수록 값이 높음(좋고 나쁨 없음)";
  const { R, cx, cy, H } = geo;
  const fs = Math.max(7.5, Math.min(13, R * 0.46));
  return (
    <div className="mapwrap">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" className="tilemap"
        aria-label={isSidoAll ? "17개 시도 타일 지도" : `시군구 1칸 타일 지도(${tiles.length}칸)`}>
        {cells.map((c) => {
          const cls = classOf(c.v, breaks);
          return (
            <path key={c.r.c} d={hexD(cx(c.cr), cy(c.cr), R)} data-code={c.r.c} className={`poly tile ${isSel(c.r) ? "sel" : ""}`}
              style={{ fill: c.v == null ? "var(--grid)" : `var(--${pal}-${cls}00)` }}
              onMouseMove={onMove(c)} onMouseLeave={() => setTip(null)} onClick={onClick(c.r)} />
          );
        })}
        <path d={border} className="tile-border" />
        {showLabels && cells.map((c) => {
          const cls = classOf(c.v, breaks);
          const tone = c.v == null ? "" : cls >= 5 ? " on-dark" : " on-light";
          const big = R >= 30;
          return (
            <g key={"t" + c.r.c} pointerEvents="none">
              <text x={cx(c.cr)} y={cy(c.cr) + (big ? -1 : fs * 0.35)} className={`maplab tilelab${tone}${isSel(c.r) ? " sel" : ""}`}
                textAnchor="middle" style={{ fontSize: fs }}>{isSidoAll ? c.r.s : shortName(c.r)}</text>
              {big && c.v != null && <text x={cx(c.cr)} y={cy(c.cr) + fs * 1.05} className={`maplab val${tone}`} textAnchor="middle"
                style={{ fontSize: fs * 0.85 }}>{fmt(c.v)}</text>}
            </g>
          );
        })}
      </svg>
      <div className="maplegend">
        <span className="lg-item"><small>{palNote}</small></span>
        {[1, 2, 3, 4, 5, 6, 7].map((n) => (
          <span key={n} className="lg-item">
            <i style={{ background: `var(--${pal}-${n}00)` }} />
            <small>{n === 1 ? `≤${fmt(breaks[0])}` : n === 7 ? `>${fmt(breaks[5])}` : `${fmt(breaks[n - 2])}–${fmt(breaks[n - 1])}`}</small>
          </span>
        ))}
        <span className="lg-item"><i style={{ background: "var(--grid)" }} /><small>자료 없음</small></span>
        <span className="lg-item"><small>{isSidoAll ? "시도마다 같은 크기 칸 하나" : "조사 단위(보건소)마다 같은 크기 칸 하나 — 위치는 대략, 면적은 반영하지 않음"}</small></span>
        {!survey && !isSidoAll && <span className="lg-item"><small>시군구 단위 자료: 보건소가 여러 곳인 시는 시 전체 값으로 칠함</small></span>}
      </div>
    </div>
  );
}
