import { useMemo } from "react";
import { feature, mesh, merge } from "topojson-client";
import { geoMercator, geoPath, geoCentroid, geoArea } from "d3-geo";
import { DS, RBY, fmt, val, classBreaks, classOf, sidoOf, SGG_ALL, SIDOS } from "../data";
import { clientXY } from "./svgUtil";

export const TOPO = DS.geo.topo;
export const OBJ = TOPO.objects[Object.keys(TOPO.objects)[0]];
export const FC = feature(TOPO, OBJ);
export const GEOMAP = DS.geo.map;
// 폴리곤 코드 앞 2자리(통계청) → KOSIS 시도 코드
const TOPO_SIDO = { 11: "001", 21: "002", 22: "003", 23: "004", 24: "005", 25: "006", 26: "007", 29: "0071",
  31: "008", 32: "009", 33: "010", 34: "011", 35: "012", 36: "013", 37: "014", 38: "015", 39: "016" };
export const polySido = (f) => TOPO_SIDO[f.properties.code.slice(0, 2)];
export const SIDO_MESH = mesh(TOPO, OBJ, (a, b) => polySido(a) !== polySido(b));
const OUTER = mesh(TOPO, OBJ, (a, b) => a === b);

/* 「전국 시도」 단계구분도용 — 시군구 폴리곤을 시도별로 병합해 17개 면을 만든다 */
export const SIDO_FEATS = (() => {
  const by = new Map();
  for (const g of OBJ.geometries) {
    const sc = TOPO_SIDO[g.properties.code.slice(0, 2)];
    if (!sc) continue;
    (by.get(sc) || by.set(sc, []).get(sc)).push(g);
  }
  // 라벨은 짧은 이름(서울·경기·강원…)을 쓴다 — 전국 시도 지도에서 수도권·광역시 라벨이 겹치지 않도록
  return [...by.entries()].map(([code, geoms]) => {
    const r = RBY.get(code);
    return {
      type: "Feature",
      properties: { code, name: r?.s || r?.n || code, full: r?.n || code, sidoLevel: true },
      geometry: merge(TOPO, geoms),
    };
  });
})();

const W = 560, H = 560;

/* 단계구분도: 전국/시도 범위, 분위 7단계, 클릭 선택, 연도 애니메이션은 부모의 year 로 */
export default function ChoroplethMap({ ind, item, year, sel, scope, onSelect, setTip, showLabels = true }) {
  const sidoCode = sel.l === "sgg" ? sel.p : sel.c;

  // scope: "sidoAll" = 17개 시도 면 · "sido" = 선택 시도 내 시군구 · 그 외 = 전국 시군구
  const isSidoAll = scope === "sidoAll";
  const feats = useMemo(
    () => (isSidoAll ? SIDO_FEATS : scope === "sido" ? FC.features.filter((f) => polySido(f) === sidoCode) : FC.features),
    [isSidoAll, scope, sidoCode]
  );
  // 시도 범위: 본토에서 멀리 떨어진 섬(울릉군 등)은 축척을 망가뜨리므로 본토만으로 화면을 맞추고, 섬은 오른쪽 위 작은 상자(별도 축척)에 그린다
  const { mainFeats, islandFeats } = useMemo(() => {
    if (isSidoAll || scope !== "sido" || feats.length < 3) return { mainFeats: feats, islandFeats: [] };
    const cs = feats.map((f) => geoCentroid(f));
    const med = (a) => { const b = [...a].sort((x, y) => x - y); return b[Math.floor(b.length / 2)]; };
    const mx = med(cs.map((c) => c[0])), my = med(cs.map((c) => c[1]));
    const far = (i) => Math.abs(cs[i][0] - mx) > 1.2 || Math.abs(cs[i][1] - my) > 1.2;
    return { mainFeats: feats.filter((_, i) => !far(i)), islandFeats: feats.filter((_, i) => far(i)) };
  }, [feats, scope]);
  const path = useMemo(() => {
    const proj = geoMercator().fitExtent([[6, 6], [W - 6, H - 6]], { type: "FeatureCollection", features: mainFeats });
    return geoPath(proj);
  }, [mainFeats]);
  const INSET = useMemo(() => {
    const w = 110, h = 96, m = 8;
    const corners = [{ x: W - w - m, y: H - h - m }, { x: W - w - m, y: m }, { x: m, y: H - h - m }, { x: m, y: m }];
    if (!islandFeats.length) return corners[0];
    const cs = mainFeats.map((f) => path.centroid(f));
    const hits = (c) => cs.filter(([x, y]) => x > c.x - 20 && x < c.x + w + 20 && y > c.y - 14 && y < c.y + h + 14).length;
    return corners.reduce((best, c) => (hits(c) < hits(best) ? c : best), corners[0]);
  }, [islandFeats, mainFeats, path]);
  const insetPath = useMemo(() => {
    if (!islandFeats.length) return null;
    // 멀티폴리곤(울릉군 = 울릉도 + 독도)은 가장 큰 조각 기준으로 축척을 맞춘다
    const biggest = islandFeats.map((f) => {
      if (f.geometry.type !== "MultiPolygon") return f;
      const polys = f.geometry.coordinates.map((c) => ({ type: "Feature", geometry: { type: "Polygon", coordinates: c } }));
      return polys.reduce((a, b) => (geoArea(b) > geoArea(a) ? b : a));
    });
    const proj = geoMercator().fitExtent([[INSET.x + 12, INSET.y + 20], [INSET.x + 110 - 12, INSET.y + 96 - 10]], { type: "FeatureCollection", features: biggest });
    return geoPath(proj);
  }, [islandFeats, INSET]);
  const dPaths = useMemo(() => feats.map((f) => (islandFeats.includes(f) ? insetPath(f) : path(f))), [feats, path, islandFeats, insetPath]);
  // 시도 범위에서는 시군구 이름(넓으면 값까지)을 지도 위에 표시, 전국 범위에서는 선택 시군구만
  const labels = useMemo(() => {
    const base = feats.map((f, i) => {
      const isl = islandFeats.includes(f);
      const pth = isl ? insetPath : path;
      const [cx, cy] = pth.centroid(f); const [[x0, y0], [x1, y1]] = pth.bounds(f);
      return { i, cx, cy, w: x1 - x0, h: y1 - y0, name: f.properties.name, isl, dx: 0, dy: 0 };
    });
    // 겹침 회피: 면적이 큰 폴리곤부터 자리를 잡고, 이미 놓인 글상자와 겹치면 조금씩 밀어 본다.
    // (서울·경기, 충남·세종처럼 중심점이 붙어 있는 시도에서 글자가 포개지는 것을 막는다)
    const order = [...base].filter((l) => isFinite(l.cx) && !l.isl).sort((a, b) => b.w * b.h - a.w * a.h);
    const placed = [];
    const OFFSETS = [[0, 0], [0, -11], [0, 11], [-20, 0], [20, 0], [0, -21], [0, 21], [-26, -11], [26, 11]];
    const hit = (a, b) => Math.abs(a.x - b.x) * 2 < a.w + b.w && Math.abs(a.y - b.y) * 2 < a.h + b.h;
    for (const l of order) {
      const tw = Math.max(20, l.name.length * 7 + 6), th = 15;
      let best = OFFSETS[0];
      for (const [dx, dy] of OFFSETS) {
        const box = { x: l.cx + dx, y: l.cy + dy, w: tw, h: th };
        if (!placed.some((q) => hit(box, q))) { best = [dx, dy]; break; }
      }
      l.dx = best[0]; l.dy = best[1];
      placed.push({ x: l.cx + l.dx, y: l.cy + l.dy, w: tw, h: th });
    }
    return base;
  }, [feats, path, islandFeats, insetPath]);
  const dMesh = useMemo(() => (scope === "sido" || isSidoAll ? null : path(SIDO_MESH)), [scope, isSidoAll, path]);
  const dOuter = useMemo(() => {
    if (scope !== "sido") return null;
    const geoms = OBJ.geometries.filter((g) => TOPO_SIDO[g.properties.code.slice(0, 2)] === sidoCode);
    return path(mesh(TOPO, { type: "GeometryCollection", geometries: geoms }, (a, b) => a === b));
  }, [scope, path, sidoCode]);
  // 전국 지도에서 선택 시도는 폴리곤 개별 강조 대신 시도 외곽선 하나로 강조
  const dSidoHi = useMemo(() => {
    if (scope === "sido" || isSidoAll || sel.l !== "sido") return null;
    const geoms = OBJ.geometries.filter((g) => TOPO_SIDO[g.properties.code.slice(0, 2)] === sel.c);
    return geoms.length ? path(merge(TOPO, geoms)) : null;
  }, [scope, isSidoAll, sel, path]);

  // 폴리곤 → 해당 연도 값 (후보 코드 중 값이 있는 첫 코드)
  const resolve = (f) => {
    if (f.properties.sidoLevel) return { code: f.properties.code, v: val(ind, item, year, f.properties.code) };
    for (const c of GEOMAP[f.properties.code] || []) {
      const v = val(ind, item, year, c);
      if (v != null) return { code: c, v };
    }
    return { code: (GEOMAP[f.properties.code] || [])[0], v: null };
  };
  const resolved = feats.map(resolve);
  // 분위 경계는 화면 범위(전국/시도)의 시군구 값 기준
  const breaks = useMemo(() => {
    const pool = isSidoAll ? SIDOS : scope === "sido" ? SGG_ALL.filter((r) => r.p === sidoCode) : SGG_ALL;
    return classBreaks(pool.map((r) => val(ind, item, year, r.c)));
  }, [ind, item, year, isSidoAll, scope, sidoCode]);

  const selCodes = new Set([sel.c, ...(isSidoAll ? [sidoCode] : [])]);
  // 선택 시군구에 속한 세부단위 폴리곤도 강조
  if (sel.l === "sgg") Object.values(GEOMAP).flat().forEach((c) => { if (c.length === 7 && c.startsWith(sel.c)) selCodes.add(c); });

  const onMove = (f, r) => (ev) => {
    const { x, y } = clientXY(ev);
    const reg = RBY.get(r.code);
    const parent = reg && reg.l === "sub" ? RBY.get(reg.p) : null;
    setTip({ x, y, title: f.properties.sidoLevel ? f.properties.full
        : parent ? `${parent.s} ${parent.n} · ${reg.n}` : reg ? `${reg.s} ${reg.n}` : f.properties.name,
      rows: [[`${ind.name} (${year})`, fmt(r.v) + ind.unit]] });
  };
  const onClick = (r) => () => {
    const reg = RBY.get(r.code);
    if (!reg) return;
    onSelect(reg.l === "sub" ? reg.p : reg.c);
  };

  // 색 계열: 높을수록 나쁨 → 붉은색, 높을수록 좋음 → 파란색, 방향 없음 → 보라색
  const pal = ind.bad === true ? "seqr" : ind.bad === false ? "seq" : "seqn";
  const palNote = ind.bad === true ? "진한 붉은색일수록 값이 높음(나쁨)" : ind.bad === false ? "진한 파란색일수록 값이 높음(좋음)" : "진할수록 값이 높음(좋고 나쁨 없음)";
  return (
    <div className="mapwrap">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={isSidoAll ? "시도 단계구분도" : "시군구 단계구분도"}>
        {feats.map((f, i) => {
          if (islandFeats.includes(f)) return null;
          const r = resolved[i];
          const cls = classOf(r.v, breaks);
          const isSel = selCodes.has(r.code);
          return (
            <path key={f.properties.code} d={dPaths[i]} className={`poly ${isSel ? "sel" : ""}`}
              style={{ fill: r.v == null ? "var(--grid)" : `var(--${pal}-${cls}00)` }}
              onMouseMove={onMove(f, r)} onMouseLeave={() => setTip(null)} onClick={onClick(r)} />
          );
        })}
        {dMesh && <path d={dMesh} className="sido-line" />}
        {dOuter && <path d={dOuter} className="sido-line" />}
        {dSidoHi && <path d={dSidoHi} className="sido-hi" />}
        {islandFeats.length > 0 && <g className="inset" pointerEvents="none">
          <rect x={INSET.x} y={INSET.y} width={110} height={96} rx="6" className="inset-box" />
          <text x={INSET.x + 6} y={INSET.y + 13} className="maplab small">{islandFeats.map((f) => f.properties.name).join("·")} (별도 축척)</text>
        </g>}
        {islandFeats.length > 0 && <clipPath id="inset-clip"><rect x={INSET.x} y={INSET.y} width={110} height={96} rx="6" /></clipPath>}
        {islandFeats.map((f) => {
          const i = feats.indexOf(f), r = resolved[i], cls = classOf(r.v, breaks), isSel = selCodes.has(r.code);
          return <path key={"i" + f.properties.code} d={dPaths[i]} clipPath="url(#inset-clip)" className={`poly ${isSel ? "sel" : ""}`}
            style={{ fill: r.v == null ? "var(--grid)" : `var(--${pal}-${cls}00)` }} onMouseMove={onMove(f, r)} onMouseLeave={() => setTip(null)} onClick={onClick(r)} />;
        })}
        {feats.map((f, i) => {
          const lb = labels[i], r = resolved[i], isSel = selCodes.has(r.code);
          if (lb.isl) return null;   // 섬은 인셋 제목으로 표시
          const show = showLabels === false ? isSel : (scope === "sido" || isSidoAll ? true : isSel);
          if (!show || !isFinite(lb.cx)) return null;
          const big = (scope === "sido" || isSidoAll) && lb.w > (isSidoAll ? 58 : 44) && lb.h > (isSidoAll ? 48 : 34) && !lb.isl;
          const nm = (scope === "sido" || isSidoAll) && lb.w < 30 && lb.name.length > 3 ? lb.name.slice(0, 3) : lb.name;
          return (
            <g key={"l" + f.properties.code} pointerEvents="none">
              <text x={lb.cx + lb.dx} y={(big ? lb.cy - 2 : lb.cy + 3) + lb.dy} className={`maplab ${isSel ? "sel" : ""} ${lb.isl ? "small" : ""}`} textAnchor="middle">{nm}</text>
              {big && r.v != null && <text x={lb.cx + lb.dx} y={lb.cy + 11 + lb.dy} className="maplab val" textAnchor="middle">{fmt(r.v)}</text>}
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
      </div>
    </div>
  );
}
