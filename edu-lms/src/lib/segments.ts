import type { Segment } from '../types'

// 시청 구간을 다루는 순수 함수. 출석 규칙은 docs/edu-lms-spec.md 의 "출석을 어떻게 세는가"를 따른다.
// - 건너뛴 구간은 넣지 않는다 (재생 중 실제로 지나간 구간만 add 된다)
// - 배속은 허용하되 구간은 영상 시간 기준이다

/** 겹치거나 맞닿은 구간을 합쳐 정렬한다 */
export function merge(segs: Segment[]): Segment[] {
  const sorted = [...segs].filter(([a, b]) => b > a).sort((x, y) => x[0] - y[0])
  const out: Segment[] = []
  for (const [a, b] of sorted) {
    const last = out[out.length - 1]
    if (last && a <= last[1] + 1) last[1] = Math.max(last[1], b)
    else out.push([a, b])
  }
  return out
}

/** 구간 하나를 더한 뒤 합친다 */
export function add(segs: Segment[], from: number, to: number): Segment[] {
  if (to - from < 1) return segs
  return merge([...segs, [Math.floor(from), Math.ceil(to)]])
}

/** 구간 합계(초) */
export function total(segs: Segment[]): number {
  return segs.reduce((s, [a, b]) => s + (b - a), 0)
}

/** 시청 비율 0~1 */
export function coverage(segs: Segment[], durationSec: number): number {
  if (durationSec <= 0) return 0
  return Math.min(1, total(segs) / durationSec)
}
