import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // 문서 업로드(최대 10MB) 허용. 파일 검증은 서버 액션에서 다시 한다.
  experimental: { serverActions: { bodySizeLimit: "11mb" } },
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        // 위치 권한은 사용자가 버튼을 눌렀을 때만 요청한다. 기타 센서는 차단.
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
      ],
    },
  ],
};

export default nextConfig;
