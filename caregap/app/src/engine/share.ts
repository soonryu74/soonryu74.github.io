import { DAYS } from '../types';
import type { CareInput, EvaluationResult } from '../types';
import { serviceType } from './serviceTypes';

export interface ShareOptions {
  includeAgeBand: boolean;
  includeRegion: boolean;
}

export interface ShareCard {
  title: string;
  meta: string[];
  days: { day: string; items: string[] }[];
  checks: string[];
  tasks: string[];
  footer: string;
}

/** 공유 카드 내용. 이름·생년월일 등은 애초에 입력받지 않으며, 연령대·지역도 기본 제외. 메모(자유 입력)는 넣지 않는다. */
export function buildShareCard(input: CareInput, result: EvaluationResult, opt: ShareOptions): ShareCard {
  const meta: string[] = [];
  if (opt.includeAgeBand && input.profile.age) meta.push(`${Math.floor(input.profile.age / 10) * 10}대`);
  if (opt.includeRegion && input.profile.sigungu) meta.push(input.profile.sigungu);
  if (input.profile.livesAlone) meta.push('혼자 사심');

  const days = DAYS.map((d, i) => ({
    day: d,
    items: input.schedule
      .filter((e) => e.day === i)
      .sort((a, b) => a.start.localeCompare(b.start))
      .map((e) => `${e.start.replace(':00', '')}–${e.end.replace(':00', '')} ${serviceType(e.type).short}`),
  }));
  const always = input.servicesInUse.filter((s) => serviceType(s).continuous).map((s) => serviceType(s).short);
  if (always.length) meta.push(`상시: ${always.join(', ')}`);

  return {
    title: '이번 주 돌봄계획',
    meta,
    days,
    tasks: input.familyTasks.map((t) => (t.who ? `${t.text} — ${t.who}` : t.text)),
    checks: result.domains.filter((d) => d.status === 'needs_confirmation').map((d) => d.domain.label),
    footer: 'CareGap AI · 입력 기준 참고자료(진단 아님)',
  };
}

export function shareText(card: ShareCard): string {
  const lines = [`[${card.title}]`];
  if (card.meta.length) lines.push(card.meta.join(' · '));
  lines.push('');
  for (const d of card.days) lines.push(`${d.day}  ${d.items.length ? d.items.join(', ') : '등록된 돌봄 없음'}`);
  lines.push('');
  lines.push(card.checks.length ? `확인 필요: ${card.checks.join(', ')}` : '확인 필요 영역: 없음(현재 입력 기준)');
  if (card.tasks.length) {
    lines.push('');
    lines.push('가족 할 일:');
    for (const t of card.tasks) lines.push(`- ${t}`);
  }
  lines.push('');
  lines.push(`— ${card.footer}`);
  return lines.join('\n');
}
