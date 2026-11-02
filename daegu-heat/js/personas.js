// 사례 3종. 환경(env)은 2026년 여름 대구에서 실제로 있었던 유형의 상황을 재현한 시나리오이며, 수치는 예시다(실제 특보 이력은 기상청 API 연결 후 자동 입력).
export const PERSONAS = {
  worker: {
    id: 'worker', tag: '발표 사례', name: '달서구 성서공단 야외 배관공, 54세',
    story: '7월 말, 폭염경보가 이틀째. 오후 2시 옥외 배관 작업 중. 혈압약을 먹고 있고 어제도 땀을 많이 흘렸다. 대구 2025년 온열질환 140건 중 57건이 실외 작업장에서 났다.',
    profile: { age: 54, sgg: '달서구', dong: '이곡1동', cond: ['heart', 'meds'], act: 'outdoor_work', hours: 'peak' },
    env: { heat: 'warning', feels: 36, night: 'advisory', dust: 'moderate', pm25: 22, ozone: 'bad', hours: 'peak', date: '2026-07-29 14:00' },
  },
  senior: {
    id: 'senior', tag: '취약 가구', name: '군위군 효령면 혼자 사는 81세 어르신',
    story: '8월 초, 폭염중대경보. 집에 에어컨이 없고 선풍기만 있다. 경로당은 걸어서 15분. 자녀는 대구 시내에 산다. 효령면은 65세 이상이 55%다.',
    profile: { age: 81, sgg: '군위군', dong: '효령면', cond: ['alone', 'nocool', 'heart'], act: 'indoor', hours: 'peak' },
    env: { heat: 'severe', feels: 38.5, night: 'advisory', dust: 'good', pm25: 11, ozone: 'moderate', hours: 'peak', date: '2026-08-03 13:00' },
  },
  mom: {
    id: 'mom', tag: '직장인 가구', name: '북구 태전동 생후 8개월 아기와 사는 36세 맞벌이 부모',
    story: '봄철 미세먼지 매우나쁨에 초여름 첫 폭염주의보가 겹친 날. 아기를 데리고 어린이집에 걸어서 간다. 미세먼지 앱과 폭염 문자가 따로 와서 뭘 먼저 해야 할지 모른다.',
    profile: { age: 36, sgg: '북구', dong: '태전1동', cond: ['infant'], act: 'commute', hours: 'day' },
    env: { heat: 'advisory', feels: 33.5, night: 'none', dust: 'verybad', pm25: 82, ozone: 'moderate', hours: 'day', date: '2026-06-18 08:30' },
  },
};
