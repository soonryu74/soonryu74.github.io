// 보험·비용: 사용자 약관 이해 도구. 상품 추천·순위·가입 권유 없음.
export type TreatmentCategory = {
  key: string;
  label: string;
  // 공식 일반안내 기준 기본 판정 (사용자 약관 조항이 있으면 그것이 우선)
  defaultResult: "likely_covered" | "check_terms" | "generally_excluded";
  generalNote: string;
};

export const INSURANCE_DISCLAIMER =
  "본 기능은 보험상품 가입 권유나 보험금 지급 결정을 제공하지 않습니다. 실제 보장 여부와 보험금은 가입 당시 약관 및 보험사의 심사에 따라 결정됩니다.";

export const GENERAL_GUIDANCE_SOURCE = {
  organization: "일반 안내 (보험사 공통 약관 구조 기준, 개별 약관 확인 필수)",
  note: "특정 상품·보험사 약관이 아닌 일반적 구조 설명입니다. 반드시 본인 약관 원문을 확인하세요.",
};

export const TREATMENT_CATEGORIES: TreatmentCategory[] = [
  { key: "exam", label: "진료·검사 (질병·상해)", defaultResult: "check_terms", generalNote: "질병·상해 진료비는 보통 보장 범위이지만 면책기간·자기부담금·한도가 적용됩니다." },
  { key: "hospitalization", label: "입원", defaultResult: "check_terms", generalNote: "입원일당 한도와 연간 한도를 약관에서 확인하세요." },
  { key: "surgery", label: "수술", defaultResult: "check_terms", generalNote: "수술 1회당 한도와 특정 수술 면책 여부를 확인하세요." },
  { key: "medication", label: "처방약", defaultResult: "check_terms", generalNote: "진료와 함께 처방된 약은 보장되는 경우가 많지만 약관마다 다릅니다." },
  { key: "accident", label: "사고·상해", defaultResult: "check_terms", generalNote: "상해는 보통 면책기간이 짧지만, 보호자 과실 조항을 확인하세요." },
  { key: "dental", label: "치과 (스케일링·발치)", defaultResult: "check_terms", generalNote: "스케일링은 제외하고 질병성 치과는 보장하는 약관이 많습니다." },
  { key: "patella", label: "슬개골 탈구", defaultResult: "check_terms", generalNote: "특약 여부·가입 전 진단 여부에 따라 달라집니다." },
  { key: "skin", label: "피부·귀 질환", defaultResult: "check_terms", generalNote: "만성·재발성 질환은 가입 전 병력 고지 여부가 중요합니다." },
  { key: "congenital", label: "선천·유전 질환", defaultResult: "check_terms", generalNote: "약관에 따라 제외되거나 특약으로 보장됩니다." },
  { key: "vaccination", label: "예방접종", defaultResult: "generally_excluded", generalNote: "예방 목적 접종은 일반적으로 보장에서 제외됩니다." },
  { key: "checkup", label: "건강검진 (증상 없음)", defaultResult: "generally_excluded", generalNote: "증상 없는 검진은 일반적으로 제외됩니다." },
  { key: "neutering", label: "중성화", defaultResult: "generally_excluded", generalNote: "질병 치료 목적이 아닌 중성화는 일반적으로 제외됩니다." },
  { key: "grooming", label: "미용·목욕", defaultResult: "generally_excluded", generalNote: "미용은 일반적으로 제외됩니다." },
  { key: "pregnancy", label: "임신·출산", defaultResult: "generally_excluded", generalNote: "임신·출산 관련 비용은 일반적으로 제외됩니다." },
  { key: "supplement", label: "영양제·처방식", defaultResult: "generally_excluded", generalNote: "영양제·사료는 일반적으로 제외됩니다." },
];

export const CLAIM_DOCUMENTS = [
  "진료비 영수증 (동물병원 발급)",
  "진료비 세부내역서",
  "진료 확인서 또는 진단서 (필요 시)",
  "보험금 청구서 (보험사 양식)",
  "반려동물 확인 자료 (동물등록증·사진 등, 보험사 요구 시)",
  "통장 사본 (보험사 요구 시)",
];
