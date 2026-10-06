import { describe, expect, it } from 'vitest';
import demo from '../data/demoCases.json';
import { interpretLocal } from './nlp';
import { buildTags, prefillAnswers } from './facts';
import { recommend, SERVICES } from './recommend';
import { buildPlan } from './plan';
import { buildShareText, buildSmsText, buildSpeechText, SAFETY_NOTICE } from './share';
import { EMPTY_ANSWERS, type Answers } from '../types';

type Demo = (typeof demo)[number];

function run(d: Demo) {
  const interp = interpretLocal(d.text);
  const answers = d.answers as Answers;
  const tags = buildTags(answers, interp);
  const rec = recommend(answers, tags);
  const plan = buildPlan(rec);
  return { interp, tags, rec, plan };
}

describe('서비스 데이터(화이트리스트)', () => {
  it('필수 필드와 금지 표현', () => {
    for (const s of SERVICES) {
      expect(s.source_org, s.id).toBeTruthy();
      expect(s.verified_at, s.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(s.last_checked, s.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(s.eligibility_note, s.id).toBeTruthy();
      expect(s.conditions.requires_official_check).toBe(true);
      if (s.official_url) expect(s.official_url, s.id).toMatch(/^https:\/\//);
      expect(JSON.stringify(s)).not.toMatch(/받을 수 있습니다|받을 수 있어요/);
    }
  });
});

describe('데모 시나리오', () => {
  for (const d of demo) {
    it(`${d.id} ${d.title}: 자연어 해석`, () => {
      const interp = interpretLocal(d.text);
      for (const t of d.expected_tags) expect(interp.tags, `tag ${t}`).toContain(t);
      expect(interp.who).toBe(d.expected_who);
      expect(interp.ageBand).toBe(d.expected_ageBand);
      const pre = prefillAnswers(EMPTY_ANSWERS, interp);
      expect(pre.who).toBe(d.expected_who);
    });
    it(`${d.id} ${d.title}: 추천 상위 3개와 오늘 할 일`, () => {
      const { rec, plan } = run(d);
      expect(rec.primary.map((p) => p.service.id)).toEqual(d.expected_primary);
      const all = [...rec.primary, ...rec.secondary].map((p) => p.service.id);
      for (const id of d.expected_mentioned) expect(all, `mentioned ${id}`).toContain(id);
      expect(plan.length).toBeGreaterThanOrEqual(2);
      expect(plan.length).toBeLessThanOrEqual(3);
      const share = buildShareText(rec, plan);
      expect(share).toContain(SAFETY_NOTICE);
      expect(share).not.toMatch(/받을 수 있습니다/);
      expect(buildSmsText(rec, plan)).toContain('담당기관 확인 필요');
      expect(buildSpeechText(rec, plan)).toContain(SAFETY_NOTICE);
    });
  }
  it('A: 등급 없는 78세 → 장기요양 신청이 1순위, 등급 있으면 제외', () => {
    const d = demo[0];
    const { rec } = run(d);
    expect(rec.primary[0].service.id).toBe('ltc-recognition');
    const withGrade = recommend({ ...(d.answers as Answers), ltc: 'has_grade' }, buildTags({ ...(d.answers as Answers), ltc: 'has_grade' }, interpretLocal(d.text)));
    expect([...withGrade.primary, ...withGrade.secondary].map((p) => p.service.id)).not.toContain('ltc-recognition');
  });
  it('C: 소득 기준 서비스는 수급 여부를 모르면 "조건 확인"', () => {
    const { rec } = run(demo[2]);
    const ew = rec.primary.find((p) => p.service.id === 'emergency-welfare')!;
    expect(ew.status).toBe('needs_condition');
  });
  it('B: 장애 미등록이면 활동지원·주간활동이 빠진다', () => {
    const a = { ...(demo[1].answers as Answers), disability: 'none' as const };
    const rec = recommend(a, buildTags(a, interpretLocal(demo[1].text)));
    const ids = [...rec.primary, ...rec.secondary].map((p) => p.service.id);
    expect(ids).not.toContain('activity-support');
    expect(ids).not.toContain('day-activity');
  });
  it('빈 입력 → 서비스 추천 없음, 안내 서비스만', () => {
    const rec = recommend(EMPTY_ANSWERS, []);
    expect(rec.primary).toHaveLength(0);
    expect(rec.secondary.map((p) => p.service.id)).toEqual(['welfare-membership', 'gov24-benefit']);
  });
  it('긴급 신호(죽고 싶다) → emergency 플래그', () => {
    const interp = interpretLocal('혼자 사는데 요즘 죽고 싶어요');
    const a = { ...EMPTY_ANSWERS, who: 'self' as const };
    const rec = recommend(a, buildTags(a, interp));
    expect(rec.emergency).toBe(true);
  });
});
