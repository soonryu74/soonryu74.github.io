import { expect, type Page } from "@playwright/test";

export async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("이메일").fill(email);
  await page.getByRole("button", { name: "예시 모드로 로그인" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
  await page.waitForLoadState("networkidle");
  await acceptConsent(page);
  await page.waitForLoadState("networkidle"); // 동의 후 리다이렉트가 끝난 뒤 다음 이동
}

export async function acceptConsent(page: Page) {
  await page.goto("/consent");
  if (!(await page.getByRole("heading", { name: "시작 전에 확인해 주세요" }).count())) return;
  for (const name of ["서비스 이용약관", "개인정보 처리방침", "위치정보 안내", "저작권·이용자 게시물 정책"]) {
    await page.getByRole("checkbox", { name: `[필수] ${name} 동의` }).check();
  }
  await page.getByRole("button", { name: "동의하고 시작하기" }).click();
  await page.waitForURL((u) => u.pathname !== "/consent");
}

export async function registerPet(page: Page, name: string, species: "반려견" | "반려묘" = "반려견", vetPhone?: string) {
  await page.goto("/onboarding");
  await page.getByLabel(new RegExp(species)).check();
  await page.getByLabel(/^이름/).fill(name);
  await page.getByRole("button", { name: "다음" }).click();
  await page.getByRole("button", { name: "다음" }).click();
  await page.getByRole("button", { name: "다음" }).click();
  if (vetPhone) {
    await page.getByLabel("다니는 동물병원").fill("예시 동물병원");
    await page.getByLabel("병원 전화번호").fill(vetPhone);
  }
  await page.getByRole("button", { name: "등록하고 오늘 할 일 보기" }).click();
  await page.waitForURL(/\/today/);
  await expect(page.getByRole("heading", { name: `${name}의 오늘 할 일` })).toBeVisible();
}
