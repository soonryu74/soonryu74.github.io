import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: /e2e\.spec\.mjs/,
  timeout: 90_000,
  reporter: [['list']],
  use: {
    baseURL: process.env.BASE_URL || 'http://127.0.0.1:4181/movesafe/',
    launchOptions: process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
    locale: 'ko-KR',
  },
  projects: [
    { name: 'mobile-390', use: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } },
    { name: 'desktop-1440', use: { viewport: { width: 1440, height: 900 } } },
  ],
  webServer: {
    command: 'python3 -m http.server 4181 --bind 127.0.0.1 --directory ..',
    url: 'http://127.0.0.1:4181/movesafe/',
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
