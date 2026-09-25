import { test, expect } from "@playwright/test";
import { login, registerPet } from "./helpers";

test("떠나보냄 기록 → 함께한 날들 → 편지 → 오늘 할 일에서 제외 → 되돌리기", async ({ page }) => {
  await login(page, "memorial@example.test");
  await registerPet(page, "별이");
  // 할 일 하나 완료해 돌봄 기록을 만든다
  const first = page.locator("section[aria-labelledby=pending-h] li.card").first();
  await first.getByRole("button", { name: /완료$/ }).click();
  await expect(page.locator("section[aria-labelledby=done-h]")).toBeVisible();

  await page.goto("/pets");
  await page.getByRole("link", { name: "상세·수정" }).click();
  await page.getByRole("button", { name: "별이를(을) 떠나보냈어요" }).click();
  await page.getByRole("button", { name: "기록하기" }).click();
  await page.waitForURL(/\/memorial$/);
  await expect(page.getByRole("heading", { level: 1, name: "별이" })).toBeVisible();
  await expect(page.getByText(/함께한 날/).first()).toBeVisible();
  await expect(page.locator("section[aria-labelledby=care-h]")).toContainText("챙긴 할 일");
  await expect(page.locator("section[aria-labelledby=care-h] dd").first()).toHaveText("1");

  await page.getByLabel("별이에게 하고 싶은 말").fill("고마웠어, 별이야");
  await page.getByRole("button", { name: "편지 남기기" }).click();
  await expect(page.getByText("편지를 남겼어요.")).toBeVisible();
  await page.reload();
  await expect(page.getByText("고마웠어, 별이야")).toBeVisible();

  // 돌봄 대상에서 빠진다
  await page.goto("/today");
  await expect(page.getByText("먼저 우리 아이를 등록해 주세요")).toBeVisible();
  await page.goto("/pets");
  await expect(page.getByRole("heading", { name: "추억 속 아이들" })).toBeVisible();

  // 되돌리기
  await page.getByRole("link", { name: /별이/ }).click();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: /되돌리기/ }).click();
  await page.waitForURL(/\/pets\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("button", { name: "별이를(을) 떠나보냈어요" })).toBeVisible();
});
