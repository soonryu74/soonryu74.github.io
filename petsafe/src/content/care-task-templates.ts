// 오늘 할 일 템플릿 (버전 데이터). 하드코딩 일정 대신 규칙으로 관리한다.
// 담당 수의사가 정한 일정이 있으면 이 템플릿보다 우선한다.
export type Species = "dog" | "cat";
export type LifeStage = "young" | "adult" | "senior";
export type TaskPriority = "legal" | "safety" | "health" | "general" | "lifestyle";
export type RepeatRule = "daily" | "weekly" | "monthly" | null;

export type TemplateRule = {
  species?: Species;
  lifeStage?: LifeStage[];
  registrationStatus?: string[];   // 해당 상태일 때만
  insuranceStatus?: string[];
  indoor?: boolean;
  multiPet?: boolean;
  months?: number[];               // 해당 월에만 (1~12)
  repeat: RepeatRule;
};

export type CareTaskTemplate = {
  key: string;
  species: Species | null;
  lifeStage: LifeStage | null;
  category: "legal" | "health" | "poison" | "outdoor" | "behavior" | "cat_env" | "insurance";
  title: string;
  description: string;
  rule: TemplateRule;
  priority: TaskPriority;
  version: number;
  sourceId: string | null;
  sourceUrl: string | null;
  reviewedAt: string | null;
};

export const CARE_TASK_TEMPLATES: CareTaskTemplate[] = [
  {
    key: "dog_registration_check",
    species: "dog", lifeStage: null, category: "legal",
    title: "동물등록 여부 확인하기",
    description: "2개월령 이상 반려견은 동물등록이 의무입니다. 등록 대행 동물병원이나 시·군·구청에서 할 수 있어요.",
    rule: { species: "dog", registrationStatus: ["not_registered", "unknown"], repeat: null },
    priority: "legal", version: 1,
    sourceId: "easylaw_pet", sourceUrl: "https://easylaw.go.kr/CSP/CnpClsMain.laf?ccfNo=2&cciNo=2&cnpClsNo=1&csmSeq=1809&popMenu=ov", reviewedAt: "2026-08-31",
  },
  {
    key: "dog_tag_check",
    species: "dog", lifeStage: null, category: "legal",
    title: "인식표(이름·연락처) 확인",
    description: "외출 시 소유자 연락처가 적힌 인식표를 달아야 합니다. 목걸이 상태와 글씨가 지워지지 않았는지 살펴보세요.",
    rule: { species: "dog", repeat: "monthly" },
    priority: "legal", version: 1, sourceId: "easylaw_pet", sourceUrl: "https://easylaw.go.kr", reviewedAt: "2026-08-31",
  },
  {
    key: "dog_walk_kit",
    species: "dog", lifeStage: null, category: "outdoor",
    title: "산책 전 목줄·배변봉투·물 챙기기",
    description: "목줄(2m 이내)·배변봉투는 법정 의무입니다. 더운 날엔 물과 노면 온도도 확인하세요.",
    rule: { species: "dog", repeat: "daily" },
    priority: "safety", version: 1, sourceId: "easylaw_pet", sourceUrl: "https://easylaw.go.kr", reviewedAt: "2026-08-31",
  },
  {
    key: "dog_tick_check",
    species: "dog", lifeStage: null, category: "outdoor",
    title: "산책 후 진드기 확인·빗질",
    description: "풀숲을 다녀왔다면 귀 뒤·겨드랑이·발가락 사이를 살펴보세요. 진드기는 손으로 터뜨리지 말고 동물병원에 문의하세요.",
    rule: { species: "dog", months: [3, 4, 5, 6, 7, 8, 9, 10, 11], repeat: "daily" },
    priority: "safety", version: 1, sourceId: "kdca_sfts", sourceUrl: "https://dportal.kdca.go.kr", reviewedAt: "2026-08-31",
  },
  {
    key: "daily_observation",
    species: null, lifeStage: null, category: "health",
    title: "식욕·음수·배변·행동 변화 기록",
    description: "평소와 다른 점이 있으면 기록해 두세요. 병원에 갈 때 가장 도움이 되는 정보입니다.",
    rule: { repeat: "daily" },
    priority: "health", version: 1, sourceId: null, sourceUrl: null, reviewedAt: "2026-08-31",
  },
  {
    key: "weekly_weight",
    species: null, lifeStage: null, category: "health",
    title: "체중 재서 기록하기",
    description: "같은 시간·같은 저울로 재면 변화를 알아차리기 쉬워요.",
    rule: { repeat: "weekly" },
    priority: "health", version: 1, sourceId: null, sourceUrl: null, reviewedAt: "2026-08-31",
  },
  {
    key: "senior_watch",
    species: null, lifeStage: "senior", category: "health",
    title: "노령 반려동물 음수량·활동량 살피기",
    description: "물을 갑자기 많이 마시거나 움직임이 줄면 기록하고 동물병원과 상담하세요.",
    rule: { lifeStage: ["senior"], repeat: "weekly" },
    priority: "health", version: 1, sourceId: null, sourceUrl: null, reviewedAt: "2026-08-31",
  },
  {
    key: "home_poison_check",
    species: null, lifeStage: null, category: "poison",
    title: "집안 위험 물질 점검",
    description: "사람 약, 초콜릿, 포도, 자일리톨, 양파, 세제, 백합류 식물이 손 닿는 곳에 있는지 확인하세요.",
    rule: { repeat: "monthly" },
    priority: "safety", version: 1, sourceId: null, sourceUrl: null, reviewedAt: "2026-08-31",
  },
  {
    key: "cat_litter",
    species: "cat", lifeStage: null, category: "cat_env",
    title: "화장실 청소 (매일)",
    description: "매일 치우면 배변 변화도 빨리 알 수 있고, 톡소포자충 예방에도 도움이 됩니다. 장갑을 끼고 손을 씻으세요.",
    rule: { species: "cat", repeat: "daily" },
    priority: "health", version: 1, sourceId: "kdca_toxo", sourceUrl: "https://dportal.kdca.go.kr", reviewedAt: "2026-08-31",
  },
  {
    key: "cat_env_check",
    species: "cat", lifeStage: null, category: "cat_env",
    title: "수직공간·숨을 곳·끈류 점검",
    description: "올라갈 곳과 숨을 곳이 있는지, 실·끈·고무줄이 바닥에 떨어져 있지 않은지 살펴보세요.",
    rule: { species: "cat", repeat: "monthly" },
    priority: "general", version: 1, sourceId: null, sourceUrl: null, reviewedAt: "2026-08-31",
  },
  {
    key: "multi_pet_watch",
    species: null, lifeStage: null, category: "behavior",
    title: "다동물 가정: 식사·화장실 따로 쓰는지 확인",
    description: "서로 눈치 보며 못 먹거나 화장실을 피하면 스트레스 신호일 수 있어요.",
    rule: { multiPet: true, repeat: "weekly" },
    priority: "lifestyle", version: 1, sourceId: null, sourceUrl: null, reviewedAt: "2026-08-31",
  },
  {
    key: "insurance_renewal",
    species: null, lifeStage: null, category: "insurance",
    title: "보험 갱신일·청구 서류 확인",
    description: "갱신일이 다가오면 보장 내용이 바뀌는지 보험사 고객센터에서 확인하세요.",
    rule: { insuranceStatus: ["insured"], repeat: "monthly" },
    priority: "lifestyle", version: 1, sourceId: null, sourceUrl: null, reviewedAt: "2026-08-31",
  },
];
