/* =========================================================
   친구 부동산 매장 — 데이터 파일 (코드로 관리)
   ⚠️ 【 】 안의 값을 친구 부동산의 '실제 정보'로 바꿔주세요.
   매물을 추가/수정하려면 LISTINGS 배열에 항목을 넣거나 고치면 됩니다.
   (공인중개사법상 광고 명시의무: 사무소 명칭·등록번호·소재지·연락처,
    매물별 소재지·면적·가격·관리비·입주가능일 등 — 아래 필드로 강제)
   ========================================================= */

const AGENCY = {
  name:   "【○○공인중개사사무소】",
  ceo:    "【대표 홍길동】",
  regNo:  "【등록번호 00000-2026-00000】",     // 중개사무소 등록번호 (필수 표기)
  addr:   "【서울시 ○○구 ○○로 00, 1층】",       // 사무소 소재지
  tel:    "【0212345678】",                     // 숫자만 (하이픈 없이) — 전화 버튼용
  telView:"【02-1234-5678】",                   // 화면 표시용
  kakao:  "https://open.kakao.com/【오픈채팅주소】", // 카카오톡 오픈채팅/채널 URL
  hours:  "평일 09:00–18:30 · 토 09:00–15:00",
  slogan: "발품은 저희가, 좋은 집만 골라 드립니다",
  intro:  "우리 동네를 가장 잘 아는 공인중개사입니다. 전세·월세·매매, 어렵게 생각 마시고 편하게 문의 주세요."
};

/* 매물 목록 — 실제 매물로 교체하세요.
   type: "매매" | "전세" | "월세"
   category: "아파트" | "빌라" | "원룸" | "오피스텔" | "상가" | "주택"
   price(만원): 매매가 또는 보증금 / rent(만원): 월세(월세일 때만)
   maintFee(만원): 관리비 / areaM2: 전용면적 / floor·totalFloor / direction / avail: 입주가능일
   lat·lng: 지도 좌표 / photo: 대표 이미지(없으면 "" → 자동 플레이스홀더)
*/
const LISTINGS = [
  { id:1, type:"전세", category:"아파트", title:"햇살 좋은 남향 84㎡, 즉시입주",
    addr:"○○동 ○○아파트", price:35000, rent:0, maintFee:12, areaM2:84, py:25,
    floor:9, totalFloor:15, rooms:3, baths:2, direction:"남향", avail:"즉시입주",
    options:["엘리베이터","주차 2대","신축 인테리어"], lat:37.5556, lng:126.9556,
    photo:"", desc:"채광 좋은 남향 로열층. 지하철 도보 7분, 초등학교 인접. 깨끗한 올수리 세대입니다.",
    regDate:"2026-08-05" },

  { id:2, type:"월세", category:"원룸", title:"역세권 신축 원룸, 풀옵션",
    addr:"○○동 ○○빌", price:1000, rent:55, maintFee:7, areaM2:23, py:7,
    floor:3, totalFloor:5, rooms:1, baths:1, direction:"동향", avail:"2026-09-01",
    options:["풀옵션","에어컨","세탁기","인덕션"], lat:37.5445, lng:126.9515,
    photo:"", desc:"보증금 1000/월 55. 관리비에 수도·인터넷 포함. 사회초년생·직장인에게 추천.",
    regDate:"2026-08-07" },

  { id:3, type:"매매", category:"아파트", title:"학군지 59㎡, 급매 가격조정",
    addr:"○○동 ○○1단지", price:78000, rent:0, maintFee:10, areaM2:59, py:18,
    floor:6, totalFloor:20, rooms:2, baths:1, direction:"남동향", avail:"협의",
    options:["학군 우수","대단지","리모델링"], lat:37.6440, lng:127.0760,
    photo:"", desc:"급매로 나온 실입주 물건. 초·중 도보권, 상권 인접. 대출 상담 가능합니다.",
    regDate:"2026-08-08" },

  { id:4, type:"월세", category:"오피스텔", title:"신축 오피스텔, 반려동물 가능",
    addr:"○○동 ○○시티", price:2000, rent:70, maintFee:9, areaM2:33, py:10,
    floor:12, totalFloor:18, rooms:1, baths:1, direction:"남향", avail:"즉시입주",
    options:["반려동물","빌트인","보안"], lat:37.5430, lng:127.0430,
    photo:"", desc:"보증금 2000/월 70. 반려동물 협의 가능. 조용하고 관리 잘 되는 신축입니다.",
    regDate:"2026-08-06" },

  { id:5, type:"전세", category:"빌라", title:"보증보험 가입 가능 투룸 전세",
    addr:"○○동 ○○하우스", price:19000, rent:0, maintFee:5, areaM2:46, py:14,
    floor:2, totalFloor:4, rooms:2, baths:1, direction:"남서향", avail:"2026-10-01",
    options:["전세보증보험 가능","채광 우수","주차 가능"], lat:37.5560, lng:127.1560,
    photo:"", desc:"전세보증금 반환보증 가입 가능한 안전 매물. 신혼·소가족에게 적합합니다.",
    regDate:"2026-08-04" }
];
