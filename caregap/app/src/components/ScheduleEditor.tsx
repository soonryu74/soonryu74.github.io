import { useState } from 'react';
import { useStore } from '../state/store';
import { SERVICE_TYPES, serviceType } from '../engine/serviceTypes';
import { toMinutes, validateEntry } from '../engine/time';
import { DAYS, DAYS_LONG, type DayIndex, type ScheduleEntry, type ServiceTypeId } from '../types';

const TIMES = Array.from({ length: 49 }, (_, i) => `${String(Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`);

let seq = 0;
const newId = () => `e${Date.now().toString(36)}${(seq++).toString(36)}`;

export default function ScheduleEditor() {
  const { input, setInput } = useStore();
  const schedulable = SERVICE_TYPES.filter((t) => t.schedulable);
  const firstType = (input.servicesInUse.find((s) => serviceType(s).schedulable) ?? 'visit_care') as ServiceTypeId;

  const [days, setDays] = useState<Set<DayIndex>>(new Set());
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('12:00');
  const [type, setType] = useState<ServiceTypeId>(firstType);
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const add = () => {
    if (days.size === 0) return setMsg({ kind: 'err', text: '요일을 하나 이상 골라 주세요.' });
    const err = validateEntry({ start, end });
    if (err) return setMsg({ kind: 'err', text: err });
    const entries: ScheduleEntry[] = [...days].sort().map((d) => ({ id: newId(), day: d, start, end, type, note: note.trim() || undefined }));
    setInput((prev) => ({ ...prev, schedule: [...prev.schedule, ...entries] }));
    const overnight = toMinutes(end)! <= toMinutes(start)!;
    setMsg({
      kind: 'ok',
      text: `${[...days].sort().map((d) => DAYS[d]).join('·')} ${start}–${end} ${serviceType(type).short} 일정을 추가했습니다.${overnight ? ' (다음 날로 이어지는 일정)' : ''}`,
    });
    setDays(new Set());
    setNote('');
  };

  const remove = (id: string) => {
    const e = input.schedule.find((x) => x.id === id);
    setInput((prev) => ({ ...prev, schedule: prev.schedule.filter((x) => x.id !== id) }));
    if (e) setMsg({ kind: 'ok', text: `${DAYS[e.day]} ${e.start}–${e.end} ${serviceType(e.type).short} 일정을 삭제했습니다.` });
  };

  const missingTypes = input.servicesInUse.filter((s) => serviceType(s).schedulable && !input.schedule.some((e) => e.type === s));

  return (
    <div className="form-stack">
      <p className="lead-sm">
        요일과 시간을 정해 일정을 추가하세요. 같은 시간 일정은 여러 요일을 한 번에 고를 수 있어요.
        밤을 넘기는 일정(예: 22:00–07:00)도 입력할 수 있습니다.
      </p>

      <section className="card add-card" aria-labelledby="add-title">
        <h2 id="add-title" className="h3">일정 추가</h2>
        <fieldset className="field">
          <legend>요일</legend>
          <div className="day-pick">
            {DAYS.map((d, i) => {
              const on = days.has(i as DayIndex);
              return (
                <button
                  key={d} type="button" className={`day-chip ${on ? 'on' : ''}`} aria-pressed={on} aria-label={DAYS_LONG[i]}
                  onClick={() => {
                    const n = new Set(days);
                    if (on) n.delete(i as DayIndex); else n.add(i as DayIndex);
                    setDays(n);
                  }}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </fieldset>
        <div className="field-row">
          <div className="field">
            <label htmlFor="t-start">시작</label>
            <select id="t-start" value={start} onChange={(e) => setStart(e.target.value)}>
              {TIMES.slice(0, 48).map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="t-end">끝</label>
            <select id="t-end" value={end} onChange={(e) => setEnd(e.target.value)}>
              {TIMES.slice(1).map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div className="field">
          <label htmlFor="t-type">돌봄 종류</label>
          <select id="t-type" value={type} onChange={(e) => setType(e.target.value as ServiceTypeId)}>
            {schedulable.map((t) => <option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
          </select>
          {serviceType(type).note && <p className="field-help">{serviceType(type).note}</p>}
        </div>
        <div className="field">
          <label htmlFor="t-note">메모 <span className="opt">선택</span></label>
          <input id="t-note" type="text" maxLength={30} value={note} onChange={(e) => setNote(e.target.value)} placeholder="예: 딸 방문, 정기 진료 (이름은 적지 마세요)" />
        </div>
        <button type="button" className="btn btn-primary btn-block" onClick={add}>＋ 일정 추가</button>
        <div aria-live="polite">{msg && <p className={msg.kind === 'ok' ? 'ok-text' : 'error-text'}>{msg.text}</p>}</div>
      </section>

      {missingTypes.length > 0 && (
        <p className="hint">
          3단계에서 고른 서비스 중 아직 시간이 없는 것: <b>{missingTypes.map((t) => serviceType(t).short).join(', ')}</b>
        </p>
      )}

      <section aria-labelledby="list-title">
        <h2 id="list-title" className="h3">등록된 일정 <span className="count">{input.schedule.length}개</span></h2>
        {input.schedule.length === 0 ? (
          <p className="empty">아직 등록된 일정이 없습니다.</p>
        ) : (
          <ul className="entry-list">
            {[...input.schedule]
              .sort((a, b) => a.day - b.day || a.start.localeCompare(b.start))
              .map((e) => {
                const t = serviceType(e.type);
                return (
                  <li key={e.id} className={`entry entry-${e.type}`}>
                    <span className="entry-day">{DAYS[e.day]}</span>
                    <span className="entry-time">{e.start}–{e.end}{toMinutes(e.end)! <= toMinutes(e.start)! ? ' (+1일)' : ''}</span>
                    <span className="entry-type"><span aria-hidden="true">{t.icon}</span> {t.short}{e.note ? ` · ${e.note}` : ''}</span>
                    <button type="button" className="btn-icon" onClick={() => remove(e.id)} aria-label={`${DAYS_LONG[e.day]} ${e.start}부터 ${e.end}까지 ${t.short} 일정 삭제`}>
                      삭제
                    </button>
                  </li>
                );
              })}
          </ul>
        )}
      </section>
    </div>
  );
}
