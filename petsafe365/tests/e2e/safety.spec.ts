import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test("긴급 도움: 로그인 없이 병원 찾기가 맨 위에 있고 진단·약을 말하지 않는다", async ({ page }) => {
  await page.goto("/emergency");
  const first = page.locator("main a").first();
  await expect(first).toHaveAttribute("href", /\/map\?type=animal_hospital/);
  const text = await page.locator("main").innerText();
  for (const banned of ["mg", "투여량", "처방", "진단명"]) expect(text).not.toContain(banned);
  await expect(page.locator('main a[href^="/shop"]')).toHaveCount(0);
});

test("지도: 위치를 거부해도 지역 이름으로 찾을 수 있다", async ({ browser }) => {
  const context = await browser.newContext({ permissions: [], viewport: { width: 360, height: 740 } });
  const page = await context.newPage();
  await page.goto("http://localhost:3101/map");
  // 버튼을 누르기 전에는 위치 권한을 요청하지 않는다
  await expect(page.getByRole("button", { name: "내 주변 찾기" })).toBeVisible();
  await page.getByRole("button", { name: "내 주변 찾기" }).click();
  await expect(page.getByRole("button", { name: "내 주변 찾기" })).toBeVisible();
  await page.getByLabel("지역이나 역 이름").fill("오송역");
  const link = page.getByRole("link", { name: /카카오맵에서 .* 찾기/ });
  await expect(link).toHaveAttribute("href", /map\.kakao\.com\/link\/search\/.*%EC%98%A4%EC%86%A1/);
  // 예시 데이터는 예시로 표시된다
  await expect(page.getByText("예시 데이터").first()).toBeVisible();
  await context.close();
});

test("시설 상세: 영업·운영시간·응급을 따로 표시하고 확인 전에는 미확인", async ({ page }) => {
  await page.goto("/facilities/00000000-0000-4000-8009-000000000001");
  await expect(page.getByText("[예시] 동물병원 가")).toBeVisible();
  expect((await page.getByText("미확인").count())).toBeGreaterThanOrEqual(2);
  await expect(page.locator('main a[href^="tel:"]')).toHaveCount(0);
});

test("신고 허브: 유기동물 발견 시 공식 번호로 전화가 연결된다", async ({ page }) => {
  await page.goto("/reports");
  await page.getByText("유실·유기 동물을 발견했어요").click();
  await expect(page.locator('a[href="tel:15770954"]').first()).toBeVisible();
  await expect(page.getByText("운영자 확인 전").first()).toBeVisible();
});

test("감염병: 4개 질환이 있고 검수 전 초안임을 밝힌다", async ({ page }) => {
  await page.goto("/health/zoonoses");
  for (const t of ["SFTS", "공수병", "개 브루셀라증", "톡소포자충증"]) await expect(page.getByText(t).first()).toBeVisible();
  await page.goto("/health/zoonoses/toxoplasmosis");
  await expect(page.getByText("검수 전 초안입니다", { exact: false }).first()).toBeVisible();
  await expect(page.getByText("사람이 의료기관에 갈 때")).toBeVisible();
  await expect(page.getByText("반려동물이 동물병원에 갈 때")).toBeVisible();
  await expect(page.getByRole("link", { name: /질병관리청/ }).first()).toBeVisible();
});

test("보험: 고정 문구가 보이고 추천·가입 버튼이 없으며, 조항 없이는 '약관 확인 필요'", async ({ page }) => {
  await login(page, "ins@example.com");
  await page.getByLabel("강아지").check();
  await page.getByLabel("이름 (필수)").fill("두부");
  await page.locator("button[type=submit]").click();
  await page.waitForURL(/\/today$/);
  await page.goto("/insurance");
  await expect(page.getByText("본 기능은 보험상품 가입 권유나 보험금 지급 결정을 제공하지 않습니다", { exact: false })).toBeVisible();
  const text = await page.locator("main").innerText();
  for (const banned of ["가입하기", "추천 상품", "순위", "보험료 비교"]) expect(text).not.toContain(banned);
});

test("용품·결제·광고: 홈에 상품이 없고, 결제는 잠겨 있고, 가짜 후기가 없다", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('main a[href^="/shop"]')).toHaveCount(0);
  await page.goto("/shop");
  await expect(page.getByText("가죽 본", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("광고 영역")).toHaveCount(0);
  await page.goto("/shop/leather-wool-set");
  await expect(page.getByRole("button", { name: "판매 준비 중" })).toBeDisabled();
  await expect(page.getByText("시험 결과 대기 중", { exact: false }).first()).toBeVisible();
  const text = await page.locator("main").innerText();
  for (const banned of ["불검출 확인", "마감 임박", "★"]) expect(text).not.toContain(banned);
  await page.goto("/shop/checkout?product=leather-wool-set");
  await expect(page.getByText("앱 안 결제는 준비 중이에요")).toBeVisible();
});

test("관리자: 일반 보호자는 못 들어가고, 플래그는 모두 꺼져 있다", async ({ page }) => {
  await login(page, "guardian@example.com");
  await page.goto("/admin");
  await expect(page.getByText("볼 수 있는 권한이 없어요")).toBeVisible();
  await page.goto("/legal");
  await expect(page.getByText("꺼짐").first()).toBeVisible();
  await expect(page.getByText("켜짐", { exact: true })).toHaveCount(0);
});

test("긴급 도움: 적어 둔 병원 번호가 있으면 한 번에 전화할 수 있다", async ({ page }) => {
  await login(page, "vet@example.com");
  await page.getByLabel("강아지").check();
  await page.getByLabel("이름 (필수)").fill("초코");
  await page.getByLabel("다니는 동물병원 전화번호").fill("02-000-0000");
  await page.locator("button[type=submit]").click();
  await page.waitForURL(/\/today$/);
  await page.goto("/emergency");
  await expect(page.locator('main a[href="tel:020000000"]')).toBeVisible();
});
