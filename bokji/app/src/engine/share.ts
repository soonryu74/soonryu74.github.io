import type { ActionItem, Recommendation } from '../types';
import { STATUS_LABEL } from '../types';

export const SAFETY_NOTICE = '이 서비스는 복지급여 수급자격을 최종 판정하지 않습니다. 실제 대상 여부와 신청 결과는 담당기관의 확인이 필요합니다.';

/** 가족·보호자에게 보내는 긴 글(카카오톡용). 이름·나이·지역 등 개인정보는 넣지 않는다. */
export function buildShareText(rec: Recommendation, plan: ActionItem[]): string {
  const lines: string[] = ['[모두의 복지 AI — 먼저 확인할 지원]', ''];
  rec.primary.forEach((p, i) => {
    const s = p.service;
    lines.push(`${i + 1}. ${s.name} (${STATUS_LABEL[p.status]})`);
    lines.push(`   - ${s.one_line}`);
    lines.push(`   - 신청: ${s.apply.channel[0]}${s.apply.phone ? ` · ☎ ${s.apply.phone}` : ''}`);
    if (s.official_url) lines.push(`   - 공식: ${s.official_url}`);
  });
  if (plan.length) {
    lines.push('', '[오늘 할 일]');
    for (const a of plan) lines.push(`${a.n}. ${a.title}`);
  }
  if (rec.secondary.length) {
    lines.push('', '[추가로 확인]');
    lines.push(rec.secondary.slice(0, 4).map((x) => x.service.name_easy).join(', '));
  }
  lines.push('', '급할 때: 119(응급) · 129(복지상담, 긴급 24시간) · 109(마음건강)');
  lines.push('', `※ ${SAFETY_NOTICE}`);
  return lines.join('\n');
}

/** 문자(SMS)용 짧은 요약 */
export function buildSmsText(rec: Recommendation, plan: ActionItem[]): string {
  const names = rec.primary.map((p, i) => `${i + 1}) ${p.service.name_easy}`).join(' ');
  const first = plan[0];
  const call = first?.phone ? ` 먼저 ${first.phone_label ?? ''} ${first.phone} 전화.` : '';
  return `[복지 확인] ${names}.${call} 최종 대상 여부는 담당기관 확인 필요. 복지상담 129`;
}

/** 읽어주기용 문장 */
export function buildSpeechText(rec: Recommendation, plan: ActionItem[]): string {
  const parts: string[] = [];
  if (rec.emergency) parts.push('급한 상황이면 먼저 119 또는 129에 전화하세요.');
  parts.push(`먼저 확인할 지원은 ${rec.primary.length}가지입니다.`);
  rec.primary.forEach((p, i) => {
    parts.push(`${i + 1}번, ${p.service.name_easy}. ${p.service.one_line} ${STATUS_LABEL[p.status]}.`);
  });
  if (plan.length) {
    parts.push('오늘 할 일입니다.');
    for (const a of plan) parts.push(`${a.n}번, ${a.title}.`);
  }
  parts.push(SAFETY_NOTICE);
  return parts.join(' ');
}
