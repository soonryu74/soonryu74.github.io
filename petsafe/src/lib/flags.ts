// 법무 기능 플래그. 초기값은 모두 false.
// 코드 배포만으로 켜지지 않도록, 실제 값은 DB feature_flags(관리자 승인·사유 필수, 감사로그)에서 읽고
// DB에 없는 키는 항상 false로 취급한다.
export type LegalFeatureFlags = {
  paymentsEnabled: boolean;
  partnerSubscriptionsEnabled: boolean;
  insuranceReferralEnabled: boolean;
  preciseLocationStorageEnabled: boolean;
  publicReviewsEnabled: boolean;
};

export const DEFAULT_FLAGS: LegalFeatureFlags = Object.freeze({
  paymentsEnabled: false,
  partnerSubscriptionsEnabled: false,
  insuranceReferralEnabled: false,
  preciseLocationStorageEnabled: false,
  publicReviewsEnabled: false,
});

export const FLAG_LABELS: Record<keyof LegalFeatureFlags, string> = {
  paymentsEnabled: "결제",
  partnerSubscriptionsEnabled: "파트너 유료 구독",
  insuranceReferralEnabled: "보험 추천·모집 연계",
  preciseLocationStorageEnabled: "정밀 위치 저장",
  publicReviewsEnabled: "공개 후기",
};

export function resolveFlags(rows: { key: string; enabled: boolean }[]): LegalFeatureFlags {
  const out = { ...DEFAULT_FLAGS };
  for (const r of rows) {
    if (r.key in out) (out as Record<string, boolean>)[r.key] = r.enabled === true;
  }
  return out;
}
