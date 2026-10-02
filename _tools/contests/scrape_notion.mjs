// 노션 공개 DB(공모전 목록) → JSON
// 사용: node _tools/contests/scrape_notion.mjs <출력.json>
// 노션 표는 화면에 보이는 30줄만 그리므로, 스크롤하면서 줄(block id)별로 모읍니다.
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire(import.meta.url);
const pw = (() => {
  for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright/index.js']) {
    try { return require(p); } catch {}
  }
  throw new Error('playwright를 찾을 수 없습니다');
})();
const URL = process.env.NOTION_URL ||
  'https://melted-scilla-c69.notion.site/f710177d3eca4eb2b38211736ba941d1?v=d95b4e21cf8a4a7b8c6527ea22911cae';
const out = process.argv[2] || 'notion_raw.json';

const browser = await pw.chromium.launch();
const page = await (await browser.newContext({
  locale: 'ko-KR', viewport: { width: 2200, height: 1400 },
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36',
})).newPage();

let loaded = false;
for (let attempt = 1; attempt <= 3 && !loaded; attempt++) {
  try {
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForSelector('.notion-table-view-row', { timeout: 60000 });
    loaded = true;
  } catch (e) {
    console.error(`불러오기 실패 ${attempt}/3: ${e.message.slice(0, 120)}`);
    await page.waitForTimeout(5000 * attempt);
  }
}
if (!loaded) { await browser.close(); process.exit(2); }
await page.waitForTimeout(3000);

const headers = await page.evaluate(() =>
  [...document.querySelectorAll('.notion-table-view-header-cell')].map(h => (h.innerText || '').trim()));

const rows = new Map();
const grab = async () => {
  const got = await page.evaluate((headers) => {
    return [...document.querySelectorAll('.notion-table-view-row')].map(r => {
      const item = r.closest('[data-block-id]');
      const id = item ? item.getAttribute('data-block-id') : '';
      const cells = [...r.querySelectorAll('.notion-table-view-cell')];
      const o = { id };
      cells.forEach((c, i) => {
        const idx = Number(c.getAttribute('data-col-index') ?? i);
        const key = headers[idx] || `col${idx}`;
        const a = c.querySelector('a[href]');
        o[key] = (c.innerText || '').trim();
        if (a && /^https?:/.test(a.href) && !/notion\.(so|site)/.test(a.href)) o[key + '__href'] = a.href;
      });
      return o;
    }).filter(o => o.id);
  }, headers);
  for (const g of got) rows.set(g.id, { ...(rows.get(g.id) || {}), ...g });
};

let stable = 0, prev = -1;
for (let i = 0; i < 400; i++) {
  await grab();
  await page.evaluate(() => {
    const sc = [...document.querySelectorAll('.notion-scroller')]
      .find(d => d.scrollHeight > d.clientHeight + 50) || document.scrollingElement;
    sc.scrollTop += Math.round(sc.clientHeight * 0.6);
    // 공개 페이지는 일정 개수 뒤에 '더 보기' 버튼으로 끊기기도 합니다
    const more = [...document.querySelectorAll('div[role="button"], button')]
      .find(b => /^(더 보기|더 불러오기|Load more)/.test((b.innerText || '').trim()));
    if (more) more.click();
  });
  await page.waitForTimeout(600);
  if (rows.size === prev) { if (++stable >= 12) break; } else stable = 0;
  prev = rows.size;
}
await grab();
await browser.close();

const list = [...rows.values()];
fs.writeFileSync(out, JSON.stringify({ scrapedAt: new Date().toISOString(), source: URL, headers, rows: list }, null, 1));
console.log(`수집 ${list.length}건 → ${out}`);
if (list.length < 10) process.exit(3);   // 거의 비었으면 실패로 처리 (기존 데이터 덮어쓰기 방지)
