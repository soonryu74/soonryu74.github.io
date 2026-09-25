// 예시 구조동물 공고. 실제 동물·보호소가 아니다(키가 없을 때 화면 구조 확인용).
// 날짜는 호출 시점 기준 상대값으로 만든다.
export function rescueFixture(today: string): Record<string, string>[] {
  const d = (offset: number) => {
    const t = new Date(`${today}T00:00:00Z`);
    t.setUTCDate(t.getUTCDate() + offset);
    return t.toISOString().slice(0, 10).replace(/-/g, "");
  };
  const base = { careNm: "예시 동물보호센터", careAddr: "서울특별시 예시구 예시로 1 (예시 데이터)", orgNm: "서울특별시 예시구", processState: "보호중" };
  return [
    { ...base, desertionNo: "EX-R-001", upKindCd: "417000", upKindNm: "개", kindNm: "믹스견", colorCd: "갈색", age: "2024(년생)", weight: "6(Kg)", sexCd: "M", neuterYn: "U", happenDt: d(-1), happenPlace: "예시동 공원 입구", noticeNo: "예시-2026-001", noticeSdt: d(-1), noticeEdt: d(9), specialMark: "빨간 목줄, 사람을 잘 따름", careTel: "02-000-0101" },
    { ...base, desertionNo: "EX-R-002", upKindCd: "422400", upKindNm: "고양이", kindNm: "코리안 숏헤어", colorCd: "치즈", age: "2023(년생)", weight: "4(Kg)", sexCd: "F", neuterYn: "Y", happenDt: d(-3), happenPlace: "예시아파트 주차장", noticeNo: "예시-2026-002", noticeSdt: d(-3), noticeEdt: d(7), specialMark: "왼쪽 귀 끝 컷팅", careTel: "02-000-0102" },
    { ...base, desertionNo: "EX-R-003", upKindCd: "417000", upKindNm: "개", kindNm: "말티즈", colorCd: "흰색", age: "2019(년생)", weight: "3.2(Kg)", sexCd: "F", neuterYn: "N", happenDt: d(-8), happenPlace: "예시시장 앞", noticeNo: "예시-2026-003", noticeSdt: d(-8), noticeEdt: d(1), specialMark: "노령, 분홍 옷 착용", careTel: "02-000-0103" },
    { ...base, desertionNo: "EX-R-004", upKindCd: "417000", upKindNm: "개", kindNm: "진도견", colorCd: "흰색", age: "2022(년생)", weight: "15(Kg)", sexCd: "M", neuterYn: "U", happenDt: d(-12), happenPlace: "예시산 등산로", noticeNo: "예시-2026-004", noticeSdt: d(-12), noticeEdt: d(-2), specialMark: "경계심 많음", careTel: "02-000-0104", processState: "보호중" },
    { ...base, desertionNo: "EX-R-005", upKindCd: "422400", upKindNm: "고양이", kindNm: "러시안 블루", colorCd: "회색", age: "2021(년생)", weight: "5(Kg)", sexCd: "M", neuterYn: "Y", happenDt: d(0), happenPlace: "예시동 빌라 계단", noticeNo: "예시-2026-005", noticeSdt: d(0), noticeEdt: d(10), specialMark: "파란 방울 목걸이", careTel: "02-000-0105", orgNm: "경기도 예시시", careNm: "예시시 동물보호센터", careAddr: "경기도 예시시 예시로 2 (예시 데이터)" },
    { ...base, desertionNo: "EX-R-006", upKindCd: "429900", upKindNm: "기타축종", kindNm: "토끼", colorCd: "흰색/검정", age: "2025(년생)", weight: "1.5(Kg)", sexCd: "Q", neuterYn: "U", happenDt: d(-2), happenPlace: "예시초등학교 화단", noticeNo: "예시-2026-006", noticeSdt: d(-2), noticeEdt: d(8), specialMark: "순함", careTel: "02-000-0106" },
  ];
}
