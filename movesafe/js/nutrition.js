/* MoveSafe AI — 스포츠 영양·수분·보충제·도핑 주의 (순수 함수)
 *
 * 근거(요약; 화면과 about 에 동일 표기):
 *  - 탄수화물·단백질·수분 범위: Thomas DT, Erdman KA, Burke LM. Position of the Academy of Nutrition and Dietetics,
 *    Dietitians of Canada, and the American College of Sports Medicine: Nutrition and Athletic Performance. J Acad Nutr Diet 2016.
 *  - 단백질 1회량·분배: 같은 문헌 및 Morton 2018 메타분석(총 1.6 g/kg/일 이상 추가 이득 제한적)
 *  - 수분: ACSM Exercise and Fluid Replacement 2007 (운동 4시간 전 5~7 mL/kg, 손실 체중 1 kg당 1.25~1.5 L)
 *  - 보충제 용량: AIS Sports Supplement Framework(A군) · IOC consensus statement on dietary supplements 2018 (Maughan et al., BJSM)
 *  - 도핑: WADA 2026 금지목록 분류 — 최종 확인은 반드시 KADA 금지약물 검색(https://www.kada-ad.or.kr)
 * 이 계산은 일반적 범위이며 개인 처방이 아니다. 질환·임신·청소년·체중 감량 중이면 전문가 상담.
 */

export const ACTIVITY = {
  light: { label: '가벼운 활동(저강도·기술 위주, 주 3회 이하)', carb: [3, 5] },
  moderate: { label: '보통(하루 약 1시간 운동)', carb: [5, 7] },
  high: { label: '높음(하루 1~3시간 중~고강도, 지구력 프로그램)', carb: [6, 10] },
  veryhigh: { label: '매우 높음(하루 4~5시간 이상, 극한 지구력)', carb: [8, 12] },
};

export const GOALS = {
  maintain: { label: '유지·수행 향상', protein: [1.2, 2.0] },
  gain: { label: '근육 증가', protein: [1.6, 2.2] },
  lose: { label: '체중 감량(근육 유지)', protein: [1.6, 2.4] },
};

export function dailyTargets({ weightKg, activity = 'moderate', goal = 'maintain', age = 30 } = {}) {
  const w = Number(weightKg);
  if (!(w > 20 && w < 250)) return { ok: false, error: '체중은 20~250 kg 사이로 입력' };
  const a = ACTIVITY[activity] || ACTIVITY.moderate;
  const g = GOALS[goal] || GOALS.maintain;
  let protein = [...g.protein];
  const notes = [];
  if (age >= 65) { protein[0] = Math.max(protein[0], 1.2); notes.push('65세 이상은 근감소 예방을 위해 최소 1.0~1.2 g/kg 권고(ESPEN/PROT-AGE), 운동 시 더 높게'); }
  if (age < 18) notes.push('청소년은 성장 요구량이 있어 성인 범위를 그대로 적용하지 말고 전문가와 상담');
  const perMeal = [Math.round(w * 0.3), Math.round(w * 0.4)];
  return {
    ok: true,
    weightKg: w,
    carb: { perKg: a.carb, g: [Math.round(w * a.carb[0]), Math.round(w * a.carb[1])] },
    protein: { perKg: protein, g: [Math.round(w * protein[0]), Math.round(w * protein[1])], perMeal, meals: '3~4시간 간격으로 하루 4회 전후, 운동 후 2시간 내 1회 포함' },
    fluid: {
      preMl: [Math.round(w * 5), Math.round(w * 7)], preNote: '운동 4시간 전까지 천천히',
      duringMlPerH: [400, 800], duringNote: '땀 양·더위·강도에 따라 조절. 1시간 넘으면 탄수화물 30~60 g/h, 2.5시간 넘으면 최대 90 g/h',
      postPerKgLostL: [1.25, 1.5], postNote: '운동 전후 체중 차 1 kg당. 나트륨 포함 음료·음식과 함께',
    },
    timing: {
      pre: `운동 1~4시간 전 탄수화물 ${Math.round(w * 1)}~${Math.round(w * 4)} g (1~4 g/kg), 지방·섬유질은 적게`,
      post: `운동 후 8시간 내 다시 훈련하면 4시간 동안 매시간 탄수화물 ${Math.round(w * 1.0)}~${Math.round(w * 1.2)} g (1.0~1.2 g/kg/h)`,
    },
    notes,
  };
}

/** 땀 손실률: 운동 전후 체중, 마신 양, 시간 */
export function sweatRate({ preKg, postKg, fluidMl = 0, durationMin } = {}) {
  const pre = Number(preKg), post = Number(postKg), d = Number(durationMin);
  if (!(pre > 0 && post > 0 && d > 0)) return { ok: false, error: '운동 전후 체중과 시간을 입력' };
  const lossKg = pre - post + fluidMl / 1000;
  const ratePerH = lossKg / (d / 60);
  const pctLoss = ((pre - post) / pre) * 100;
  const out = { ok: true, lossKg: +lossKg.toFixed(2), ratePerH: +ratePerH.toFixed(2), pctLoss: +pctLoss.toFixed(1), replaceL: [+((pre - post) * 1.25).toFixed(2), +((pre - post) * 1.5).toFixed(2)], warn: [] };
  if (pctLoss >= 2) out.warn.push('체중 2% 이상 감소: 지구력·인지 수행 저하와 관련. 다음 훈련 전 충분히 보충');
  if (pctLoss < 0) out.warn.push('체중이 늘었다면 과다 섭취(저나트륨혈증 위험). 갈증에 맞춰 조절');
  return out;
}

/** 체중 기반 보충제 용량(연구·지침 범위). 사용 판단은 개인 상황·검사·전문가 상담 후 */
export function supplementDoses(weightKg) {
  const w = Number(weightKg);
  if (!(w > 20)) return null;
  return {
    caffeine: { label: '카페인', range: `${Math.round(w * 3)}~${Math.round(w * 6)} mg`, when: '운동 60분 전', note: '3~6 mg/kg. 9 mg/kg 이상은 부작용↑, 이득 없음. 커피 1잔 ≈ 80~100 mg. 모니터링 물질(금지 아님)' },
    creatine: { label: '크레아틴 모노하이드레이트', range: '3~5 g/일', when: '매일(시간 무관)', note: '로딩은 20 g/일 5~7일 선택. 체중 1~2 kg 증가(수분) 가능' },
    betaAlanine: { label: '베타알라닌', range: '3.2~6.4 g/일(0.8~1.6 g씩 분할)', when: '매일 4주 이상', note: '저림(감각이상) 흔함. 0.5~10분 고강도 종목' },
    nitrate: { label: '질산염(비트 주스)', range: '6~8 mmol (≈ 농축 비트 주스 70 mL×2 또는 500 mL)', when: '운동 2~3시간 전', note: '구강세정제는 효과를 없앰. 고도 훈련자는 효과 작음' },
    bicarbonate: { label: '중탄산나트륨', range: `${(w * 0.2).toFixed(0)}~${(w * 0.3).toFixed(0)} g`, when: '운동 60~180분 전, 물·탄수화물과 함께', note: '0.2~0.3 g/kg. 위장 장애 흔함 → 훈련에서 먼저 테스트. 1~7분 고강도 종목' },
  };
}

/** 복용 중인 약·보충제 성분 텍스트에서 도핑 주의 성분 찾기 */
export function dopingWatch(text, list) {
  let t = String(text || '').toLowerCase().replace(/\s+/g, '');
  if (!t) return [];
  const hits = [];
  // 긴 키워드부터 찾고 찾은 부분은 지워, '슈도에페드린'이 '에페드린'으로 중복 매칭되지 않게 한다
  const items = [...list].sort((a, b) => Math.max(...b.keywords.map((k) => k.length)) - Math.max(...a.keywords.map((k) => k.length)));
  for (const item of items) {
    const kws = [...item.keywords].sort((a, b) => b.length - a.length);
    const kw = kws.find((k) => t.includes(k.toLowerCase().replace(/\s+/g, '')));
    if (kw) { hits.push({ ...item, matched: kw }); t = t.split(kw.toLowerCase().replace(/\s+/g, '')).join(' '); }
  }
  const order = { prohibited_always: 0, prohibited_in_competition: 1, particular_sports: 2, monitored: 3, allowed: 4 };
  return hits.sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9));
}

export const STATUS_LABEL = {
  prohibited_always: '상시 금지',
  prohibited_in_competition: '경기기간 중 금지',
  particular_sports: '특정 종목 금지',
  monitored: '모니터링(금지 아님)',
  allowed: '허용',
};
