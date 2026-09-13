// '언제 가면 덜 붐비나' — 데이터랩 시군구 방문자 요일 지수를 관광지에 맞춰 읽는다.
//
// 두 가지를 겹쳐야 답이 나온다.
//   1) 그 동네에 외국인이 요일마다 얼마나 오는가 (데이터랩)
//   2) 그 관광지가 그날 문을 여는가 (우리가 모은 휴관일)
// 종로구는 화요일이 가장 한산한데 경복궁은 화요일 휴관이다. 1번만 보면 헛걸음한다.
import type { Spot } from '../types'
import { RHYTHM_PERIOD, VISITOR_RHYTHM } from '../data/visitorRhythm'

// 데이터랩 배열은 월요일부터고, 자바스크립트 getDay()는 일요일부터다.
const toJsDay = (i: number) => (i + 1) % 7

const DAY_NAME = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DAY_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export type DayLoad = {
  jsDay: number       // 0=일 … 6=토
  short: string
  name: string
  index: number       // 100 = 그 시군구의 요일 평균
  closed: boolean
}

export type Rhythm = {
  gu: string          // 영어 표기
  guKo: string        // 한글 표기 — 기사에 인용하거나 원자료를 찾을 때 쓴다
  period: typeof RHYTHM_PERIOD
  days: DayLoad[]           // 월요일부터
  best: DayLoad             // 문 여는 날 중 가장 한산한 날
  busiest: DayLoad
  /** 더 한산하지만 휴관이라 못 가는 날. 없으면 undefined. */
  quieterButClosed?: DayLoad
}

export function rhythmFor(spot: Spot): Rhythm | null {
  const row = VISITOR_RHYTHM[spot.lDong?.signgu ?? '']
  if (!row) return null

  const closed = new Set(spot.closedDays ?? [])
  const days: DayLoad[] = row.idx.map((index, i) => {
    const jsDay = toJsDay(i)
    return { jsDay, short: DAY_SHORT[jsDay], name: DAY_NAME[jsDay], index, closed: closed.has(jsDay) }
  })

  const open = days.filter((d) => !d.closed)
  if (open.length === 0) return null

  const best = open.reduce((a, b) => (b.index < a.index ? b : a))
  const busiest = open.reduce((a, b) => (b.index > a.index ? b : a))
  const quieterButClosed = days
    .filter((d) => d.closed && d.index < best.index)
    .sort((a, b) => a.index - b.index)[0]

  return { gu: row.gu, guKo: row.ko, period: RHYTHM_PERIOD, days, best, busiest, quieterButClosed }
}

/** 100 기준 지수를 사람이 읽는 말로. 103 → '+3%', 87 → '−13%' */
export function vsAverage(index: number): string {
  const d = index - 100
  if (d === 0) return 'average'
  return `${d > 0 ? '+' : '−'}${Math.abs(d)}%`
}

/** '20260518' → 'May 2026' */
export function prettyMonth(ymd: string): string {
  const d = new Date(`${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6)}T00:00:00Z`)
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })
}
