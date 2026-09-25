import { describe, expect, it } from "vitest";
import { classifyTreatment, RESULT_LABELS } from "@/lib/insurance";
import { INSURANCE_DISCLAIMER, TREATMENT_CATEGORIES } from "@/content/insurance";

describe("보험 3단계 분류", () => {
  it("결과는 세 단계뿐이다", () => {
    expect(Object.values(RESULT_LABELS)).toEqual(["보장 가능성 높음", "약관 확인 필요", "일반적 제외"]);
  });

  it("조항이 없으면 일반 안내 근거로 판정", () => {
    const r = classifyTreatment("vaccination", [], "2025.01");
    expect(r.result).toBe("generally_excluded");
    expect(r.evidence.evidence_type).toBe("general_guidance");
    expect(r.evidence.terms_version).toBe("2025.01");
  });

  it("사용자 조항이 있으면 그것이 우선한다", () => {
    const r = classifyTreatment("dental", [{ category: "dental", classification: "covered", clause_text: "치과 질환 보장", clause_reference: "제3조" }], null);
    expect(r.result).toBe("likely_covered");
    expect(r.evidence.evidence_type).toBe("user_clause");
    expect(r.evidence.clause_reference).toBe("제3조");
  });

  it("조항이 엇갈리면 가장 보수적인 결과", () => {
    const r = classifyTreatment("surgery", [
      { category: "surgery", classification: "covered", clause_text: "수술 보장", clause_reference: null },
      { category: "surgery", classification: "excluded", clause_text: "슬개골 수술 면책", clause_reference: null },
    ], null);
    expect(r.result).toBe("generally_excluded");
  });

  it("일반 안내만으로는 '보장 가능성 높음'을 주지 않는다(과장 방지)", () => {
    for (const c of TREATMENT_CATEGORIES) expect(c.defaultResult).not.toBe("likely_covered");
  });

  it("고정 면책 문구", () => {
    expect(INSURANCE_DISCLAIMER).toContain("가입 권유");
    expect(INSURANCE_DISCLAIMER).toContain("보험사의 심사");
  });

  it("알 수 없는 유형은 거부", () => {
    expect(() => classifyTreatment("nope", [], null)).toThrow();
  });
});
