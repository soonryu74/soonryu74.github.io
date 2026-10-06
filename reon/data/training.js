/* 교육훈련 과정 — DEMO 데이터
   구조는 고용24 OPEN API「국민내일배움카드 훈련과정」(callOpenApiSvcInfo310L01) 응답 항목에 맞춰 정렬했다.
   (title=과정명, subTitle=기관, address=지역, traStartDate/traEndDate=기간, trainTarget/traingMthd=방식)
   아래 항목은 실제 개설 과정이 아니라 "이런 종류의 과정을 이런 형식으로 보여준다"는 예시다. 화면에 DEMO 표기 필수. */
export const TRAINING_SOURCE = {
  mode: 'demo',
  label: 'DEMO',
  note: '실제 훈련과정 아님. 고용24 훈련과정 API 연결 전 구조 확인용 예시',
  official: { label: '고용24 훈련과정 검색', url: 'https://www.work24.go.kr/hr/a/a/1100/trnnCrsInf.do' },
};

export const TRAINING = [
  { id: 't1', title: '사회복지 현장실무 입문(복지서비스 이해·상담 기초)', institution: '○○평생교육원', region: '서울', months: 2, method: '집합', skills: ['welfare_knowledge', 'counsel', 'law'], jobs: ['welfare_counselor', 'care_coordinator', 'senior_life_supporter'] },
  { id: 't2', title: '사회복지사 2급 자격 과정(학점은행제)', institution: '○○사이버평생교육원', region: '전국(온라인)', months: 12, method: '온라인', skills: ['welfare_knowledge', 'law'], qual: 'social_worker', jobs: ['welfare_counselor', 'care_coordinator'] },
  { id: 't3', title: '직업상담사 2급 필기·실기 대비', institution: '○○직업전문학교', region: '경기', months: 3, method: '혼합', skills: ['counsel', 'law', 'planning'], qual: 'job_counselor', jobs: ['job_counselor'] },
  { id: 't4', title: '요양보호사 양성과정(이론·실기·실습 240시간)', institution: '○○요양보호사교육원', region: '경기', months: 2, method: '집합', skills: ['eldercare', 'hygiene', 'medical_knowledge'], qual: 'care_worker', jobs: ['care_worker', 'care_coordinator', 'senior_life_supporter'] },
  { id: 't5', title: '고객응대·감정노동 대처 실무', institution: '○○서비스교육센터', region: '서울', months: 1, method: '집합', skills: ['phone', 'conflict', 'empathy'], jobs: ['contact_center', 'public_info_guide', 'welfare_counselor'] },
  { id: 't6', title: '컴퓨터활용능력 2급 + 사무자동화 실무', institution: '○○컴퓨터학원', region: '인천', months: 2, method: '혼합', skills: ['computer', 'data', 'docs'], qual: 'computer_cert', jobs: ['admin_clerk', 'quality_clerk', 'contact_center'] },
  { id: 't7', title: '중장년 디지털 역량 강사 양성', institution: '○○디지털배움터', region: '부산', months: 1, method: '집합', skills: ['teach', 'digital'], jobs: ['corporate_trainer', 'public_info_guide'] },
  { id: 't8', title: '아이돌보미 양성교육(이론 80시간+실습)', institution: '○○건강가정지원센터', region: '대구', months: 1, method: '집합', skills: ['childcare', 'empathy'], qual: 'idolbom_edu', jobs: ['child_caregiver', 'after_school'] },
  { id: 't9', title: '산업안전산업기사 자격 취득 과정', institution: '○○기술교육원', region: '울산', months: 4, method: '혼합', skills: ['safety', 'law'], qual: 'safety_cert', jobs: ['safety_manager', 'facility_manager'] },
  { id: 't10', title: '건물 시설관리 실무(전기·소방 기초)', institution: '○○기능학원', region: '경기', months: 2, method: '집합', skills: ['facility', 'safety'], jobs: ['facility_manager', 'security_guard'] },
  { id: 't11', title: '경비원 신임교육(법정)', institution: '○○경비교육원', region: '전국', months: 1, method: '집합', skills: ['safety', 'civil'], qual: 'security_edu', jobs: ['security_guard'] },
  { id: 't12', title: '품질관리 기초와 엑셀 통계', institution: '○○산업교육원', region: '충남', months: 1, method: '온라인', skills: ['quality', 'data', 'accuracy'], jobs: ['quality_clerk'] },
  { id: 't13', title: '소상공인 지원제도·사업계획서 상담 실무', institution: '○○창업지원센터', region: '광주', months: 1, method: '혼합', skills: ['business', 'planning', 'law'], jobs: ['small_business_support'] },
  { id: 't14', title: '송영차량 안전운행·승하차 보조 교육', institution: '○○운전전문학원', region: '경기', months: 1, method: '집합', skills: ['driving', 'safety'], jobs: ['welfare_driver'] },
  { id: 't15', title: '노인맞춤돌봄 생활지원사 직무교육', institution: '○○노인복지관', region: '전국', months: 1, method: '혼합', skills: ['eldercare', 'record', 'digital'], jobs: ['senior_life_supporter'] },
  { id: 't16', title: '영업·고객관리(CRM) 실무', institution: '○○경영교육원', region: '서울', months: 1, method: '온라인', skills: ['sales', 'negotiate', 'data'], jobs: ['b2b_sales'] },
];
