import { HLE, DEP, depOf, fmt, label } from "../data";

/* 산출 예시 — 선택한 지역의 실제 숫자로 산식을 그대로 보여 준다.
   목적(소유자 지시 2026-09-19): "누구나 재현 가능토록 옆에 산출예시 산식을 넣어".
   저장된 중간값(deprivation.json 의 v·z, hle.json 의 good·or·pr)을 그대로 쓰므로
   화면의 숫자만으로 계산을 검산할 수 있다. */

/* ── 지역박탈지수: 변수별 z점수와 단순합 ── */
export function DepCalc({ code, name }) {
  const d = depOf(code);
  if (!d || !d.v) return null;
  const vars = DEP.vars || [];
  const sum = vars.reduce((s, v) => s + (d.z?.[v.id] ?? 0), 0);
  return (
    <details className="calc">
      <summary>산출 예시 — {name} 숫자로 직접 검산</summary>
      <div className="calc-f">
        z<sub>j</sub> = (우리 지역 값 − 전국 시군구 평균) ÷ 표준편차 &nbsp;→&nbsp; <b>박탈지수 = Σ z<sub>j</sub></b>
      </div>
      <table className="calc-t">
        <thead><tr><th>변수</th><th>우리 값</th><th>전국 평균</th><th>표준편차</th><th>z</th></tr></thead>
        <tbody>
          {vars.map((v) => {
            const x = d.v[v.id], z = d.z?.[v.id];
            return (
              <tr key={v.id}>
                <td className="c-lab">{v.label}</td>
                <td>{fmt(x)}</td><td>{fmt(v.mean)}</td><td>{fmt(v.sd)}</td>
                <td className={`c-z ${z > 0 ? "pos" : "neg"}`}>
                  {z > 0 ? "+" : ""}{fmt(z, 2)}
                </td>
              </tr>
            );
          })}
          <tr className="c-sum">
            <td colSpan={4}>합계 = 지역박탈지수</td>
            <td className={sum > 0 ? "pos" : "neg"}>{sum > 0 ? "+" : ""}{fmt(sum, 2)}</td>
          </tr>
        </tbody>
      </table>
      <div className="calc-n">
        예: 첫 줄은 ({fmt(d.v[vars[0].id])} − {fmt(vars[0].mean)}) ÷ {fmt(vars[0].sd)} = {fmt(d.z?.[vars[0].id], 2)}.
        저장값 <b>{fmt(d.idx, 2)}</b> (반올림 차이로 합계와 0.01 정도 다를 수 있음) · 전국 {d.n}개 중 {d.rank}위 · {d.q}분위.
        모든 변수는 {DEP.year}년 인구주택총조사 집계표이며, 가중치 없이 단순합합니다.
      </div>
    </details>
  );
}

/* ── 건강수명: 오즈비 보정 → Sullivan → 검산 ── */
export function HleCalc({ code, year, name }) {
  const r = HLE.regions?.[code]?.y?.[String(year)];
  if (!r) return null;
  const u = 100 - r.good;                      // 불건강률(주관적) %
  // 저장된 오즈비 r 과 우리 지역 u 로 전국 기준 u0 를 역산해 보여 준다(검산용)
  const odds = u / (100 - u);
  const odds0 = r.or ? odds / r.or : null;
  const u0 = odds0 != null ? (odds0 / (1 + odds0)) * 100 : null;
  const unhealthyYears = r.le - r.hle;
  return (
    <details className="calc">
      <summary>산출 예시 — {name} {year}년 숫자로 직접 검산</summary>
      <div className="calc-f">
        HLE<sub>x</sub> = Σ<sub>i≥x</sub> L<sub>i</sub> (1 − π<sub>i</sub>) ÷ l<sub>x</sub> &nbsp;(Sullivan)
        &nbsp;·&nbsp; π<sub>i</sub>(지역) = r·π<sub>i</sub> ÷ (1 − π<sub>i</sub> + r·π<sub>i</sub>)
      </div>
      <table className="calc-t">
        <tbody>
          <tr><td className="c-lab">① 주관적 건강인지율 <small>지역사회건강조사 표준화율 3년 평균</small></td><td>{fmt(r.good)}%</td></tr>
          <tr><td className="c-lab">② 불건강률 u = 100 − ①</td><td>{fmt(u)}%</td></tr>
          {u0 != null && <tr><td className="c-lab">③ 전국 불건강률 u₀ <small>같은 정의</small></td><td>{fmt(u0)}%</td></tr>}
          <tr><td className="c-lab">④ 오즈비 r = [u/(1−u)] ÷ [u₀/(1−u₀)]</td><td><b>{fmt(r.or, 3)}</b></td></tr>
          <tr><td className="c-lab">⑤ 전국 연령곡선 π<sub>i</sub> 에 r 적용 → 보정 후 평균 불건강률</td><td>{fmt(r.pr)}%</td></tr>
          <tr><td className="c-lab">⑥ 생명표에 Sullivan 적용 → 기대수명 / 건강수명</td><td>{fmt(r.le)} / <b>{fmt(r.hle)}</b>세</td></tr>
          <tr className="c-sum"><td>검산 ⑥: 기대수명 × (1 − ⑤) ≈ 건강수명</td>
            <td>{fmt(r.le)} × (1 − {fmt(r.pr / 100, 3)}) = {fmt(r.le * (1 - r.pr / 100))}세</td></tr>
        </tbody>
      </table>
      <div className="calc-n">
        불건강 기간 = {fmt(r.le)} − {fmt(r.hle)} = <b>{fmt(unhealthyYears)}년</b>.
        ④가 1보다 작으면 전국보다 건강 응답이 좋다는 뜻입니다.
        전국 불건강 곡선은 통계청 주관적 건강평가 기대여명(DT_1B46)에서 역산했고, 생명표는
        {code.length > 3 ? " 사망원인통계·주민등록연앙인구 3년 합산(Chiang)" : " 통계청 시도 생명표"}를 씁니다.
        공식 통계가 아니라 <b>주관적 건강 기반 근사값</b>입니다.
      </div>
    </details>
  );
}
