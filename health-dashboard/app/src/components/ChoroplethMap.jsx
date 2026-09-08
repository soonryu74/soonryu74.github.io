import { useMemo } from "react";
import { feature, mesh, merge } from "topojson-client";
import { geoMercator, geoPath } from "d3-geo";
import { DS, RBY, fmt, val, classBreaks, classOf, sidoOf, SGG_ALL } from "../data";
import { clientXY } from "./svgUtil";

const TOPO = DS.geo.topo;
const OBJ = TOPO.objects[Object.keys(TOPO.objects)[0]];
const FC = feature(TOPO, OBJ);
const GEOMAP = DS.geo.map;
// 폴리곤 코드 앞 2자리(통계청) → KOSIS 시도 코드
const TOPO_SIDO = { 11: "001", 21: "002", 22: "003", 23: "004", 24: "005", 25: "006", 26: "007", 29: "0071",
  31: "008", 32: "009", 33: "010", 34: "011", 35: "012", 36: "013", 37: "014", 38: "015", 39: "016" };
const polySido = (f) => TOPO_SIDO[f.properties.code.slice(0, 2)];
const SIDO_MESH = mesh(TOPO, OBJ, (a, b) => polySido(a) !== polySido(b));
const OUTER = mesh(TOPO, OBJ, (a, b) => a === b);

const W = 560, H = 560;

/* 단계구분도: 전국/시도 범위, 분위 7단계, 클릭 선택, 연도 애니메이션은 부모의 year 로 */
export default function ChoroplethMap({ ind, item, year, sel, scope, onSelect, setTip }) {
  const sidoCode = sel.l === "sgg" ? sel.p : sel.c;

  const feats = useMemo(
    () => (scope === "sido" ? FC.features.filter((f) => polySido(f) === sidoCode) : FC.features),
    [scope, sidoCode]
  );
  const path = useMemo(() => {
    const proj = geoMercator().fitExtent([[6, 6], [W - 6, H - 6]], { type: "FeatureCollection", features: feats });
    return geoPath(proj);
  }, [feats]);
  const dPaths = useMemo(() => feats.map((f) => path(f)), [feats, path]);
  const dMesh = useMemo(() => (scope === "sido" ? null : path(SIDO_MESH)), [scope, path]);
  const dOuter = useMemo(() => (scope === "sido" ? path(OUTER) : null), [scope, path]);
  // 전국 지도에서 선택 시도는 폴리곤 개별 강조 대신 시도 외곽선 하나로 강조
  const dSidoHi = useMemo(() => {
    if (scope === "sido" || sel.l !== "sido") return null;
    const geoms = OBJ.geometries.filter((g) => TOPO_SIDO[g.properties.code.slice(0, 2)] === sel.c);
    return geoms.length ? path(merge(TOPO, geoms)) : null;
  }, [scope, sel, path]);

  // 폴리곤 → 해당 연도 값 (후보 코드 중 값이 있는 첫 코드)
  const resolve = (f) => {
    for (const c of GEOMAP[f.properties.code] || []) {
      const v = val(ind, item, year, c);
      if (v != null) return { code: c, v };
    }
    return { code: (GEOMAP[f.properties.code] || [])[0], v: null };
  };
  const resolved = feats.map(resolve);
  // 분위 경계는 화면 범위(전국/시도)의 시군구 값 기준
  const breaks = useMemo(() => {
    const pool = scope === "sido" ? SGG_ALL.filter((r) => r.p === sidoCode) : SGG_ALL;
    return classBreaks(pool.map((r) => val(ind, item, year, r.c)));
  }, [ind, item, year, scope, sidoCode]);

  const selCodes = new Set([sel.c]);
  // 선택 시군구에 속한 세부단위 폴리곤도 강조
  if (sel.l === "sgg") Object.values(GEOMAP).flat().forEach((c) => { if (c.length === 7 && c.startsWith(sel.c)) selCodes.add(c); });

  const onMove = (f, r) => (ev) => {
    const { x, y } = clientXY(ev);
    const reg = RBY.get(r.code);
    const parent = reg && reg.l === "sub" ? RBY.get(reg.p) : null;
    setTip({ x, y, title: parent ? `${parent.s} ${parent.n} · ${reg.n}` : reg ? `${reg.s} ${reg.n}` : f.properties.name,
      rows: [[`${ind.name} (${year})`, fmt(r.v) + ind.unit]] });
  };
  const onClick = (r) => () => {
    const reg = RBY.get(r.code);
    if (!reg) return;
    onSelect(reg.l === "sub" ? reg.p : reg.c);
  };

  return (
    <div className="mapwrap">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="시군구 단계구분도">
        {feats.map((f, i) => {
          const r = resolved[i];
          const cls = classOf(r.v, breaks);
          const isSel = selCodes.has(r.code);
          return (
            <path key={f.properties.code} d={dPaths[i]} className={`poly ${isSel ? "sel" : ""}`}
              style={{ fill: r.v == null ? "var(--grid)" : `var(--seq-${cls}00)` }}
              onMouseMove={onMove(f, r)} onMouseLeave={() => setTip(null)} onClick={onClick(r)} />
          );
        })}
        {dMesh && <path d={dMesh} className="sido-line" />}
        {dOuter && <path d={dOuter} className="sido-line" />}
        {dSidoHi && <path d={dSidoHi} className="sido-hi" />}
      </svg>
      <div className="maplegend">
        {[1, 2, 3, 4, 5, 6, 7].map((n) => (
          <span key={n} className="lg-item">
            <i style={{ background: `var(--seq-${n}00)` }} />
            <small>{n === 1 ? `≤${fmt(breaks[0])}` : n === 7 ? `>${fmt(breaks[5])}` : `${fmt(breaks[n - 2])}–${fmt(breaks[n - 1])}`}</small>
          </span>
        ))}
        <span className="lg-item"><i style={{ background: "var(--grid)" }} /><small>자료 없음</small></span>
      </div>
    </div>
  );
}
