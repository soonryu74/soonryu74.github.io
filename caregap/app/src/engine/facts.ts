import rules from '../data/care_gap_rules.json';
import { DAYS, type CareInput, type CareFunction, type Facts, type ServiceTypeId } from '../types';
import { serviceType, SERVICE_TYPES } from './serviceTypes';
import { coverage, fmtMinutes, MIN_PER_DAY, overlapMinutes, toMinutes, toSegments, uncoveredInWindow, type Segment } from './time';

const W = rules.windows;
const NIGHT = [toMinutes(W.night.start)!, toMinutes(W.night.end)!] as const;
const DAY = [toMinutes(W.day.start)!, toMinutes(W.day.end)!] as const;

const hours = (min: number) => Math.round((min / 60) * 10) / 10;
const hasFn = (s: Segment, fn: CareFunction) => serviceType(s.entry.type).functions.includes(fn);
const isPresence = (s: Segment) => serviceType(s.entry.type).presence;

function joinDays(days: number[]): string {
  return days.length ? days.map((d) => DAYS[d]).join('·') : '없음';
}

/**
 * 사용자 입력 → 규칙이 읽는 사실(facts).
 * 모든 계산은 '등록된 일정'만 근거로 하며, 추정하지 않는다.
 */
export function computeFacts(input: CareInput): Facts {
  const { profile, concerns, servicesInUse, schedule } = input;
  const segs = toSegments(schedule);
  const facts: Facts = {};

  facts['profile.livesAlone'] = profile.livesAlone === true;
  facts['profile.hasLtcGrade'] = !['unknown', 'none'].includes(profile.ltcGrade);
  for (const [k, v] of Object.entries(concerns)) facts[`concern.${k}`] = !!v;

  // 서비스 이용 여부 = 3단계에서 선택했거나, 일정에 등록된 경우
  const scheduledTypes = new Set(schedule.map((e) => e.type));
  for (const t of SERVICE_TYPES) {
    facts[`service.${t.id}`] = servicesInUse.includes(t.id as ServiceTypeId) || scheduledTypes.has(t.id);
  }

  // 사람이 함께하는 시간
  const presence = coverage(segs, isPresence);
  const nightUncovered = uncoveredInWindow(presence, NIGHT[0], NIGHT[1]);
  const dayUncovered = uncoveredInWindow(presence, DAY[0], DAY[1]);
  const alone = profile.livesAlone === true;
  facts['time.nightUncoveredHours'] = hours(nightUncovered);
  facts['time.nightAloneHours'] = alone ? hours(nightUncovered) : 0;
  facts['time.dayAloneHours'] = alone ? hours(dayUncovered) : 0;

  const presenceMinByDay = presence.map((row) => row.reduce((a, b) => a + b, 0));
  const noVisitDays = presenceMinByDay.map((m, d) => (m === 0 ? d : -1)).filter((d) => d >= 0);
  facts['time.daysWithoutVisit'] = noVisitDays.length;
  facts['time.daysWithoutVisitList'] = joinDays(noVisitDays);
  facts['time.weeklyCareHours'] = hours(presenceMinByDay.reduce((a, b) => a + b, 0));

  // 가족
  const familyGrid = coverage(segs, (s) => s.entry.type === 'family');
  const otherGrid = coverage(segs, (s) => isPresence(s) && s.entry.type !== 'family');
  facts['time.familyHours'] = hours(familyGrid.reduce((a, row) => a + row.reduce((x, y) => x + y, 0), 0));
  let familyOnly = 0;
  for (let d = 0; d < 7; d++) {
    const fam = familyGrid[d].some((v) => v === 1);
    const oth = otherGrid[d].some((v) => v === 1);
    if (fam && !oth) familyOnly++;
  }
  facts['time.familyOnlyDays'] = familyOnly;

  // 식사: 끼니 시간대와 'meal' 기능 일정이 일정 시간 이상 겹치는지
  const mealSegs = segs.filter((s) => hasFn(s, 'meal'));
  const missing: string[] = [];
  let uncoveredSlots = 0;
  for (let d = 0; d < 7; d++) {
    for (const slot of W.meals) {
      const a = toMinutes(slot.start)!;
      const b = toMinutes(slot.end)!;
      const covered = mealSegs.some((s) => s.day === d && overlapMinutes(s.start, s.end, a, b) >= W.mealMinOverlapMinutes);
      if (!covered) {
        uncoveredSlots++;
        missing.push(`${DAYS[d]} ${slot.label}`);
      }
    }
  }
  facts['meal.uncoveredSlots'] = uncoveredSlots;
  facts['meal.uncoveredList'] = missing.join(', ') || '없음';

  // 복약: 복약 기능 일정이 있는 요일
  const medDays = [...new Set(segs.filter((s) => hasFn(s, 'meds')).map((s) => s.day))].sort();
  facts['med.coveredDays'] = medDays.length;
  facts['med.missingDaysList'] = joinDays([0, 1, 2, 3, 4, 5, 6].filter((d) => !medDays.includes(d as never)));

  // 병원: 진료 일정과 동행(hospital 기능) 일정이 겹치는지
  const visits = segs.filter((s) => s.entry.type === 'hospital_visit' && !s.continued);
  const escorts = segs.filter((s) => hasFn(s, 'hospital'));
  const unescorted = visits.filter(
    (v) => !escorts.some((e) => e.day === v.day && overlapMinutes(e.start, e.end, v.start, v.end) > 0),
  );
  facts['hospital.visitCount'] = visits.length;
  facts['hospital.unescortedVisits'] = unescorted.length;
  facts['hospital.unescortedList'] =
    unescorted.map((v) => `${DAYS[v.day]} ${fmtMinutes(v.start)}–${fmtMinutes(Math.min(v.end, MIN_PER_DAY))}`).join(', ') || '없음';

  facts['hygiene.supportDays'] = new Set(segs.filter((s) => hasFn(s, 'hygiene')).map((s) => s.day)).size;
  facts['cognition.sessions'] = schedule.filter((e) => serviceType(e.type).functions.includes('cognition')).length;
  facts['group.sessions'] = schedule.filter((e) => serviceType(e.type).functions.includes('group')).length;

  return facts;
}

/** 결과 카드의 '현재 관련 일정' — 영역과 관련된 등록 일정(및 상시 서비스)을 그대로 보여준다 */
export function relatedSchedule(input: CareInput, fns: string[]): string[] {
  const out = [...input.schedule]
    .sort((a, b) => a.day - b.day || a.start.localeCompare(b.start))
    .filter((e) => {
      const t = serviceType(e.type);
      return fns.some((f) => (f === 'presence' ? t.presence : f === 'family' ? e.type === 'family' : t.functions.includes(f as CareFunction)));
    })
    .map((e) => `${DAYS[e.day]} ${e.start}–${e.end} ${serviceType(e.type).short}`);
  for (const s of input.servicesInUse) {
    const t = serviceType(s);
    if (t.continuous && fns.some((f) => t.functions.includes(f as CareFunction))) out.push(`상시 · ${t.short}`);
  }
  return out;
}
