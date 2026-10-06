/* 세션 상태 — 서버 저장 없음. 브라우저 sessionStorage 에만 둔다(탭을 닫으면 사라짐). */
const KEY = 'reon.session.v1';

export const EMPTY = () => ({
  input: { text: '', region: ['', ''], workType: 'any', hours: 'day', wage: 'any', quals: [], training: 'yes' },
  analysis: null,     // { mode, label, skills:[{id,hits,evidence,from}], error, analyzedAt }
  userSkills: null,   // 사용자가 확정한 역량 id 배열(수정·삭제·추가 반영)
  selectedJob: null,
  judge: false,
});

let cache = null;

export function getState() {
  if (cache) return cache;
  try {
    const raw = sessionStorage.getItem(KEY);
    cache = raw ? { ...EMPTY(), ...JSON.parse(raw) } : EMPTY();
  } catch {
    cache = EMPTY();
  }
  return cache;
}

export function setState(patch) {
  cache = { ...getState(), ...patch };
  try { sessionStorage.setItem(KEY, JSON.stringify(cache)); } catch { /* 저장 불가 환경에서도 동작 */ }
  return cache;
}

export function clearState() {
  cache = EMPTY();
  try { sessionStorage.removeItem(KEY); } catch { /* ignore */ }
  return cache;
}
