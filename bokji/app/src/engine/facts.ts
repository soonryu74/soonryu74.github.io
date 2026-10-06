import type { AgeBand, Answers, Interpretation, Tag } from '../types';

/** 연령대 → [최소, 최대] 나이 */
export function ageRange(b: AgeBand | null): [number, number] | null {
  switch (b) {
    case 'under60': return [0, 59];
    case '60_64': return [60, 64];
    case '65_74': return [65, 74];
    case '75_84': return [75, 84];
    case '85plus': return [85, 120];
    default: return null;
  }
}

/** 질문 답변 + 자연어 후보 태그 → 최종 태그. 답변이 자연어보다 우선한다. */
export function buildTags(answers: Answers, interp: Interpretation | null): Tag[] {
  const tags = new Set<Tag>(interp?.tags ?? []);
  const r = ageRange(answers.ageBand);
  if (r) {
    tags.delete('older_adult'); tags.delete('age_60_plus');
    if (r[0] >= 65) tags.add('older_adult');
    if (r[0] >= 60) tags.add('age_60_plus');
  }
  if (answers.livesAlone === 'yes') tags.add('living_alone');
  if (answers.livesAlone === 'no') tags.delete('living_alone');

  if (answers.disability === 'none') {
    tags.delete('disability_registered'); tags.delete('developmental_disability'); tags.delete('severe_disability');
  }
  if (answers.disability === 'registered') tags.add('disability_registered');
  if (answers.disability === 'registered_dev') { tags.add('disability_registered'); tags.add('developmental_disability'); }

  if (answers.ltc === 'has_grade') { tags.add('ltc_grade'); tags.delete('no_ltc_grade'); }
  if (answers.ltc === 'no_grade') { tags.add('no_ltc_grade'); tags.delete('ltc_grade'); }

  switch (answers.mainNeed) {
    case 'care': tags.add('daily_care_need'); break;
    case 'hospital': tags.add('hospital_access'); tags.add('mobility_issue'); break;
    case 'money': tags.add('income_drop'); break;
    case 'energy': tags.add('energy_cost'); break;
    case 'daytime': tags.add('daytime_care_need'); tags.add('caregiver_burden'); break;
    case 'medical_cost': tags.add('medical_cost'); break;
    case 'safety': tags.add('safety_concern'); break;
  }
  if (answers.urgent === 'yes' && (tags.has('income_drop') || tags.has('medical_cost') || tags.has('energy_cost'))) tags.add('crisis');
  return [...tags];
}

/** 답변이 비어 있을 때 자연어 해석으로 미리 채운다(사용자가 질문 화면에서 확인). */
export function prefillAnswers(answers: Answers, interp: Interpretation | null): Answers {
  if (!interp) return answers;
  const a = { ...answers };
  const t = new Set(interp.tags);
  if (!a.who && interp.who) a.who = interp.who;
  if (!a.ageBand && interp.ageBand) a.ageBand = interp.ageBand;
  if (!a.livesAlone && t.has('living_alone')) a.livesAlone = 'yes';
  if (!a.disability) {
    if (t.has('developmental_disability')) a.disability = 'registered_dev';
    else if (t.has('disability_registered')) a.disability = 'registered';
  }
  if (!a.ltc) {
    if (t.has('ltc_grade')) a.ltc = 'has_grade';
    else if (t.has('no_ltc_grade')) a.ltc = 'no_grade';
  }
  if (!a.mainNeed) {
    if (t.has('daytime_care_need')) a.mainNeed = 'daytime';
    else if (t.has('hospital_access')) a.mainNeed = 'hospital';
    else if (t.has('energy_cost')) a.mainNeed = 'energy';
    else if (t.has('medical_cost')) a.mainNeed = 'medical_cost';
    else if (t.has('income_drop') || t.has('crisis')) a.mainNeed = 'money';
    else if (t.has('safety_concern')) a.mainNeed = 'safety';
    else if (t.has('daily_care_need') || t.has('mobility_issue')) a.mainNeed = 'care';
  }
  if (!a.urgent && (t.has('crisis') || t.has('mental_health') || t.has('abuse_concern'))) a.urgent = 'yes';
  return a;
}

export const TAG_LABEL: Record<Tag, string> = {
  older_adult: '65세 이상',
  age_60_plus: '60세 이상',
  living_alone: '혼자 지내심',
  mobility_issue: '거동이 불편함',
  knee_pain: '무릎·관절 통증',
  hospital_access: '병원 가기 어려움',
  daily_care_need: '일상 돌봄 필요',
  safety_concern: '혼자 있을 때 안전 걱정',
  dementia_concern: '기억력·치매 걱정',
  disability_registered: '등록장애인',
  developmental_disability: '발달장애(지적·자폐성)',
  severe_disability: '중증장애',
  daytime_care_need: '낮 시간 돌봄 필요',
  caregiver_burden: '돌보는 가족의 부담',
  assistive_device_need: '보조기기 필요',
  income_drop: '소득이 줄어듦',
  low_income: '기초생활수급·차상위',
  energy_cost: '전기·가스·난방비 부담',
  medical_cost: '병원비 부담',
  crisis: '갑작스러운 위기 상황',
  mental_health: '마음 건강 위기',
  abuse_concern: '학대·폭력 걱정',
  ltc_grade: '장기요양 등급 있음',
  no_ltc_grade: '장기요양 등급 없음',
};
