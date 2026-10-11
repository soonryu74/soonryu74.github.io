import type { ConcernId } from '../types';
import { extractConcerns, type Extraction } from '../engine/nlp';

/**
 * 자연어 구조화 어댑터.
 * - 기본: 브라우저 안 키워드 규칙(외부 전송 없음)
 * - 선택: VITE_AI_ENDPOINT 가 설정된 경우에만 그 서버로 문장을 보냄(키는 서버에 둠)
 * 어떤 경우든 결과는 '후보'이며 사용자 확인 후에만 적용한다.
 */
export interface AiResult {
  engine: 'local-keywords' | 'remote-ai';
  items: Extraction[];
  error?: string;
}

const ENDPOINT = (import.meta.env.VITE_AI_ENDPOINT as string | undefined) || '';

export function remoteAiAvailable(): boolean {
  return ENDPOINT.length > 0;
}

export async function structureText(text: string, useRemote: boolean): Promise<AiResult> {
  if (useRemote && ENDPOINT) {
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { concerns?: Partial<Record<ConcernId, boolean>> };
      const items = Object.entries(data.concerns ?? {})
        .filter(([, v]) => v === true)
        .map(([id]) => ({ id: id as ConcernId, evidence: 'AI 엔드포인트 응답' }));
      return { engine: 'remote-ai', items };
    } catch (e) {
      return { engine: 'local-keywords', items: extractConcerns(text), error: `AI 연결 실패로 키워드 규칙을 사용했습니다 (${String(e)})` };
    }
  }
  return { engine: 'local-keywords', items: extractConcerns(text) };
}
