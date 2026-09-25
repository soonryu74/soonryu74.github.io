// 국가동물보호정보시스템 동물장묘업 목록 → src/content/funeral-businesses.json
//   npm run import:funeral
// 원문 안내: "편의를 제공하기 위한 목적이며 실제 영업허가, 등록내용과 일부 차이가 있을 수 있음"
import { writeFileSync } from "node:fs";
import path from "node:path";
import { parseFuneralList } from "../src/lib/funeral/parse";

const URL = "https://www.animal.go.kr/front/awtis/shop/undertaker1List.do?menuNo=5000000023&pageSize=500";

async function main() {
  const res = await fetch(URL, { headers: { "User-Agent": "Mozilla/5.0 (petsafe365 data sync)" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  const total = Number(html.match(/전체\s*<[^>]*>\s*([0-9,]+)/)?.[1]?.replace(/,/g, "") ?? html.match(/전체[^0-9]{0,40}([0-9]+)[^0-9]{0,20}건/)?.[1] ?? NaN);
  const items = parseFuneralList(html);
  if (items.length === 0) throw new Error("파싱 결과 0건 — 원문 구조가 바뀌었는지 확인하세요.");
  if (Number.isFinite(total) && total !== items.length) console.warn(`경고: 원문 전체 ${total}건, 파싱 ${items.length}건`);
  const out = {
    source: "농림축산검역본부 국가동물보호정보시스템 반려동물 영업자 정보(동물장묘업)",
    sourceUrl: "https://www.animal.go.kr/front/awtis/shop/undertaker1List.do?menuNo=5000000023",
    license: "공공데이터포털 15121110 반려동물 영업장 정보: 이용허락범위 제한 없음",
    notice: "편의를 위한 정보로 실제 영업허가·등록 내용과 일부 차이가 있을 수 있습니다. 정확한 정보는 관할 지자체 담당부서에 확인하세요.",
    fetchedAt: new Date().toISOString(),
    total: Number.isFinite(total) ? total : items.length,
    items,
  };
  const file = path.resolve(__dirname, "../src/content/funeral-businesses.json");
  writeFileSync(file, JSON.stringify(out, null, 2) + "\n");
  console.log(`wrote ${items.length} businesses → ${file}`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
