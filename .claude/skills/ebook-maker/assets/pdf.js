#!/usr/bin/env node
/* pdf.js — 웹북 HTML → A5 PDF (Playwright 크로미움 사용)
   사용:  node pdf.js index.html            → index.pdf
          node pdf.js index.html out.pdf
   준비:  npm i playwright && npx playwright install chromium  (최초 1회)
   대안:  브라우저에서 열고 인쇄 → PDF 저장 (용지 A5, 여백 없음, 배경 그래픽 켬) */
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const [, , inp, outp] = process.argv;
  if (!inp) { console.log('사용법: node pdf.js index.html [out.pdf]'); process.exit(1); }
  const out = outp || inp.replace(/\.html?$/i, '') + '.pdf';
  const opts = process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {};
  const b = await chromium.launch(opts);
  const p = await b.newPage();
  await p.goto('file://' + path.resolve(inp), { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
  await p.evaluate(() => { document.documentElement.removeAttribute('data-mode'); return document.fonts.ready; });
  await p.emulateMedia({ media: 'print' });
  await p.pdf({ path: out, format: 'A5', printBackground: true, preferCSSPageSize: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
  const n = await p.evaluate(() => document.querySelectorAll('.s').length);
  await b.close();
  console.log('PDF 저장: ' + out + ' (' + n + '쪽)');
})();
