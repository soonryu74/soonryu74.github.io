/* 작은 DOM 도우미 */
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const badge = (kind, text) => `<span class="badge badge-${kind}">${esc(text)}</span>`;
export const modeBadge = (mode) => (mode === 'ai' ? badge('ai', 'AI 분석(원격)') : badge('demo', 'DEMO 분석 · 규칙 기반'));
export const sourceBadge = (src) => (src.mode === 'live' ? badge('live', src.label) : badge('demo', 'DEMO · 실제 데이터 아님'));
export const dateAfter = (days) => { const d = new Date(); d.setDate(d.getDate() + days); return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`; };
export const LABELS = {
  workType: { any: '상관없음', full: '전일제', part: '시간제', contract: '계약직' },
  hours: { day: '주간', flex: '시간 조정 가능', any: '상관없음' },
  wage: { any: '상관없음', 'lt150': '월 150만 원 미만', '150-200': '월 150~200만 원', '200-250': '월 200~250만 원', '250+': '월 250만 원 이상' },
  training: { yes: '있음', maybe: '모르겠음', no: '없음' },
};
