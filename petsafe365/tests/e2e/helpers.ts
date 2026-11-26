import { expect, type Page } from "@playwright/test";

/** 예시 모드 로그인. 아무 이메일이나 바로 로그인된다. */
export async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("이메일 (필수)").fill(email);
  await page.getByLabel("서비스 이용약관에 동의해요 (필수)").check();
  await page.getByLabel("개인정보 처리에 동의해요 (필수)").check();
  await page.locator("button[type=submit]").click();
  await page.waitForURL(/\/(onboarding|today)$/);
}

export async function registerPet(page: Page, name: string) {
  await expect(page).toHaveURL(/\/onboarding$/);
  await page.getByLabel("강아지").check();
  await page.getByLabel("이름 (필수)").fill(name);
  await page.getByLabel("체중 (kg)").fill("4.2");
  await page.locator("button[type=submit]").click();
  await page.waitForURL(/\/today$/);
}

export async function logout(page: Page) {
  await page.goto("/more");
  await page.getByRole("button", { name: "로그아웃" }).click();
  await expect(page.getByRole("link", { name: /로그인/ }).first()).toBeVisible();
}
