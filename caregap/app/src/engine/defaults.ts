import type { CareInput, ConcernId } from '../types';

export const CONCERNS: { id: ConcernId; label: string }[] = [
  { id: 'mobility', label: '이동이 어렵다' },
  { id: 'recentFall', label: '최근 넘어진 적이 있다' },
  { id: 'forgetsMeds', label: '약 복용을 자주 잊는다' },
  { id: 'skipsMeals', label: '식사를 거르는 경우가 있다' },
  { id: 'memory', label: '기억력이 걱정된다' },
  { id: 'frequentHospital', label: '병원 방문이 잦다' },
  { id: 'nightAlone', label: '밤에 혼자 있는 것이 걱정된다' },
  { id: 'emergency', label: '응급상황이 걱정된다' },
  { id: 'isolation', label: '외로움/사회적 고립이 걱정된다' },
];

export function emptyConcerns(): Record<ConcernId, boolean> {
  return Object.fromEntries(CONCERNS.map((c) => [c.id, false])) as Record<ConcernId, boolean>;
}

export function emptyInput(): CareInput {
  return {
    profile: { age: null, sex: 'unspecified', sido: '', sigungu: '', livesAlone: null, ltcGrade: 'unknown' },
    concerns: emptyConcerns(),
    servicesInUse: [],
    schedule: [],
  };
}

/**
 * 대표 시나리오(예시로 체험하기). 가상의 사례이며 실제 인물이 아닙니다.
 * 82세 여성 · 혼자 사심 · 장기요양 3등급 · 최근 낙상 · 복약을 가끔 잊음
 * (고혈압·당뇨는 질병 정보를 받지 않는 원칙에 따라 '병원 방문이 잦다'로만 반영)
 * 방문요양 월·수·금 09–12 / 화요일 오전 병원 / 딸(서울 근무) 일요일 방문
 */
export function demoInput(): CareInput {
  const concerns = emptyConcerns();
  concerns.recentFall = true;
  concerns.forgetsMeds = true;
  concerns.frequentHospital = true;
  concerns.nightAlone = true;
  return {
    profile: { age: 82, sex: 'female', sido: '경기도', sigungu: '수원시 장안구', livesAlone: true, ltcGrade: '3' },
    concerns,
    servicesInUse: ['visit_care', 'family'],
    schedule: [
      { id: 'demo-1', day: 0, start: '09:00', end: '12:00', type: 'visit_care' },
      { id: 'demo-2', day: 2, start: '09:00', end: '12:00', type: 'visit_care' },
      { id: 'demo-3', day: 4, start: '09:00', end: '12:00', type: 'visit_care' },
      { id: 'demo-4', day: 1, start: '10:00', end: '12:00', type: 'hospital_visit', note: '정기 진료' },
      { id: 'demo-5', day: 6, start: '11:00', end: '17:00', type: 'family', note: '딸 방문' },
    ],
  };
}
