/* 역량 사전 — 다시ON AI
   id: 내부 식별자 / label: 화면 표시 / cat: 분류 / kw: 자연어에서 찾을 키워드(정규식 조각)
   evidence 문구는 skillExtractor가 매칭된 원문 조각으로 생성한다. */
export const SKILL_CATEGORIES = {
  people: '사람을 대하는 능력',
  office: '사무·행정 능력',
  care: '돌봄·생활 지원',
  field: '현장·기술',
  manage: '관리·조직',
  knowledge: '지식·자격',
};

export const SKILLS = [
  // 사람을 대하는 능력
  { id: 'counsel', label: '상담', cat: 'people', kw: ['상담', '고충', '이야기를 들', '하소연', '고민을 들'] },
  { id: 'civil', label: '민원응대', cat: 'people', kw: ['민원', '고객 응대', '고객응대', '접수', '안내 업무', '창구'] },
  { id: 'phone', label: '전화응대', cat: 'people', kw: ['전화', '콜센터', '콜 ', '유선'] },
  { id: 'communication', label: '대인관계·소통', cat: 'people', kw: ['사람을 상대', '사람 상대', '소통', '대인', '사람 만나', '사람들과', '응대'] },
  { id: 'conflict', label: '갈등조정', cat: 'people', kw: ['갈등', '중재', '조정', '항의', '불만 처리', '클레임'] },
  { id: 'teach', label: '교육·강의', cat: 'people', kw: ['교육', '강의', '가르', '지도했', '멘토', '훈련시', '신입 교육', '직원 교육'] },
  { id: 'sales', label: '영업·고객관리', cat: 'people', kw: ['영업', '거래처', '고객 관리', '고객관리', '판매', '매출'] },
  { id: 'negotiate', label: '협상', cat: 'people', kw: ['협상', '계약 조건', '단가'] },

  // 사무·행정
  { id: 'docs', label: '문서작성', cat: 'office', kw: ['문서', '서류', '공문', '보고서', '기안', '한글 ', '워드'] },
  { id: 'admin', label: '행정처리', cat: 'office', kw: ['행정', '사무', '총무', '결재', '증빙', '정산', '서무'] },
  { id: 'schedule', label: '일정관리', cat: 'office', kw: ['일정', '스케줄', '예약', '회의 준비', '시간표'] },
  { id: 'data', label: '데이터 입력·엑셀', cat: 'office', kw: ['엑셀', '데이터', '입력', '전산', '표 작성', '통계'] },
  { id: 'accounting', label: '회계·경리', cat: 'office', kw: ['경리', '회계', '세금계산서', '급여', '장부', '지출'] },
  { id: 'computer', label: '컴퓨터 활용', cat: 'office', kw: ['컴퓨터', '피피티', 'ppt', '파워포인트', '오피스', '프로그램 사용', '전산'] },
  { id: 'planning', label: '기획·보고', cat: 'office', kw: ['기획', '제안서', '계획 수립', '계획을 세', '보고서', '보고했', '분석'] },
  { id: 'record', label: '기록·정리', cat: 'office', kw: ['기록', '정리', '대장', '관리대장', '일지'] },
  { id: 'accuracy', label: '꼼꼼함·정확성', cat: 'office', kw: ['꼼꼼', '정확', '실수 없', '검수', '확인 작업'] },
  { id: 'hr', label: '채용·인사', cat: 'office', kw: ['채용', '인사', '면접', '근태'] },

  // 돌봄·생활 지원
  { id: 'eldercare', label: '노인 돌봄 경험', cat: 'care', kw: ['부모님', '어르신', '노인', '간병', '병수발', '치매', '돌봄', '요양'] },
  { id: 'childcare', label: '아동 돌봄 경험', cat: 'care', kw: ['아이', '자녀', '육아', '아동', '보육', '어린이'] },
  { id: 'family', label: '가족돌봄·가사 운영', cat: 'care', kw: ['가족', '살림', '가사', '집안', '경력 공백', '경력단절'] },
  { id: 'cooking', label: '조리·식사 준비', cat: 'care', kw: ['요리', '조리', '식사', '음식', '급식'] },
  { id: 'hygiene', label: '청소·위생 관리', cat: 'care', kw: ['청소', '위생', '소독', '정리정돈'] },
  { id: 'empathy', label: '공감·정서 지원', cat: 'care', kw: ['공감', '위로', '정서', '말벗', '마음'] },

  // 현장·기술
  { id: 'driving', label: '운전', cat: 'field', kw: ['운전', '면허', '차량', '배송', '운송', '셔틀'] },
  { id: 'site', label: '현장관리', cat: 'field', kw: ['현장', '공사', '작업반', '시공', '감독'] },
  { id: 'safety', label: '안전관리', cat: 'field', kw: ['안전', '사고 예방', '점검', '위험'] },
  { id: 'facility', label: '설비·시설 관리', cat: 'field', kw: ['설비', '시설', '기계', '보수', '수리', '전기', '관리소'] },
  { id: 'quality', label: '품질·생산관리', cat: 'field', kw: ['품질', '생산', '검사', '불량', '공정'] },
  { id: 'physical', label: '신체활동·체력', cat: 'field', kw: ['체력', '몸 쓰는', '힘쓰는', '야외', '운동'] },
  { id: 'store', label: '매장 운영·판매', cat: 'field', kw: ['매장', '가게', '장사', '점포', '손님', '자영업', '식당'] },

  // 관리·조직
  { id: 'leadership', label: '팀 관리·리더십', cat: 'manage', kw: ['팀장', '관리자', '직원 관리', '직원을', '팀을', '부서', '책임자', '반장', '작업반', '소장'] },
  { id: 'problem', label: '문제해결', cat: 'manage', kw: ['문제', '해결', '대처', '돌발', '긴급'] },
  { id: 'business', label: '창업·사업 운영', cat: 'manage', kw: ['창업', '사업', '운영했', '대표', '자영업'] },
  { id: 'coordination', label: '관계기관 협력·조율', cat: 'manage', kw: ['협력', '협조', '기관', '유관', '연계', '조율', '연락', '공유'] },

  // 지식·자격
  { id: 'welfare_knowledge', label: '사회복지 지식', cat: 'knowledge', kw: ['사회복지', '복지관', '복지 제도', '복지센터'] },
  { id: 'medical_knowledge', label: '의료·간호 지식', cat: 'knowledge', kw: ['간호', '병원', '의료', '약 복용', '투약'] },
  { id: 'law', label: '법·제도 이해', cat: 'knowledge', kw: ['법', '제도', '규정', '지침', '조례'] },
  { id: 'language', label: '외국어', cat: 'knowledge', kw: ['영어', '일본어', '중국어', '외국어', '통역'] },
  { id: 'digital', label: '디지털 기기 활용', cat: 'knowledge', kw: ['스마트폰', '앱', '키오스크', '온라인', '유튜브', 'sns'] },
];

export const SKILL_MAP = Object.fromEntries(SKILLS.map((s) => [s.id, s]));

/* 자격·면허 선택지 — 선택 시 역량·자격 보유로 반영 */
export const QUALIFICATIONS = [
  { id: 'driver', label: '운전면허(1종·2종)', skills: ['driving'] },
  { id: 'care_worker', label: '요양보호사', skills: ['eldercare', 'hygiene'] },
  { id: 'social_worker', label: '사회복지사(1급·2급)', skills: ['welfare_knowledge', 'counsel'] },
  { id: 'job_counselor', label: '직업상담사(1급·2급)', skills: ['counsel', 'law'] },
  { id: 'childcare_teacher', label: '보육교사', skills: ['childcare', 'teach'] },
  { id: 'computer_cert', label: '컴퓨터활용능력·워드·ITQ', skills: ['computer', 'data'] },
  { id: 'safety_cert', label: '산업안전(산업)기사', skills: ['safety'] },
  { id: 'nurse_aid', label: '간호조무사', skills: ['medical_knowledge', 'eldercare'] },
  { id: 'cook', label: '조리사·조리기능사', skills: ['cooking', 'hygiene'] },
  { id: 'forklift', label: '지게차·중장비 면허', skills: ['site'] },
  { id: 'electric', label: '전기·소방·설비 자격', skills: ['facility'] },
  { id: 'lifelong_edu', label: '평생교육사', skills: ['teach'] },
];
export const QUAL_MAP = Object.fromEntries(QUALIFICATIONS.map((q) => [q.id, q]));
