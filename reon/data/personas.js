/* 체험용 Persona — 가상의 인물, 실제 개인정보 아님 */
export const PERSONAS = [
  {
    id: 'A', name: '52세 사무직 퇴직자', short: '사무행정 20년 · 문서·민원·교육',
    text: '20년 동안 회사에서 행정업무를 했습니다. 문서작성과 민원응대를 많이 했고, 부서 일정관리와 신입 직원 교육도 맡았습니다. 이제는 새로운 분야에서 일해보고 싶습니다.',
    region: ['서울특별시', '노원구'], workType: 'any', hours: 'day', wage: '200-250', quals: ['computer_cert', 'driver'], training: 'yes',
  },
  {
    id: 'B', name: '48세 경력복귀 희망자', short: '사무직 경력 · 가족돌봄 공백 · 주간근무 희망',
    text: '예전에 회사에서 사무 업무를 했고, 결혼 후 아이를 키우고 부모님을 5년 정도 돌보느라 경력 공백이 있습니다. 전화 응대와 서류 정리는 자신 있습니다. 주간근무를 하고 싶고 집에서 너무 멀지 않은 곳이면 좋겠습니다.',
    region: ['경기도', '고양시'], workType: 'any', hours: 'day', wage: '150-200', quals: [], training: 'yes',
  },
  {
    id: 'C', name: '58세 재취업 희망자', short: '현장관리 경험 · 운전 가능 · 자격 취득 의향',
    text: '건설 현장에서 작업반을 관리하고 안전 점검을 했습니다. 운전은 오래 했고 사람을 상대하는 일도 할 수 있습니다. 필요하면 새로운 자격을 따서라도 다시 일하고 싶습니다.',
    region: ['경기도', '화성시'], workType: 'full', hours: 'any', wage: '200-250', quals: ['driver', 'forklift'], training: 'yes',
  },
  {
    id: 'D', name: '돌봄 분야 경력자', short: '요양보호사 6년 · 치매 어르신 돌봄',
    text: '요양보호사로 6년 동안 어르신을 돌봤습니다. 치매 어르신 식사와 위생을 챙기고 가족과 전화로 상태를 공유했습니다. 몸이 조금 힘들어 이제는 조정하거나 상담하는 일을 해보고 싶습니다.',
    region: ['부산광역시', '해운대구'], workType: 'any', hours: 'day', wage: 'any', quals: ['care_worker'], training: 'maybe',
  },
  {
    id: 'E', name: '전혀 다른 분야로 전환', short: '식당 자영업 15년 · 손님 응대 · 매출 관리',
    text: '15년 동안 식당을 운영했습니다. 손님 응대와 직원 관리, 재료 발주와 매출 정리를 직접 했습니다. 이제는 가게를 정리하고 안정적인 직장에서 사람을 돕는 일을 하고 싶습니다.',
    region: ['대전광역시', '서구'], workType: 'full', hours: 'day', wage: '200-250', quals: ['driver', 'cook'], training: 'yes',
  },
];
export const PERSONA_MAP = Object.fromEntries(PERSONAS.map((p) => [p.id, p]));
