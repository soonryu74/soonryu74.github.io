import type { NextConfig } from "next";

// 화면 대부분이 로그인 세션에 의존하는 클라이언트 화면이라 cacheComponents 는 쓰지 않는다.
const nextConfig: NextConfig = {
  // 안전 앱을 켠 빌드를 따로 시험할 때 출력 폴더를 나눈다 (tests/e2e 참고).
  distDir: process.env.NEXT_DIST_DIR || ".next",
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
