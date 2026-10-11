#!/usr/bin/env node
// 한뼘(HANDSPAN) 미니북 인쇄 PDF 생성기
// 마크다운 원고 → (1) 내지 PDF: 낱장, 재단 105×148 + 사방 5mm 여분 = 115×158mm
//                (2) 표지 PDF: 뒷표지+책등+앞표지 펼침 1장 + 사방 5mm 여분
// 레드프린팅 [토너] 무선 책자 업로드 규격(내지: 가로·세로 10mm 큰 여분 포함 낱장 PDF) 기준.
// 사용: node make-minibook.mjs 원고.md [--out 폴더] [--trim 105x148] [--bleed 5] [--spine 4] [--color "#2f4f4f"] [--font 10.5]
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, basename } from 'node:path';

const args = process.argv.slice(2);
if (!args[0]) { console.error('사용법: node make-minibook.mjs 원고.md [--out 폴더] [--trim 105x148] [--bleed 5] [--spine 4] [--color #hex] [--font 10.5] [--multiple 4]'); process.exit(1); }
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const srcPath = resolve(args[0]);
const [TW, TH] = opt('trim', '105x148').split('x').map(Number);   // 재단 크기 mm
const BLEED = Number(opt('bleed', 5));                            // 사방 여분 mm (레드프린팅: 가로세로 10mm 큰 PDF)
const SPINE_OPT = opt('spine', 'auto');                           // 책등 mm
const COLOR = opt('color', '#2f4a3f');
const FONT = Number(opt('font', 10.5));                           // 본문 pt
const MULT = Number(opt('multiple', 4));                          // 총 쪽수 배수
const outDir = resolve(opt('out', basename(srcPath).replace(/\.md$/, '') + '-print'));
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

// ---------- 원고 읽기 (front matter + pandoc) ----------
let md = readFileSync(srcPath, 'utf8');
const meta = { title: basename(srcPath).replace(/\.md$/, ''), subtitle: '', author: '' };
const fm = md.match(/^---\n([\s\S]*?)\n---\n/);
if (fm) { for (const l of fm[1].split('\n')) { const m = l.match(/^(\w+):\s*(.*)$/); if (m) meta[m[1]] = m[2].trim(); } md = md.slice(fm[0].length); }
let bodyHtml;
try { bodyHtml = execFileSync('pandoc', ['-f', 'markdown', '-t', 'html5', '--wrap=none'], { input: md }).toString(); }
catch { // pandoc 없으면 아주 단순 변환
  bodyHtml = md.split(/\n{2,}/).map(b => b.startsWith('# ') ? `<h1>${b.slice(2)}</h1>` : b.startsWith('## ') ? `<h2>${b.slice(3)}</h2>` : b.startsWith('> ') ? `<blockquote><p>${b.slice(2)}</p></blockquote>` : `<p>${b.replace(/\n/g, '<br>')}</p>`).join('\n');
}

// ---------- 공통 CSS ----------
const PW = TW + BLEED * 2, PH = TH + BLEED * 2;          // PDF 한 장 크기
const M_IN = 13, M_OUT = 11, M_TOP = 13, M_BOT = 15;    // 재단선 안쪽 여백 mm (본문 영역)
const fonts = `@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;500;700&display=swap');
@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css');`;
const css = `
${fonts}
*{box-sizing:border-box}
html,body{margin:0;padding:0}
body{font-family:'Noto Serif KR','KoPubWorldBatang','Nanum Myeongjo','Apple SD Gothic Neo','Malgun Gothic',serif;
  font-size:${FONT}pt;line-height:1.72;color:#15130f;word-break:keep-all;overflow-wrap:break-word;
  text-align:justify;font-feature-settings:"kern"}
@page{size:${PW}mm ${PH}mm;margin:${BLEED + M_TOP}mm ${BLEED + M_OUT}mm ${BLEED + M_BOT}mm ${BLEED + M_IN}mm}
@page:left{margin-left:${BLEED + M_OUT}mm;margin-right:${BLEED + M_IN}mm}
@page:right{margin-left:${BLEED + M_IN}mm;margin-right:${BLEED + M_OUT}mm}
h1,h2,h3{font-family:'Pretendard','Apple SD Gothic Neo','Malgun Gothic',sans-serif;letter-spacing:-.02em;line-height:1.3;text-align:left}
h1{break-before:right;font-size:${FONT * 1.9}pt;margin:28mm 0 4mm;font-weight:700}
h1 + p > em:only-child{display:block;font-style:normal;color:#6b6560;font-size:${FONT * 0.95}pt;margin-bottom:12mm}
h1 + p{margin-top:0}
h2{font-size:${FONT * 1.25}pt;margin:9mm 0 2.5mm;font-weight:700;break-after:avoid}
h3{font-size:${FONT * 1.05}pt;margin:6mm 0 2mm;font-weight:600;break-after:avoid}
p{margin:0 0 1.2em;orphans:2;widows:2}
h2 + p, h3 + p{text-indent:0}
blockquote{margin:3mm 0 4mm;padding:2.5mm 4mm;border-left:1.2pt solid ${COLOR};color:#33302a;font-size:${FONT * 0.92}pt;background:#f7f4ee;break-inside:avoid}
blockquote p{margin:0}
ul,ol{padding-left:5mm;margin:0 0 1.2em}
li{margin-bottom:.3em}
table{border-collapse:collapse;width:100%;font-size:${FONT * 0.85}pt;margin:3mm 0 5mm;font-family:'Pretendard',sans-serif;break-inside:avoid}
th,td{border-bottom:.5pt solid #d6d0c6;padding:1.5mm 1.5mm;text-align:left;vertical-align:top}
th{border-bottom:1pt solid #15130f;font-weight:600}
code{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:.9em;background:#f1efe9;padding:0 .3em;border-radius:2px}
pre{white-space:pre-wrap;font-size:${FONT * 0.85}pt;background:#f1efe9;padding:3mm;border-radius:2px}
img{max-width:100%;height:auto}
hr{border:0;border-top:.5pt solid #d6d0c6;margin:6mm 0}
.titlepage{height:${TH - M_TOP - M_BOT}mm;display:flex;flex-direction:column;justify-content:center;text-align:center;break-after:page}
.titlepage .t{font-family:'Pretendard',sans-serif;font-size:${FONT * 2.1}pt;font-weight:700;letter-spacing:-.03em;line-height:1.25}
.titlepage .st{color:#6b6560;margin-top:4mm;font-size:${FONT * 0.95}pt}
.titlepage .au{margin-top:14mm;font-family:'Pretendard',sans-serif;font-size:${FONT}pt}
.titlepage .rule{width:12mm;height:1pt;background:${COLOR};margin:8mm auto 0}
.colophon{break-before:left;height:${TH - M_TOP - M_BOT}mm;display:flex;flex-direction:column;justify-content:flex-end;font-family:'Pretendard',sans-serif;font-size:${FONT * 0.78}pt;color:#6b6560;line-height:1.6}
.blank{break-before:page;height:10mm}
.toc{font-family:'Pretendard',sans-serif;break-after:page}
.toc h2{margin-top:0}
.toc ol{list-style:none;padding:0}
.toc li{display:flex;gap:3mm;margin-bottom:1.6mm;font-size:${FONT * 0.95}pt}
.toc li .n{color:${COLOR};min-width:5mm}
`;

// ---------- 차례(장 제목) ----------
const chapters = [...bodyHtml.matchAll(/<h1[^>]*>(.*?)<\/h1>/g)].map(m => m[1].replace(/<[^>]+>/g, ''));
const toc = chapters.length ? `<div class="toc"><h2>차례</h2><ol>${chapters.map((c, i) => `<li><span class="n">${i + 1}</span><span>${c}</span></li>`).join('')}</ol></div>` : '';
const today = new Date();
const ymd = `${today.getFullYear()}년 ${today.getMonth() + 1}월`;
const titlepage = `<div class="titlepage"><div class="t">${meta.title}</div>${meta.subtitle ? `<div class="st">${meta.subtitle}</div>` : ''}<div class="rule"></div>${meta.author ? `<div class="au">${meta.author}</div>` : ''}</div>`;
const colophon = (n) => `<div class="colophon"><div><b>${meta.title}</b><br>${meta.author ? '지은이 ' + meta.author + '<br>' : ''}초판 ${ymd} · ${n}쪽 · ${TW}×${TH}mm<br>한뼘(HANDSPAN) 규격 ${Math.max(TW, TH) <= 76 ? '콩' : Math.max(TW, TH) <= 148 ? '손' : '뼘'}<br>이 책은 소량 디지털 인쇄로 만들었습니다.</div></div>`;

async function renderInner(browser, blanks) {
  const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>${meta.title}</title><style>${css}</style></head><body>
${titlepage}${toc}${bodyHtml}${'<div class="blank"></div>'.repeat(blanks)}${colophon('__N__')}</body></html>`;
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const footer = `<div style="width:100%;text-align:center;font-family:Pretendard,'Apple SD Gothic Neo','Malgun Gothic',sans-serif;font-size:7pt;color:#6b6560;padding-bottom:${BLEED + 6}mm"><span class="pageNumber"></span></div>`;
  const buf = await page.pdf({
    width: `${PW}mm`, height: `${PH}mm`, printBackground: true, preferCSSPageSize: true,
    displayHeaderFooter: true, headerTemplate: '<span></span>', footerTemplate: footer,
  });
  await page.close();
  return buf;
}
function countPages(buf) { const s = buf.toString('latin1'); return (s.match(/\/Type\s*\/Page[^s]/g) || []).length; }

async function renderCover(browser, sheets) {
  // 책등: 백색모조 100g ≈ 0.10mm/장 + 표지 아트지 250g ≈ 0.3mm → 반올림. 주문 화면의 '세네카' 값과 대조할 것.
  const spine = SPINE_OPT === 'auto' ? Math.max(2, Math.round((sheets * 0.10 + 0.3) * 2) / 2) : Number(SPINE_OPT);
  const CW = TW * 2 + spine + BLEED * 2, CH = TH + BLEED * 2;
  const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>${fonts}
  *{box-sizing:border-box}html,body{margin:0}@page{size:${CW}mm ${CH}mm;margin:0}
  body{width:${CW}mm;height:${CH}mm;position:relative;font-family:'Pretendard','Apple SD Gothic Neo','Malgun Gothic',sans-serif;color:#fff;background:${COLOR}}
  .back{position:absolute;left:0;top:0;width:${BLEED + TW}mm;height:${CH}mm;padding:${BLEED + 12}mm ${BLEED + 10}mm;display:flex;flex-direction:column;justify-content:flex-end}
  .spine{position:absolute;left:${BLEED + TW}mm;top:0;width:${spine}mm;height:${CH}mm;display:flex;align-items:center;justify-content:center}
  .spine span{writing-mode:vertical-rl;font-size:${Math.min(8, spine * 1.8)}pt;letter-spacing:.08em;white-space:nowrap}
  .front{position:absolute;left:${BLEED + TW + spine}mm;top:0;width:${TW + BLEED}mm;height:${CH}mm;padding:${BLEED + 14}mm ${BLEED + 10}mm ${BLEED + 12}mm ${BLEED + 10}mm;display:flex;flex-direction:column;justify-content:space-between}
  .front .t{font-size:19pt;font-weight:700;letter-spacing:-.03em;line-height:1.25;word-break:keep-all}
  .front .st{font-size:8pt;opacity:.85;margin-top:3mm;line-height:1.5}
  .front .au{font-size:9pt}
  .back .blurb{font-family:'Noto Serif KR',serif;font-size:8pt;line-height:1.7;opacity:.95;word-break:keep-all}
  .back .brand{font-size:7pt;opacity:.7;margin-top:6mm;letter-spacing:.1em}
  .mark{position:absolute;border:0 solid rgba(255,255,255,.35)}
  </style></head><body>
  <div class="back"><div class="blurb">${meta.subtitle || meta.title}</div><div class="brand">한뼘 · HANDSPAN · ${TW}×${TH}mm</div></div>
  <div class="spine"><span>${meta.title}${meta.author ? ' · ' + meta.author : ''}</span></div>
  <div class="front"><div><div class="t">${meta.title}</div>${meta.subtitle ? `<div class="st">${meta.subtitle}</div>` : ''}</div><div class="au">${meta.author}</div></div>
  </body></html>`;
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const buf = await page.pdf({ width: `${CW}mm`, height: `${CH}mm`, printBackground: true, preferCSSPageSize: true });
  await page.close();
  return { buf, spine, CW, CH };
}

const browser = await chromium.launch();
try {
  let inner = await renderInner(browser, 0);
  let n = countPages(inner);
  const MIN = 20; // 레드프린팅 토너 무선: 내지 10장(20쪽) 이상
  const target = Math.max(MIN, Math.ceil(n / MULT) * MULT);
  if (target !== n) { inner = await renderInner(browser, target - n); n = countPages(inner); }
  // 판권 쪽수 표기 채우기(두 번째 렌더에 반영)
  inner = Buffer.from(inner.toString('latin1').replace(/__N__/g, String(n)), 'latin1');
  const innerPath = resolve(outDir, '내지.pdf');
  writeFileSync(innerPath, inner);
  const sheets = n / 2;
  const { buf, spine, CW, CH } = await renderCover(browser, sheets);
  const coverPath = resolve(outDir, '표지.pdf');
  writeFileSync(coverPath, buf);
  const info = `한뼘 미니북 인쇄 파일 — ${meta.title}
생성: ${today.toISOString().slice(0, 10)}

[내지.pdf]  ${n}쪽(낱장 ${n}장), 한 장 크기 ${PW}×${PH}mm = 재단 ${TW}×${TH} + 사방 ${BLEED}mm 여분
[표지.pdf]  펼침 1장 ${CW}×${CH}mm = 뒷표지 ${TW} + 책등 ${spine}mm + 앞표지 ${TW} + 사방 ${BLEED}mm 여분
            책등은 내지 ${sheets}장 × 0.10mm + 표지 0.3mm 로 계산했습니다. 주문 화면의 '세네카' 값이 다르면 --spine 값으로 다시 만드세요.

레드프린팅 주문 입력값 (책자 > [토너] 무선 책자 (흑백) PRBKOPB)
  규격: 무선책자(A6세로형) ${TW}×${TH}
  표지: 아트지 250g, 컬러 단면, 무광코팅 단면
  내지: 백색모조 100g, 양면, 흑백, 내지 장수 ${sheets}장 (= ${n}쪽 ÷ 2)
  제본: 무선, 좌철(세로형)
  수량: 10권  → 2026-10 실측: 64쪽(32장) 10권 공급가 14,500원 + 부가세 1,450 + 배송 3,500 = 19,450원. 장수가 다르면 주문 화면 '공급가'를 그대로 읽으세요.
  업로드: 표지.pdf(단면 1페이지), 내지.pdf(낱장 ${n}페이지)
`;
  writeFileSync(resolve(outDir, '주문입력값.txt'), info);
  console.log(info);
} finally { await browser.close(); }
