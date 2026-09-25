// 공식 연락처. 코드에 흩어놓지 않고 이 목록 → official_contacts 테이블로 관리한다.
// verified_at 은 인수인계서(2026-08-31) 기준. 운영자 재확인 후 갱신한다.
export type OfficialContact = {
  key: string;
  category: "lost_found" | "my_pet_lost" | "abuse" | "illegal_practice" | "dispute" | "registration";
  organization: string;
  phone: string | null;
  url: string | null;
  coverageArea: string;
  availableHours: string | null;
  description: string;
  verifiedAt: string | null;
  sourceUrl: string | null;
  status: "active" | "pending_verification";
  sortOrder: number;
};

export const OFFICIAL_CONTACTS: OfficialContact[] = [
  {
    key: "animal_protection_call",
    category: "lost_found",
    organization: "동물보호상담센터",
    phone: "1577-0954",
    url: "https://www.animal.go.kr",
    coverageArea: "전국",
    availableHours: "운영시간은 전화 연결 시 안내",
    description: "유실·유기 동물 발견 신고와 상담.",
    verifiedAt: "2026-08-31",
    sourceUrl: "https://www.mafra.go.kr",
    status: "active",
    sortOrder: 10,
  },
  {
    key: "animal_go_kr_report",
    category: "lost_found",
    organization: "국가동물보호정보시스템 온라인 신고",
    phone: null,
    url: "https://www.animal.go.kr",
    coverageArea: "전국",
    availableHours: "24시간(온라인)",
    description: "발견 동물 신고, 보호 중인 동물 조회.",
    verifiedAt: "2026-08-31",
    sourceUrl: "https://www.animal.go.kr",
    status: "active",
    sortOrder: 20,
  },
  {
    key: "my_pet_lost_registry",
    category: "my_pet_lost",
    organization: "국가동물보호정보시스템 (동물등록 유실 신고)",
    phone: null,
    url: "https://www.animal.go.kr",
    coverageArea: "전국",
    availableHours: "24시간(온라인)",
    description: "등록동물 유실 신고와 변경 절차. 보호 중인 동물 공고도 함께 확인하세요.",
    verifiedAt: "2026-08-31",
    sourceUrl: "https://www.animal.go.kr",
    status: "active",
    sortOrder: 10,
  },
  {
    key: "police_112",
    category: "abuse",
    organization: "경찰 (112)",
    phone: "112",
    url: null,
    coverageArea: "전국",
    availableHours: "24시간",
    description: "진행 중인 학대, 생명이 위험한 상황. 신고자 안전을 먼저 확보하세요.",
    verifiedAt: "2026-08-31",
    sourceUrl: null,
    status: "active",
    sortOrder: 10,
  },
  {
    key: "local_gov_animal_welfare",
    category: "abuse",
    organization: "관할 시·군·구청 동물보호 담당부서",
    phone: null,
    url: "https://www.gov.kr",
    coverageArea: "관할 지역",
    availableHours: "평일 근무시간",
    description: "학대 의심 신고·현장 점검. 지자체 대표번호로 연결됩니다. 지역별 번호는 운영자 확인 후 게시됩니다.",
    verifiedAt: null,
    sourceUrl: null,
    status: "pending_verification",
    sortOrder: 20,
  },
  {
    key: "kvma_illegal_practice",
    category: "illegal_practice",
    organization: "대한수의사회 (불법 동물진료 신고)",
    phone: null,
    url: "https://www.kvma.or.kr",
    coverageArea: "전국",
    availableHours: null,
    description: "무자격 진료·불법 시술 의심. 신고 채널은 운영자 검증 후 게시됩니다.",
    verifiedAt: null,
    sourceUrl: null,
    status: "pending_verification",
    sortOrder: 10,
  },
  {
    key: "consumer_1372",
    category: "dispute",
    organization: "1372 소비자상담센터",
    phone: "1372",
    url: "https://www.ccn.go.kr",
    coverageArea: "전국",
    availableHours: "평일 09:00~18:00",
    description: "진료비·서비스 분쟁 상담. 영수증·설명 기록·대화 내역을 보관하세요.",
    verifiedAt: "2026-08-31",
    sourceUrl: null,
    status: "active",
    sortOrder: 10,
  },
  {
    key: "registration_info",
    category: "registration",
    organization: "국가동물보호정보시스템 (동물등록 안내)",
    phone: null,
    url: "https://www.animal.go.kr",
    coverageArea: "전국",
    availableHours: "24시간(온라인)",
    description: "동물등록 대행기관 찾기와 등록 절차.",
    verifiedAt: "2026-08-31",
    sourceUrl: "https://www.animal.go.kr",
    status: "active",
    sortOrder: 10,
  },
];

export const REPORT_SITUATIONS: {
  key: OfficialContact["category"];
  label: string;
  intro: string;
  evidence: string[];
  safetyNote?: string;
}[] = [
  {
    key: "lost_found", label: "길에서 동물을 발견했어요",
    intro: "다치지 않았다면 억지로 잡지 말고 사진과 위치를 먼저 남기세요.",
    evidence: ["발견 시간·장소(행정동·근처 건물)", "사진(전신·얼굴·특징)", "목걸이·인식표 여부", "다친 곳이 있는지"],
  },
  {
    key: "my_pet_lost", label: "우리 아이를 잃어버렸어요",
    intro: "등록동물이면 유실 신고를 먼저 하고, 보호 중인 동물 공고를 매일 확인하세요.",
    evidence: ["잃어버린 시간·장소", "최근 사진", "동물등록번호(있다면)", "특징(털색·크기·목걸이)"],
  },
  {
    key: "abuse", label: "학대·유기를 목격했어요",
    intro: "진행 중이거나 생명이 위험하면 112. 신고자 안전이 먼저입니다. 신고 대상의 실명·주소를 공개 게시하지 마세요.",
    evidence: ["일시·장소", "사진·영상(안전한 거리에서)", "목격 내용을 시간 순으로 메모"],
    safetyNote: "직접 대면하거나 SNS에 신상을 올리면 신고자와 동물 모두 위험해질 수 있습니다.",
  },
  {
    key: "illegal_practice", label: "불법 진료·시술이 의심돼요",
    intro: "영수증·시술 내용·대화 기록을 보관하고 공식 채널로 신고하세요.",
    evidence: ["업체명·위치", "영수증·결제 내역", "시술 내용 설명·대화 기록"],
  },
  {
    key: "dispute", label: "진료비·서비스 분쟁이 있어요",
    intro: "먼저 업체에 이의를 제기하고, 해결되지 않으면 소비자상담센터에 상담하세요.",
    evidence: ["영수증·세부내역서", "사전 설명 여부(고지·동의)", "대화·문자 기록"],
  },
];
