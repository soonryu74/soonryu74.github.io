// 인수공통감염병 초기 콘텐츠 4종. 상태는 in_review(검수 대기)로 시드된다.
// 검수자·검토일이 기록되고 approved/published 로 바뀌기 전에는 공개되지 않는다.
export type ZoonosisBody = {
  animalSigns: string[];
  humanSigns: string[];
  transmission: string[];
  prevention: string[];
  humanSeekCare: string[];
  animalSeekVet: string[];
  dont: string[];
};

export type ZoonosisContent = {
  slug: string;
  title: string;
  summary: string;
  species: ("dog" | "cat" | "human")[];
  body: ZoonosisBody;
  sources: { organization: string; url: string; checkedAt: string }[];
  authorName: string;
  version: number;
  changeReason: string;
};

const KDCA = { organization: "질병관리청 감염병포털", url: "https://dportal.kdca.go.kr/pot/ii/sttyInftnsds/sttyInftnsds.do", checkedAt: "2026-08-31" };
const APQA = { organization: "농림축산검역본부", url: "https://www.qia.go.kr", checkedAt: "2026-08-31" };

export const ZOONOSES: ZoonosisContent[] = [
  {
    slug: "sfts",
    title: "SFTS (중증열성혈소판감소증후군)",
    summary: "참진드기에 물려 감염되는 바이러스 질환입니다. 산책 후 진드기 확인이 가장 중요한 예방입니다.",
    species: ["dog", "cat", "human"],
    body: {
      animalSigns: ["발열, 식욕 저하, 기력 저하", "구토·설사", "잇몸이 창백하거나 누렇게 보임", "증상이 뚜렷하지 않을 수도 있음"],
      humanSigns: ["진드기 물림 후 보통 1~2주 안에 고열", "구토·설사 등 소화기 증상", "심한 피로감"],
      transmission: ["참진드기에 물려 감염", "감염된 동물의 혈액·체액에 맨손으로 닿은 사람에게 전파된 사례가 보고됨"],
      prevention: ["풀숲·산길 산책 뒤 귀 뒤·겨드랑이·발가락 사이 확인", "진드기 예방제는 동물병원과 상담해 선택", "사람은 긴 옷·기피제 사용, 귀가 후 샤워", "아픈 동물을 돌볼 때 장갑 착용"],
      humanSeekCare: ["진드기에 물린 뒤 2주 안에 고열·소화기 증상이 생기면 의료기관 방문", "진료 시 반려동물·야외활동 이력을 알리기"],
      animalSeekVet: ["야외활동 뒤 발열·기력 저하·식욕 저하가 이어질 때", "몸에 붙은 진드기를 발견했을 때(제거는 동물병원에 문의)"],
      dont: ["진드기를 손으로 눌러 터뜨리기", "아픈 동물의 침·혈액을 맨손으로 만지기", "증상을 두고 보며 기다리기"],
    },
    sources: [KDCA, APQA],
    authorName: "펫안심365 초안 (검수 전)",
    version: 1,
    changeReason: "초기 작성",
  },
  {
    slug: "rabies",
    title: "공수병 (광견병)",
    summary: "감염된 동물에게 물리거나 긁혀 전파됩니다. 반려견 예방접종과 교상 후 즉시 대응이 핵심입니다.",
    species: ["dog", "cat", "human"],
    body: {
      animalSigns: ["평소와 다른 행동(갑작스러운 공격성 또는 이상하게 온순함)", "침을 많이 흘리고 삼키기 어려워함", "비틀거림·마비"],
      humanSigns: ["물린 부위의 이상 감각(저림·가려움)", "발열·두통", "물이나 바람을 무서워하는 증상 등 신경 증상"],
      transmission: ["감염 동물에게 물리거나 긁힘", "감염 동물의 침이 상처·점막에 닿음", "국내는 야생동물(너구리 등) 관리가 계속되고 있어 접경 지역에서 주의"],
      prevention: ["반려견 광견병 예방접종을 정기적으로 실시(법정 예방접종)", "야생동물·모르는 동물 만지지 않기", "해외에서 동물에게 물리지 않도록 주의"],
      humanSeekCare: ["동물에게 물리거나 긁혔다면 흐르는 물과 비누로 15분 이상 씻고 바로 의료기관 방문", "물었던 동물의 종류·상태·접종 여부를 알리기"],
      animalSeekVet: ["야생동물과 접촉하거나 물렸을 때", "예방접종 시기를 놓쳤을 때"],
      dont: ["물린 상처를 씻지 않고 두기", "야생동물을 손으로 잡거나 먹이 주기", "예방접종을 건너뛰기"],
    },
    sources: [KDCA, APQA],
    authorName: "펫안심365 초안 (검수 전)",
    version: 1,
    changeReason: "초기 작성",
  },
  {
    slug: "canine-brucellosis",
    title: "개 브루셀라증",
    summary: "개의 생식기 분비물·유산 물질을 통해 사람에게도 전파될 수 있는 세균 감염입니다. 입양·교배 전 검사가 중요합니다.",
    species: ["dog", "human"],
    body: {
      animalSigns: ["유산·사산, 새끼가 약하게 태어남", "수컷의 고환 붓기·불임", "림프절 붓기", "겉으로는 건강해 보일 수 있음"],
      humanSigns: ["오르내리는 발열", "피로·근육통·관절통", "두통, 식은땀"],
      transmission: ["감염견의 유산 물질·태반·생식기 분비물 접촉", "감염견의 소변·혈액 접촉", "교배를 통한 개 사이 전파"],
      prevention: ["입양·교배 전 검사 결과 확인", "출산·유산 처리 시 장갑 착용, 손 씻기", "번식장·동물병원 종사자는 보호장비 사용"],
      humanSeekCare: ["감염견과 접촉한 뒤 원인 모를 발열·피로가 이어질 때", "진료 시 반려견 접촉 이력을 알리기"],
      animalSeekVet: ["유산·사산이 있었을 때", "고환이 붓거나 교배 전 검사가 필요할 때"],
      dont: ["유산 물질을 맨손으로 치우기", "검사 없이 교배하기"],
    },
    sources: [APQA, KDCA],
    authorName: "펫안심365 초안 (검수 전)",
    version: 1,
    changeReason: "초기 작성",
  },
  {
    slug: "toxoplasmosis",
    title: "톡소포자충증",
    summary: "고양이가 최종숙주인 기생충 감염입니다. 사람은 덜 익힌 고기와 오염된 흙·모래가 주요 경로이며, 화장실 매일 청소로 예방할 수 있습니다.",
    species: ["cat", "human"],
    body: {
      animalSigns: ["대부분 증상이 없음", "드물게 발열·식욕 저하·호흡 이상"],
      humanSigns: ["대부분 증상이 없거나 가벼운 림프절 붓기", "임신 중 처음 감염되면 태아에 영향 가능", "면역이 약한 사람은 심한 증상 가능"],
      transmission: ["감염 고양이 대변의 난포낭(배출 후 1~5일이 지나야 감염력이 생김)으로 오염된 흙·모래·채소", "덜 익힌 고기 섭취(사람 감염의 주요 경로)", "고양이 몸을 만지는 것만으로는 감염되지 않음"],
      prevention: ["화장실은 매일 치우기(난포낭이 감염력을 갖기 전)", "장갑 착용·손 씻기, 임신 중이면 청소를 다른 가족에게 맡기기", "고기는 충분히 익히기, 채소는 잘 씻기", "고양이에게 날고기 급여 피하기, 실내 생활"],
      humanSeekCare: ["임신 중 노출이 걱정될 때 산부인과와 상담", "면역이 약한 상태에서 발열·림프절 붓기가 있을 때"],
      animalSeekVet: ["발열·식욕 저하·호흡 이상이 이어질 때", "날고기 급여 이력이 있고 컨디션이 나쁠 때"],
      dont: ["감염이 걱정된다고 고양이를 버리거나 격리하기", "날고기 급여", "화장실을 며칠씩 방치하기"],
    },
    sources: [KDCA, APQA],
    authorName: "펫안심365 초안 (검수 전)",
    version: 1,
    changeReason: "초기 작성",
  },
];
