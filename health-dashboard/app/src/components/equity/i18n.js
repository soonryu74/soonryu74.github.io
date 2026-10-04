import EN from "../../../../data/indicator_en.json";

/* 우선 검토 카드 한국어/영어 문구 — 영어 모드는 국제 심사용(카드 한 장만). 숫자·계산은 같고 문장만 바뀐다. */
export const indName = (ind, lang) => (lang === "en" && EN.labels[ind.id]) || ind.name;
export const domName = (d, lang) => (lang === "en" && EN.domains[d]) || d;
export const EN_STATUS = EN.status;
export const TIER_EN = { priority: "Review first", watch: "Monitor", ok: "Relatively favourable", insufficient: "Insufficient data" };
export const BAND_EN = { worst10: "Least favourable 10%", low: "Lower quartile (unfavourable 25%)", mid: "Middle range", high: "Upper quartile (favourable 25%)" };
export const DEP_EN = { 높음: "High", 중간: "Middle", 낮음: "Low" };

export const T = {
  ko: {
    title: "우리 지역 우선 검토 항목", method: "우선순위를 정하는 방법", summary: "핵심 요약", of: (s, n) => `${s} ${n}개 중`,
    scopeCore: "지역사회건강조사 지표", scopeAll: "전체 방향 지표",
    p1: "① PRIORITY · 눈에 띄는 건강 문제", p1d: "전국 중앙값보다 불리하고 비교 집단에서 불리한 쪽에 있는 지표(영역당 1개, 최대 3개)",
    why: "② WHY IT MATTERS · 왜 강조됐나", act: "③ POSSIBLE ACTION · 검토해 볼 수 있는 공중보건 대응",
    actNote: "진단·치료 권고나 정책 처방이 아닙니다. 아래 공식 자료를 참고해 지역 여건과 전문가 검토로 판단하세요.",
    local: "지역 값", median: "전국 중앙값", pos: "상대 위치", trend: "최근 추세", dep: "사회경제적 취약성",
    feedback: "사용 의견 보내기",
  },
  en: {
    title: "Health Equity Priority", method: "How priorities are identified", summary: "Summary", of: (s, n) => `${n} ${s}:`,
    scopeCore: "survey indicators", scopeAll: "all directional indicators",
    p1: "① PRIORITY · What stands out in this community", p1d: "Indicators worse than the national median and on the unfavourable side of the comparison group (one per domain, up to three)",
    why: "② WHY IT MATTERS · Why it was highlighted", act: "③ POSSIBLE ACTION · Potential public-health responses to consider",
    actNote: "Not a diagnosis, treatment advice or policy prescription. Consider the official sources below together with local context and professional review.",
    local: "Local value", median: "National median", pos: "Relative position", trend: "Recent trend", dep: "Socioeconomic context",
    feedback: "Give Feedback",
  },
};
