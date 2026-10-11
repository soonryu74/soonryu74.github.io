import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";
import { execSync } from "node:child_process";

// 빌드 번호(외부 검토 기록이 「어느 버전을 검토했는지」 가리키는 기준): 빌드할 때의 git 짧은 커밋 해시 + 날짜
const sh = (c) => { try { return execSync(c, { stdio: ["ignore", "pipe", "ignore"] }).toString().trim(); } catch { return ""; } };
const BUILD = { commit: sh("git rev-parse --short HEAD") || "dev", date: new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10) };   // 날짜는 한국 시간

// 단일 HTML로 인라인: file:// 로도 열리고 어디든(GitHub Pages/Vercel) 그대로 배포 가능
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  define: { __BUILD__: JSON.stringify(BUILD) },
});
