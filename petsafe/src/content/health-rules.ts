// 건강·예방 화면의 생활수칙 카드. 모든 카드에 출처·검토일이 있다.
export type HealthCard = {
  key: string;
  category: "legal" | "health" | "poison" | "outdoor" | "behavior" | "cat_env";
  title: string;
  do: string[];
  dont: string[];
  action: { label: string; href: string };
  source: { organization: string; url: string | null };
  reviewedAt: string;
};

export const HEALTH_CARDS: HealthCard[] = [
  { key: "legal", category: "legal", title: "법정 의무", do: ["동물등록·인식표", "외출 시 목줄·안전조치", "배설물 수거"], dont: ["미등록 상태로 두기", "통제 없이 풀어두기"], action: { label: "등록 안내 보기", href: "/reports?situation=registration" }, source: { organization: "찾기쉬운 생활법령정보", url: "https://easylaw.go.kr" }, reviewedAt: "2026-08-31" },
  { key: "health", category: "health", title: "건강 관찰", do: ["식욕·음수·배변·체중·행동 변화 기록", "달라진 점은 사진·메모로 남기기"], dont: ["사람 약을 임의로 먹이기"], action: { label: "기록하기", href: "/records" }, source: { organization: "펫안심365 운영 기준", url: null }, reviewedAt: "2026-08-31" },
  { key: "poison", category: "poison", title: "중독 예방", do: ["제품명·성분·양·시간을 기록하고 즉시 병원 문의"], dont: ["집에서 토하게 하기", "민간요법"], action: { label: "긴급 도움", href: "/emergency" }, source: { organization: "펫안심365 운영 기준", url: null }, reviewedAt: "2026-08-31" },
  { key: "outdoor", category: "outdoor", title: "외출", do: ["기온·노면·목줄·물·배변봉투 확인", "산책 후 진드기 확인"], dont: ["더운 차 안에 두기", "무리한 운동"], action: { label: "오늘 할 일", href: "/today" }, source: { organization: "질병관리청 감염병포털", url: "https://dportal.kdca.go.kr" }, reviewedAt: "2026-08-31" },
  { key: "behavior", category: "behavior", title: "행동", do: ["긍정적 강화", "스트레스 신호 관찰"], dont: ["체벌", "공포 유발"], action: { label: "행동 메모 남기기", href: "/records" }, source: { organization: "펫안심365 운영 기준", url: null }, reviewedAt: "2026-08-31" },
  { key: "cat_env", category: "cat_env", title: "고양이 환경", do: ["수직공간·숨을 곳·화장실 점검", "위험식물(백합류) 치우기"], dont: ["끈·실·고무줄 방치", "사람 약 노출"], action: { label: "집안 안전점검", href: "/today" }, source: { organization: "펫안심365 운영 기준", url: null }, reviewedAt: "2026-08-31" },
];
