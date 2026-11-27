// 사이트 모드. 2026-11-27 결정: 안전 앱(펫안심365) 기능은 일단 끄고 용품 가게만 연다.
// 다시 켜려면 환경변수 NEXT_PUBLIC_SAFETY_APP=on 으로 빌드한다. 코드는 지우지 않았다.
export const SAFETY_APP_ENABLED = process.env.NEXT_PUBLIC_SAFETY_APP === "on";

export const BRAND = SAFETY_APP_ENABLED ? "펫안심365" : "포우플레이 아틀리에";

const SAFETY_PREFIXES = ["/today", "/pets", "/onboarding", "/records", "/emergency", "/map", "/facilities", "/health", "/insurance", "/reports", "/partner"];

/** 안전 앱이 꺼져 있을 때 닫아 둘 경로인지. */
export function isSafetyRoute(pathname: string): boolean {
  return SAFETY_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}
