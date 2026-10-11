/* 테스트 실행기 — 새 패키지 없이 Vite 에 딸린 esbuild 로 테스트 파일을 묶어(JSON import 포함) Node 내장 테스트 러너로 돌린다.
   실행: cd app && npm test */
import { build } from "esbuild";
import { readdirSync, mkdirSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const dir = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(dir, ".out");
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
const files = readdirSync(dir).filter((f) => f.endsWith(".test.js"));
for (const f of files) {
  await build({ entryPoints: [path.join(dir, f)], bundle: true, platform: "node", format: "esm", outfile: path.join(out, f.replace(/\.js$/, ".mjs")), loader: { ".json": "json" }, logLevel: "warning" });
}
const r = spawnSync(process.execPath, ["--test", ...files.map((f) => path.join(out, f.replace(/\.js$/, ".mjs")))], { stdio: "inherit" });
process.exit(r.status ?? 1);
