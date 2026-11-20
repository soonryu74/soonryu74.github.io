#!/usr/bin/env node
// motion-maker 렌더러: 작업 폴더의 player.html + scenes.js → mp4
// 사용: node render.cjs <작업폴더> [--out 결과.mp4] [--bgm 배경음.mp3] [--voice 내레이션.mp3]
//       node render.cjs <작업폴더> --preview      (시안 3종 미리보기 PNG만 저장)
const path = require("path");
const fs = require("fs");
const { spawn, spawnSync } = require("child_process");

const args = process.argv.slice(2);
const dir = path.resolve(args.find(a => !a.startsWith("--")) || ".");
const opt = n => { const i = args.indexOf("--" + n); return i >= 0 ? args[i + 1] : null; };
const has = n => args.includes("--" + n);

const page_ = path.join(dir, "player.html");
if (!fs.existsSync(page_) || !fs.existsSync(path.join(dir, "scenes.js"))) {
  console.error("작업 폴더에 player.html 과 scenes.js 가 있어야 합니다: " + dir); process.exit(1);
}
let chromium;
try { ({ chromium } = require("playwright")); }
catch { console.error("playwright 가 없습니다. 설치: npm i -g playwright && npx playwright install chromium"); process.exit(1); }

const url = extra => "file://" + page_.replace(/\\/g, "/").replace(/^([A-Za-z]:)/, "/$1") + "?render=1" + (extra || "");

async function open(browser, extra) {
  const probe = await browser.newPage();
  await probe.goto(url(extra));
  const [W, H] = await probe.evaluate(() => window.__size);
  await probe.close();
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await page.goto(url(extra));
  await page.evaluate(() => window.__ready);
  return { page, W, H };
}

(async () => {
  const browser = await chromium.launch();
  try {
    if (has("preview")) {
      for (const th of ["ink", "paper", "pop"]) {
        const { page } = await open(browser, "&theme=" + th);
        const total = await page.evaluate(() => window.__total);
        const first = await page.evaluate(() => Math.min(3, window.__total));
        await page.evaluate(t => window.seek(t), first);
        const f = path.join(dir, `preview-${th}.png`);
        await page.screenshot({ path: f });
        console.log("시안 저장: " + f + "  (전체 " + total.toFixed(1) + "초)");
        await page.close();
      }
      return;
    }
    if (spawnSync("ffmpeg", ["-version"]).error) {
      console.error("ffmpeg 가 없습니다. Mac: brew install ffmpeg / Windows: winget install Gyan.FFmpeg"); process.exit(1);
    }
    const { page } = await open(browser);
    const total = await page.evaluate(() => window.__total);
    const fps = await page.evaluate(() => window.__fps);
    const frames = Math.round(total * fps);
    const out = path.resolve(opt("out") || path.join(dir, "output.mp4"));
    const silent = path.join(dir, ".silent.mp4");
    const bgm = opt("bgm"), voice = opt("voice");
    const target = (bgm || voice) ? silent : out;

    const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(fps), "-c:v", "mjpeg", "-i", "-",
      "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-movflags", "+faststart", target], { stdio: ["pipe", "inherit", "inherit"] });
    const done = new Promise((res, rej) => ff.on("close", c => c === 0 ? res() : rej(new Error("ffmpeg 종료 코드 " + c))));
    for (let i = 0; i < frames; i++) {
      await page.evaluate(t => window.seek(t), i / fps);
      const buf = await page.screenshot({ type: "jpeg", quality: 95 });
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once("drain", r));
      if (i % fps === 0) process.stdout.write(`\r만드는 중 ${Math.round(i / frames * 100)}%`);
    }
    ff.stdin.end(); await done;
    process.stdout.write("\r만드는 중 100%\n");

    if (bgm || voice) {
      const a = ["-y", "-loglevel", "error", "-i", silent];
      if (voice) a.push("-i", path.resolve(voice));
      if (bgm) a.push("-stream_loop", "-1", "-i", path.resolve(bgm));
      const fade = `afade=t=out:st=${Math.max(0, total - 1.5).toFixed(2)}:d=1.5`;
      let fc;
      if (voice && bgm) fc = `[2:a]volume=0.18[b];[1:a][b]amix=inputs=2:duration=longest:normalize=0,${fade}[a]`;
      else if (bgm) fc = `[1:a]volume=0.5,${fade}[a]`;
      else fc = `[1:a]anull[a]`;
      a.push("-filter_complex", fc, "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-t", String(total), out);
      const r = spawnSync("ffmpeg", a, { stdio: "inherit" });
      fs.rmSync(silent, { force: true });
      if (r.status !== 0) process.exit(r.status || 1);
    }
    console.log(`완성: ${out}  (${total.toFixed(1)}초, ${frames}프레임)`);
  } finally { await browser.close(); }
})().catch(e => { console.error(e.message || e); process.exit(1); });
