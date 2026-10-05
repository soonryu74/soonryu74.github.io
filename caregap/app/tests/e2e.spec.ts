import { expect, test, type Page } from '@playwright/test';

async function noHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, '가로 스크롤이 생기면 안 됨').toBeLessThanOrEqual(1);
}

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => localStorage.clear());
});

test('예시로 체험하기 → 즉시 결과 · 이유 보기 · Care Map', async ({ page }, info) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('비어 있는 시간');
  await noHorizontalScroll(page);
  await page.getByRole('button', { name: '예시로 체험하기' }).click();

  await expect(page.getByTestId('result-summary')).toContainText('확인이 필요한 돌봄 영역 5개가 발견되었습니다');
  await expect(page.getByTestId('result-summary')).not.toContainText('위험');
  await expect(page.getByTestId('gap-night')).toHaveAttribute('data-status', 'needs_confirmation');
  await expect(page.getByTestId('gap-meds')).toHaveAttribute('data-status', 'needs_confirmation');
  await expect(page.getByTestId('gap-meal')).toHaveAttribute('data-status', 'covered_or_no_gap_detected');
  await expect(page.getByTestId('context-note')).toContainText('판단 규칙에 사용하지 않음');
  await expect(page.getByTestId('gap-meds')).toContainText('현재 관련 일정');
  await noHorizontalScroll(page);

  // 왜 이 결과가 나왔나요?
  await page.getByTestId('gap-night').getByRole('button', { name: '왜 이 결과가 나왔나요?' }).click();
  const ex = page.getByTestId('explain-night');
  await expect(ex).toContainText('최근 넘어진 적이 있다');
  await expect(ex).toContainText('= 예');
  await expect(ex).toContainText('주 105시간');
  await expect(ex).toContainText('night.fall_alone');
  await page.screenshot({ path: `test-results/shots/${info.project.name}-result.png`, fullPage: true });

  // Care Map
  await page.goto('./#/map');
  const mobile = info.project.name.startsWith('mobile');
  if (mobile) {
    await expect(page.getByTestId('caremap-grid')).toBeHidden();
    const mon = page.getByTestId('caremap-cards').locator('li.cm-card[data-day="0"]');
    await expect(mon).toContainText('09:00–12:00');
    await expect(mon).toContainText('방문요양');
    await expect(mon).toContainText('00:00–09:00');
    await expect(mon).toContainText('혼자 계신 시간');
    // 큰 글씨 유지
    const fs = await mon.locator('.cm-block-time').first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(fs).toBeGreaterThanOrEqual(16);
  } else {
    await expect(page.getByTestId('caremap-cards')).toBeHidden();
    const bars = page.getByTestId('cm-bar').and(page.locator('[data-type="visit_care"]'));
    await expect(bars).toHaveCount(3);
    for (const b of await bars.all()) {
      await expect(b).toHaveAttribute('data-start', '09:00');
      await expect(b).toHaveAttribute('data-end', '12:00');
    }
    // 막대 위치: 09시 = 37.5%
    const row = page.locator('.cm-row[data-day="0"] .cm-track');
    const [rb, bb] = await Promise.all([row.boundingBox(), bars.first().boundingBox()]);
    expect(Math.abs((bb!.x - rb!.x) / rb!.width - 0.375)).toBeLessThan(0.01);
    expect(Math.abs(bb!.width / rb!.width - 0.125)).toBeLessThan(0.01);
  }
  await noHorizontalScroll(page);
  await page.screenshot({ path: `test-results/shots/${info.project.name}-map.png`, fullPage: true });
});

test('온보딩 4단계 · 일정 추가/삭제 · 결과 반영', async ({ page }) => {
  await page.goto('./#/start/1');
  await page.getByRole('button', { name: '다음' }).click();
  await expect(page.getByRole('alert')).toContainText('연령');

  await page.getByLabel('연령').fill('79');
  await page.getByLabel('거주 시·도').selectOption('서울특별시');
  await page.getByLabel('시·군·구').selectOption('종로구');
  await page.getByText('네, 혼자 사세요').click();
  await noHorizontalScroll(page);
  await page.getByRole('button', { name: '다음' }).click();

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('현재 건강·생활 상태');
  await page.getByText('약 복용을 자주 잊는다').click();
  // 말로 설명하기 → 확인 후 반영
  await page.getByRole('button', { name: /말로 설명하기/ }).click();
  await page.getByLabel('걱정되는 점').fill('엄마가 최근에 자꾸 넘어지고 밤에 혼자 계셔서 걱정돼요.');
  await page.getByRole('button', { name: '내용 정리하기' }).click();
  await expect(page.getByText('다음 내용으로 이해했습니다.')).toBeVisible();
  await expect(page.locator('.check-item.on', { hasText: '최근 넘어진 적이 있다' })).toHaveCount(0); // 확인 전 미반영
  await page.getByRole('button', { name: '맞아요' }).click();
  await expect(page.locator('.check-item.on', { hasText: '최근 넘어진 적이 있다' })).toHaveCount(1);
  await page.getByRole('button', { name: '다음' }).click();

  await page.getByText('방문요양').first().click();
  await page.getByRole('button', { name: '다음' }).click();

  // 일정 추가: 월·목 10–13 방문요양
  await page.getByRole('button', { name: '월요일' }).click();
  await page.getByRole('button', { name: '목요일' }).click();
  await page.getByLabel('시작').selectOption('10:00');
  await page.getByLabel('끝').selectOption('13:00');
  await page.getByRole('button', { name: '＋ 일정 추가' }).click();
  await expect(page.locator('.entry')).toHaveCount(2);
  // 복약확인 매일 08:00–08:30
  for (const d of ['월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일']) await page.getByRole('button', { name: d, exact: true }).click();
  await page.getByLabel('시작').selectOption('08:00');
  await page.getByLabel('끝').selectOption('08:30');
  await page.getByLabel('돌봄 종류').selectOption('med_check');
  await page.getByRole('button', { name: '＋ 일정 추가' }).click();
  await expect(page.locator('.entry')).toHaveCount(9);
  // 삭제
  await page.getByRole('button', { name: /목요일 10:00부터 13:00까지 방문요양 일정 삭제/ }).click();
  await expect(page.locator('.entry')).toHaveCount(8);
  // 수정: 월 10–13 방문요양 → 화 14–17 방문요양
  await page.getByRole('button', { name: /월요일 10:00부터 13:00까지 방문요양 일정 수정/ }).click();
  await expect(page.getByRole('heading', { name: '일정 수정' })).toBeVisible();
  await page.getByRole('button', { name: '화요일', exact: true }).click();
  await page.getByLabel('시작').selectOption('14:00');
  await page.getByLabel('끝').selectOption('17:00');
  await page.getByRole('button', { name: '수정 저장' }).click();
  await expect(page.locator('.entry')).toHaveCount(8);
  await expect(page.locator('.entry', { hasText: '14:00–17:00' })).toContainText('화');
  await expect(page.locator('.entry', { hasText: '10:00–13:00' })).toHaveCount(0);
  await noHorizontalScroll(page);

  await page.getByRole('button', { name: 'Care Map 만들기' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Care Map');
  await page.getByRole('link', { name: '확인 필요한 영역 보기' }).click();
  await expect(page.getByTestId('gap-meds')).toHaveAttribute('data-status', 'confirmed_by_input');
  await expect(page.getByTestId('gap-night')).toHaveAttribute('data-status', 'needs_confirmation');
  await expect(page.getByTestId('gap-meal')).toHaveAttribute('data-status', 'covered_or_no_gap_detected');

  // 새로고침해도 유지(localStorage)
  await page.reload();
  await expect(page.getByTestId('gap-meds')).toHaveAttribute('data-status', 'confirmed_by_input');
});

test('관련 서비스 · 실제 공공데이터 기관 목록 · 미연결 데이터는 0/가짜로 표시하지 않음', async ({ page }) => {
  await page.getByRole('button', { name: '예시로 체험하기' }).click();
  await page.getByTestId('gap-night').getByRole('link', { name: '관련 서비스 찾아보기' }).click();
  await expect(page.getByTestId('svc-emergency_safety')).toBeVisible();
  await expect(page.getByTestId('dataset-ltc')).toContainText('VERIFIED PUBLIC DATA');
  await expect(page.getByTestId('dataset-ltc')).toContainText('국민건강보험공단_장기요양기관 평가결과');
  await expect(page.locator('.inst-card').first()).toBeVisible();

  await page.goto('./#/services/cognition');
  const dem = page.getByTestId('dataset-dementia');
  await expect(dem).toContainText('SOURCE NOT YET CONNECTED');
  await expect(dem.getByTestId('dataset-dementia-missing')).toBeVisible();
  await expect(dem).not.toContainText(/\b0곳|\b0개/);
  await expect(dem.locator('.inst-card')).toHaveCount(0);
  await noHorizontalScroll(page);
});

test('가족 공유 카드: 민감정보 기본 제외 · 글 생성', async ({ page }, info) => {
  await page.getByRole('button', { name: '예시로 체험하기' }).click();
  await page.goto('./#/share');
  const text = page.getByTestId('share-text');
  await expect(text).toContainText('이번 주 돌봄계획', { useInnerText: false } as never);
  const t = await text.textContent();
  expect(t).toContain('월  09–12 방문요양');
  expect(t).toContain('확인 필요: ');
  expect(t).not.toContain('82');
  expect(t).not.toContain('수원');
  await page.getByRole('button', { name: '＋ 응급대응 확인' }).click();
  await page.getByLabel('할 일', { exact: true }).fill('주민센터에 응급안전안심서비스 문의');
  await page.getByLabel(/담당/).fill('딸');
  await page.getByRole('button', { name: '할 일 추가' }).click();
  await expect(page.getByTestId('share-card')).toContainText('주민센터에 응급안전안심서비스 문의 — 딸');
  expect(await text.textContent()).toContain('가족 할 일:');
  expect(await text.textContent()).not.toContain('고혈압');
  await page.getByLabel('시·군·구').check();
  expect(await text.textContent()).toContain('수원시 장안구');
  const dl = page.waitForEvent('download');
  await page.getByRole('button', { name: '이미지로 저장' }).click();
  expect((await dl).suggestedFilename()).toContain('.png');
  await noHorizontalScroll(page);
  await page.screenshot({ path: `test-results/shots/${info.project.name}-share.png`, fullPage: true });
});
