import type { FacilityType } from "@/lib/types";

export const FACILITY_LABELS: Record<FacilityType, string> = {
  animal_hospital: "동물병원", animal_pharmacy: "동물약국", shelter: "보호센터", grooming: "미용", boarding: "위탁·호텔",
  funeral: "장례", transport: "운송", pet_cafe: "동반 카페", park: "공원", playground: "놀이터", lodging: "동반 숙소",
  restaurant: "동반 식당", shopping: "용품점",
};

export const FACILITY_ICONS: Partial<Record<FacilityType, string>> = {
  animal_hospital: "🏥", animal_pharmacy: "💊", shelter: "🏠", grooming: "✂️", boarding: "🛏️", funeral: "🕊️",
  transport: "🚐", pet_cafe: "☕", park: "🌳", playground: "🎾", lodging: "🏨", restaurant: "🍽️", shopping: "🛍️",
};

export const BUSINESS_STATUS_LABELS = { open: "허가상 영업", closed: "폐업", suspended: "휴업", unknown: "영업 상태 미확인" } as const;

export const PET_ACCESS_LABELS: Record<string, string> = {
  indoor: "실내 동반", outdoor: "실외 동반", size_limit: "크기 제한", carrier: "이동장 필요", leash: "목줄 필요",
  vaccination_proof: "예방접종 증명", extra_fee: "추가 요금", last_confirmed_at: "최근 확인일",
};

export function isFacilityType(v: string): v is FacilityType {
  return v in FACILITY_LABELS;
}
