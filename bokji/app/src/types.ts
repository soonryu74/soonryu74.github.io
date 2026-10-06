/** 상황 태그 — 서비스 화이트리스트 매칭에만 쓰인다. AI 응답도 이 목록 밖의 값은 버린다. */
export const TAGS = [
  'older_adult', // 65세 이상
  'age_60_plus', // 60세 이상
  'living_alone',
  'mobility_issue', // 거동 불편
  'knee_pain', // 무릎·관절 통증
  'hospital_access', // 병원 가기 어려움
  'daily_care_need', // 일상 돌봄 필요(식사·청소·안부)
  'safety_concern', // 혼자 있을 때 쓰러짐·화재 등 걱정
  'dementia_concern',
  'disability_registered',
  'developmental_disability',
  'severe_disability',
  'daytime_care_need', // 낮 시간 돌봄
  'caregiver_burden',
  'assistive_device_need',
  'income_drop',
  'low_income', // 기초생활수급·차상위 등
  'energy_cost',
  'medical_cost',
  'crisis', // 갑작스러운 실직·사망·질병·화재
  'mental_health',
  'abuse_concern',
  'ltc_grade', // 장기요양 등급 있음
  'no_ltc_grade',
] as const;
export type Tag = (typeof TAGS)[number];
export function isTag(x: unknown): x is Tag {
  return typeof x === 'string' && (TAGS as readonly string[]).includes(x);
}

export type Who = 'self' | 'family';
export type AgeBand = 'under60' | '60_64' | '65_74' | '75_84' | '85plus' | 'unknown';
export type YesNoUnknown = 'yes' | 'no' | 'unknown';
export type DisabilityAnswer = 'none' | 'registered' | 'registered_dev' | 'applying' | 'unknown';
export type LtcAnswer = 'has_grade' | 'no_grade' | 'unknown';
export type MainNeed = 'care' | 'hospital' | 'money' | 'energy' | 'daytime' | 'medical_cost' | 'safety' | 'other';

/** 질문 답변. 이름·주민번호·소득액·재산 등은 받지 않는다. */
export interface Answers {
  who: Who | null;
  ageBand: AgeBand | null;
  region: string | null; // 시·도 (선택)
  livesAlone: YesNoUnknown | null;
  disability: DisabilityAnswer | null;
  ltc: LtcAnswer | null;
  mainNeed: MainNeed | null;
  urgent: YesNoUnknown | null;
}

export const EMPTY_ANSWERS: Answers = {
  who: null, ageBand: null, region: null, livesAlone: null, disability: null, ltc: null, mainNeed: null, urgent: null,
};

export interface Evidence { tag: Tag; keyword: string }

/** 자연어 해석 결과(후보). 사용자가 질문 화면에서 확인·수정한다. */
export interface Interpretation {
  tags: Tag[];
  who: Who | null;
  ageBand: AgeBand | null;
  evidence: Evidence[];
  /** 어떤 엔진이 만들었나 */
  engine: 'local-rules' | 'remote-ai';
  error?: string;
}

export type ServiceCategory = '돌봄' | '소득' | '건강·의료' | '장애' | '이동' | '생활비·에너지' | '위기' | '안내';
export type ApplyMethod = '전화' | '방문' | '온라인' | '우편·팩스';

export interface ServiceLink { label: string; url: string }

export interface Service {
  id: string;
  name: string;
  name_easy: string;
  category: ServiceCategory;
  one_line: string;
  summary_easy: string;
  why: string;
  target_tags: Tag[];
  boost_tags: Tag[];
  exclude_tags: Tag[];
  age_min?: number;
  age_max?: number;
  conditions: {
    requires_official_check: true;
    income_tested: boolean;
    needs_registered_disability: boolean;
    needs_developmental: boolean;
  };
  apply: {
    channel: string[];
    methods: ApplyMethod[];
    phone: string | null;
    phone_label: string | null;
    phone_hours: string | null;
    online_url: string | null;
  };
  documents: string[];
  what_to_say: string;
  official_url: string | null;
  official_url_label: string | null;
  official_links: ServiceLink[];
  source_org: string;
  verified_at: string;
  verification: 'search-index' | 'direct' | 'unverified';
  eligibility_note: string;
  last_checked: string;
  urgency: 1 | 2 | 3;
  easy_start: boolean; // 전화 한 통으로 시작할 수 있나
}

export type CardStatus = 'check_first' | 'needs_condition' | 'unclear';
export const STATUS_LABEL: Record<CardStatus, string> = {
  check_first: '먼저 확인해 보세요',
  needs_condition: '조건 확인이 필요합니다',
  unclear: '현재 정보만으로 판단하기 어렵습니다',
};

export interface Scored {
  service: Service;
  score: number;
  status: CardStatus;
  reasons: string[]; // 왜 이 카드가 나왔는지(사람이 읽는 말)
  matched: Tag[];
}

export interface Recommendation {
  primary: Scored[]; // 최대 3
  secondary: Scored[]; // 추가로 확인할 서비스
  tags: Tag[];
  emergency: boolean; // 긴급 연락처를 맨 위에 보여줄지
}

export interface ActionItem {
  n: number;
  title: string; // 오늘 할 일 한 줄
  detail: string; // 전화해서 뭐라고 말할지
  phone: string | null;
  phone_label: string | null;
  prepare: string[];
  serviceIds: string[];
  url: string | null;
}

export interface EmergencyContact { label: string; phone: string; when: string; hours: string; url: string | null }
