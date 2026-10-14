import { scoreBreakdown } from "../../lib/equity";

/* 점수 구성 막대 — 우선 검토 점수(0~1)가 네 요소(격차·위치·추세·박탈)에서 각각 얼마나 나왔는지.
   칸 너비 = 재정규화 가중치 × 요소 점수(합 = 점수), 오른쪽 빈칸 = 1 − 점수. 값이 없는 요소는 0이 아니라 「없음」.
   색·너비는 인라인 style — 인쇄·워드 저장·한글 붙여넣기에서도 그대로 보이게. 계산은 엔진(lib/equity) 그대로. */
const PARTS = {
  gap: { ko: "격차", en: "Gap", color: "#2a78d6" },
  rank: { ko: "위치", en: "Position", color: "#7a5cc4" },
  trend: { ko: "추세", en: "Trend", color: "#eb6834" },
  dep: { ko: "박탈", en: "Deprivation", color: "#1f9e89" },
};
const f2 = (x) => x.toFixed(2);
const EMPTY = "#e3e8ef";

export default function ScoreBar({ row, lang = "ko" }) {
  const b = row?.score != null ? scoreBreakdown(row.parts, row.weights) : null;
  if (!b) return null;
  const en = lang === "en";
  const name = (k) => PARTS[k][en ? "en" : "ko"];
  const none = en ? "not available" : "없음";
  const aria = (en ? "Score composition: " : "점수 구성: ")
    + b.map((s) => `${name(s.key)} ${s.missing ? none : f2(s.contrib)}`).join(", ")
    + (en ? `, total ${f2(row.score)} of 1` : `, 합계 ${f2(row.score)} / 1`);
  const segs = b.filter((s) => !s.missing && s.contrib > 0.0005)
    .map((s) => ({ key: s.key, pct: +(s.contrib * 100).toFixed(1), color: PARTS[s.key].color, title: `${name(s.key)} ${f2(s.contrib)}` }));
  const rest = +(100 - segs.reduce((a, s) => a + s.pct, 0)).toFixed(1);
  if (rest > 0.05) segs.push({ key: "rest", pct: rest, color: EMPTY, title: en ? `remaining to 1: ${f2(1 - row.score)}` : `1까지 남은 몫 ${f2(1 - row.score)}` });
  return (
    <div className="eq-sbar">
      <div className="eq-sbar-h">
        <span>{en ? "Score composition" : "점수 구성"}</span>
        <small className="muted">{en ? `total ${f2(row.score)} / 1 · internal technical score, not an official index` : `합계 ${f2(row.score)} / 1 · 화면 내부용 기술 점수(공식 지수 아님)`}</small>
      </div>
      {/* 막대는 표 한 줄 — flex 는 워드·한글 붙여넣기에서 깨지므로 칸 너비·배경을 인라인으로 준 표를 쓴다 */}
      <div role="img" aria-label={aria}>
        <table className="eq-sbar-track" aria-hidden="true" style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", border: 0, margin: 0 }}>
          <tbody><tr>
            {segs.map((s) => (
              <td key={s.key} title={s.title} className={s.key === "rest" ? "eq-sbar-rest" : undefined} style={{ width: `${s.pct}%`, background: s.color, height: "10px", padding: 0, border: 0, fontSize: "1px", lineHeight: "1px" }}>&nbsp;</td>
            ))}
          </tr></tbody>
        </table>
      </div>
      <ul className="eq-sbar-leg">
        {b.map((s) => (
          <li key={s.key} className={s.missing ? "muted" : ""}>
            <i aria-hidden="true" style={{ background: s.missing ? "transparent" : PARTS[s.key].color, borderColor: PARTS[s.key].color }} />
            {name(s.key)} <b>{s.missing ? none : f2(s.contrib)}</b>
            {!s.missing && <small className="muted"> ({en ? "weight" : "가중"} {Math.round(s.w * 100)}% × {f2(s.part)})</small>}
          </li>
        ))}
      </ul>
      {b.some((s) => s.missing) && <div className="eq-sbar-note muted">{en ? "Missing components are not counted as zero; the remaining weights are renormalized." : "「없음」 요소는 0점으로 두지 않고 빼고, 남은 가중치로 다시 나눴습니다."}</div>}
    </div>
  );
}
