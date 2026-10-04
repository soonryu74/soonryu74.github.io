/* 보고서 종류 전환 — 지역별(view=report) · 지표별(view=ireport) · 고령층(view=elder). 세 보고서 화면 맨 위에 같은 모양으로 놓는다. */
const MODES = [
  ["report", "지역별", "선택한 지역 하나의 건강 현황 보고서"],
  ["ireport", "지표별", "지표 하나를 골라 전국 취약지역 현황을 보는 보고서"],
  ["elder", "고령층 65+", "65세 이상 고령층이 취약한 지역을 전국에서 보는 보고서"],
];
export default function ReportMode({ cur, onMode }) {
  if (!onMode) return null;
  return (
    <div className="seg rpt-mode" role="group" aria-label="보고서 종류"><span className="rpt-mode-l">보고서</span>
      {MODES.map(([v, name, tip]) => (
        <button key={v} type="button" className={`seg-btn${v === cur ? " on" : ""}`} aria-pressed={v === cur} title={tip}
          onClick={v === cur ? undefined : () => onMode(v)}>{name}</button>
      ))}
    </div>
  );
}
