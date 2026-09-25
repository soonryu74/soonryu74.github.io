import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test("실종·구조동물: 예시 표시, 키워드 필터, 보호소 전화, 빈 결과", async ({ page }) => {
  await page.goto("/lost");
  await expect(page.getByText(/예시 공고/).first()).toBeVisible();
  await page.getByLabel("색·품종·특징").fill("흰색 말티즈");
  await page.getByRole("button", { name: "찾기" }).click();
  const cards = page.locator("section[aria-labelledby=res-h] li.card");
  await expect(cards).toHaveCount(1);
  await expect(cards.first()).toContainText("말티즈");
  await expect(cards.first().getByRole("link", { name: /보호소 전화/ })).toHaveAttribute("href", "tel:020000103");
  await expect(cards.first()).toContainText(/공고 D-1|공고 오늘 끝/);
  await page.getByLabel("색·품종·특징").fill("존재하지않는특징");
  await page.getByRole("button", { name: "찾기" }).click();
  await expect(page.getByText("조건에 맞는 공고가 없어요")).toBeVisible();
});

test("비회원: 지난 방문 이후 올라온 공고에 '새 공고' 표시", async ({ page }) => {
  await page.goto("/lost?species=cat");
  await expect(page.locator("li.card", { hasText: "새 공고" })).toHaveCount(0); // 첫 방문은 기준 없음
  // 지난 방문을 5일 전으로 되돌린다
  await page.evaluate(() => {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)!;
      if (k.startsWith("petsafe365:lost-seen:")) localStorage.setItem(k, new Date(Date.now() - 5 * 86400000).toISOString().slice(0, 10));
    }
  });
  await page.reload();
  await expect(page.locator("section[aria-labelledby=res-h] h2")).toContainText("새 공고");
});

test("회원: 조건 저장 → 목록 표시 → 삭제", async ({ page }) => {
  await login(page, "lostwatch@example.test");
  await page.goto("/lost?species=dog&q=%ED%9D%B0%EC%83%89");
  await page.getByRole("button", { name: /새 공고 알림 받기/ }).click();
  await expect(page.getByText(/조건을 저장했어요/)).toBeVisible();
  const item = page.getByRole("link", { name: /🔔 개 · 흰색/ });
  await expect(item).toBeVisible();
  await item.click();
  await expect(page).toHaveURL(/watch=/);
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: /개 · 흰색 조건 삭제/ }).click();
  await expect(page.getByRole("link", { name: /🔔 개 · 흰색/ })).toHaveCount(0);
});
