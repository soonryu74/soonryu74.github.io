export type DayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export const DAYS = ['월', '화', '수', '목', '금', '토', '일'] as const;
export const DAYS_LONG = ['월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일'] as const;

export type ServiceTypeId =
  | 'visit_care'
  | 'visit_nursing'
  | 'visit_bath'
  | 'day_care'
  | 'family'
  | 'meal'
  | 'hospital_escort'
  | 'med_check'
  | 'emergency_safety'
  | 'cognitive'
  | 'community'
  | 'hospital_visit'
  | 'other';

export type CareFunction = 'meal' | 'meds' | 'mobility' | 'hygiene' | 'hospital' | 'cognition' | 'group' | 'emergency';

export interface ServiceTypeDef {
  id: ServiceTypeId;
  label: string;
  short: string;
  icon: string;
  /** 이 일정 동안 사람이 곁에 있는가(혼자 계신 시간 계산에 사용) */
  presence: boolean;
  functions: CareFunction[];
  /** 요일·시간 없이 상시 제공되는 서비스(예: 응급안전 장비) */
  continuous?: boolean;
  onboarding?: boolean;
  schedulable: boolean;
  note?: string;
}

export interface ScheduleEntry {
  id: string;
  day: DayIndex;
  /** HH:MM */
  start: string;
  /** HH:MM, 24:00 허용. start 보다 이르면 다음 날로 넘어가는 일정 */
  end: string;
  type: ServiceTypeId;
  note?: string;
}

export type ConcernId =
  | 'mobility'
  | 'recentFall'
  | 'forgetsMeds'
  | 'skipsMeals'
  | 'memory'
  | 'frequentHospital'
  | 'nightAlone'
  | 'emergency'
  | 'isolation';

export type LtcGrade = 'unknown' | 'none' | '1' | '2' | '3' | '4' | '5' | 'cognitive';

export interface Profile {
  age: number | null;
  sex: 'female' | 'male' | 'unspecified';
  sido: string;
  sigungu: string;
  livesAlone: boolean | null;
  ltcGrade: LtcGrade;
}

export interface CareInput {
  profile: Profile;
  concerns: Record<ConcernId, boolean>;
  servicesInUse: ServiceTypeId[];
  schedule: ScheduleEntry[];
}

export type GapStatus = 'check' | 'covered' | 'no_gap';

export type FactValue = number | boolean | string;
export type Facts = Record<string, FactValue>;

export type Op = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte';
export interface Condition {
  fact: string;
  op: Op;
  value: number | boolean;
}
export type When = { all: (Condition | When)[] } | { any: (Condition | When)[] };

export interface Rule {
  id: string;
  domain: string;
  when: When;
  result: 'check' | 'covered';
  reason: string;
}

export interface DomainDef {
  id: string;
  label: string;
  icon: string;
  description: string;
  checkItems: string[];
  services: string[];
  ltcTypes: string[];
  noGapText: string;
}

export interface ConditionTrace {
  fact: string;
  label: string;
  op: Op;
  expected: number | boolean;
  actual: FactValue;
  actualText: string;
  expectedText: string;
  passed: boolean;
}

export interface RuleMatch {
  ruleId: string;
  result: 'check' | 'covered';
  reason: string;
  conditions: ConditionTrace[];
}

export interface DomainResult {
  domain: DomainDef;
  status: GapStatus;
  /** 대표 이유(첫 번째로 일치한 규칙) */
  reason: string;
  matches: RuleMatch[];
}

export interface EvaluationResult {
  facts: Facts;
  domains: DomainResult[];
  checkCount: number;
}
