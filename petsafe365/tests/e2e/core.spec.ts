import { expect, test } from "@playwright/test";
import { login, logout, registerPet } from "./helpers";

test("가입 → 반려동물 등록 → 할 일 완료 → 새로고침·재로그인 뒤에도 유지 → 기록 확인", async ({ page }) => {
  await login(page, "core@example.com");
  await registerPet(page, "콩이");

  // 규칙 엔진이 만든 기본 할 일 3개
  const complete = page.getByRole("button", { name: /완료$/ });
  await expect(complete).toHaveCount(3);
  await expect(page.getByText("동물등록 여부 확인하기")).toBeVisible();

  await page.getByRole("button", { name: "동물등록 여부 확인하기 완료" }).click();
  await expect(complete).toHaveCount(2);

  await page.reload();
  await expect(page.getByText("동물등록 여부 확인하기")).toBeVisible();
  await expect(page.getByRole("button", { name: /완료$/ })).toHaveCount(2);

  // 홈에 이름과 오늘 할 일이 보인다
  await page.goto("/");
  await expect(page.getByText("콩이").first()).toBeVisible();

  // 완료한 일이 타임라인에 남는다
  await page.goto("/pets");
  await page.getByRole("link", { name: /콩이|자세히|프로필/ }).first().click();
  await page.waitForURL(/\/pets\/.+/);
  await expect(page.getByText("동물등록 여부 확인하기").first()).toBeVisible();

  // 재로그인 뒤에도 유지
  await logout(page);
  await login(page, "core@example.com");
  await expect(page).toHaveURL(/\/today$/);
  await expect(page.getByRole("button", { name: /완료$/ })).toHaveCount(2);
});

test("다른 사용자의 pet_id 를 주소에 직접 넣어도 볼 수 없다", async ({ page }) => {
  await login(page, "owner@example.com");
  await registerPet(page, "보리");
  await page.goto("/pets");
  await page.locator('a[href^="/pets/"]').first().click();
  await page.waitForURL(/\/pets\/.+/);
  const petUrl = new URL(page.url()).pathname;
  await expect(page.getByText("보리").first()).toBeVisible();

  await logout(page);
  await login(page, "intruder@example.com");
  await page.goto(petUrl);
  await expect(page.getByText("볼 수 있는 권한이 없어요")).toBeVisible();
  await expect(page.getByText("보리")).toHaveCount(0);

  // 비로그인으로도 볼 수 없다
  await logout(page);
  await page.goto(petUrl);
  await expect(page.getByText("보리")).toHaveCount(0);
});

test("탈퇴하면 데이터가 지워진다", async ({ page }) => {
  await login(page, "leave@example.com");
  await registerPet(page, "모카");
  await page.goto("/more");
  await page.getByRole("button", { name: "탈퇴 진행하기" }).click();
  await page.getByLabel("확인을 위해 '탈퇴'라고 입력해 주세요").fill("탈퇴");
  await page.locator("form button[type=submit]").filter({ hasText: /탈퇴/ }).click();
  await page.waitForURL(/\/$/);
  await login(page, "leave@example.com");
  await expect(page).toHaveURL(/\/onboarding$/);
});
