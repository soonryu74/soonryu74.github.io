import { describe, expect, it } from 'vitest';
import { evaluate } from './evaluate';
import { computeFacts } from './facts';
import { demoInput, emptyInput } from './defaults';
import { dayTimeline, toSegments } from './time';
import { extractConcerns } from './nlp';
import { buildShareCard, shareText } from './share';
import rules from '../data/care_gap_rules.json';
import type { CareInput } from '../types';

const status = (input: CareInput, domain: string) => evaluate(input).domains.find((d) => d.domain.id === domain)!;

function base(): CareInput {
  const i = emptyInput();
  i.profile = { ...i.profile, age: 80, sido: '서울특별시', sigungu: '종로구', livesAlone: true };
  return i;
}

describe('CASE 1 — 최근 낙상 + 야간 독거 → 야간 안전 확인 필요', () => {
  it('일정이 없으면 야간 혼자 계신 시간이 105시간이고 확인 필요', () => {
    const i = base();
    i.concerns.recentFall = true;
    const d = status(i, 'night');
    expect(d.status).toBe('needs_confirmation');
    expect(d.matches[0].ruleId).toBe('night.fall_alone');
    expect(d.reason).toContain('주 105시간');
    // 설명: 입력 → 규칙 → 결과의 근거 조건이 남아 있어야 한다
    const labels = d.matches[0].conditions.map((c) => `${c.label}=${c.actualText}`);
    expect(labels).toContain('최근 넘어진 적이 있다=예');
    expect(labels.some((l) => l.startsWith('저녁·야간(18:00–09:00) 혼자 계신 시간=주 105시간'))).toBe(true);
  });
  it('밤새 가족이 함께하면(18:00–09:00 매일) 야간 안전은 입력으로 확인됨', () => {
    const i = base();
    i.concerns.recentFall = true;
    i.schedule = [0, 1, 2, 3, 4, 5, 6].map((d) => ({ id: `n${d}`, day: d as never, start: '18:00', end: '09:00', type: 'family' as const }));
    expect(status(i, 'night').status).toBe('confirmed_by_input');
  });
  it('낙상만 있고 함께 사는 가족이 있으면 야간 혼자 시간은 0', () => {
    const i = base();
    i.profile.livesAlone = false;
    i.concerns.recentFall = true;
    expect(computeFacts(i)['time.nightAloneHours']).toBe(0);
    expect(status(i, 'night').status).not.toBe('needs_confirmation');
  });
});

describe('CASE 2 — 복약 잊음 + 복약관리 일정 없음 → 복약 확인 필요', () => {
  it('복약확인·방문간호 일정이 없으면 확인 필요', () => {
    const i = base();
    i.concerns.forgetsMeds = true;
    i.schedule = [{ id: 'a', day: 0, start: '09:00', end: '12:00', type: 'visit_care' }];
    const d = status(i, 'meds');
    expect(d.status).toBe('needs_confirmation');
    expect(d.reason).toContain('정기적인 복약 확인이 확인되지 않았습니다');
  });
  it('주 3일만 복약확인이 있으면 빠진 요일을 알려준다', () => {
    const i = base();
    i.concerns.forgetsMeds = true;
    i.schedule = [0, 2, 4].map((d) => ({ id: `m${d}`, day: d as never, start: '08:00', end: '08:30', type: 'med_check' as const }));
    const d = status(i, 'meds');
    expect(d.status).toBe('needs_confirmation');
    expect(d.reason).toContain('주 3일');
    expect(d.reason).toContain('화·목·토·일');
  });
  it('매일 복약확인이 있으면 입력으로 확인됨', () => {
    const i = base();
    i.concerns.forgetsMeds = true;
    i.schedule = [0, 1, 2, 3, 4, 5, 6].map((d) => ({ id: `m${d}`, day: d as never, start: '08:00', end: '08:30', type: 'med_check' as const }));
    expect(status(i, 'meds').status).toBe('confirmed_by_input');
  });
});

describe('CASE 3 — 식사 문제 없음 → 식사 공백을 임의로 만들지 않음', () => {
  it('식사 걱정을 입력하지 않으면 일정이 비어 있어도 공백 발견 안 됨', () => {
    const i = base();
    i.concerns.skipsMeals = false;
    i.schedule = [];
    const d = status(i, 'meal');
    expect(d.status).toBe('covered_or_no_gap_detected');
    expect(d.matches).toHaveLength(0);
  });
  it('아무 걱정도 입력하지 않고 일정도 없으면 확인 필요 0개(가족 부담 포함)', () => {
    const i = base();
    expect(evaluate(i).checkCount).toBe(0);
  });
  it('식사 걱정이 있으면 끼니 시간대 기준으로 계산', () => {
    const i = base();
    i.concerns.skipsMeals = true;
    i.schedule = [{ id: 'a', day: 0, start: '09:00', end: '12:00', type: 'visit_care' }];
    // 월 점심(11:30–13:30)과 30분 겹침 → 1끼 덮임
    expect(computeFacts(i)['meal.uncoveredSlots']).toBe(20);
    expect(status(i, 'meal').status).toBe('needs_confirmation');
  });
});

describe('CASE 4 — 방문요양 일정 → Care Map 구간에 정확히 표시', () => {
  it('월·수·금 09:00–12:00 방문요양이 해당 요일 구간으로 나온다', () => {
    const segs = toSegments(demoInput().schedule);
    const vc = segs.filter((s) => s.entry.type === 'visit_care');
    expect(vc.map((s) => [s.day, s.start, s.end])).toEqual([[0, 540, 720], [2, 540, 720], [4, 540, 720]]);
    const mon = dayTimeline(segs, 0);
    expect(mon.map((b) => [b.start, b.end, b.segments.length])).toEqual([[0, 540, 0], [540, 720, 1], [720, 1440, 0]]);
  });
  it('자정을 넘는 일정(22:00–07:00)은 다음 날로 나뉜다', () => {
    const segs = toSegments([{ id: 'x', day: 6, start: '22:00', end: '07:00', type: 'family' }]);
    expect(segs.map((s) => [s.day, s.start, s.end, s.continued])).toEqual([[0, 0, 420, true], [6, 1320, 1440, false]]);
  });
  it('잘못된 시간 일정은 무시된다', () => {
    expect(toSegments([{ id: 'x', day: 0, start: '10:00', end: '10:00', type: 'family' }])).toHaveLength(0);
  });
});

describe('대표 시나리오(82세 독거)', () => {
  it('야간 안전·낙상 안전·복약·병원 이동·응급대응이 확인 필요, 식사는 공백으로 만들지 않음', () => {
    const r = evaluate(demoInput());
    const checks = r.domains.filter((d) => d.status === 'needs_confirmation').map((d) => d.domain.id).sort();
    expect(checks).toEqual(['emergency', 'fall', 'hospital', 'meds', 'night'].sort());
    expect(r.domains.find((d) => d.domain.id === 'meal')!.status).toBe('covered_or_no_gap_detected');
    expect(r.facts['time.dayAloneHours']).toBe(48);
    expect(r.facts['hospital.unescortedList']).toBe('화 10:00–12:00');
  });
  it('병원 진료에 병원동행을 추가하면 병원 이동은 입력으로 확인됨', () => {
    const i = demoInput();
    i.schedule.push({ id: 'esc', day: 1, start: '09:30', end: '12:30', type: 'hospital_escort' });
    expect(status(i, 'hospital').status).toBe('confirmed_by_input');
  });
});

describe('규칙 파일 무결성', () => {
  it('모든 규칙이 정의된 사실과 영역만 참조한다', () => {
    const facts = computeFacts(demoInput());
    const domains = new Set(rules.domains.map((d) => d.id));
    const walk = (w: any): string[] => (w.fact ? [w.fact] : (w.all ?? w.any).flatMap(walk));
    for (const r of rules.rules) {
      expect(domains.has(r.domain)).toBe(true);
      for (const f of walk(r.when)) {
        expect(f in facts, f).toBe(true);
        expect(f in rules.facts, f).toBe(true);
      }
    }
    expect(rules.domains).toHaveLength(11);
  });
  it('결과 문구에 진단·위험 단정 표현이 없다', () => {
    const banned = [/고위험/, /위험군/, /진단합니다/, /예측합니다/, /판정합니다/, /처방합니다/, /추천합니다/, /위험 \d+개/];
    const texts = [...rules.rules.map((r) => r.reason), ...rules.domains.flatMap((d) => [d.description, d.noGapText, ...d.checkItems])];
    for (const t of texts) for (const b of banned) expect(b.test(t), t).toBe(false);
  });
});

describe('자연어 후보 추출(확인 전 미적용)', () => {
  it('예시 문장에서 낙상·야간 독거를 찾는다', () => {
    const ids = extractConcerns('엄마가 최근에 자꾸 넘어지고 밤에 혼자 계셔서 걱정돼요.').map((e) => e.id);
    expect(ids).toContain('recentFall');
    expect(ids).toContain('nightAlone');
  });
  it('부정 표현은 제외한다', () => {
    const ids = extractConcerns('넘어진 적은 없어요. 약은 잘 챙겨 드세요.').map((e) => e.id);
    expect(ids).not.toContain('recentFall');
  });
});

describe('가족 공유 카드', () => {
  it('기본값으로 연령·지역·메모를 넣지 않는다', () => {
    const i = demoInput();
    const card = buildShareCard(i, evaluate(i), { includeAgeBand: false, includeRegion: false });
    const t = shareText(card);
    expect(t).not.toContain('82');
    expect(t).not.toContain('80대');
    expect(t).not.toContain('수원');
    expect(t).not.toContain('딸 방문');
    expect(t).toContain('월  09–12 방문요양');
    expect(t).toContain('확인 필요: ');
  });
});

describe('MASTER SPEC 추가 요구', () => {
  it('모든 규칙에 ID·버전·조건·영역·상태·설명·서비스 범주·근거가 있고, 서비스 범주는 안내 목록에 존재', async () => {
    const catalog = (await import('../data/services_catalog.json')).default;
    const ids = new Set(catalog.services.map((s) => s.id));
    const seen = new Set<string>();
    for (const r of rules.rules as any[]) {
      expect(seen.has(r.id), r.id).toBe(false);
      seen.add(r.id);
      for (const k of ['id', 'version', 'when', 'domain', 'result', 'reason', 'serviceCategories', 'rationale']) expect(r[k], `${r.id}.${k}`).toBeTruthy();
      expect(['needs_confirmation', 'confirmed_by_input']).toContain(r.result);
      for (const c of r.serviceCategories) expect(ids.has(c), c).toBe(true);
    }
  });
  it('참고 정보(고혈압·당뇨 등)는 판단 결과를 바꾸지 않는다', () => {
    const a = demoInput();
    const b = demoInput();
    b.profile.contextNote = '';
    const sa = evaluate(a).domains.map((d) => [d.domain.id, d.status, d.reason]);
    const sb = evaluate(b).domains.map((d) => [d.domain.id, d.status, d.reason]);
    expect(sa).toEqual(sb);
  });
  it('공유 카드: 가족 할 일은 포함, 참고 정보는 제외', () => {
    const i = demoInput();
    i.familyTasks = [{ id: 't1', text: '응급안전안심서비스 문의', who: '딸' }];
    const t = shareText(buildShareCard(i, evaluate(i), { includeAgeBand: false, includeRegion: false }));
    expect(t).toContain('응급안전안심서비스 문의 — 딸');
    expect(t).not.toContain('고혈압');
    expect(t).not.toContain('당뇨');
  });
  it('데모 사례는 정적 값이 아니라 입력에서 계산된다(일정을 바꾸면 결과가 바뀜)', () => {
    const i = demoInput();
    expect(evaluate(i).domains.find((d) => d.domain.id === 'meds')!.status).toBe('needs_confirmation');
    i.schedule.push(...[0, 1, 2, 3, 4, 5, 6].map((d) => ({ id: `mc${d}`, day: d as never, start: '08:00', end: '08:30', type: 'med_check' as const })));
    expect(evaluate(i).domains.find((d) => d.domain.id === 'meds')!.status).toBe('confirmed_by_input');
  });
});
