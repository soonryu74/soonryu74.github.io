/* health-profile.kr 메인 공유 미리보기 그림(og.jpg, 1200×630) — 실제 홈 화면 캡처(가짜 목업 없음).
   빌드된 index.html 을 로컬 서버로 띄운 뒤 실행: BASE=http://127.0.0.1:8911 node scripts/qa/site_og.mjs → og.jpg
   build_dashboard.py 가 og.jpg 를 health-profile.kr 루트로 복사한다(app/index.html 의 og:image). */
import path from "node:path";
import { fileURLToPath } from "node:url";
const { chromium } = await import(process.env.PW || "/opt/node22/lib/node_modules/playwright/index.mjs");
const BASE = process.env.BASE || "http://127.0.0.1:8911";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const b = await chromium.launch({ executablePath: process.env.CHROME || "/opt/pw-browsers/chromium" });
const pg = await b.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1, colorScheme: "light" });
await pg.goto(`${BASE}/index.html#view=home`, { waitUntil: "load" });
await pg.waitForSelector(".home-hero"); await pg.waitForTimeout(2500);
await pg.screenshot({ path: path.join(ROOT, "og.jpg"), type: "jpeg", quality: 82, clip: { x: 0, y: 0, width: 1200, height: 630 } });
await b.close();
console.log("saved", path.join(ROOT, "og.jpg"));
