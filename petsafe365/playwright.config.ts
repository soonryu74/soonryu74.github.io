import { defineConfig, devices } from "@playwright/test";

// 예시 모드(키 없음)로 빌드한 앱을 대상으로 핵심 흐름을 확인한다. 먼저 `npm run build` 가 필요하다.
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: { baseURL: "http://localhost:3100", locale: "ko-KR" },
  webServer: { command: "npx next start -p 3100", url: "http://localhost:3100", reuseExistingServer: true, timeout: 120_000 },
  projects: [
    { name: "mobile-360", use: { ...devices["Desktop Chrome"], viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true } },
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } }, testMatch: /layout\.spec\.ts/ },
  ],
});
