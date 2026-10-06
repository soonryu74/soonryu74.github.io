import type { ActionItem, Recommendation, Scored } from '../types';

/**
 * '오늘 할 일 1·2·3'. 같은 전화번호로 묶어 전화 횟수를 줄이고, 급한 것부터 둔다.
 * 3개를 넘지 않는다(한 화면 한 행동).
 */
export function buildPlan(rec: Recommendation): ActionItem[] {
  const items: ActionItem[] = [];
  const groups = new Map<string, Scored[]>();
  const order: string[] = [];
  for (const s of rec.primary) {
    const key = s.service.apply.phone ?? `__${s.service.id}`;
    if (!groups.has(key)) { groups.set(key, []); order.push(key); }
    groups.get(key)!.push(s);
  }
  // 긴급이면 129 그룹을 맨 앞으로
  if (rec.emergency && order.includes('129')) {
    order.splice(order.indexOf('129'), 1);
    order.unshift('129');
  }
  for (const key of order) {
    const g = groups.get(key)!;
    const first = g[0].service;
    const names = g.map((x) => x.service.name_easy).join(', ');
    const phone = first.apply.phone;
    const label = first.apply.phone_label;
    const channel = first.apply.channel[0];
    const title = phone
      ? `${label ?? channel} ${phone}에 전화해 ${names} 상담하기`
      : `${channel}에 연락해 ${names} 상담하기`;
    const detail = g.map((x) => x.service.what_to_say).filter(Boolean).join(' / ') || `${names}에 대해 상담을 요청하세요.`;
    const prepare = [...new Set(g.flatMap((x) => x.service.documents))].slice(0, 5);
    items.push({
      n: items.length + 1,
      title,
      detail: `이렇게 말해 보세요: ${detail}`,
      phone,
      phone_label: label,
      prepare,
      serviceIds: g.map((x) => x.service.id),
      url: first.official_url,
    });
    if (items.length === 3) break;
  }
  if (items.length < 3) {
    const wm = rec.secondary.find((x) => x.service.id === 'welfare-membership');
    if (wm && !items.some((i) => i.serviceIds.includes('welfare-membership'))) {
      items.push({
        n: items.length + 1,
        title: '복지로에서 복지멤버십(맞춤형급여안내) 가입 여부 확인하기',
        detail: '이미 가입돼 있으면 안내 문자가 오는지 확인하고, 아니면 가족이 함께 가입을 도와주세요. 행정복지센터 방문 때 같이 신청해도 됩니다.',
        phone: null,
        phone_label: null,
        prepare: ['본인 인증 수단(휴대폰) 또는 방문 시 신분증'],
        serviceIds: ['welfare-membership'],
        url: wm.service.official_url,
      });
    }
  }
  return items.map((it, i) => ({ ...it, n: i + 1 }));
}
