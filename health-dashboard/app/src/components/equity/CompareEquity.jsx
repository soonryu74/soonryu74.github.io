import { RBY, fmt, label, depOf } from "../../data";
import { assess, priorityFor } from "../../lib/equity";
import { TierBadge } from "./EquityPriorityCard";
import IndInfo from "./IndInfo";

/* 지역 비교 「형평성 요약 비교」 — 담긴 지역(전국 중앙값 제외)을 한 표로: 현재 수준 · 전국 중앙값 대비 차이 · 최근 추세 · 상대순위 · 박탈지수 · 우선 검토 지표.
   레이더 차트 대신 기존 UI에 맞춘 표 + 작은 막대. */
const du = (u) => (u === "%" ? "%p" : u ? ` ${u}` : "");

export default function CompareEquity({ ind, item, codes, onRegionProfile }) {
  const regs = codes.map((c) => RBY.get(c)).filter(Boolean);
  if (!regs.length) return null;
  const rows = regs.map((r) => ({ r, a: assess(ind, r, item, { smooth: 1 }), p: priorityFor(r, item, { smooth: 3 }), dep: r.l === "sgg" ? depOf(r.c) : null }));
  const maxAbs = Math.max(...rows.map((x) => Math.abs(x.a.gap?.abs ?? 0)), 1e-9);
  const directional = ind.direction !== "context";
  return (
    <div className="card">
      <h3>형평성 요약 비교 <small className="muted">{ind.name}<IndInfo ind={ind} /> · 지역별 우선 검토 지표</small></h3>
      <div className="desc">현재 지표는 각 지역의 최신 연도 값, 우선 검토 지표는 지역 프로파일과 같은 계산(지역사회건강조사 지표, 3년 평균)입니다.{regs.length < 2 ? " 2곳 이상 담으면 나란히 비교됩니다." : ""}</div>
      <div className="tblscroll"><table className="yeartbl ceq">
        <thead><tr><th>지역</th><th>현재 수준</th><th>전국 중앙값 대비</th><th>최근 추세</th><th>상대순위</th><th>박탈지수</th><th>우선 검토 지표</th></tr></thead>
        <tbody>
          {rows.map(({ r, a, p, dep }) => {
            const g = a.gap;
            const w = g ? Math.round((Math.abs(g.abs) / maxAbs) * 100) : 0;
            const side = !directional || !g ? "" : g.dirAbs > 0 ? "bad" : g.dirAbs < 0 ? "good" : "";
            return (
              <tr key={r.c}>
                <td><button type="button" className="linkbtn" onClick={() => onRegionProfile && onRegionProfile(r.c)} title="이 지역 프로파일 보기">{label(r)}</button></td>
                <td>{a.v == null ? "–" : <><b>{fmt(a.v)}{ind.unit}</b> <small className="muted">{a.y}년</small></>}</td>
                <td className="ceq-gap">{g ? <>
                  <span className={`ceq-bar ${side}`} style={{ width: `${Math.max(4, w)}%` }} aria-hidden="true" />
                  <span>{g.abs > 0 ? "+" : g.abs < 0 ? "−" : "±"}{fmt(Math.abs(g.abs))}{du(ind.unit)} {side === "bad" ? "· 불리" : side === "good" ? "· 양호" : directional ? "" : "· 방향 없음"}</span>
                </> : "–"}</td>
                <td>{a.trendCls ? `${a.trendCls.label}` : a.trend ? "–" : "평가 안 함"}{a.trend && <small className="muted"> {a.trend.slope > 0 ? "▲" : a.trend.slope < 0 ? "▼" : ""}{fmt(Math.abs(a.trend.slope), 2)}/년</small>}</td>
                <td>{a.pos ? (a.pos.n <= 30 ? `${a.pos.n}곳 중 ${a.pos.rank}위` : `${a.pos.rank}/${a.pos.n}위 · ${a.band?.label}`) : "–"}</td>
                <td>{dep?.q ? `${dep.q}분위` : r.l === "sido" ? "해당 없음" : "–"}</td>
                <td className="ceq-top">{p.top.length ? p.top.map((t) => <div key={t.id}><TierBadge tier={t.tier} /> {t.name}</div>) : <span className="muted">뚜렷이 불리한 지표 없음</span>}</td>
              </tr>
            );
          })}
        </tbody>
      </table></div>
      <div className="desc">순위는 표본오차 때문에 이웃한 순위 차이가 작을 수 있습니다. 박탈지수는 시군구 단위(5 = 가장 박탈)이며 지표와 함께 놓고 볼 뿐 원인 관계를 뜻하지 않습니다.</div>
    </div>
  );
}
