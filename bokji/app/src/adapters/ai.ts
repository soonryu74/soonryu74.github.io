import type { Interpretation } from '../types';
import { isTag } from '../types';
import { interpretLocal } from '../engine/nlp';

/**
 * 자연어 상황 해석 어댑터.
 * - 기본: 브라우저 안 키워드 규칙(외부 전송 없음, 결정적).
 * - 선택: VITE_AI_ENDPOINT 가 있으면 그 서버(프록시)로 문장을 보낸다. API 키는 프론트에 두지 않는다.
 * - 어떤 엔진이든 결과 태그는 화이트리스트(Tag)만 남기고, 알 수 없는 값은 버린다(허위 서비스·태그 생성 방지).
 * - 원격 실패 시 자동으로 로컬 규칙으로 돌아간다(deterministic fallback).
 */
const ENDPOINT = (import.meta.env.VITE_AI_ENDPOINT as string | undefined) || '';

export function remoteAiAvailable(): boolean {
  return ENDPOINT.length > 0;
}

export async function interpretSituation(text: string): Promise<Interpretation> {
  const local = interpretLocal(text);
  if (!ENDPOINT) return local;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { tags?: unknown; who?: unknown; ageBand?: unknown };
    const tags = Array.isArray(data.tags) ? data.tags.filter(isTag) : [];
    const merged = [...new Set([...tags, ...local.tags])];
    const who = data.who === 'self' || data.who === 'family' ? data.who : local.who;
    const bands = ['under60', '60_64', '65_74', '75_84', '85plus'];
    const ageBand = typeof data.ageBand === 'string' && bands.includes(data.ageBand) ? (data.ageBand as Interpretation['ageBand']) : local.ageBand;
    return { tags: merged, who, ageBand, evidence: local.evidence, engine: 'remote-ai' };
  } catch (e) {
    return { ...local, error: `AI 연결에 실패해 브라우저 안 규칙으로 해석했습니다 (${String(e)})` };
  }
}
