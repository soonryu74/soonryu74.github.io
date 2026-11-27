import { expect, test } from "@playwright/test";

test("첫 화면이 가게이고 안전 앱 메뉴는 보이지 않는다", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("같이 놀");
  await expect(page.getByRole("link", { name: "놀이 친구 보러 가기" }).first()).toHaveAttribute("href", "/shop");
  await expect(page.getByRole("link", { name: /긴급 도움/ })).toHaveCount(0);
  for (const label of ["오늘", "우리 아이", "지도"]) await expect(page.getByRole("link", { name: label, exact: true })).toHaveCount(0);
  const text = await page.locator("main").innerText();
  for (const banned of ["마감 임박", "★", "무독성 인증", "100% 안전"]) expect(text).not.toContain(banned);
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(scrollWidth).toBeLessThanOrEqual(page.viewportSize()!.width);
});

test("꺼 둔 안전 앱 주소로 들어가면 닫혀 있다고 안내한다", async ({ page }) => {
  for (const route of ["/today", "/pets", "/emergency", "/map", "/insurance", "/reports", "/health/zoonoses/sfts"]) {
    await page.goto(route);
    await expect(page.getByText("이 기능은 지금 닫혀 있어요"), route).toBeVisible();
  }
});

test("상품을 보고 상세로 들어갈 수 있고, 판매 전임을 숨기지 않는다", async ({ page }) => {
  await page.goto("/");
  await page.locator('main a[href="/shop/leather-wool-set"]').first().click();
  await page.waitForURL(/\/shop\/leather-wool-set$/);
  await expect(page.getByRole("button", { name: "판매 준비 중" })).toBeDisabled();
});

test("출시 알림: 잘못된 이메일과 미동의는 막고, 신청하면 저장된다", async ({ page }) => {
  await page.goto("/");
  const submit = page.getByRole("button", { name: "출시 알림 받기" });
  await page.getByLabel("이메일", { exact: true }).fill("이상한주소");
  await submit.click();
  await expect(page.getByText("이메일 주소를 다시 확인해 주세요.")).toBeVisible();
  await page.getByLabel("이메일", { exact: true }).fill("fan@example.com");
  await submit.click();
  await expect(page.getByText("알림을 보내려면 동의가 필요해요.")).toBeVisible();
  await page.getByLabel(/출시 알림을 받기 위해/).check();
  await submit.click();
  await expect(page.getByText("신청했어요. 고맙습니다.")).toBeVisible();
});
