import { useMemo, useState } from "react";
import { INDICATORS, DOMAINS, fmt, val, latestYear, percentile, ranked, poolFor, label, RBY } from "../data";

/* 지역 프로파일: 전 지표 백분위 → 영역 점수 · 강점 TOP5 · 개선 TOP · 전체 지표표 */
export default function Profile({ item, sel, scope, onPick }) {
  const pool = poolFor(sel, scope);
  const poolName = sel.l === "sido" ? "17개 시도" : scope === "sido" ? `${RBY.get(sel.p).n} 시군구` : "전국 시군구";

  const rows = useMemo(() => INDICATORS.map((ind) => {
    const y = latestYear(ind, item, sel.c);
    if (y == null) return null;
    const v = val(ind, item, y, sel.c);
    const rk = ranked(ind, item, y, pool);
    const pct = ind.bad == null ? null : percentile(ind, v, rk.map((x) => x.v));
    const rank = rk.findIndex((x) => x.r.c === sel.c) + 1;
    // 5년(또는 가능한 최장) 변화: 방향 보정해 "개선폭"으로
    const yi = ind.years.indexOf(y);
    let base = null, baseY = null;
    for (let k = Math.max(0, yi - 5); k < yi; k++) {
      const b = val(ind, item, ind.years[k], sel.c);
      if (b != null) { base = b; baseY = ind.years[k]; break; }
    }
    const delta = base == null ? null : v - base;
    const improve = delta == null || ind.bad == null ? null : ind.bad ? -delta : delta;
    return { ind, y, v, pct, rank, n: rk.length, delta, baseY, improve };
  }).filter(Boolean), [item, sel, pool]);

  const scored = rows.filter((r) => r.pct != null);
  const domainScore = DOMAINS.map((d) => {
    const rs = scored.filter((r) => r.ind.domain === d);
    return { d, score: rs.length ? rs.reduce((a, r) => a + r.pct, 0) / rs.length : null, n: rs.length };
  });
  const overall = scored.length ? scored.reduce((a, r) => a + r.pct, 0) / scored.length : null;
  const strengths = [...scored].sort((a, b) => b.pct - a.pct).slice(0, 5);
  const improved = rows.filter((r) => r.improve != null).sort((a, b) => b.improve - a.improve).slice(0, 5);
  const weak = [...scored].sort((a, b) => a.pct - b.pct).slice(0, 5);
  const [showWeak, setShowWeak] = useState(false);

  const tone = (p) => (p == null ? "" : p >= 75 ? "t-high" : p >= 50 ? "t-mid" : p >= 25 ? "t-low" : "t-min");

  return (
    <div className="profile">
      <div className="card prof-head">
        <div>
          <div className="prof-name">{label(sel)}</div>
          <div className="desc">{poolName} 대비 백분위(높을수록 양호) · 지표별 최신 연도 기준 · {rows.length}개 지표</div>
        </div>
        <div className="prof-score">
          <div className="k-label">종합 양호도</div>
          <div className="k-value">{overall == null ? "–" : Math.round(overall)}<small> / 100</small></div>
        </div>
      </div>

      <div className="grid2">
        <div className="card">
          <h3>영역별 양호도</h3>
          <div className="desc">영역 내 지표 백분위 평균</div>
          <div className="domains">
            {domainScore.map(({ d, score, n }) => (
              <div key={d} className="drow">
                <div className="dl">{d} <small>{n}</small></div>
                <div className="bar-track"><div className={`bar ${tone(score)}`} style={{ width: `${score ?? 0}%` }} /></div>
                <div className="rv">{score == null ? "–" : Math.round(score)}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3>강점 TOP 5</h3>
          <div className="desc">백분위가 가장 높은 지표 — 이 지역이 이미 잘하고 있는 것</div>
          <div className="badges">
            {strengths.map((r) => (
              <button key={r.ind.id} className={`badge-card ${tone(r.pct)}`} onClick={() => onPick(r.ind, r.y)}>
                <div className="b-name">{r.ind.name}</div>
                <div className="b-val">{fmt(r.v)}<small>{r.ind.unit}</small></div>
                <div className="b-sub">상위 {Math.max(1, Math.round(100 - r.pct))}% · {r.rank}/{r.n}위 · {r.y}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <h3>가장 개선된 지표 TOP 5</h3>
          <div className="desc">최근 5년 방향 보정 개선폭(%p) — "올해 가장 건강해진" 후보</div>
          <div className="badges">
            {improved.map((r) => (
              <button key={r.ind.id} className={`badge-card ${r.improve > 0 ? "t-high" : "t-low"}`} onClick={() => onPick(r.ind, r.y)}>
                <div className="b-name">{r.ind.name}</div>
                <div className="b-val">{r.improve > 0 ? "+" : ""}{fmt(r.improve)}<small>%p</small></div>
                <div className="b-sub">{r.baseY}→{r.y} · {fmt(r.v - r.delta)}→{fmt(r.v)}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <h3>개선 과제 <small className="muted">(지자체 참고용)</small></h3>
          <div className="desc">백분위가 낮은 지표 — 공개 화면에서는 비공개 원칙(랭킹 기획안)</div>
          {!showWeak ? (
            <button className="themebtn" onClick={() => setShowWeak(true)}>펼쳐 보기</button>
          ) : (
            <div className="badges">
              {weak.map((r) => (
                <button key={r.ind.id} className={`badge-card ${tone(r.pct)}`} onClick={() => onPick(r.ind, r.y)}>
                  <div className="b-name">{r.ind.name}</div>
                  <div className="b-val">{fmt(r.v)}<small>{r.ind.unit}</small></div>
                  <div className="b-sub">하위 {Math.max(1, Math.round(r.pct))}% · {r.rank}/{r.n}위 · {r.y}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <h3>전체 지표</h3>
        <div className="desc">행을 누르면 해당 지표 분석 화면으로 이동합니다</div>
        <div className="tblscroll">
          <table className="proftbl">
            <thead><tr><th>영역</th><th>지표</th><th>연도</th><th>값</th><th>순위</th><th>백분위</th><th>5년 변화</th></tr></thead>
            <tbody>
              {DOMAINS.map((d) => rows.filter((r) => r.ind.domain === d).sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1)).map((r, k) => (
                <tr key={r.ind.id} onClick={() => onPick(r.ind, r.y)}>
                  <td className="muted">{k === 0 ? d : ""}</td>
                  <td>{r.ind.name}</td>
                  <td>{r.y}</td>
                  <td><b>{fmt(r.v)}</b></td>
                  <td>{r.rank}/{r.n}</td>
                  <td>
                    <div className="pctcell">
                      <div className="bar-track"><div className={`bar ${tone(r.pct)}`} style={{ width: `${r.pct ?? 0}%` }} /></div>
                      <span>{r.pct == null ? "중립" : Math.round(r.pct)}</span>
                    </div>
                  </td>
                  <td className={r.improve == null ? "" : r.improve > 0 ? "k-good" : r.improve < 0 ? "k-bad" : ""}>
                    {r.delta == null ? "–" : (r.delta > 0 ? "+" : "") + fmt(r.delta) + "%p"}
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
