export const PERSONAS = {
  tb: {
    id: 'tb', tag: '발표 사례', name: '결핵 치료 중인 62세, 혼자 사는 분',
    story: '건설 일용직으로 일하다 결핵 진단. 전염성이 있어 입원·격리치료 명령을 받고 일을 멈춘 지 두 달째. 소득이 끊겼고 병원비와 월세, 난방비가 걱정.',
    profile: { age: 62, sido: '경기', household: ['single'], situation: ['illness_tb', 'income_loss', 'hospital_bills', 'energy'], business: 'none', employment: 'uninsured', income_pct: 50, themes: ['생활지원', '신체건강', '주거'] },
  },
  shop: {
    id: 'shop', tag: '1차 타겟', name: '동네 카페 운영 3년 차, 41세 사장님',
    story: '직원 없이 혼자 운영. 매출이 줄어 운영자금이 빠듯하고, 국민연금·건강보험료가 부담. 어떤 지원이 있는지 찾아볼 시간이 없다.',
    profile: { age: 41, sido: '서울', household: [], situation: ['income_loss'], business: 'self', employment: 'uninsured', income_pct: 150, themes: ['서민금융', '일자리'] },
  },
  baby: {
    id: 'baby', tag: '직장인 가구', name: '첫 아이 출산을 앞둔 34세 맞벌이 부부',
    story: '출산 예정일이 두 달 뒤. 회사에서 받을 수 있는 휴가·급여와 정부 지원이 헷갈리고, 무엇을 언제 신청해야 하는지 모른다.',
    profile: { age: 34, sido: '인천', household: ['pregnant'], situation: [], business: 'none', employment: 'insured', income_pct: 200, themes: ['임신·출산', '보육'] },
  },
};
