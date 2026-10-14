import { useState } from "react";

/* 계획 수립 단계 안내 띠 — 메뉴는 그대로 두고, 메뉴 아래에 지역보건의료계획 「현황 분석」을 쓰는 순서를 한 줄로 보여 준다(2026-10-14, 아르곤 검토 제안 ①).
   누르면 그 단계 화면(필요하면 카드)으로 이동. 지역 프로파일은 ①·④ 두 단계에 쓰이므로 마지막으로 누른 단계를 기억해 강조한다. */
export const PLAN_STEPS = [
  { n: 1, h: "진단", sub: "지역 프로파일", view: "profile", tip: "우리 지역 영역 점수·강점·개선 과제" },
  { n: 2, h: "비교", sub: "지역 비교", view: "compare", tip: "비슷한 지역·시도·전국 중앙값과 나란히" },
  { n: 3, h: "격차", sub: "우리 지역 읽기", view: "analysis", card: "우리 지역 읽기", tip: "분포 속 위치·정밀도·격차 판단 5단계" },
  { n: 4, h: "우선순위·근거", sub: "우선 검토 항목", view: "profile", card: "우리 지역 우선 검토 항목", tip: "먼저 검토할 지표와 공식 근거 자료" },
  { n: 5, h: "보고서", sub: "보고서 3종", view: "report", tip: "지역별·지표별·고령층 보고서 — 인쇄·워드·한글 복사" },
];
const REPORTS = ["report", "ireport", "elder"];

export default function PlanSteps({ view, onGo }) {
  const [last, setLast] = useState(1);
  const cur = view === "profile" ? (last === 4 ? 4 : 1) : view === "compare" ? 2 : view === "analysis" ? 3 : REPORTS.includes(view) ? 5 : null;
  return (
    <nav className="plan-steps" aria-label="계획 수립 순서">
      <span className="ps-lab">계획 수립 순서</span>
      <ol>
        {PLAN_STEPS.map((s) => (
          <li key={s.n}>
            <button type="button" className={cur === s.n ? "on" : undefined} aria-current={cur === s.n ? "step" : undefined} title={s.tip}
              onClick={() => { setLast(s.n); onGo(s); }}>
              <span className="ps-n" aria-hidden="true">{"①②③④⑤"[s.n - 1]}</span><b>{s.h}</b><small>{s.sub}</small>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
