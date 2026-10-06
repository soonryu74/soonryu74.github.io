/* skillExtractor — 자연어 경력 서술 → 역량 태그(결정론적 키워드 규칙)
   원격 AI 가 없을 때의 DEMO 분석기이며, 어떤 문장이 어떤 역량으로 이어졌는지(evidence)를 함께 돌려준다. */
import { SKILLS, QUAL_MAP } from '../../data/skills.js';

function snippet(text, idx, len) {
  const s = Math.max(0, idx - 10);
  const e = Math.min(text.length, idx + len + 12);
  return (s > 0 ? '…' : '') + text.slice(s, e).replace(/\s+/g, ' ') + (e < text.length ? '…' : '');
}

/** @returns {{id:string, hits:number, evidence:string[], from:'text'|'qual'}[]} */
export function extractSkills(text, qualIds = []) {
  const t = (text || '').toLowerCase();
  const found = new Map();
  for (const sk of SKILLS) {
    for (const kw of sk.kw) {
      const k = kw.toLowerCase();
      let idx = t.indexOf(k);
      let guard = 0;
      while (idx >= 0 && guard < 5) {
        const cur = found.get(sk.id) || { id: sk.id, hits: 0, evidence: [], from: 'text' };
        cur.hits += 1;
        if (cur.evidence.length < 2) cur.evidence.push(snippet(text, idx, k.length));
        found.set(sk.id, cur);
        idx = t.indexOf(k, idx + k.length);
        guard += 1;
      }
    }
  }
  for (const qid of qualIds) {
    const q = QUAL_MAP[qid];
    if (!q) continue;
    for (const sid of q.skills) {
      const cur = found.get(sid) || { id: sid, hits: 0, evidence: [], from: 'qual' };
      cur.hits += 2;
      cur.evidence.push(`선택한 자격: ${q.label}`);
      found.set(sid, cur);
    }
  }
  // '법' 한 글자 키워드는 오탐이 많아 다른 근거가 없으면 제외
  if (found.has('law') && found.get('law').hits < 2 && !/제도|규정|지침|조례|법령/.test(t)) found.delete('law');
  return [...found.values()].sort((a, b) => b.hits - a.hits || a.id.localeCompare(b.id)).slice(0, 12);
}
