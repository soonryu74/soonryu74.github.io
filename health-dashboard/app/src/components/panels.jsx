import { fmt, rankSorted } from "../lib";

/* KPI 4장: 현재값, 전국 중앙값, 순위, 시도 격차 */
export function KpiCards({ d, indName, region, year, yearIdx }) {
  const rv = d.sido[region][yearIdx], nv = d.national[yearIdx];
  const prev = yearIdx > 0 ? d.sido[region][yearIdx - 1] : null;
  const delta = prev == null || rv == null ? null : rv - prev;
  const sorted = rankSorted(Object.keys(d.sido), d, yearIdx);
  const rankPos = sorted.findIndex(([s]) => s === region) + 1;
  const deltaCls = delta == null ? "" :
    (delta > 0) === d.bad ? "k-delta-up" : "k-delta-down";
  const gap = sorted.length ? sorted[sorted.length - 1][1] - sorted[0][1] : null;

  return (
    <div className="kpis">
      <div className="kpi">
        <div className="k-label">{region} · {indName}</div>
        <div className="k-value">{fmt(rv)}<small> {d.unit}</small></div>
        <div className={`k-sub ${deltaCls}`}>
          {delta == null ? "" : `${delta > 0 ? "▲" : "▼"} 전년 대비 ${fmt(Math.abs(delta))}%p`}
        </div>
      </div>
      <div className="kpi">
        <div className="k-label">전국 중앙값 ({year})</div>
        <div className="k-value">{fmt(nv)}<small> {d.unit}</small></div>
        <div className="k-sub">{rv == null || nv == null ? "" : `${region}과의 차이 ${fmt(rv - nv)}%p`}</div>
      </div>
      <div className="kpi">
        <div className="k-label">전국 순위 (양호한 순)</div>
        <div className="k-value">{rankPos > 0 ? rankPos : "–"}<small> / {sorted.length}</small></div>
        <div className="k-sub">{d.bad ? "낮을수록 양호" : "높을수록 양호"}</div>
      </div>
      <div className="kpi">
        <div className="k-label">시도 격차 ({year})</div>
        <div className="k-value">{fmt(gap)}<small> %p</small></div>
        <div className="k-sub">{sorted.length ? `${sorted[0][0]} ↔ ${sorted[sorted.length - 1][0]}` : ""}</div>
      </div>
    </div>
  );
}

/* 시도 순위 막대 */
export function RankList({ d, sido, region, yearIdx, onSelect }) {
  const sorted = rankSorted(sido, d, yearIdx);
  const max = Math.max(...sorted.map(([, v]) => v));
  return (
    <div className="rank">
      {sorted.map(([s, v], k) => (
        <div key={s} className={`rrow ${s === region ? "sel" : ""}`} onClick={() => onSelect(s)}>
          <div className="rn">{k + 1}</div>
          <div className="rl">{s}</div>
          <div className="bar-track"><div className="bar" style={{ width: `${((v / max) * 100).toFixed(1)}%` }} /></div>
          <div className="rv">{fmt(v)}</div>
        </div>
      ))}
    </div>
  );
}

/* 표로 보기 */
export function DataTable({ d, sido, year, yearIdx }) {
  const sorted = rankSorted(sido, d, yearIdx);
  const nv = d.national[yearIdx];
  return (
    <div className="tblscroll">
      <table>
        <thead>
          <tr><th>지역</th><th>순위</th><th>{year}년 ({d.unit})</th><th>전국 중앙값 대비</th></tr>
        </thead>
        <tbody>
          {sorted.map(([s, v], k) => (
            <tr key={s}>
              <td>{s}</td><td>{k + 1}</td><td>{fmt(v)}</td>
              <td>{nv == null ? "–" : fmt(v - nv) + "%p"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
