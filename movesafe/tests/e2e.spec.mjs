// npx playwright test (movesafe/ 에서). 샘플(DEMO) 모드로 전체 파이프라인을, 카메라는 거부 경로를 검증한다.
import { test, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const shot = (info, name) => path.join(here, '..', 'evidence', `${name}-${info.project.name}.png`);

async function noHorizontalScroll(page) {
  const vw = page.viewportSize().width;
  const sw = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(sw, `가로 스크롤 (scrollWidth ${sw} > viewport ${vw})`).toBeLessThanOrEqual(vw + 1);
}

test('홈: 로드, 샘플 6종, 상태 배지, JS 오류 없음', async ({ page }, info) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('./');
  await expect(page.locator('h1')).toContainText('MoveSafe AI');
  await expect(page.locator('#demoSel option')).toHaveCount(7);
  await expect(page.locator('#modeBadge')).toHaveText('대기');
  await expect(page.locator('#overlay')).toContainText('카메라를 켜거나');
  await noHorizontalScroll(page);
  expect(errors).toEqual([]);
  await page.screenshot({ path: shot(info, '01-home'), fullPage: true });
});

test('DEMO 좋은 스쿼트(4배속): 5회 감지, 평균 ≥ 90, 리포트 5행 + 워밍업 루틴', async ({ page }, info) => {
  await page.goto('./#demo=squat_good&speed=4');
  await expect(page.locator('#modeBadge')).toHaveText('DEMO 샘플');
  await expect(page.locator('#status')).toContainText('샘플 재생이 끝났습니다', { timeout: 30_000 });
  await expect(page.locator('#repCount')).toHaveText('5');
  const avg = Number(await page.locator('#avgScore').innerText());
  expect(avg).toBeGreaterThanOrEqual(90);
  await expect(page.locator('#report')).toBeVisible();
  await expect(page.locator('#reportBody tbody tr')).toHaveCount(5);
  await expect(page.locator('#routines .routine').first()).toContainText('워밍업');
  await expect(page.locator('#repBadge')).toContainText('DEMO');
  await page.screenshot({ path: shot(info, '02-demo-good'), fullPage: true });
});

test('DEMO 무릎 안쪽 쏠림: 플래그·둔근 루틴·빨간 단서', async ({ page }, info) => {
  await page.goto('./#speed=4');
  await page.selectOption('#demoSel', 'squat_valgus');
  await expect(page.locator('#modeBadge')).toHaveText('DEMO 샘플');
  await expect(page.locator('#status')).toContainText('끝났습니다', { timeout: 30_000 });
  await expect(page.locator('#lastRep')).toContainText('무릎 안쪽 쏠림');
  await expect(page.locator('#routines')).toContainText('둔근');
  const avg = Number(await page.locator('#avgScore').innerText());
  expect(avg).toBeLessThanOrEqual(70);
  await page.screenshot({ path: shot(info, '03-demo-valgus'), fullPage: true });
});

test('DEMO 딱딱한 착지: 운동 자동 전환, stiff 플래그, 착지 루틴', async ({ page }, info) => {
  await page.goto('./#speed=4');
  await page.selectOption('#demoSel', 'landing_stiff');
  await expect(page.locator('#exercise')).toHaveValue('landing');
  await expect(page.locator('#status')).toContainText('끝났습니다', { timeout: 30_000 });
  await expect(page.locator('#repCount')).toHaveText('3');
  await expect(page.locator('#reportBody')).toContainText('딱딱한 착지');
  await expect(page.locator('#routines')).toContainText('착지 기술');
  await page.screenshot({ path: shot(info, '04-demo-landing'), fullPage: true });
});

test('세션 초기화·정지 버튼·키보드로 샘플 재생', async ({ page }) => {
  await page.goto('./#speed=8');
  await page.locator('#btnDemo').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#modeBadge')).toHaveText('DEMO 샘플');
  await expect(page.locator('#btnStop')).toBeEnabled();
  await page.click('#btnStop');
  await expect(page.locator('#modeBadge')).toHaveText('대기');
  await page.click('#btnReset');
  await expect(page.locator('#repCount')).toHaveText('0');
  await expect(page.locator('#lastRep')).toHaveText('아직 없음');
});

test('카메라 없음/거부: 오류 안내 + 샘플 재생 권유', async ({ page }) => {
  await page.goto('./');
  await page.click('#btnCam');
  await expect(page.locator('#status')).toContainText('샘플 재생', { timeout: 20_000 });
  await expect(page.locator('#status')).toHaveClass(/error/);
});

test('영양 페이지: 기본 계산, 체중 변경, 땀 손실, 도핑 확인', async ({ page }, info) => {
  await page.goto('./nutrition.html');
  await expect(page.locator('#targets')).toContainText('350~490 g');
  await expect(page.locator('#targets')).toContainText('84~140 g');
  await page.fill('#weight', '80'); await page.dispatchEvent('#weight', 'change');
  await expect(page.locator('#targets')).toContainText('400~560 g');
  await expect(page.locator('#sups .sup')).toHaveCount(6);
  await expect(page.locator('#sups')).toContainText('240~480 mg');
  await page.fill('#preKg', '70'); await page.fill('#postKg', '68'); await page.fill('#fluidMl', '500'); await page.fill('#durMin', '90');
  await page.click('#btnSweat');
  await expect(page.locator('#sweatOut')).toContainText('1.67 L/h');
  await expect(page.locator('#sweatOut')).toContainText('2% 이상');
  await page.fill('#dopText', '종합감기약(슈도에페드린), 커피, Ostarine 보충제, 벤토린 흡입');
  await page.click('#btnDop');
  await expect(page.locator('#dopOut .dop')).toHaveCount(4);
  await expect(page.locator('#dopOut .dop').first()).toContainText('상시 금지');
  await expect(page.locator('#dopOut')).toContainText('KADA');
  await page.fill('#dopText', '비타민 C'); await page.click('#btnDop');
  await expect(page.locator('#dopOut')).toContainText('일치하는 항목이 없습니다');
  await noHorizontalScroll(page);
  await page.screenshot({ path: shot(info, '05-nutrition'), fullPage: true });
});

test('근거 페이지: 섹션·링크·가로 스크롤 없음', async ({ page }, info) => {
  await page.goto('./about.html');
  for (const id of ['what', 'method', 'routines', 'nutrition', 'limits', 'privacy', 'tech', 'repro']) await expect(page.locator(`#${id}`)).toBeVisible();
  await noHorizontalScroll(page);
  await page.screenshot({ path: shot(info, '06-about'), fullPage: true });
  await page.getByRole('link', { name: '폼 코치' }).click();
  await expect(page).toHaveURL(/index\.html|movesafe\/$/);
});

test('루틴 데이터 실패 시 안내', async ({ page }) => {
  await page.route('**/data/routines.json', (r) => r.abort());
  await page.goto('./#demo=squat_good&speed=8');
  await expect(page.locator('#status')).toContainText('끝났습니다', { timeout: 30_000 });
  await expect(page.locator('#routines')).toContainText('불러오지 못했습니다');
});
