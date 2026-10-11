/* 직무 요건·정책 근거 — 확인일 2026-10-06
   grade: 'law' 법령 조문 / 'official' 공공기관 공식 안내 / 'posting' 공공기관·수행기관 채용공고(2차) / 'secondary' 언론·블로그 등 2차 출처
   이 환경에서는 원문 페이지 직접 열람이 차단되어 검색 결과(검색엔진 요약)로 확인했다. 제출 전 원문 재확인 권장. */
export const GRADE_LABEL = { law: '법령', official: '공식 안내', posting: '채용공고', secondary: '2차 출처' };

export const JOB_EVIDENCE = {
  welfare_counselor: [
    { claim: '사회복지사 2급 취득: 전문학사 이상 + 사회복지 관련 17과목(필수 10·선택 7) + 현장실습 160시간(2020년 이후 이수자 기준)', grade: 'official', source: '국가평생교육진흥원 학점은행제 안내 · 한국사회복지사협회', url: 'https://lic.welfare.net' },
    { claim: '복지관·주민센터 상담 보조 인력은 사회복지사 자격을 우대 또는 요구(기관별 상이)', grade: 'posting', source: '수행기관 채용공고(2026)', url: 'https://www.work24.go.kr' },
  ],
  care_coordinator: [
    { claim: '재가노인복지시설(방문요양 등)의 시설·직원 배치기준은 노인복지법 시행규칙 별표9에 규정', grade: 'law', source: '노인복지법 시행규칙 별표9', url: 'https://www.law.go.kr' },
    { claim: '재가센터 코디네이터·사회복지사 공고는 요양보호사 또는 사회복지사 자격을 요구하는 경우가 많음', grade: 'posting', source: '재가센터 채용공고(2026)', url: 'https://www.work24.go.kr' },
  ],
  job_counselor: [
    { claim: '국민취업지원제도 위탁기관 상담사: 직업상담사 2급 또는 사회복지사 2급 중 하나 필수, 운전면허 우대', grade: 'posting', source: '위탁기관 채용공고(2026)', url: 'https://www.work24.go.kr' },
    { claim: '직업상담사 2급은 한국산업인력공단 국가기술자격(필기·실기)', grade: 'official', source: '큐넷', url: 'https://www.q-net.or.kr' },
  ],
  care_worker: [
    { claim: '요양보호사가 되려면 교육기관 교육과정 이수 후 시·도지사가 실시하는 자격시험 합격(노인복지법 제39조의2)', grade: 'law', source: '노인복지법 제39조의2', url: 'https://www.law.go.kr' },
    { claim: '표준교육과정 240시간(이론 80·실기 80·현장실습 80), 필기·실기 각 60점 이상 합격', grade: 'official', source: '인천광역시 요양보호사 자격안내 · 한국보건의료인국가시험원', url: 'https://www.kuksiwon.or.kr' },
  ],
  senior_life_supporter: [
    { claim: '생활지원사 필수요건: 사회복지시설 종사자 결격사유 없음, 범죄·성범죄·노인학대 전력 조회 통과. 우대: 해당 지역 거주, 요양보호사·사회복지사', grade: 'posting', source: '노인맞춤돌봄서비스 수행기관 채용공고(2026)', url: 'https://www.mohw.go.kr' },
    { claim: '주 25시간 계약직, 09:00~14:30 근무 공고가 일반적(2026 기본급 1,426,000원 사례)', grade: 'posting', source: '수행기관 채용공고(2026)', url: 'https://www.work24.go.kr' },
  ],
  contact_center: [
    { claim: '법정 필수 자격 없음. 기관별 상담 시스템 교육은 입사 후 제공', grade: 'posting', source: '공공기관 고객센터 채용공고', url: 'https://www.work24.go.kr' },
  ],
  admin_clerk: [
    { claim: '컴퓨터활용능력·워드프로세서는 대한상공회의소 시행 국가기술자격, 공공기관 사무보조 채용에서 우대·가점', grade: 'official', source: '대한상공회의소 자격평가사업단', url: 'https://license.korcham.net' },
  ],
  corporate_trainer: [
    { claim: '평생교육사는 국가평생교육진흥원이 자격을 관리하며 평생교육기관 채용 시 우대', grade: 'official', source: '국가평생교육진흥원', url: 'https://www.nile.or.kr' },
  ],
  after_school: [
    { claim: '교육청 초등돌봄전담사 공고는 보육교사 2급 이상 또는 유·초·중등 교원자격증을 요구. 응시자격은 교육청·회차마다 상이', grade: 'posting', source: '시도교육청 채용공고(2026 서울 등)', url: 'https://www.work24.go.kr' },
    { claim: '2026년 늘봄학교 정착으로 돌봄전담사·늘봄실무사 수요 증가', grade: 'secondary', source: '교육 관련 매체(2026)', url: 'https://www.hangyo.com' },
  ],
  child_caregiver: [
    { claim: '아이돌보미 양성교육 80시간 + 현장실습 10시간. 보육교사·유치원교사·간호사·초등교사·특수교사 자격자는 30시간', grade: 'official', source: '아이돌봄서비스 · 지자체 모집 안내', url: 'https://idolbom.go.kr' },
    { claim: '활동 요건: 해당 지역 거주, 심신 건강, 양육 경험. 활동수당 시간당 11,120원, 월 60시간 이상 4대보험', grade: 'official', source: '아이돌봄서비스 모집 안내(2026)', url: 'https://idolbom.go.kr' },
  ],
  safety_manager: [
    { claim: '안전관리자 선임 자격은 산업안전보건법 시행령 별표4에 규정. 별표3이 선임 대상 사업·규모를 정함', grade: 'law', source: '산업안전보건법 시행령 별표3·별표4', url: 'https://www.law.go.kr' },
    { claim: '산업안전산업기사는 일부 규모 이하 사업장에서만 선임 가능해 기사 등급을 요구하는 공고가 많음', grade: 'secondary', source: '자격 안내 매체', url: 'https://www.q-net.or.kr' },
  ],
  facility_manager: [
    { claim: '소방안전관리자는 특정소방대상물 등급(특급·1급·2급·3급)별로 선임 자격이 다름(화재의 예방 및 안전관리에 관한 법률)', grade: 'law', source: '화재의 예방 및 안전관리에 관한 법률 제24조', url: 'https://www.law.go.kr' },
  ],
  welfare_driver: [
    { claim: '1종 보통 면허로 승차정원 15인 이하 승합차 운전 가능, 16인 이상은 1종 대형', grade: 'official', source: '도로교통공단 면허 안내', url: 'https://www.safedriving.or.kr' },
    { claim: '어린이통학버스는 도로교통법 제50조·제51~53조의4에 따른 신고·안전 규정 적용', grade: 'law', source: '도로교통법', url: 'https://www.law.go.kr' },
  ],
  security_guard: [
    { claim: '경비업자는 신규 채용 일반경비원을 배치 전 신임교육기관에서 교육받게 해야 함(경비업법 제13조). 3년 내 이수·근무 경력자는 제외 가능', grade: 'law', source: '경비업법 제13조', url: 'https://www.law.go.kr' },
    { claim: '일반경비원 신임교육은 시행규칙 별표2에 따른 24시간 법정교육', grade: 'law', source: '경비업법 시행규칙 별표2', url: 'https://www.law.go.kr' },
  ],
  quality_clerk: [
    { claim: '법정 필수 자격 없음. 품질관리 사무직은 엑셀·검사 절차 이해를 우대', grade: 'posting', source: '제조기업 채용공고', url: 'https://www.work24.go.kr' },
  ],
  b2b_sales: [
    { claim: '법정 필수 자격 없음. 외근형 영업은 운전면허 우대', grade: 'posting', source: '기업 채용공고', url: 'https://www.work24.go.kr' },
  ],
  public_info_guide: [
    { claim: '법정 필수 자격 없음. 안내데스크·민원안내는 시간제 공고가 많음', grade: 'posting', source: '공공기관 채용공고', url: 'https://www.work24.go.kr' },
  ],
  small_business_support: [
    { claim: '소상공인지원센터 상담사는 지원사업·사업계획 이해를 요구, 법정 필수 자격 없음', grade: 'posting', source: '소상공인시장진흥공단·지역센터 채용공고', url: 'https://www.semas.or.kr' },
  ],
};

export const POLICY_EVIDENCE = [
  { claim: '고용노동부·한국고용정보원이 「2026 고용24 국민참여 AI 고용서비스 발굴 온라인 해커톤」 개최(접수 2026.9.21~10.13). 고용24 OpenAPI·EIS·ELDS·공공데이터포털 활용, 우수작은 고용24 서비스 반영 검토', grade: 'official', source: '고용노동부 보도자료(2026.9.21, KDI 경제정보센터 게재)', url: 'https://eiec.kdi.re.kr/policy/materialView.do?num=287209' },
  { claim: '중장년내일센터(전국 31개)가 40세 이상 재직자·퇴직(예정)자에게 생애경력설계·전직·재취업 지원을 무료 제공', grade: 'official', source: '고용노동부 중장년 취업지원사업 안내(2026)', url: 'https://www.work24.go.kr' },
  { claim: '2026년 중장년 경력지원제: 50~64세가 기업에서 1~3개월 직무교육·실무를 경험하며 월 최대 150만 원 참여수당', grade: 'secondary', source: '고용노동부 안내를 요약한 매체(2026)', url: 'https://www.work24.go.kr' },
  { claim: '고령자고용법 제21조의3: 피보험자 1,000명 이상 사업주는 50세 이상 비자발적 퇴직예정자에게 재취업지원서비스(진로설계·취업알선·교육) 제공 의무', grade: 'law', source: '고용상 연령차별금지 및 고령자고용촉진에 관한 법률 제21조의3', url: 'https://www.law.go.kr' },
  { claim: '재취업지원서비스 의무를 500인 이상(2027 하반기)·300인 이상(2029 하반기)으로 단계 확대 추진', grade: 'secondary', source: '고용노동부 개편 방안(2026.5)을 요약한 매체', url: 'https://www.moel.go.kr' },
  { claim: '2026년 신설 일손부족일자리 동행 인센티브: 50~64세 중장년이 인력부족 업종에 취업·근속 시 본인에게 지원금', grade: 'secondary', source: '고용노동부 안내를 요약한 매체(2026)', url: 'https://www.moel.go.kr' },
];
