import type {
  CareTaskTemplate, ContentCard, ContentVersion, InsuranceClassification, InsuranceResult, InsuranceTerm,
  OfficialContact, Pet, PriorityClass, Product,
} from "../types";

// ---- 오늘 할 일 규칙 엔진 ----
// 우선순위: 보호자·수의사 지정 > 법정 의무 > 안전 > 생애주기 > 생활 (인수인계서 7장)
export const PRIORITY_ORDER: PriorityClass[] = ["guardian", "legal", "safety", "lifecycle", "life"];
export const priorityOf = (c: PriorityClass) => PRIORITY_ORDER.indexOf(c);

export function ageInMonths(birthDate: string | null, now: Date): number | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return null;
  return (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth()) - (now.getDate() < birth.getDate() ? 1 : 0);
}

export function lifeStage(pet: Pick<Pet, "birth_date" | "species">, now: Date): "young" | "adult" | "senior" | "unknown" {
  const months = ageInMonths(pet.birth_date, now);
  if (months === null) return "unknown";
  if (months < 12) return "young";
  if (months >= 12 * 8) return "senior";
  return "adult";
}

type PetFacts = Pick<Pet, "species" | "birth_date" | "registration_status" | "insurance_status" | "indoor" | "neutered">;

export function matchesTemplate(pet: PetFacts, t: CareTaskTemplate, now: Date): boolean {
  if (t.status !== "approved") return false;
  if (t.species !== "all" && t.species !== pet.species) return false;
  if (t.life_stage !== "all" && t.life_stage !== lifeStage(pet, now)) return false;
  const r = t.rule_json;
  if (r.registration_status && !r.registration_status.includes(pet.registration_status)) return false;
  if (r.insurance_status && !r.insurance_status.includes(pet.insurance_status)) return false;
  if (r.indoor !== undefined && r.indoor !== pet.indoor) return false;
  if (r.neutered !== undefined && r.neutered !== pet.neutered) return false;
  return true;
}

/** 등록 직후 보여 줄 기본 할 일. 우선순위가 높은 순으로 count 개. */
export function pickInitialTemplates(pet: PetFacts, templates: CareTaskTemplate[], now: Date, count = 3): CareTaskTemplate[] {
  return templates
    .filter((t) => matchesTemplate(pet, t, now))
    .sort((a, b) => priorityOf(a.priority_class) - priorityOf(b.priority_class) || a.title.localeCompare(b.title, "ko"))
    .slice(0, count);
}

export function nextDue(from: Date, repeat: CareTaskTemplate["repeat_rule"]): Date | null {
  const d = new Date(from);
  if (repeat === "daily") d.setDate(d.getDate() + 1);
  else if (repeat === "weekly") d.setDate(d.getDate() + 7);
  else if (repeat === "monthly") d.setMonth(d.getMonth() + 1);
  else return null;
  return d;
}

// ---- 보험 3단계 확인 ----
export const INSURANCE_DISCLAIMER =
  "본 기능은 보험상품 가입 권유나 보험금 지급 결정을 제공하지 않습니다. 실제 보장 여부와 보험금은 가입 당시 약관 및 보험사의 심사에 따라 결정됩니다.";
export const INSURANCE_FINAL_NOTE = "최종 지급 여부는 보험사가 약관과 심사를 통해 결정합니다";

export const INSURANCE_CATEGORIES = [
  "질병 치료", "상해(사고) 치료", "수술", "입원", "검사", "예방접종", "중성화 수술", "미용·목욕", "치과 진료", "피부 질환", "슬개골 관련", "기타",
] as const;

export const RESULT_LABEL: Record<InsuranceResult, string> = {
  likely_covered: "보장 가능성 높음",
  check_terms: "약관 확인 필요",
  generally_excluded: "일반적 제외",
};

// 일반 안내는 상품과 무관한 통상적 경향일 뿐이며 운영 전 보험 전문가 검수 대상이다.
const GENERALLY_EXCLUDED = ["예방접종", "중성화 수술", "미용·목욕"];
const MAP: Record<InsuranceClassification, InsuranceResult> = { covered: "likely_covered", check: "check_terms", excluded: "generally_excluded" };

export type InsuranceVerdict = {
  result: InsuranceResult;
  evidence: { type: "user_clause" | "general_guide"; text: string; reference: string | null };
};

/** 사용자가 직접 입력한 약관 조항이 있으면 그것을 근거로, 없으면 일반 안내로만 답한다. "보장 가능성 높음"은 사용자 조항이 있을 때만 나온다. */
export function classifyInsurance(category: string, terms: Pick<InsuranceTerm, "category" | "classification" | "clause_text" | "clause_reference">[]): InsuranceVerdict {
  const own = terms.filter((t) => t.category === category);
  if (own.length > 0) {
    // 같은 항목에 조항이 여러 개면 가장 보수적인 쪽을 따른다.
    const rank: InsuranceClassification[] = ["excluded", "check", "covered"];
    const pick = [...own].sort((a, b) => rank.indexOf(a.classification) - rank.indexOf(b.classification))[0];
    return { result: MAP[pick.classification], evidence: { type: "user_clause", text: pick.clause_text, reference: pick.clause_reference } };
  }
  if (GENERALLY_EXCLUDED.includes(category)) {
    return { result: "generally_excluded", evidence: { type: "general_guide", text: "예방·미용 목적의 비용은 통상 보장에서 빠지는 경우가 많습니다. 가입한 약관의 면책 조항을 확인하세요.", reference: null } };
  }
  return { result: "check_terms", evidence: { type: "general_guide", text: "입력된 약관 조항이 없어 판단할 근거가 없습니다. 약관의 보장·면책 조항을 확인하거나 보험사 고객센터에 문의하세요.", reference: null } };
}

// ---- 공식 연락처 유효기간 ----
export function isContactUsable(c: Pick<OfficialContact, "status" | "valid_from" | "valid_to">, now: Date): boolean {
  if (c.status !== "active") return false;
  if (c.valid_from && new Date(c.valid_from) > now) return false;
  if (c.valid_to && new Date(c.valid_to) < now) return false;
  return true;
}

// ---- 콘텐츠 공개 조건 ----
/** 승인(또는 게시)되었고 검토 기한이 지나지 않은 버전만 공개한다. */
export function isContentPublic(card: Pick<ContentCard, "status">, version: Pick<ContentVersion, "status" | "expires_at" | "reviewed_at"> | null, now: Date): boolean {
  if (!version) return false;
  const ok = (s: string) => s === "approved" || s === "published";
  if (!ok(card.status) || !ok(version.status)) return false;
  if (!version.reviewed_at) return false;
  if (version.expires_at && new Date(version.expires_at) < now) return false;
  return true;
}

// ---- 용품 안전 필터 ----
export type MouthSize = Product["min_mouth"];
export function mouthSizeOf(pet: Pick<Pet, "weight_kg" | "species">): MouthSize | null {
  if (pet.weight_kg === null) return null;
  if (pet.weight_kg < 7) return "small";
  if (pet.weight_kg < 20) return "medium";
  return "large";
}
/** 장난감이 아이 입보다 작으면 삼킬 위험이 있어 안내한다. 체중만으로 단정하지 않고 "확인 필요"로 돌린다. */
export function fitFor(product: Pick<Product, "min_mouth">, pet: Pick<Pet, "weight_kg" | "species"> | null): "ok" | "too_small" | "unknown" {
  if (!pet) return "unknown";
  const mouth = mouthSizeOf(pet);
  if (!mouth) return "unknown";
  const order: MouthSize[] = ["small", "medium", "large"];
  return order.indexOf(mouth) > order.indexOf(product.min_mouth) ? "too_small" : "ok";
}

// ---- 광고·판매 금지 화면 ----
const NO_COMMERCE_PREFIXES = ["/emergency", "/map", "/facilities", "/reports", "/health", "/insurance", "/legal", "/login", "/onboarding", "/admin"];
export function commerceAllowedOn(pathname: string): boolean {
  if (pathname === "/") return false;
  return !NO_COMMERCE_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}
