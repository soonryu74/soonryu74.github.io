import { chromium } from '/home/user/soonryu74.github.io/movesafe/node_modules/@playwright/test/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, locale: 'ko-KR' });
const p = await ctx.newPage();
const base = 'http://127.0.0.1:4181/movesafe/';
// 1) 외반 스쿼트 중간 프레임(빨간 무릎선 + 단서)
await p.goto(base + '#demo=squat_valgus&speed=1');
await p.waitForTimeout(2600);
await p.locator('#stage').screenshot({ path: 'live-valgus-stage.png' });
await p.locator('aside.card').screenshot({ path: 'live-valgus-panel.png' });
// 2) 착지 샘플 중간
await p.goto(base + '#speed=1'); await p.selectOption('#demoSel', 'landing_stiff'); await p.waitForTimeout(2200);
await p.locator('#stage').screenshot({ path: 'live-landing-stage.png' });
// 3) 영양: 도핑 결과
await p.goto(base + 'nutrition.html');
await p.fill('#dopText', '종합감기약(슈도에페드린), 프리워크아웃(히게나민), 벤토린 흡입, 커피'); await p.click('#btnDop'); await p.waitForTimeout(300);
await p.locator('#dopOut').screenshot({ path: 'live-doping.png' });
await p.locator('#sups').screenshot({ path: 'live-sups.png' });
// 4) 홈 전체 1440 상단
await p.goto(base); await p.waitForTimeout(500);
await p.screenshot({ path: 'live-home.png', clip: { x: 0, y: 0, width: 1440, height: 900 } });
await b.close(); console.log('shots done');
