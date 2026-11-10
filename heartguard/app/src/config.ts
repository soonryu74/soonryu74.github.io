// 판정 임계값은 전부 여기 한 곳에 둔다. 실기기 실측 결과에 따라 고친다.
export type DropMode = 'log' | 'alert' | 'off';

export interface Thresholds {
  /** 정상 범위(분당 심박) */
  normalMin: number;
  normalMax: number;
  /** 이 값 미만이 lowHoldMs 동안 이어지면 의심 */
  lowBpm: number;
  lowHoldMs: number;
  /** 의심 판정에 필요한 최소 연속 유효 수신 횟수 */
  lowMinSamples: number;
  /** dropWindowMs 안의 최고값 대비 이 비율 이하로 떨어지면 급락 */
  dropRatio: number;
  dropWindowMs: number;
  /** 급락 뒤 회복 없이 이 시간이 지나면 급락 확정 */
  dropHoldMs: number;
  /** 급락 규칙 동작: 기록만 / 경보까지 / 끔 */
  dropMode: DropMode;
  /** 이 시간 동안 수신이 없으면 연결 끊김 */
  silenceMs: number;
  /** 본인 확인 시간 */
  checkMs: number;
  /** 해제 뒤 같은 사유로 다시 의심에 들어가지 않는 시간 */
  cooldownMs: number;
  /** SOS 길게 누름 시간 */
  sosHoldMs: number;
}

export const DEFAULT_THRESHOLDS: Thresholds = {
  normalMin: 40,
  normalMax: 180,
  lowBpm: 30,
  lowHoldMs: 10_000,
  lowMinSamples: 3,
  dropRatio: 0.5,
  dropWindowMs: 15_000,
  dropHoldMs: 5_000,
  dropMode: 'log',
  silenceMs: 10_000,
  checkMs: 30_000,
  cooldownMs: 120_000,
  sosHoldMs: 3_000,
};

export const DISCLAIMER =
  '이 앱은 의료기기가 아니며 응급 상황을 놓칠 수 있습니다. 심장질환 관리 용도로 쓰지 마세요.';
