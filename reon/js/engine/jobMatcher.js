/* jobMatcher — Career Transition Score
   가중치: 전이역량 유사도 40 · 희망조건 적합도 20 · 진입장벽 15 · 직업전망·노동시장 15 · 지역·근무형태 접근성 10
   데이터가 없는 요소(전망, 접근성)는 가짜 수치로 채우지 않고 applied=false 로 표시한 뒤
   적용된 가중치 합으로 재정규화한다. */
import { JOBS } from '../../data/jobs.js';
import { SKILL_MAP } from '../../data/skills.js';

export const WEIGHTS = [
  { key: 'transfer', label: '전이역량 유사도', weight: 0.40 },
  { key: 'prefs', label: '희망조건 적합도', weight: 0.20 },
  { key: 'barrier', label: '진입장벽(자격·훈련)', weight: 0.15 },
  { key: 'outlook', label: '직업전망·노동시장 정보', weight: 0.15 },
  { key: 'access', label: '지역·근무형태 접근성', weight: 0.10 },
];

function transferScore(job, skillSet) {
  const total = job.core.reduce((s, [, w]) => s + w, 0);
  const matched = job.core.filter(([id]) => skillSet.has(id));
  const got = matched.reduce((s, [, w]) => s + w, 0);
  const niceMatched = job.nice.filter((id) => skillSet.has(id));
  const bonus = Math.min(0.15, niceMatched.length * 0.05);
  return {
    value: Math.min(1, got / total + bonus),
    matchedCore: matched.map(([id]) => id),
    missingCore: job.core.filter(([id]) => !skillSet.has(id)).map(([id]) => id),
    matchedNice: niceMatched,
    detail: `핵심역량 ${matched.length}/${job.core.length} 일치(가중 ${got}/${total}), 보조역량 ${niceMatched.length}개`,
  };
}

function prefsScore(job, prefs) {
  const notes = [];
  let hours;
  if (prefs.hours === 'day') { hours = job.pattern.day ? 1 : 0.4; notes.push(job.pattern.day ? '주간근무 희망 ↔ 주간 위주 직무' : '주간근무 희망이나 교대·야간이 흔한 직무'); }
  else if (prefs.hours === 'flex') { hours = job.pattern.partTime ? 1 : 0.7; notes.push('시간 조정 희망'); }
  else { hours = 0.8; notes.push('근무시간 무관'); }
  let type;
  if (prefs.workType === 'part') { type = job.pattern.partTime ? 1 : 0.4; notes.push(job.pattern.partTime ? '시간제 희망 ↔ 시간제 자리 많음' : '시간제 희망이나 전일제 위주'); }
  else if (prefs.workType === 'full') { type = 0.9; notes.push('전일제 희망'); }
  else { type = 0.8; notes.push('근무형태 무관'); }
  return { value: (hours + type) / 2, detail: notes.join(' · ') + ' · 희망임금은 임금 데이터 미연결로 미반영' };
}

function barrierScore(job, qualSet, training) {
  const required = job.quals.filter((q) => q.required);
  const missing = required.filter((q) => !(q.anyOf ? q.anyOf.some((id) => qualSet.has(id)) : qualSet.has(q.id)));
  let req = 1;
  let note = required.length ? '필수 자격 보유' : '법정 필수 자격 없음';
  if (missing.length) {
    req = training === 'yes' ? 0.55 : training === 'maybe' ? 0.4 : 0.15;
    note = `필수 자격 미보유(${missing.map((q) => q.label).join(', ')}) · 교육 의향 ${training === 'yes' ? '있음' : training === 'maybe' ? '보통' : '없음'}`;
  }
  const level = { low: 1, mid: 0.85, high: 0.7 }[job.barrier] ?? 0.85;
  return { value: req * level, detail: `${note} · 진입장벽 ${({ low: '낮음', mid: '보통', high: '높음' })[job.barrier]}`, missingRequired: missing };
}

/** @param profile {skills:string[], quals:string[], prefs:{hours,workType,wage,region,training}} */
export function matchJobs(profile) {
  const skillSet = new Set(profile.skills);
  const qualSet = new Set(profile.quals || []);
  const results = JOBS.map((job) => {
    const t = transferScore(job, skillSet);
    const p = prefsScore(job, profile.prefs || {});
    const b = barrierScore(job, qualSet, (profile.prefs || {}).training);
    const parts = {
      transfer: { ...t, weight: 0.40, applied: true },
      prefs: { ...p, weight: 0.20, applied: true },
      barrier: { ...b, weight: 0.15, applied: true },
      outlook: { value: null, weight: 0.15, applied: false, detail: '현재 데모에서는 반영하지 않음 — 고용24 직업정보 상세(전망·임금) 연결 예정' },
      access: { value: null, weight: 0.10, applied: false, detail: '데이터 연결 예정 — 지역별 채용 밀도 데이터 없음. 희망지역은 채용 검색 조건으로만 사용' },
    };
    const appliedW = Object.values(parts).filter((x) => x.applied).reduce((s, x) => s + x.weight, 0);
    const raw = Object.values(parts).filter((x) => x.applied).reduce((s, x) => s + x.weight * x.value, 0) / appliedW;
    return {
      jobId: job.id,
      score: Math.round(raw * 100),
      parts,
      appliedWeight: appliedW,
      matchedSkills: [...t.matchedCore, ...t.matchedNice].map((id) => SKILL_MAP[id].label),
    };
  });
  results.sort((a, b) => b.score - a.score || b.parts.transfer.value - a.parts.transfer.value || a.jobId.localeCompare(b.jobId));
  return results;
}
