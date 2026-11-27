// 초기 데이터. 예시 모드의 기본값이자 `npm run seed` 로 Supabase 에 넣는 원본이다.
// 업체·상품·시험 결과는 모두 예시이며 실제처럼 보이지 않게 이름에 "예시"를 붙인다.
import type {
  CareTaskTemplate, ContentBody, ContentCard, ContentVersion, Facility, FeatureFlag, FeatureFlagKey,
  LegalDocument, OfficialContact, Product, ProductLot,
} from "../types";

const T0 = "2026-11-26T00:00:00.000Z";
const uid = (group: number, n: number) => `00000000-0000-4000-8${String(group).padStart(3, "0")}-${String(n).padStart(12, "0")}`;
const base = (group: number, n: number) => ({ id: uid(group, n), created_at: T0, updated_at: T0 });

const tpl = (n: number, t: Omit<CareTaskTemplate, "id" | "created_at" | "updated_at" | "version" | "reviewed_at" | "status" | "source_name" | "source_url"> & { source_name?: string; source_url?: string }): CareTaskTemplate => ({
  ...base(1, n), version: 1, reviewed_at: null, status: "approved", source_name: t.source_name ?? null, source_url: t.source_url ?? null, ...t,
});

export const careTaskTemplates: CareTaskTemplate[] = [
  tpl(1, { species: "dog", life_stage: "all", category: "법정 의무", title: "동물등록 여부 확인하기", priority_class: "legal", rule_json: { registration_status: ["unregistered", "unknown"] }, repeat_rule: "none", source_name: "찾기쉬운 생활법령정보", source_url: "https://easylaw.go.kr/CSP/CnpClsMain.laf?ccfNo=2&cciNo=2&cnpClsNo=1&csmSeq=1809&popMenu=ov" }),
  tpl(2, { species: "dog", life_stage: "all", category: "법정 의무", title: "외출 전 인식표·목줄·배변봉투 챙기기", priority_class: "legal", rule_json: {}, repeat_rule: "daily", source_name: "찾기쉬운 생활법령정보", source_url: "https://easylaw.go.kr/CSP/CnpClsMain.laf?ccfNo=2&cciNo=2&cnpClsNo=1&csmSeq=1809&popMenu=ov" }),
  tpl(3, { species: "all", life_stage: "all", category: "안전", title: "장난감·씹는 물건 상태 점검하기", priority_class: "safety", rule_json: {}, repeat_rule: "weekly" }),
  tpl(4, { species: "cat", life_stage: "all", category: "안전", title: "집안 위험물 점검하기 (끈·실·사람 약·백합류)", priority_class: "safety", rule_json: {}, repeat_rule: "weekly" }),
  tpl(5, { species: "all", life_stage: "all", category: "건강", title: "식욕·음수·배변 살펴보기", priority_class: "life", rule_json: {}, repeat_rule: "daily" }),
  tpl(6, { species: "all", life_stage: "all", category: "건강", title: "체중 재고 기록하기", priority_class: "lifecycle", rule_json: {}, repeat_rule: "monthly" }),
  tpl(7, { species: "all", life_stage: "all", category: "생활", title: "물그릇 씻고 새 물 주기", priority_class: "life", rule_json: {}, repeat_rule: "daily" }),
  tpl(8, { species: "cat", life_stage: "all", category: "생활", title: "화장실 청소하기", priority_class: "life", rule_json: {}, repeat_rule: "daily" }),
  tpl(9, { species: "all", life_stage: "all", category: "보험", title: "보험 갱신일과 약관 버전 확인하기", priority_class: "lifecycle", rule_json: { insurance_status: ["insured"] }, repeat_rule: "monthly" }),
];

const contact = (n: number, c: Omit<OfficialContact, "id" | "created_at" | "updated_at" | "verified_at" | "valid_from" | "valid_to" | "coverage_area"> & { coverage_area?: string }): OfficialContact => ({
  ...base(2, n), verified_at: null, valid_from: null, valid_to: null, coverage_area: c.coverage_area ?? "전국", ...c,
});

// 번호와 링크는 인수인계서 11장 기준이다. verified_at 이 비어 있으면 화면에 "운영자 확인 전"으로 표시된다.
export const officialContacts: OfficialContact[] = [
  contact(1, { category: "lost_found", organization: "국가동물보호정보시스템 (유실·유기 동물 신고)", phone: "1577-0954", url: "https://www.animal.go.kr", available_hours: null, source_url: "https://www.animal.go.kr", status: "active" }),
  contact(2, { category: "lost_mine", organization: "국가동물보호정보시스템 (분실 신고·등록정보 변경)", phone: "1577-0954", url: "https://www.animal.go.kr", available_hours: null, source_url: "https://www.animal.go.kr", status: "active" }),
  contact(3, { category: "abuse", organization: "경찰 (진행 중인 학대·생명 위험)", phone: "112", url: null, available_hours: "24시간", source_url: null, status: "active" }),
  contact(4, { category: "abuse", organization: "관할 시·군·구청 동물보호 담당", phone: null, url: "https://www.animal.go.kr", available_hours: null, source_url: "https://www.animal.go.kr", status: "active" }),
  contact(5, { category: "illegal_practice", organization: "대한수의사회 신고 채널", phone: null, url: null, available_hours: null, source_url: null, status: "pending" }),
  contact(6, { category: "consumer", organization: "1372 소비자상담센터", phone: "1372", url: "https://www.1372.go.kr", available_hours: null, source_url: "https://www.1372.go.kr", status: "active" }),
];

const KDCA = { org: "질병관리청 감염병포털", url: "https://dportal.kdca.go.kr/pot/ii/sttyInftnsds/sttyInftnsds.do" };
const QIA = { org: "농림축산검역본부", url: "https://www.qia.go.kr" };

const zoonoses: { slug: string; species: ContentCard["species"]; body: ContentBody }[] = [
  {
    slug: "sfts", species: "all",
    body: {
      title: "중증열성혈소판감소증후군 (SFTS)",
      summary: "주로 참진드기에 물려 옮는 감염병입니다. 감염된 동물의 체액을 통해 사람에게 옮은 사례도 보고되어 있습니다.",
      animal_signs: ["갑자기 기운이 없고 잘 먹지 않음", "열이 나는 것 같음", "산책·야외활동 뒤 몸에 진드기가 붙어 있음"],
      human_signs: ["야외활동이나 진드기 물림 뒤 2주 안의 고열", "구토·설사 같은 소화기 증상", "심한 피로감"],
      transmission: ["풀숲의 참진드기에 물림", "감염된 동물이나 사람의 혈액·체액 접촉"],
      prevention: ["산책 뒤 귀·목·발가락 사이를 살펴 진드기 확인하기", "진드기 예방은 담당 수의사와 상의하기", "풀숲에서는 긴 옷 입고 돗자리 사용하기", "아픈 동물을 돌볼 때 장갑 끼고 손 씻기"],
      human_see_doctor: ["진드기에 물렸거나 야외활동 뒤 열이 나면 의료기관에 가서 야외활동과 동물 접촉 사실을 알리기"],
      animal_see_vet: ["진드기가 붙어 있거나 야외활동 뒤 기운이 없고 열이 의심되면 동물병원에 전화하기"],
      do_not: ["진드기를 맨손으로 터뜨리거나 비틀어 떼지 않기", "아픈 동물의 침·혈액을 맨손으로 만지지 않기"],
    },
  },
  {
    slug: "rabies", species: "all",
    body: {
      title: "공수병 (동물의 광견병)",
      summary: "감염된 동물에게 물리거나 할퀴어 옮는 감염병입니다. 사람에게 생기면 공수병, 동물에게 생기면 광견병이라고 부릅니다.",
      animal_signs: ["평소와 다른 공격성 또는 지나친 불안", "침을 많이 흘림", "물이나 음식을 삼키기 어려워함"],
      human_signs: ["물린 부위의 이상 감각", "발열, 두통", "물을 삼키기 어려움"],
      transmission: ["감염된 동물(너구리 등 야생동물 포함)에게 물리거나 할퀴임", "감염된 동물의 침이 상처나 점막에 닿음"],
      prevention: ["반려동물 광견병 예방접종 일정은 동물병원과 지자체 안내에 따르기", "산책 때 야생동물과 접촉하지 않게 하기", "모르는 동물을 함부로 만지지 않기"],
      human_see_doctor: ["동물에게 물리면 상처를 비누와 흐르는 물로 충분히 씻고 바로 의료기관에 가기"],
      animal_see_vet: ["야생동물에게 물렸거나 싸운 흔적이 있으면 동물병원에 전화하기"],
      do_not: ["물린 상처를 그냥 두지 않기", "이상 행동을 보이는 야생동물에 다가가지 않기"],
    },
  },
  {
    slug: "canine-brucellosis", species: "dog",
    body: {
      title: "개 브루셀라증",
      summary: "개의 번식과 관련된 분비물을 통해 옮는 세균 감염병입니다. 드물게 사람에게도 옮을 수 있습니다.",
      animal_signs: ["임신 후반의 유산", "생식기 분비물이나 부기", "뚜렷한 증상이 없는 경우도 있음"],
      human_signs: ["오르내리는 열", "피로감, 관절통"],
      transmission: ["감염된 개의 유산 태아·태반·분비물 접촉", "교배"],
      prevention: ["입양·교배 전 검사 여부를 동물병원과 상의하기", "출산·유산 뒤처리는 장갑을 끼고 하고 손 씻기"],
      human_see_doctor: ["유산한 개를 돌본 뒤 열이 계속되면 의료기관에 가서 동물 접촉 사실을 알리기"],
      animal_see_vet: ["유산했거나 생식기에 이상이 보이면 동물병원에 전화하기"],
      do_not: ["유산 태아나 분비물을 맨손으로 만지지 않기"],
    },
  },
  {
    slug: "toxoplasmosis", species: "cat",
    body: {
      title: "톡소포자충증",
      summary: "기생충 감염병입니다. 사람은 덜 익힌 고기나 오염된 흙·고양이 분변을 통해 감염될 수 있습니다. 임신부와 면역이 약한 사람은 특히 주의가 필요합니다.",
      animal_signs: ["대부분 증상이 없음", "드물게 기운 없음, 식욕 저하"],
      human_signs: ["대부분 증상이 없거나 가벼운 몸살 증상", "임신 중 감염은 태아에게 영향을 줄 수 있음"],
      transmission: ["덜 익힌 고기 섭취", "오염된 흙이나 고양이 분변을 만진 손이 입에 닿음"],
      prevention: ["고양이 화장실은 매일 치우고 치운 뒤 손 씻기", "임신부는 가능하면 화장실 청소를 다른 가족에게 맡기거나 장갑 끼기", "고기는 충분히 익혀 먹기", "고양이에게 날고기를 주지 않기"],
      human_see_doctor: ["임신 중이거나 면역이 약한데 감염이 걱정되면 의료기관에 상담하기"],
      animal_see_vet: ["고양이가 오래 기운이 없고 먹지 않으면 동물병원에 전화하기"],
      do_not: ["감염이 걱정된다는 이유로 고양이를 유기하지 않기"],
    },
  },
];

export const contentCards: ContentCard[] = zoonoses.map((z, i) => ({
  ...base(3, i + 1), slug: z.slug, content_type: "zoonosis", species: z.species, current_version_id: uid(4, i + 1), status: "in_review",
}));

// 초기 글은 검수자가 승인하기 전이라 in_review 로 넣는다. 승인 전에는 실제 서비스에서 공개되지 않는다.
export const contentVersions: ContentVersion[] = zoonoses.map((z, i) => ({
  ...base(4, i + 1), content_id: uid(3, i + 1), version: 1, body_json: z.body, source_json: [KDCA, QIA],
  author_id: null, reviewer_id: null, reviewer_credential: null, reviewed_at: null, expires_at: null,
  change_reason: "초기 초안", status: "in_review",
}));

const DRAFT_NOTE = "이 문서는 운영 초안입니다. 사업자 정보와 실제 데이터 처리 구조를 확정하고 법률 검토를 마친 뒤 확정본으로 교체합니다.\n\n";
const legal = (n: number, document_type: LegalDocument["document_type"], body: string): LegalDocument => ({
  ...base(5, n), document_type, version: "0.1-draft", effective_at: T0, body: DRAFT_NOTE + body, status: "published",
});

export const legalDocuments: LegalDocument[] = [
  legal(1, "terms", "1. 펫안심365는 반려동물 돌봄 기록과 안전 정보를 제공하는 서비스입니다.\n2. 서비스는 수의학적 진단, 처방, 치료 결정을 제공하지 않습니다. 위급하면 동물병원에 바로 연락하세요.\n3. 보험 기능은 약관 이해와 청구 준비를 돕는 도구이며 가입 권유나 지급 결정을 하지 않습니다.\n4. 안전·신고·법정 정보는 무료로 제공합니다.\n5. 회원은 언제든 탈퇴할 수 있고 탈퇴하면 저장한 정보가 삭제됩니다."),
  legal(2, "privacy", "1. 수집 항목: 이메일, 반려동물 정보, 보호자가 입력한 일정·기록·문서.\n2. 주민등록번호와 사람의 진단 정보는 수집하지 않습니다.\n3. 건강 기록, 보험 문서, 위치, 신고 내용은 광고 대상 선정에 쓰지 않습니다.\n4. 문서 파일은 비공개 저장소에 보관하고 본인만 짧은 시간 열람 링크로 엽니다.\n5. 탈퇴하면 계정과 연결된 정보를 삭제합니다.\n6. 개인정보 보호책임자와 처리 위탁 업체는 사업자 정보 확정 뒤 기재합니다."),
  legal(3, "location", "1. 위치 권한은 '내 주변 찾기'를 눌렀을 때만 요청합니다.\n2. 정밀 위치는 계정에 저장하지 않습니다.\n3. 위치 권한 없이도 주소나 지역 이름으로 검색할 수 있습니다."),
  legal(4, "copyright", "1. 검색 포털의 리뷰·사진·장소 정보를 복제하지 않습니다.\n2. 공공데이터와 직접 제공받은 자료, 라이선스를 확인한 자료만 사용합니다.\n3. 사진을 올릴 때는 본인에게 권리가 있고 타인의 얼굴·개인정보가 드러나지 않는지 확인해 주세요.\n4. 권리 침해 신고 창구는 고객센터 정보 확정 뒤 기재합니다."),
  legal(5, "refund", "1. 현재 앱 안 결제는 준비 중입니다.\n2. 결제가 열리면 상품을 받은 날부터 7일 안에 청약철회를 할 수 있습니다.\n3. 교환·반품 절차와 배송비 부담 기준은 결제 기능 공개 전에 확정해 게시합니다."),
  legal(6, "ads", "1. 모든 광고와 유료 제휴에는 '광고' 또는 '유료 제휴'를 표시합니다.\n2. 긴급 도움, 신고, 감염병, 보험 화면에는 광고를 싣지 않습니다.\n3. 지도 검색 순위는 판매하지 않습니다.\n4. 진단·치료 효능을 내세우는 광고와 보험 가입 권유 광고는 받지 않습니다."),
];

const FLAG_KEYS: FeatureFlagKey[] = ["paymentsEnabled", "partnerSubscriptionsEnabled", "insuranceReferralEnabled", "preciseLocationStorageEnabled", "publicReviewsEnabled", "adsEnabled"];
export const featureFlags: FeatureFlag[] = FLAG_KEYS.map((key, i) => ({ ...base(6, i + 1), key, enabled: false, approved_by: null, approved_at: null }));

type Catalog = [sku: string, name: string, material: Product["material"], summary: string];
// 공급사(Blue Sapphire Merchant) 카탈로그의 20종. 사진은 카탈로그 사진이고, 입고 전이라 크기·시험 결과는 비어 있다.
// 앞의 6종은 사업계획 메모의 우선 심사 상품이다.
const CATALOG: Catalog[] = [
  ["NLT_0012", "가죽 본", "leather", "가장 단순한 뼈 모양. 가져오기 놀이의 기본"],
  ["NLT_0039", "가죽 사자", "leather", "노란 갈기가 폭신한 사자 얼굴"],
  ["NLT_0042", "가죽 물고기", "leather", "지느러미를 물고 당기기 좋은 물고기"],
  ["WLF_0021", "울 리프", "wool_felt", "겹겹이 포갠 울 펠트 나뭇잎"],
  ["WLF_0024", "울 딸기", "wool_felt", "선물하기 좋은 빨간 딸기"],
  ["WLF_0029", "울 본 그린", "wool_felt", "입이 작은 아이도 물기 편한 초록 뼈"],
  ["NLT_0006", "가죽 부츠", "leather", "끈 장식이 달린 작은 부츠"],
  ["NLT_0021", "가죽 스타 로프", "leather", "로프 고리 안에 든 별"],
  ["NLT_0023", "가죽 본 로프", "leather", "로프 손잡이가 달린 뼈"],
  ["NLT_0028", "가죽 젖소", "leather", "길쭉한 몸의 젖소"],
  ["NLT_0029", "가죽 악어", "leather", "점박이 무늬 악어"],
  ["NLT_0040", "가죽 코끼리", "leather", "로프 꼬리가 달린 코끼리"],
  ["NLT_0050", "가죽 여우", "leather", "로프 다리가 달린 여우"],
  ["NLT_0051", "가죽 거북이", "leather", "알록달록한 등껍질 거북이"],
  ["NLT_0058", "가죽 기린", "leather", "초록 점무늬 기린"],
  ["NLT_0068", "가죽 하마", "leather", "로프 팔다리가 달린 하마"],
  ["NLT_0070", "가죽 말", "leather", "파란 가죽 말"],
  ["WLF_0009", "울 코끼리", "wool_felt", "눈을 감은 회색 코끼리"],
  ["WLF_0017", "울 진저브레드", "wool_felt", "쿠키 모양 울 펠트 친구"],
  ["WLF_0028", "울 본 핑크", "wool_felt", "입이 작은 아이도 물기 편한 분홍 뼈"],
];
const NOT_FOR = ["강하게 물어뜯는 아이", "조각을 삼키는 습관이 있는 아이", "혼자 오래 씹게 두는 용도"];
const DESC: Record<Product["material"], string> = {
  leather: "손으로 꿰맨 가죽 놀이 친구예요. 보호자와 함께 가져오기·가벼운 터그 놀이에 써요. 먹는 제품이 아니에요. 실밥이나 조각이 떨어지면 바로 회수해 주세요.",
  wool_felt: "울 펠트로 만든 부드러운 놀이 친구예요. 가벼운 물기 놀이에 써요. 먹는 제품이 아니에요. 보풀이나 조각이 떨어지면 바로 회수해 주세요.",
  set: "가죽 하나와 울 펠트 하나를 번갈아 주는 세트예요. 놀이 카드가 함께 들어 있어요. 먹는 제품이 아니에요.",
};
const slugOf = (sku: string) => sku.toLowerCase().replace("_", "-");

export const products: Product[] = [
  ...CATALOG.map(([sku, name, material, summary], i): Product => ({
    ...base(7, i + 10), slug: slugOf(sku), sku: `BSM_${sku}`, image_url: `/products/${slugOf(sku)}.jpg`, name, material, summary,
    description: DESC[material], price_krw: 15900, shipping_included: false, size_cm: "입고 후 실측", min_mouth: "small", not_for: NOT_FOR,
    origin_country: "인도", importer: null, external_url: null, status: "on_sale", is_example: false,
  })),
  {
    ...base(7, 3), slug: "leather-wool-set", sku: null, image_url: null, name: "가죽 + 울 2개 세트", material: "set", summary: "가죽 하나, 울 하나. 번갈아 노는 2개 세트",
    description: DESC.set, price_krw: 29800, shipping_included: true, size_cm: "입고 후 실측", min_mouth: "small", not_for: NOT_FOR,
    origin_country: "인도", importer: null, external_url: null, status: "on_sale", is_example: false,
  },
];

// 시험 전이므로 모든 로트는 "대기" 상태다. 결과가 나오기 전에는 통과 표시를 하지 않는다.
export const productLots: ProductLot[] = products.map((p, i) => ({
  ...base(8, i + 10), product_id: p.id, lot_code: `PRE-${String(i + 1).padStart(2, "0")}`, tested_at: null, lab_name: null, results_json: [], report_document_url: null, status: "pending",
}));

const facility = (n: number, facility_type: string, name: string): Facility => ({
  ...base(9, n), facility_type, name, address: "예시 주소 (실제 장소가 아닙니다)", lat: null, lng: null, phone: null,
  business_status: "unknown", hours_status: "unverified", emergency_status: "unverified", pet_access_json: {},
  source_system: "example", source_id: String(n), source_updated_at: null, is_example: true,
});

export const facilities: Facility[] = [
  facility(1, "animal_hospital", "[예시] 동물병원 가"),
  facility(2, "animal_pharmacy", "[예시] 동물약국 나"),
  facility(3, "shelter", "[예시] 동물보호센터 다"),
  facility(4, "pet_cafe", "[예시] 동반 카페 라"),
  facility(5, "park", "[예시] 공원 마"),
];

export const seedTables = {
  care_task_templates: careTaskTemplates,
  official_contacts: officialContacts,
  content_cards: contentCards,
  content_versions: contentVersions,
  legal_documents: legalDocuments,
  feature_flags: featureFlags,
  products,
  product_lots: productLots,
  facilities,
};
