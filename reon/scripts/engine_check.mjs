// 엔진 단독 검증(브라우저 없이) — Persona 5종에 대해 역량 추출 → TOP3 → Gap 을 출력
globalThis.window = { REON_CONFIG: { AI_ENDPOINT: '' } };
const { PERSONAS } = await import('../data/personas.js');
const { extractSkills } = await import('../js/engine/skillExtractor.js');
const { matchJobs } = await import('../js/engine/jobMatcher.js');
const { analyzeGap } = await import('../js/engine/gapAnalyzer.js');
const { explainMatch } = await import('../js/engine/explanationGenerator.js');
const { JOB_MAP } = await import('../data/jobs.js');
const { SKILL_MAP } = await import('../data/skills.js');
const out = [];
for (const p of PERSONAS) {
  const skills = extractSkills(p.text, p.quals);
  const profile = { skills: skills.map((s) => s.id), quals: p.quals, prefs: { hours: p.hours, workType: p.workType, wage: p.wage, region: p.region, training: p.training } };
  const matches = matchJobs(profile);
  const top3 = matches.slice(0, 3);
  out.push({ persona: p.id + ' ' + p.name, skills: skills.map((s) => SKILL_MAP[s.id].label), top3: top3.map((m) => ({ job: JOB_MAP[m.jobId].title, score: m.score, why: explainMatch(JOB_MAP[m.jobId], m).why, gap: (() => { const g = analyzeGap(JOB_MAP[m.jobId], profile); return { have: g.have.length, improve: g.improve.length, required: g.requiredQuals.map((q) => q.label + (q.held ? '(보유)' : '(미보유)')) }; })() })) });
}
console.log(JSON.stringify(out, null, 1));
