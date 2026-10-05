import type { ConcernId } from '../types';

/**
 * 자연어 → 걱정 항목 '후보' 추출 (브라우저 안에서 동작하는 키워드 규칙).
 * 결과는 바로 적용하지 않고 사용자가 확인한 뒤에만 반영한다.
 * 부정 표현("안 넘어지셨", "넘어진 적은 없")이 가까이 있으면 후보에서 뺀다.
 */
const PATTERNS: Record<ConcernId, RegExp[]> = {
  recentFall: [/넘어지/, /넘어졌/, /넘어진/, /낙상/, /미끄러/, /자빠/],
  nightAlone: [/밤에?\s*혼자/, /밤(에|엔|에는)?.{0,12}혼자/, /야간/, /새벽에?\s*혼자/, /밤.{0,8}걱정/],
  forgetsMeds: [/약.{0,10}(잊|깜빡|까먹|빼먹|안\s*드|거르)/, /복약/],
  skipsMeals: [/(식사|밥|끼니).{0,10}(거르|안\s*드|못\s*드|건너|굶)/, /굶으/],
  memory: [/기억/, /깜빡깜빡/, /건망/, /치매/, /자꾸\s*잊/, /같은\s*말/],
  mobility: [/거동/, /걷기\s*(힘들|어렵)/, /잘\s*못\s*걸/, /다리가\s*(불편|약)/, /이동이?\s*(힘들|어렵)/, /휠체어/, /보행/],
  frequentHospital: [/병원.{0,8}(자주|잦|많이)/, /(자주|잦).{0,6}병원/, /진료.{0,6}(자주|잦)/, /통원/],
  emergency: [/응급/, /쓰러지/, /쓰러질/, /119/, /갑자기.{0,8}(아프|위급)/],
  isolation: [/외로/, /외롭/, /고립/, /말벗/, /우울/, /만날\s*사람/, /혼자\s*(지내|계시)/],
};

export interface Extraction {
  id: ConcernId;
  evidence: string;
}

export function extractConcerns(text: string): Extraction[] {
  const out: Extraction[] = [];
  const sentences = text.split(/[.!?。\n]|(?<=요)\s|(?<=다)\s/).map((s) => s.trim()).filter(Boolean);
  for (const [id, pats] of Object.entries(PATTERNS) as [ConcernId, RegExp[]][]) {
    for (const s of sentences) {
      const m = pats.map((p) => p.exec(s)).find(Boolean);
      if (!m) continue;
      const after = s.slice(m.index + m[0].length, m.index + m[0].length + 10);
      // "넘어진 적은 없어요", "넘어지지 않으셨어요" 처럼 바로 뒤에 부정이 오면 제외
      if (/^.{0,4}(적|일)\s*(은|이|도)?\s*(없|않)/.test(after) || /^.{0,3}지\s*(않|도\s*않)/.test(after)) continue;
      out.push({ id, evidence: s });
      break;
    }
  }
  return out;
}
