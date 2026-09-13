// 요일별 붐빔 막대 — 데이터랩 외국인 방문자 지수. 휴관일은 회색 ✕ 로 죽여 둔다.
import type { Spot } from '../types'
import { prettyMonth, rhythmFor, vsAverage } from '../lib/rhythm'

export default function QuietDay({ spot }: { spot: Spot }) {
  const r = rhythmFor(spot)
  if (!r) return null

  // 막대 높이는 지수 자체가 아니라 '가장 한산한 날 대비'로 그린다.
  // 지수는 84~114처럼 좁은 구간이라 그대로 그리면 차이가 안 보인다.
  const lo = Math.min(...r.days.map((d) => d.index))
  const hi = Math.max(...r.days.map((d) => d.index))
  const height = (i: number) => 14 + (hi === lo ? 0 : ((i - lo) / (hi - lo)) * 40)

  return (
    <div className="card">
      <div className="label" style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.4px' }}>
        Quietest day to visit
      </div>

      <div className="quiet-head">
        <strong>{r.best.name}</strong>
        <span className="quiet-delta">{vsAverage(r.best.index)} foreign visitors</span>
      </div>

      <div className="quiet-bars">
        {r.days.map((d) => (
          <div
            key={d.jsDay}
            className={'qd' + (d.closed ? ' closed' : d.jsDay === r.best.jsDay ? ' best' : '')}
            title={d.closed ? `${d.name} · closed` : `${d.name} · ${vsAverage(d.index)}`}
          >
            <div className="bar" style={{ height: d.closed ? 6 : height(d.index) }} />
            <div className="dow">{d.closed ? '✕' : d.short}</div>
          </div>
        ))}
      </div>

      {r.quieterButClosed && (
        <div className="quiet-warn">
          {r.quieterButClosed.name} is quieter still — but {spot.name} is closed that day.
        </div>
      )}

      <div className="source-note">
        Korea Tourism Data Lab · foreign visitors to {r.gu}, {r.period.weeks} weeks to {prettyMonth(r.period.to)}.
        District-wide figures, so treat this as a tendency rather than a headcount.
      </div>
    </div>
  )
}
