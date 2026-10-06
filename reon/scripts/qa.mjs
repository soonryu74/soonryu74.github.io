/* QA — Persona 5종 E2E (브라우저) + 엔진 결과 요약
   정적 서버 8000 포트 필요(screenshots.mjs 와 동일). 결과를 표로 출력하며 QA_REPORT.md 작성에 사용한다. */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW_MODULE || 'playwright');
const BASE = process.env.BASE_URL || 'http://localhost:8000/reon/';
const PERSONAS = ['A', 'B', 'C', 'D', 'E'];

const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
const rows = [];
let fail = 0;
for (const vp of [{ width: 1280, height: 860 }, { width: 390, height: 844 }]) {
  for (const id of PERSONAS) {
    const page = await browser.newPage({ viewport: vp });
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error' && !/ERR_TUNNEL|net::ERR/.test(m.text())) errors.push(m.text()); });
    const r = { persona: id, viewport: vp.width, steps: [], errors, ok: true };
    try {
      await page.goto(BASE + '#/');
      await page.evaluate(() => sessionStorage.clear());
      await page.goto(BASE + '#/input');
      await page.waitForSelector('[data-testid="career-text"]');
      // 입력 화면에서 Persona 불러오기(A~C 는 버튼, D·E 는 직접 입력)
      const { PERSONA_MAP } = await import('../data/personas.js');
      const p = PERSONA_MAP[id];
      await page.fill('[data-testid="career-text"]', p.text);
      await page.selectOption('#f-sido', p.region[0]);
      await page.selectOption('#f-gugun', p.region[1]);
      await page.check(`input[name="hours"][value="${p.hours}"]`);
      await page.check(`input[name="workType"][value="${p.workType}"]`);
      await page.check(`input[name="training"][value="${p.training}"]`);
      for (const q of p.quals) await page.check(`input[name="quals"][value="${q}"]`);
      await page.click('[data-testid="analyze"]');
      await page.waitForSelector('[data-testid="skill-panel"]', { timeout: 10000 });
      const skillCount = await page.locator('#skill-list .skill').count();
      r.steps.push(`역량 ${skillCount}개`);
      // 역량 수정 체험: 하나 삭제 후 하나 추가
      const firstSkill = await page.locator('#skill-list .skill').first().getAttribute('data-id');
      await page.click(`[data-action="remove"][data-id="${firstSkill}"]`);
      await page.selectOption('#add-skill', { index: 1 });
      await page.click('[data-testid="skill-add"]');
      const after = await page.locator('#skill-list .skill').count();
      r.steps.push(`수정 후 ${after}개`);
      await page.click('[data-testid="to-jobs"]');
      await page.waitForSelector('[data-rank="3"]');
      const top3 = await page.$$eval('[data-rank]', (els) => els.slice(0, 3).map((e) => e.querySelector('h3').textContent.trim() + ' ' + e.querySelector('.pct').textContent.replace('적합도 ', '')));
      r.top3 = top3;
      const why = await page.locator('[data-rank="1"] .why').textContent();
      if (!why.includes('경험') && !why.includes('역량')) throw new Error('추천 이유 문장 없음');
      const jobId = (await page.getAttribute('[data-rank="1"]', 'data-testid')).replace('job-', '');
      await page.click(`[data-testid="select-${jobId}"]`);
      await page.waitForSelector('[data-testid="gap-quals"]');
      const evCount = await page.locator('[data-testid="gap-evidence"] li').count();
      if (evCount < 1) throw new Error('직무 요건 근거 없음');
      r.steps.push(`요건근거 ${evCount}건`);
      const have = await page.locator('[data-testid="gap-have"] li').count();
      const improve = await page.locator('[data-testid="gap-improve"] li').count();
      r.steps.push(`Gap 갖춤${have}/보완${improve}`);
      await page.click('[data-testid="to-training"]');
      await page.waitForSelector('[data-testid="training-demo-notice"]');
      const tr = await page.locator('[data-testid="training-item"]').count();
      r.steps.push(`훈련 ${tr}건(DEMO)`);
      await page.click('[data-testid="to-openings"]');
      await page.waitForSelector('[data-testid="openings-demo-notice"]');
      const op = await page.locator('[data-testid="opening-item"]').count();
      r.steps.push(`채용 ${op}건(DEMO)`);
      await page.click('[data-testid="to-report"]');
      await page.waitForSelector('[data-testid="print"]');
      const acts = await page.locator('.next-actions li').count();
      r.steps.push(`리포트 다음행동 ${acts}`);
      await page.goto(BASE + '#/evidence');
      await page.waitForSelector('[data-testid="ev-compare"]');
      const compared = await page.locator('[data-testid="ev-compare"] tbody tr').count();
      r.steps.push(`근거 비교직무 ${compared}`);
      await page.goto(BASE + '#/about');
      await page.waitForSelector('#app h1');
      const aboutOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      await page.goto(BASE + '#/evidence');
      await page.waitForSelector('[data-testid="ev-compare"]');
      const overflow = Math.max(aboutOverflow, await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth));
      r.steps.push(`가로넘침 ${overflow}px`);
      if (overflow > 1) throw new Error('가로 스크롤 발생');
      if (errors.length) throw new Error('브라우저 오류: ' + errors.join(' | '));
    } catch (e) {
      r.ok = false; r.error = String(e.message || e); fail += 1;
    }
    rows.push(r);
    await page.close();
  }
}
await browser.close();
for (const r of rows) console.log(`${r.ok ? 'PASS' : 'FAIL'} | ${r.persona} @${r.viewport} | ${r.steps.join(' · ')} | TOP3: ${(r.top3 || []).join(' / ')}${r.error ? ' | ' + r.error : ''}`);
console.log(`\n합계: ${rows.length - fail}/${rows.length} 통과`);
process.exitCode = fail ? 1 : 0;
