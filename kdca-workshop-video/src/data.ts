export const FPS = 30;

export type YearItem = {
  year: number;
  world: string[]; // 그 세상 (대한민국 뉴스)
  title: string; // 그리고 우리 (질병관리본부·질병관리청)
  sub: string;
  dur?: number; // 프레임 수 (기본 270 = 9초)
  extra?: { at: number; big: string; small: string };
  stat?: { value: number; unit: string; label: string; from?: number };
};

export type Act = {
  no: number;
  range: string;
  name: string;
  color: string;
  en: string;
  years: YearItem[];
};

export const ACTS: Act[] = [
  {
    no: 1,
    range: "2007 — 2014",
    name: "기반을 다지다",
    en: "BUILDING THE FOUNDATION",
    color: "#3aa0ff",
    years: [
      {
        year: 2007,
        world: ["태안 기름 유출, 123만 자원봉사 행렬", "제2차 남북정상회담", "첫 아이폰 공개, 스마트폰 시대 예고"],
        title: "국민건강영양조사,\n연중 상시조사 체계로",
        sub: "국민 건강 통계의 기반을 다지다",
      },
      {
        year: 2008,
        world: ["숭례문 화재", "베이징올림픽 야구 금메달 · 박태환 금메달", "글로벌 금융위기"],
        title: "지역사회건강조사\n첫걸음",
        sub: "전국 시·군·구의 건강지표를 처음으로 한눈에",
      },
      {
        year: 2009,
        dur: 420,
        world: ["김연아, 세계선수권 첫 우승", "나로호 첫 발사", "아이폰 국내 상륙"],
        title: "신종인플루엔자\n대유행에 맞서다",
        sub: "신종인플루엔자 A(H1N1) · 대규모 예방접종 시행",
        extra: { at: 190, big: "위기경보 ‘심각’", small: "국가 감염병 위기경보, 사상 첫 최고 단계 발령" },
      },
      {
        year: 2010,
        world: ["김연아, 밴쿠버 올림픽 금메달", "남아공 월드컵, 첫 원정 16강", "G20 서울 정상회의"],
        title: "충북 오송 시대\n개막",
        sub: "오송 보건의료행정타운으로 이전",
      },
      {
        year: 2011,
        dur: 310,
        world: ["평창, 2018 동계올림픽 유치 확정", "스마트폰 가입자 2천만 돌파", "동일본 대지진"],
        title: "원인 미상 폐 손상,\n원인을 밝혀내다",
        sub: "역학조사와 동물실험으로 가습기살균제 위험 확인",
      },
      {
        year: 2012,
        world: ["싸이 ‘강남스타일’ 세계적 열풍", "런던올림픽 종합 5위", "여수세계박람회 개최"],
        title: "국립중앙인체자원은행\n개관",
        sub: "미래 보건의료 연구의 자원을 모으다",
      },
      {
        year: 2013,
        world: ["나로호 발사 성공", "류현진, 메이저리그 데뷔", "숭례문, 5년여 만에 복구 완료"],
        title: "SFTS\n국내 첫 환자 확인",
        sub: "중증열성혈소판감소증후군 · 진드기 매개 감염병 감시 가동",
      },
      {
        year: 2014,
        world: ["세월호 참사, 온 국민의 슬픔", "프란치스코 교황 방한", "인천 아시안게임"],
        title: "어린이 국가예방접종\n전면 무료화",
        sub: "에볼라 유입 차단을 위한 검역 강화",
      },
    ],
  },
  {
    no: 2,
    range: "2015",
    name: "멈춰 선 여름",
    en: "THE SUMMER THAT STOOD STILL",
    color: "#ff6b5e",
    years: [
      {
        year: 2015,
        dur: 480,
        world: ["메르스, 대한민국을 멈춰 세우다", "광복 70주년", "야구 프리미어12 초대 우승"],
        title: "메르스(MERS)\n대응",
        sub: "확진 186명 · 격리 1만 6천여 명",
        extra: { at: 300, big: "뼈아픈 교훈", small: "이 여름의 교훈이, 이후 모든 변화의 출발점이 됩니다" },
      },
    ],
  },
  {
    no: 3,
    range: "2016 — 2019",
    name: "다시 세우다",
    en: "REBUILDING",
    color: "#35d0ba",
    years: [
      {
        year: 2016,
        world: ["알파고 vs 이세돌, 세기의 대국", "경주 규모 5.8 지진", "리우올림픽 양궁 전 종목 석권"],
        title: "질병관리본부,\n차관급 격상",
        sub: "긴급상황센터 신설 · 24시간 긴급상황실 가동",
      },
      {
        year: 2017,
        world: ["제19대 대통령 선거", "포항 지진, 수능 일주일 연기", "방탄소년단, 빌보드 뮤직 어워드 첫 수상"],
        title: "방역 컨트롤타워,\n새로운 리더십",
        sub: "첫 여성 질병관리본부장 취임",
      },
      {
        year: 2018,
        world: ["평창 동계올림픽 개최", "판문점 남북정상회담", "방탄소년단, 빌보드 200 1위"],
        title: "3년 만의 메르스 유입,\n추가 감염 0명",
        sub: "달라진 대응, 달라진 결과",
        stat: { value: 38, unit: "일", label: "만에 상황 종료 · 추가 감염 0명" },
      },
      {
        year: 2019,
        dur: 360,
        world: ["‘기생충’ 칸 황금종려상", "세계 최초 5G 상용화", "U-20 월드컵 준우승"],
        title: "A형간염 유행 원인\n‘조개젓’ 규명",
        sub: "12월 31일, 중국 우한 원인 불명 폐렴 발표 — 긴 싸움의 전야",
      },
    ],
  },
  {
    no: 4,
    range: "2020 — 2026",
    name: "질병관리청, 국민 곁으로",
    en: "KDCA, CLOSER TO THE PEOPLE",
    color: "#4f8cff",
    years: [
      {
        year: 2020,
        dur: 420,
        world: ["코로나19, 일상이 멈추다", "‘기생충’ 아카데미 4관왕", "방탄소년단, 빌보드 핫 100 1위"],
        title: "코로나19,\n누구도 가 보지 않은 길",
        sub: "1월 20일 국내 첫 환자 확인",
        extra: { at: 225, big: "질병관리청 출범", small: "2020. 9. 12.  본부에서 청으로" },
      },
      {
        year: 2021,
        world: ["‘오징어 게임’ 전 세계 1위", "누리호 첫 발사", "도쿄올림픽"],
        title: "코로나19\n예방접종 시작",
        sub: "2월 26일 첫 접종",
        stat: { value: 70, unit: "%", label: "8개월 만에 전 국민 접종 완료율" },
      },
      {
        year: 2022,
        world: ["누리호 발사 성공", "카타르 월드컵 16강", "‘이상한 변호사 우영우’ 신드롬"],
        title: "사회적 거리두기\n전면 해제",
        sub: "일상 회복 · 엠폭스 대응",
        stat: { value: 757, unit: "일", label: "만의 거리두기 해제" },
      },
      {
        year: 2023,
        world: ["챗GPT 열풍, 생성형 AI 시대", "누리호 3차 발사 성공", "항저우 아시안게임"],
        title: "코로나19 위기경보\n‘심각’ → ‘경계’",
        sub: "6월 1일 하향 · 8월 31일 4급 감염병 전환",
      },
      {
        year: 2024,
        world: ["한강, 노벨문학상 수상", "파리올림픽 금메달 13개", "프로야구 첫 천만 관중"],
        title: "코로나19 위기경보\n‘경계’ → ‘관심’",
        sub: "5월 1일 하향 · 첫 환자 이후 4년 3개월 만에 가장 낮은 단계",
      },
      {
        year: 2025,
        dur: 330,
        world: ["제21대 대통령 선거", "경주 APEC 정상회의", "‘케이팝 데몬 헌터스’ 세계적 인기"],
        title: "WHO 합동외부평가\n52개 지표 만점",
        sub: "56개 지표 중 52개 · 질병관리청 출범 5주년",
      },
      {
        year: 2026,
        world: ["밀라노·코르티나 동계올림픽", "북중미 월드컵", "AI 에이전트, 일상 속으로"],
        title: "AI·데이터로 여는\n질병관리",
        sub: "AI 전담조직 신설 · 남자 청소년 HPV 무료접종",
      },
    ],
  },
];

export const OPENING = 770; // 뉴스 플래시(0~240) + 제목(240~540) + 워크샵 컨셉(540~770)
export const ACT_CARD = 90;
export const YEAR_DUR = 270;
export const OUTRO = 1200;

export type Seg =
  | { kind: "act"; act: Act; from: number; dur: number }
  | { kind: "year"; act: Act; item: YearItem; from: number; dur: number };

export const SEGS: Seg[] = [];
{
  let t = OPENING;
  for (const act of ACTS) {
    SEGS.push({ kind: "act", act, from: t, dur: ACT_CARD });
    t += ACT_CARD;
    for (const item of act.years) {
      const dur = item.dur ?? YEAR_DUR;
      SEGS.push({ kind: "year", act, item, from: t, dur });
      t += dur;
    }
  }
}
export const OUTRO_FROM = SEGS[SEGS.length - 1].from + SEGS[SEGS.length - 1].dur;
export const TOTAL = OUTRO_FROM + OUTRO;
export const YEAR_SEGS = SEGS.filter((s) => s.kind === "year") as Extract<Seg, { kind: "year" }>[];
export const actFrom = (no: number) => SEGS.find((s) => s.kind === "act" && s.act.no === no)!.from;
