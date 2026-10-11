import { useMemo, useState } from "react";
import { geoMercator, geoPath } from "d3-geo";
import { INDICATORS, IND_BY_DOMAIN, DOMAINS_ALL, RBY, fmt, val, hasSe } from "../../data";
import { FC, GEOMAP, SIDO_MESH } from "../ChoroplethMap";
import ExportButtons from "../ExportButtons";
import Cite from "../Cite";
import { clientXY } from "../svgUtil";
import { unfavorablePercentile } from "../../lib/equity/calculateGap.js";
import { isDirectional } from "../../lib/equity/normalizeIndicator.js";

/* 핫스팟 「복합 취약 신호」 — 여러 지표에서 동시에 불리한 쪽 상위 N%에 드는 시군구를 지도에 겹쳐 본다.
   결과는 「고위험 지역」 판정이 아니라 「복합 취약 신호 지역」(여러 지표가 함께 불리한 신호를 보이는 곳)이다.
   지표마다 최신 연도가 다르고, 표본조사 값은 표본오차가 있어 경계 근처 지역은 해마다 바뀔 수 있다. */
const W = 560, H = 560;
const PROJ = geoMercator().fitExtent([[6, 6], [W - 6, H - 6]], FC);
const PATH = geoPath(PROJ);
const D_PATHS = FC.features.map((f) => PATH(f));
const D_MESH = PATH(SIDO_MESH);
const resolve = (f, ind, item, year) => {
  for (const c of GEOMAP[f.properties.code] || []) { const v = val(ind, item, year, c); if (v != null) return { code: c, v }; }
  return { code: (GEOMAP[f.properties.code] || [])[0], v: null };
};
const regName = (code, f) => { const r = RBY.get(code); if (!r) return f.properties.name; const p = r.l === "sub" ? RBY.get(r.p) : null; return p ? `${p.s} ${p.n} · ${r.n}` : `${r.s} ${r.n}`; };
const PRESETS = ["DT_H_SM", "DT_H_OBE_OBE", "DT_H_EX_WALK", "DT_117075_H_DR_HIGH_WH", "DT_INFLUENZA", "DEP_IDX"];
const IND = (id) => INDICATORS.find((i) => i.id === id);
const condLabel = (ind) => `${ind.direction === "lower_is_better" ? "높은" : "낮은"} ${ind.name}`;
const FILL = ["var(--grid)", "var(--seqr-200)", "var(--seqr-400)", "var(--seqr-600)", "var(--seqr-700)"];

export default function EquityHotspot({ setTip, onPick }) {
  const [ids, setIds] = useState(["DT_H_SM", "DT_H_EX_WALK", "DEP_IDX"]);
  const [thr, setThr] = useState(25);
  const [rule, setRule] = useState("all");
  const [atLeast, setAtLeast] = useState(2);
  const [item, setItem] = useState("std");
  const conds = ids.map(IND).filter((i) => i && isDirectional(i.direction));
  const k = conds.length;
  const need = rule === "all" ? k : Math.min(atLeast, k);
  const toggle = (id) => setIds((a) => (a.includes(id) ? a.filter((x) => x !== id) : a.length >= 6 ? a : [...a, id]));

  const per = useMemo(() => conds.map((ind) => {
    const y = ind.years[ind.years.length - 1];
    const res = FC.features.map((f) => resolve(f, ind, item, y));
    const vals = res.map((r) => r.v);
    const met = res.map((r) => { if (r.v == null) return null; const p = unfavorablePercentile(r.v, vals, ind.direction); return p ? p.u >= 1 - thr / 100 : null; });
    return { ind, y, res, met, n: vals.filter((v) => v != null).length };
  }), [ids.join(), thr, item]);

  const rows = FC.features.map((f, i) => {
    const cnt = per.reduce((a, c) => a + (c.met[i] ? 1 : 0), 0);
    const known = per.reduce((a, c) => a + (c.met[i] == null ? 0 : 1), 0);
    const code = per[0]?.res[i].code || (GEOMAP[f.properties.code] || [])[0];
    return { f, i, cnt, known, code, name: regName(code, f), flag: k >= 2 && cnt >= need };
  });
  const flagged = rows.filter((r) => r.flag).sort((a, b) => b.cnt - a.cnt || a.name.localeCompare(b.name, "ko"));
  const legend = Array.from({ length: k + 1 }, (_, c) => ({ c, n: rows.filter((r) => r.known > 0 && r.cnt === c).length }));
  const fillOf = (r) => (r.known === 0 ? "var(--page)" : FILL[Math.min(r.cnt, FILL.length - 1)]);
  const onMove = (r) => (ev) => {
    const { x, y } = clientXY(ev);
    setTip({ x, y, title: r.name, rows: [["충족 조건", `${r.cnt} / ${k}${r.flag ? " · 복합 취약 신호" : ""}`], ...per.map((c) => [`${condLabel(c.ind)} (${c.y})`, c.res[r.i].v == null ? "자료 없음" : `${fmt(c.res[r.i].v)}${c.ind.unit}${c.met[r.i] ? " ✔" : ""}`])] });
  };
  const anySurvey = conds.some((c) => hasSe(c));

  return (
    <>
      <div className="card">
        <h3>복합 취약 신호 — 여러 지표가 함께 불리한 지역<Cite k={["chs", "dep", "geo"]} /></h3>
        <div className="desc">조건을 2개 이상 고르면 각 지표에서 <b>불리한 쪽 상위 {thr}%</b>에 드는 시군구를 겹쳐 봅니다. 결과는 <b>「복합 취약 신호 지역」</b>이며 고위험 지역 판정이 아닙니다.</div>
        <div className="ehs-conds" role="group" aria-label="조건 선택">
          {[...new Set([...PRESETS, ...ids])].map(IND).filter(Boolean).map((ind) => (
            <button key={ind.id} type="button" className={`chip ${ids.includes(ind.id) ? "on" : ""}`} aria-pressed={ids.includes(ind.id)} onClick={() => toggle(ind.id)}>{ids.includes(ind.id) ? "✔ " : "+ "}{condLabel(ind)}</button>
          ))}
        </div>
        <div className="ctrls" style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "8px 0" }}>
          <label className="subchip">지표 추가 <select value="" onChange={(e) => e.target.value && toggle(e.target.value)} style={{ maxWidth: 220 }}>
            <option value="">— 고르기 —</option>
            {DOMAINS_ALL.map((d) => <optgroup key={d} label={d}>{(IND_BY_DOMAIN[d] || []).filter((i) => isDirectional(i.direction) && !ids.includes(i.id)).map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}</optgroup>)}
          </select></label>
          <label className="subchip">기준 <select value={thr} onChange={(e) => setThr(+e.target.value)}>{[10, 20, 25, 33].map((t) => <option key={t} value={t}>불리한 쪽 상위 {t}%</option>)}</select></label>
          <label className="subchip">규칙 <select value={rule} onChange={(e) => setRule(e.target.value)}><option value="all">모두 충족</option><option value="atleast">N개 이상 충족</option></select></label>
          {rule === "atleast" && <label className="subchip">N <select value={atLeast} onChange={(e) => setAtLeast(+e.target.value)}>{[2, 3, 4, 5].filter((n) => n <= Math.max(2, k)).map((n) => <option key={n} value={n}>{n}개</option>)}</select></label>}
          <label className="subchip">값 <select value={item} onChange={(e) => setItem(e.target.value)}><option value="std">표준화율</option><option value="crude">조율</option></select></label>
        </div>
        <div className="desc">
          기준 연도: {per.map((c, i) => <span key={c.ind.id}>{i ? " · " : ""}{c.ind.name} {c.y}년</span>)} — 지표마다 최신 연도가 다를 수 있습니다(지역박탈지수는 2020년 총조사 기준).
          {anySurvey && " 지역사회건강조사 값은 표본오차가 있어 기준선 근처 지역은 해마다 바뀔 수 있습니다."} 백분위는 지도 시군구 폴리곤 {FC.features.length}곳 기준입니다.
        </div>
      </div>
      {k < 2 ? <div className="card"><div className="empty">조건을 2개 이상 고르세요</div></div> : (
        <div className="grid2">
          <div className="card">
            <h3>복합 취약 신호 지도 <small className="muted">{rule === "all" ? `${k}개 모두` : `${need}개 이상`} 충족 · {flagged.length}곳</small></h3>
            <ExportButtons name={`복합취약신호_${conds.map((c) => c.name).join("+")}`} kinds={["svg", "png"]} />
            <div className="mapwrap">
              <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="복합 취약 신호 지도">
                {rows.map((r) => (
                  <path key={r.f.properties.code} d={D_PATHS[r.i]} className={`poly ${r.flag ? "ehs-flag" : ""}`} style={{ fill: fillOf(r) }}
                    onMouseMove={onMove(r)} onMouseLeave={() => setTip(null)}
                    onClick={() => { const reg = RBY.get(r.code); if (reg && onPick && conds[0]) onPick(conds[0], reg.l === "sub" ? reg.p : reg.c, per[0].y); }} />
                ))}
                <path d={D_MESH} className="sido-line" />
              </svg>
              <div className="maplegend">
                {legend.map((l) => <span key={l.c} className="lg-item"><i style={{ background: FILL[Math.min(l.c, FILL.length - 1)] }} /><small>{l.c}개 충족{l.c >= need ? " (신호)" : ""} ({l.n})</small></span>)}
                <span className="lg-item"><i style={{ background: "var(--page)", border: "1px solid var(--border)" }} /><small>자료 없음</small></span>
                <span className="lg-item"><i className="ehs-lg-flag" /><small>굵은 테두리 = 복합 취약 신호</small></span>
              </div>
            </div>
          </div>
          <div className="card">
            <h3>복합 취약 신호 지역 목록 <small className="muted">{flagged.length}곳</small></h3>
            <ExportButtons name={`복합취약신호_목록_${conds.map((c) => c.name).join("+")}`} kinds={["csv"]} />
            {flagged.length === 0 ? <div className="empty">조건을 모두 충족하는 지역이 없습니다. 기준을 넓히거나 「N개 이상」 규칙을 써 보세요.</div> : (
              <div className="tblscroll" style={{ maxHeight: 640, overflowY: "auto" }}><table className="yeartbl">
                <thead><tr><th>지역</th><th>충족</th>{per.map((c) => <th key={c.ind.id}>{c.ind.name}<br /><small className="muted">{c.y}</small></th>)}</tr></thead>
                <tbody>
                  {flagged.map((r) => (
                    <tr key={r.f.properties.code} onClick={() => { const reg = RBY.get(r.code); if (reg && onPick && conds[0]) onPick(conds[0], reg.l === "sub" ? reg.p : reg.c, per[0].y); }}>
                      <td>{r.name}</td><td><b>{r.cnt}/{k}</b></td>
                      {per.map((c) => <td key={c.ind.id}>{c.res[r.i].v == null ? "–" : `${fmt(c.res[r.i].v)}${c.ind.unit}`}{c.met[r.i] ? " ✔" : ""}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table></div>
            )}
            <div className="desc">✔ = 그 지표에서 불리한 쪽 상위 {thr}%. 여러 지표가 함께 불리하다는 신호일 뿐, 원인이나 위험도를 뜻하지 않습니다.</div>
          </div>
        </div>
      )}
    </>
  );
}
