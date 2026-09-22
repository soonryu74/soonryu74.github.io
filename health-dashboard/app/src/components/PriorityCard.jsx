import { useMemo, useState } from "react";
import { INDICATORS, EVIDENCE, evidenceVerdict, ranked, fmt } from "../data";
import { Badge } from "./EvidencePanel";

const ORDER = { now: 0, thin: 1, cpstf: 2, stale: 3, none: 4 };
const DESC = {
  now: "나쁘고, 10년 이내 갱신된 NICE 직접 지침이 있음",
  thin: "해야 하지만 부분 연결뿐 — 평가 설계를 함께",
  cpstf: "NICE는 없고 CPSTF만 있음",
  stale: "CPSTF만 있고 판정이 15년 넘음 — 제도형 외 참고만",
  none: "어느 근거원에도 없음 — 국내 자체 근거 필요",
};

export default function PriorityCard({ scored, item, pool, onPick }) {
  const [cut, setCut] = useState(30);
  const rows = useMemo(() => scored.filter((r) => r.pct != null && r.pct < cut).map((r) => {
    const rs = ranked(r.ind, item, r.y, pool);
    const vs = rs.map((x) => x.v).filter((x) => x != null);
    const gap = vs.length ? Math.max(...vs) - Math.min(...vs) : null;
    const med = vs.length ? [...vs].sort((a, b) => a - b)[Math.floor(vs.length / 2)] : null;
    return { ...r, gap, med, verdict: evidenceVerdict(r.ind.id) };
  }).sort((a, b) => (ORDER[a.verdict.key] - ORDER[b.verdict.key]) || (a.pct - b.pct)), [scored, item, pool, cut]);
  const groups = rows.reduce((m, r) => { (m[r.verdict.key] ||= []).push(r); return m; }, {});
  const gaps = EVIDENCE.gaps, byId = Object.fromEntries(INDICATORS.map((i) => [i.id, i.name]));

  return (
    <div className="card span2 prio">
      <h3>무엇부터 손댈 것인가 <small className="muted">(하위 {cut}% 지표 × 현행 근거)</small></h3>
      <div className="desc">
        축 1 <b>부담</b>(백분위) · 축 2 <b>격차</b>(전국 최대−최소) · 축 3 <b>수단</b>(NICE 현행 지침 유무와 갱신 연도). 나쁘고, 격차가 크고, 검증된 수단이 있는 지표가 위로 옵니다.
        <span className="cutsel"> 기준 <select value={cut} onChange={(e) => setCut(Number(e.target.value))}><option value={25}>하위 25%</option><option value={30}>하위 30%</option><option value={40}>하위 40%</option></select></span>
      </div>
      {!rows.length ? <div className="empty">하위 {cut}% 지표가 없습니다</div> : (
        <table className="priotbl">
          <thead><tr><th>지표</th><th className="num">값</th><th className="num">전국 중앙</th><th className="num">백분위</th><th className="num">격차</th><th>현행 근거</th></tr></thead>
          <tbody>
            {Object.keys(ORDER).filter((k) => groups[k]).map((k) => [
              <tr key={"h" + k} className={`prio-g v-${k}`}><td colSpan={6}><b>{groups[k][0].verdict.label}</b> · {groups[k].length}개 <span className="muted">— {DESC[k]}</span></td></tr>,
              ...groups[k].map((r) => (
                <tr key={r.ind.id} className={`v-${k}`} onClick={() => onPick(r.ind, r.y)} title="지표 분석으로 이동">
                  <td>{r.ind.name}</td>
                  <td className="num k-bad">{fmt(r.v)}{r.ind.unit}</td>
                  <td className="num muted">{r.med == null ? "–" : fmt(r.med)}</td>
                  <td className="num">{Math.max(1, Math.round(r.pct))}</td>
                  <td className="num muted">{r.gap == null ? "–" : fmt(r.gap) + (r.ind.unit === "%" ? "%p" : "")}</td>
                  <td className="evcell">
                    {r.verdict.guides?.slice(0, 2).map((g) => <span key={g.code} className="evmini"><Badge k="권고" n={g.recs["권고"]} /> {g.code} · 갱신 <b className={EVIDENCE.now_year - Number(g.last_updated.slice(0, 4)) <= 5 ? "fresh" : ""}>{g.last_updated.slice(0, 4)}</b></span>)}
                    {r.verdict.cpstf && <span className="evmini muted">CPSTF 「{r.verdict.cpstf.topic_ko}」 판정 중앙 {r.verdict.cpstf.median_year}년</span>}
                    {r.verdict.key === "none" && <span className="evmini muted">NICE·CPSTF 모두 없음</span>}
                  </td>
                </tr>
              )),
            ])}
          </tbody>
        </table>
      )}
      <details className="evgaps">
        <summary>근거가 비어 있는 곳 — 전체 {EVIDENCE.counts.total}개 지표 중 NICE {EVIDENCE.counts.nice_linked} · CPSTF {EVIDENCE.counts.cpstf_linked} · 합집합 {EVIDENCE.counts.union}</summary>
        <div className="evgaprow"><b>어디에도 없음 {gaps.none.length}</b> {gaps.none.map((i) => byId[i]).join(" · ")} <span className="muted">— 국내 자체 근거 후보</span></div>
        <div className="evgaprow"><b>CPSTF에만 있고 낡음 {gaps.cpstf_only.length}</b> {gaps.cpstf_only.map((i) => byId[i]).join(" · ")} <span className="muted">— 교통사고 손상, 판정 중앙 2000년</span></div>
        <div className="evgaprow"><b>NICE에만 있음 {gaps.nice_only.length}</b> {gaps.nice_only.map((i) => byId[i]).join(" · ")} <span className="muted">— NG44 지역사회 참여</span></div>
        <div className="evgaprow muted">NICE에 성인 음주 예방 현행 지침이 없어 음주 3개 지표는 부분 연결(청소년 NG135)입니다.</div>
      </details>
    </div>
  );
}
