import type { Facility } from '../types';

export interface Needs {
  wheelchair: boolean;
  senior: boolean;
  disabled: boolean;
  indoor: boolean;
  types: string[];
}

export const EMPTY_NEEDS: Needs = { wheelchair: false, senior: false, disabled: false, indoor: false, types: [] };

/** 말로 적은 상황에서 조건을 뽑는다(규칙 기반 — 외부 AI 전송 없음). 무엇을 알아들었는지 화면에 그대로 보여 준다. */
const RULES: { re: RegExp; apply: (n: Needs) => void; label: string }[] = [
  { re: /휠체어|보행기|목발|거동/, apply: (n) => (n.wheelchair = true), label: '무장애 시설' },
  { re: /어르신|노인|시니어|할머니|할아버지|엄마|아빠|부모님|7\d세|8\d세|6[5-9]세/, apply: (n) => (n.senior = true), label: '어르신 친화 종목' },
  { re: /장애|발달|시각|청각|뇌병변/, apply: (n) => (n.disabled = true), label: '장애인 강좌' },
  { re: /실내|비|더위|추위|겨울|여름|미세먼지/, apply: (n) => (n.indoor = true), label: '실내' },
  { re: /수영|아쿠아|물/, apply: (n) => n.types.push('수영장'), label: '수영장' },
  { re: /무릎|관절|허리|재활/, apply: (n) => { n.types.push('수영장'); n.types.push('체육관'); }, label: '관절에 부담 적은 운동' },
  { re: /걷기|산책|걸으|달리기|트랙/, apply: (n) => n.types.push('육상경기장'), label: '육상 트랙' },
  { re: /파크골프/, apply: (n) => n.types.push('파크골프장'), label: '파크골프장' },
  { re: /게이트볼/, apply: (n) => n.types.push('게이트볼장'), label: '게이트볼장' },
];

export function parseNeeds(text: string): { needs: Needs; understood: string[] } {
  const needs: Needs = { ...EMPTY_NEEDS, types: [] };
  const understood: string[] = [];
  for (const r of RULES) if (r.re.test(text)) { r.apply(needs); understood.push(r.label); }
  needs.types = [...new Set(needs.types)];
  return { needs, understood: [...new Set(understood)] };
}

export interface Match { f: Facility; score: number; reasons: string[]; missing: string[]; km?: number }

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function matchFacilities(fs: Facility[], needs: Needs, here?: { lat: number; lng: number }): Match[] {
  const out = fs.map((f) => {
    const reasons: string[] = [], missing: string[] = [];
    let score = 0;
    const check = (want: boolean, has: boolean, label: string, w: number, miss: string) => {
      if (!want) return;
      if (has) { score += w; reasons.push(label); } else { score -= w; missing.push(miss); }
    };
    check(needs.wheelchair, f.barrierFree, '무장애 시설', 3, '무장애 정보 없음');
    // 어르신 친화 종목은 '있으면 좋은' 조건: 맞으면 가점만, 아니어도 감점하지 않는다
    if (needs.senior && f.senior) { score += 1; reasons.push('어르신 친화 종목'); }
    check(needs.disabled, f.disabledProg, '장애인 강좌', 2, '장애인 강좌 정보 없음');
    check(needs.indoor, f.indoor, '실내', 1, '실외 시설');
    if (needs.types.length) {
      if (needs.types.includes(f.type)) { score += 2; reasons.push(f.type); } else missing.push(`${needs.types.join('·')} 아님`);
    }
    const km = here ? haversineKm(here, f) : undefined;
    if (km !== undefined) score -= km / 5;
    return { f, score, reasons, missing, km };
  });
  // 점수가 같으면 어르신·장애인이 쓰기 쉬운 시설(장애인 체육시설 > 장애인 강좌 > 실내 > 어르신 친화)을 먼저
  const ease = (f: Facility) => (f.barrierFree ? 8 : 0) + (f.disabledProg ? 4 : 0) + (f.indoor ? 2 : 0) + (f.senior ? 1 : 0);
  return out.sort((a, b) => b.score - a.score || (a.km ?? 0) - (b.km ?? 0) || ease(b.f) - ease(a.f));
}
