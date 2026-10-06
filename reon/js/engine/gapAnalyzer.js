/* gapAnalyzer — 선택 직무 기준 3분류: 이미 갖춘 것 / 보완하면 좋은 것 / 필요한 자격·교육(필수·권장 구분) */
import { SKILL_MAP } from '../../data/skills.js';

export function analyzeGap(job, profile) {
  const skillSet = new Set(profile.skills);
  const qualSet = new Set(profile.quals || []);
  const have = [];
  const improve = [];
  for (const [id, w] of job.core) (skillSet.has(id) ? have : improve).push({ id, label: SKILL_MAP[id].label, type: 'core', weight: w });
  for (const id of job.nice) (skillSet.has(id) ? have : improve).push({ id, label: SKILL_MAP[id].label, type: 'nice', weight: 1 });
  const quals = job.quals.map((q) => ({ ...q, held: qualSet.has(q.id) }));
  return {
    have,
    improve: improve.sort((a, b) => b.weight - a.weight),
    requiredQuals: quals.filter((q) => q.required),
    recommendedQuals: quals.filter((q) => !q.required),
    recommended: job.recommended,
    blocked: quals.some((q) => q.required && !q.held),
  };
}
