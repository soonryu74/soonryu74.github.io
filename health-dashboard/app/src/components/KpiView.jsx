import { useMemo, useState } from "react";
import { KHEPI, KHEPI_INDS, val, fmt, label, RBY, SGG_ALL, SGG_BY_SIDO, SIDOS, nationalMedian, ranked, quantile } from "../data";
import ExportButtons from "./ExportButtons";
import { saveCsvRows } from "../export";

/* 통합건강증진사업 핵심성과지표 — 보건복지부 「지역사회 통합건강증진사업 안내」의 16개 결과지표를
   지역별로 보여주고, 안내서가 제시한 목표치 설정법 5종을 그대로 계산해 준다.
   평가 산식: 목표달성률 = 최근 3개년 평균 실적 ÷ 자체 목표값 (하향지표는 목표÷실적).
   득점 구간(핵심성과지표 8점): 95%↑ 8 / 90%↑ 7 / 85%↑ 6 / 그 미만 5. */
const N_ASSUMED = 900;                         // 지역사회건강조사 시군구당 표본 약 900명
const Z_MDD = 2.80;                            // α=.05 양측, 검정력 80%

const score = (rate) => (rate == null ? null : rate >= 95 ? 8 : rate >= 90 ? 7 : rate >= 85 ? 6 : 5);

export default function KpiView({ item, sel, onPick }) {
  const isSgg = sel.l === "sgg";
  const sidoCode = isSgg ? sel.p : sel.c;
  const pool = SGG_ALL, sidoPool = SGG_BY_SIDO[sidoCode] || [];
  const rows = useMemo(() => KHEPI_INDS.map((k) => {
    if (!k.ind) return { ...k, missing: true };
    const ind = k.ind;
    const ys = ind.years.filter((y) => val(ind, item, y, sel.c) != null);
    const last = ys[ys.length - 1];
    const last3 = ys.slice(-3);
    const vs = last3.map((y) => val(ind, item, y, sel.c));
    const avg3 = vs.length ? vs.reduce((a, b) => a + b, 0) / vs.length : null;
    const v = last != null ? val(ind, item, last, sel.c) : null;
    const med = last != null ? nationalMedian(ind, item, last) : null;
    const sidoVals = sidoPool.map((r) => val(ind, item, last, r.c)).filter((x) => x != null);
    const sidoAvg = sidoVals.length ? sidoVals.reduce((a, b) => a + b, 0) / sidoVals.length : null;
    const rk = last != null ? ranked(ind, item, last, pool) : [];
    const myRank = rk.findIndex((x) => x.r.c === sel.c) + 1 || null;
    // 전국 시군구 분포의 상위 50%·75% 값(방향 반영)
    const sorted = rk.map((x) => x.v);                    // 이미 양호한 순
    const top50 = sorted.length ? sorted[Math.floor(sorted.length * 0.5)] : null;
    const top25 = sorted.length ? sorted[Math.floor(sorted.length * 0.25)] : null;
    // 최근 3년 연평균 변화량
    const slope = last3.length >= 2 ? (vs[vs.length - 1] - vs[0]) / (last3[last3.length - 1] - last3[0]) : null;
    const p = v != null ? Math.min(0.99, Math.max(0.01, v / 100)) : null;
    const mdd = p != null ? Z_MDD * Math.sqrt(2) * Math.sqrt((p * (1 - p)) / N_ASSUMED) * 100 : null;
    return { ...k, ind, last, v, avg3, med, sidoAvg, myRank, nRank: rk.length, top50, top25, slope, mdd, years3: last3 };
  }), [item, sel, sidoCode]);

  const [openId, setOpenId] = useState(null);
  const [target, setTarget] = useState("");
  const cur = rows.find((r) => r.ind && r.ind.id === openId) || null;
  const bad = cur?.ind?.bad === true;
  const rate = cur && cur.avg3 != null && +target > 0 ? (bad ? (+target / cur.avg3) * 100 : (cur.avg3 / +target) * 100) : null;

  const suggest = (r) => {
    if (!r || r.v == null) return [];
    const dir = r.ind.bad ? -1 : 1;
    const out = [];
    if (r.slope != null) out.push(["희망 변화율 적용", r.v + r.slope, `최근 3년 연평균 변화 ${fmt(r.slope, 2)}${r.ind.unit}/년을 1년 더 적용`]);
    if (r.mdd != null) out.push(["통계적 검증", r.v + dir * r.mdd, `표본 ${N_ASSUMED}명 가정, 통계적으로 구별되는 최소 변화 ${fmt(r.mdd, 2)}${r.ind.unit}`]);
    if (r.med != null) out.push(["국가 기준 차용", r.med, "전국 시군구 중앙값"]);
    if (r.sidoAvg != null) out.push(["지역 간 평균", r.sidoAvg, `${RBY.get(sidoCode)?.n || ""} 시군구 평균`]);
    if (r.top50 != null) out.push(["상위 50% 값", r.top50, "전국 시군구 분포의 상위 50% 지점"]);
    if (r.top25 != null) out.push(["상위 25% 값", r.top25, "전국 시군구 분포의 상위 25% 지점(도전적 목표)"]);
    return out;
  };

  const dlCsv = () => {
    const head = ["지표", "보유", "최근연도", "최근값", "최근3개년평균", "전국중앙값", "소속시도평균", "전국순위", "분모", "상위50%", "상위25%", "연평균변화", "최소검출차이"];
    const body = rows.map((r) => r.missing
      ? [r.kpi, "미보유(건보공단 자료)", "", "", "", "", "", "", "", "", "", "", ""]
      : [r.kpi, "보유", r.last ?? "", fmt(r.v), fmt(r.avg3), fmt(r.med), fmt(r.sidoAvg), r.myRank ?? "", r.nRank, fmt(r.top50), fmt(r.top25), fmt(r.slope, 2), fmt(r.mdd, 2)]);
    saveCsvRows([head, ...body], `${label(sel)}_통합건강증진사업_핵심성과지표`);
  };

  return (
    <div className="kpiview">
      <div className="card">
        <h3>통합건강증진사업 핵심성과지표 <small className="muted">{label(sel)} · 16개 전량 결과지표</small></h3>
        <div className="desc">
          보건복지부 「지역사회 통합건강증진사업 안내」가 정한 핵심성과지표입니다. 보건소는 광역 공통지표 2개(건강생활실천율 필수)와 자체 지표 1개 이상, <b>총 3개 이상</b>을 골라 <b>2년 이상</b> 관리합니다.
          평가 산식은 <b>최근 3개년 평균 실적 ÷ 자체 목표값</b>이며, 득점은 95% 이상 8점, 90% 이상 7점, 85% 이상 6점, 그 미만 5점입니다.
          16개 중 <b>13개를 이 대시보드가 시군구·연도별로 보유</b>하고 있습니다. 모유수유 실천율과 고혈압·당뇨 투약 순응률 3종은 국민건강보험공단 자료라 아직 없습니다.
        </div>
        <div className="kpi-actions"><button className="themebtn" onClick={dlCsv}>↓ CSV 내려받기</button></div>
        <div className="tblscroll">
          <table className="yeartbl kpitbl">
            <thead><tr>
              <th>핵심성과지표</th><th>최근값</th><th>3개년 평균</th><th>전국 중앙값</th><th>시도 평균</th><th>전국 순위</th><th>목표 제안</th>
            </tr></thead>
            <tbody>
              {rows.map((r) => r.missing ? (
                <tr key={r.kpi} className="kpi-miss"><td>{r.kpi}</td><td colSpan={6}>미보유 · 자료원 국민건강보험공단</td></tr>
              ) : (
                <tr key={r.kpi} className={openId === r.ind.id ? "sel" : ""} onClick={() => { setOpenId(openId === r.ind.id ? null : r.ind.id); setTarget(""); }}>
                  <td>{r.kpi} <small className="muted">{r.ind.bad ? "↓" : "↑"}</small></td>
                  <td><b>{fmt(r.v)}</b><small className="muted"> {r.last}</small></td>
                  <td>{fmt(r.avg3)}<small className="muted"> {r.years3[0]}–{r.years3[r.years3.length - 1]}</small></td>
                  <td>{fmt(r.med)}</td>
                  <td>{fmt(r.sidoAvg)}</td>
                  <td>{r.myRank ?? "–"}<small className="muted"> / {r.nRank}</small></td>
                  <td className="kpi-open">{openId === r.ind.id ? "닫기 ▲" : "펼치기 ▼"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {cur && (
        <div className="card">
          <h3>{cur.kpi} — 목표치 설정 <small className="muted">안내서 제시 방법 5종</small></h3>
          <div className="desc">
            {cur.last}년 {label(sel)} 값 <b>{fmt(cur.v)}{cur.ind.unit}</b> · 최근 3개년 평균 <b>{fmt(cur.avg3)}{cur.ind.unit}</b> · {cur.ind.bad ? "낮을수록 양호" : "높을수록 양호"}
            {" · "}<a href="#" onClick={(e) => { e.preventDefault(); onPick && onPick(cur.ind, cur.last); }}>지표 분석에서 보기</a>
          </div>
          <div className="tblscroll">
            <table className="yeartbl">
              <thead><tr><th>설정 방법</th><th>제안 목표치</th><th>현재값 대비</th><th>근거</th></tr></thead>
              <tbody>
                {suggest(cur).map(([name, v, why]) => (
                  <tr key={name} onClick={() => setTarget(v.toFixed(1))}>
                    <td>{name}</td><td><b>{fmt(v)}</b>{cur.ind.unit}</td>
                    <td>{v - cur.v > 0 ? "+" : ""}{fmt(v - cur.v)}</td>
                    <td className="muted">{why}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="kpi-calc">
            <label>목표값 입력 <input type="number" step="0.1" value={target} onChange={(e) => setTarget(e.target.value)} placeholder={fmt(cur.med)} /></label>
            {rate != null && (
              <span className="kpi-rate">
                목표달성률 <b>{fmt(rate, 1)}%</b> → 핵심성과지표 득점 <b>{score(rate)}점</b> / 8점
                <small className="muted"> (최근 3개년 평균 {fmt(cur.avg3)} 기준{cur.ind.bad ? ", 하향지표는 목표÷실적" : ""})</small>
              </span>
            )}
          </div>
          <div className="desc" style={{ marginTop: 6 }}>
            ⚠ 「통계적 검증」은 시군구 표본을 {N_ASSUMED}명으로 가정한 근사입니다. 이보다 작은 변화는 실제 변화인지 표본오차인지 구별할 수 없습니다.
            목표를 낮게 잡으면 달성률이 올라가는 구조이므로, 안내서도 최근 실적보다 낮은 목표 설정을 금지합니다.
          </div>
        </div>
      )}

      <div className="card">
        <h3>이 화면의 근거</h3>
        <div className="desc">
          {KHEPI.source}<br />
          {KHEPI.note}<br />
          목표치 설정 방법: {(KHEPI.targets || []).join(" · ")}<br />
          평가체계 분석은 docs/지역보건사업_평가이론_v1.md 를 참고하세요.
        </div>
      </div>
    </div>
  );
}
