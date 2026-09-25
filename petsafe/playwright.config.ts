import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";

const port = Number(process.env.PORT ?? 3100);
// 사전 설치된 Chromium이 있으면 사용(버전 차이로 인한 재다운로드 방지)
const preinstalled = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const executablePath = process.env.PW_CHROMIUM_PATH || (existsSync(preinstalled) ? preinstalled : undefined);

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: "retain-on-failure",
    locale: "ko-KR",
    timezoneId: "Asia/Seoul",
    launchOptions: executablePath ? { executablePath } : undefined,
  },
  projects: [
    { name: "mobile-360", use: { ...devices["Pixel 5"], viewport: { width: 360, height: 780 } } },
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, testMatch: /layout\.spec\.ts/ },
  ],
  webServer: {
    // 예시 모드(Supabase 미설정)로 production 서버를 띄워 핵심 흐름을 검증한다. 먼저 `npm run build` 필요.
    command: `rm -rf .demo-data/e2e && npx next start -p ${port}`,
    url: `http://127.0.0.1:${port}/`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
      PETSAFE_DEMO_DIR: ".demo-data/e2e",
      ADMIN_BOOTSTRAP_EMAIL: "admin@example.test",
    },
  },
});
