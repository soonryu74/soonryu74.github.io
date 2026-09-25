import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.PORT ?? 3100);

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: "retain-on-failure",
    ...devices["Pixel 5"],
  },
  webServer: {
    // 예시 모드(Supabase 미설정)로 서버를 띄워 핵심 흐름을 검증한다.
    command: `PETSAFE_DEMO_DIR=.demo-data/e2e npm run start -- --port ${port}`,
    url: `http://127.0.0.1:${port}/`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: { NEXT_PUBLIC_SUPABASE_URL: "", NEXT_PUBLIC_SUPABASE_ANON_KEY: "" },
  },
});
