import { test, expect } from "@playwright/test";

test("장례 도움: 합법 안내, 업체 이름 확인(있음/없음), 지역 필터", async ({ page }) => {
  await page.goto("/funeral");
  await expect(page.getByRole("heading", { name: "반려동물 장례 도움" })).toBeVisible();
  await expect(page.getByText(/땅에 묻는 것은 내 땅이라도 불법/)).toBeVisible();
  await expect(page.getByText(/30일 안에 등록 말소 신고/)).toBeVisible();

  await page.getByRole("textbox", { name: "업체 이름" }).fill("포포즈");
  await page.getByRole("button", { name: "확인" }).click();
  await expect(page.getByText(/공식 목록에서 \d+곳을 찾았어요/)).toBeVisible();

  await page.getByRole("textbox", { name: "업체 이름" }).fill("존재하지않는장례식장");
  await page.getByRole("button", { name: "확인" }).click();
  await expect(page.getByText(/공식 목록에서 찾지 못했어요/)).toBeVisible();

  await page.getByLabel("시·도").selectOption("서울특별시");
  await page.getByRole("button", { name: "보기" }).click();
  const cards = page.locator("section[aria-labelledby=list-h] li.card");
  await expect(cards).toHaveCount(1);
  await expect(cards.first().getByRole("link", { name: /📞/ })).toHaveAttribute("href", /^tel:/);
  await expect(page.getByText("서울에는 허가 업체가 1곳뿐이에요")).toBeVisible();
});
