#!/usr/bin/env node
/* preview.js — 웹북을 쪽마다 스크린샷으로 찍어 넘침·레이아웃을 눈으로 확인한다.
   사용:  node preview.js index.html [outdir] [--desktop] [--night] [--max N]
   기본:  모바일(390×844), 모든 쪽, outdir = ./preview
   출력:  p01.png, p02.png … + overflow 경고(쪽 안에서 스크롤이 생기면 글이 넘친 것) */
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
(async () => {
  const args = process.argv.slice(2);
  const inp = args.find(a => !a.startsWith('--') && /\.html?$/i.test(a));
  if (!inp) { console.log('사용법: node preview.js index.html [outdir] [--desktop] [--night] [--max N]'); process.exit(1); }
  const outdir = args.find(a => !a.startsWith('--') && a !== inp) || path.join(path.dirname(path.resolve(inp)), 'preview');
  const desktop = args.includes('--desktop'), night = args.includes('--night');
  const mi = args.indexOf('--max'); const max = mi >= 0 ? +args[mi + 1] : 999;
  fs.mkdirSync(outdir, { recursive: true });
  const opts = process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {};
  const b = await chromium.launch(opts);
  const p = await b.newPage({ viewport: desktop ? { width: 1280, height: 800 } : { width: 390, height: 844 }, deviceScaleFactor: 1 });
  await p.goto('file://' + path.resolve(inp), { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
  await p.evaluate(m => { if (m) document.documentElement.dataset.mode = 'night'; else delete document.documentElement.dataset.mode; return document.fonts.ready; }, night);
  const N = await p.evaluate(() => document.querySelectorAll('.s').length);
  const over = [];
  for (let n = 1; n <= Math.min(N, max); n++) {
    await p.evaluate(n => { location.hash = '#p' + n; }, n);
    await p.waitForTimeout(120);
    const info = await p.evaluate(() => {
      const s = document.querySelector('.s.on'), pin = s.querySelector('.pin');
      return { label: s.dataset.label, over: pin.scrollHeight - pin.clientHeight };
    });
    if (info.over > 2) over.push(`${n}쪽(${info.label}): ${info.over}px 넘침`);
    await p.screenshot({ path: path.join(outdir, 'p' + String(n).padStart(2, '0') + '.png') });
  }
  await b.close();
  console.log(`${Math.min(N, max)}/${N}쪽 저장: ${outdir}`);
  if (over.length) { console.log('⚠ 글이 넘친 쪽 (쪽을 나누거나 줄이세요):'); over.forEach(o => console.log('  ' + o)); }
  else console.log('넘친 쪽 없음');
})();
