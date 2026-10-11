/* explanationGenerator — 점수가 아니라 사람이 읽는 문장으로 "왜 추천했는가"를 만든다. */
import { SKILL_MAP } from '../../data/skills.js';

const list = (ids, n = 3) => ids.slice(0, n).map((id) => SKILL_MAP[id].label).join('·');

export function explainMatch(job, match) {
  const t = match.parts.transfer;
  const strengths = [...t.matchedCore, ...t.matchedNice].map((id) => SKILL_MAP[id].label);
  const improve = t.missingCore.map((id) => SKILL_MAP[id].label);
  let why;
  if (t.matchedCore.length >= 2) {
    why = `당신의 ${list(t.matchedCore)} 경험이 이 직무의 핵심 능력과 직접 연결됩니다.`;
  } else if (t.matchedCore.length === 1) {
    why = `당신의 ${list(t.matchedCore)} 경험이 이 직무의 핵심 능력 중 하나와 연결됩니다. 나머지는 보완이 필요합니다.`;
  } else {
    why = '핵심 능력과 직접 겹치는 경험은 적지만, 보조 역량이 연결되어 후보에 올랐습니다.';
  }
  const b = match.parts.barrier;
  if (b.missingRequired && b.missingRequired.length) {
    why += ` 단, ${b.missingRequired.map((q) => q.label).join(', ')}이(가) 필수여서 자격 취득이 먼저입니다.`;
  } else if (job.quals.length === 0) {
    why += ' 법정 필수 자격이 없어 바로 지원을 검토할 수 있습니다.';
  }
  const improveText = [
    ...improve.slice(0, 2),
    ...job.recommended.slice(0, 1),
  ];
  return { why, strengths, improve: improveText };
}

/** Evidence 패널용 구조화 근거 */
export function buildEvidence(session, jobs, matches) {
  const input = session.input || {};
  return {
    input: {
      text: input.text || '',
      region: input.region ? input.region.filter(Boolean).join(' ') : '',
      workType: input.workType, hours: input.hours, wage: input.wage,
      quals: input.quals || [], training: input.training,
    },
    analysisMode: session.analysis?.mode || 'demo',
    extracted: (session.analysis?.skills || []).map((s) => ({ id: s.id, label: SKILL_MAP[s.id]?.label || s.id, evidence: s.evidence, from: s.from })),
    userEdited: session.userSkills || [],
    compared: matches.map((m) => ({ jobId: m.jobId, title: jobs[m.jobId]?.title, score: m.score, parts: m.parts })),
  };
}
