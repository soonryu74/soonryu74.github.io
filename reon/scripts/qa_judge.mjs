/* 심사위원 모드 E2E — demo.html → ?demo=judge → 90초 데모 시작 → "다음 단계" 버튼만으로 리포트까지 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW_MODULE || 'playwright');
const BASE = process.env.BASE_URL || 'http://localhost:8000/reon/';
const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
const t0 = Date.now();
await page.goto(BASE + 'demo.html');
await page.waitForSelector('[data-testid="judge-start"]');
await page.click('[data-testid="judge-start"]');
await page.waitForSelector('[data-testid="skill-panel"]', { timeout: 10000 });
const visited = ['skills'];
for (const expect of ['jobs', 'gap', 'training', 'openings', 'report']) {
  await page.click('[data-testid="judge-next"]');
  await page.waitForFunction((k) => location.hash.includes('/' + k), expect, { timeout: 10000 });
  await page.waitForSelector('#app h1');
  visited.push(expect);
}
const printBtn = await page.locator('[data-testid="print"]').count();
await browser.close();
console.log(`심사위원 모드: ${visited.join(' → ')} · 리포트 인쇄 버튼 ${printBtn ? '있음' : '없음'} · 소요 ${((Date.now() - t0) / 1000).toFixed(1)}초(자동 클릭 기준)`);
if (errors.length) { console.log('오류:', errors); process.exitCode = 1; } else console.log('브라우저 오류 없음');
