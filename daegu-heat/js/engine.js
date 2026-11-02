// 폭염·미세먼지 건강 비서 — 규칙 엔진. 판정은 여기서만 하고 AI는 설명·요약만 맡는다.
// 입력: 환경 상태(특보 단계·미세먼지 등급·시간대) + 개인 조건(연령·질환·활동·거주 동) → 위험 단계 + 근거 + 행동 카드
export const HEAT = { none: '특보 없음', advisory: '폭염주의보', warning: '폭염경보', severe: '폭염중대경보' };
export const NIGHT = { none: '-', advisory: '열대야주의보' };
export const DUST = { good: '좋음', moderate: '보통', bad: '나쁨', verybad: '매우나쁨' };
export const COND = {
  heart: '심뇌혈관질환(고혈압·심장병·뇌졸중)', diabetes: '당뇨', kidney: '신장질환', resp: '호흡기질환(천식·COPD)', psych: '정신질환·치매',
  pregnant: '임신 중', infant: '영유아(0~4세) 돌봄', alone: '혼자 지냄(독거)', nocool: '집에 에어컨 없음', meds: '이뇨제·혈압약 복용',
};
export const ACT = { outdoor_work: '실외 작업(건설·농사·배달 등)', outdoor_exercise: '실외 운동·산책', commute: '도보·대중교통 이동', indoor: '주로 실내' };
export const emptyProfile = () => ({ age: null, sgg: '', dong: '', cond: [], act: 'indoor', hours: 'day' });

const HEAT_SCORE = { none: 0, advisory: 2, warning: 3, severe: 4 };
const DUST_SCORE = { good: 0, moderate: 0, bad: 2, verybad: 3 };

// 개인 취약 점수와 근거. 각 항목의 근거는 질병관리청 온열질환 감시(대구 2011~2025) 집계와 폭염 건강보호 지침의 일반 원칙.
export function vulnerability(p) {
  const items = [];
  if (p.age != null && p.age >= 75) items.push({ pts: 3, why: '75세 이상 (대구 온열질환 2011~2025 누적의 36%가 65세 이상)' });
  else if (p.age != null && p.age >= 65) items.push({ pts: 2, why: '65세 이상' });
  if (p.act === 'outdoor_work') items.push({ pts: 3, why: '실외 작업 (대구 2025년 온열질환 140건 중 실외 작업장 57건, 41%)' });
  if (p.act === 'outdoor_exercise') items.push({ pts: 2, why: '실외 운동·산책 (운동장·공원 11건, 길가 18건)' });
  if (p.act === 'commute') items.push({ pts: 1, why: '도보·대중교통 이동 (길가 발생 18건)' });
  for (const c of p.cond) {
    if (['heart', 'diabetes', 'kidney', 'psych', 'meds'].includes(c)) items.push({ pts: 2, why: `${COND[c]}: 체온 조절·탈수 위험 ↑` });
    if (c === 'resp') items.push({ pts: 2, why: '호흡기질환: 오존·미세먼지에 특히 취약' });
    if (c === 'pregnant' || c === 'infant') items.push({ pts: 2, why: COND[c] });
    if (c === 'alone') items.push({ pts: 2, why: '혼자 지냄: 이상 징후를 알아챌 사람이 없음' });
    if (c === 'nocool') items.push({ pts: 2, why: '냉방기 없음: 실내 온열질환 위험' });
  }
  return { score: items.reduce((s, i) => s + i.pts, 0), items };
}

// 환경 점수
export function exposure(env) {
  const items = [];
  const h = HEAT_SCORE[env.heat] || 0; if (h) items.push({ pts: h, why: `${HEAT[env.heat]} 발효 (${env.feels ? '체감온도 ' + env.feels + '℃' : '기상청 특보'})` });
  if (env.night === 'advisory') items.push({ pts: 1, why: '열대야주의보: 밤에도 회복이 안 됨' });
  const d = DUST_SCORE[env.dust] || 0; if (d) items.push({ pts: d, why: `미세먼지(PM2.5) ${DUST[env.dust]} (${env.pm25 ?? '-'}㎍/㎥)` });
  if (env.ozone === 'bad') items.push({ pts: 1, why: '오존 나쁨' });
  if (env.hours === 'peak') items.push({ pts: 1, why: '낮 12~17시 (대구 온열질환 발생이 가장 많은 시간대)' });
  return { score: items.reduce((s, i) => s + i.pts, 0), items };
}

// 최종 단계: 환경 × 개인. 특보가 없으면 '관심' 이하로 제한한다(특보 없이 위험을 과장하지 않음).
export function judge(env, p) {
  const ex = exposure(env), vu = vulnerability(p);
  const total = ex.score * (1 + vu.score / 6);
  let tier = 'calm';
  if (ex.score > 0) tier = total >= 9 ? 'danger' : total >= 5 ? 'warn' : 'watch';
  if (env.heat === 'severe' && vu.score >= 2) tier = 'danger';
  return { tier, total: Math.round(total * 10) / 10, exposure: ex, vulnerability: vu };
}
export const TIER = { calm: ['평온', '특보 없음. 평소처럼 지내되 물을 자주 드세요.'], watch: ['관심', '무리한 실외 활동은 피하고 물을 자주 마시세요.'], warn: ['주의', '낮 12~17시 실외 활동을 줄이고 시원한 곳으로 이동하세요.'], danger: ['위험', '지금 실외 활동을 멈추고 가까운 쉼터나 실내로 가세요. 어지럼·구토 시 119.'] };

// 행동 카드: 조건별 맞춤 문장 (규칙 기반, 쉬운말)
export function actions(env, p, r) {
  const a = [];
  if (r.tier === 'danger' || r.tier === 'warn') {
    if (p.act === 'outdoor_work') a.push('작업은 가장 더운 12~17시를 피하고, 1시간마다 그늘에서 10~15분 쉬세요. 산업안전보건법상 폭염 시 휴식·물·그늘 제공은 사업주 의무입니다.');
    if (p.act === 'outdoor_exercise') a.push('오늘 운동은 새벽이나 해 진 뒤로 미루세요.');
    if (p.cond.includes('alone')) a.push('가족이나 이웃에게 하루 한 번 전화를 부탁하세요. "알림 미리보기"의 안부 확인 알림을 켜면 보호자에게 자동으로 전화 요청이 갑니다.');
    if (p.cond.includes('nocool')) a.push('가장 가까운 무더위쉼터(경로당·주민센터·은행)로 가세요. 지금 열려 있는 가장 가까운 곳을 거리순으로 보여 드립니다(쉼터 API 연결 후).');
    if (p.cond.includes('heart') || p.cond.includes('meds')) a.push('혈압약·이뇨제를 드시는 분은 땀을 많이 흘리면 어지러울 수 있습니다. 물을 조금씩 자주 드시고 갑자기 일어나지 마세요.');
    if (p.cond.includes('diabetes')) a.push('더위에 혈당이 흔들릴 수 있습니다. 평소보다 자주 확인하고 당이 든 음료 대신 물을 드세요.');
  }
  if (env.dust === 'bad' || env.dust === 'verybad') {
    a.push('미세먼지가 나쁩니다. 밖에서는 KF80 이상 마스크, 실내는 창문을 닫고 공기청정기를 켜세요.');
    if (p.cond.includes('resp')) a.push('호흡기질환이 있으면 오늘 실외 활동을 피하고, 숨이 차면 바로 병원에 가세요.');
  }
  if (env.night === 'advisory') a.push('밤에도 더우니 잠들기 전 미지근한 물로 샤워하고, 선풍기는 벽을 향하게 두세요.');
  if (r.tier === 'calm') a.push('오늘은 특보가 없습니다. 하루 물 1.5L, 외출 시 모자나 양산 정도면 충분합니다.');
  a.push('탄소를 줄이는 피서: 집 에어컨 대신 가까운 쉼터·도서관을 쓰면 전기 사용이 분산됩니다. 냉방 26℃, 선풍기 함께.');
  return a;
}
