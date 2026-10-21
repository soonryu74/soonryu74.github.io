// 카메라 경로 스모크: 가짜 카메라(테스트 패턴)로 MediaPipe 모델 로드·루프 동작을 확인한다. 네트워크(cdn.jsdelivr.net, storage.googleapis.com) 필요.
// 실행: node tests/camera-smoke.mjs  (정적 서버가 4181 포트에 떠 있어야 함)
import { chromium } from '@playwright/test';
const base = process.env.BASE_URL || 'http://127.0.0.1:4181/movesafe/';
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM, args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ permissions: ['camera'] });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
await page.goto(base);
const t0 = Date.now();
await page.click('#btnCam');
await page.waitForFunction(() => document.querySelector('#modeBadge').textContent.includes('LIVE') || document.querySelector('#status').classList.contains('error'), null, { timeout: 120000 });
const badge = await page.textContent('#modeBadge');
const status = await page.textContent('#status');
await page.waitForTimeout(3000);
const overlay = await page.textContent('#overlay');
const overlayHidden = await page.$eval('#overlay', (el) => el.hidden);
await page.screenshot({ path: 'evidence/07-camera-fake-device.png' });
console.log(JSON.stringify({ ms: Date.now() - t0, badge, status, overlay: overlayHidden ? '(숨김)' : overlay.trim(), errors }, null, 1));
await browser.close();
