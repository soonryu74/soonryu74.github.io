import servicesJson from '../data/services.json';
import type { Answers, CardStatus, Recommendation, Scored, Service, Tag } from '../types';
import { ageRange, TAG_LABEL } from './facts';

export const SERVICES = servicesJson as Service[];
export function serviceById(id: string): Service | undefined {
  return SERVICES.find((s) => s.id === id);
}

/** '가장 필요한 도움' 답변과 직접 맞는 서비스(가산점) */
const NEED_MATCH: Record<NonNullable<Answers['mainNeed']>, string[]> = {
  care: ['elderly-care', 'ltc-recognition', 'activity-support'],
  hospital: ['ltc-recognition', 'mobility-special-transport', 'home-health', 'elderly-care'],
  money: ['emergency-welfare', 'basic-livelihood', 'basic-pension', 'disability-pension'],
  energy: ['kepco-discount', 'energy-voucher', 'emergency-welfare'],
  daytime: ['day-activity', 'activity-support'],
  medical_cost: ['catastrophic-medical', 'emergency-welfare'],
  safety: ['emergency-safety', 'elderly-care'],
  other: [],
};

const GUIDE_ONLY = new Set(['welfare-membership', 'gov24-benefit']);

/**
 * 규칙 기반 추천.
 * 1) 화이트리스트(services.json)에서 태그가 하나라도 맞는 후보만 남긴다(허위 서비스 불가).
 * 2) 나이·제외 태그·장애 등록 조건으로 거른다.
 * 3) 점수: 핵심 태그 일치(2점) + 일반 태그 일치(0.5점) + 긴급도(0.5~1.5) + 전화로 시작 가능(0.5) + '가장 필요한 도움' 직접 일치(4점부터 순서대로 감소).
 * 4) 상태: 소득 기준이 있는데 수급 여부를 모르면 '조건 확인', 장애 등록 여부를 모르면 '판단 어려움', 그 외 '먼저 확인'.
 * 어떤 경우에도 '받을 수 있다'고 단정하지 않는다.
 */
export function recommend(answers: Answers, tags: Tag[]): Recommendation {
  const T = new Set(tags);
  const age = ageRange(answers.ageBand);
  const scored: Scored[] = [];

  for (const s of SERVICES) {
    if (s.exclude_tags.some((t) => T.has(t))) continue;
    const matched = s.target_tags.filter((t) => T.has(t));
    if (matched.length === 0) continue;
    if (age) {
      if (s.age_min != null && age[1] < s.age_min) continue;
      if (s.age_max != null && age[0] > s.age_max) continue;
    }
    if (s.conditions.needs_registered_disability && answers.disability === 'none') continue;
    if (s.conditions.needs_developmental && answers.disability === 'registered') continue;

    const boost = s.boost_tags.filter((t) => T.has(t));
    let score = boost.length * 2 + matched.length * 0.5 + s.urgency * 0.5 + (s.easy_start ? 0.5 : 0);
    const needIdx = answers.mainNeed ? NEED_MATCH[answers.mainNeed].indexOf(s.id) : -1;
    if (needIdx >= 0) score += 4 - needIdx * 0.75; // 직접 일치: 4, 3.25, 2.5, 1.75
    if (T.has('crisis') && s.id === 'emergency-welfare') score += 3;
    if (GUIDE_ONLY.has(s.id)) score = 0.1; // 안내 서비스는 항상 '추가로 확인'에

    let status: CardStatus = 'check_first';
    const reasons = matched.map((t) => TAG_LABEL[t]);
    if (s.conditions.needs_registered_disability && (answers.disability === 'unknown' || answers.disability === 'applying' || answers.disability == null) && !T.has('disability_registered')) {
      status = 'unclear';
      reasons.push('장애 등록 여부를 알 수 없음');
    } else if (s.conditions.needs_developmental && !T.has('developmental_disability')) {
      status = 'unclear';
      reasons.push('발달장애 등록 여부를 알 수 없음');
    } else if (s.conditions.income_tested && !T.has('low_income')) {
      status = 'needs_condition';
      reasons.push('소득·재산 기준이 있음(현재 정보로 알 수 없음)');
    }
    if (!age && s.age_min != null && status === 'check_first') {
      status = 'needs_condition';
      reasons.push(`나이 기준(${s.age_min}세 이상)`);
    }
    scored.push({ service: s, score, status, reasons, matched });
  }

  scored.sort((a, b) => b.score - a.score || a.service.name.localeCompare(b.service.name, 'ko'));
  const primary = scored.filter((x) => !GUIDE_ONLY.has(x.service.id)).slice(0, 3);
  const rest = scored.filter((x) => !primary.includes(x) && !GUIDE_ONLY.has(x.service.id)).slice(0, 5);
  // 안내 서비스(복지멤버십·혜택알리미)는 항상 추가 목록 끝에 넣는다
  for (const id of GUIDE_ONLY) {
    const s = serviceById(id)!;
    rest.push({ service: s, score: 0, status: 'check_first', reasons: ['놓치는 지원이 없도록'], matched: [] });
  }
  const secondary = rest;
  const emergency = answers.urgent === 'yes' || T.has('crisis') || T.has('mental_health') || T.has('abuse_concern');
  return { primary, secondary, tags, emergency };
}
