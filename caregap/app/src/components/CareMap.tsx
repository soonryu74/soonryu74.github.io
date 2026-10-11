import { useMemo } from 'react';
import { serviceType } from '../engine/serviceTypes';
import { dayTimeline, fmtMinutes, MIN_PER_DAY, toSegments, type Segment } from '../engine/time';
import { DAYS, DAYS_LONG, type DayIndex, type ScheduleEntry } from '../types';

const TICKS = [0, 3, 6, 9, 12, 15, 18, 21, 24];
const pct = (m: number) => `${(m / MIN_PER_DAY) * 100}%`;

function lanes(segs: Segment[]): { seg: Segment; lane: number }[] {
  const ends: number[] = [];
  return segs.map((seg) => {
    let lane = ends.findIndex((e) => e <= seg.start);
    if (lane === -1) lane = ends.length;
    ends[lane] = seg.end;
    return { seg, lane };
  });
}

const segLabel = (s: Segment) => `${serviceType(s.entry.type).short}${s.entry.note ? ` · ${s.entry.note}` : ''}`;
const segTime = (s: Segment) => `${fmtMinutes(s.start)}–${fmtMinutes(s.end)}`;

/**
 * 7일 × 24시간 Care Map.
 * 넓은 화면: 요일별 가로 타임라인 / 좁은 화면(≤720px): 요일 카드(시간 순 목록)
 * 상태를 색만으로 구분하지 않도록 모든 구간에 글자·무늬를 함께 쓴다.
 */
export default function CareMap({ schedule, livesAlone }: { schedule: ScheduleEntry[]; livesAlone: boolean }) {
  const segs = useMemo(() => toSegments(schedule), [schedule]);
  const days = [0, 1, 2, 3, 4, 5, 6] as DayIndex[];
  // 일정이 없는 시간이 곧 위험하다는 뜻은 아니므로 중립적으로 표기
  const emptyLabel = livesAlone ? '등록된 일정 없음 (혼자 계신 시간)' : '등록된 일정 없음';

  return (
    <div className="caremap" data-testid="caremap">
      {/* 넓은 화면: 가로 타임라인 */}
      <div className="cm-grid" data-testid="caremap-grid" aria-hidden="false">
        <div className="cm-axis" aria-hidden="true">
          <span className="cm-axis-day" />
          <div className="cm-axis-track">
            {TICKS.map((h) => (
              <span key={h} className="cm-tick" style={{ left: pct(h * 60) }}>{String(h).padStart(2, '0')}</span>
            ))}
          </div>
        </div>
        <ul className="cm-rows">
          {days.map((d) => {
            const daySegs = segs.filter((s) => s.day === d);
            const laid = lanes(daySegs);
            const laneCount = Math.max(1, ...laid.map((l) => l.lane + 1));
            const summary = daySegs.length
              ? daySegs.map((s) => `${segTime(s)} ${segLabel(s)}`).join(', ')
              : '등록된 일정 없음';
            return (
              <li key={d} className="cm-row" aria-label={`${DAYS_LONG[d]}: ${summary}`} data-day={d}>
                <span className="cm-day" aria-hidden="true">{DAYS[d]}</span>
                <div className="cm-track" style={{ height: `${laneCount * 46 + 10}px` }} aria-hidden="true">
                  <span className="cm-night" style={{ left: 0, width: pct(9 * 60) }} />
                  <span className="cm-night" style={{ left: pct(18 * 60), width: pct(6 * 60) }} />
                  {TICKS.slice(1, -1).map((h) => <span key={h} className="cm-gridline" style={{ left: pct(h * 60) }} />)}
                  {laid.map(({ seg, lane }) => {
                    const t = serviceType(seg.entry.type);
                    return (
                      <span
                        key={`${seg.entry.id}-${seg.continued}`}
                        className={`cm-bar svc-${seg.entry.type} ${t.presence ? '' : 'no-presence'} ${seg.end - seg.start < 150 ? 'narrow' : ''}`}
                        style={{ left: pct(seg.start), width: pct(seg.end - seg.start), top: `${5 + lane * 46}px` }}
                        title={`${segTime(seg)} ${segLabel(seg)}`}
                        data-testid="cm-bar"
                        data-type={seg.entry.type}
                        data-start={fmtMinutes(seg.start)}
                        data-end={fmtMinutes(seg.end)}
                      >
                        <span className="cm-bar-icon">{t.icon}</span>
                        <span className="cm-bar-text">
                          <b>{t.short}</b>
                          <small>{segTime(seg)}</small>
                        </span>
                      </span>
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ul>
        <div className="cm-legend" aria-hidden="true">
          <span><i className="lg lg-presence" /> 사람이 함께하는 일정</span>
          <span><i className="lg lg-nopresence" /> 일정은 있으나 곁에 있는 시간은 아님(진료·배달·복약확인)</span>
          <span><i className="lg lg-empty" /> {emptyLabel}</span>
          <span><i className="lg lg-night" /> 저녁·야간(18–09시)</span>
        </div>
      </div>

      {/* 좁은 화면: 요일 카드 */}
      <ol className="cm-cards" data-testid="caremap-cards">
        {days.map((d) => {
          const blocks = dayTimeline(segs, d);
          const presenceMin = blocks.reduce((a, b) => a + (b.segments.some((s) => serviceType(s.entry.type).presence) ? b.end - b.start : 0), 0);
          return (
            <li key={d} className="cm-card" data-day={d}>
              <div className="cm-card-head">
                <h3>{DAYS_LONG[d]}</h3>
                <span className="cm-card-sum">사람이 함께 {Math.round((presenceMin / 60) * 10) / 10}시간</span>
              </div>
              <ul className="cm-blocks">
                {blocks.map((b) => {
                  const empty = b.segments.length === 0;
                  const presence = b.segments.some((s) => serviceType(s.entry.type).presence);
                  return (
                    <li key={b.start} className={`cm-block ${empty ? 'is-empty' : presence ? 'is-presence' : 'is-nopresence'}`}>
                      <span className="cm-block-time">{fmtMinutes(b.start)}–{fmtMinutes(b.end)}</span>
                      <span className="cm-block-what">
                        {empty
                          ? emptyLabel
                          : b.segments.map((s) => (
                              <span key={s.entry.id} className={`cm-pill svc-${s.entry.type}`}>
                                <span aria-hidden="true">{serviceType(s.entry.type).icon}</span> {segLabel(s)}
                              </span>
                            ))}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
