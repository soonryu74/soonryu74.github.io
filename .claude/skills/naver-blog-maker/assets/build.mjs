#!/usr/bin/env node
// 네이버 블로그 글 한 편 만들기: post.json → 이미지(PNG/JPG) + 복사용 미리보기(preview.html)
// 사용법: node build.mjs <post.json 경로> [--no-ai] [--regen]
//   --no-ai : AI 배경 없이 그라데이션 배경으로 대표 이미지를 만든다
//   --regen : 이미 만든 AI 배경이 있어도 새로 만든다
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const args = process.argv.slice(2);
const postPath = args.find(a => !a.startsWith('--'));
if (!postPath) { console.error('사용법: node build.mjs <post.json> [--no-ai] [--regen]'); process.exit(1); }
const NO_AI = args.includes('--no-ai');
const REGEN = args.includes('--regen');

const post = JSON.parse(fs.readFileSync(postPath, 'utf8'));
const outDir = path.dirname(path.resolve(postPath));
const imgDir = path.join(outDir, 'images');
fs.mkdirSync(imgDir, { recursive: true });

const FONT = 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css';
const PALETTE = ['#2B8FE0', '#2E8B2E', '#F59A1B', '#3DB489', '#7A5FD0', '#E0527A'];
const brand = post.brand || '';
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');

// ---------- 1. AI 배경 (글자 없는 그림만) ----------
function makeBackground(prompt, file) {
  if (fs.existsSync(file) && !REGEN) return true;
  if (NO_AI || !prompt) return false;
  const model = process.env.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-image';
  const body = JSON.stringify({
    contents: [{ parts: [{ text: `${prompt}. Square image. Bright, clean, trustworthy mood. The upper two-thirds must be soft, bright and uncluttered (sky or blurred wall) so a title can be placed over it. Any screen or paper in the scene must be blank. Absolutely no text, no letters, no numbers, no logos, no watermarks anywhere.` }] }],
  });
  const tmp = path.join(imgDir, '.req.json');
  fs.writeFileSync(tmp, body);
  try {
    const res = execFileSync('curl', ['-sS', '-m', '120', '-X', 'POST',
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      '-H', 'Content-Type: application/json',
      '-H', `x-goog-api-key: ${process.env.GEMINI_API_KEY || 'dummy-key'}`,
      '--data-binary', `@${tmp}`], { maxBuffer: 64 * 1024 * 1024 }).toString();
    const data = JSON.parse(res);
    const part = (data.candidates?.[0]?.content?.parts || []).find(p => p.inlineData);
    if (!part) { console.warn('  ! AI 배경 실패, 그라데이션으로 대체:', (data.error?.message || res).slice(0, 200)); return false; }
    fs.writeFileSync(file, Buffer.from(part.inlineData.data, 'base64'));
    return true;
  } catch (e) {
    console.warn('  ! AI 배경 실패, 그라데이션으로 대체:', String(e.message).slice(0, 200));
    return false;
  } finally { fs.rmSync(tmp, { force: true }); }
}

// ---------- 2. 이미지 틀 (글자는 전부 코드로 얹는다) ----------
const baseCss = `@import url('${FONT}');
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Pretendard',sans-serif;word-break:keep-all;color:#12233f;background:#fff}
#shot{width:1080px;position:relative;overflow:hidden}`;

function coverHtml(im, bgFile) {
  const bg = bgFile
    ? `background:url('data:image/png;base64,${fs.readFileSync(bgFile).toString('base64')}') center/cover`
    : 'background:linear-gradient(160deg,#d9ecff 0%,#f4f9ff 45%,#fff3df 100%)';
  return `<style>${baseCss}
#shot{height:1080px;${bg}}
.veil{position:absolute;inset:0;background:linear-gradient(180deg,rgba(255,255,255,.93) 0%,rgba(255,255,255,.86) 44%,rgba(255,255,255,.3) 68%,rgba(255,255,255,0) 100%)}
.in{position:absolute;inset:0;padding:80px 70px;text-align:center}
.brand{font-size:30px;font-weight:800;color:#E0325A;letter-spacing:-.5px}
.kick{display:inline-block;margin-top:30px;font-size:40px;font-weight:600;color:#1f6fd0;padding-bottom:8px;border-bottom:4px solid #6db3f2}
.t1{margin-top:36px;font-size:${im.title1?.length > 9 ? 92 : 108}px;font-weight:900;color:#0c2a6b;letter-spacing:-3px;line-height:1.12}
.t2{font-size:${im.title2?.length > 9 ? 92 : 108}px;font-weight:900;color:#1c8fe6;letter-spacing:-3px;line-height:1.16}
.pill{display:inline-block;margin-top:40px;padding:26px 54px;background:rgba(255,255,255,.9);border-radius:36px;box-shadow:0 8px 30px rgba(20,60,120,.14)}
.pt{font-size:38px;font-weight:800;color:#0c2a6b}
.ps{margin-top:8px;font-size:32px;font-weight:500;color:#1f6fd0;padding-bottom:10px;border-bottom:2px solid #9cc9f2}
.tg{margin-top:12px;font-size:25px;font-weight:500;color:#44546e}
</style><div id="shot"><div class="veil"></div><div class="in">
${brand ? `<div class="brand">${esc(brand)}</div>` : ''}
${im.kicker ? `<div><span class="kick">${esc(im.kicker)}</span></div>` : ''}
<div class="t1">${esc(im.title1)}</div>${im.title2 ? `<div class="t2">${esc(im.title2)}</div>` : ''}
${im.pill_title ? `<div class="pill"><div class="pt">${esc(im.pill_title)}</div>${im.pill_sub ? `<div class="ps">${esc(im.pill_sub)}</div>` : ''}${im.tags ? `<div class="tg">${esc(im.tags)}</div>` : ''}</div>` : ''}
</div></div>`;
}

const head = im => `<div class="hd">${brand ? `<div class="brand">${esc(brand)}</div>` : ''}<div><div class="ttl">${esc(im.title)}</div>${im.subtitle ? `<div class="sub">${esc(im.subtitle)}</div>` : ''}</div></div>`;
const headCss = `.hd{display:flex;align-items:center;gap:28px;margin-bottom:40px}
.brand{font-size:26px;font-weight:800;color:#E0325A;padding-right:28px;border-right:3px solid #d5dfee;max-width:230px;line-height:1.25}
.ttl{font-size:54px;font-weight:900;color:#0c2a6b;letter-spacing:-1.5px;line-height:1.2}
.sub{margin-top:8px;font-size:25px;font-weight:500;color:#51627c;line-height:1.4}`;

function stepsHtml(im) {
  const n = im.items.length, cols = n <= 5 ? n : Math.ceil(n / 2);
  return `<style>${baseCss}
#shot{padding:60px 50px;background:linear-gradient(180deg,#f3f8ff,#fff)}
${headCss}
.g{display:grid;grid-template-columns:repeat(${cols},1fr);gap:18px}
.c{background:#fff;border-radius:22px;padding:26px 14px 24px;text-align:center;box-shadow:0 4px 18px rgba(20,60,120,.09);position:relative}
.ic{width:84px;height:84px;border-radius:50%;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;font-size:36px;font-weight:900;color:#fff}
.lb{display:inline-block;padding:7px 14px;border-radius:999px;color:#fff;font-size:${cols >= 5 ? 20 : 23}px;font-weight:800;line-height:1.25}
.ds{margin-top:14px;font-size:${cols >= 5 ? 19 : 21}px;font-weight:500;color:#3a4a63;line-height:1.45}
.c:not(:nth-child(${cols}n))::after{content:'›';position:absolute;right:-15px;top:46px;font-size:30px;color:#9fb3cf;font-weight:700}
</style><div id="shot">${head(im)}<div class="g">${im.items.map((it, i) => {
    const c = PALETTE[i % PALETTE.length];
    return `<div class="c"><div class="ic" style="background:${c}">${String(i + 1).padStart(2, '0')}</div><div class="lb" style="background:${c}">${esc(it.label)}</div><div class="ds">${esc(it.desc || '')}</div></div>`;
  }).join('')}</div></div>`;
}

function listHtml(im) {
  return `<style>${baseCss}
#shot{padding:60px 50px;background:linear-gradient(180deg,#eef6ff,#fff)}
${headCss}
.r{display:flex;align-items:center;gap:24px;margin-top:18px}
.bd{flex:none;width:120px;height:120px;border-radius:50%;display:flex;align-items:center;justify-content:center;text-align:center;color:#fff;font-size:26px;font-weight:800;line-height:1.2;padding:10px}
.bx{flex:1;background:#fff;border-radius:22px;padding:26px 34px;border:3px solid;box-shadow:0 4px 18px rgba(20,60,120,.08)}
.bt{font-size:34px;font-weight:800;letter-spacing:-.5px;line-height:1.3}
.bs{margin-top:6px;font-size:25px;font-weight:500;color:#3a4a63;line-height:1.45}
</style><div id="shot">${head(im)}${im.items.map((it, i) => {
    const c = PALETTE[i % PALETTE.length];
    return `<div class="r"><div class="bd" style="background:${c}">${esc(it.label)}</div><div class="bx" style="border-color:${c}"><div class="bt" style="color:${c}">${esc(it.title)}</div><div class="bs">${esc(it.desc || '')}</div></div></div>`;
  }).join('')}</div>`;
}

// ---------- 3. 이미지 굽기 ----------
const { chromium } = require('playwright');
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1200 }, deviceScaleFactor: 2 });
const images = {};
for (const im of post.images || []) {
  let html, ext = 'png';
  if (im.kind === 'cover') {
    const bgFile = path.join(imgDir, `${im.id}-bg.png`);
    const ok = makeBackground(im.bg_prompt, bgFile);
    html = coverHtml(im, ok ? bgFile : null); ext = 'jpg';
  } else if (im.kind === 'steps') html = stepsHtml(im);
  else if (im.kind === 'list') html = listHtml(im);
  else { console.warn('  ! 모르는 이미지 종류:', im.kind); continue; }
  await page.setContent(`<!doctype html><meta charset="utf-8">${html}`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const file = `${im.id}.${ext}`;
  await page.locator('#shot').screenshot({ path: path.join(imgDir, file), ...(ext === 'jpg' ? { type: 'jpeg', quality: 90 } : {}) });
  images[im.id] = file;
  console.log('  이미지:', file);
}
await browser.close();

// ---------- 4. 복사용 미리보기 ----------
// 네이버 스마트에디터에 붙여넣어도 살아남도록 모든 서식을 인라인 스타일로 넣는다.
const BASE = { margin: '0', 'font-size': '16px', 'line-height': '1.9', color: '#222' };
// 같은 속성이 두 번 들어가지 않게 합쳐서 한 줄 스타일로 만든다
const st = (extra = '') => {
  const o = { ...BASE };
  extra.split(';').filter(Boolean).forEach(kv => { const i = kv.indexOf(':'); o[kv.slice(0, i).trim()] = kv.slice(i + 1).trim(); });
  return Object.entries(o).map(([k, v]) => `${k}:${v}`).join(';') + ';';
};
const gap = '<p style="margin:0;font-size:16px;line-height:1.9;"><br></p>';
let h3i = 0, imgNo = 0;
const circled = n => '①②③④⑤⑥⑦⑧⑨⑩'[n - 1] || `(${n})`;
const slot = (label, file, caption) => `<p style="${st(`color:#888;text-align:center;`)}">〔이미지 ${label} 넣는 자리${file ? ': ' + esc(file) : ''}〕</p>${caption ? `<p style="${st(`font-size:13px;color:#777;text-align:center;`)}">${esc(caption)}</p>` : ''}`;
const body = (post.blocks || []).map(b => {
  switch (b.type) {
    case 'h2': return `${gap}<p style="${st(`font-size:24px;font-weight:bold;color:#666;line-height:1.5;`)}">■ ${inline(b.text)}</p>${gap}`;
    case 'h3': { const c = b.color || PALETTE[h3i++ % PALETTE.length]; return `${gap}<p style="${st(`font-size:19px;font-weight:bold;color:${c};line-height:1.6;`)}">▶ ${inline(b.text)}</p>${gap}`; }
    case 'p': return `<p style="${st(``)}">${inline(b.text)}</p>${gap}`;
    case 'bold': return `<p style="${st(`font-weight:bold;`)}">${inline(b.text)}</p>${gap}`;
    case 'bullets': return b.items.map(t => `<p style="${st(``)}">• ${inline(t)}</p>`).join('') + gap;
    case 'closing': return `${gap}${b.lines.map(t => `<p style="${st(`font-size:19px;font-weight:bold;color:#1f5f1f;text-align:center;`)}">${inline(t)}</p>`).join('')}${gap}`;
    case 'cta': return `<p style="${st(`font-weight:bold;color:#1f6fd0;${b.center ? 'text-align:center;' : ''}`)}">▶ ${inline(b.text)}${b.url ? ` : <a href="${esc(b.url)}" style="color:#1f6fd0;">${esc(b.url)}</a>` : ''}</p>${gap}`;
    case 'image': { const f = images[b.id]; const n = circled(++imgNo);
      return `${slot(n, f, b.caption)}${f ? `<p data-nocopy style="margin:8px 0 0;text-align:center;"><img src="images/${f}" alt="" style="max-width:100%;border-radius:6px;"></p>` : ''}${gap}`; }
    case 'photo': { const n = circled(++imgNo);
      return `${slot(n, '', b.caption)}<p data-nocopy style="margin:8px 0 0;padding:26px 16px;border:2px dashed #c9d3e2;border-radius:8px;color:#667;text-align:center;font-size:14px;">직접 넣을 사진·화면 캡처: ${esc(b.note || '')}</p>${gap}`; }
    default: return '';
  }
}).join('\n');
const tags = (post.hashtags || []).map(t => '#' + t.replace(/^#/, '')).join(' ');
const tagHtml = tags ? `<p style="${st(`font-weight:bold;color:#2b6fc2;text-align:center;`)}">${esc(tags)}</p>` : '';

const preview = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>블로그 복사용 미리보기</title>
<style>
body{margin:0;background:#f2f4f7;font-family:-apple-system,'Apple SD Gothic Neo','Malgun Gothic',sans-serif;word-break:keep-all}
.bar{position:sticky;top:0;z-index:5;background:#fff;border-bottom:1px solid #dde2ea;padding:10px 16px;display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.bar button,.dl a{font:inherit;font-size:14px;font-weight:700;padding:9px 14px;border-radius:8px;border:1px solid #1f6fd0;background:#1f6fd0;color:#fff;cursor:pointer;text-decoration:none}
.bar button.sub,.dl a{background:#fff;color:#1f6fd0}
#msg{font-size:13px;color:#1f7a3a;font-weight:700}
.wrap{max-width:720px;margin:0 auto;padding:16px}
.card{background:#fff;border-radius:12px;padding:20px;margin-bottom:16px;box-shadow:0 1px 4px rgba(0,0,0,.06)}
.card h2{margin:0 0 10px;font-size:15px;color:#445}
ol{margin:0;padding-left:20px;font-size:14px;line-height:1.8;color:#333}
.dl{display:flex;flex-wrap:wrap;gap:8px}
#title{font-size:26px;line-height:1.4;margin:0;color:#111}
</style></head><body>
<div class="bar"><button data-c="title">1. 제목 복사</button><button data-c="body">2. 본문 복사</button><button data-c="tags" class="sub">3. 해시태그 복사</button><span id="msg"></span></div>
<div class="wrap">
<div class="card"><h2>네이버 블로그에 올리는 순서</h2><ol>
<li>네이버 블로그 글쓰기를 열고, 위 버튼으로 제목과 본문을 차례로 복사해 붙여넣습니다.</li>
<li>본문에서 〔이미지 ① 넣는 자리〕 줄을 찾아 아래 이미지를 그 자리에 올리고, 표시 줄은 지웁니다.</li>
<li>해시태그는 글 맨 아래에 이미 들어 있습니다. 태그 입력칸에는 3번 버튼으로 복사해 넣습니다.</li>
<li>모바일 미리보기로 줄바꿈과 색을 확인한 뒤 발행합니다.</li></ol></div>
<div class="card"><h2>이미지 내려받기</h2><div class="dl">${Object.values(images).map((f, i) => `<a href="images/${f}" download>${circled(i + 1)} ${f}</a>`).join('') || '<span style="font-size:14px;color:#777">만든 이미지가 없습니다</span>'}</div></div>
<div class="card"><h1 id="title">${esc(post.title)}</h1></div>
<div class="card"><div id="body">${body}\n${tagHtml}</div></div>
</div>
<script>
const tags=${JSON.stringify(tags)};
const say=t=>{const m=document.getElementById('msg');m.textContent=t;setTimeout(()=>m.textContent='',2500)};
async function copyBody(){
  const c=document.getElementById('body').cloneNode(true);
  c.querySelectorAll('[data-nocopy]').forEach(e=>e.remove());
  const html=c.innerHTML,text=c.innerText;
  try{await navigator.clipboard.write([new ClipboardItem({'text/html':new Blob([html],{type:'text/html'}),'text/plain':new Blob([text],{type:'text/plain'})})]);}
  catch(e){const h=document.createElement('div');h.contentEditable='true';h.style.cssText='position:fixed;left:-9999px';h.innerHTML=html;document.body.appendChild(h);
    const r=document.createRange();r.selectNodeContents(h);const s=getSelection();s.removeAllRanges();s.addRange(r);document.execCommand('copy');s.removeAllRanges();h.remove();}
}
document.querySelectorAll('[data-c]').forEach(b=>b.onclick=async()=>{
  const k=b.dataset.c;
  if(k==='body'){await copyBody();say('본문을 복사했습니다');return}
  const t=k==='title'?document.getElementById('title').innerText:tags;
  try{await navigator.clipboard.writeText(t)}catch(e){const a=document.createElement('textarea');a.value=t;document.body.appendChild(a);a.select();document.execCommand('copy');a.remove()}
  say((k==='title'?'제목':'해시태그')+'을 복사했습니다');
});
</script></body></html>`;
fs.writeFileSync(path.join(outDir, 'preview.html'), preview);
console.log('  미리보기:', path.join(outDir, 'preview.html'));
