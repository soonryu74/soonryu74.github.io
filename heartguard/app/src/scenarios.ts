// 모의 모드 시나리오. 경과 초(0,1,2…)를 넣으면 그 순간 워치가 보낼 값을 돌려준다.
// 판정·알림·기록은 실제 워치와 같은 길을 탄다. 가짜인 것은 "입력"뿐이다.
export type ScenarioId = 'normal' | 'low' | 'dropRecover' | 'disconnect' | 'unworn';

/** null = 그 초에는 아무것도 오지 않음(수신 끊김) */
export type MockSample = { bpm: number; contact: boolean | null } | null;

export interface Scenario {
  id: ScenarioId;
  label: string;
  expect: string;
  at: (sec: number) => MockSample;
}

// 매번 같은 결과가 나오는 작은 흔들림(-2~+2)
const wobble = (sec: number) => Math.round(Math.sin(sec * 1.7) * 2);
const ok = (bpm: number): MockSample => ({ bpm, contact: null });

export const SCENARIOS: Scenario[] = [
  {
    id: 'normal',
    label: '정상',
    expect: '심박 70 안팎이 계속 표시됩니다. 경보 없음.',
    at: (sec) => ok(72 + wobble(sec)),
  },
  {
    id: 'low',
    label: '급락 후 저심박 지속',
    expect: '약 20초 뒤 본인 확인 화면 → 30초 무응답이면 경보.',
    at: (sec) => {
      if (sec < 8) return ok(75 + wobble(sec));
      if (sec < 11) return ok([55, 38, 27][sec - 8]);
      return ok(24 + (sec % 2));
    },
  },
  {
    id: 'dropRecover',
    label: '급락 후 회복',
    expect: '급락이 기록에만 남고 경보는 울리지 않습니다.',
    at: (sec) => {
      if (sec < 8) return ok(80 + wobble(sec));
      if (sec < 18) return ok(36 + (sec % 2));
      return ok(74 + wobble(sec));
    },
  },
  {
    id: 'disconnect',
    label: '연결 끊김',
    expect: '10초 뒤 "연결 끊김" 표시, 30초에 다시 연결. 경보 없음.',
    at: (sec) => (sec >= 8 && sec < 30 ? null : ok(70 + wobble(sec))),
  },
  {
    id: 'unworn',
    label: '미착용',
    expect: '"워치를 차 주세요" 표시 후 정상 복귀. 경보 없음.',
    at: (sec) => (sec >= 8 && sec < 25 ? { bpm: 0, contact: null } : ok(68 + wobble(sec))),
  },
];

export const scenarioById = (id: ScenarioId): Scenario =>
  SCENARIOS.find((s) => s.id === id) ?? SCENARIOS[0];
