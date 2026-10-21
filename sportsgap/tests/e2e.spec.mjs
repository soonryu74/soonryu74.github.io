// npx playwright test  (sportsgap/ 에서) — 390px·1440px 두 프로젝트로 실행, 스크린샷은 evidence/ 에 저장
import { test, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const shot = (info, name) => path.join(here, '..', 'evidence', `${name}-${info.project.name}.png`);

async function noHorizontalScroll(page) {
  // 모바일 에뮬레이션에서는 innerWidth 가 레이아웃 뷰포트로 늘어날 수 있어 설정한 뷰포트 폭과 직접 비교한다
  const vw = page.viewportSize().width;
  const sw = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(sw, `가로 스크롤이 생기면 안 됨 (scrollWidth ${sw} > viewport ${vw})`).toBeLessThanOrEqual(vw + 1);
}

test('홈: 데이터 로드, 31개 시군 순위표, 지도 또는 표 대체, 기준일 배지', async ({ page }, info) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('./');
  await expect(page.locator('h1')).toContainText('SportsGap AI');
  await expect(page.locator('#rankTable tbody tr')).toHaveCount(31);
  await expect(page.locator('#dateFac')).toContainText('2024-12-31');
  await expect(page.locator('#datePop')).toContainText('2026년09월');
  await expect(page.locator('#dateBus')).toContainText('2025-10-31');
  // 1위 행에 순위 1, 점수 0~100
  const first = page.locator('#rankTable tbody tr').first();
  await expect(first.locator('td').nth(1)).toHaveText('1');
  const score = Number((await first.locator('td').nth(2).innerText()).replace(/[^\d.]/g, ''));
  expect(score).toBeGreaterThan(0); expect(score).toBeLessThanOrEqual(100);
  // 지도: Leaflet 폴리곤이 그려졌거나(42개 구·시군 파트) 대체 안내가 떠야 함
  const paths = await page.locator('#map path.leaflet-interactive').count();
  const fallback = await page.locator('#map .state').count();
  expect(paths === 42 || fallback === 1, `폴리곤 ${paths}개 / 대체안내 ${fallback}`).toBeTruthy();
  await noHorizontalScroll(page);
  expect(errors, `JS 오류: ${errors.join(' | ')}`).toEqual([]);
  await page.screenshot({ path: shot(info, '01-home'), fullPage: true });
});

test('키보드 조작: 표 행 Enter 로 비교 추가 · 비교 카드 · 집단 변경', async ({ page }, info) => {
  await page.goto('./');
  await expect(page.locator('#rankTable tbody tr')).toHaveCount(31);
  const row1 = page.locator('#rankTable tbody tr').nth(0);
  const row2 = page.locator('#rankTable tbody tr').nth(1);
  const n1 = (await row1.locator('td').first().innerText()).trim();
  await row1.focus();
  await page.keyboard.press('Enter');
  await expect(row1).toHaveAttribute('aria-pressed', 'true');
  await row2.focus();
  await page.keyboard.press(' ');
  await expect(page.locator('#compare .reg')).toHaveCount(2);
  await expect(page.locator('#compare .reg').first().locator('h4')).toContainText(n1);
  expect(page.url()).toContain('sel=');
  await page.screenshot({ path: shot(info, '02-compare'), fullPage: true });

  // 집단을 아동으로 바꾸면 헤더·시설 범위가 따라 바뀜
  await page.selectOption('#group', 'child');
  await expect(page.locator('#vulnHead')).toHaveText('0~14세 %');
  await expect(page.locator('#scope')).toHaveValue('child');
  await expect(page.locator('#rankTable tbody tr')).toHaveCount(31);
  // 장애인 옵션은 평가불가로 비활성
  await expect(page.locator('#group option[value=disabled]')).toBeDisabled();
  await noHorizontalScroll(page);
});

test('가중치: 대중교통 0% 로 축소모형 · 합계 안내 · 기본값 복원', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('#rankTable tbody tr')).toHaveCount(31);
  await page.locator('#w-transit').fill('0');
  await page.locator('#w-transit').dispatchEvent('change');
  await expect(page.locator('#wsum')).toContainText('85%');
  await expect(page.locator('#formula')).not.toContainText('대중교통');
  expect(page.url()).toContain('transit=0');
  await page.click('#resetWeights');
  await expect(page.locator('#wsum')).toHaveText('가중치 합계 100%');
});

test('예산 시나리오: 300억/50억 → 6개소 배분표, 지도·표 "+n" 배지, 초기화', async ({ page }, info) => {
  await page.goto('./');
  await expect(page.locator('#rankTable tbody tr')).toHaveCount(31);
  await page.selectOption('#scope', 'life');
  await page.fill('#budget', '300');
  await page.fill('#unitcost', '50');
  await page.click('#runSim');
  await expect(page.locator('#simResult .notice')).toContainText('6개소');
  await expect(page.locator('#simResult tbody tr').first()).toBeVisible();
  await expect(page.locator('#rankTable .badge.ok').first()).toContainText('+');
  await page.screenshot({ path: shot(info, '03-scenario'), fullPage: true });
  await page.click('#clearSim');
  await expect(page.locator('#rankTable .badge.ok')).toHaveCount(0);
  // 잘못된 입력
  await page.fill('#budget', '0');
  await page.click('#runSim');
  await expect(page.locator('#simResult .error')).toBeVisible();
});

test('정책 제안 3건 이상 + 근거·한계 문구', async ({ page }, info) => {
  await page.goto('./');
  await expect(page.locator('#proposals .prop')).toHaveCount(5);
  await expect(page.locator('#proposals .prop.region')).toHaveCount(3);
  await expect(page.locator('#proposals .prop').first()).toContainText('한계:');
  await expect(page.locator('#proposals .prop').first().locator('li')).not.toHaveCount(0);
  await page.locator('#proposals-sec').scrollIntoViewIfNeeded();
  await page.screenshot({ path: shot(info, '04-proposals'), fullPage: true });
});

test('방법론 페이지: 출처·산식·개인정보·재현 섹션, 링크 왕복', async ({ page }, info) => {
  await page.goto('./');
  await page.getByRole('link', { name: '데이터·방법론' }).first().click();
  await expect(page).toHaveURL(/about\.html/);
  for (const id of ['sources', 'method', 'limits', 'privacy', 'repro']) await expect(page.locator(`#${id}`)).toBeVisible();
  await expect(page.locator('#sources')).toContainText('데이터 출처');
  await noHorizontalScroll(page);
  await page.screenshot({ path: shot(info, '05-about'), fullPage: true });
  await page.getByRole('link', { name: '← 진단 화면' }).click();
  await expect(page.locator('#rankTable tbody tr')).toHaveCount(31);
});

test('오류 상태: 데이터 파일을 못 받으면 오류 안내', async ({ page }) => {
  await page.route('**/data/regions.json', (r) => r.abort());
  await page.goto('./');
  await expect(page.locator('#status')).toContainText('불러오지 못했습니다');
  await expect(page.locator('#map')).toContainText('지도 데이터 없음');
});

test('지도 불가 상태: Leaflet 차단 시 표 대체 안내, 순위표는 정상', async ({ page }) => {
  await page.route('**/leaflet.min.js', (r) => r.abort());
  await page.goto('./');
  await expect(page.locator('#map .state')).toContainText('표에서');
  await expect(page.locator('#rankTable tbody tr')).toHaveCount(31);
  await expect(page.locator('#proposals .prop.region')).toHaveCount(3);
});
