import type { AgeBand, Evidence, Interpretation, Tag, Who } from '../types';

/**
 * 브라우저 안에서만 도는 결정적(deterministic) 키워드 규칙.
 * 외부 전송 없음. 결과는 '후보'이며 질문 화면에서 사용자가 확인·수정한다.
 */
const RULES: { tag: Tag; patterns: RegExp[] }[] = [
  { tag: 'living_alone', patterns: [/혼자\s*(사|살|계|지내|있|생활)/, /독거/, /홀로/] },
  { tag: 'knee_pain', patterns: [/무릎/, /관절/] },
  { tag: 'mobility_issue', patterns: [/거동/, /걷기/, /걸음/, /못\s*걸/, /휠체어/, /보행/, /움직이기/, /다리가/, /허리가/, /무릎/, /관절/, /넘어/, /낙상/, /외출이?\s*(어렵|힘들)/, /누워/] },
  { tag: 'hospital_access', patterns: [/병원\s*(에|을|도|에는)?\s*(가|다니|못|혼자|이동|모시)/, /통원/, /진료\s*받으러/, /병원\s*가기/, /병원\s*갈/] },
  { tag: 'daily_care_need', patterns: [/돌봄/, /돌봐/, /돌보/, /식사/, /밥을?\s*(못|잘)/, /청소/, /빨래/, /안부/, /말벗/, /챙겨/, /간병/, /수발/] },
  { tag: 'safety_concern', patterns: [/쓰러/, /응급/, /위험/, /화재/, /불\s*(이|날)/, /안전/, /넘어질/, /걱정/] },
  { tag: 'dementia_concern', patterns: [/치매/, /깜빡/, /기억력?/, /인지/, /건망/] },
  { tag: 'developmental_disability', patterns: [/발달\s*장애/, /지적\s*장애/, /자폐/] },
  { tag: 'severe_disability', patterns: [/중증/, /심한\s*장애/, /장애\s*1급/] },
  { tag: 'disability_registered', patterns: [/장애/, /복지카드/] },
  { tag: 'daytime_care_need', patterns: [/낮\s*시간/, /낮에/, /주간/, /낮\s*동안/, /직장\s*(다니|가)/, /일하는\s*동안/, /출근/] },
  { tag: 'caregiver_burden', patterns: [/돌보(느라|기\s*(힘|어렵))/, /지쳐/, /보호자/, /자녀가\s*있/, /간병하느라/, /혼자\s*돌보/, /부모(로서|인데)/, /돌봄이\s*필요/] },
  { tag: 'assistive_device_need', patterns: [/보행기/, /휠체어/, /지팡이/, /보조기기/, /보청기/, /전동/] },
  { tag: 'low_income', patterns: [/수급자/, /기초생활/, /차상위/, /저소득/, /수급\s*가구/] },
  { tag: 'income_drop', patterns: [/소득이?\s*(줄|끊|없)/, /수입이?\s*(줄|끊|없)/, /벌이/, /실직/, /일자리를?\s*잃/, /폐업/, /월급/, /돈이\s*(없|부족|모자)/, /생활비/, /생계/, /형편/] },
  { tag: 'energy_cost', patterns: [/전기\s*(요금|세|료)/, /가스\s*(비|요금)/, /난방/, /냉방/, /연탄/, /등유/, /공과금/] },
  { tag: 'medical_cost', patterns: [/병원비/, /의료비/, /치료비/, /수술비/, /입원비/, /약값/] },
  { tag: 'crisis', patterns: [/실직/, /해고/, /폐업/, /돌아가(셨|시)/, /사망/, /화재/, /갑자기/, /갑작스/, /쫓겨/, /가정\s*폭력/, /밀린/, /못\s*내/, /끊겼?/, /압류/] },
  { tag: 'mental_health', patterns: [/우울/, /죽고\s*싶/, /불안/, /극단/, /자살/, /정신/] },
  { tag: 'abuse_concern', patterns: [/학대/, /때리/, /폭력/, /방임/, /폭언/] },
  { tag: 'ltc_grade', patterns: [/장기요양\s*등급(이|을)?\s*(있|받|나왔)/, /[1-5]등급(이|을)?\s*(있|받|나왔)/, /인지지원등급/] },
  { tag: 'no_ltc_grade', patterns: [/등급(이|을)?\s*(없|못|안)/, /장기요양.*(안|못)\s*(했|받)/] },
  { tag: 'older_adult', patterns: [/할머니/, /할아버지/, /어르신/, /노인/, /고령/, /연세/, /노모/, /노부/] },
];

const FAMILY = [/어머니/, /어머님/, /아버지/, /아버님/, /엄마/, /아빠/, /부모/, /자녀/, /아들/, /딸/, /남편/, /아내/, /할머니/, /할아버지/, /시어머니/, /시아버지/, /장모/, /장인/, /가족/, /아이/, /형/, /누나/, /언니/, /동생/, /노모/];
const SELF = [/제가/, /저는/, /저도/, /내가/, /나는/, /저희?\s*집/, /혼자\s*사는데/, /^혼자/];

export function ageBandFromAge(age: number): AgeBand {
  if (age < 60) return 'under60';
  if (age < 65) return '60_64';
  if (age < 75) return '65_74';
  if (age < 85) return '75_84';
  return '85plus';
}

export function interpretLocal(raw: string): Interpretation {
  const text = (raw || '').replace(/\s+/g, ' ').trim();
  const tags = new Set<Tag>();
  const evidence: Evidence[] = [];
  const add = (tag: Tag, keyword: string) => {
    if (!tags.has(tag)) { tags.add(tag); evidence.push({ tag, keyword }); }
  };

  for (const r of RULES) {
    for (const p of r.patterns) {
      const m = text.match(p);
      if (m) { add(r.tag, m[0]); break; }
    }
  }

  // 나이
  let ageBand: AgeBand | null = null;
  const am = text.match(/(\d{2,3})\s*(세|살)/);
  if (am) {
    const age = Number(am[1]);
    if (age >= 1 && age <= 120) {
      ageBand = ageBandFromAge(age);
      if (age >= 65) add('older_adult', am[0]);
      if (age >= 60) add('age_60_plus', am[0]);
    }
  }
  if (tags.has('older_adult')) tags.add('age_60_plus');

  // 발달장애 → 등록장애 가정(질문에서 재확인)
  if (tags.has('developmental_disability')) add('disability_registered', '발달장애');
  // 돌봄이 필요한 발달장애 자녀 → 보호자 부담 후보
  if (tags.has('developmental_disability') && tags.has('daily_care_need')) add('caregiver_burden', '돌봄이 필요');
  // '걱정'만으로 safety_concern 을 세우진 않는다(혼자 + 걱정 또는 쓰러짐 등 구체어가 있어야)
  const ev = evidence.find((e) => e.tag === 'safety_concern');
  if (ev && ev.keyword === '걱정' && !tags.has('living_alone')) {
    tags.delete('safety_concern');
    evidence.splice(evidence.indexOf(ev), 1);
  }

  let who: Who | null = null;
  if (FAMILY.some((p) => p.test(text))) who = 'family';
  else if (SELF.some((p) => p.test(text))) who = 'self';

  return { tags: [...tags], who, ageBand, evidence, engine: 'local-rules' };
}
