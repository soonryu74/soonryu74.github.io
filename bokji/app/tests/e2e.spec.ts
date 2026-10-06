import { expect, test, type Page } from '@playwright/test';

const SAFETY = '이 서비스는 복지급여 수급자격을 최종 판정하지 않습니다';

async function noHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, '가로 스크롤이 생기면 안 됨').toBeLessThanOrEqual(1);
}
async function noForbiddenPhrase(page: Page) {
  const body = await page.locator('body').innerText();
  expect(body).not.toContain('받을 수 있습니다');
}

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => { sessionStorage.clear(); localStorage.clear(); });
});

test('홈: 서비스명·마이크·입력창·예시 문장·안전문구', async ({ page }, info) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('필요하신가요');
  await expect(page.getByTestId('mic-button')).toBeVisible();
  await expect(page.getByLabel('상황을 적어 주세요')).toBeVisible();
  await expect(page.getByRole('group', { name: '예시 문장' }).getByRole('button')).toHaveCount(5);
  await expect(page.getByTestId('safety-notice').first()).toContainText(SAFETY);
  // 기본 글자 18px 이상, 터치 영역 44px 이상
  const fs = await page.locator('body').evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(fs).toBeGreaterThanOrEqual(18);
  const box = await page.getByTestId('start-button').boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(44);
  await noHorizontalScroll(page);
  await page.screenshot({ path: `test-results/shots/${info.project.name}-home.png`, fullPage: true });
});

test('시나리오 A 독거노인: 입력 → 질문(미리 채움) → 결과 3개 → 상세 → 오늘 할 일 → 공유', async ({ page }, info) => {
  await page.goto('./');
  await page.getByRole('radio', { name: '가족을 위한 도움' }).click();
  await page.getByLabel('상황을 적어 주세요').fill('78세 어머니가 혼자 사시고 무릎이 안 좋아 병원 가기 어렵습니다.');
  await page.getByTestId('start-button').click();

  // 질문 1: 누구 — 미리 채움
  await expect(page).toHaveURL(/#\/start\/1$/);
  await expect(page.getByTestId('prefilled-hint')).toBeVisible();
  await expect(page.getByTestId('opt-who-family')).toHaveAttribute('aria-checked', 'true');
  await page.getByTestId('next-button').click();
  // 질문 2: 나이 75~84 미리 채움
  await expect(page.getByTestId('opt-ageBand-75_84')).toHaveAttribute('aria-checked', 'true');
  await page.getByTestId('next-button').click();
  // 질문 3: 혼자 — 미리 채움
  await expect(page.getByTestId('opt-livesAlone-yes')).toHaveAttribute('aria-checked', 'true');
  await page.getByTestId('next-button').click();
  // 질문 4: 장애 — 선택 필요
  await expect(page.getByTestId('next-button')).toBeDisabled();
  await page.getByTestId('opt-disability-none').click();
  await page.getByTestId('next-button').click();
  // 질문 5: 장기요양
  await page.getByTestId('opt-ltc-no_grade').click();
  await page.getByTestId('next-button').click();
  // 질문 6: 필요 — 병원 미리 채움
  await expect(page.getByTestId('opt-mainNeed-hospital')).toHaveAttribute('aria-checked', 'true');
  await page.getByTestId('next-button').click();
  // 질문 7: 급함
  await page.getByTestId('opt-urgent-no').click();
  await page.getByTestId('next-button').click();

  await expect(page).toHaveURL(/#\/result$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('지금 먼저 확인할 지원');
  await expect(page.getByTestId('result-summary')).toContainText('혼자 지내심');
  const cards = page.getByTestId('primary-list').locator('li');
  await expect(cards).toHaveCount(3);
  await expect(page.getByTestId('card-ltc-recognition')).toBeVisible();
  await expect(page.getByTestId('card-elderly-care')).toHaveAttribute('data-status', 'needs_condition');
  await expect(page.getByTestId('card-mobility-special-transport')).toBeVisible();
  await expect(page.getByTestId('secondary-list')).toContainText('복지멤버십');
  await expect(page.getByTestId('urgent-panel')).toHaveCount(0);
  await noForbiddenPhrase(page);
  await noHorizontalScroll(page);
  await page.screenshot({ path: `test-results/shots/${info.project.name}-result-A.png`, fullPage: true });

  // 상세
  await page.getByTestId('card-ltc-recognition').getByRole('link', { name: '자세히 보기' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('장기요양 등급 신청');
  await expect(page.getByRole('link', { name: /1577-1000에 전화하기/ })).toHaveAttribute('href', 'tel:15771000');
  await expect(page.getByRole('link', { name: /공식 사이트로 이동/ })).toHaveAttribute('href', 'https://www.longtermcare.or.kr/');
  await expect(page.getByText('출처: 국민건강보험공단')).toBeVisible();
  await noHorizontalScroll(page);

  // 오늘 할 일
  await page.getByRole('link', { name: '오늘 할 일 보기' }).click();
  await expect(page).toHaveURL(/#\/today$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('가지만 하면 돼요');
  const plan = page.getByTestId('plan-list').locator('li');
  const n = await plan.count();
  expect(n).toBeGreaterThanOrEqual(2);
  expect(n).toBeLessThanOrEqual(3);
  await expect(page.getByTestId('plan-1')).toContainText('1577-1000');
  await page.getByTestId('plan-1').getByRole('checkbox').check();
  await expect(page.getByTestId('plan-1')).toHaveClass(/done/);

  // 공유: 개인정보 없이 · 안전문구 포함
  await page.getByTestId('copy-long').click();
  const preview = page.getByTestId('share-preview');
  await expect(preview).toBeVisible();
  const txt = await preview.inputValue();
  expect(txt).toContain('[모두의 복지 AI — 먼저 확인할 지원]');
  expect(txt).toContain(SAFETY);
  expect(txt).not.toContain('78세');
  expect(txt).not.toContain('어머니');
  await page.getByTestId('copy-sms').click();
  await expect(preview).toHaveValue(/담당기관 확인 필요/);
  await noHorizontalScroll(page);
  await page.screenshot({ path: `test-results/shots/${info.project.name}-today-A.png`, fullPage: true });
});

test('시나리오 B 장애인 보호자: 예시 바로 보기 → 주간활동·활동지원·부모상담', async ({ page }, info) => {
  await page.goto('./');
  await page.getByTestId('demo-B').click();
  await expect(page).toHaveURL(/#\/result$/);
  const ids = await page.getByTestId('primary-list').locator('li').evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')));
  expect(ids).toEqual(['card-day-activity', 'card-activity-support', 'card-parent-counseling']);
  await expect(page.getByTestId('card-day-activity')).toHaveAttribute('data-status', 'check_first');
  await expect(page.getByTestId('card-day-activity')).toContainText('먼저 확인해 보세요');
  await noForbiddenPhrase(page);
  await noHorizontalScroll(page);
  await page.screenshot({ path: `test-results/shots/${info.project.name}-result-B.png`, fullPage: true });
});

test('시나리오 C 경제·생활 위기: 긴급복지·기초생활보장·전기요금 할인, 조건 확인 표시', async ({ page }, info) => {
  await page.goto('./');
  await page.getByTestId('demo-C').click();
  const ids = await page.getByTestId('primary-list').locator('li').evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')));
  expect(ids).toEqual(['card-emergency-welfare', 'card-basic-livelihood', 'card-kepco-discount']);
  await expect(page.getByTestId('card-emergency-welfare')).toContainText('조건 확인이 필요합니다');
  await expect(page.getByTestId('secondary-list')).toContainText('냉난방비 바우처');
  await noForbiddenPhrase(page);
  await page.getByTestId('today-button').click();
  await expect(page.getByTestId('plan-1')).toContainText('129');
  await noHorizontalScroll(page);
  await page.screenshot({ path: `test-results/shots/${info.project.name}-today-C.png`, fullPage: true });
});

test('긴급 신호가 있으면 결과 맨 위에 119·129·109', async ({ page }) => {
  await page.goto('./');
  await page.getByLabel('상황을 적어 주세요').fill('혼자 사는데 갑자기 실직해서 월세도 밀렸어요. 너무 불안합니다.');
  await page.getByTestId('start-button').click();
  await page.goto('./#/result');
  await expect(page.getByTestId('urgent-panel')).toBeVisible();
  await expect(page.getByRole('link', { name: /119에 전화하기/ })).toHaveAttribute('href', 'tel:119');
});

test('TTS 버튼: speechSynthesis 호출', async ({ page }) => {
  await page.addInitScript(() => {
    const calls: string[] = [];
    (window as unknown as { __tts: string[] }).__tts = calls;
    const synth = { speaking: false, cancel() { this.speaking = false; }, speak(u: { text: string }) { calls.push(u.text); this.speaking = true; }, getVoices: () => [] };
    Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
    (window as unknown as { SpeechSynthesisUtterance: unknown }).SpeechSynthesisUtterance = class { text: string; lang = ''; rate = 1; voice = null; constructor(t: string) { this.text = t; } };
  });
  await page.goto('./');
  await page.getByTestId('demo-A').click();
  await expect(page).toHaveURL(/#\/result$/);
  await page.getByTestId('tts-button').click();
  const spoken = await page.evaluate(() => (window as unknown as { __tts: string[] }).__tts);
  expect(spoken.length).toBe(1);
  expect(spoken[0]).toContain('먼저 확인할 지원은 3가지입니다');
  expect(spoken[0]).toContain(SAFETY);
  await expect(page.getByTestId('tts-button')).toContainText('읽기 멈춤');
});

test('키보드만으로: Tab → 예시 버튼 → Enter → 시작 → 질문 답변', async ({ page }) => {
  await page.goto('./');
  // 화면이 열리면 제목에 초점(화면낭독기 배려). 본문 바로가기 링크는 키보드로 동작
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
  await page.locator('.skip').focus();
  await expect(page.locator('.skip')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
  // Tab 으로 예시 버튼 사이를 이동하고 Enter 로 선택
  await page.getByRole('button', { name: '혼자 사는데 도움이 필요해요' }).focus();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: '병원 가기 어려워요' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('상황을 적어 주세요')).toHaveValue('병원 가기 어려워요');
  await page.getByTestId('start-button').focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#\/start\/1$/);
  // 제목으로 초점 이동
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
  await page.getByTestId('opt-who-self').focus();
  await page.keyboard.press('Space');
  await expect(page.getByTestId('opt-who-self')).toHaveAttribute('aria-checked', 'true');
  await page.getByTestId('next-button').focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#\/start\/2$/);
});

test('글자 크기·고대비 설정이 적용되고 유지된다', async ({ page }) => {
  await page.goto('./#/settings');
  await page.getByTestId('font-xlarge').click();
  await page.getByTestId('contrast-toggle').check();
  const fs = await page.locator('body').evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(fs).toBeGreaterThanOrEqual(26);
  await expect(page.locator('html')).toHaveAttribute('data-contrast', 'high');
  await page.goto('./');
  await expect(page.locator('html')).toHaveAttribute('data-font', 'xlarge');
  await noHorizontalScroll(page);
});

test('출처 화면: 모든 서비스에 공식 링크 또는 "확인 중" 표시, 가짜 번호 없음', async ({ page }) => {
  await page.goto('./#/about');
  const rows = page.locator('.src-table tbody tr');
  const n = await rows.count();
  expect(n).toBeGreaterThanOrEqual(20);
  for (let i = 0; i < n; i++) {
    const r = rows.nth(i);
    const hasLink = (await r.locator('a[target=_blank]').count()) > 0;
    const pending = (await r.locator('.pending-link').count()) > 0;
    expect(hasLink || pending, `row ${i}`).toBe(true);
    if (hasLink) expect(await r.locator('a[target=_blank]').getAttribute('href')).toMatch(/^https:\/\//);
  }
  await noHorizontalScroll(page);
});

test('급할 때 화면: 전화 링크', async ({ page }) => {
  await page.goto('./#/emergency');
  await expect(page.getByRole('link', { name: /129에 전화하기/ })).toHaveAttribute('href', 'tel:129');
  await expect(page.getByRole('link', { name: /1577-1389에 전화하기/ })).toHaveAttribute('href', 'tel:15771389');
  await noHorizontalScroll(page);
});
