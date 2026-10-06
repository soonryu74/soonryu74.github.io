/* 제출 증거 스크린샷 생성 — 다시ON AI
   사용법(저장소 루트에서, 정적 서버가 8000 포트에 떠 있어야 함):
     맥:      python3 -m http.server 8000 &   →  node reon/scripts/screenshots.mjs
     윈도우:  py -m http.server 8000           →  node reon\scripts\screenshots.mjs  (다른 PowerShell 창에서)
   환경변수: BASE_URL(기본 http://localhost:8000/reon/), PW_MODULE(playwright 모듈 경로), PW_CHROMIUM(크로미움 실행파일) */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW_MODULE || 'playwright');
const BASE = process.env.BASE_URL || 'http://localhost:8000/reon/';
const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../evidence/screenshots');
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
const page = await browser.newPage({ viewport: { width: 1280, height: 860 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error' && !/ERR_TUNNEL|net::ERR/.test(m.text())) errors.push(m.text()); });
const shot = (name) => page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true });
const settle = () => page.waitForTimeout(400);

await page.goto(BASE + '#/');
await page.waitForSelector('[data-testid="cta-start"]');
await settle(); await shot('01_home');

await page.click('[data-testid="cta-start"]');
await page.waitForSelector('[data-testid="career-text"]');
// Persona B 를 입력 화면에 채워 넣고 촬영
await page.click('text=48세 경력복귀 희망자');
await page.waitForFunction(() => document.querySelector('[data-testid="career-text"]').value.length > 10);
await settle(); await shot('02_career_input');

await page.click('[data-testid="analyze"]');
await page.waitForSelector('[data-testid="skill-panel"]', { timeout: 10000 });
await settle(); await shot('03_skill_analysis');

await page.click('[data-testid="to-jobs"]');
await page.waitForSelector('[data-rank="1"]');
await page.evaluate(() => document.querySelector('[data-rank="1"] details')?.setAttribute('open', ''));
await settle(); await shot('04_job_top3');

const firstJob = await page.getAttribute('[data-rank="1"]', 'data-testid');
await page.click(`[data-testid="select-${firstJob.replace('job-', '')}"]`);
await page.waitForSelector('[data-testid="gap-have"]');
await settle(); await shot('05_gap_analysis');

await page.click('[data-testid="to-training"]');
await page.waitForSelector('[data-testid="training-item"], .notice-info');
await settle(); await shot('06_training');

await page.click('[data-testid="to-openings"]');
await page.waitForSelector('[data-testid="opening-item"], .notice-info');
await settle(); await shot('07_jobs');

await page.click('[data-testid="to-report"]');
await page.waitForSelector('[data-testid="print"]');
await settle(); await shot('08_report');

await page.goto(BASE + '#/evidence');
await page.waitForSelector('[data-testid="ev-compare"]');
await settle(); await shot('09_evidence');

// 모바일(390px) — 직무 TOP3 화면
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(BASE + '#/jobs');
await page.waitForSelector('[data-rank="1"]');
await settle(); await shot('10_mobile');
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

await browser.close();
console.log(`스크린샷 10장 저장: ${OUT}`);
console.log(`모바일 가로 넘침: ${overflow}px`);
if (errors.length) { console.log('브라우저 오류:'); errors.forEach((e) => console.log(' -', e)); process.exitCode = 1; } else console.log('브라우저 오류 없음');
