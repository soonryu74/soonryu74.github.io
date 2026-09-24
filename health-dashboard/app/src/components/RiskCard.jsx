import { useMemo, useState } from "react";
import Cite from "./Cite";
import { RISK, COVID, riskOf, riskRank, fmt, label, RBY } from "../data";
import ExportButtons from "./ExportButtons";

const CATS = ["연령", "기저질환", "임신부·영유아", "감염취약시설", "사회적 취약", "예방접종", "감염병", "대응 자원"];
const nf = (v) => (v == null ? "–" : Math.round(v).toLocaleString("ko-KR"));
// 큰 인원은 만 단위로 읽기 쉽게(1,759,963 → 176.0만). 1만 미만은 그대로.
const kf = (v) => (v == null ? "–" : v >= 10000 ? `${(v / 10000).toFixed(1)}만` : Math.round(v).toLocaleString("ko-KR"));
const Big = ({ v }) => <><div className="k-value">{kf(v)}<small> 명</small></div>{v != null && v >= 10000 && <div className="k-exact">{nf(v)}명</div>}</>;

/* 코로나19 실적 참고 — 고위험군 「규모」가 실제 결과와 어떻게 이어졌는지 보여 주는 보조 표.
   자료가 거주지가 아니라 신고 보건소 관할 기준이라 시군구 순위는 내지 않는다(docs/코로나19_시군구_사망률_비교_v1.md). */
function CovidRef({ sel }) {
  if (!COVID?.regions) return null;
  const mine = COVID.regions[sel.c];
  const sido = sel.l === "sgg" && sel.p ? COVID.regions[sel.p] : null;
  const S = COVID.summary; const Q = COVID.age65_quartiles || [];
  const f1 = (v) => (v == null ? "–" : fmt(v)); const f3 = (v) => (v == null ? "–" : v.toFixed(3));
  const row = (name, r, tag) => (
    <tr key={name}>
      <td>{name}{tag && <span className="subchip" style={{ marginLeft: 6 }}>{tag}</span>}</td>
      <td style={{ textAlign: "right" }}>{f1(r?.case_rate)}%</td>
      <td style={{ textAlign: "right" }}>{f1(r?.death_rate)}</td>
      <td style={{ textAlign: "right" }}>{f3(r?.cfr)}%</td>
    </tr>
  );
  return (
    <div className="covidref">
      <h4>코로나19 실적 참고<Cite k="covid" /> <small className="muted">2020.1.20~2023.8.31 전수감시 기간 누적 · 신고 보건소 관할 기준</small></h4>
      <div className="tblscroll">
        <table className="yeartbl covidtbl">
          <thead><tr><th>지역</th><th>확진율(인구 100명당)</th><th>사망(10만 명당)</th><th>치명률(사망÷확진)</th></tr></thead>
          <tbody>
            {mine && row(label(sel), mine, sel.l === "sgg" ? "참고치" : null)}
            {sido && row(RBY.get(sel.p)?.n || "시도", sido)}
            {S && row(`전국 시군구 중앙값`, S)}
          </tbody>
        </table>
      </div>
      {Q.length === 4 && (
        <div className="covidq">
          <div className="desc" style={{ margin: "6px 0 4px" }}><b>65세 이상 비율이 높은 지역일수록, 걸리면 더 많이 사망했습니다.</b> 시군구를 65세 이상 비율로 넷으로 나눈 중앙값:</div>
          <div className="tblscroll">
            <table className="yeartbl covidtbl">
              <thead><tr><th>65세 이상 비율</th><th>확진율</th><th>사망(10만 명당)</th><th>치명률</th></tr></thead>
              <tbody>{Q.map((q, i) => (
                <tr key={i}><td>{i + 1}분위 {q.lo}~{q.hi}%{i === 0 ? " (도시)" : i === 3 ? " (군)" : ""}</td><td style={{ textAlign: "right" }}>{f1(q.case_rate)}%</td><td style={{ textAlign: "right" }}>{f1(q.death_rate)}</td><td style={{ textAlign: "right" }}><b>{f3(q.cfr)}%</b></td></tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}
      <div className="desc indnote" style={{ marginTop: 8 }}>⚠ 사망은 사망 장소(병원)를 관할하는 보건소로 집계되어 <b>상급종합병원이 있는 지역이 높게 나옵니다</b>(부산 서구·대구 남구·광주 동구·서울 종로구 등). 확진도 직장·검사소 위치를 따릅니다(서울 중구 141%). 그래서 시군구 값은 참고치이며 순위를 매기지 않습니다. 시도 값과 전국 중앙값 비교만 권장합니다. 연령별 시군구 자료는 공표되지 않았습니다.</div>
      <div className="desc" style={{ marginTop: 4 }}>출처: {COVID.source}. 분모 인구는 {COVID.pop_year}년 연앙인구(유행기와 연도가 달라 근사).</div>
    </div>
  );
}

/* 감염병 대응 고위험군 규모 (프로파일 카드) */
export default function RiskCard({ sel, pool, poolName }) {
  const rec = riskOf(sel.c);
  const [cat, setCat] = useState("전체");
  const rows = useMemo(() => {
    if (!rec) return [];
    return RISK.groups.filter((g) => rec[g.id]).map((g) => {
      const x = rec[g.id]; const pct = (x.v / rec.pop) * 100;
      const rk = riskRank(g.id, sel.c, pool);
      return { g, v: x.v, y: x.y, pct, rank: rk.rank, n: rk.n, median: rk.median, sum: x.sum };
    });
  }, [rec, sel, pool]);
  if (!rec) {
    return <div className="card span2 risk"><h3>감염병 대응 고위험군</h3><div className="desc">이 지역은 연령별 인구 자료가 없어 표시하지 않습니다.</div></div>;
  }
  const head = (id) => rows.find((r) => r.g.id === id);
  const a65 = head("age65"), ltc = head("ltc_fac_cap"), htn = head("htn_est"), dm = head("dm_est");
  const shown = rows.filter((r) => cat === "전체" || r.g.cat === cat);
  return (
    <div className="card span2 risk">
      <h3>감염병 대응 고위험군<Cite k="risk" /> <small className="muted">(규모 추정 · 집단 간 중복 있음)</small></h3>
      <ExportButtons name={`${label(sel)}_고위험군`} kinds={["list"]} />
      <div className="desc">
        질병관리청 지침(코로나19·인플루엔자·감염취약시설)의 고위험군 정의를 지역 자료로 옮겨 규모를 잡은 것입니다. 인구 기준 {RISK.pop_year}년 연앙인구 {nf(rec.pop)}명.
      </div>
      <details className="method">
        <summary>산출 방법과 읽을 때 주의할 점</summary>
        <p>「실측」은 행정·건강보험 등록 인원이고, 「추정」은 지역사회건강조사 유병률에 해당 연령 인구를 곱한 값입니다.</p>
        <p>집단은 서로 겹칩니다(65세 이상이면서 고혈압인 사람 등). 그래서 타일의 숫자를 더해 「고위험군 총원」을 만들면 안 됩니다.</p>
      </details>
      <div className="hle-grid">
        <div className="kpi">
          <div className="k-label">65세 이상</div>
          <Big v={a65?.v} />
          <div className="k-sub"><span className="kl">인구의 {fmt(a65?.pct)}%</span><span className="kl muted">{poolName} 중 {a65?.rank ?? "–"}위 / {a65?.n}</span></div>
        </div>
        <div className="kpi">
          <div className="k-label">고혈압·당뇨 진단경험자<small>30세 이상 · 유병률로 추정</small></div>
          <Big v={htn || dm ? (htn?.v || 0) + (dm?.v || 0) : null} />
          <div className="k-sub"><span className="kl">고혈압 {kf(htn?.v)} 명</span><span className="kl">당뇨 {kf(dm?.v)} 명</span><span className="kl muted">두 질환을 함께 가진 사람은 두 번 셈</span></div>
        </div>
        <div className="kpi">
          <div className="k-label">장기요양 시설 정원</div>
          <Big v={ltc?.v} />
          <div className="k-sub">{ltc ? <><span className="kl">인구 천 명당 {fmt(ltc.pct * 10)}명</span><span className="kl muted">{poolName} 중 {ltc.rank ?? "–"}위 / {ltc.n}</span></> : "자료 없음"}</div>
        </div>
        <div className="kpi">
          <div className="k-label">임신부·영유아</div>
          <Big v={head("preg") || head("age0_4") ? (head("preg")?.v || 0) + (head("age0_4")?.v || 0) : null} />
          <div className="k-sub"><span className="kl">등록 임산부 {kf(head("preg")?.v)} 명</span><span className="kl">0~4세 {kf(head("age0_4")?.v)} 명</span></div>
        </div>
      </div>
      <div className="seg" style={{ margin: "8px 0", flexWrap: "wrap" }}>
        {["전체", ...CATS].map((c) => <button key={c} className={`seg-btn ${cat === c ? "on" : ""}`} onClick={() => setCat(c)}>{c}</button>)}
      </div>
      <div className="tblscroll">
        <table className="yeartbl">
          <thead><tr><th>집단</th><th>구분</th><th>인원</th><th>인구 대비</th><th>{poolName} 순위(비율)</th><th>중앙값</th><th>자료 연도</th><th>출처</th></tr></thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.g.id}>
                <td>{r.g.name}</td>
                <td>{r.g.cat} · {r.g.est ? <span className="subchip">추정</span> : <span className="subchip">실측</span>}</td>
                <td style={{ textAlign: "right", fontWeight: 600 }}>{nf(r.v)}</td>
                <td style={{ textAlign: "right" }}>{r.g.id === "ltc_fac_n" || r.g.id === "ltc_hosp" ? "–" : `${fmt(r.pct)}%`}</td>
                <td style={{ textAlign: "right" }}>{r.rank ? `${r.rank} / ${r.n}` : "–"}</td>
                <td style={{ textAlign: "right" }}>{r.median != null ? `${fmt(r.median)}%` : "–"}</td>
                <td>{r.y}{r.sum ? " (시군구 합)" : ""}</td>
                <td className="muted" title={r.g.method}>{r.g.src} <span className="hint">ⓘ</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <CovidRef sel={sel} />
      <div className="desc" style={{ marginTop: 6 }}>순위는 인구 대비 비율이 높은 순입니다(고위험군 비중이 큰 지역이 1위). 요양병원·장기요양 기관 수는 비율을 내지 않습니다.</div>
      <div className="desc">시군구 자료가 없어 빠진 집단: 정신의료기관 입원자 · 투석 환자 · 만성폐질환자 · 노숙인 · 의료 종사자.</div>
    </div>
  );
}
