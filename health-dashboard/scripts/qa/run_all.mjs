/* 전체 점검을 한 번에 돌리고 결과를 data/qa_status.json 에 기록한다(/solve 「What is real today」와 docs/COMPETITION_EVIDENCE.md 가 읽음).
   - 빌드된 산출물(index.html · solve/ · global/ · docs/)을 임시 폴더에 복사해 로컬 서버(8931)로 띄우고, 각 점검을 BASE 로 실행한다.
   - Global v0.1 대비 신호 동일성 점검: 로컬 태그 pre-global-v0.2 가 있으면 그 시점 global/ 을 8932 로 띄워 BASE_V01 로 넘긴다.
   - 점검 결과는 출력의 ✔/✘ 줄과 종료 코드로 센다. 하나라도 실패하면 종료 코드 1.
   실행: python3 scripts/build_dashboard.py → node scripts/qa/run_all.mjs → (숫자 반영) python3 scripts/build_dashboard.py */
import { spawn, spawnSync, execSync } from "node:child_process";
import { mkdtempSync, cpSync, writeFileSync, existsSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PORT = 8931, PORT_V01 = 8932;
const stage = mkdtempSync(path.join(tmpdir(), "hd_qa_"));
for (const f of ["index.html", "solve", "global", "docs"]) cpSync(path.join(ROOT, f), path.join(stage, f), { recursive: true, filter: (s) => !s.includes(`${path.sep}global${path.sep}src`) });
const OUT = path.join(stage, "_shots"); mkdirSync(OUT, { recursive: true });
const servers = [spawn("python3", ["-m", "http.server", String(PORT), "--bind", "127.0.0.1"], { cwd: stage, stdio: "ignore" })];

let BASE_V01 = null;
const hasTag = spawnSync("git", ["rev-parse", "-q", "--verify", "refs/tags/pre-global-v0.2"], { cwd: ROOT }).status === 0;
if (hasTag) {
  const v01 = path.join(stage, "_v01"); mkdirSync(v01, { recursive: true });
  execSync(`git archive pre-global-v0.2 health-dashboard/global | tar -x -C "${v01}"`, { cwd: path.join(ROOT, "..") });
  servers.push(spawn("python3", ["-m", "http.server", String(PORT_V01), "--bind", "127.0.0.1"], { cwd: path.join(v01, "health-dashboard"), stdio: "ignore" }));
  BASE_V01 = `http://127.0.0.1:${PORT_V01}/global/`;
}
await new Promise((r) => setTimeout(r, 1200));

const BASE = `http://127.0.0.1:${PORT}`;
const env = { ...process.env, BASE, OUT };
const suites = [
  { id: "unit", name: "Unit tests (priority engine, data, reports)", cmd: ["npm", ["test"], { cwd: path.join(ROOT, "app") }], tap: true },
  { id: "korea_e2e", name: "Korea app — routes, Health Equity Priority, mobile, dark mode", cmd: ["node", ["scripts/qa/equity_e2e.mjs"]] },
  { id: "solve_readiness", name: "Judge flow at 390/430/768/1440 px, accessibility, links", cmd: ["node", ["scripts/qa/solve_readiness_e2e.mjs"]] },
  { id: "history", name: "Browser back/forward, header, feedback export", cmd: ["node", ["scripts/qa/history_e2e.mjs", OUT]] },
  { id: "report_region", name: "Community health report", cmd: ["node", ["scripts/qa/report_region_e2e.mjs", OUT]] },
  { id: "report_indicator", name: "Indicator report (national)", cmd: ["node", ["scripts/qa/report_indicator_e2e.mjs", OUT]] },
  { id: "report_elder", name: "Older-adults report", cmd: ["node", ["scripts/qa/report_elder_e2e.mjs", OUT]] },
  { id: "global_e2e", name: "Global prototype — values = source data, signals, trends, evidence links", cmd: ["node", ["scripts/qa/global_e2e.mjs", OUT]], env: { BASE: `${BASE}/global/`, ...(BASE_V01 ? { BASE_V01 } : {}) } },
];
const results = [];
for (const s of suites) {
  const [bin, args, opt = {}] = s.cmd;
  const t0 = Date.now();
  const r = spawnSync(bin, args, { cwd: opt.cwd || ROOT, env: { ...env, ...(s.env || {}) }, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, timeout: 15 * 60 * 1000 });
  const out = (r.stdout || "") + (r.stderr || "");
  let passed, failed;
  if (s.tap) { passed = +(out.match(/^# pass (\d+)/m) || [0, 0])[1]; failed = +(out.match(/^# fail (\d+)/m) || [0, 0])[1]; }
  else { passed = (out.match(/^\s*✔/gm) || []).length; failed = (out.match(/^\s*✘/gm) || []).length; }
  const ok = r.status === 0 && failed === 0 && passed > 0;
  results.push({ id: s.id, name: s.name, ok, passed, failed, seconds: Math.round((Date.now() - t0) / 1000) });
  console.log(`${ok ? "✔" : "✘"} ${s.name}: ${passed} passed, ${failed} failed (${Math.round((Date.now() - t0) / 1000)}s)`);
  if (!ok) console.log(out.split("\n").filter((l) => /✘|Error|error/.test(l)).slice(0, 8).join("\n"));
}
for (const p of servers) p.kill();
rmSync(stage, { recursive: true, force: true });

const git = (a) => spawnSync("git", a, { cwd: ROOT, encoding: "utf8" }).stdout.trim();
const status = {
  generated: new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 16).replace("T", " ") + " KST",
  commit: git(["rev-parse", "--short", "HEAD"]), working_tree_clean: git(["status", "--porcelain", "--", "."]) === "",
  global_v01_comparison: BASE_V01 ? "run (tag pre-global-v0.2)" : "not run (tag pre-global-v0.2 not found)",
  all_ok: results.every((r) => r.ok), suites: results,
  totals: { unit_tests: results.find((r) => r.id === "unit")?.passed ?? 0, browser_suites: results.filter((r) => r.id !== "unit").length, browser_checks: results.filter((r) => r.id !== "unit").reduce((a, r) => a + r.passed, 0) },
};
writeFileSync(path.join(ROOT, "data", "qa_status.json"), JSON.stringify(status, null, 1));
console.log(status.all_ok ? "\n전부 통과 — data/qa_status.json 기록" : "\n실패 있음 — data/qa_status.json 기록(배포 금지)");
process.exit(status.all_ok ? 0 : 1);
