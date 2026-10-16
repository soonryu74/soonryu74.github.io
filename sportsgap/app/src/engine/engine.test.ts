import { describe, expect, it } from 'vitest';
import { gradeOf, scoreRegions, avgDensity, neededToAverage } from './score';
import { matchFacilities, parseNeeds } from './match';
import type { Facility, RegionStat } from '../types';

const f = (id: string, region: string, o: Partial<Facility> = {}): Facility => ({
  id, name: id, region, type: '체육관', lat: 37.5, lng: 127, indoor: true, barrierFree: false, senior: false, disabledProg: false, ...o,
});
const regions: RegionStat[] = [
  { name: 'A시', pop: 100000, age65: 9000, disabled: 1000 },
  { name: 'B군', pop: 100000, age65: 9000, disabled: 1000 },
];

describe('접근성 지수', () => {
  it('공급이 같으면 둘 다 100(경기도 평균)', () => {
    const s = scoreRegions(regions, [f('1', 'A시'), f('2', 'B군')]);
    expect(s.map((x) => x.index)).toEqual([100, 100]);
  });
  it('시설이 적은 시군이 1위(가장 부족)', () => {
    const s = scoreRegions(regions, [f('1', 'A시'), f('2', 'A시'), f('3', 'A시'), f('4', 'B군')]);
    const b = s.find((x) => x.name === 'B군')!;
    expect(b.rank).toBe(1);
    expect(b.index).toBe(50);
    expect(b.grade.label).toBe('매우 부족');
  });
  it('시뮬레이션은 기준(평균)을 바꾸지 않는다', () => {
    const fs = [f('1', 'A시'), f('2', 'B군')];
    const s = scoreRegions(regions, fs, { 'B군': 1 });
    expect(s.find((x) => x.name === 'A시')!.index).toBe(100);
    expect(s.find((x) => x.name === 'B군')!.index).toBe(300);
  });
  it('평균까지 필요한 시설 수', () => {
    const fs = [f('1', 'A시', { barrierFree: true, senior: true, disabledProg: true }), f('2', 'A시', { barrierFree: true, senior: true, disabledProg: true })];
    const s = scoreRegions(regions, fs);
    expect(neededToAverage(s.find((x) => x.name === 'B군')!, avgDensity(regions, fs))).toBe(1);
  });
  it('등급 경계', () => {
    expect(gradeOf(59).level).toBe(1);
    expect(gradeOf(100).level).toBe(3);
    expect(gradeOf(150).level).toBe(5);
  });
});

describe('말로 찾기', () => {
  it('상황 문장에서 조건을 뽑는다', () => {
    const { needs, understood } = parseNeeds('80세 엄마가 휠체어를 쓰시고 무릎이 안 좋아요. 비 와도 갈 수 있는 곳');
    expect(needs.wheelchair && needs.senior && needs.indoor).toBe(true);
    expect(needs.types).toContain('수영장');
    expect(understood).toContain('무장애 시설');
  });
  it('조건을 갖춘 시설이 먼저 나온다', () => {
    const m = matchFacilities([f('x', 'A시'), f('y', 'A시', { barrierFree: true })], { wheelchair: true, senior: false, disabled: false, indoor: false, types: [] });
    expect(m[0].f.id).toBe('y');
    expect(m[1].missing[0]).toMatch(/무장애/);
  });
});
