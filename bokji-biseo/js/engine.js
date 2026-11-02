// 규칙 엔진 — 판정은 여기서만 한다. AI는 규칙 초안·설명을 만들 뿐 판정하지 않는다.
// 각 조건은 true / false / null(모름) 셋 중 하나로 평가된다.

export const HOUSEHOLD = {
  single: '1인가구', single_parent: '한부모·조손', multi_child: '다자녀(2명 이상)', disabled: '장애인(등록)',
  multicultural: '다문화·결혼이민', defector: '북한이탈주민', basic: '기초생활수급자', near_poor: '차상위계층',
  pregnant: '임신 중·출산 예정', infant: '영유아·아동 자녀 있음', veteran: '국가보훈대상', farmer: '농어업인', student: '대학(원)생',
};
export const SITUATION = {
  illness_tb: '결핵으로 입원·격리치료 명령을 받음', illness_severe: '암·희귀질환·중증난치질환 치료 중', illness_other: '중한 질병·부상으로 일을 못 함',
  income_loss: '실직·휴폐업·소득 급감', housing_crisis: '월세 체납·퇴거 위기', hospital_bills: '병원비 부담이 큼', energy: '난방·전기요금 부담',
  job_seeking: '구직·취업 준비 중',
};
export const BUSINESS = { none: '해당 없음', self: '자영업·소상공인', freelance: '프리랜서·특수고용' };
export const EMPLOYMENT = { insured: '고용보험 가입 근로자', uninsured: '고용보험 미가입(일용·프리랜서 등)', none: '현재 일하지 않음' };
export const INCOME = [
  [50, '기준 중위소득 50% 이하 (4인 약 330만 원 이하)'], [75, '75% 이하'], [100, '100% 이하 (4인 약 660만 원)'],
  [125, '125% 이하'], [150, '150% 이하'], [200, '200% 이하'], [999, '200% 초과 또는 모름'],
];

export const emptyProfile = () => ({ age: null, sido: '', household: [], situation: [], business: 'none', employment: 'none', income_pct: null, themes: [] });

function evalCond(cond, p) {
  const out = []; // {label, state:true|false|null, text}
  const has = (arr, k) => Array.isArray(arr) && arr.includes(k);
  if (cond.age_min != null || cond.age_max != null) {
    const lab = `나이 ${cond.age_min ?? ''}~${cond.age_max ?? ''}세`.replace('~세', '세 이상').replace(/ ~/, ' ');
    if (p.age == null) out.push({ label: lab, state: null });
    else out.push({ label: lab, state: (cond.age_min == null || p.age >= cond.age_min) && (cond.age_max == null || p.age <= cond.age_max) });
  }
  if (cond.income_max_pct != null) {
    const lab = `소득 기준 중위소득 ${cond.income_max_pct}% 이하`;
    if (p.income_pct == null || p.income_pct === 999) out.push({ label: lab, state: null });
    else out.push({ label: lab, state: p.income_pct <= cond.income_max_pct });
  }
  if (cond.household_any?.length) {
    const lab = '가구유형: ' + cond.household_any.map(k => HOUSEHOLD[k] || k).join(' 또는 ');
    out.push({ label: lab, state: cond.household_any.some(k => has(p.household, k)) });
  }
  if (cond.household_all?.length) {
    const lab = '가구유형(모두): ' + cond.household_all.map(k => HOUSEHOLD[k] || k).join(' + ');
    out.push({ label: lab, state: cond.household_all.every(k => has(p.household, k)) });
  }
  if (cond.situation_any?.length) {
    const lab = '상황: ' + cond.situation_any.map(k => SITUATION[k] || k).join(' 또는 ');
    out.push({ label: lab, state: cond.situation_any.some(k => has(p.situation, k)) });
  }
  if (cond.business) {
    if (cond.business === 'required') out.push({ label: '사업자(자영업·소상공인) 요건', state: p.business === 'self' });
    if (cond.business === 'self_or_freelance') out.push({ label: '자영업·프리랜서 등 비임금 근로', state: p.business === 'self' || p.business === 'freelance' });
  }
  if (cond.employment) {
    const lab = cond.employment === 'insured' ? '고용보험 가입 근로자' : cond.employment === 'uninsured' ? '고용보험 미적용(1인 사업자·프리랜서 등)' : '';
    if (lab) out.push({ label: lab, state: cond.employment === 'insured' ? p.employment === 'insured' : (p.employment === 'uninsured' || p.business !== 'none') });
  }
  if (cond.manual) out.push({ label: cond.manual, state: null });
  return out;
}

// 결과: 'ok' 모든 조건 충족 / 'check' 모름이 섞임 / 'no' 하나라도 불충족
export function judge(service, profile) {
  const rule = service.rule;
  if (!rule || rule.status === 'none') return { tier: 'none', checks: [] };
  const checks = evalCond(rule.cond || {}, profile);
  if (checks.some(c => c.state === false)) return { tier: 'no', checks };
  const unknown = checks.filter(c => c.state === null).length;
  const positives = checks.filter(c => c.state === true).length;
  if (rule.status === 'draft') return { tier: positives > 0 ? 'draft' : 'none', checks, positives };
  if (checks.length === 0) return { tier: 'check', checks, positives }; // 조건 없음 = 전 국민 → 확인 필요로 낮춰 표시
  return { tier: unknown ? 'check' : 'ok', checks, positives };
}

export function run(services, profile) {
  const groups = { ok: [], check: [], draft: [] };
  for (const s of services) {
    const r = judge(s, profile);
    if (r.tier === 'ok' || r.tier === 'check' || r.tier === 'draft') groups[r.tier].push({ s, r });
  }
  const score = x => (x.r.positives || 0) * 10 + (x.s.online === 'Y' ? 1 : 0);
  for (const k of Object.keys(groups)) groups[k].sort((a, b) => score(b) - score(a));
  return groups;
}
