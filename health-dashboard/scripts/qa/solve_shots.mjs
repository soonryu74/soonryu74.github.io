/* /solve 랜딩용 실제 화면 캡처(가짜 목업 없음) — 빌드된 index.html 을 로컬 서버로 띄운 뒤 실행.
   실행: BASE=http://127.0.0.1:8911 node scripts/qa/solve_shots.mjs   → solve/img/*.jpg, solve/og.jpg */
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const PW = process.env.PW || "/opt/node22/lib/node_modules/playwright/index.mjs";
const { chromium } = await import(PW);
const BASE = process.env.BASE || "http://127.0.0.1:8911";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = path.join(ROOT, "solve/img");
mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROME || "/opt/pw-browsers/chromium" });
const go = async (pg, hash, wait = 2500) => { await pg.goto(`${BASE}/index.html#${hash}`, { waitUntil: "load" }); await pg.waitForTimeout(wait); };
const jpg = { type: "jpeg", quality: 78 };

// 1) 우선 검토 카드(영어 모드) — 강릉시
{
  const pg = await b.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1, colorScheme: "light" });
  await go(pg, "view=profile&sido=009&sgg=00901&en=1");
  const card = pg.locator(".eq-card");
  await pg.evaluate(() => window.scrollTo(0, 0)); await pg.waitForTimeout(400);
  const bb = await card.boundingBox();   // 스크롤 0 상태라 문서 좌표와 같다(fullPage clip 기준)
  await pg.screenshot({ ...jpg, path: path.join(OUT, "priority_en.jpg"), clip: { x: bb.x, y: bb.y, width: bb.width, height: Math.min(bb.height, 1000) }, fullPage: true });
  // OG 이미지 1200×630: 카드 윗부분
  await pg.setViewportSize({ width: 1200, height: 630 });
  await pg.evaluate(() => window.scrollTo(0, 0)); await pg.waitForTimeout(600);
  const bb2 = await pg.locator(".eq-card").boundingBox();
  await pg.screenshot({ ...jpg, path: path.join(ROOT, "solve/og.jpg"), clip: { x: 0, y: bb2.y - 8, width: 1200, height: 630 }, fullPage: true });
  await pg.close();
}
// 2) 지표 분석 지도·순위(한국어 화면 그대로) 3) 핫스팟 복합 취약 신호
{
  const pg = await b.newPage({ viewport: { width: 1280, height: 860 }, colorScheme: "light" });
  await go(pg, "view=analysis&ind=DT_H_OBE_OBE&sido=009&sgg=00901&scope=nation", 3000);
  const map = pg.locator(".card", { has: pg.locator("svg.map, .choropleth, svg") }).filter({ hasText: "단계구분도" }).first();
  if (await map.count()) await map.screenshot({ ...jpg, path: path.join(OUT, "map_ko.jpg") });
  await go(pg, "view=hot", 2500);
  await pg.getByRole("button", { name: "복합 취약 신호" }).click(); await pg.waitForTimeout(1500);
  const hot = pg.locator(".card").filter({ has: pg.locator(".ehs-flag") }).first();
  if (await hot.count()) await hot.screenshot({ ...jpg, path: path.join(OUT, "hotspot_ko.jpg") });
  await pg.close();
}
await b.close();
console.log("saved", OUT);
