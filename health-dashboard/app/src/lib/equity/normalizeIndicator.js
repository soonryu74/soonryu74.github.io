/* 지표 방향성 정규화 — 데이터와 분리된 순수 함수(다른 나라 자료에도 그대로 쓸 수 있게).
   direction: "lower_is_better"(낮을수록 좋음) · "higher_is_better"(높을수록 좋음) · "context"(방향 없음, 우선순위 계산 제외) */
export const DIRECTION = { LOWER: "lower_is_better", HIGHER: "higher_is_better", CONTEXT: "context" };

/** 기존 메타데이터 bad(true/false/null) → direction 문자열 */
export function directionOf(bad) {
  return bad === true ? DIRECTION.LOWER : bad === false ? DIRECTION.HIGHER : DIRECTION.CONTEXT;
}

export const isDirectional = (direction) => direction === DIRECTION.LOWER || direction === DIRECTION.HIGHER;

/** 불리 방향 부호: 값이 커지는 것이 나쁘면 +1, 좋으면 −1, 방향 없음 0 */
export function unfavorableSign(direction) {
  return direction === DIRECTION.LOWER ? 1 : direction === DIRECTION.HIGHER ? -1 : 0;
}

/** 차이(값 − 기준)를 「불리한 쪽이 +」가 되도록 바꾼다. 결측은 null 그대로 */
export function toUnfavorable(delta, direction) {
  if (delta == null || !Number.isFinite(delta)) return null;
  const s = unfavorableSign(direction);
  return s === 0 ? null : s * delta;
}

/** a가 b보다 양호한가 */
export function isBetter(a, b, direction) {
  return direction === DIRECTION.LOWER ? a < b : direction === DIRECTION.HIGHER ? a > b : false;
}

export const DIRECTION_LABEL = { lower_is_better: "낮을수록 좋음", higher_is_better: "높을수록 좋음", context: "방향 없음(맥락 지표)" };
