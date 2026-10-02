// health-profile.kr 활용법 발표자료(100쪽) 생성기 — 사용설명서(deck.mjs)와 같은 조판 도우미를 쓴다
// 사용법: cp 이 파일과 shots 를 scratchpad/manual 에 두고  node deck_use.mjs <출력.pptx>   (REF_SLIDE_FIRST 환경변수로 참고문헌 첫 쪽 지정)
import pptxgen from 'pptxgenjs';
import JSZip from 'jszip';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { execFileSync } from 'node:child_process';
// 캡처 PNG를 JPEG(품질 82, 폭 1400 상한)로 바꿔 삽입한다 — 100장짜리 자료가 27MB가 되어 LibreOffice 변환이 실패했다
const JPG_DIR = path.join(process.env.HD_JPG_DIR || '/tmp', 'deck_jpg'); fs.mkdirSync(JPG_DIR, { recursive: true });
function toJpg(file) {
  const out = path.join(JPG_DIR, path.basename(file).replace(/\.png$/i, '.jpg'));
  if (!fs.existsSync(out) || fs.statSync(out).mtimeMs < fs.statSync(file).mtimeMs) {
    // sharp 는 비동기 API만 있어 생성 전에 미리 돌린다(아래 prepareJpgs). 여기서는 있으면 쓰고 없으면 원본.
    return fs.existsSync(out) ? out : file;
  }
  return out;
}
async function prepareJpgs(dir) {
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.png'))) {
    const src = path.join(dir, f), out = path.join(JPG_DIR, f.replace(/\.png$/i, '.jpg'));
    if (fs.existsSync(out) && fs.statSync(out).mtimeMs >= fs.statSync(src).mtimeMs) continue;
    await sharp(src).resize({ width: 1400, withoutEnlargement: true }).jpeg({ quality: 82, mozjpeg: true }).toFile(out);
  }
}

const DIR = '/tmp/claude-0/-home-user-soonryu74-github-io/e16f7b4f-1860-59c2-9e17-e9d4583aa91f/scratchpad/manual';
const SHOTS = `${DIR}/shots`;
const OUT = process.argv[2] || `${DIR}/health-profile.kr_활용법_v1.pptx`;
const manifest = fs.existsSync(`${SHOTS}/manifest.json`) ? JSON.parse(fs.readFileSync(`${SHOTS}/manifest.json`, 'utf8')) : [];
const BY = Object.fromEntries(manifest.map((m) => [m.name, m.file]));
const files = fs.existsSync(SHOTS) ? fs.readdirSync(SHOTS).filter((f) => f.endsWith('.png')) : [];
function findShot(...keys) {              // 이름 정확 일치 → 접두 일치 → 부분 일치 순으로 찾는다
  for (const k of keys) {
    if (BY[k] && fs.existsSync(BY[k])) return BY[k];
    const f = files.find((x) => x.startsWith(k)) || files.find((x) => x.includes(k));
    if (f) return path.join(SHOTS, f);
  }
  return null;
}
function pngSize(file) {
  const b = fs.readFileSync(file); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

const C = { NAVY: '17324F', BLUE: '2A78D6', SKY: 'E8F1FB', INK: '0B0B0B', MUT: '5A5A57', TINT: 'F4F6F9', RED: 'D8402A', WHITE: 'FFFFFF', LINE: 'D9E0E8', GREEN: '1F8A5B', AMBER: 'B7791F' };
const FONT = 'Malgun Gothic';
const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE';            // 13.33 × 7.5
pres.lang = 'ko-KR';
pres.author = '지역 건강프로파일 대시보드';
pres.title = 'health-profile.kr 활용법 — 지역 건강프로파일 대시보드';
const W = 13.33, H = 7.5;
let pageNo = 0;
const T = (opts) => ({ fontFace: FONT, isTextBox: true, margin: 0, ...opts });

// ── 참고문헌: 대시보드와 같은 번호(data/refs.json · scripts/build_refs.py) ──
// 본문 문자열 안의 {r:key} 또는 {r:key1,key2} → 파란 위첨자 [n] + 「참고문헌」 쪽으로 가는 링크
const REPO = process.env.HD_REPO || '/home/user/soonryu74.github.io/health-dashboard';
const REFS = JSON.parse(fs.readFileSync(`${REPO}/data/refs.json`, 'utf8')).refs;
const REFN = Object.fromEntries(REFS.map((r) => [r.key, r]));
const REF_PER_SLIDE = 13;
const REF_SLIDE_FIRST = Number(process.env.REF_SLIDE_FIRST || 97);   // 참고문헌 첫 쪽 번호 — 끝에서 실제 번호와 대조해 틀리면 멈춘다
const refSlideOf = (n) => REF_SLIDE_FIRST + Math.floor((n - 1) / REF_PER_SLIDE);
const MARK = /\{r:([a-z0-9_,]+)\}/g;
function R(str, base = {}) {
  if (typeof str !== 'string' || !str.includes('{r:')) return str;
  const out = []; let last = 0; let m;
  MARK.lastIndex = 0;
  while ((m = MARK.exec(str))) {
    if (m.index > last) out.push({ text: str.slice(last, m.index), options: { ...base } });
    const refs = m[1].split(',').map((k) => { if (!REFN[k]) throw new Error(`참고문헌 key 없음: ${k}`); return REFN[k]; }).sort((a, b) => a.n - b.n);
    refs.forEach((r, i) => out.push({ text: (i ? ',' : '[') + r.n + (i === refs.length - 1 ? ']' : ''),
      options: { ...base, superscript: true, color: C.BLUE, hyperlink: { slide: refSlideOf(r.n), tooltip: `[${r.n}] ${r.org}, ${r.title}` } } }));
    last = m.index + m[0].length;
  }
  if (last < str.length) out.push({ text: str.slice(last), options: { ...base } });
  return out;
}
const plain = (str) => (typeof str === 'string' ? str.replace(MARK, '') : str);

function footer(slide) {
  pageNo += 1;
  slide.addText('health-profile.kr 활용법 · 지역 건강프로파일 대시보드', T({ x: 0.5, y: H - 0.42, w: 8, h: 0.3, fontSize: 9, color: C.MUT }));
  slide.addText(String(pageNo), T({ x: W - 1.3, y: H - 0.42, w: 0.8, h: 0.3, fontSize: 9, color: C.MUT, align: 'right' }));
}
function title(slide, text, sub) {
  slide.addText(text, T({ x: 0.5, y: 0.35, w: W - 1, h: 0.6, fontSize: 26, bold: true, color: C.NAVY }));
  if (sub) slide.addText(R(sub, { fontSize: 12.5, color: C.MUT }), T({ x: 0.5, y: 0.95, w: W - 1, h: 0.35, fontSize: 12.5, color: C.MUT }));
}
function fitImage(slide, file, box, opts = {}) {
  if (!file) {
    slide.addShape(pres.ShapeType.roundRect, { x: box.x, y: box.y, w: box.w, h: box.h, fill: { color: C.TINT }, line: { color: C.LINE, width: 0.75 }, rectRadius: 0.08 });
    slide.addText('화면 캡처', T({ x: box.x, y: box.y, w: box.w, h: box.h, fontSize: 12, color: C.MUT, align: 'center', valign: 'middle' }));
    return;
  }
  const { w, h } = pngSize(file);
  file = toJpg(file);
  const s = Math.min(box.w / w, box.h / h);
  const iw = w * s, ih = h * s;
  const x = box.x + (opts.alignLeft ? 0 : (box.w - iw) / 2), y = box.y + (opts.alignTop ? 0 : (box.h - ih) / 2);
  slide.addShape(pres.ShapeType.rect, { x: x - 0.03, y: y - 0.03, w: iw + 0.06, h: ih + 0.06, fill: { color: C.WHITE }, line: { color: C.LINE, width: 0.75 }, shadow: { type: 'outer', blur: 6, offset: 2, angle: 90, color: '000000', opacity: 0.12 } });
  slide.addImage({ path: file, x, y, w: iw, h: ih });
}
function bulletsText(items, size = 12.5) {
  return items.flatMap((t, i) => {
    const base = { fontSize: size, color: C.INK };
    const runs = [].concat(R(t, base)).map((x) => (typeof x === 'string' ? { text: x, options: { ...base } } : x));
    runs[0].options = { ...runs[0].options, bullet: { indent: 12 }, paraSpaceAfter: 6 };   // 뒤 조각들의 문단 속성은 저장 후 후처리에서 지운다
    if (i < items.length - 1) runs[runs.length - 1].options = { ...runs[runs.length - 1].options, breakLine: true };
    return runs;
  });
}
function tipBox(slide, tips, box, label = '활용 팁') {
  slide.addShape(pres.ShapeType.roundRect, { x: box.x, y: box.y, w: box.w, h: box.h, fill: { color: C.SKY }, line: { color: C.SKY }, rectRadius: 0.1 });
  slide.addText(label, T({ x: box.x + 0.18, y: box.y + 0.12, w: box.w - 0.36, h: 0.3, fontSize: 11.5, bold: true, color: C.BLUE }));
  slide.addText(bulletsText(tips, 11.5), T({ x: box.x + 0.18, y: box.y + 0.45, w: box.w - 0.36, h: box.h - 0.55, valign: 'top' }));
}
function notes(slide, text) { if (text) slide.addNotes(text); }

// ── 슬라이드 유형 ──
function cover() {
  const s = pres.addSlide(); s.background = { color: C.NAVY };
  s.addText('health-profile.kr 활용법', T({ x: 0.8, y: 1.9, w: 11.5, h: 1.0, fontSize: 40, bold: true, color: C.WHITE }));
  s.addText('지역 건강프로파일 대시보드 — 지금 수준에서 무엇을 어떻게 쓰나', T({ x: 0.8, y: 2.9, w: 11.5, h: 0.8, fontSize: 24, color: 'CADCFC' }));
  s.addText('자료 · 메뉴별 활용 · 시나리오 · 해석 주의 · K-Health 랭킹(communityhealth.kr) 방법론 비교 · 발전방안', T({ x: 0.8, y: 3.8, w: 7.5, h: 0.8, fontSize: 14, color: 'CADCFC', valign: 'top' }));
  s.addText('v1 · 2026년 10월 · https://health-profile.kr', T({ x: 0.8, y: 6.3, w: 11.5, h: 0.4, fontSize: 12, color: '9FB4CF' }));
  const f = findShot('A0_home_grid', 'A_home_top'); if (f) fitImage(s, f, { x: 8.3, y: 1.4, w: 4.6, h: 4.6 });
  pageNo += 1;
}
function divider(no, t, sub) {
  const s = pres.addSlide(); s.background = { color: C.NAVY };
  s.addText(`PART ${no}`, T({ x: 0.8, y: 2.3, w: 6, h: 0.5, fontSize: 16, color: '9FB4CF', bold: true }));
  s.addText(t, T({ x: 0.8, y: 2.8, w: 11.5, h: 1.0, fontSize: 36, bold: true, color: C.WHITE }));
  if (sub) s.addText(sub, T({ x: 0.8, y: 3.9, w: 11.5, h: 1.2, fontSize: 15, color: 'CADCFC', valign: 'top' }));
  pageNo += 1;
}
function toc(items) {
  const s = pres.addSlide(); title(s, '목차');
  const colW = 6.0; let x = 0.6, y = 1.4;
  items.forEach((it, i) => {
    if (i === Math.ceil(items.length / 2)) { x = 6.9; y = 1.4; }
    s.addShape(pres.ShapeType.ellipse, { x, y: y + 0.05, w: 0.5, h: 0.5, fill: { color: C.BLUE }, line: { color: C.BLUE } });
    s.addText(String(i + 1), T({ x, y: y + 0.05, w: 0.5, h: 0.5, fontSize: 13, bold: true, color: C.WHITE, align: 'center', valign: 'middle' }));
    s.addText(it[0], T({ x: x + 0.65, y, w: colW - 0.7, h: 0.32, fontSize: 15, bold: true, color: C.INK }));
    s.addText(it[1], T({ x: x + 0.65, y: y + 0.3, w: colW - 0.7, h: 0.5, fontSize: 11, color: C.MUT, valign: 'top' }));
    y += 0.95;
  });
  footer(s);
}
/** 화면 캡처 + 설명 + 팁 */
function shot({ t, sub, img, img2, bullets = [], tips = [], side = 'left', note, wide = false }) {
  const s = pres.addSlide(); title(s, t, sub);
  const file = Array.isArray(img) ? findShot(...img) : findShot(img);
  const file2 = img2 ? (Array.isArray(img2) ? findShot(...img2) : findShot(img2)) : null;
  const top = sub ? 1.4 : 1.15, bh = H - top - 0.65;
  const placeImages = (box) => {
    if (!file2) return fitImage(s, file, box, { alignTop: true });
    const a = pngSize(file), b = pngSize(file2);
    if (a.h > a.w * 0.8 && b.h > b.w * 0.8) {           // 둘 다 세로로 길면 좌우
      fitImage(s, file, { x: box.x, y: box.y, w: box.w / 2 - 0.1, h: box.h }, { alignTop: true });
      fitImage(s, file2, { x: box.x + box.w / 2 + 0.1, y: box.y, w: box.w / 2 - 0.1, h: box.h }, { alignTop: true });
    } else {                                              // 아니면 위아래
      fitImage(s, file, { x: box.x, y: box.y, w: box.w, h: box.h / 2 - 0.1 }, { alignTop: true });
      fitImage(s, file2, { x: box.x, y: box.y + box.h / 2 + 0.1, w: box.w, h: box.h / 2 - 0.1 }, { alignTop: true });
    }
  };
  if (wide) {
    const bulH = bullets.length ? 0.32 * bullets.length + 0.15 : 0, tipH = tips.length ? 0.5 + 0.3 * tips.length : 0;
    placeImages({ x: 0.5, y: top, w: W - 1, h: bh - tipH - bulH - (tipH ? 0.15 : 0) - (bulH ? 0.1 : 0) });
    let y = H - 0.65 - tipH - (tipH ? 0.15 : 0) - bulH;
    if (bullets.length) { s.addText(bulletsText(bullets, 11.5), T({ x: 0.5, y, w: W - 1, h: bulH, valign: 'top' })); y += bulH + 0.15; }
    if (tips.length) tipBox(s, tips, { x: 0.5, y, w: W - 1, h: tipH });
  } else {
    const iw = 7.6, gap = 0.35, tw = W - 1 - iw - gap;
    const ix = side === 'left' ? 0.5 : 0.5 + tw + gap, tx = side === 'left' ? 0.5 + iw + gap : 0.5;
    placeImages({ x: ix, y: top, w: iw, h: bh });
    const tipH = tips.length ? Math.min(2.6, 0.75 + tips.length * 0.5) : 0;
    if (bullets.length) s.addText(bulletsText(bullets), T({ x: tx, y: top, w: tw, h: bh - tipH - (tipH ? 0.2 : 0), valign: 'top' }));
    if (tips.length) tipBox(s, tips, { x: tx, y: top + bh - tipH, w: tw, h: tipH });
  }
  notes(s, note); footer(s);
}
/** 카드형 텍스트 슬라이드 (2×N 격자) */
function cardsSlide({ t, sub, items, cols = 2, note }) {
  const s = pres.addSlide(); title(s, t, sub);
  const top = sub ? 1.45 : 1.2, rows = Math.ceil(items.length / cols);
  const gw = (W - 1 - (cols - 1) * 0.3) / cols, gh = Math.min(1.75, (H - top - 0.7 - (rows - 1) * 0.25) / rows);
  items.forEach((it, i) => {
    const x = 0.5 + (i % cols) * (gw + 0.3), y = top + Math.floor(i / cols) * (gh + 0.25);
    s.addShape(pres.ShapeType.roundRect, { x, y, w: gw, h: gh, fill: { color: C.TINT }, line: { color: C.LINE, width: 0.75 }, rectRadius: 0.1 });
    if (it.icon) {
      s.addShape(pres.ShapeType.ellipse, { x: x + 0.2, y: y + 0.2, w: 0.5, h: 0.5, fill: { color: it.color || C.BLUE }, line: { color: it.color || C.BLUE } });
      s.addText(it.icon, T({ x: x + 0.2, y: y + 0.2, w: 0.5, h: 0.5, fontSize: 13, bold: true, color: C.WHITE, align: 'center', valign: 'middle' }));
    }
    s.addText(R(it.h, { fontSize: 14, bold: true, color: C.NAVY }), T({ x: x + (it.icon ? 0.85 : 0.2), y: y + 0.2, w: gw - (it.icon ? 1.05 : 0.4), h: 0.45, fontSize: 14, bold: true, color: C.NAVY, valign: 'middle' }));
    s.addText(R(it.b, { fontSize: 11.5, color: C.INK }), T({ x: x + 0.2, y: y + 0.75, w: gw - 0.4, h: gh - 0.9, fontSize: 11.5, color: C.INK, valign: 'top' }));
  });
  notes(s, note); footer(s);
}
/** 표 */
function tableSlide({ t, sub, head, rows, colW, fs = 11, note }) {
  const s = pres.addSlide(); title(s, t, sub);
  const top = sub ? 1.45 : 1.2;
  const hdr = head.map((h) => ({ text: h, options: { bold: true, color: C.WHITE, fill: { color: C.NAVY }, fontSize: fs, fontFace: FONT, align: 'left', valign: 'middle' } }));
  const body = rows.map((r, ri) => r.map((c) => ({ text: R(String(c), { fontSize: fs, fontFace: FONT, color: C.INK }), options: { fontSize: fs, fontFace: FONT, color: C.INK, fill: { color: ri % 2 ? C.WHITE : C.TINT }, valign: 'middle' } })));
  s.addTable([hdr, ...body], { x: 0.5, y: top, w: W - 1, colW, border: { type: 'solid', color: C.LINE, pt: 0.5 }, rowH: 0.3, autoPage: false });
  notes(s, note); footer(s);
}
/** 큰 숫자 */
function statsSlide({ t, sub, stats, foot, note }) {
  const s = pres.addSlide(); title(s, t, sub);
  const top = sub ? 1.6 : 1.4, gw = (W - 1 - (stats.length - 1) * 0.3) / stats.length;
  stats.forEach((st, i) => {
    const x = 0.5 + i * (gw + 0.3);
    s.addShape(pres.ShapeType.roundRect, { x, y: top, w: gw, h: 2.6, fill: { color: C.TINT }, line: { color: C.LINE, width: 0.75 }, rectRadius: 0.12 });
    s.addText(st.n, T({ x, y: top + 0.35, w: gw, h: 1.1, fontSize: st.size || 44, bold: true, color: C.BLUE, align: 'center', valign: 'middle' }));
    s.addText(st.l, T({ x: x + 0.2, y: top + 1.45, w: gw - 0.4, h: 0.5, fontSize: 13.5, bold: true, color: C.NAVY, align: 'center' }));
    s.addText(R(st.d, { fontSize: st.dsize || 10.5, color: C.MUT }), T({ x: x + 0.15, y: top + 1.85, w: gw - 0.3, h: 0.7, fontSize: st.dsize || 10.5, color: C.MUT, align: 'center', valign: 'top' }));
  });
  if (foot) s.addText(bulletsText(foot, 12), T({ x: 0.5, y: top + 2.95, w: W - 1, h: H - top - 3.7, valign: 'top' }));
  notes(s, note); footer(s);
}
/** 단계 흐름 */
function stepsSlide({ t, sub, steps, note }) {
  const s = pres.addSlide(); title(s, t, sub);
  const top = sub ? 1.5 : 1.3, gw = (W - 1 - (steps.length - 1) * 0.25) / steps.length;
  steps.forEach((st, i) => {
    const x = 0.5 + i * (gw + 0.25);
    s.addShape(pres.ShapeType.roundRect, { x, y: top, w: gw, h: 4.6, fill: { color: i % 2 ? C.TINT : C.SKY }, line: { color: C.LINE, width: 0.75 }, rectRadius: 0.1 });
    s.addShape(pres.ShapeType.ellipse, { x: x + 0.2, y: top + 0.2, w: 0.55, h: 0.55, fill: { color: C.BLUE }, line: { color: C.BLUE } });
    s.addText(String(i + 1), T({ x: x + 0.2, y: top + 0.2, w: 0.55, h: 0.55, fontSize: 15, bold: true, color: C.WHITE, align: 'center', valign: 'middle' }));
    s.addText(st.h, T({ x: x + 0.2, y: top + 0.9, w: gw - 0.4, h: 0.7, fontSize: 14, bold: true, color: C.NAVY, valign: 'top' }));
    s.addText(R(st.b, { fontSize: 11.5, color: C.INK }), T({ x: x + 0.2, y: top + 1.6, w: gw - 0.4, h: 2.9, fontSize: 11.5, color: C.INK, valign: 'top' }));
  });
  notes(s, note); footer(s);
}
/** 주의 슬라이드(경고 박스) */
function cautionSlide({ t, sub, items, note }) {
  const s = pres.addSlide(); title(s, t, sub);
  let y = sub ? 1.5 : 1.3;
  const h = Math.min(1.35, (H - y - 0.7 - (items.length - 1) * 0.2) / items.length);
  items.forEach((it) => {
    s.addShape(pres.ShapeType.roundRect, { x: 0.5, y, w: W - 1, h, fill: { color: 'FBEDEA' }, line: { color: 'F2C9C1', width: 0.75 }, rectRadius: 0.1 });
    s.addText('⚠', T({ x: 0.65, y, w: 0.5, h, fontSize: 20, color: C.RED, align: 'center', valign: 'middle' }));
    s.addText(it.h, T({ x: 1.2, y: y + 0.12, w: W - 2, h: 0.35, fontSize: 13.5, bold: true, color: C.RED }));
    s.addText(R(it.b, { fontSize: 11.5, color: C.INK }), T({ x: 1.2, y: y + 0.47, w: W - 2, h: h - 0.55, fontSize: 11.5, color: C.INK, valign: 'top' }));
    y += h + 0.2;
  });
  notes(s, note); footer(s);
}

/** 좌우 비교(두 열) 슬라이드 — K-Health 랭킹 vs 우리 */
function compareSlide({ t, sub, left, right, rows, note, fs = 11.5 }) {
  const s = pres.addSlide(); title(s, t, sub);
  const top = sub ? 1.45 : 1.2, lw = 2.3, cw = (W - 1 - lw - 0.4) / 2;
  const hdr = [{ text: ' ', options: { fill: { color: C.WHITE }, fontSize: fs, fontFace: FONT } },
    { text: left, options: { bold: true, color: C.WHITE, fill: { color: '5A5A57' }, fontSize: fs + 1, fontFace: FONT, align: 'center', valign: 'middle' } },
    { text: right, options: { bold: true, color: C.WHITE, fill: { color: C.BLUE }, fontSize: fs + 1, fontFace: FONT, align: 'center', valign: 'middle' } }];
  const body = rows.map((r, ri) => [
    { text: r[0], options: { bold: true, fontSize: fs, fontFace: FONT, color: C.NAVY, fill: { color: C.TINT }, valign: 'middle' } },
    { text: R(r[1], { fontSize: fs, fontFace: FONT, color: C.INK }), options: { fontSize: fs, fontFace: FONT, color: C.INK, fill: { color: ri % 2 ? C.WHITE : 'FAFAF8' }, valign: 'middle' } },
    { text: R(r[2], { fontSize: fs, fontFace: FONT, color: C.INK }), options: { fontSize: fs, fontFace: FONT, color: C.INK, fill: { color: ri % 2 ? C.WHITE : C.SKY }, valign: 'middle' } }]);
  s.addTable([hdr, ...body], { x: 0.5, y: top, w: W - 1, colW: [lw, cw, cw], border: { type: 'solid', color: C.LINE, pt: 0.5 }, rowH: 0.3, autoPage: false });
  notes(s, note); footer(s);
}
/** 판정 목록(반영 ○ / 부분 △ / 미반영 ✕) */
function verdictSlide({ t, sub, items, note }) {
  const s = pres.addSlide(); title(s, t, sub);
  let y = sub ? 1.45 : 1.2; const h = Math.min(0.95, (H - y - 0.7 - (items.length - 1) * 0.12) / items.length);
  const COL = { '○': C.GREEN, '△': C.AMBER, '✕': C.RED };
  items.forEach((it) => {
    s.addShape(pres.ShapeType.roundRect, { x: 0.5, y, w: W - 1, h, fill: { color: C.TINT }, line: { color: C.LINE, width: 0.75 }, rectRadius: 0.08 });
    s.addShape(pres.ShapeType.ellipse, { x: 0.65, y: y + h / 2 - 0.25, w: 0.5, h: 0.5, fill: { color: COL[it.v] || C.MUT }, line: { color: COL[it.v] || C.MUT } });
    s.addText(it.v, T({ x: 0.65, y: y + h / 2 - 0.25, w: 0.5, h: 0.5, fontSize: 14, bold: true, color: C.WHITE, align: 'center', valign: 'middle' }));
    s.addText(it.h, T({ x: 1.3, y: y + 0.08, w: 3.4, h: h - 0.16, fontSize: 12.5, bold: true, color: C.NAVY, valign: 'middle' }));
    s.addText(R(it.b, { fontSize: 11, color: C.INK }), T({ x: 4.8, y: y + 0.08, w: W - 5.4, h: h - 0.16, fontSize: 11, color: C.INK, valign: 'middle' }));
    y += h + 0.12;
  });
  notes(s, note); footer(s);
}
/** 로드맵(가로 타임라인) */
function roadmapSlide({ t, sub, phases, note }) {
  const s = pres.addSlide(); title(s, t, sub);
  const top = sub ? 1.6 : 1.4, gw = (W - 1 - (phases.length - 1) * 0.2) / phases.length;
  s.addShape(pres.ShapeType.line, { x: 0.5, y: top + 0.45, w: W - 1, h: 0, line: { color: C.LINE, width: 2 } });
  phases.forEach((p, i) => {
    const x = 0.5 + i * (gw + 0.2);
    s.addShape(pres.ShapeType.ellipse, { x: x + gw / 2 - 0.22, y: top + 0.23, w: 0.44, h: 0.44, fill: { color: p.color || C.BLUE }, line: { color: C.WHITE, width: 2 } });
    s.addText(p.when, T({ x, y: top + 0.8, w: gw, h: 0.35, fontSize: 12, bold: true, color: p.color || C.BLUE, align: 'center' }));
    s.addText(p.h, T({ x, y: top + 1.15, w: gw, h: 0.55, fontSize: 14, bold: true, color: C.NAVY, align: 'center', valign: 'top' }));
    s.addShape(pres.ShapeType.roundRect, { x, y: top + 1.75, w: gw, h: H - top - 2.5, fill: { color: C.TINT }, line: { color: C.LINE, width: 0.75 }, rectRadius: 0.1 });
    s.addText(bulletsText(p.items, 11), T({ x: x + 0.15, y: top + 1.9, w: gw - 0.3, h: H - top - 2.8, valign: 'top' }));
  });
  notes(s, note); footer(s);
}
/** 핵심 문장 한 줄(강조) */
function quoteSlide({ t, q, by, note }) {
  const s = pres.addSlide(); s.background = { color: C.SKY };
  if (t) s.addText(t, T({ x: 0.8, y: 0.6, w: W - 1.6, h: 0.5, fontSize: 16, bold: true, color: C.BLUE }));
  s.addText(q, T({ x: 0.8, y: 1.6, w: W - 1.6, h: 3.4, fontSize: 26, bold: true, color: C.NAVY, valign: 'middle' }));
  if (by) s.addText(by, T({ x: 0.8, y: 5.3, w: W - 1.6, h: 0.6, fontSize: 12.5, color: C.MUT }));
  notes(s, note); footer(s);
}

await prepareJpgs(SHOTS);
// ═════════════════════════ 내용 (100쪽) ═════════════════════════
cover();                                                                                                   // 1
toc([                                                                                                      // 2
  ['왜 이 도구인가', '목적과 성격 · 자료 11종 · 지역 단위 · 값의 종류 · 갱신 주기 · CIAT 대비'],
  ['시작하기', '화면 구성 · 홈 카드 · 검색 · 지표/지역/연도 · 공유·내려받기'],
  ['메뉴별 활용법', '지표 분석 12 · 지역 프로파일 12 · 성과지표 · 지역 비교 · 예방·관리 · 연관지표 · 핫스팟 · 연대기 · 조사 단위 · 자료원 · 의견·문의'],
  ['활용 시나리오 5가지', '지역보건의료계획 현황 분석 · 사업 우선순위 · 목표치 · 보고서 · 의회·주민 설명'],
  ['해석 주의와 FAQ', '표본오차 · 결과지표 · 지역 단위 · 격차 수치 · 근사 지표'],
  ['K-Health 랭킹(communityhealth.kr)과의 비교', '한림대 사회의학연구소(김동현 교수) 방법론 · 반영한 것 · 반영하지 않을 것 · 2024 실증 대조'],
  ['발전방안', '데이터 · 방법 · 기능 · 운영 · 로드맵'],
  ['참고문헌', '대시보드 화면 하단 「참고문헌」과 같은 번호'],
]);

// ─── PART 1 ───
divider(1, '왜 이 도구인가', '공표 통계를 모아 시군구·보건소 단위 건강수준을 한 화면에서 보여 주는 「건강수준 모니터링·목표치 설정 지원 도구」입니다.');   // 3
statsSlide({                                                                                               // 4
  t: '지금 담긴 것', sub: '2026년 10월 기준 · 모두 공표 통계, 자체 산출 2종은 「근사」 표기',
  stats: [
    { n: '171', l: '지표', d: '지역사회건강조사 41{r:chs} · 결과·환경 DB 115{r:kdh} · 암검진 7{r:cancer} · 일반검진 4{r:nhis} · 건강수명 3{r:hle} · 박탈지수 1{r:dep}', dsize: 9.5 },
    { n: '258', l: '보건소 조사 단위', d: '질병관리청 공표 기준{r:chs25}. 행정 시군구 229곳{r:mois} · 시도 17곳' },
    { n: '2008~2025', size: 32, l: '연도', d: '지역사회건강조사 18년{r:chs} · 사망원인 2025년분 반영{r:mort} · 검진 ~2024{r:nhis}' },
    { n: '11', l: '자료원', d: '질병관리청 · 국가데이터처 · 국민건강보험공단 · 행정안전부 · 환경부 등' },
  ],
  foot: ['서버가 없는 정적 한 파일(약 9.9MB)이라 설치·로그인 없이 주소만 열면 되고, 휴대폰에서도 같은 화면이 나옵니다.', '같은 내용이 health-profile.kr 과 soonryu74.github.io/health-dashboard 두 주소에 올라갑니다.'],
});
cardsSlide({                                                                                               // 5
  t: '이 도구가 하는 일 · 하지 않는 일', sub: '먼저 성격을 분명히 해야 해석 오류가 줄어듭니다',
  items: [
    { icon: '○', h: '우리 지역 건강수준 파악', b: '지표 하나를 고르면 현황 타일·지도·추이·순위·연도표·격차·형평성·근거 지침이 한 화면에(CIAT 6패널 + 3).', color: C.GREEN },
    { icon: '○', h: '목표치 설정 지원', b: '통합건강증진사업 핵심성과지표 16개 중 13개를 자동 계산, 안내서의 목표치 설정법 5종을 우리 지역 값으로 바로 보여 줍니다.', color: C.GREEN },
    { icon: '○', h: '계획서 현황 분석 자동화', b: '시군구를 고르면 영역 점수 · 강점/개선 TOP5 · 건강수명 · 고위험군 · 동류군 · 우선순위 카드가 자동으로 만들어집니다.', color: C.GREEN },
    { icon: '✕', h: '사업 성과 평가는 하지 않습니다', b: '보건소 사업 실적(투입·산출) 자료가 없습니다. 사망·유병 같은 결과지표는 변화가 느리고 원인이 여럿이라 「사업 기여」로만 읽어야 합니다.', color: C.RED },
  ],
});
tableSlide({                                                                                               // 6
  t: '자료원 11종', sub: '원 출처 기관 기준 · 「자료원」 탭 카드와 같은 구성',
  head: ['자료원', '기관', '지표 수', '연도', '갱신'], colW: [3.6, 2.6, 1.0, 2.1, 3.03], fs: 10.5,
  rows: [
    ['지역사회건강조사{r:chs}', '질병관리청', '41', '2008~2025', '연 1회(12월)'],
    ['사망원인통계(표준화사망률 22종){r:mort}', '국가데이터처(옛 통계청)', '22', '2008~2025', '연 1회(9월 하순)'],
    ['법정감염병 발생보고{r:inf}', '질병관리청', '12', '2008~2024', '연 1회'],
    ['국가암검진 수검률{r:cancer}', '국민건강보험공단', '7', '2015~2024', '연 1회(연말~연초)'],
    ['건강보험·의료이용·검진·의료자원{r:nhis}', '국민건강보험공단', '33', '2008~2024', '연 1회'],
    ['인구·사회·경제·복지시설{r:pop}', '국가데이터처·행정안전부·보건복지부 등', '24', '2008~2024', '연 1회'],
    ['환경·안전{r:env}', '환경부·국토부·도로교통공단', '28', '2008~2024', '연 1회'],
    ['건강수명(근사 산출){r:hle}', '자체 산출', '3', '2008~2025', '사망원인 공표 후'],
    ['지역박탈지수(근사){r:dep}', '자체 산출(인구주택총조사)', '1', '2015·2020', '총조사 5년'],
    ['감염병 고위험군{r:risk}', '자체 집계(복수 출처)', '30', '2024', '비정기'],
    ['코로나19 확진·사망{r:covid}', '질병관리청', '3', '2020~2023.8', '종료(1회성)'],
  ],
});
cardsSlide({                                                                                               // 7
  t: '지역 단위 — 숫자가 다른 이유', sub: '258 · 229 · 17 은 틀린 게 아니라 단위가 다른 것입니다',
  items: [
    { icon: '258', h: '보건소 조사 단위', b: '지역사회건강조사는 「시·군·구별 약 900명 × 258개 지역」으로 조사하고 전국 대푯값을 시·군·구 중앙값으로 공표합니다{r:chs25}. 조사 지표 41개의 전국 순위·중앙값·백분위는 이 258곳 기준입니다.' },
    { icon: '229', h: '행정 시군구', b: '기초자치단체 226곳 + 제주 행정시 2곳 + 세종시{r:mois}. 사망률·검진·인구처럼 행정 단위로 공표되는 자료와 지역 프로파일 종합 순위의 기준입니다.' },
    { icon: '17', h: '시도', b: '광역 비교와 17개 시도 순위. 세종은 단층제라 시도 값이 곧 시군구 값입니다.' },
    { icon: '리그', h: '도시/군 리그 · 동류군 12곳', b: '종합 순위는 도시(구·시) 148곳과 군 82곳을 따로 매깁니다. 동류군은 고령화율·재정자립도·인구밀도·박탈분위가 비슷한 12곳입니다.', color: C.GREEN },
  ],
});
cardsSlide({                                                                                               // 8
  t: '값의 종류 — 배지와 숫자 읽는 법', sub: '지표 화면 상단과 순위 카드에 나오는 것',
  items: [
    { icon: '값', h: '조율 vs 표준화율', b: '지역 간 비교는 표준화율(연령 구조 보정, 기본값), 우리 지역 실제 규모는 조율. 2025년 비만율은 조율 중앙값 33.5% · 표준화율 35.4%로 다릅니다.' },
    { icon: '↑↓', h: '방향', b: '「높을수록 양호」·「낮을수록 양호」·「맥락(방향 없음)」. 지도 색과 순위 방향, 백분위 계산이 모두 이 확정표{r:dir}를 따릅니다.' },
    { icon: '%', h: '백분위와 묶음', b: '「전국 258곳 중 상위 몇 %」. 순위 패널의 「⑩ 묶음」은 값이 비슷한 지역을 10개로 나눠 같은 묶음 안의 순서 차이를 읽지 않게 합니다.' },
    { icon: 'CI', h: '신뢰구간 · 불안정값', b: '표본조사 값은 95% 신뢰구간이 겹치면 순위 차이를 확신할 수 없습니다. 표준오차가 값의 20%를 넘는 값은 「불안정」으로 제외됩니다(통계청·질병관리청 기준은 30%).', color: C.AMBER },
  ],
});
tableSlide({                                                                                               // 9
  t: '자료 갱신 주기와 최신성', sub: '원천이 공표되면 반영 · 「자료원」 탭 카드의 「최종 갱신」·「다음 공표」',
  head: ['자료', '최신 연도', '다음 공표(예상)', '비고'], colW: [4.0, 1.6, 2.6, 4.13],
  rows: [
    ['지역사회건강조사{r:chs}', '2025', '2026년 12월', '심폐소생술 2종은 원천 표에 2025년 값 없음'],
    ['사망원인통계 · 건강수명{r:mort,hle}', '2025', '2027년 9월 하순', '2025년분 2026-09-22 공표 → 9-25 반영. 영아사망률만 2024'],
    ['국가암검진 · 일반건강검진{r:cancer,nhis}', '2024', '2026년 12월~2027년 1월', '검진 판정은 2018년 제도 개편으로 정의 변경'],
    ['미세먼지 2종{r:env} · 진료실인원{r:nhis}', '2020 · 2021', '—', '원천 DB 갱신 대기'],
    ['등록장애인 2017 · 사회복지시설·교통사고 2022 · 병상 2023', '2017~2023', '—', '지표별 최신 연도는 자료원 탭'],
    ['코로나19 확진·사망{r:covid}', '2023.8', '없음', '전수감시 종료 · 신고 보건소 관할 기준'],
  ],
});
tableSlide({                                                                                               // 10
  t: 'CIAT(질병관리청 분석도구)와 무엇이 같고 다른가',
  head: ['구분', 'CIAT', 'health-profile.kr'], colW: [2.2, 5.0, 5.13],
  rows: [
    ['지표별 6패널', '현황·추이·단계구분도·순위·연도별 추이·격차', '동일 + 형평성·근거 지침 · 신뢰구간·묶음·전체 보기·인쇄·영상'],
    ['심층분석', '연관지표·핫스팟·황금다이아몬드', '동일 3종(브라우저 즉시 계산) + 근거 지침'],
    ['자료', '조사 지표 98 · e-지방지표 157{r:ciat}', '조사 41{r:chs} + 결과·환경 115{r:kdh} + 암검진 7 + 일반검진 4 + 건강수명 3 + 박탈 1'],
    ['지역 단위', '시도·시군구', '시도 17 · 시군구 229{r:mois} · 보건소 조사 단위 258{r:chs25}(자료 유무 표기)'],
    ['지역 프로파일', '없음', '영역 점수·등급·강점/개선·동류군·우선순위·고위험군·건강수명'],
    ['근거·사업 연결', '없음', 'NICE·CPSTF 권고, 예방·관리 지식베이스 182항목'],
    ['공유·내보내기', '이미지', 'URL 공유, SVG(PPT 편집)·PNG·CSV, 인쇄, MP4'],
    ['기술', 'R Shiny(서버)', '정적 단일 파일 — 서버 없음, 휴대폰·오프라인'],
  ],
});

// ─── PART 2 ───
divider(2, '시작하기', '설치가 필요 없습니다. https://health-profile.kr 을 열면 바로 씁니다. 크롬·엣지·사파리·휴대폰 브라우저 모두 지원합니다.');   // 11
shot({ t: '화면 구성', sub: '제목(누르면 홈) · 검색 · 메뉴 탭 12개 · 글자 크기 · 다크 모드 · 선택 컨트롤 · 연도 · 요약 타일 · 카드', img: ['A_home_top'],   // 12
  bullets: ['① 제목: 누르면 언제든 홈으로.', '② ⌕ 검색: 메뉴·카드·지표·지역을 이름으로 찾아 바로 이동.', '③ 메뉴 탭 12개: 홈 · 지표 분석 · 지역 프로파일 · 성과지표 · 지역 비교 · 예방·관리 · 연관지표 · 핫스팟 · 연대기 전시관 · 조사 단위 · 자료원 · 의견·문의', '④ 지표·시도·시군구·비교 담기·값 유형 컨트롤 ⑤ 연도 슬라이더와 ▶ 재생 ⑥ 요약 타일 4개와 분석 카드'],
  tips: ['화면 상태는 주소(URL)에 담깁니다. 주소만 복사해 보내면 같은 화면이 열립니다.', '모든 카드 오른쪽 위에 ↓SVG·↓PNG·↓CSV 버튼이 있습니다.'] });
shot({ t: '홈 — 카드 5장', sub: '첫 화면은 질문 4개 + 「처음이세요?」 안내로 시작합니다', img: ['A0_home_grid'], wide: true,   // 13
  bullets: ['① 17개 시도 건강 지도 — 대표 지표 4종(흡연·고위험음주·비만·걷기), 시도를 누르면 그 시도 분석으로.', '② 258개 보건소 순위 — 상위 10곳 + 「우리 보건소 찾기」(하위 순위는 첫 화면에 싣지 않음).', '③ 취약인구 규모 — 65세 이상·독거노인·등록장애인·기초생활수급자·영유아·외국인(17개 시도 합계).', '④ 지자체 계획 수립 — 제9기 지역보건의료계획(2027~2030) 현황 → 우선순위 → 목표치 → 사업 선정 4단계로 메뉴 연결.', '⑤ 처음이세요? — 소개 영상 2편 플레이어 + 사용설명서·활용법 PDF/PPT 내려받기(머리글 「? 도움말」과 같은 내용).'] });
shot({ t: '검색 — 어느 메뉴에 있든 이름만 치면 갑니다', sub: '오른쪽 위 「⌕ 검색」, 또는 키보드 / · Ctrl+K', img: ['A_search'],   // 14
  bullets: ['메뉴 12개 · 화면 안 카드 33개 · 지표 171개 · 지역(시도·시군구·보건소) · 자료원 · FAQ · 예방·관리 항목 182개를 한 상자에서.', '「건강수명」을 치면 지역 프로파일의 카드, 지표 분석의 지표 3개, 자료원 카드가 함께 나옵니다.', '결과를 누르면 그 메뉴로 옮겨 가 카드까지 내려가고 2초간 테두리가 깜박입니다.', '↑↓ 이동 · Enter 열기 · Esc 닫기.'],
  tips: ['보건소 이름(「장안」·「동부」)으로도 찾습니다.', '「격차」·「갱신」처럼 하고 싶은 일을 쳐도 됩니다.'] });
shot({ t: '지표 선택', sub: '지표 상자를 누르면 검색창과 영역 칩이 열립니다', img: ['A_picker_open', 'A_controls'],   // 15
  bullets: ['검색: 「흡연」·「우울」처럼 단어 일부만.', '영역 칩: 흡연·음주·신체활동·식생활·정신건강·구강·만성질환·예방·의료이용 + 사망률·감염병·검진·자원·인구·환경·암검진·건강수명·박탈.', '이름 뒤의 작은 글씨가 연도 범위와 방향입니다.'],
  tips: ['보고서용 핵심 지표는 질병관리청 요약집 25개 지표부터(연대기 「변화의 벽」).', '지표를 바꿔도 지역·연도는 유지됩니다.'] });
shot({ t: '지역 선택과 비교 범위', sub: '시도 → 시군구 순. 「시도 전체」를 두면 시도 단위 값', img: ['A_controls'],   // 16
  bullets: ['시도 전체: 17개 시도 비교와 시도 값(시도 순위·백분위).', '시군구: 순위·백분위의 비교 기준을 「전국」 또는 「시도 내」로.', '비교 담기: 지금 고른 지역을 「지역 비교」 바구니에(최대 6개).', '값 유형: 표준화율(기본) · 조율.'],
  tips: ['시도 내 순위가 더 설득력 있을 때가 많습니다(여건이 비슷한 이웃과 비교).', '수원시처럼 보건소가 여러 곳인 시는 조사 지표의 시 전체 순위가 없고 보건소별로 안내됩니다.'] });
shot({ t: '연도 이동과 재생', sub: '슬라이더를 끌거나 ▶ 를 누르면 지도·순위·타일이 해마다 바뀝니다', img: ['A_year', 'A_kpis'],   // 17
  bullets: ['연도는 지표마다 다릅니다(조사 2008~2025, 사망원인 ~2025, 검진 ~2024).', '▶ 재생은 한 해씩 넘어가며 지도 색과 순위 자리가 움직입니다.', '연도별 추이표에서 행을 눌러도 그 연도로 갑니다.'],
  tips: ['재생 중에는 상단에 연도 막대가 떠서 어디까지 왔는지 보입니다.'] });
shot({ t: '요약 타일 4개 읽기 — 강릉시 비만율 2025', sub: '값·전년 대비 / 전국 중앙값과 차이 / 순위 / 양호도 백분위', img: ['A_kpis'], wide: true,   // 18
  bullets: ['값과 전년 대비 증감(%p). 색이 초록이면 좋아진 방향, 붉으면 나빠진 방향.', '전국 시군구 중앙값(조사 지표는 258곳 기준{r:chs25})과의 차이, 소속 시도 값.', '전국 순위(양호한 순)와 시도 내 순위 · 지표 방향.', '양호도 백분위 0~100(높을수록 양호) 게이지.'],
  tips: ['순위 하나로 단정하지 마십시오. 순위 카드에서 신뢰구간이 겹치는 지역은 흐리게 표시됩니다.'] });
shot({ t: '화면 설정과 휴대폰', sub: 'A−/A+ 글자 크기 · ☾ 다크 모드 · 휴대폰 1열', img: ['A_dark', 'A_mobile'],   // 19
  bullets: ['글자 크기와 다크 모드는 브라우저에 기억됩니다.', '지도 라벨 색은 구역 색의 밝기에 맞춰 다크 모드에서도 읽힙니다.', '휴대폰에서는 모든 카드가 1열로, 표는 좌우로 밀어 봅니다.'],
  tips: ['카카오톡 안에서 링크를 열었다면 「다른 브라우저로 열기」를 먼저 — 파일 저장이 막혀 있습니다.'] });
cardsSlide({                                                                                               // 20
  t: '공유 · 내려받기 · 인쇄 · 영상', sub: '보고서와 발표자료에 바로 쓰는 4가지 길',
  items: [
    { icon: 'URL', h: '주소 공유', b: '지표·지역·연도·메뉴·비교 바구니가 주소에 담깁니다. 복사해 메일·메신저로 보내면 같은 화면.' },
    { icon: '↓', h: 'SVG · PNG · CSV', b: '카드마다 오른쪽 위 버튼. SVG는 파워포인트에서 글자·색을 편집할 수 있고 제목·범례가 포함됩니다. CSV는 표·목록 전량.' },
    { icon: '🖨', h: '인쇄', b: '순위 「⛶ 전체 보기」의 🖨 — 258곳 막대 순위가 세로로 길게, 버튼·연도칩 없이 인쇄됩니다.' },
    { icon: '🎬', h: 'MP4 영상', b: '「⛶ 전체 보기」의 🎬 — 2008년부터 순위가 움직이는 애니메이션을 1280×720 MP4로 저장(파워포인트 삽입 가능, 25곳 기준 약 27초).' },
  ],
});

// ─── PART 3 ───
divider(3, '메뉴별 활용법', '12개 메뉴를 「언제 쓰나 · 무엇을 보나 · 어떻게 읽나」로 설명합니다. 예시는 실제 데이터 값입니다.');   // 21
shot({ t: '3.1 지표 분석 — 단계구분도', sub: '지도 위 「전국 시도 / 전국 시군구 / 시도 내 시군구」 + 🏷 지역명', img: ['B_analysis_00'],   // 22
  bullets: ['7단계 분위 색. 나쁜 지표는 붉은색, 좋은 지표는 파란색, 맥락 지표는 보라색 계열.', '지역을 누르면 그 지역이 선택되고 모든 카드가 따라 바뀝니다.', '▶ 재생으로 연도별 색 변화를 봅니다.'],
  tips: ['시도 내 시군구 모드는 분위도 시도 안에서 다시 나눕니다 — 전국 모드와 색이 달라도 틀린 게 아닙니다.'] });
shot({ t: '3.1 지표 분석 — 지도 3모드', sub: '같은 지표를 시도 17면 · 전국 시군구 · 시도 내로', img: ['B_map_sido', 'B_map_nation'],   // 23
  bullets: ['전국 시도: 시군구 폴리곤을 시도별로 합친 17면, 분위는 시도 값 기준.', '전국 시군구: 229곳(조사 지표는 보건소 단위 값).', '시도 내: 우리 시도만 확대.'],
  tips: ['라벨은 면적이 큰 폴리곤부터 배치해 겹치지 않습니다. 발표 캡처는 🏷 켜고 ↓PNG.'] });
shot({ t: '3.1 지표 분석 — 추이', sub: '선택 지역 · 소속 시도 · 전국 중앙값 세 줄', img: ['B_analysis_01'],   // 24
  bullets: ['점을 올리면 그해 값, 눌러서 연도 이동.', '지표 노트(⚠)가 있으면 정의 변경 연도 이전과 비교하지 마십시오(예: 검진 정상A 2018년 계단).', '방향 근거와 결과사슬 계층 배지가 카드 위에 있습니다.'] });
shot({ t: '3.1 지표 분석 — 순위', sub: '17개 시도 / 전국 시군구 258 / 시도 내 / 보건소 단위', img: ['B_analysis_02'],   // 25
  bullets: ['양호한 순 ▼ ↔ 나쁜 순 ▲ 토글.', '조사 지표는 보건소 258곳 기준(질병관리청 공표 방식). 수원시를 고르면 소속 보건소 4곳이 강조됩니다.', '40개 이하 목록은 스크롤 없이 전부 펼쳐집니다.'],
  tips: ['↓CSV로 순위 전량을 받아 엑셀에서 쓰십시오.'] });
shot({ t: '3.1 지표 분석 — 신뢰구간과 불안정값', sub: '표본조사 값의 한계를 화면이 보여 줍니다', img: ['B_rank_ci'],   // 26
  bullets: ['⟺ 신뢰구간: 막대 위 95% 오차막대 + ±표기.', '선택 지역과 신뢰구간이 겹치는 지역은 흐리게 — 차이를 확신할 수 없는 곳.', '불안정값 제외: 표준오차 > 값의 20%(County Health Rankings 규칙{r:rank}). 우울증상 유병률은 258곳 중 절반 이상이 제외됩니다.'],
  tips: ['보고서 문장: 「95% 신뢰구간 34.7~42.1%」처럼 구간을 함께 적으십시오.'] });
shot({ t: '3.1 지표 분석 — ⑩ 묶음', sub: '1~258 서열 대신 값이 비슷한 지역 묶음 10개', img: ['B_rank_group'],   // 27
  bullets: ['Fisher–Jenks 최적 분할로 데이터 안의 간격에서 끊습니다. 묶음 크기는 제각각.', '같은 묶음 안의 순서 차이는 의미가 없습니다 — 범례에 명시.', '미국 County Health Rankings가 2024년부터 순위 대신 10개 그룹을 쓰는 방식에 대응{r:rank}.'] });
shot({ t: '3.1 지표 분석 — ⛶ 전체 보기', sub: '258곳 막대 순위를 한 화면에, 연도 재생으로 자리 이동', img: ['B_rankall'], wide: true,   // 28
  bullets: ['막대 길이 = 값(전 연도 공통 척도라 해마다 늘고 줄어드는 게 보임). 선택 지역은 붉은 막대, ▲▼는 전년 대비 순위 변동.', '항상 1열 — 25곳이든 258곳이든 위에서 아래로, 격차가 한눈에.'] });
shot({ t: '3.1 지표 분석 — 인쇄와 영상', sub: '🖨 세로 인쇄 · 🎬 MP4 저장 · ↓SVG 6열 조판', img: ['B_rankall_head', 'B_rankall_print'],   // 29
  bullets: ['🖨: 이 화면만 세로로 길게, 색 그대로.', '🎬: 범위(전체·상위 30·상위 50)를 고르면 2008년부터 순위가 움직이는 영상. 선택 지역은 범위 밖이어도 맨 아래 한 줄로.', 'Space 재생 · ← → 연도 · Esc 닫기.'] });
shot({ t: '3.1 지표 분석 — 연도별 추이표', sub: '수치 · 전국 순위 · 시도 내 순위 · 증감량(%p) · 증감률(%)', img: ['B_analysis_03'],   // 30
  bullets: ['증감량은 %p, 증감률은 %. 둘을 섞어 쓰지 마십시오.', '행을 누르면 그 연도로 이동.', '↓CSV.'] });
shot({ t: '3.1 지표 분석 — 지역 간 격차', sub: '연도별 상자그림(최소·1사분위·중앙·3사분위·최대) + 우리 지역 점', img: ['B_analysis_04'],   // 31
  bullets: ['각주에 그해 최댓값·최솟값 지역과 최대−최소 격차.', '상자가 길어지면 지역 간 차이가 벌어진 것, 우리 점이 상자 위·아래 어디에 있는지가 위치입니다.'],
  tips: ['최대−최소는 극단 지역 한 곳에 흔들립니다. 상·하위 20% 경계값 차이 등 보완 방식을 준비 중입니다(PART 5·7).'] });
shot({ t: '3.1 지표 분석 — 건강형평성', sub: '지역박탈지수(근사) 5분위별 분포', img: ['B_analysis_05'],   // 32
  bullets: ['전국 시군구를 박탈지수로 5등분해 지표 분포를 비교. 5분위−1분위 중앙값 차이가 각주에.', '「산출 예시」를 펼치면 우리 지역 7개 변수의 z점수 계산이 그대로 나옵니다.', '박탈지수는 2020 인구주택총조사 집계표 근사값 — 공식 통계 아님{r:dep}.'] });
shot({ t: '3.1 지표 분석 — 현행 근거 지침', sub: '영국 NICE 가이드라인{r:nice} + 미국 CPSTF 권고{r:cpstf}', img: ['B_evidence'],   // 33
  bullets: ['지표와 직접·부분 관련된 NICE 지침, 발표·최종 갱신 연도, 권고 수.', '판정 배지: 현행(10년 내 갱신) · 얇음 · CPSTF만 · 오래됨 · 없음.', 'CPSTF는 「원문 ↗」과 「권고 N건 보기」로 개별 권고 원문까지 연결.'],
  tips: ['계획서 「근거」 란에 가이드라인 번호(예: NG92)와 갱신 연도를 인용하십시오.'] });
shot({ t: '3.2 지역 프로파일 — 한 장 요약', sub: '시군구를 고르면 자동 생성 · 서울 강남구 예', img: ['C_profile_top'], wide: true,   // 34
  bullets: ['상단: 리그 순위(도시/군) · 등급 배지(플래티넘 10%·골드 25%·실버 50%) · 최저 영역 경고 · 박탈 분위 · 종합 양호도.', '카드: 순위 산출 방식 → 영역별 순위 → 강점/개선 TOP5 → 건강수명 → 고위험군 → 황금다이아몬드 → 동류군 → 권고 사업 → 우선순위 → 개선 과제 → 전체 지표.'] });
shot({ t: '3.2 지역 프로파일 — 순위 산출 방식', sub: '랭킹 방법론 v1{r:rank}: 균등 가중 · 3년 이동평균 · 도시/군 리그 · 결과지표 제외', img: ['C_profile_01'],   // 35
  bullets: ['가중치: 균등(기본) / 모의 패널(검증용) / 직접 입력. 모의 패널은 AI 시뮬레이션이라 근거로 쓰지 않습니다.', '3년 평균으로 한 해의 표본오차를 누르고, 리그로 여건이 다른 군과 도시를 따로 세웁니다.', '결과지표(사망·유병·건강수명)와 진단 경험률 등 4종은 순위에서 뺍니다.'] });
shot({ t: '3.2 지역 프로파일 — 영역별 순위와 수치', sub: '9개 영역 점수(백분위 평균)와 리그 내 순위', img: ['C_profile_06'],   // 36
  bullets: ['영역을 누르면 그 영역 지표 목록이 펼쳐지고, 지표를 누르면 지표 분석으로 갑니다.', '최저 영역이 25점 미만이면 상단에 ⚠ 경고.'],
  tips: ['계획서 「현황 분석」의 영역별 표를 이 카드 ↓CSV로 만드십시오.'] });
shot({ t: '3.2 지역 프로파일 — 강점 TOP 5 · 가장 개선된 지표 TOP 5', sub: '강점은 항상 5개가 보장됩니다(약점은 「개선 과제」에 접어 둠)', img: ['C_profile_07', 'C_profile_08'],   // 37
  bullets: ['강점: 백분위가 높은 지표. 개선: 3년 평균 간 방향 보정 변화량이 큰 지표.', '주민 설명자료·의회 보고의 첫 쪽에 쓰기 좋은 카드입니다.'] });
shot({ t: '3.2 지역 프로파일 — 기대수명 · 건강수명(근사)', sub: '사망원인통계{r:mort}·연앙인구 3년 합산 생명표 + 주관적 건강 기반{r:hle}', img: ['C_profile_02'],   // 38
  bullets: ['전국은 통계청 공식값과 소수 첫째 자리까지 일치하도록 앵커링, 시군구는 근사값.', '「산출 예시」를 펼치면 ①주관적 건강인지율 → ②불건강률 → ③오즈비 → ④Sullivan 계산이 우리 지역 숫자로 나옵니다.', '반드시 「주관적 건강 기반·근사」를 붙여 쓰고 1~2위 차이는 읽지 마십시오(±0.5~1세 오차).'] });
shot({ t: '3.2 지역 프로파일 — 감염병 대응 고위험군', sub: '30개 집단 규모(실측/추정 구분){r:risk} + 코로나19 실적 참고{r:covid}', img: ['C_profile_03'],   // 39
  bullets: ['65세 이상·기저질환·임신부·영유아·감염취약시설·사회적 취약·예방접종·대응 자원. 집단은 겹치므로 더하지 않습니다.', '코로나19: 65세 이상 비율 4분위별 치명률 0.077 → 0.146%(2배). 자료가 신고 보건소 관할 기준이라 시군구 순위는 표시하지 않습니다.'] });
shot({ t: '3.2 지역 프로파일 — 황금다이아몬드', sub: '시간축(기준연도 대비) × 공간축(비교지역 대비) 3×3 → 1~5순위 · CIAT와 같은 구조{r:ciat}', img: ['C_profile_04'],   // 40
  bullets: ['시간: 당해 값 vs 기준연도 평균 → 개선·유지·악화. 공간: 비교 지역(시도 전체 또는 전국 중앙값) 대비 → 좋음·비슷·나쁨.', '1순위 = 악화 + 나쁨. 표는 그 순서로 정렬.', '괄호의 %는 상대 변화라 값이 작은 지표에서 크게 튑니다(6.2→3.4는 +83%지만 2.8%p).'] });
shot({ t: '3.2 지역 프로파일 — 동류군 비교', sub: '여건이 비슷한 12개 시군구(고령화율·재정자립도·인구밀도·박탈분위 표준화 거리)', img: ['C_profile_05'],   // 41
  bullets: ['「여건이 다른데 왜 줄 세우나」에 대한 답. Z-점수는 ±3에서 절단.', '동류군 안에서 우리 순위를 영역별로 보여 줍니다.', '지역을 누르면 그 지역 프로파일로.'] });
shot({ t: '3.2 지역 프로파일 — 권고 예방·관리 사업', sub: '하위 25% 지표 → 시도 → 국가 → 서태평양 → WHO 순 권고 사업 카드', img: ['C_profile_09'],   // 42
  bullets: ['카드를 누르면 「예방·관리」 탭의 해당 항목으로 이동.', '우리 시도 제8기 지역보건의료계획 항목이 먼저 나옵니다.'] });
shot({ t: '3.2 지역 프로파일 — 무엇부터 손댈 것인가', sub: '하위 30% 지표 × 현행 근거(NICE·CPSTF)', img: ['C_profile_10'],   // 43
  bullets: ['축 1 부담(백분위) · 축 2 격차(전국 최대−최소) · 축 3 수단(현행 지침 유무·갱신 연도).', '「지금 할 것」(10년 내 갱신된 직접 지침) → 「근거 얇음」 → 「CPSTF만」 → 「근거 낡음」 → 「근거 없음」 순.', '근거 공백(어디에도 없는 지표)이 접기 안에 있습니다.'] });
shot({ t: '3.2 지역 프로파일 — 개선 과제 · 전체 지표', sub: '약한 지표는 접어 두고(지자체 참고용), 전체 지표 백분위 표', img: ['C_profile_11', 'C_profile_12'],   // 44
  bullets: ['개선 과제는 하위 백분위 지표 목록 — 공개 설명자료에는 싣지 않는 것을 권합니다(랭킹 기획안 원칙).', '전체 지표 표는 ↓CSV로 계획서 부록에.'] });
shot({ t: '3.2 지역 프로파일 — 군 지역 예: 전남 구례군', sub: '군 리그 18위/82 · 골드 · 박탈 5분위 — 여건이 나빠도 건강행태는 상위권', img: ['C2_gurye_00', 'C2_gurye_06'],   // 45
  bullets: ['리그가 없으면 전국 229곳 중 62위, 리그로 보면 군 82곳 중 18위.', 'K-Health 랭킹(한림대)에서는 232위/257(10등급) — 사망률·소득·실업률이 순위에 들어가기 때문(PART 6).'] });
shot({ t: '3.3 성과지표 — 통합건강증진사업 핵심성과지표', sub: '16개 중 13개 자동 계산{r:khepi} · 목표치 설정법 5종 · 달성률·득점 계산기', img: ['D_kpi_00'],   // 46
  bullets: ['우리 지역 값·전국 중앙값·전년 대비가 표로. 지표를 누르면 지표 분석으로.', '안내서의 목표치 설정법(전년 대비 개선, 전국 중앙값 도달, 상위 25% 도달 등)을 우리 값으로 계산.', '미보유 3종(투약 순응률 2·모유수유)은 시군구 공표 통계가 없음 — 사유와 확보 경로를 행마다 표시.', '「이 화면의 근거」 카드에 안내서 쪽수·정의·자료원이 적혀 있어 계획서에 그대로 인용할 수 있습니다.'] });
shot({ t: '3.4 지역 비교 — 바구니와 막대', sub: '전국 중앙값 · 시도 · 시군구 섞어 최대 6곳', img: ['E_compare_00', 'E_compare_02'],   // 48
  bullets: ['지표 분석에서 「비교 담기」로 넣습니다. 처음 담을 때 전국 중앙값이 자동으로 들어갑니다.', '그해 값 막대 · 추이 비교 · 연도별 비교표.'] });
shot({ t: '3.4 지역 비교 — 추이와 연도별 표', sub: '같은 지표를 여러 지역으로', img: ['E_compare_01', 'E_compare_03'],   // 49
  bullets: ['이웃 시군구·동류군 지역을 담아 추이를 겹쳐 보십시오.', '↓SVG로 받으면 파워포인트에서 선 색·굵기를 바꿀 수 있습니다.'] });
shot({ t: '3.4 지역 비교 — 전 지표 비교표', sub: '171개 지표 × 담은 지역', img: ['E_compare_04'], wide: true,   // 50
  bullets: ['영역별로 묶인 표. 우리 지역 값이 전국 중앙값보다 나쁜 칸은 색으로.', '↓CSV 한 번이면 계획서 부록 표가 끝납니다.'] });
shot({ t: '3.5 예방·관리 — 지식베이스', sub: 'WHO 글로벌 → 서태평양 → HP2030·국가 사업 → 17개 시도 지역보건의료계획 182항목{r:hplan}', img: ['F_ncd_00'],   // 51
  bullets: ['계층 칩(전체·WHO·WPRO·국가·시도) · 시도 선택 · 검색 · 영역 칩.', '「모든 영역」이면 영역별로 묶여 소제목·개수·목차가 나옵니다.'] });
shot({ t: '3.5 예방·관리 — 항목 카드', sub: '목표 · 목표치 · 전략 · 중재/사업 · 연결 지표 · 출처(원문 열기 ↗)', img: ['F_ncd_01'], wide: true,   // 52
  bullets: ['연결 지표를 누르면 지표 분석으로, 「원문 열기 ↗」는 보건복지부·질병관리청 원문 페이지를 새 창으로.', 'AI가 수집·요약한 내용이라 수치는 원문 대조가 필요합니다(각 항목에 출처 쪽수).'] });
shot({ t: '3.5 예방·관리 — 수집 문서 54건', sub: '발간 기관·연도·확보 여부', img: ['F_ncd_02'],   // 53
  bullets: ['펼치면 문서 목록과 비고. 원문은 보관하지 않고 발행기관 링크만 둡니다.', '시도 계획서는 한국건강증진개발원 저장소가 허브입니다.'] });
shot({ t: '3.6 연관지표 — 산점도', sub: '두 지표의 관계 · 피어슨/스피어만/켄달 · 근사 p값', img: ['G_corr_01'],   // 54
  bullets: ['X·Y 지표를 고르면 전국 시군구 산점도. 우리 지역 점은 붉게.', '두 지표가 모두 조사 지표면 258곳, 아니면 229곳으로 계산.'],
  tips: ['걷기 ↔ 비만, 흡연 ↔ 폐암 사망률처럼 사업 논리를 뒷받침하는 쌍을 찾을 때. 상관은 인과가 아닙니다.'] });
shot({ t: '3.6 연관지표 — 통계와 연도별 상관', sub: '상관계수 표 + 해마다 상관이 어떻게 변했나', img: ['G_corr_02', 'G_corr_03'],   // 55
  bullets: ['세 계수가 함께 높아야 안정적인 관계입니다.', '연도별 상관이 들쭉날쭉하면 표본오차 영향이 큰 지표입니다.'] });
shot({ t: '3.7 핫스팟 — 공간 군집', sub: 'Getis-Ord Gi* 90/95/99% · 이웃은 폴리곤 인접(섬은 최근접 2곳){r:ciat}', img: ['H_hot_01'],   // 56
  bullets: ['핫스팟: 높은 값끼리 모인 곳, 콜드스팟: 낮은 값끼리 모인 곳.', '나쁜 지표의 핫스팟은 권역 사업 대상 후보.'] });
shot({ t: '3.7 핫스팟 — 목록과 추세', sub: '유의한 핫스팟·콜드스팟 목록(z 큰 순) · Mann-Kendall 추세', img: ['H_hot_02'],   // 57
  bullets: ['지역을 누르면 지표 분석으로.', '추세 모드는 연도별 Mann-Kendall z와 Sen 기울기 — 꾸준히 나빠지는 곳을 찾습니다.'] });
shot({ t: '3.8 연대기 전시관', sub: '연도별 전시실 · 올해의 10대 뉴스 · 정책 연표(링크만) · 변화의 벽', img: ['I_chron_top'], wide: true,   // 58
  bullets: ['뉴스는 시군구 중앙값(표준화율)의 전년 대비 변화로 자동 산출(역대 기록 가산, 영역당 3개·격차 3개 상한).', '지침·백서·계획은 원문 대신 발행기관 링크. ← → 키로 이동, ▶ 자동 관람.'] });
cardsSlide({                                                                                               // 59
  t: '3.8 연대기 — 10대 뉴스는 어떻게 뽑히나', sub: '설명자료의 「연도별 흐름」 쪽에 쓰기 좋습니다',
  items: [
    { icon: '①', h: '변화', b: '그해 중앙값이 전년보다 얼마나 움직였나(상대 변화 %). 작은 변화(0.3%p 미만)는 감점.' },
    { icon: '②', h: '기록', b: '역대 최고·최저면 가산. 방향이 좋은 쪽이면 「개선」, 나쁜 쪽이면 「악화」 배지.' },
    { icon: '③', h: '격차', b: '시도 간 격차(최대−최소)가 줄거나 늘면 뉴스. ※ 「격차 축소」가 양호 지역 악화 때문일 수 있어 판정 방식을 바꿀 예정(PART 7).', color: C.AMBER },
    { icon: '④', h: '상한', b: '영역당 최대 3개, 격차 뉴스 최대 3개, 지표당 1개 — 한 영역이 뉴스를 독차지하지 않게.' },
  ],
});
shot({ t: '3.9 조사 단위 — 시군구와 보건소', sub: '「이 대시보드의 시군구는 무엇을 뜻하나」 + 조사 단위 지도', img: ['J_units_00', 'J_units_01'],   // 60
  bullets: ['258 조사 단위(기준) · 263 지역보건의료기관 현황의 보건소 · 255 질병관리청 공식 목록 · 229 행정 시군구 — 숫자가 다른 이유를 화면에 적어 두었습니다{r:fac}.', '지도에서 시군구를 누르면 소속 보건소·보건지소·진료소가 나옵니다.'] });
shot({ t: '3.9 조사 단위 — 목록과 기관 수', sub: '258개 조사 단위 전량 + 시도별 지역보건의료기관 수(2025)', img: ['J_units_04'], wide: true,   // 61
  bullets: ['보건소·보건의료원·보건지소·보건진료소·건강생활지원센터 3,607곳을 조사 단위에 매핑{r:fac}.', '연도별 조사 참여 단위 수(254 → 255 → 258)도 있습니다.'] });
shot({ t: '3.10 자료원 — 카드', sub: '기관 · 지표 수 · 연도 · 단위 · 갱신 주기 · 다음 공표 · 표ID · 경유 · 한계 · 원문 링크', img: ['K_sources_01'], wide: true,   // 62
  bullets: ['자체 산출 2종에는 「근사·공식 아님」 배지와 산식 한 줄, 「한계 4가지」 접기.', '김동현 교수 DB(질병관리청 자료실)를 거친 자료는 원천이 아니라 「경유」로만 표기{r:kdh}.'] });
shot({ t: '3.10 자료원 — 보건소별 보유 현황', sub: '258행 × 자료원 매트릭스 · ● 단위 그대로 ◐ 시군구 값 대체 ○ 없음', img: ['K_sources_02'], wide: true,   // 63
  bullets: ['실제 결측은 4곳뿐(군위군 건강수명, 창원 마산·진해·창원 박탈지수).', '검색·결측 필터·↓CSV.'] });
shot({ t: '3.11 의견·문의', sub: '서버 없이 이메일·복사·GitHub 이슈 세 길 — 깨질 일이 없습니다', img: ['L_feedback_00'],   // 64
  bullets: ['구분 4종 · 내용 · 이름/소속 · 회신 이메일. 보고 있던 화면 주소와 브라우저 정보가 자동으로 붙습니다.', '초안은 브라우저에 자동 저장. 받는 곳 khealth.profile@gmail.com.'] });
shot({ t: '3.11 의견·문의 — 이 대시보드에 대하여', sub: '사용설명서 PDF·PPT · 방법론 문서 · 정오표 · 제작 크레딧', img: ['L_feedback_02', 'L_feedback_01'],   // 65
  bullets: ['사용설명서(67쪽)와 이 활용법 자료는 docs 폴더에서 내려받습니다.', '정오표{r:errata}에 지금까지 고친 오류 17건이 적혀 있습니다 — 숨기지 않습니다.'] });

// ─── PART 4 ───
divider(4, '활용 시나리오 5가지', '제9기 지역보건의료계획(2027~2030) 수립이 2026년 하반기에 시작됐습니다{r:hplan}. 계획서 작성 순서대로 메뉴를 묶었습니다.');   // 66
stepsSlide({ t: '시나리오 1 — 지역보건의료계획 「현황 분석」', sub: '시군구 담당자 · 반나절', steps: [   // 67
  { h: '지역 프로파일 열기', b: '우리 시군구 선택 → 상단 요약(리그 순위·등급·최저 영역·박탈 분위) 캡처.\n↓PNG.' },
  { h: '영역별 순위와 수치', b: '9개 영역 점수 표 ↓CSV → 계획서 「건강수준 현황」 표.\n영역을 펼쳐 지표별 백분위 확인.' },
  { h: '강점·개선·개선 과제', b: '강점 TOP5는 본문에, 개선 과제는 내부 자료로.\n가장 개선된 지표로 지난 기 성과 서술.' },
  { h: '건강수명·고위험군', b: '기대수명·건강수명(근사) 카드와 고위험군 30개 집단 규모 — 「근사」·「추정」 표기 그대로.' },
  { h: '전 지표 비교표', b: '지역 비교에 우리 시군구·시도·전국 중앙값·동류군 2곳 담기 → 전 지표 비교 ↓CSV → 부록.' },
] });
shot({ t: '시나리오 1 — 화면 흐름', sub: '프로파일 상단 → 영역별 순위 → 강점 TOP5 → 전 지표 비교표', img: ['C_profile_06', 'E_compare_04'],   // 68
  bullets: ['네 장면을 그대로 캡처하면 현황 분석 장이 만들어집니다.', '출처 문구: 「자료: 질병관리청 지역사회건강조사(KOSIS) 등 · 지역 건강프로파일 대시보드(health-profile.kr)」 + 참고문헌 번호.'] });
stepsSlide({ t: '시나리오 2 — 사업 우선순위 선정', sub: '부담 × 격차 × 수단 × 추세', steps: [   // 69
  { h: '우선순위 카드', b: '프로파일 「무엇부터 손댈 것인가」 — 하위 30% 지표를 근거 판정 순으로.\n「지금 할 것」부터.' },
  { h: '황금다이아몬드', b: '악화 + 나쁨(1순위) 지표 확인. 시간·공간 두 축 모두 나쁜 것이 급합니다.' },
  { h: '지표 분석으로 확인', b: '추이·순위(신뢰구간)·격차 카드로 「정말 나쁜가, 표본오차인가」 검토.' },
  { h: '근거 지침', b: 'NICE 번호·CPSTF 권고 원문을 계획서 근거 란에. 「근거 없음」 지표는 자체 평가 설계 필요.' },
  { h: '권고 사업', b: '예방·관리 지식베이스에서 시도 → 국가 → WHO 순 사업 카드를 골라 사업명·전략 작성.' },
] });
stepsSlide({ t: '시나리오 3 — 목표치 설정', sub: '성과지표 탭 · 통합건강증진사업 핵심성과지표', steps: [   // 70
  { h: '현재 값 확인', b: '성과지표 탭에서 우리 지역 값·전국 중앙값·전년 대비. 미보유 3종은 사유 확인.' },
  { h: '설정법 5종 비교', b: '전년 대비 개선 · 전국 중앙값 도달 · 상위 25% 도달 · 추세 연장 · 시도 평균 — 안내서 방식 그대로 계산.' },
  { h: '달성 가능성 점검', b: '지표 분석 추이에서 최근 5년 변화폭과 신뢰구간 폭을 봅니다. 오차보다 작은 목표는 의미가 없습니다.' },
  { h: '격차 목표', b: '건강형평성 카드(박탈 5분위)에서 취약 집단 쪽 목표를 따로. 「격차 축소」는 취약 쪽이 올라와야 성과.' },
  { h: '계산기', b: '달성률·득점 계산기에 목표치를 넣어 평가 시점의 점수를 미리 봅니다.' },
] });
stepsSlide({ t: '시나리오 4 — 보고서·발표자료 만들기', sub: '그림·표·문장 · 출처 표기', steps: [   // 71
  { h: '그림', b: '카드 ↓SVG(파워포인트 편집) 또는 ↓PNG. 지도는 🏷 지역명 켜고.' },
  { h: '표', b: '순위·연도별 추이표·전 지표 비교 ↓CSV → 엑셀.' },
  { h: '문장', b: '값 + 95% 신뢰구간 + 전국 순위(상위 %) + 중앙값 대비 %p + 자료 연도·출처. %와 %p 구분.' },
  { h: '참고문헌', b: '화면의 [번호]가 곧 참고문헌 번호. 설명서·정오표·이 자료와 같은 번호.' },
  { h: '주소', b: '보고서에 화면 주소를 함께 적으면 독자가 같은 화면을 엽니다.' },
] });
stepsSlide({ t: '시나리오 5 — 의회·주민 설명', sub: '랭킹 영상과 홈 카드', steps: [   // 72
  { h: '홈 카드', b: '17개 시도 지도 + 258곳 상위 10 + 취약인구 — 첫 장면.' },
  { h: '강점 TOP5', b: '프로파일 강점 카드. 약점은 공개 자료에 넣지 않습니다.' },
  { h: '랭킹 영상', b: '「⛶ 전체 보기」 🎬 — 2008년부터 우리 지역 순위가 움직이는 MP4를 발표 슬라이드에.' },
  { h: '연대기', b: '그해 10대 뉴스와 정책 연표로 「왜 그때 변했나」 서술.' },
  { h: '주의 문구', b: '「표본조사 값이라 이웃한 순위 차이는 작을 수 있습니다」를 반드시.' },
] });
cardsSlide({                                                                                               // 73
  t: '보고서 문장 예시 — 실제 값', sub: '2025년 비만율(자가보고, 연령표준화) · 발표 권장 형식(질병관리청 세미나 2026-09-29 기준)',
  items: [
    { icon: '✕', h: '피해야 할 문장', b: '「우리 시 비만율은 38.4%로 전국에서 매우 높은 수준이며 전국 대비 10% 높다.」 — 분포 위치 과장, %와 %p 혼동, 비교 기준 불명, 신뢰구간 누락, 율 종류 누락.', color: C.RED },
    { icon: '○', h: '권장 문장', b: '「경기 OO시의 2025년 비만율(자가보고, 연령표준화)은 38.4%(95% CI 34.7~42.1%)로 전국 258곳 중 58번째(상위 약 22%), 경기 48곳 중 7번째다. 전국 중앙값(35.4%)보다 3.0%p 높지만 신뢰구간이 중앙값을 포함해 통계적으로 유의하지 않다.」', color: C.GREEN },
    { icon: '→', h: '화면에서 얻는 숫자', b: '값·신뢰구간은 순위 카드(⟺ 신뢰구간), 순위·상위 %는 요약 타일, 중앙값은 전국 타일, 시도 내 순위는 순위 카드의 시도 탭.' },
    { icon: '7', h: '곧 추가', b: '「우리 지역 읽기」 — 이 문장을 선택 지역의 실제 값으로 자동 생성하고 복사 버튼(PART 7).' },
  ],
});

// ─── PART 5 ───
divider(5, '해석 주의와 FAQ', '숫자가 틀린 것보다 숫자를 잘못 읽는 것이 더 흔합니다. 다섯 가지만 지키면 됩니다.');   // 74
cautionSlide({ t: '주의 1 — 표본오차', items: [   // 75
  { h: '순위 한 칸은 오차 안의 차이일 수 있습니다', b: '보건소 표본 약 900명. 신뢰구간이 겹치는 지역은 순위 패널에서 흐리게 표시됩니다. 보고서에는 값과 95% 신뢰구간을 함께.' },
  { h: '유병률이 낮은 지표는 더 흔들립니다', b: '우울증상 유병률은 258곳 중 절반 이상이 「불안정값」입니다. 이런 지표로 서열을 매기지 말고 3개년 평균·추세로 보십시오.' },
  { h: '상대 변화율은 작은 값에서 과장됩니다', b: '6.2% → 3.4%는 −45%지만 2.8%p입니다. %와 %p를 함께 적으십시오.' },
] });
cautionSlide({ t: '주의 2 — 결과지표는 사업 성과가 아닙니다', items: [   // 76
  { h: '임팩트 지표(사망·유병·건강수명)', b: '변화가 느리고 원인이 여럿이라 사업 귀인이 불가능합니다. 계층 배지가 「임팩트」인 지표는 「기여」로만 표현하십시오{r:tiers}.' },
  { h: '종합 순위에서 뺀 이유', b: '결과지표와 진단 경험률 등 4종은 순위 산정에서 제외됩니다(사업으로 바꿀 수 있는 지표만).' },
  { h: '이 도구는 모니터링·목표치 지원 도구', b: '보건소 실적(투입·산출)이 없으므로 사업 평가 도구로 쓰면 안 됩니다{r:khepi}.' },
] });
cautionSlide({ t: '주의 3 — 지역 단위 혼동', items: [   // 77
  { h: '258과 229는 다른 단위', b: '조사 지표의 전국 순위·중앙값은 보건소 258곳, 사망률·검진·종합 순위는 행정 시군구 229곳. 같은 「전국 순위」라도 분모가 다릅니다.' },
  { h: '다보건소 시(수원·고양·성남·창원·제주 등)', b: '조사 지표는 보건소별 값만 있고 시 전체 순위가 없습니다. 보건소별로 읽거나 사망률 등 시군구 자료로 시 전체를 보십시오.' },
  { h: '군위군·세종', b: '군위는 2023년 경북 → 대구 편입이라 과거 자료는 경북 코드에, 세종은 시도 값이 곧 시군구 값입니다.' },
] });
cautionSlide({ t: '주의 4 — 격차 수치', items: [   // 78
  { h: '최대−최소는 극단 지역 한 곳에 흔들립니다', b: '시도 고위험음주율 격차는 세종 한 곳의 등락으로 10.0 → 7.6 → 6.4 → 8.7%p로 움직였습니다. 상·하위 20% 경계값 차이·분위 평균 차이와 함께 보도록 개선 예정{r:hplan}.' },
  { h: '절대(%p)와 상대(배)를 함께', b: 'Keppel(2005)·WHO(2017) 지침. 한쪽만 보면 같은 자료에서 정반대 결론이 납니다.' },
  { h: '「격차 축소」 ≠ 개선', b: '양호 지역이 나빠져 격차가 줄 수도 있습니다(하향 수렴). 전체 수준이 좋아졌는지, 취약 쪽이 올라왔는지를 함께 보십시오.' },
] });
cautionSlide({ t: '주의 5 — 근사 지표와 특수 자료', items: [   // 79
  { h: '건강수명(주관적 건강 기반·근사){r:hle} · 지역박탈지수(근사){r:dep}', b: '공식 통계가 아닙니다. 이름에 「근사」를 붙이고 절대값 비교·1~2위 차이 강조를 하지 마십시오. 한계 4가지가 자료원 카드에 있습니다.' },
  { h: '감염병 고위험군(추정){r:risk}', b: '추정 표시 집단은 유병률 × 인구. 집단 간 중복이 있어 합산 금지.' },
  { h: '코로나19 자료는 신고 보건소 관할 기준{r:covid}', b: '사망이 병원 소재지로 집계돼 상급종합병원이 있는 지역이 높게 나옵니다. 시군구 순위를 매기지 말고 시도·4분위 비교만.' },
] });
cardsSlide({ t: '자주 묻는 질문', items: [   // 80
  { icon: 'Q', h: '자료는 언제 갱신되나요?', b: '지역사회건강조사 12월, 사망원인통계 9월 하순, 공단 검진통계 연말~연초. 자료원 카드의 「다음 공표」.' },
  { icon: 'Q', h: '순위가 실제와 다른 것 같아요', b: '분모(258/229)·값 유형(표준화율/조율)·3년 평균·리그 설정을 먼저 확인하십시오. 순위 산출 방식 카드에서 바꿀 수 있습니다.' },
  { icon: 'Q', h: '우리 지역 값이 비어 있어요', b: '보건소 단위와 시군구 단위가 다르거나 원천에 값이 없는 경우. 자료원 매트릭스의 ●◐○.' },
  { icon: 'Q', h: '휴대폰에서 저장이 안 돼요', b: '카카오톡·인스타그램 안 브라우저는 저장이 막혀 있습니다. 「다른 브라우저로 열기」.' },
] });

// ─── PART 6 ───
divider(6, 'K-Health 랭킹(communityhealth.kr)과의 비교', '한림대학교 사회의학연구소(책임 김동현 교수)의 지역사회 건강순위 — 같은 자료로 「건강」을 다르게 정의한 두 체계를 나란히 놓습니다.');   // 81
cardsSlide({                                                                                               // 82
  t: 'communityhealth.kr 은 무엇인가', sub: '한림대학교 사회의학연구소 · Community Health Ranking · 2013년 한국건강증진재단 과제가 출발점',
  items: [
    { icon: '目', h: '메뉴 10개', b: 'K-Health ranking · 자살통계 · 대표지표 기술통계 · 기술통계(Bar graph) · GIS 분석 · 지역건강격차 · 시계열 · 산점도 · 자료실 · 연구소개. 자료는 2024년까지.' },
    { icon: '順', h: 'K-Health 랭킹', b: '지표 25개를 Z-점수 → 전문가 AHP 가중치 → 합산해 한 점수로. 전국 257개 보건소 단위 순위 · 10등급 · 시도 내 순위 · 유사지역군 순위.' },
    { icon: '群', h: '유사지역군 4군', b: '농어임가율 · 노인인구율 · 인구밀도 Z-점수 합 → 1군(도시) ~ 4군(농촌). 「도시화 수준이 비슷한 곳끼리 비교」.' },
    { icon: '人', h: '연구진', b: '김동현(한림대, 책임) · 김춘배 · 박순우 · 김건엽 · 류소연 · 황승식 · 이근찬 · 정진영. 「순위는 줄 세우기가 아니라 목표·방향 설정을 돕기 위한 것」(연구소개).' },
  ],
});
tableSlide({                                                                                               // 83
  t: 'K-Health 랭킹 지표 25개와 AHP 가중치', sub: '연구소개 「평가 영역과 지표」 원문 · 가중치는 영역 안 비중(%)',
  head: ['영역', '지표', '출처', '가중치'], colW: [2.2, 5.4, 3.3, 1.43], fs: 10,
  rows: [
    ['건강결과 · 사망(50)', '전체·암·뇌혈관·심장·폐렴·자살·당뇨병 사망률(연령표준화)', '사망원인통계(국가데이터처)', '사망 50'],
    ['건강결과 · 이환(50)', '주관적 건강수준(양호 응답 분율)', '지역사회건강조사', '이환 50'],
    ['건강행태(20)', '남자 현재흡연율 35 · 신체활동실천율 25 · 저염선호율 15 · 고위험음주율 25', '지역사회건강조사', '20'],
    ['보건의료자원·서비스(20)', '미치료율 35 · 의원 수 15 · 당뇨병 치료율 25 · 암검진율 25', '지역사회건강조사 · 전국사업체조사', '20'],
    ['사회적 요인(20)', '고졸률 10 · 실업률 30 · 가구소득 25 · 유배우자율 15 · 편부모·조부모 가구율 20', '지역사회건강조사 · 지역별고용조사 · 인구총조사', '20'],
    ['물리·환경 요인(20)', '운동시설 접근율 35 · 공원면적 25 · 주점업 수 20 · 패스트푸드점 수 20 · 운동시설 사업체 0', '지역사회건강조사 · 도시계획현황 · 전국사업체조사', '20'],
    ['정책적 요인(20)', '복지예산비중 20 · 보건세출비중 30 · 보건소 인력비율 25 · 재정자주도 25', '지방재정연감 · e지방지표', '20'],
  ],
  note: '조사 중단 지표(저염선호 2019, 운동시설 접근 2018)는 마지막 값 고정, 5년 주기 지표는 직전 조사값 대입.',
});
compareSlide({                                                                                             // 84
  t: '비교 1 — 지역 단위 · 지표 · 자료', left: 'K-Health 랭킹', right: 'health-profile.kr',
  rows: [
    ['지역 단위', '보건소 257(2024) · 시도 17 · 유사지역군 4군(3변수 Z-합)', '보건소 조사 단위 258{r:chs25} · 행정 시군구 229{r:mois} · 시도 17 · 도시/군 리그 · 동류군 12곳(4변수 거리)'],
    ['지표', '25개(결과 8 · 결정요인 17)', '171개(조사 41 · 결과·환경 115 · 암검진 7 · 일반검진 4 · 건강수명 3 · 박탈 1)'],
    ['자료 연도', '2024', '2025(조사·사망률) · 2024(검진)'],
    ['우리에 없는 K 지표', '실업률 · 균등화 가구소득 · 공원면적 · 주점업 · 패스트푸드점 · 재정자주도', '→ 맥락 지표로 수집 예정(PART 7)'],
    ['K에 없는 우리 자료', '—', '신뢰구간 · 감염병 · 암검진 수검률 7종 · 건강수명 · 박탈지수 · 고위험군 · 코로나19 · 근거 지침 · 지식베이스'],
    ['결측 처리', '조사 중단 지표는 마지막 값 고정, 5년 주기는 직전 값 대입', '없는 해는 비움(2년 주기는 빈 해)'],
  ],
});
compareSlide({                                                                                             // 85
  t: '비교 2 — 점수화 · 순위 · 격차 · 근거', left: 'K-Health 랭킹', right: 'health-profile.kr',
  rows: [
    ['점수', 'Z-점수 × AHP 가중치 합산(2013 전문가 패널)', '지표 백분위 → 영역 평균 → 균등 평균(가중치 선택) · 3년 이동평균{r:rank}'],
    ['결과 vs 결정요인', '둘 다 순위 안(결과 100 + 결정요인 100)', '결과지표는 순위 밖(임팩트 배지), 결정요인은 맥락·형평성·동류군으로'],
    ['순위 표시', '전국 1~257 전부 · 10등급 · 시도 내 · 유사지역군', '리그 내 순위 · 등급 배지 · 강점 TOP5 · 묶음 10 · 하위 비공개 원칙'],
    ['격차', '최댓값·최솟값 · max/min 비 · 상자그림', '상자그림 · 최대−최소 차 · 박탈 5분위 — 비·경계값 병기는 예정'],
    ['신뢰구간', '없음', '95% 신뢰구간 · 불안정값 제외 · 겹침 표시'],
    ['근거·사업', '없음(「action plan 제시」 예고)', 'NICE·CPSTF 권고 · 지식베이스 182항목 · 우선순위 카드'],
  ],
});
statsSlide({                                                                                               // 86
  t: '실증 대조 — 2024년 K-Health 종합 순위 vs 우리 종합 순위', sub: '사이트 조회 기능으로 받은 257곳 · 우리는 균등 가중·3년 평균·전국 통합 풀 229곳 · 이름 매칭 210곳',
  stats: [
    { n: '0.53', l: '스피어만 상관', d: 'K 종합 vs 우리 종합. K 건강결과 순위와는 0.65' },
    { n: '13 / 20', l: '상위 20곳 겹침', d: '상위권은 비슷하게 잡힌다' },
    { n: '6 / 20', l: '하위 20곳 겹침', d: '하위권은 다르게 잡힌다' },
    { n: '186 vs 143', size: 32, l: '군 지역 평균 순위', d: 'K 186위 · 우리 143위 — K는 사망률·소득·실업·의료자원이 순위에 들어가 군이 구조적으로 아래' },
  ],
  foot: ['같은 자료를 쓰면서 상관이 0.5대인 것은 두 체계가 「건강」을 다르게 정의하기 때문이지 어느 쪽이 틀렸다는 뜻이 아닙니다.', '우리 순위 옆에 K-Health 등급을 참고로 함께 보여 주는 것이 사용자에게 가장 정직합니다(PART 7).'],
});
tableSlide({                                                                                               // 87
  t: '사례로 보는 차이', sub: '2024년 · K는 전국 257곳 순위(등급·유사지역군) · 우리는 전국 통합 229곳 순위(화면은 리그 순위)',
  head: ['지역', 'K 종합', 'K 건강결과', 'K 결정요인', 'K 등급·군', '우리 종합(통합)', '우리 화면(리그)'], colW: [2.0, 1.5, 1.6, 1.6, 1.7, 1.9, 2.03],
  rows: [
    ['경기 과천시', '1위', '1위', '1위', '1등급 · P2', '1위', '도시 리그 1위'],
    ['서울 강남구', '5위', '13위', '6위', '1등급 · P1', '11위', '도시 리그 9위 · 플래티넘'],
    ['경남 창녕군', '243위', '232위', '126위', '10등급 · P4', '23위', '군 리그 2위 · 플래티넘'],
    ['전남 구례군', '232위', '181위', '141위', '10등급 · P4', '62위', '군 리그 18위 · 골드'],
    ['인천 옹진군', '47위', '93위', '252위', '2등급 · P4', '201위', '군 리그 하위'],
    ['강원 강릉시', '112위', '215위', '223위', '5등급 · P3', '229위', '도시 리그 148위'],
    ['부산 영도구', '252위', '247위', '256위', '10등급 · P2', '195위', '도시 리그 하위'],
  ],
  note: '창녕·구례처럼 건강행태는 좋은데 사망률·여건이 나쁜 군은 K에서 10등급, 우리에서 상위. 옹진은 결정요인(여건)이 바닥인데 K 2등급 — 결과 점수가 끌어올림.',
});
verdictSlide({ t: 'communityhealth.kr 에서 반영한 것', sub: '○ 반영 · △ 다른 방식으로 반영', items: [   // 88
  { v: '○', h: '순위의 목적', b: '「줄 세우기가 아니라 목표·방향 설정」 — 우리 랭킹 기획안(꼴찌 비공개·강점 중심)과 같은 원칙.' },
  { v: '○', h: '보건소 단위 전국 비교', b: 'K 257곳 ↔ 우리 258곳(질병관리청 2025 공표 기준). 시도 내 순위도 양쪽 모두.' },
  { v: '△', h: '유사지역군', b: 'K는 3변수 Z-합 4군. 우리는 도시/군 리그(2분) + 동류군 12곳(고령화율·재정자립도·인구밀도·박탈 거리). 목적은 같고 방식이 다름.' },
  { v: '△', h: '10등급', b: 'K는 전국 257곳 10등급. 우리는 지표별 순위의 「⑩ 묶음」(Fisher–Jenks)과 등급 배지 3단.' },
  { v: '○', h: '영역 → 지표 분해', b: '영역별 순위에서 지표별 순위로 내려가는 구조는 같음(우리는 지표 분석 화면으로 이어짐).' },
  { v: '○', h: '전국값 = 시군구 중앙값', b: 'K 지표 정의표의 원칙과 우리 전국 기준이 같음.' },
] });
verdictSlide({ t: 'communityhealth.kr 에서 반영하지 않을 것', sub: '✕ 미반영 · 이유', items: [   // 89
  { v: '✕', h: 'AHP 전문가 가중치', b: '2013년 패널의 사망 50·이환 50·결정요인 5영역 각 20%를 2026년에 그대로 쓸 근거가 없음. 우리는 균등 가중 기본, 실제 패널 조사 후 비교(PART 7).' },
  { v: '✕', h: 'Z-점수 합산', b: '이상치 한 곳에 끌려가고 「−0.8점」을 설명하기 어려움. 백분위(「229곳 중 상위 몇 %」)로 통일.' },
  { v: '✕', h: '사회·물리·정책 요인을 건강 점수에 합산', b: '실업률·소득·공원·재정은 지자체가 단기간에 못 바꾸는 여건. 순위에 넣으면 군이 구조적으로 하위(K 군 평균 186위). 우리는 여건을 동류군·박탈·맥락으로 따로.' },
  { v: '✕', h: '전국 단일 순위 최하위 공개', b: '랭킹 기획안 원칙과 충돌. 하위는 지자체 내부 자료(개선 과제)로.' },
  { v: '✕', h: '결측 대체 규칙', b: '조사 중단 지표를 마지막 값으로 고정하면 「변화 없음」이 규칙 때문에 생김. 없는 해는 비움.' },
] });
quoteSlide({ t: 'PART 6 결론', q: '같은 자료, 다른 정의. K-Health 랭킹은 「건강결과 + 여건」을, 우리는 「지자체가 바꿀 수 있는 건강행태·예방·의료이용」을 순위로 삼는다. 상관 0.53은 그 차이의 크기다 — 그래서 두 순위를 나란히 보여 주는 것이 가장 정직하다.', by: 'docs/communityhealth_검토_v1.md · 2024년 257곳 실증 대조 · http://communityhealth.kr/contact.php' });   // 90

// ─── PART 7 ───
divider(7, '발전방안', '지금 수준에서 다음 한 해 동안 할 것 — 데이터 · 방법 · 기능 · 운영 네 갈래와 로드맵.');   // 91
cardsSlide({ t: '발전방안 1 — 데이터', sub: '있는 것을 넓히고, 없는 것을 밝힌다', items: [   // 92
  { icon: '1', h: '지역사회건강조사 원시자료', b: '질병관리청 신청제(2025 자료 2026.2 공개). 연령별 실측으로 건강수명 비례 오즈 가정을 교체하고 성·연령 분리 지표를 만든다.' },
  { icon: '2', h: 'K-Health 맥락 지표 6종', b: '실업률 · 균등화 가구소득 · 공원면적 · 주점업 · 패스트푸드점 · 재정자주도 — e-지방지표·전국사업체조사·도시계획현황. 순위 밖 맥락으로.' },
  { icon: '3', h: '공단 맞춤형 DB', b: '투약 순응률(300일 이상 경계)·건강검진 문진 실측(흡연·BMI)은 시군구 공표가 없음 → 맞춤형 DB 신청 사안으로 명시.' },
  { icon: '4', h: '갱신 뒤처진 지표', b: '미세먼지 2020 · 진료실인원 2021 · 등록장애인 2017 등은 원천 직접 수집으로 전환(사망원인통계처럼).' },
] });
cardsSlide({ t: '발전방안 2 — 방법', sub: '2026-09-29 질병관리청 세미나 참고문헌(Keppel 2005 · WHO HEAT Plus · WHO 2017 · Lee 2025)과 HP2030 제6차 기준', items: [   // 93
  { icon: '1', h: '격차 3방식 × 절대·상대 병기', b: '최대−최소 / 상·하위 20% 경계값(HP2030 지역 격차 방식) / 분위 평균 차이를 %p와 배로 함께. 30곳 이하 집단은 분위 미적용 표기.' },
  { icon: '2', h: '격차 변화 4유형', b: '연대기 「격차 축소 = 좋음」을 끌어올림 / 하향 수렴 / 동반 악화 / 전체 이동으로 판정(Whitehead & Dahlgren 2006, Lee 2025).' },
  { icon: '3', h: '실제 전문가 패널', b: 'AI 모의 패널 대신 실제 조사(AHP 또는 배점) → 가중치 프리셋 「2026 패널」. K-Health 2013 가중치와 비교 보고.' },
  { icon: '4', h: '순위 신뢰구간 · RSE 두 기준', b: '표준오차로 부트스트랩 순위 구간, RSE 20%(CHR&R)·30%(통계청·질병관리청) 병기. 박탈 5분위 SII·RII.' },
] });
cardsSlide({ t: '발전방안 3 — 기능', sub: '담당자가 보고서를 더 빨리 끝내게', items: [   // 94
  { icon: '1', h: '「우리 지역 읽기」 문장 자동 생성', b: '값 · 95% CI · 전국/권역/시도 순위 · 중앙값 포함 여부 · 하위 20%와의 격차를 선택 지역 실제 값으로 써 주고 복사 버튼(PART 4 예시 문장).' },
  { icon: '2', h: 'K-Health 등급 병기', b: '지역 프로파일 상단에 K-Health 랭킹 2024 등급·순위를 참고로 표시(출처 링크). 두 정의의 차이를 숨기지 않음.' },
  { icon: '3', h: '권역(질병대응센터 5권역) 비교 · 자살 전용 화면', b: '순위 집단에 권역 탭, 분포 속 위치 표(전국·권역·시도). 자살 사망률 + 우울감 + 정신건강 자원 + 고위험군 한 화면.' },
  { icon: '4', h: '현황 분석 PDF 자동 생성', b: '시나리오 1의 네 장면 + 문장 + 참고문헌을 한 번에 PDF로. 격차 체감 환산(「N만 명」)도 함께.' },
] });
cardsSlide({ t: '발전방안 4 — 운영', sub: '혼자 돌아가게', items: [   // 95
  { icon: '1', h: '갱신 자동화', b: '사망원인통계(9월)·지역사회건강조사(12월)·공단 검진(1월) 공표 직후 수집 → 대조 → 빌드 → 배포를 스크립트로. 원천과의 셀 단위 대조(DB 2023년 0 오류를 잡은 방식)를 표준 절차로.' },
  { icon: '2', h: '두 주소 동기화', b: 'health-profile.kr 과 GitHub Pages가 항상 같은 빌드이도록 배포를 한 단계로.' },
  { icon: '3', h: '의견 처리와 정오표', b: '의견·문의 → 정오표 번호 → 수정 → 설명서 갱신의 흐름을 지킨다. 지금까지 17건.' },
  { icon: '4', h: '방법론 외부 검토', b: '랭킹 방법론·건강수명·박탈지수를 예방의학·건강형평성 전문가에게 검토받고 그 답변을 문서에 싣는다.' },
] });
roadmapSlide({ t: '로드맵 — 2026년 4분기 ~ 2027년', sub: '공표 일정에 맞춘 순서', phases: [   // 96
  { when: '2026.10~11', h: '격차·문장', color: C.BLUE, items: ['격차 3방식 병기', '우리 지역 읽기 문장', '연대기 격차 4유형', 'K-Health 등급 병기'] },
  { when: '2026.12~2027.1', h: '새 자료', color: C.GREEN, items: ['2026 지역사회건강조사 반영', '공단 검진 2025', '맥락 지표 6종', '권역 탭'] },
  { when: '2027 상반기', h: '방법 검증', color: C.AMBER, items: ['실제 전문가 패널', '원시자료 신청·연령별', '순위 신뢰구간', '외부 검토'] },
  { when: '2027 하반기', h: '계획서 지원', color: C.NAVY, items: ['현황 분석 PDF 자동 생성', '제9기 계획 수립 지원', '사망원인 2026 반영', '갱신 자동화 완성'] },
] });
quoteSlide({ t: '마무리', q: '순위는 결론이 아니라 질문의 시작입니다. 이 도구는 「우리 지역이 어디쯤 있고, 무엇을 먼저 할지」를 공표 통계로 묻게 해 줍니다. 답은 현장이 냅니다.', by: 'https://health-profile.kr · khealth.profile@gmail.com' });   // 97

tableSlide({ t: '방법론 문서 11건 — 산출 방식은 모두 공개', sub: '대시보드 「의견·문의 → 방법론 문서」에서 열립니다 · health-profile.kr/docs/ · github.com/soonryu74/soonryu74.github.io/tree/main/health-dashboard/docs', fs: 10.5,   // 97
  head: ['문서', '무엇을 다루나'], colW: [4.2, 8.1], rows: [
    ['랭킹_방법론_v1', '종합 순위 산출 — 공인 체계 7종 조사 · 가중치 프리셋 · 3년 평균 · 도시/군 리그 · 결과지표 제외 · 등급 배지'],
    ['건강수명_산출법_v1', '전국 앵커 → 시도 생명표 → 시군구 Chiang 생명표 + 오즈비 보정(Sullivan) · 예상 반박과 답변 · 표기 규칙'],
    ['지역박탈지수_산출_v2', '2020 총조사 집계표 7개 변수 z합 · 국내 6편 구성지표 대조표 · 남성 실업률 누락 등 한계'],
    ['감염병_고위험군_v1', '245개 지역 × 30개 집단, 실측/추정 구분 · 미수집 집단'],
    ['지표_방향성_v1', '119개 지표 좋음/나쁨/맥락 판정 근거 — 국내·국제·미국 12개 체계'],
    ['지역보건사업_평가이론_v1', 'Donabedian · 로직모델 · WHO 결과사슬 · RE-AIM — 계층 분류(투입/산출/성과/임팩트/맥락)의 출처'],
    ['건강격차_지표_검토_v1', 'Keppel 2005 · WHO HEAT Plus · HP2030 격차 방식 — 격차 3방식 병기 권고(P1~P8)'],
    ['미국_CountyHealthRankings_검토_v1 · 미국_CHR_2025보고서_검토_v1', '신뢰구간 · 불안정값 제외 · 10개 묶음 · 강점 최소 3개 · 취약집단 분리'],
    ['미국_CPSTF_검토_v1', 'Community Guide 권고 224건 파싱 · 지표 매핑 · 암검진 수검률 수집의 근거'],
    ['communityhealth_검토_v1 · McMaster_근거위원회_검토_v1', 'K-Health 랭킹 방법론 대조·실증(PART 6) · 근거 8형태 · 「측정된 소통」 반영 후보'],
    ['데이터_최신성_점검_v1 · 사용설명서_정오표_v1', '지표별 최신 연도와 원천 대조 · 공표 일정 · 정오표 17건'],
  ] });

// ─── 참고문헌 (98~99) ───
for (let p = 0; p * REF_PER_SLIDE < REFS.length; p++) {
  const s = pres.addSlide();
  if (pageNo + 1 !== refSlideOf(p * REF_PER_SLIDE + 1)) throw new Error(`참고문헌 쪽 번호 불일치: 실제 ${pageNo + 1}, 예상 ${refSlideOf(p * REF_PER_SLIDE + 1)} — REF_SLIDE_FIRST=${pageNo + 1} 로 다시 실행`);
  title(s, p ? '참고문헌 (계속)' : '참고문헌', '본문의 파란 [번호]를 누르면 이 쪽으로 옵니다 · 번호는 대시보드 화면 하단 「참고문헌」·사용설명서와 같습니다 · 주소를 누르면 원문이 열립니다');
  const chunk = REFS.slice(p * REF_PER_SLIDE, (p + 1) * REF_PER_SLIDE);
  const runs = chunk.flatMap((r, i) => {
    const last = i === chunk.length - 1;
    const a = [
      { text: `[${r.n}]  `, options: { bold: true, color: C.BLUE, fontSize: 10.5, paraSpaceAfter: 5 } },
      { text: `${r.org}, 「${r.title}」. `, options: { color: C.INK, fontSize: 10.5 } },
      { text: `${r.detail}${r.updated ? ' · 갱신 ' + r.updated : ''} `, options: { color: C.MUT, fontSize: 9.5, breakLine: !r.url && !last } },
    ];
    if (r.url) a.push({ text: (() => { try { return decodeURI(r.url); } catch { return r.url; } })(), options: { color: C.BLUE, fontSize: 9, hyperlink: { url: r.url, tooltip: '원문 열기' }, breakLine: !last } });
    return a;
  });
  if (p * REF_PER_SLIDE + REF_PER_SLIDE >= REFS.length) {
    runs[runs.length - 1].options.breakLine = true;
    runs.push({ text: '[K]  ', options: { bold: true, color: C.BLUE, fontSize: 10.5, paraSpaceAfter: 5 } },
      { text: '한림대학교 사회의학연구소, 「Community Health Ranking(K-Health 랭킹)」. 연구소개(방법론·지표 25개·AHP 가중치·연구진) · 2024년 결과 · 2026-10-02 확인 ', options: { color: C.INK, fontSize: 10.5 } },
      { text: 'http://communityhealth.kr/contact.php', options: { color: C.BLUE, fontSize: 9, hyperlink: { url: 'http://communityhealth.kr/contact.php', tooltip: '원문 열기' } } });
  }
  s.addText(runs, T({ x: 0.5, y: 1.45, w: W - 1, h: H - 2.1, valign: 'top', fontSize: 10.5 }));
  footer(s);
}
{                                                                                                          // 100
  const s = pres.addSlide(); s.background = { color: C.NAVY };
  s.addText('감사합니다', T({ x: 0.8, y: 2.6, w: 11.5, h: 1.0, fontSize: 36, bold: true, color: C.WHITE }));
  s.addText('지역 건강프로파일 대시보드 · https://health-profile.kr · khealth.profile@gmail.com', T({ x: 0.8, y: 3.7, w: 11.5, h: 0.5, fontSize: 14, color: 'CADCFC' }));
  pageNo += 1;
}

await pres.writeFile({ fileName: OUT });
{
  const zip = await JSZip.loadAsync(fs.readFileSync(OUT));
  let fixed = 0;
  for (const name of Object.keys(zip.files).filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))) {
    const xml = await zip.file(name).async('string');
    const out = xml.replace(/<a:p>([\s\S]*?)<\/a:p>/g, (m, inner) => {
      let seen = false;
      const body = inner.replace(/<a:pPr\b[^>]*?(?:\/>|>[\s\S]*?<\/a:pPr>)/g, (pp) => { if (seen) { fixed++; return ''; } seen = true; return pp; });
      return '<a:p>' + body + '</a:p>';
    });
    if (out !== xml) zip.file(name, out);
  }
  fs.writeFileSync(OUT, await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }));
  console.log('pPr 중복 제거', fixed);
}
console.log('written', OUT, 'slides', pageNo);
