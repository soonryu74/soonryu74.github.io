import { defineConfig } from '@playwright/test';

// 저장소 루트를 정적 서버로 띄우고 /sportsgap/ 을 연다 (GitHub Pages 경로와 동일)
export default defineConfig({
  testDir: './tests',
  testMatch: /e2e\.spec\.mjs/,
  timeout: 60_000,
  reporter: [['list']],
  use: {
    baseURL: process.env.BASE_URL || 'http://127.0.0.1:4180/sportsgap/',
    launchOptions: process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
    locale: 'ko-KR',
  },
  projects: [
    { name: 'mobile-390', use: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } },
    { name: 'desktop-1440', use: { viewport: { width: 1440, height: 900 } } },
  ],
  webServer: {
    command: 'python3 -m http.server 4180 --bind 127.0.0.1 --directory ..',
    url: 'http://127.0.0.1:4180/sportsgap/',
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
