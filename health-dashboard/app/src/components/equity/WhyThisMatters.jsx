/* 「왜 우선인가?」 — 계산된 사실만(격차·순위·추세·박탈·표본오차). 인과 표현 없음. */
const ICON = { gap: "↕", rank: "#", trend: "↗", dep: "⌂", ci: "±", rse: "!" };
export default function WhyThisMatters({ reasons, title = "왜 우선인가?" }) {
  if (!reasons?.length) return null;
  return (
    <div className="eq-why">
      <div className="eq-sub">{title}</div>
      <ul>{reasons.map((r, i) => <li key={i}><span className="eq-ico" aria-hidden="true">{ICON[r.k] || "·"}</span>{r.t}</li>)}</ul>
    </div>
  );
}
