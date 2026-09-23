/* 근거영양 — 제품 환산 계산기 기준값
   ev = 이 사이트의 성분 카드·연구 DB에 적힌 "연구에서 쓰인 1일 용량" 범위 (효과 보증 아님)
   kr = 식약처 건강기능식품 기능성 함량 범위(고시형) · ul = 2025 한국인 영양소 섭취기준 상한(성인 중 가장 낮은 값)
   avoidAbove = 이 사이트가 '유해 근거'로 분류한 1일 용량 경계 · 값의 출처는 각 성분 카드(seongbun.html#키)의 연구 목록
   숫자를 바꿀 때는 ingredients.js·kdri.js와 같이 바꿀 것. 검증 2026-09-23 */
window.EBN_CALC = { types: [
  { id: 'vitd', ing: 'vitd', name: '비타민 D3', unit: 'IU', hint: 'µg 표기면 ×40 (10 µg = 400 IU)', ev: [800, 2000], ul: 4000, ulNote: '상한 100 µg = 4,000 IU' },
  { id: 'omega3', ing: 'omega3', name: '오메가-3 (EPA+DHA 합계)', unit: 'mg', hint: '"어유 1,000 mg"이 아니라 EPA+DHA 합계 mg을 입력', ev: [500, 1000], kr: [500, 2000], ul: null, ulNote: '상한 미설정. 항응고제 병용 시 고용량 주의' },
  { id: 'b12', ing: 'b12', name: '비타민 B12', unit: 'µg', ev: [25, 1000], ul: null, ulNote: '상한 미설정' },
  { id: 'folate', ing: 'folate', name: '엽산', unit: 'µg', ev: [400, 400], ul: 1000, ulNote: '보충제·강화식품의 합성엽산 기준' },
  { id: 'iron', ing: 'iron', name: '철분 (원소철)', unit: 'mg', hint: '"황산철 325 mg" ≠ 원소철. 라벨의 원소철(철로서) mg', ev: [30, 60], ul: 45, ulNote: '결핍 치료 용량은 상한을 넘을 수 있으며 의사·약사 판단 영역' },
  { id: 'magnesium', ing: 'magnesium', name: '마그네슘', unit: 'mg', ev: [200, 350], ul: 350, ulNote: '보충제·의약품 급원 기준' },
  { id: 'probiotic', ing: 'probiotic', name: '프로바이오틱스', unit: '억 CFU', hint: '100억 CFU → 100 입력. 균주명 없는 제품은 근거 매칭 불가', ev: [50, 400], kr: [1, 100], ul: null, ulNote: '상한 미설정' },
  { id: 'coq10', ing: 'coq10', name: '코엔자임 Q10', unit: 'mg', ev: [100, 300], kr: [90, 100], ul: null, ulNote: '상한 미설정' },
  { id: 'creatine', ing: 'creatine', name: '크레아틴 (모노하이드레이트)', unit: 'g', ev: [3, 5], ul: null, ulNote: '상한 미설정' },
  { id: 'lutein', ing: 'lutein', name: '루테인', unit: 'mg', hint: 'AREDS2 조성은 루테인 10 mg + 지아잔틴 2 mg', ev: [10, 10], kr: [10, 20], ul: null, ulNote: '상한 미설정' },
  { id: 'vitc', ing: 'vitc', name: '비타민 C', unit: 'mg', ev: [100, 1000], ul: 2000 },
  { id: 'zinc', ing: 'zinc', name: '아연', unit: 'mg', ev: [8, 10], ul: 35, ulNote: '감기 로젠지 75~100 mg은 2주 이내 단기 사용 근거' },
  { id: 'calcium', ing: 'calcium', name: '칼슘', unit: 'mg', hint: '보충은 식사로 부족한 만큼만, 1회 500 mg 이하', ev: null, ul: 2000, ulNote: '연령·성별에 따라 2,000~3,000 mg(식사 포함 총량)' },
  { id: 'vite', ing: 'vite', name: '비타민 E', unit: 'IU', hint: 'mg α-TE 표기면 ×1.5', ev: null, avoidAbove: 400, ul: 810, ulNote: '상한 540 mg α-TE ≈ 810 IU. 400 IU 이상은 사망률 증가 근거' },
  { id: 'vita', ing: 'vita', name: '비타민 A (레티놀)', unit: 'µg RAE', hint: '베타카로틴은 해당 없음', ev: null, avoidAbove: 700, ul: 3000, ulNote: '보충제로 700 µg RAE 이상은 이 사이트 기준 피할 항목' },
  { id: 'b6', ing: 'b6', name: '비타민 B6', unit: 'mg', ev: null, ul: 50, ulNote: '2025년 100 → 50 mg 하향(말초신경병증)' },
  { id: 'selenium', ing: 'selenium', name: '셀레늄', unit: 'µg', ev: null, ul: 400 },
  { id: 'curcumin', ing: 'curcumin', name: '커큐민 (커큐미노이드)', unit: 'mg', ev: [500, 1000], ul: null, ulNote: '상한 미설정' },
  { id: 'collagen', ing: 'collagen', name: '콜라겐 펩타이드', unit: 'g', ev: [2.5, 10], ul: null, ulNote: '상한 미설정' },
  { id: 'ginseng', ing: 'ginseng', name: '홍삼·인삼 (진세노사이드 Rg1+Rb1+Rg3)', unit: 'mg', hint: '농축액 g이 아니라 진세노사이드 합계 mg', ev: null, kr: [3, 80], ul: null, ulNote: '상한 미설정' },
  { id: 'protein', ing: null, name: '단백질 파우더', unit: 'g', hint: '1회 분량의 "단백질" g (파우더 g 아님)', ev: null, rni: { M: [65, 60], F: [55, 50], note: '2025 한국인 영양소 섭취기준 권장섭취량(식사 포함 총량): 남 19~49세 65 g·50세+ 60 g, 여 19~29세 55 g·30세+ 50 g' }, ul: null, ulNote: '상한 미설정' }
],
  marketing: [
    ['gift', '증정품·사은품 포함'], ['point', '포인트·PV/BV 적립'], ['sub', '정기주문 할인'], ['origin', '원산지·역사·농장 강조'], ['voucher', '검사·분석권 제공'], ['blend', '"독점 블렌드"로 개별 함량 미표기']
  ]
};
