import { useMemo, useState } from "react";
import { INDICATORS, IND_BY_ID, val, fmt, label, RBY, SGG_ALL, leagueOf, depOf, latestYear, ranked, DOMAINS_ALL, IND_BY_DOMAIN } from "../data";
import ExportButtons from "./ExportButtons";

/* 동류군(peer group) 비교 — 여건이 비슷한 시군구끼리만 견준다.
   근거: 결과지표를 여건 보정 없이 서열화하면 취약지역이 구조적으로 불리해진다(docs/지역보건사업_평가이론_v1.md 4장).
   김상용(2008)이 제안한 평가군집을 고령화율·재정자립도·인구밀도·지역박탈지수 4개 축의 표준화 거리로 구현. */
const AXES = [
  { id: "K_POP_AGED", name: "고령인구비율", unit: "%" },
  { id: "K_ECO_FIN", name: "재정자립도", unit: "%" },
  { id: "K_POP_DENS", name: "인구밀도", unit: "명/㎢", log: true },
];
const SIZE = 12;

export default function PeerCard({ item, sel, onPick }) {
  const [indId, setIndId] = useState("HLE_HLE");
  const target = IND_BY_ID[indId];
  const isSgg = sel.l === "sgg";

  const peers = useMemo(() => {
    if (!isSgg) return null;
    // 축별 최신값 수집 → z 표준화 (인구밀도는 로그)
    const axv = AXES.map((a) => {
      const ind = IND_BY_ID[a.id]; if (!ind) return null;
      const y = latestYear(ind, "crude", sel.c) || ind.years[ind.years.length - 1];
      const m = new Map();
      for (const r of SGG_ALL) { let v = val(ind, "crude", y, r.c); if (v == null) continue; if (a.log) v = Math.log10(Math.max(1, v)); m.set(r.c, v); }
      const xs = [...m.values()]; if (xs.length < 10) return null;
      const mu = xs.reduce((s, x) => s + x, 0) / xs.length;
      const sd = Math.sqrt(xs.reduce((s, x) => s + (x - mu) ** 2, 0) / xs.length) || 1;
      return { ...a, y, m, mu, sd };
    }).filter(Boolean);
    const depQ = (c) => depOf(c)?.q ?? null;
    const zOf = (c) => axv.map((a) => (a.m.has(c) ? (a.m.get(c) - a.mu) / a.sd : null));
    const me = zOf(sel.c), myDep = depQ(sel.c), myLg = leagueOf(sel);
    if (me.every((x) => x == null)) return null;
    const scored = SGG_ALL.filter((r) => r.c !== sel.c && leagueOf(r) === myLg).map((r) => {
      const z = zOf(r.c); let d = 0, n = 0;
      z.forEach((v, i) => { if (v != null && me[i] != null) { d += (v - me[i]) ** 2; n++; } });
      if (!n) return null;
      const dq = depQ(r.c);
      if (myDep != null && dq != null) { d += ((dq - myDep) / 1.5) ** 2; n++; }     // 박탈 5분위도 한 축으로
      return { r, dist: Math.sqrt(d / n) };
    }).filter(Boolean).sort((a, b) => a.dist - b.dist).slice(0, SIZE);
    return { axv, list: scored, myDep, myLg };
  }, [sel, isSgg]);

  if (!isSgg) return null;
  if (!peers || !peers.list.length) return (
    <div className="card"><h3>동류군 비교</h3><div className="empty">여건 자료가 부족해 동류군을 만들 수 없습니다</div></div>
  );

  const y = target ? (latestYear(target, item, sel.c) || target.years[target.years.length - 1]) : null;
  const group = [sel, ...peers.list.map((p) => p.r)];
  const rows = target ? ranked(target, item, y, group) : [];
  const myRank = rows.findIndex((x) => x.r.c === sel.c) + 1 || null;
  const natRows = target ? ranked(target, item, y, SGG_ALL) : [];
  const natRank = natRows.findIndex((x) => x.r.c === sel.c) + 1 || null;
  const gv = (c, a) => { const ind = IND_BY_ID[a.id]; return ind ? val(ind, "crude", a.y, c) : null; };
  const opts = DOMAINS_ALL.flatMap((d) => (IND_BY_DOMAIN[d] || []).map((i) => ({ d, i })));

  return (
    <div className="card span2 peer">
      <h3>동류군 비교 <small className="muted">여건이 비슷한 {peers.list.length}개 시군구 · {peers.myLg === "gun" ? "군 리그" : "도시 리그"}</small></h3>
      <ExportButtons name={`${label(sel)}_동류군비교`} kinds={["csv"]} />
      <div className="desc">
        고령인구비율·재정자립도·인구밀도(로그)·지역박탈 5분위 네 축을 표준화해 거리가 가까운 지역을 고릅니다.
        <b> 보건소는 관할 인구를 선택할 수 없으므로</b>, 여건을 맞춘 뒤 견주는 것이 전국 일괄 순위보다 공정합니다.
      </div>
      <div className="ctrls" style={{ margin: "6px 0 10px" }}>
        <label className="subchip">비교 지표
          <select value={indId} onChange={(e) => setIndId(e.target.value)} style={{ maxWidth: 260 }}>
            {DOMAINS_ALL.map((d) => <optgroup key={d} label={d}>{(IND_BY_DOMAIN[d] || []).map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}</optgroup>)}
          </select>
        </label>
        {target && myRank && (
          <span className="peer-rank">
            동류군 내 <b>{myRank}위</b> / {rows.length} · 전국 <b>{natRank}위</b> / {natRows.length}
            <small className="muted"> ({y}년 {target.name})</small>
          </span>
        )}
      </div>
      <div className="tblscroll">
        <table className="yeartbl">
          <thead><tr>
            <th>지역</th>{peers.axv.map((a) => <th key={a.id}>{a.name}</th>)}<th>박탈분위</th>
            <th>{target ? target.name : ""}</th><th>동류군 순위</th>
          </tr></thead>
          <tbody>
            {rows.map(({ r, v }, i) => (
              <tr key={r.c} className={r.c === sel.c ? "sel" : ""} onClick={() => onPick && onPick(r.c)}>
                <td>{r.c === sel.c ? <b>{label(r)}</b> : label(r)}</td>
                {peers.axv.map((a) => <td key={a.id}>{fmt(gv(r.c, a), a.log ? 0 : 1)}</td>)}
                <td>{depOf(r.c)?.q ?? "–"}</td>
                <td><b>{fmt(v)}</b>{target?.unit}</td>
                <td>{i + 1}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="desc" style={{ marginTop: 6 }}>
        동류군은 통계적 보정이 아니라 <b>비교 대상을 맞추는 방법</b>입니다. 표본이 작은 지표는 순위 차이가 표본오차일 수 있으니 여러 해를 함께 보세요.
      </div>
    </div>
  );
}
