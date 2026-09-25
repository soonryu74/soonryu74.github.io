import { test, expect } from "@playwright/test";
import { login, registerPet } from "./helpers";

test("긴급: 진단 없이 행동 안내, 병원 전화·병원 찾기가 한 번의 탭", async ({ page }) => {
  await login(page, "emergency@example.test");
  await registerPet(page, "콩이", "반려견", "02-000-1234");
  await page.goto("/emergency");
  const call = page.getByRole("link", { name: /예시 동물병원에 전화/ });
  await expect(call).toHaveAttribute("href", "tel:020001234");
  await expect(page.getByRole("link", { name: /가까운 동물병원 찾기/ })).toHaveAttribute("href", "/map?type=animal_hospital&from=emergency");
  await page.getByRole("checkbox", { name: /무언가를 잘못 먹은 것 같음/ }).check();
  await expect(page.getByText("집에서 토하게 하기")).toBeVisible();
  await page.getByLabel(/먹은 것·제품명/).fill("초콜릿");
  await page.getByRole("button", { name: "건강 기록에 저장" }).click();
  await expect(page.getByText("건강 기록에 저장했어요.")).toBeVisible();
  await page.goto("/records");
  await expect(page.locator("main")).toContainText("먹은 것/제품: 초콜릿");
});

test("긴급 화면은 로그인 없이 열리고 병원 찾기로 이어진다", async ({ page }) => {
  await page.goto("/emergency");
  await expect(page.getByRole("heading", { name: "긴급 도움" })).toBeVisible();
  await page.getByRole("link", { name: /가까운 동물병원 찾기/ }).click();
  await expect(page).toHaveURL(/\/map\?type=animal_hospital/);
  await expect(page.locator("main")).toContainText("24시간·응급 미확인");
});

test.describe("위치 거부", () => {
  test("위치 권한이 거부돼도 주소 검색으로 지도를 쓸 수 있다", async ({ page }) => {
    // 사용자가 권한 요청에서 '차단'을 누른 상황을 재현하고, 요청 횟수를 센다
    await page.addInitScript(() => {
      (window as unknown as { __geoCalls: number }).__geoCalls = 0;
      Object.defineProperty(navigator, "geolocation", { value: { getCurrentPosition: (_ok: unknown, err: (e: unknown) => void) => {
        (window as unknown as { __geoCalls: number }).__geoCalls++;
        err({ code: 1, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3, message: "denied" });
      } } });
    });
    await page.goto("/map");
    expect(await page.evaluate(() => (window as unknown as { __geoCalls: number }).__geoCalls)).toBe(0);
    // 페이지 진입만으로는 위치를 요청하지 않는다
    await page.getByRole("button", { name: "📍 내 주변 찾기" }).click();
    await expect(page.getByText(/위치 권한이 거부됐어요/)).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as { __geoCalls: number }).__geoCalls)).toBe(1);
    await page.getByLabel("주소·동네·시설 이름").fill("종로구");
    await page.getByRole("button", { name: "검색" }).click();
    await expect(page).toHaveURL(/q=%EC%A2%85%EB%A1%9C%EA%B5%AC/);
    const items = page.locator("main li.card");
    await expect(items.first()).toContainText("종로구");
    await expect(page.getByText("예시 데이터 포함")).toBeVisible();
  });
});

test("지도: 폐업은 기본 제외, 빈 결과 상태, 시설 상세의 상태 배지 분리", async ({ page }) => {
  await page.goto("/map?type=animal_hospital");
  await expect(page.locator("main")).not.toContainText("폐업 이력");
  await page.goto("/map?type=animal_hospital&closed=1");
  await expect(page.locator("main")).toContainText("폐업 이력");
  await page.goto("/map?q=존재하지않는동네");
  await expect(page.getByText("조건에 맞는 시설이 없어요")).toBeVisible();
  await page.goto("/map?type=pet_cafe");
  await page.getByRole("link", { name: "예시 반려동물 동반 카페" }).click();
  await expect(page.getByText("허가상 영업", { exact: true })).toBeVisible();
  await expect(page.getByText("운영시간 확인", { exact: true })).toBeVisible();
  await expect(page.getByText("실제 영업 중", { exact: true })).toBeVisible();
  await expect(page.getByText("예시 데이터 — 실제 업체 아님")).toBeVisible();
  await expect(page.locator("main")).toContainText("크기 제한");
});

test("감염병: 검수 전 비공개 → 관리자 검수·승인·게시 → 공개", async ({ page, browser }) => {
  await page.goto("/health/zoonoses/sfts");
  await expect(page.getByText("전문가 검수 중")).toBeVisible();
  await expect(page.locator("main")).not.toContainText("참진드기에 물려 감염");

  // 일반 사용자는 관리 화면 접근 불가
  await login(page, "normal@example.test");
  await page.goto("/admin/content");
  await expect(page.getByText("접근 권한이 없어요")).toBeVisible();

  const ctx = await browser.newContext();
  const admin = await ctx.newPage();
  await login(admin, "admin@example.test");
  await admin.goto("/admin/content");
  const sfts = admin.locator("li.card", { hasText: "/sfts" });
  // 검수 기록 없이 승인 시도 → 거부
  await sfts.getByRole("button", { name: "→ 승인됨" }).click();
  await expect(sfts.getByText("검수자와 검토일을 먼저 기록해 주세요.")).toBeVisible();
  await sfts.getByLabel("검수자 이름").fill("홍수의");
  await sfts.getByLabel("검수자 자격").fill("수의사");
  await sfts.getByRole("button", { name: "검수 기록" }).click();
  await expect(sfts.getByText("검수 정보를 기록했어요.")).toBeVisible();
  await sfts.getByRole("button", { name: "→ 승인됨" }).click();
  await expect(sfts.getByRole("button", { name: "→ 게시 중" })).toBeVisible();
  await sfts.getByRole("button", { name: "→ 게시 중" }).click();
  await expect(sfts.getByText("공개 중")).toBeVisible();

  // 감사로그
  await admin.goto("/admin/audit");
  await expect(admin.locator("main")).toContainText("content.status_changed");
  await ctx.close();

  await page.goto("/health/zoonoses/sfts");
  await expect(page.locator("main")).toContainText("참진드기에 물려 감염");
  await expect(page.locator("main")).toContainText("검수 홍수의 (수의사)");
  await expect(page.getByRole("heading", { name: /사람이 의료기관에 갈 때/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /반려동물이 동물병원에 갈 때/ })).toBeVisible();
});

test("보험: 약관 입력·3단계 확인·고정 문구, 추천·가입 버튼 없음", async ({ page }) => {
  await login(page, "insured@example.test");
  await registerPet(page, "두부");
  await page.goto("/insurance");
  await expect(page.getByText(/보험상품 가입 권유나 보험금 지급 결정을 제공하지 않습니다/)).toBeVisible();
  await page.getByRole("textbox", { name: "보험사", exact: true }).fill("예시손해보험");
  await page.getByLabel(/^상품명/).fill("예시 펫보험");
  await page.getByLabel(/^약관 버전/).fill("2026.01");
  await page.getByRole("button", { name: "보험 정보 저장" }).click();
  await expect(page.getByText("예시손해보험 · 예시 펫보험")).toBeVisible();

  await page.getByText("조항 추가").click();
  await page.getByLabel("진료 유형", { exact: true }).selectOption("dental");
  await page.getByLabel("약관상 구분").selectOption("excluded");
  await page.getByLabel(/^약관 문구/).fill("치석 제거(스케일링)는 보상하지 않습니다.");
  await page.getByRole("button", { name: "조항 저장" }).click();
  await expect(page.getByText("약관 조항을 저장했어요.")).toBeVisible();

  await page.getByLabel("진료 유형 또는 영수증 항목").selectOption("dental");
  await page.getByRole("button", { name: "확인하기" }).click();
  await expect(page.getByText("결과: 일반적 제외")).toBeVisible();
  const check = page.locator("section[aria-labelledby=check-h] li").first();
  await expect(check).toContainText("내가 입력한 약관");
  await expect(check).toContainText("약관 버전: 2026.01");
  await expect(check).toContainText("최종 지급 여부는 보험사가 약관과 심사를 통해 결정합니다.");
  await expect(page.getByRole("button", { name: /가입|추천/ })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /가입하기|추천/ })).toHaveCount(0);
});

test("신고: 공식 연락처·확인일, 검증 전 번호 미게시, 기기 저장", async ({ page }) => {
  await page.goto("/reports?situation=lost_found");
  await expect(page.getByRole("link", { name: /1577-0954/ })).toHaveAttribute("href", "tel:15770954");
  await expect(page.locator("main")).toContainText("최근 확인");
  await page.goto("/reports?situation=illegal_practice");
  await expect(page.getByText("운영자 확인 대기 — 번호 미게시")).toBeVisible();
  await page.goto("/reports?situation=abuse");
  await expect(page.getByRole("link", { name: /112/ })).toHaveAttribute("href", "tel:112");
  await page.getByLabel("장소(동네·건물 수준)").fill("예시동 공원 입구");
  await page.getByRole("button", { name: "이 기기에 저장" }).click();
  await expect(page.getByText("이 기기(브라우저)에만 저장했어요.")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("장소(동네·건물 수준)")).toHaveValue("예시동 공원 입구");
});

test("탈퇴·데이터 내려받기", async ({ page }) => {
  await login(page, "leaver@example.test");
  await registerPet(page, "구름");
  const res = await page.request.get("/api/account/export");
  expect(res.status()).toBe(200);
  const data = await res.json();
  expect(data.pets[0].name).toBe("구름");
  expect(data.consents.length).toBe(4);
  await page.goto("/account");
  await page.getByLabel(/탈퇴합니다/).fill("탈퇴합니다");
  await page.getByRole("button", { name: "탈퇴하기" }).click();
  await expect(page.getByText("탈퇴가 완료됐어요.")).toBeVisible();
  await page.goto("/today");
  await expect(page.getByText("로그인이 필요해요")).toBeVisible();
});
