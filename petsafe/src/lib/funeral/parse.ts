// 국가동물보호정보시스템 '반려동물 영업자 정보 – 동물장묘업' 목록 HTML 파싱.
// 원문: https://www.animal.go.kr/front/awtis/shop/undertaker1List.do (2026-09-25 구조 확인)
export type FuneralBusiness = {
  no: number;
  facilities: string[];   // 장례, 화장, 봉안, 건조, 수분해
  name: string;
  phone: string | null;
  address: string;
  homepage: string | null;
  sido: string;
};

const clean = (s: string) => s.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

const SIDO_RULES: [RegExp, string][] = [
  [/^서울/, "서울특별시"], [/^부산/, "부산광역시"], [/^대구/, "대구광역시"], [/^인천/, "인천광역시"],
  [/^대전/, "대전광역시"], [/^울산/, "울산광역시"], [/^세종/, "세종특별자치시"], [/^경기/, "경기도"],
  [/^강원/, "강원특별자치도"], [/^충(청)?북/, "충청북도"], [/^충(청)?남/, "충청남도"], [/^전(라)?북|^전북/, "전북특별자치도"],
  [/^전남광주|^광주/, "전남광주통합특별시"], [/^전(라)?남/, "전남광주통합특별시"],
  [/^경(상)?북/, "경상북도"], [/^경(상)?남/, "경상남도"], [/^제주/, "제주특별자치도"],
];

// 주소가 시·도 없이 시로 시작하는 경우(예: "안산시 상록구")를 위한 경기도 시 목록
const GYEONGGI_CITIES = /^(수원|성남|의정부|안양|부천|광명|평택|동두천|안산|고양|과천|구리|남양주|오산|시흥|군포|의왕|하남|용인|파주|이천|안성|김포|화성|광주시|양주|포천|여주|연천|가평|양평)/;

export function sidoOf(address: string): string {
  for (const [re, name] of SIDO_RULES) if (re.test(address)) return name;
  if (GYEONGGI_CITIES.test(address)) return "경기도";
  return "주소 확인 필요";
}

function cell(row: string, title: string): string {
  const m = row.match(new RegExp(`data-title="${title}"[^>]*>([\\s\\S]*?)</t[dh]>`));
  return m ? m[1] : "";
}

export function parseFuneralList(html: string): FuneralBusiness[] {
  const rows = html.match(/<tr>[\s\S]*?<\/tr>/g) ?? [];
  const out: FuneralBusiness[] = [];
  for (const row of rows) {
    const name = clean(cell(row, "업체명"));
    if (!name) continue;
    const phone = clean(cell(row, "전화번호"));
    const address = clean(cell(row, "소재지"));
    const hpRaw = cell(row, "홈페이지").match(/href="(https?:\/\/[^"]+)"/);
    out.push({
      no: Number(clean(cell(row, "번호"))) || 0,
      facilities: clean(cell(row, "취급업종")).split(/[,/]/).map((s) => s.trim()).filter(Boolean),
      name,
      phone: /^[0-9-]{4,20}$/.test(phone) ? phone : null,
      address,
      homepage: hpRaw ? hpRaw[1] : null,
      sido: sidoOf(address),
    });
  }
  return out;
}

/** 업체명 비교용: 공백·(주)·㈜·괄호 제거 */
export function normalizeName(s: string): string {
  return s.replace(/\(주\)|㈜|주식회사|\s|[()·.-]/g, "").toLowerCase();
}

export function findByName(list: FuneralBusiness[], q: string): FuneralBusiness[] {
  const n = normalizeName(q);
  if (!n) return [];
  return list.filter((b) => normalizeName(b.name).includes(n) || n.includes(normalizeName(b.name)));
}
