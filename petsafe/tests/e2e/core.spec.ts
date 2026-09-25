import { test, expect } from "@playwright/test";
import { login, registerPet } from "./helpers";

test("가입 → 반려동물 등록 → 할 일 완료 → 기록 확인 → 재로그인 후 유지", async ({ page, context }) => {
  await login(page, "guardian1@example.test");
  // 첫 로그인은 동의 후 온보딩으로 이동
  await registerPet(page, "초코");
  const pending = page.getByRole("region", { name: /해야 할 일/ }).or(page.locator("section[aria-labelledby=pending-h]"));
  const cards = page.locator("section[aria-labelledby=pending-h] li.card");
  await expect(cards).toHaveCount(3);

  // 첫 할 일 완료
  const firstTitle = (await cards.first().locator("h3").innerText()).trim();
  await cards.first().getByRole("button", { name: /완료$/ }).click();
  await expect(page.locator("section[aria-labelledby=done-h]")).toContainText(firstTitle);
  await expect(page.locator("section[aria-labelledby=pending-h] li.card")).toHaveCount(2);
  void pending;

  // 두 번째는 미루기 + 세 번째는 메모
  await page.locator("section[aria-labelledby=pending-h] li.card").first().getByRole("button", { name: /내일로 미루기/ }).click();
  await expect(page.locator("section[aria-labelledby=pending-h] li.card")).toHaveCount(1);
  const last = page.locator("section[aria-labelledby=pending-h] li.card").first();
  await last.getByText(/메모 남기기/).click();
  await last.getByRole("textbox").fill("오늘은 산책 짧게");
  await last.getByRole("button", { name: "메모 저장" }).click();
  await expect(last).toContainText("오늘은 산책 짧게");

  // 새로고침 후 유지
  await page.reload();
  await expect(page.locator("section[aria-labelledby=done-h]")).toContainText(firstTitle);
  await expect(page.locator("section[aria-labelledby=pending-h]")).toContainText("오늘은 산책 짧게");

  // 타임라인에 기록
  await page.goto("/records");
  await expect(page.locator("section[aria-labelledby=tl-h]")).toContainText(firstTitle);

  // 로그아웃 → 재로그인 후 유지
  await page.goto("/account");
  await page.getByRole("button", { name: "로그아웃" }).click();
  await context.clearCookies();
  await login(page, "guardian1@example.test");
  await page.goto("/today");
  await expect(page.locator("section[aria-labelledby=done-h]")).toContainText(firstTitle);
});

test("여러 마리 등록·전환, 수정, 삭제 전 재확인", async ({ page }) => {
  await login(page, "multi@example.test");
  await registerPet(page, "보리");
  await registerPet(page, "나비", "반려묘");
  await page.goto("/pets");
  await expect(page.getByRole("heading", { name: "보리" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "나비" })).toBeVisible();
  // 전환
  await page.goto("/today");
  await page.getByRole("button", { name: /보리/ }).click();
  await expect(page.getByRole("heading", { name: "보리의 오늘 할 일" })).toBeVisible();
  // 고양이 할 일에는 반려견 전용 항목이 없다
  await page.getByRole("button", { name: /나비/ }).click();
  await expect(page.getByRole("heading", { name: "나비의 오늘 할 일" })).toBeVisible();
  await expect(page.locator("main")).not.toContainText("산책 전 목줄");

  // 수정
  await page.goto("/pets");
  await page.locator("li", { hasText: "나비" }).getByRole("link", { name: "상세·수정" }).click();
  await page.getByLabel("체중(kg)").fill("4.2");
  await page.getByRole("button", { name: "저장", exact: true }).click();
  await expect(page.getByText("저장했어요.")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("체중(kg)")).toHaveValue("4.2");

  // 삭제: 이름이 틀리면 거부
  await page.getByRole("button", { name: "삭제하기…" }).click();
  await page.getByLabel(/확인을 위해 이름/).fill("나비아님");
  await page.getByRole("button", { name: "영구 삭제" }).click();
  await expect(page.getByText("이름이 일치하지 않아요.")).toBeVisible();
  await page.getByLabel(/확인을 위해 이름/).fill("나비");
  await page.getByRole("button", { name: "영구 삭제" }).click();
  await page.waitForURL(/\/pets\?deleted=1/);
  await expect(page.getByRole("heading", { name: "나비" })).toHaveCount(0);
});

test("다른 사용자의 pet_id·문서에 직접 접근할 수 없다", async ({ browser }) => {
  const a = await browser.newContext();
  const pa = await a.newPage();
  await login(pa, "owner-a@example.test");
  await registerPet(pa, "몽이");
  await pa.goto("/pets");
  await pa.getByRole("link", { name: "상세·수정" }).click();
  await pa.waitForURL(/\/pets\/[0-9a-f-]{36}$/);
  const petUrl = pa.url();
  // 문서 업로드
  await pa.goto("/records");
  await pa.getByLabel("파일").setInputFiles({ name: "receipt.png", mimeType: "image/png", buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]) });
  await pa.getByLabel(/본인 소유 자료/).check();
  await pa.getByRole("button", { name: "비공개로 올리기" }).click();
  await expect(pa.getByText("비공개로 저장했어요.")).toBeVisible();
  const docHref = await pa.getByRole("link", { name: /receipt\.png/ }).getAttribute("href");
  expect(docHref).toMatch(/^\/api\/documents\//);
  const own = await pa.request.get(docHref!);
  expect(own.status()).toBe(200);

  const b = await browser.newContext();
  const pb = await b.newPage();
  await login(pb, "intruder-b@example.test");
  await pb.goto(petUrl);
  await expect(pb.getByRole("heading", { name: "찾을 수 없어요" })).toBeVisible();
  await expect(pb.locator("main")).not.toContainText("몽이");
  const other = await pb.request.get(docHref!);
  expect(other.status()).toBe(404);
  const anon = await (await browser.newContext()).request.get(new URL(docHref!, pa.url()).toString());
  expect(anon.status()).toBe(401);
  await a.close(); await b.close();
});

test("잘못된 파일은 업로드를 거부한다", async ({ page }) => {
  await login(page, "upload@example.test");
  await registerPet(page, "하루");
  await page.goto("/records");
  await page.getByLabel("파일").setInputFiles({ name: "evil.png", mimeType: "image/png", buffer: Buffer.from("<script>alert(1)</script>") });
  await page.getByLabel(/본인 소유 자료/).check();
  await page.getByRole("button", { name: "비공개로 올리기" }).click();
  await expect(page.getByText("파일 내용이 확장자와 맞지 않아요.")).toBeVisible();
});
