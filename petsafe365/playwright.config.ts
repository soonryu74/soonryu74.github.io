import { defineConfig, devices } from "@playwright/test";

// 예시 모드(키 없음)로 빌드한 앱 두 벌을 확인한다.
//  - 가게 모드(기본):      npm run build            → 3100 포트
//  - 안전 앱을 켠 모드:    npm run build:safety     → 3101 포트
const mobile = { ...devices["Desktop Chrome"], viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true };
const SAFETY = /(core|safety|layout)\.spec\.ts/;

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: { locale: "ko-KR" },
  webServer: [
    { command: "npx next start -p 3100", url: "http://localhost:3100", reuseExistingServer: false, timeout: 120_000 },
    { command: "npx next start -p 3101", url: "http://localhost:3101", reuseExistingServer: false, timeout: 120_000, env: { NEXT_DIST_DIR: ".next-safety", NEXT_PUBLIC_SAFETY_APP: "on" } },
  ],
  projects: [
    { name: "shop-mobile", testMatch: /storefront\.spec\.ts/, use: { ...mobile, baseURL: "http://localhost:3100" } },
    { name: "shop-desktop", testMatch: /storefront\.spec\.ts/, use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 }, baseURL: "http://localhost:3100" } },
    { name: "safety-mobile", testMatch: SAFETY, use: { ...mobile, baseURL: "http://localhost:3101" } },
    { name: "safety-desktop", testMatch: /layout\.spec\.ts/, use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 }, baseURL: "http://localhost:3101" } },
  ],
});
