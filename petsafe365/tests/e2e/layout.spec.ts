import { expect, test } from "@playwright/test";

const ROUTES = ["/", "/login", "/emergency", "/map", "/health", "/health/zoonoses", "/health/zoonoses/rabies", "/reports", "/legal", "/legal/privacy", "/shop", "/shop/nlt-0012", "/partner", "/more", "/today", "/pets", "/records", "/insurance", "/onboarding"];

test("모든 화면이 가로로 넘치지 않고 제목과 본문 영역을 갖는다", async ({ page }) => {
  const width = page.viewportSize()!.width;
  for (const route of ROUTES) {
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth, `${route} 가로 넘침`).toBeLessThanOrEqual(width);
    await expect(page.locator("main#main"), route).toBeVisible();
    expect(await page.locator("main h1, main h2").count(), `${route} 제목`).toBeGreaterThan(0);
  }
});

test("폼 입력에는 모두 이름(label)이 있다", async ({ page }) => {
  for (const route of ["/login", "/map", "/partner"]) {
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    const unnamed = await page.evaluate(() =>
      [...document.querySelectorAll("main input, main select, main textarea")].filter((el) => {
        const e = el as HTMLInputElement;
        return !(e.labels && e.labels.length > 0) && !e.getAttribute("aria-label") && !e.getAttribute("aria-labelledby");
      }).length,
    );
    expect(unnamed, `${route} 이름 없는 입력`).toBe(0);
  }
});

test("키보드로 본문 건너뛰기와 긴급 도움에 닿을 수 있다", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "본문으로 건너뛰기" })).toBeFocused();
  await expect(page.getByRole("link", { name: /긴급 도움/ }).first()).toBeVisible();
});
