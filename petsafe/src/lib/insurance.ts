// 보험 3단계 확인: 사용자 입력 약관 조항이 있으면 우선, 없으면 일반 안내.
import { TREATMENT_CATEGORIES, GENERAL_GUIDANCE_SOURCE } from "@/content/insurance";
import type { InsuranceResult, InsuranceTerm, ClauseClassification } from "@/lib/types";

export const RESULT_LABELS: Record<InsuranceResult, string> = {
  likely_covered: "보장 가능성 높음",
  check_terms: "약관 확인 필요",
  generally_excluded: "일반적 제외",
};

const FROM_CLAUSE: Record<ClauseClassification, InsuranceResult> = {
  covered: "likely_covered",
  excluded: "generally_excluded",
  conditional: "check_terms",
  unknown: "check_terms",
};

export type CheckOutcome = {
  result: InsuranceResult;
  evidence: {
    evidence_type: "user_clause" | "general_guidance";
    evidence_text: string;
    clause_reference: string | null;
    terms_version: string | null;
  };
};

export function classifyTreatment(category: string, terms: Pick<InsuranceTerm, "category" | "classification" | "clause_text" | "clause_reference">[], termsVersion: string | null): CheckOutcome {
  const cat = TREATMENT_CATEGORIES.find((c) => c.key === category);
  if (!cat) throw new Error(`unknown category: ${category}`);
  const clauses = terms.filter((t) => t.category === category);
  if (clauses.length > 0) {
    // 여러 조항이 있으면 가장 보수적인 결과(제외 > 확인 필요 > 보장)를 택한다
    const rank: InsuranceResult[] = ["generally_excluded", "check_terms", "likely_covered"];
    const results = clauses.map((c) => FROM_CLAUSE[c.classification]);
    const result = rank.find((r) => results.includes(r)) ?? "check_terms";
    const chosen = clauses.find((c) => FROM_CLAUSE[c.classification] === result) ?? clauses[0];
    return {
      result,
      evidence: {
        evidence_type: "user_clause",
        evidence_text: chosen.clause_text,
        clause_reference: chosen.clause_reference,
        terms_version: termsVersion,
      },
    };
  }
  return {
    result: cat.defaultResult,
    evidence: {
      evidence_type: "general_guidance",
      evidence_text: `${cat.generalNote} (${GENERAL_GUIDANCE_SOURCE.organization})`,
      clause_reference: null,
      terms_version: termsVersion,
    },
  };
}
