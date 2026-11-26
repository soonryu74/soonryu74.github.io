import type { NextConfig } from "next";

// 화면 대부분이 로그인 세션에 의존하는 클라이언트 화면이라 cacheComponents 는 쓰지 않는다.
const nextConfig: NextConfig = {
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
