/* AI 어댑터 — 원격 AI(선택) ↔ 브라우저 내 규칙 분석기(DEMO)
   AI_ENDPOINT 가 설정된 경우에만 POST { text, quals } 를 보낸다. 키는 서버에 둔다.
   기대 응답: { skills: [{ id: 'counsel', evidence: '…' }, …] }  (id 는 data/skills.js 의 역량 id)
   실패하면 규칙 분석기로 되돌아가고, 결과에 mode 를 반드시 적는다. */
import { extractSkills } from '../engine/skillExtractor.js';
import { SKILL_MAP } from '../../data/skills.js';

const cfg = () => (window.REON_CONFIG || {});

export function remoteAiAvailable() {
  return Boolean(cfg().AI_ENDPOINT);
}

export async function analyzeText(text, quals) {
  if (remoteAiAvailable()) {
    try {
      const res = await fetch(cfg().AI_ENDPOINT, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, quals }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const skills = (data.skills || [])
        .filter((s) => SKILL_MAP[s.id])
        .map((s) => ({ id: s.id, hits: 1, evidence: [s.evidence || 'AI 응답'], from: 'ai' }));
      if (!skills.length) throw new Error('AI 응답에 유효한 역량이 없음');
      return { mode: 'ai', label: 'AI 분석(원격)', skills, error: null };
    } catch (e) {
      return { mode: 'demo', label: 'DEMO 분석(규칙 기반)', skills: extractSkills(text, quals), error: `AI 연결 실패로 규칙 분석기를 사용했습니다 (${String(e.message || e)})` };
    }
  }
  return { mode: 'demo', label: 'DEMO 분석(규칙 기반)', skills: extractSkills(text, quals), error: null };
}
