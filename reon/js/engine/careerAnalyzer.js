/* careerAnalyzer — 파이프라인 진입점
   입력(자연어 + 선택 조건) → 역량 추출(AI 또는 DEMO) → 직무 매칭 → 설명. 각 단계는 독립 모듈. */
import { analyzeText } from '../adapters/ai.js';
import { matchJobs } from './jobMatcher.js';
import { analyzeGap } from './gapAnalyzer.js';
import { explainMatch } from './explanationGenerator.js';
import { JOB_MAP } from '../../data/jobs.js';

export async function analyzeCareer(input) {
  const result = await analyzeText(input.text, input.quals || []);
  return { ...result, analyzedAt: new Date().toISOString() };
}

export function buildProfile(input, userSkills) {
  return {
    skills: userSkills,
    quals: input.quals || [],
    prefs: { hours: input.hours, workType: input.workType, wage: input.wage, region: input.region, training: input.training },
  };
}

export function rankJobs(profile) {
  const matches = matchJobs(profile);
  return matches.map((m) => ({ ...m, job: JOB_MAP[m.jobId], explain: explainMatch(JOB_MAP[m.jobId], m) }));
}

export function gapFor(jobId, profile) {
  return analyzeGap(JOB_MAP[jobId], profile);
}
