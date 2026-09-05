/* 근거영양 — 추천 엔진 규칙
   입력: 프로필(나이·성별·상태·약물·생활·검사·목표) → 출력: 건강 수준(L1~L4) + 추천 목록
   각 추천은 연구 DB(studies.js) id를 cite로 연결. 진단·처방이 아닌 정보 제공. */
window.EBN_RULES = (function () {

  function level(p) {
    if (p.meds.anticoagulant || p.cond.kidney || p.cond.cancer_tx || p.smoker) return 'L4';
    if (p.cond.htn || p.cond.diabetes || p.cond.prediabetes || p.cond.dyslip || p.cond.osteo || p.cond.amd || p.cond.autoimmune) return 'L3';
    if (p.age >= 65 || p.pregnant || p.planning || p.lactating || p.vegan || p.lowSun || p.cond.gi || p.meds.metformin || p.meds.ppi || p.lab.vitd_low || p.lab.iron_low || p.lab.b12_low) return 'L2';
    return 'L1';
  }

  var LEVEL = {
    L1: { name: 'L1 건강', cls: 'green', desc: '진단 질환·결핍 위험 요인이 없습니다. 연구상 이 집단에서 영양제로 수명·질병을 줄인 근거는 거의 없습니다. 식사가 우선이고, 아래 항목만 선택적으로 고려하세요.' },
    L2: { name: 'L2 결핍 위험군', cls: 'blue', desc: '결핍이 생기기 쉬운 조건이 있습니다. 이 집단은 "결핍 교정" 목적의 보충에서 이득이 가장 분명합니다. 가능하면 혈액검사로 확인 후 시작하세요.' },
    L3: { name: 'L3 만성질환', cls: 'amber', desc: '진단된 질환이 있습니다. 질환별로 근거가 있는 성분과 없는 성분이 뚜렷이 갈립니다. 주치의와 상의 후 시작하세요.' },
    L4: { name: 'L4 주의·금기', cls: 'red', desc: '영양제가 해로울 수 있는 조건(약물 상호작용·흡연·신장질환·항암치료)이 있습니다. 아래 "피하세요" 항목을 먼저 확인하고, 모든 보충은 의사·약사 확인 후에만.' }
  };

  function recs(p) {
    var R = [];
    function add(o) { R.push(o); }

    /* ---------- 피하세요 (유해 근거) ---------- */
    if (p.smoker) add({ tier: 'avoid', ing: 'betacarotene', title: '베타카로틴 (고용량) — 흡연자·과거 흡연자',
      why: '흡연자에게 베타카로틴 20~30 mg은 폐암을 18~28%, 사망을 8~17% 늘렸습니다. 종합비타민·눈 영양제 성분표에서 베타카로틴 함량을 확인하세요.',
      dose: '보충제로 섭취하지 않기. 눈 영양제는 베타카로틴 없는 AREDS2형(루테인·지아잔틴)으로.', cite: ['atbc', 'caret', 'areds2'] });
    add({ tier: 'avoid', ing: 'vite', title: '비타민 E 400 IU 이상',
      why: '400 IU 이상은 사망률을 높이고(19개 RCT), 건강한 남성의 전립선암을 17% 늘렸습니다(SELECT). 예방 목적 고용량 비타민 E는 USPSTF가 "복용 반대(D)".',
      dose: '단독 고용량 제품 피하기. 종합비타민 속 소량(권장량 수준, 한국 성인 충분섭취량 12 mg α-TE)은 무방.', cite: ['select', 'miller-vite', 'cochrane-antioxidant', 'uspstf-2022'] });
    if (p.meds.anticoagulant) add({ tier: 'avoid', ing: 'vitk', title: '비타민 K · 고용량 오메가-3 · 비타민 E — 항응고제 복용 중',
      why: '와파린은 비타민 K와 직접 상호작용하고, 고용량 오메가-3·비타민 E는 출혈 위험을 더할 수 있습니다. 어떤 영양제든 시작·중단 전 처방의와 상의가 필수입니다.',
      dose: '의사 확인 없이 시작하지 않기. 비타민 K 함유 종합비타민·K2 제품 주의.', cite: ['reduce-it'] });
    if (p.cond.kidney) add({ tier: 'avoid', ing: 'multi', title: '칼슘·마그네슘·칼륨·비타민 D 고용량 — 신장질환',
      why: '신장 기능이 떨어지면 미네랄 배설이 안 돼 고칼슘혈증·고칼륨혈증·고마그네슘혈증 위험이 있습니다.',
      dose: '신장내과 지시에 따르기. 자가 보충 금지.', cite: ['whi-cad-2006'] });
    if (p.cond.cancer_tx) add({ tier: 'avoid', ing: 'antioxidant', title: '고용량 항산화제(비타민 C·E·베타카로틴·셀레늄) — 항암치료 중',
      why: '항암제·방사선 치료 효과를 방해할 가능성이 제기되어 있고, 항산화제가 생존을 늘린 근거는 없습니다.',
      dose: '종양내과 확인 후에만.', cite: ['cochrane-antioxidant'] });
    if (p.cond.adenoma) add({ tier: 'avoid', ing: 'folate', title: '고용량 엽산(1 mg 이상) — 대장 선종 병력',
      why: '선종 병력자에게 엽산 1 mg은 재발을 막지 못했고 진행성 병변이 늘어나는 신호가 있었습니다.',
      dose: '권장량(400 µg) 초과 엽산 피하기.', cite: ['cole-folate-2007'] });
    if ((p.cond.htn || p.cond.dyslip || p.cond.diabetes) && p.age >= 65) add({ tier: 'avoid', ing: 'omega3', title: '오메가-3 하루 1.5 g 이상 — 심혈관 고위험 + 고령',
      why: '고위험군에서 고용량 오메가-3는 심방세동을 43~69% 늘렸습니다(STRENGTH, 35개 RCT 메타분석). 저용량(≤1 g)은 이 위험이 확인되지 않았습니다.',
      dose: '보충 시 EPA+DHA 합계 1 g/일 이하. 처방용 고순도 EPA는 의사 판단.', cite: ['strength', 'omega3-af'] });

    /* ---------- 비타민 D ---------- */
    var dReason = [];
    if (p.lab.vitd_low) dReason.push('검사에서 결핍 확인');
    if (p.lowSun) dReason.push('햇빛 노출 부족(실내 근무)');
    if (p.age >= 75) dReason.push('75세 이상(2024 내분비학회 권고 대상)');
    if (p.pregnant || p.lactating) dReason.push('임신·수유');
    if (p.cond.prediabetes) dReason.push('당뇨병 전단계(진행 15% 감소, 3개 RCT 통합)');
    if (p.cond.osteo) dReason.push('골다공증(치료약과 병행 기본)');
    if (p.cond.autoimmune) dReason.push('자가면역질환(복용 중 22% 감소 신호)');
    if (dReason.length) add({ tier: p.lab.vitd_low || p.cond.prediabetes || p.age >= 75 ? 'rec' : 'cond', ing: 'vitd', title: '비타민 D3',
      why: '해당 조건: ' + dReason.join(', ') + '. 한국 성인 31~47%가 결핍(20 ng/mL 미만)이며 20~30대 실내 근무자가 가장 심합니다. 단, 결핍 없는 건강 성인에게는 암·심혈관·골절·우울 예방 효과가 없었습니다(VITAL 2.6만 명).',
      dose: '1,000~2,000 IU/일 (D3, 매일). 한국 상한섭취량 4,000 IU/일. 월 1회 몰아 먹기(볼루스)보다 매일 복용이 낫습니다. 목표 혈중 25(OH)D 20~30 ng/mL 이상.',
      cite: ['knhanes-vitd', 'vital-d', 'endo-2024', 'd2d-ipd-2023', 'vital-d-autoimmune', 'vitd-mortality-meta'] });
    else add({ tier: 'opt', ing: 'vitd', title: '비타민 D3',
      why: '결핍 위험 요인이 없어도 한국 성인 결핍률이 높습니다(2022년 31~47%). 건강한 사람에게 질병 예방 효과는 없지만, 저용량 매일 복용은 안전하고 저렴합니다. 확실히 하려면 건강검진 때 25(OH)D 검사(1~3만 원)를 추가하세요.',
      dose: '검사 없이 먹는다면 800~1,000 IU/일. 4,000 IU 초과 금지.', cite: ['knhanes-vitd', 'vital-d', 'vital-d-fracture', 'endo-2024'] });

    /* ---------- 엽산 ---------- */
    if (p.planning || p.pregnant) add({ tier: 'rec', ing: 'folate', title: '엽산 (임신 준비~임신 초기)',
      why: '임신 전후 엽산은 신경관 결손을 72% 예방했습니다(MRC RCT). 근거 등급 A. 임신 확인 후가 아니라 준비 단계부터 먹어야 효과가 있습니다.',
      dose: '400 µg/일 (임신 최소 1개월 전 ~ 임신 12주). 신경관 결손 임신력·당뇨·항경련제 복용 시 의사 판단으로 4 mg.', cite: ['mrc-folate-1991'] });

    /* ---------- B12 ---------- */
    var bReason = [];
    if (p.vegan) bReason.push('채식(동물성 식품 미섭취)');
    if (p.meds.metformin) bReason.push('메트포르민 복용(흡수 저하)');
    if (p.meds.ppi) bReason.push('위산억제제 장기 복용');
    if (p.cond.gi) bReason.push('위 절제·위축성 위염 등 위장질환');
    if (p.age >= 65) bReason.push('65세 이상(위산 감소로 흡수율 저하)');
    if (p.lab.b12_low) bReason.push('검사에서 B12 저하 확인');
    if (bReason.length) add({ tier: p.lab.b12_low || p.vegan ? 'rec' : 'cond', ing: 'b12', title: '비타민 B12',
      why: '해당 조건: ' + bReason.join(', ') + '. B12 결핍은 빈혈·신경손상·인지저하를 일으키고, 결핍 교정 효과는 확실합니다. 단, 결핍 없는 사람에게 B군 비타민은 심혈관질환을 예방하지 못했습니다(HOPE-2·NORVIT).',
      dose: '결핍 예방 25~100 µg/일 또는 결핍 교정 500~1,000 µg/일 (경구, 시아노코발라민 또는 메틸코발라민). 상한섭취량 없음.', cite: ['bvit-cvd'] });

    /* ---------- 철분 ---------- */
    if (p.lab.iron_low) add({ tier: 'rec', ing: 'iron', title: '철분 (검사로 결핍 확인된 경우)',
      why: '페리틴·헤모글로빈 저하가 확인되면 철분 보충은 확실한 효과가 있습니다. 반대로 결핍 없이 먹으면 위장 부작용·철 과잉 위험만 있습니다.',
      dose: '원소철 기준 30~60 mg/일(또는 격일), 식전·비타민 C와 함께. 3개월 후 재검사. 상한섭취량 45 mg/일(치료 시 의사 판단 초과 가능).', cite: [] });
    else if (p.sex === 'F' && p.age < 50 && !p.pregnant) add({ tier: 'cond', ing: 'iron', title: '철분 — 가임기 여성은 검사 먼저',
      why: '월경이 있는 여성은 철 결핍 위험이 높지만, 검사 없이 먹는 건 권하지 않습니다. 건강검진 혈액검사에 페리틴 추가(1~2만 원).',
      dose: '검사 후 결정.', cite: [] });
    else if (p.pregnant) add({ tier: 'rec', ing: 'iron', title: '철분 (임신 중기 이후)',
      why: '임신 중 철 요구량이 크게 늘어 산전 진료에서 표준적으로 권합니다.',
      dose: '산부인과 지시(보통 임신 16주 이후 30 mg 내외).', cite: [] });

    /* ---------- 종합비타민 ---------- */
    var mvTier = 'opt', mvWhy = '건강한 성인에게 종합비타민은 사망·심혈관질환을 줄이지 못했습니다(PHS II 11년, COSMOS 2.1만 명, NIH 39만 명 20년 추적). 암 발생은 7~8% 감소 신호가 있지만 경계선입니다. "보험" 삼아 먹는 건 해롭진 않으나 기대는 낮추세요.';
    if (p.age >= 60 && p.goal.cognition) { mvTier = 'cond'; mvWhy = '60세 이상에서 종합비타민은 3년간 전반 인지·기억을 소폭(0.07 SD) 개선했습니다(COSMOS 3개 하위연구 5,203명 메타분석, "인지 노화 약 2년 지연"). 치매 발생 자체는 줄이지 못했고 효과 크기는 작습니다. 그래도 근거 있는 인지 목적 보충제 중 가장 비용이 낮습니다.'; }
    else if (p.poorDiet) { mvTier = 'cond'; mvWhy = '식사가 부실한 사람에게 종합비타민 이득이 더 큰 경향이 있습니다(COSMOS 고혈압 하위분석: 식사 질 낮은 군 HR 0.81). 단, 식사 개선이 우선입니다.'; }
    add({ tier: mvTier, ing: 'multi', title: '종합비타민', why: mvWhy,
      dose: '권장량(100% 이내) 수준 저용량 제품. 흡연자는 베타카로틴 없는 제품. 비타민 E·A 고함량 제품 피하기.', cite: ['cosmos-meta', 'cosmos-main', 'phs2-cancer', 'nih-aarp-2024', 'uspstf-2022', 'cosmos-htn'] });

    /* ---------- 오메가-3 ---------- */
    if (!(p.meds.anticoagulant)) {
      if (p.cond.dyslip && p.lab.tg_high) add({ tier: 'cond', ing: 'omega3', title: '오메가-3 (중성지방 높은 경우)',
        why: '오메가-3는 중성지방을 약 15% 낮춥니다(코크란). 심혈관 사건 감소는 처방용 고순도 EPA 4 g(REDUCE-IT, 25% 감소)에서만 확인됐고, 일반 어유 1 g은 심혈관질환을 예방하지 못했습니다(VITAL·ASCEND). EPA+DHA 4 g은 효과 없이 심방세동만 늘렸습니다(STRENGTH).',
        dose: (p.age >= 65 ? '심혈관 고위험 고령이므로 EPA+DHA 합계 1 g/일 이하. ' : '중성지방 목적 EPA+DHA 1~2 g/일. ') + '심혈관 사건 예방 목적이면 의사와 처방용 고순도 EPA 상담.', cite: ['reduce-it', 'strength', 'cochrane-omega3', 'epa-vs-dha-2025', 'omega3-af'] });
      else if (p.lowFish) add({ tier: 'opt', ing: 'omega3', title: '오메가-3 (생선을 거의 안 먹는 경우)',
        why: 'VITAL에서 생선을 적게 먹는 사람은 오메가-3 1 g으로 심근경색이 줄어드는 하위집단 신호가 있었습니다(가설 수준). 자가면역질환은 7년 추적에서 17% 감소. 일반인 전체로는 심혈관·암 예방 효과 없음.',
        dose: 'EPA+DHA 합계 500 mg~1 g/일. 1 g 초과는 심방세동 위험 증가와 연관.', cite: ['vital-omega3', 'vital-d-autoimmune', 'omega3-af'] });
      else add({ tier: 'no', ing: 'omega3', title: '오메가-3 (생선 주 1~2회 이상 먹는 건강 성인)',
        why: '2.6만 명 RCT(VITAL)와 16만 명 코크란 리뷰 모두 일반 어유 보충제가 사망·전체 심혈관 사건을 줄이지 못했습니다. 생선을 먹고 있다면 보충제로 얻을 게 거의 없습니다.',
        dose: '생선(고등어·연어 등) 주 2회로 대체.', cite: ['vital-omega3', 'cochrane-omega3', 'ascend'] });
    }

    /* ---------- 칼슘 ---------- */
    if (p.cond.osteo) add({ tier: 'cond', ing: 'calcium', title: '칼슘 — 골다공증 (식사로 부족할 때만)',
      why: '골다공증 치료약(비스포스포네이트 등)과 병행 시 칼슘·비타민 D 충족이 기본입니다. 단, 칼슘 "보충제"는 신장결석을 17% 늘렸고 심근경색 위험 증가 논쟁이 있어 식사(유제품·멸치·두부)로 먼저 채우고 부족분만 보충하세요.',
      dose: '식사 포함 총 800~1,000 mg/일. 보충제는 1회 500 mg 이하, 식사와 함께. 한국 상한섭취량 2,500 mg.', cite: ['whi-cad-2006', 'bolland-calcium', 'bmj-2026-fracture'] });
    else if (p.age >= 50) add({ tier: 'no', ing: 'calcium', title: '칼슘 보충제 — 골다공증 없는 50대 이상',
      why: '69개 RCT 15만 명(BMJ 2026): 지역사회 거주 성인에게 칼슘·비타민 D는 골절·낙상을 거의 줄이지 못했습니다. USPSTF 2024 초안도 "권고 반대". 신장결석·심근경색 위험 가능성만 남습니다.',
      dose: '식사로 700~800 mg 충족(우유 1잔 약 200 mg). 보충제 불필요.', cite: ['bmj-2026-fracture', 'whi-cad-2006', 'bolland-calcium'] });

    /* ---------- 눈 ---------- */
    if (p.cond.amd) add({ tier: 'rec', ing: 'lutein', title: 'AREDS2 제형 (루테인·지아잔틴·비타민 C·E·아연·구리) — 중등도 황반변성',
      why: '중등도 황반변성 환자에서 AREDS2 제형은 진행을 늦췄습니다(NIH 안연구소, 10년 추적). 베타카로틴 대신 루테인 10 mg+지아잔틴 2 mg 조합이 표준. 오메가-3 추가는 효과 없음.',
      dose: '안과 진단 후 AREDS2 조성 그대로(루테인 10 mg·지아잔틴 2 mg·비타민 C 500 mg·E 400 IU·아연 80 mg·구리 2 mg). 국내 제품은 함량이 낮은 경우가 많으니 성분표 확인.', cite: ['areds2'] });
    else if (p.goal.eye) add({ tier: 'no', ing: 'lutein', title: '루테인 — 황반변성 진단 없는 경우',
      why: 'AREDS2 효과는 "이미 중등도 황반변성이 있는 눈"에서만 확인됐습니다. 건강한 눈의 예방이나 "눈 피로"에 대한 대규모 근거는 없습니다.',
      dose: '녹황색 채소(시금치·케일)로 충분. 40세 이후 안과 정기검진이 더 중요.', cite: ['areds2', 'phs2-eye'] });

    /* ---------- 감기·면역 ---------- */
    if (p.goal.immune) {
      add({ tier: 'opt', ing: 'vitc', title: '비타민 C — 감기 기간 단축(예방 아님)',
        why: '일반인에서 감기 예방 효과는 없고(RR 0.97), 평소 꾸준히 먹으면 기간이 성인 8%(약 반나절) 짧아집니다. 걸린 뒤 먹는 건 효과가 확인되지 않았습니다. 마라톤·군 훈련 같은 극한 상황에서만 예방 효과(52% 감소).',
        dose: '200~1,000 mg/일. 상한섭취량 2,000 mg. 그 이상은 설사·신장결석 위험.', cite: ['cochrane-vitc-cold'] });
      add({ tier: 'opt', ing: 'zinc', title: '아연 로젠지 — 감기 초기 24시간 내',
        why: '감기 초기에 하루 75 mg 이상 아연 로젠지를 빨면 기간이 1~2일 짧아질 수 있습니다(근거 확실성 낮음). 예방 효과는 없고 메스꺼움·미각 이상이 늘어납니다.',
        dose: '증상 시작 24시간 내, 아연 아세테이트/글루코네이트 로젠지 총 75~100 mg/일, 최대 1~2주. 장기 복용 금지(구리 결핍).', cite: ['zinc-cold'] });
      if (!dReason.length) add({ tier: 'no', ing: 'vitd', title: '비타민 D — 호흡기 감염 예방 목적',
        why: '43개 RCT 6.2만 명(2025): 감기·호흡기 감염 예방 효과가 사라졌습니다(OR 0.94, 유의 없음). 결핍 교정 목적이 아니라면 면역 목적으로는 기대하지 마세요.',
        dose: '—', cite: ['vitd-ari-2025'] });
    }

    /* ---------- 당뇨 전단계 ---------- */
    if (p.cond.prediabetes && !dReason.length) {} // 이미 비타민 D 항목에 포함

    /* ---------- 항산화·기타 비권장 ---------- */
    if (p.goal.longevity) add({ tier: 'no', ing: 'antioxidant', title: '항산화제(비타민 A·C·E·베타카로틴·셀레늄) — 노화·수명 목적',
      why: '78개 RCT 29.7만 명 코크란 리뷰: 항산화 보충제는 수명을 늘리지 않으며 베타카로틴·비타민 E는 사망률을 소폭 높였습니다. "항산화=젊음"은 세포 실험 얘기지 사람 결과가 아닙니다.',
      dose: '채소·과일로 섭취. 보충제 불필요.', cite: ['cochrane-antioxidant', 'uspstf-2022'] });


    /* ---------- 목표별: 혈압 · 수면 · 근육 · 관절 · 피부 · 장 · 지질 ---------- */
    if (p.cond.htn || p.goal.bp) add({ tier: 'opt', ing: 'magnesium', title: '마그네슘 — 혈압 보조',
      why: '34개 RCT: 약 300 mg 이상 1개월 복용 시 혈압 약 2 mmHg 감소. 확실하지만 작은 효과. 고혈압 약 대체 불가.',
      dose: '보충제 200~350 mg/일(구연산·글리시네이트). 보충제 상한 350 mg. 신장질환자는 금지.', cite: ['mg-bp-2016'] });
    if (p.goal.sleep) {
      add({ tier: 'opt', ing: 'magnesium', title: '마그네슘 — 수면',
        why: '고령자 3개 소규모 RCT(151명)에서 잠드는 시간 17분 단축. 근거 질 낮음. 해롭진 않고 저렴하니 4주 시도 후 효과 없으면 중단.',
        dose: '200~350 mg 저녁 복용.', cite: ['mg-sleep-2021'] });
      add({ tier: 'opt', ing: 'melatonin', title: '멜라토닌 — 잠드는 시간 단축 (국내 처방)',
        why: '19개 RCT: 잠드는 시간 7분 단축, 총 수면 8분 증가. 효과가 작아 미국수면의학회는 불면증에 "사용하지 않을 것을 제안". 시차·수면위상 지연에는 유용. 한국은 전문의약품.',
        dose: '의사 처방. 최신 용량반응 분석: 3~4 mg, 취침 3시간 전.', cite: ['melatonin-meta'] });
    }
    if (p.goal.muscle) add({ tier: p.exercise ? 'rec' : 'cond', ing: 'creatine', title: '크레아틴 — 근력운동 병행 시',
      why: '22개 RCT 721명(평균 57~70세): 근력운동+크레아틴은 위약+운동보다 근육 1.4 kg 더 증가. 운동 없이 먹으면 효과 없음. 5년 장기 안전성 확립. 신장질환자는 의사 상담.' + (p.exercise ? '' : ' 현재 근력운동을 하지 않는다면 운동부터 시작하세요.'),
      dose: '크레아틴 모노하이드레이트 3~5 g/일 매일, 로딩 불필요.', cite: ['creatine-older', 'creatine-memory'] });
    if (p.goal.joint) {
      add({ tier: 'no', ing: 'glucosamine', title: '글루코사민·콘드로이틴',
        why: 'NIH GAIT 1,583명: 위약(60% 반응)보다 낫지 않았고 관절 구조도 못 지켰다. 코크란: 특정 제약사 황산염 제제만 효과, 일반 제품은 없음. 미국류마티스학회·OARSI 지침 "권장 반대".',
        dose: '구매한다면 황산염 1,500 mg, 3개월 후 효과 없으면 중단.', cite: ['gait'] });
      add({ tier: 'opt', ing: 'curcumin', title: '커큐민 — 무릎 관절염 통증 (단기)',
        why: '15개 RCT: 통증을 소염진통제 수준으로 줄이고 부작용은 적었으나 시험 질이 낮습니다. "고흡수 제형"에서 간 손상 보고가 늘고 있어(미국 10례, 이탈리아 경고 라벨 의무화) 2~3개월 내 단기만.',
        dose: '커큐미노이드 500~1,000 mg/일 ≤3개월. 간질환·담석·항응고제 복용 시 금지. 피로·황달 시 즉시 중단.', cite: ['curcumin-oa'] });
      add({ tier: 'opt', ing: 'collagen', title: '콜라겐 — 관절',
        why: '5개 소규모 RCT 통합에서 통증 소폭 감소였으나 재분석에서 "강한 결론 불가". 해롭진 않음.',
        dose: '5~10 g/일 12주 시도.', cite: ['collagen-oa'] });
    }
    if (p.goal.skin) add({ tier: 'opt', ing: 'collagen', title: '콜라겐 펩타이드 — 피부 수분·탄력',
      why: '26개 RCT 1,721명: 수분·탄력 통계적 개선. 대부분 제조사 지원 소규모 8~12주 시험이며, 제조사 무관 시험만 모으면 효과가 사라진다는 2025 보도. 주름 개선 근거는 약함.',
      dose: '2.5~10 g/일 12주 시도 후 판단.', cite: ['collagen-skin'] });
    if (p.goal.gut || p.meds.antibiotic) {
      if (p.meds.antibiotic) add({ tier: 'rec', ing: 'probiotic', title: '프로바이오틱스 — 항생제 복용 중',
        why: '코크란 33개 RCT 6,352명: 항생제 연관 설사 19% → 8% (NNT 9). 프로바이오틱스 근거 중 가장 확실. 균주는 L. rhamnosus GG 또는 S. boulardii.',
        dose: '50억~400억 CFU/일, 항생제와 2시간 간격, 항생제 종료 후 1주까지.', cite: ['cochrane-probiotic-aad', 'aga-probiotic-2020'] });
      else add({ tier: 'opt', ing: 'probiotic', title: '프로바이오틱스 — 일반 장 건강·과민성장',
        why: '미국소화기학회 2020: 과민성장·일반 장 건강 목적은 근거 부족("연구 목적으로만"). 82개 RCT: 일부 균주만 효과, 확실성 낮음. 마트 제품이 시험된 균주와 같다는 보장 없음.',
        dose: '시도한다면 균주명이 표기된 제품 4주, 효과 없으면 중단.', cite: ['aga-probiotic-2020', 'probiotic-ibs'] });
    }
    if (p.cond.dyslip) add({ tier: 'no', ing: 'ryr', title: '홍국·베르베린 — 콜레스테롤',
      why: 'LDL은 낮추지만 홍국 유효성분은 처방약 로바스타틴과 동일 물질(부작용도 동일)이고 곰팡이독 오염 문제로 EU 규제 강화 중. 심혈관 사건 감소 근거 없음. 스타틴과 병용 금지.',
      dose: 'LDL 관리는 의사와 스타틴 상담. 스타틴 근육통이 있다면 CoQ10 100~200 mg 시도(근거 혼재).', cite: ['ryr-berberine', 'coq10-statin'] });
    if (p.cond.hf) add({ tier: 'cond', ing: 'coq10', title: '코엔자임 Q10 — 심부전',
      why: 'Q-SYMBIO(420명, 2년): 표준치료에 CoQ10 300 mg 추가 시 사망·심혈관 사건 절반. 단일 소규모 시험이라 지침 표준은 아님. 심장내과 상의.',
      dose: '100 mg 1일 3회. 와파린 복용 시 상호작용 주의.', cite: ['qsymbio'] });
    if (p.goal.bone && !p.cond.osteo) add({ tier: 'no', ing: 'vitk2', title: '비타민 K2 — 뼈·혈관',
      why: '골밀도는 소폭 유지하지만 16개 RCT 6,425명에서 골절 감소 없음. 관상동맥 석회화 예방은 최고 수준 RCT(AVADEC)에서 실패. 긍정 연구는 원료사 연계 단일 연구진.',
      dose: '불필요. 와파린 복용자 금기.', cite: ['k2-bone-cvd'] });

    /* 정렬: avoid → rec → cond → opt → no */
    var order = { avoid: 0, rec: 1, cond: 2, opt: 3, no: 4 };
    R.sort(function (a, b) { return order[a.tier] - order[b.tier]; });
    return R;
  }

  return { level: level, LEVEL: LEVEL, recs: recs };
})();
