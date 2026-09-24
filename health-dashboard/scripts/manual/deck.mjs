// 지역 건강프로파일 대시보드 사용설명서 (pptx) 생성기
import pptxgen from 'pptxgenjs';
import fs from 'node:fs';
import path from 'node:path';

const DIR = '/tmp/claude-0/-home-user-soonryu74-github-io/e16f7b4f-1860-59c2-9e17-e9d4583aa91f/scratchpad/manual';
const SHOTS = `${DIR}/shots`;
const OUT = process.argv[2] || `${DIR}/지역건강프로파일_대시보드_사용설명서_v1.pptx`;
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
pres.title = '지역 건강프로파일 대시보드 사용설명서';
const W = 13.33, H = 7.5;
let pageNo = 0;
const T = (opts) => ({ fontFace: FONT, isTextBox: true, margin: 0, ...opts });

// ── 참고문헌: 대시보드와 같은 번호(data/refs.json · scripts/build_refs.py) ──
// 본문 문자열 안의 {r:key} 또는 {r:key1,key2} → 파란 위첨자 [n] + 「참고문헌」 쪽으로 가는 링크
const REPO = process.env.HD_REPO || '/home/user/soonryu74.github.io/health-dashboard';
const REFS = JSON.parse(fs.readFileSync(`${REPO}/data/refs.json`, 'utf8')).refs;
const REFN = Object.fromEntries(REFS.map((r) => [r.key, r]));
const REF_PER_SLIDE = 13;
const REF_SLIDE_FIRST = Number(process.env.REF_SLIDE_FIRST || 64);   // 참고문헌 첫 쪽 번호 — 끝에서 실제 번호와 대조해 틀리면 멈춘다
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
  slide.addText('지역 건강프로파일 대시보드 사용설명서 · health-profile.kr', T({ x: 0.5, y: H - 0.42, w: 8, h: 0.3, fontSize: 9, color: C.MUT }));
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
    runs[0].options = { ...runs[0].options, bullet: { indent: 12 }, paraSpaceAfter: 6 };
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
  s.addText('지역 건강프로파일 대시보드', T({ x: 0.8, y: 2.0, w: 11.5, h: 1.0, fontSize: 40, bold: true, color: C.WHITE }));
  s.addText('사용설명서', T({ x: 0.8, y: 3.0, w: 11.5, h: 0.8, fontSize: 30, color: 'CADCFC' }));
  s.addText('전체 자료 소개 · 활용법 · 메뉴별 설명과 활용 팁', T({ x: 0.8, y: 3.9, w: 11.5, h: 0.5, fontSize: 16, color: 'CADCFC' }));
  s.addText('v1 · 2026년 9월 · https://health-profile.kr', T({ x: 0.8, y: 6.3, w: 11.5, h: 0.4, fontSize: 12, color: '9FB4CF' }));
  const f = findShot('A_home_top'); if (f) fitImage(s, f, { x: 8.3, y: 1.4, w: 4.6, h: 4.6 });
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

// ═════════════════════════ 내용 ═════════════════════════
cover();
toc([
  ['소개 — 무엇을 담은 도구인가', '목적과 성격 · CIAT와의 관계 · 담긴 자료 · 지역 단위 · 값의 종류 · 갱신 주기'],
  ['시작하기 — 기본 조작', '접속 · 화면 구성 · 지표/지역/연도 선택 · 주소 공유 · 화면 설정 · 내려받기'],
  ['메뉴별 설명과 활용 팁', '지표 분석 · 지역 프로파일 · 성과지표 · 지역 비교 · 예방·관리 · 연관지표 · 핫스팟 · 연대기 · 조사 단위 · 자료원 · 의견·문의'],
  ['활용 시나리오', '지역보건의료계획 현황 분석 · 사업 우선순위 · 목표치 설정 · 설명자료 제작 · 감염병 대비'],
  ['해석 주의와 자주 묻는 질문', '순위의 함정 · 자체 산출 지표 표기 · 정의 변경 · 코로나19 자료 · FAQ · 문의 · 참고문헌'],
]);

// ─── PART 1 ───
divider(1, '소개 — 무엇을 담은 도구인가', '지역 건강프로파일 대시보드는 공표 통계를 모아 시군구·보건소 단위 건강수준을 보여 주는 「건강수준 모니터링·목표치 설정 지원 도구」입니다.');
cardsSlide({
  t: '이 대시보드의 목적과 성격', sub: '보건소·시군구 담당자가 우리 지역 건강수준을 파악하고 계획서·보고서를 만드는 데 쓰는 도구',
  items: [
    { icon: '1', h: '한 화면에서 우리 지역 파악', b: '지표 하나를 고르면 현황 타일·지도·추이·순위·연도별 표·격차가 한 화면에 나옵니다(질병관리청 CIAT의 6패널 구성과 같음).' },
    { icon: '2', h: '지역 프로파일 자동 생성', b: '시군구를 고르면 전 지표 백분위 → 영역 점수 · 강점 TOP5 · 개선 TOP5 · 건강수명 · 동류군 비교 · 우선순위 카드가 자동으로 만들어집니다.' },
    { icon: '3', h: '근거와 출처를 함께', b: '지표마다 방향(높을수록 좋음/나쁨)·계층(투입·성과·임팩트)·NICE/CPSTF 근거 지침 · 자료 출처와 산식이 화면에 적혀 있습니다.' },
    { icon: '4', h: '사업 평가 도구가 아닙니다', b: '보건소 사업 실적(투입·산출) 자료는 담고 있지 않습니다. 건강수준의 변화를 보고 목표치를 세우는 데 쓰되, 사업 성과를 판정하는 근거로는 쓰지 마십시오.', color: C.RED },
  ],
  note: '대시보드 성격을 먼저 분명히 한다. 결과지표(사망·유병)는 사업 기여로만 해석한다.',
});
tableSlide({
  t: 'CIAT(질병관리청 지역사회건강지표 분석도구)와 무엇이 같고 다른가',
  head: ['구분', 'CIAT', '이 대시보드'],
  colW: [2.2, 5.0, 5.13],
  rows: [
    ['지표별 6패널', '현황·추이·단계구분도·순위·연도별 추이·격차', '동일 구성 + 신뢰구간·10개 묶음·전체 보기 1열·인쇄·영상'],
    ['심층분석', '연관지표 탐색·핫스팟·황금다이아몬드', '동일 3종(브라우저에서 즉시 계산) + 근거 지침 연결'],
    ['자료', '지역사회건강조사 지표 98개 · e-지방지표 157개{r:ciat}', '지역사회건강조사 지표 41개{r:chs} + 사망·감염병·의료이용·자원·인구·환경 지표 115개{r:kdh} + 암검진 7개{r:cancer} + 일반검진 4개{r:nhis} + 건강수명 3개{r:hle} · 박탈지수 1개{r:dep}'],
    ['지역 단위', '시도·시군구', '시도 17곳 · 시군구 229곳{r:mois} · 보건소 조사 단위 258곳{r:chs25}(자료 유무 표기)'],
    ['지역 프로파일', '없음', '영역 점수·등급 배지·강점/개선·동류군·우선순위·고위험군'],
    ['근거·출처', '지표 정의', 'NICE·CPSTF 권고, 자료원 탭(산식·한계·다음 공표일), 산출 예시'],
    ['공유·내보내기', '이미지', 'URL 공유, SVG(PPT 편집)·PNG·CSV, 인쇄, MP4 영상'],
    ['기술', 'R Shiny(서버)', '정적 단일 파일(서버 없음) — 휴대폰·오프라인에서도 열림'],
  ],
  note: 'CIAT는 질병관리청 수도권질병대응센터·서울대 원성호 교수팀 연구용역. 구조를 참조했다.',
});
statsSlide({
  t: '담긴 자료 한눈에', sub: '2026년 9월 기준',
  stats: [
    { n: '170+', l: '지표', d: '지역사회건강조사 41개{r:chs} · 결과·환경 DB 115개{r:kdh} · 암검진 7개{r:cancer} · 일반검진 4개{r:nhis} · 건강수명 3개{r:hle} · 박탈지수 1개{r:dep}', dsize: 9.5 },
    { n: '258', l: '보건소 조사 단위', d: '질병관리청 「2025 지역건강통계 한눈에 보기」 기준{r:chs25}. 시도 17곳 · 시군구 229곳{r:mois}' },
    { n: '2008~2025', size: 32, l: '연도 범위', d: '지역사회건강조사 18년{r:chs}. 사망원인 2008~2024{r:mort}, 검진 2010~2024{r:nhis}' },
    { n: '11', l: '자료원', d: '질병관리청 · 국가데이터처 · 국민건강보험공단 · 행정안전부 · 환경부 등' },
  ],
  foot: ['모든 값은 공표 통계에서 가져왔고, 자체 산출 2종(건강수명·지역박탈지수)은 「근사」로 표기합니다.', '자료별 출처·산식·최종 갱신일·다음 공표 예정은 「자료원」 탭에서 볼 수 있습니다.'],
});
tableSlide({
  t: '자료원 11종', sub: '원 출처 기관 기준 · 「자료원」 탭 카드와 같은 구성',
  head: ['자료원', '기관', '지표 수', '연도', '갱신'], colW: [3.6, 2.6, 1.0, 2.1, 3.03], fs: 10.5,
  rows: [
    ['지역사회건강조사{r:chs}', '질병관리청', '41', '2008~2025', '연 1회(12월)'],
    ['사망원인통계(표준화사망률 22종){r:mort}', '국가데이터처(옛 통계청)', '22', '2008~2024', '연 1회(9월 하순)'],
    ['법정감염병 발생보고{r:inf}', '질병관리청', '12', '2008~2024', '연 1회'],
    ['국가암검진 수검률{r:cancer}', '국민건강보험공단', '7', '2015~2024', '연 1회(연말~연초)'],
    ['건강보험·의료이용·검진·의료자원{r:nhis}', '국민건강보험공단', '33', '2008~2024', '연 1회'],
    ['인구·사회·경제·복지시설{r:pop}', '국가데이터처·행정안전부·보건복지부 등', '24', '2008~2024', '연 1회'],
    ['환경·안전{r:env}', '환경부·국토부·도로교통공단', '28', '2008~2024', '연 1회'],
    ['건강수명(근사 산출){r:hle}', '자체 산출', '3', '2008~2024', '사망원인 공표 후'],
    ['지역박탈지수(근사){r:dep}', '자체 산출(인구주택총조사)', '1', '2015·2020', '총조사 5년'],
    ['감염병 고위험군{r:risk}', '자체 집계(복수 출처)', '30', '2024', '비정기'],
    ['코로나19 확진·사망{r:covid}', '질병관리청', '3', '2020~2023.8', '종료(1회성)'],
  ],
});
cardsSlide({
  t: '지역 단위 이해하기', sub: '같은 「보건소」라도 자료마다 단위가 다릅니다',
  items: [
    { icon: '시도', h: '시도 17개', b: '광역 비교와 「17개 시도 순위」에 쓰입니다. 세종은 단층제라 시도 값이 곧 시군구 값입니다.' },
    { icon: '시군', h: '시군구 229개', b: '행정안전부 기초자치단체 226곳 + 제주 행정시 2곳 + 세종시{r:mois}. 사망률·검진·인구 등 시군구 단위 자료의 순위 기준입니다. 수원시처럼 일반구가 있는 시는 시 전체 값을 씁니다.' },
    { icon: '보건', h: '보건소 조사 단위 258개', b: '지역사회건강조사의 조사 단위이자 이 지표들의 전국 순위·중앙값 기준입니다{r:chs25}(강남구보건소, 수원시 장안구보건소 등). 질병관리청 공표 방식과 같습니다. 「조사 단위」 탭과 「보건소 단위」 순위에서 씁니다.' },
    { icon: '●◐○', h: '자료 유무 표기', b: '● 그 단위로 값 있음 · ◐ 소속 시군구 값으로 대체 · ○ 없음. 「자료원」 탭의 258행 매트릭스에서 보건소별로 확인합니다.', color: C.GREEN },
  ],
});
cardsSlide({
  t: '값의 종류와 지표의 성격', sub: '지표 화면 상단과 추이 카드에 표시되는 배지의 뜻',
  items: [
    { icon: '값', h: '조율 vs 표준화율', b: '조율은 있는 그대로의 비율, 표준화율은 연령 구조 차이를 보정한 값입니다. 지역 간 비교에는 표준화율(기본값), 우리 지역 실제 규모 파악에는 조율을 쓰십시오.' },
    { icon: '↑↓', h: '지표 방향', b: '「높을수록 양호」(걷기 실천율 등)·「낮을수록 양호」(흡연율·사망률 등)·「맥락」(인구·진료비처럼 좋고 나쁨이 없는 값). 지도 색과 순위 방향이 이에 따라 정해집니다.' },
    { icon: '계층', h: '결과사슬 계층', b: '투입·과정 → 산출 → 성과 → 임팩트 → 맥락. 임팩트(사망·유병)는 변화가 느리고 사업 귀인이 어려워 순위 비교에 부적합하다고 표시합니다.' },
    { icon: 'CI', h: '표본오차', b: '지역사회건강조사 지표는 표본조사라 오차가 있습니다. 순위 카드에서 95% 신뢰구간을 켜고, 표준오차가 값의 20%를 넘는 「불안정값」은 제외할 수 있습니다.', color: C.AMBER },
  ],
});
tableSlide({
  t: '자료 갱신 주기와 최신성', sub: '원천이 공표되면 반영합니다 · 최신 상태는 「자료원」 탭 카드의 「최종 갱신」·「다음 공표」 참고',
  head: ['자료', '최신 연도', '다음 공표(예상)', '비고'], colW: [4.0, 1.6, 2.6, 4.13],
  rows: [
    ['지역사회건강조사{r:chs}', '2025', '2026년 12월', '지표 41개 중 심폐소생술 2종은 원천 표에 2025년 값이 없음(2024년까지)'],
    ['사망원인통계 · 건강수명{r:mort,hle}', '2024', '2026년 9월 하순', '공표 즉시 사망률 22종·건강수명 연장'],
    ['국가암검진 · 일반건강검진{r:cancer,nhis}', '2024', '2026년 12월~2027년 1월', '검진 판정은 2018년 제도 개편으로 정의 변경'],
    ['미세먼지·초미세먼지 · 만성하기도질환 사망률{r:env,mort}', '2020', '—', '원천 DB 갱신 대기'],
    ['의료기관 진료실인원(인구 천명당){r:nhis}', '2021', '—', '원천 DB 갱신 대기'],
    ['추락 사망률·등록장애인 비율 2017 · 사회복지시설·교통사고 건수 2022 · 병상 수 2023', '2017~2023', '—', '원천 DB 갱신 대기(지표별 최신 연도는 자료원 탭)'],
    ['코로나19 확진·사망{r:covid}', '2023.8', '없음', '전수감시 종료. 신고 보건소 관할 기준'],
  ],
});

// ─── PART 2 ───
divider(2, '시작하기 — 기본 조작', '설치가 필요 없습니다. 주소를 열면 바로 씁니다. 크롬·엣지·사파리·휴대폰 브라우저 모두 지원합니다.');
cardsSlide({
  t: '접속과 지원 환경',
  items: [
    { icon: 'URL', h: 'https://health-profile.kr', b: '같은 내용이 https://soonryu74.github.io/health-dashboard/ 에서도 열립니다. 파일 하나로 되어 있어 처음 열 때 10MB 정도를 내려받은 뒤에는 빠르게 동작합니다.' },
    { icon: '🖥', h: '권장 브라우저', b: '크롬·엣지 최신 버전을 권장합니다. 영상 저장(MP4)은 크롬·엣지·최신 사파리에서 됩니다. 인터넷 익스플로러는 지원하지 않습니다.' },
    { icon: '📱', h: '휴대폰·태블릿', b: '카드가 1열로 재배치되고 표는 좌우로 밀어서 봅니다. 카카오톡 안의 브라우저는 파일 저장이 막혀 있으니 「다른 브라우저로 열기」를 누르십시오.' },
    { icon: '🔒', h: '개인정보·로그인 없음', b: '로그인이 없고 아무것도 서버로 보내지 않습니다. 입력한 의견·문의 초안만 내 브라우저에 저장됩니다.' },
  ],
});
shot({ t: '휴대폰에서 보기', sub: '카드가 1열로 재배치되고 큰 숫자는 만 단위로 읽기 쉽게', img: ['A_mobile'], img2: ['C_mobile_profile'],
  bullets: ['지표 분석·프로파일·모든 메뉴가 휴대폰에서 동작합니다.', '표는 좌우로 밀어서 보고, 순위 목록은 40개 이하면 한 줄로 전부 펼쳐집니다.', '저장 버튼은 공유 시트로 열립니다(갤러리·카카오톡).'],
  tips: ['카카오톡 안에서 링크를 열었다면 오른쪽 위 메뉴의 「다른 브라우저로 열기」를 먼저 누르십시오.'] });
shot({ t: '화면 구성', sub: '제목(누르면 첫 화면) · 메뉴 탭 · 선택 컨트롤 · 연도 · 요약 타일 · 카드들 · 하단 출처', img: ['A_home_top'],
  bullets: ['① 제목: 누르면 언제든 「지표 분석」 첫 화면으로 돌아갑니다.', '② 메뉴 탭 11개: 지표 분석 · 지역 프로파일 · 성과지표 · 지역 비교 · 예방·관리 · 연관지표 · 핫스팟 · 연대기 전시관 · 조사 단위 · 자료원 · 의견·문의', '③ A−/A+ 글자 크기, 다크 모드 전환', '④ 지표·시도·시군구·비교 담기·값 유형 컨트롤', '⑤ 연도 슬라이더와 ▶ 재생', '⑥ 요약 타일 4개와 분석 카드'],
  tips: ['모든 카드 오른쪽 위에 ↓SVG·↓PNG·↓CSV 버튼이 있습니다.', '화면 상태는 주소(URL)에 담기므로 주소만 복사해 보내면 같은 화면이 열립니다.'] });
shot({ t: '지표 선택', sub: '지표 이름 상자를 누르면 검색창과 영역 칩이 열립니다', img: ['A_picker_open', 'A_controls'],
  bullets: ['검색: 「흡연」·「우울」처럼 단어 일부만 넣어도 찾습니다.', '영역 칩: 흡연·음주·신체활동·식생활·정신건강·구강·만성질환·예방·의료이용 + 사망률·감염병·검진·자원·인구·환경·암검진·건강수명·지역박탈', '지표 이름 앞의 작은 글씨가 영역, 뒤의 배지가 방향·계층입니다.'],
  tips: ['보고서용 핵심 지표는 질병관리청 요약집 25개 지표를 먼저 보십시오(연대기 「변화의 벽」에 모아 두었습니다).', '지표를 바꿔도 지역·연도 선택은 유지됩니다.'] });
shot({ t: '지역 선택과 비교 범위', sub: '시도 → 시군구 순서로 고릅니다. 「시도 전체」를 두면 시도 단위 값을 봅니다', img: ['A_controls'],
  bullets: ['시도 전체: 17개 시도 비교와 시도 값(시도 순위·백분위).', '시군구: 순위·백분위의 비교 기준을 「전국」 또는 「시도 내」로 바꿀 수 있습니다.', '비교 담기: 지금 고른 지역을 「지역 비교」 화면의 바구니에 넣습니다(최대 6개).', '값 유형: 표준화율(기본)·조율. DB 지표는 원자료 값 그대로입니다.'],
  tips: ['시도 내 순위가 더 설득력 있을 때가 많습니다(여건이 비슷한 이웃과 비교).', '시군구를 고르면 지도는 자동으로 「시도 내 시군구」 모드가 됩니다.'] });
shot({ t: '연도 이동과 재생', sub: '슬라이더를 끌거나 ▶ 를 누르면 지도·순위·타일이 해마다 바뀝니다', img: ['A_home_top'],
  bullets: ['연도는 지표마다 다릅니다(지역사회건강조사 2008~2025, 사망원인 ~2024, 검진 ~2024).', '▶ 재생은 한 해씩 넘어가며 지도 색과 순위 자리가 움직입니다.', '연도별 추이표에서 행을 눌러도 그 연도로 이동합니다.'],
  tips: ['발표용 애니메이션은 순위 「전체 보기」의 ▶와 🎬 영상 저장이 더 보기 좋습니다(3부 참고).'] });
cardsSlide({
  t: '주소(URL)로 화면 공유하기', sub: '주소창의 # 뒤에 지표·지역·연도·메뉴가 모두 담깁니다',
  items: [
    { icon: '#', h: '어떻게 생겼나', b: 'health-profile.kr/#ind=DT_H_OBE_OBE&sido=001&sgg=00101&year=2025&view=profile 처럼 지표(ind)·시도(sido)·시군구(sgg)·연도(year)·메뉴(view)가 들어갑니다.' },
    { icon: '📋', h: '보내는 법', b: '원하는 화면을 만든 뒤 주소창을 복사해 메일·카카오톡으로 보내면 받는 사람도 같은 화면을 봅니다. 북마크로 저장해 두면 다음에 바로 열립니다.' },
    { icon: '↩', h: '뒤로 가기', b: '메뉴·지표를 바꿀 때마다 주소가 바뀌므로 브라우저 「뒤로」로 이전 화면에 갑니다.' },
    { icon: '✉', h: '문의에 자동 첨부', b: '「의견·문의」에 보고 있던 화면 주소가 자동으로 붙어, 어느 화면의 문제인지 바로 재현할 수 있습니다.' },
  ],
});
shot({ t: '화면 설정 — 다크 모드와 글자 크기', sub: '오른쪽 위 A−/A+ 와 ☾ 다크 버튼', img: ['A_dark'],
  bullets: ['다크 모드는 눈이 편하고 대형 화면 발표에 적합합니다. 지도 라벨은 구역 밝기에 맞춰 자동으로 색이 바뀝니다.', '글자 크기는 3단계로 키울 수 있습니다. 설정은 브라우저에 기억됩니다.'],
  tips: ['인쇄나 보고서 캡처는 라이트 모드가 잉크 절약과 가독성에 유리합니다.'] });
cardsSlide({
  t: '내려받기 공통 — SVG · PNG · CSV', sub: '모든 카드 오른쪽 위 버튼. 파일명에 지표·지역·연도가 자동으로 들어갑니다',
  items: [
    { icon: 'SVG', h: '↓SVG — 파워포인트에서 편집', b: '벡터 파일이라 파워포인트에 넣고 「그룹 해제」하면 글자·막대를 하나하나 고칠 수 있습니다. 제목·범례·출처까지 포함됩니다.' },
    { icon: 'PNG', h: '↓PNG — 그림 파일', b: '2배 해상도로 저장되어 인쇄물에도 선명합니다. 한글·문서에 바로 붙입니다.' },
    { icon: 'CSV', h: '↓CSV — 엑셀용 표', b: '표·순위·연도별 값을 엑셀에서 열 수 있게 저장합니다(한글 깨짐 방지 처리됨).' },
    { icon: '📱', h: '휴대폰에서는 공유 시트', b: '휴대폰에서는 저장 대신 공유 창이 열려 갤러리·파일·카카오톡으로 보낼 수 있습니다.' },
  ],
});

// ─── PART 3 ───
divider(3, '메뉴별 설명과 활용 팁', '메뉴 탭 11개를 왼쪽부터 차례로 설명합니다. 각 화면의 카드마다 「무엇을 보여 주는가」와 「이렇게 쓰면 좋다」를 적었습니다.');

// 3.1 지표 분석
shot({ t: '3.1 지표 분석 — 요약 타일', sub: '선택 지역 값 · 전국 시군구 중앙값 · 순위 · 백분위를 한 줄로', img: ['A_kpis'], wide: true,
  bullets: ['선택 지역·연도 값과 전년 대비 증감(▲▼).', '전국 시군구 중앙값: 전국 기준선(KOSIS에 전국 행이 없어 중앙값 사용).', '순위: 비교 범위(전국·시도 내)에서의 순위와 방향.', '양호도 백분위: 100에 가까울수록 양호.'],
  tips: ['보고서 첫 문장은 이 타일 네 개로 충분합니다: "강릉시 비만율 38.0%로 전국 시군구 중앙값(35.4%)보다 2.6%p 높고, 조사 단위 258곳 중 193위(2025년)"{r:chs,chs25}.'] });
shot({ t: '3.1 지표 분석 — 단계구분도 ① 전국 시도', sub: '지도 위 탭으로 「전국 시도 / 전국 시군구 / 시도 내 시군구」를 바꿉니다', img: ['B_map_sido'],
  bullets: ['7단계 분위 색: 「나쁠수록 붉게」·「좋을수록 파랗게」·맥락 지표는 보라색.', '지역을 누르면 선택되고, ▶ 로 연도 애니메이션.', '🏷 지역명 토글로 라벨을 켜고 끕니다(겹침 자동 회피).'],
  tips: ['시도 모드는 광역 단위 보고에, 시군구 모드는 전국 분포 파악에 쓰십시오.'] });
shot({ t: '3.1 지표 분석 — 단계구분도 ② 전국 시군구 · ③ 시도 내 시군구', img: ['B_map_nation'], img2: ['B_map_insido'],
  bullets: ['전국 시군구: 지역사회건강조사 지표는 조사 단위 258곳{r:chs25}, 사망률 등 시군구 자료는 229곳의 분포. 분위는 전국 기준.', '시도 내 시군구: 우리 시도만 확대, 분위도 시도 안에서 다시 계산.', '값 없는 지역은 회색.'],
  tips: ['↓SVG로 받으면 지도 폴리곤 색을 파워포인트에서 바꿀 수 있습니다.', '군 단위처럼 작은 지역은 「시도 내」 모드에서 라벨을 켜야 보입니다.'] });
shot({ t: '3.1 지표 분석 — 추이', sub: '선택 지역(파란 선)과 전국 시군구 중앙값(주황 선), 선택 연도는 세로 점선', img: ['B_analysis_01'],
  bullets: ['카드 상단에 자료 출처와 산식, 지표 방향과 근거, 계층 배지와 권장 측정 주기가 적혀 있습니다.', '⚠ 붉은 안내문은 「자료 연결」이나 「정의 변경」(예: 2018년 검진 판정 기준 변경)을 뜻합니다 — 이 경계를 넘어 증감을 비교하지 마십시오.'],
  tips: ['추이 카드는 ↓SVG로 받아 계획서 「현황 분석」 그림으로 그대로 씁니다.'] });
shot({ t: '3.1 지표 분석 — 순위 ① 기본', sub: '집단 탭: 17개 시도 · 전국 시군구 · 시도 내 시군구 — 지역사회건강조사 지표는 조사 단위 258곳 기준{r:chs25}', img: ['B_analysis_02'], img2: ['B_rank_rev'],
  bullets: ['막대 길이 = 값. 선택 지역은 파란 막대, 같은 시도 지역은 옅게 표시.', '「양호한 순 ▼ / 나쁜 순 ▲」로 정렬을 뒤집습니다.', '40개 이하 목록은 한 줄로 전부 펼쳐지고, 전국 목록(조사 단위 258곳 또는 시군구 229곳)은 스크롤 상자(인쇄 시 전부 펼침).', '수원시처럼 보건소 여러 곳으로 조사되는 시를 고르면 소속 보건소들이 함께 강조됩니다.'],
  tips: ['「시도 내 시군구」 탭이 기본으로 열립니다. 전국 순위가 필요하면 「전국 시군구」 탭.'] });
shot({ t: '3.1 지표 분석 — 순위 ② 신뢰구간과 불안정값', sub: '표본조사 지표(지역사회건강조사)에서만 나타나는 토글', img: ['B_rank_ci'],
  bullets: ['⟺ 신뢰구간: 막대 위에 95% 오차막대와 ±값. 선택 지역과 구간이 겹치는 지역은 흐리게 = 차이가 불확실.', '불안정값 제외: 표준오차가 값의 20%를 넘는 지역을 순위에서 뺍니다(미국 County Health Rankings 규칙).', '우울증상 유병률처럼 불안정 비율이 높은 지표는 순위 자체를 쓰지 않는 편이 낫습니다.'],
  tips: ['"우리 지역이 몇 위"라고 쓰기 전에 신뢰구간을 켜서 몇 곳과 겹치는지 확인하십시오.'] });
shot({ t: '3.1 지표 분석 — 순위 ③ 10개 묶음', sub: '1~N 서열 대신 값이 비슷한 지역을 10개 묶음으로', img: ['B_rank_group'],
  bullets: ['값 분포를 최적 분할(Fisher–Jenks)해 크기가 제각각인 10개 묶음에 배정합니다.', '번호 칸이 순위 → 묶음 번호로 바뀌고 경계에 구분선이 생깁니다.', '같은 묶음 안의 순서 차이는 의미가 없습니다.'],
  tips: ['의회·언론 자료에서 「몇 위」 대신 「상위 2번째 묶음」처럼 쓰면 순위 논쟁을 줄일 수 있습니다.'] });
shot({ t: '3.1 지표 분석 — 순위 ④ 전체 보기(한 줄)', sub: '⛶ 전체 보기: 25개든 258개든 위에서 아래로 한 줄, 막대가 화면 폭 전체 → 격차가 한눈에', img: ['B_rankall'],
  bullets: ['▶ 2008년부터 재생: 막대 길이와 순위 자리가 해마다 움직입니다(척도는 전 연도 공통 최댓값 → 늘고 주는 게 그대로 보임).', '선택 지역은 붉은 막대, ▲▼는 전년 대비 순위 변동.', '단축키: Space 재생 · ← → 연도 · Esc 닫기. 칸을 누르면 그 지역으로 이동.'],
  tips: ['「크게」는 줄 높이를 키웁니다. 회의실 화면에서 켜십시오.'] });
shot({ t: '3.1 지표 분석 — 순위 ⑤ 인쇄와 영상 저장', sub: '전체 보기 상단의 🖨 인쇄 · 🎬 영상 저장', img: ['B_rankall_print'],
  bullets: ['🖨 인쇄: 이 화면만 세로로 길게 인쇄됩니다(버튼·연도칩 제외, 막대 색 유지). 브라우저 인쇄 창에서 PDF로 저장해도 됩니다.', '🎬 영상 저장: 2008년부터 마지막 연도까지 순위·막대 변화를 MP4(1280×720/1080, 30fps)로 저장합니다. 25개 기준 약 27초·10MB.', '영상 범위: 자동(40개 이하 전체, 아니면 상위 30) · 전체 · 상위 30 · 상위 50. 선택 지역은 범위 밖이어도 맨 아래에 순위와 함께 나옵니다.'],
  tips: ['비만율처럼 해마다 오른 지표는 영상에서 막대가 길어지는 모습이 그대로 보입니다.', '영상을 만드는 동안 창을 닫지 마십시오. MP4가 안 되는 브라우저는 WebM으로 저장됩니다.'] });
shot({ t: '3.1 지표 분석 — 연도별 추이표', sub: '수치 · 순위 · 증감량(%p) · 증감률(%)', img: ['B_analysis_03'],
  bullets: ['연도마다 값과 순위, 전년 대비 증감을 표로 보여 줍니다.', '행을 누르면 그 연도로 화면 전체가 이동합니다.', '↓CSV로 받아 엑셀에서 추가 계산.'],
  tips: ['계획서 「연차별 목표」 표의 기준값(최근 3년)을 여기서 복사하십시오.'] });
shot({ t: '3.1 지표 분석 — 지역 간 격차(상자그림)', sub: '연도별 분포(상자=1~3사분위, 수염=최소~최대)와 우리 지역의 위치(점)', img: ['B_analysis_04'],
  bullets: ['상자가 길수록 지역 간 격차가 큽니다. 점이 상자 밖이면 우리 지역이 극단에 있다는 뜻.', '격차 최대·최소 지역명이 함께 표시됩니다.'],
  tips: ['"격차가 줄었는가"는 상자 길이의 연도별 변화로 말할 수 있습니다.'] });
shot({ t: '3.1 지표 분석 — 건강형평성(지역박탈지수)', sub: '2020 인구총조사 집계표 7개 변수로 만든 근사 지수{r:dep} · 5분위', img: ['B_analysis_05'], wide: true,
  bullets: ['박탈 분위별로 지표 값이 어떻게 다른지 보여 줍니다(형평성 기울기).', '선택 지역의 실제 숫자로 산식을 펼쳐 보여 화면만으로 검산할 수 있습니다.', '공식 통계가 아니라 「근사」입니다. 절대값·1~2위 차이 강조는 피하십시오.'],
  tips: ['형평성 관점의 사업 대상 지역(높은 박탈 + 나쁜 지표)을 고를 때 씁니다.'] });
shot({ t: '3.1 지표 분석 — 이 지표의 현행 근거 지침', sub: '영국 NICE 가이드라인{r:nice} + 미국 CPSTF 권고{r:cpstf}', img: ['B_evidence'],
  bullets: ['지표와 직접·부분 관련된 NICE 가이드라인, 발표·최종 갱신 연도, 권고 수(권고·고려·반대·근거 불충분)를 보여 줍니다.', '판정 배지: 현행(최근 10년 내 갱신) · 얇음 · CPSTF만 · 오래됨 · 없음.', 'CPSTF 권고는 15년 이상 지난 것이 많아 보조로만 표시합니다.'],
  tips: ['사업 계획서 「근거」 란에 가이드라인 번호(예: NG92)와 갱신 연도를 인용하십시오.'] });

// 3.2 지역 프로파일
shot({ t: '3.2 지역 프로파일 — 개요', sub: '시군구를 고르면 전 지표 백분위를 모아 프로파일을 자동 생성', img: ['C_profile_top'],
  bullets: ['영역 점수(흡연·음주·신체활동·식생활·정신건강·구강·만성질환·예방·의료이용) + 등급 배지(플래티넘 10% · 골드 25% · 실버 50%){r:rank}.', '강점 TOP5 · 개선 TOP5(항상 강점을 먼저, 최소 3개 보장).', '가중치 프리셋(균등·모의 패널·직접), 3년 평균, 도시·군 리그 선택.'],
  tips: ['기본값은 표준화율 + 균등 가중 + 3년 평균입니다. 「모의 패널」 가중치는 AI 시뮬레이션이라 실제 근거로 쓰지 마십시오.'] });
shot({ t: '3.2 지역 프로파일 — 강점과 개선 과제', sub: '백분위 상위·하위 지표와 접힌 「개선 과제」 목록', img: ['C_profile_07'], img2: ['C_profile_08'],
  bullets: ['개선 TOP5는 하위 백분위 지표. 사망률·건강수명 같은 결과지표는 순위 산정에서 빠지고, 진단 경험률 2종·건강생활실천율·보건기관 이용률 4종도 기본값에서 제외됩니다(설정에서 포함 가능).', '「개선 과제」를 펼치면 하위 25% 지표 전체와 권고 사업(예방·관리 탭 연결)이 나옵니다.'],
  tips: ['강점을 먼저 말하고 개선 과제를 말하는 순서가 미국 County Health Rankings의 설계 원칙입니다. 보고서도 같은 순서를 권합니다.'] });
shot({ t: '3.2 지역 프로파일 — 기대수명·건강수명(근사)', sub: '사망원인통계{r:mort}·연앙인구로 만든 시군구 생명표{r:hle} + 주관적 건강 기반 건강수명', img: ['C_profile_02'],
  bullets: ['기대수명·건강수명·불건강 기간·시군구 순위 타일과 추이.', '「산출 예시」에 선택 지역 숫자로 6단계 산식과 검산행이 나옵니다.', '공식 통계가 아니므로 「건강수명(주관적 건강 기반·근사)」로만 부르고, 절대값·연도 간 비교·1~2위 차이 강조는 피합니다.'],
  tips: ['시도 값(통계청 생명표 기반)은 공식 값에 가깝고, 시군구는 근사입니다. 문서에 반드시 구분해 적으십시오.'] });
shot({ t: '3.2 지역 프로파일 — 동류군 비교', sub: '고령화율·재정자립도·인구밀도·박탈분위가 비슷한 12개 시군구와 비교', img: ['C2_gurye_05'],
  bullets: ['여건 보정 없는 전국 서열화에 대한 대응입니다. 도시 리그·군 리그로 나뉩니다.', '동류군 안에서 우리 지역이 몇 번째인지, 어떤 지표가 동류군 평균보다 좋고 나쁜지 보여 줍니다.'],
  tips: ['"여건이 비슷한 12곳 중 3위"는 전국 순위보다 설득력이 있습니다.'] });
shot({ t: '3.2 지역 프로파일 — 황금다이아몬드(보건사업 우선순위)', sub: '시간축(기준연도 대비 개선/유지/악화) × 공간축(중앙값 대비 좋음/비슷/나쁨) 3×3', img: ['C_profile_04'],
  bullets: ['당해연도·기준연도를 여러 해 평균으로 고를 수 있어 표본오차를 줄입니다.', '1순위(악화 + 나쁨)가 사업 우선 검토 대상. 통합건강증진사업 계획서의 CIAT 황금다이아몬드와 같은 구조.', '비교 기준을 전국 중앙값·시도로 바꿀 수 있습니다.'],
  tips: ['「최근 3년 vs 이전 3년」 빠른 선택이 계획서 작성에 가장 무난합니다.'] });
shot({ t: '3.2 지역 프로파일 — 감염병 대응 고위험군 + 코로나19 실적 참고', sub: '질병관리청 지침의 고위험군 정의를 지역 자료로 옮긴 규모(실측/추정)', img: ['C_profile_03'],
  bullets: ['65세 이상·기저질환·임신부·영유아·감염취약시설·사회적 취약·예방접종·대응 자원 30개 집단{r:risk}. 집단은 겹치므로 더하지 않습니다.', '하단 「코로나19 실적 참고」: 2020.1~2023.8 누적 확진율·10만 명당 사망·치명률(선택 지역·시도·전국 중앙값)과 65세 이상 비율 4분위별 치명률.', '⚠ 코로나 자료는 거주지가 아니라 신고 보건소 관할 기준이라 대형병원 소재지가 높게 나옵니다 — 시군구 순위를 매기지 않습니다.'],
  tips: ['감염병 대응 계획의 「대상 규모」 표는 이 카드의 CSV로 만드십시오.'] });
shot({ t: '3.2 지역 프로파일 — 무엇부터 손댈 것인가', sub: '하위 25% 지표 × 현행 근거 지침 = 우선순위 표', img: ['C2_gurye_10'],
  bullets: ['하위 지표를 근거 판정(현행 → 얇음 → CPSTF만 → 오래됨 → 없음) 순으로 정렬합니다.', '근거가 확실한 지표부터 손대면 사업 효과를 설명하기 쉽습니다.', '「근거 공백」 접기에서 지침이 없는 지표를 따로 보여 줍니다.'],
  tips: ['하위 기준(25/30/40%)을 바꿔 가며 후보 폭을 조절하십시오.'] });

// 3.3 성과지표
shot({ t: '3.3 성과지표 — 통합건강증진사업 핵심성과지표 16개', sub: '보유 13개 + 미보유 3개{r:khepi}(자료원·사유·확보 경로 표기)', img: ['D_kpi_top'],
  bullets: ['지표별 우리 지역 최근값·추이·전국 중앙값.', '안내서의 목표치 설정법 5종(전년 대비·추세 연장·중앙값 도달·상위 25% 도달·격차 절반)을 자동 계산.', '달성률·득점 계산기에 목표·실적을 넣으면 점수가 나옵니다.'],
  tips: ['계획서 목표치는 여기서 5종을 비교해 가장 현실적인 값을 고르십시오.'] });
shot({ t: '3.3 성과지표 — 미보유 3종과 확보 경로', sub: '투약 순응률 2종 · 모유수유 실천율은 시군구 공표 통계가 없음', img: ['D_kpi_00'],
  bullets: ['투약 순응률: KOSIS에 표가 없고 공단 자료는 시도 단위·「300일」 구간이 없음 → 공단 맞춤형 DB 신청 사안.', '모유수유: 보건복지부 실태조사(전국·시도 표본)만 있음.', '건강증진개발원이 공표한 과거 참고값을 함께 표시합니다.'],
  tips: ['보건소 자체 집계값이 있으면 계산기에 직접 넣어 득점을 확인하십시오.'] });

// 3.4 지역 비교
shot({ t: '3.4 지역 비교', sub: '전국 중앙값·시도·시군구를 섞어 최대 6개까지 나란히', img: ['E_compare_top'],
  bullets: ['지표 분석 화면의 「+ 비교에 추가」로 담거나, 비교 화면에서 바로 담습니다. 처음 담을 때 전국 중앙값이 자동으로 들어갑니다.', '추이(여러 선) · 막대 · 연도표 · 전 지표 비교표(백분위 색).', '비교 목록도 주소에 담기므로 그대로 공유됩니다.'],
  tips: ['우리 지역 + 시도 + 전국 중앙값 + 동류군 2곳이 가장 읽기 쉬운 조합입니다.'] });

// 3.5 예방·관리
shot({ t: '3.5 예방·관리 — 만성질환 지식베이스', sub: 'WHO → 서태평양 → 국가(HP2030·통합건강증진) → 17개 시도 지역보건의료계획 4층 구조', img: ['F_ncd_top'],
  bullets: ['182개 항목·문서 54건(원문 링크는 예방·관리 탭 각 항목). 41개 지표 모두 최소 1개 항목에 연결.', '프로파일의 하위 지표를 누르면 시도 → 국가 → WPRO → WHO 순으로 권고 사업 카드가 열립니다.', 'AI가 수집·요약한 내용이므로 수치는 원문으로 확인하십시오.'],
  tips: ['우리 시도 제8기 지역보건의료계획의 해당 사업명을 그대로 인용하면 상위 계획과의 정합성을 보이기 쉽습니다.'] });

// 3.6 연관지표
shot({ t: '3.6 연관지표 — 두 지표의 관계', sub: '산점도 · 피어슨/스피어만/켄달 상관계수 · 연도별 상관', img: ['G_corr_01'], img2: ['G_corr_02'],
  bullets: ['X·Y 지표를 고르면 산점도와 상관계수, 근사 p값이 나옵니다. 두 지표가 모두 지역사회건강조사면 조사 단위 258곳, 아니면 시군구 229곳에서 짝을 짓습니다.', '우리 지역 점은 강조 표시.', '상관은 인과가 아닙니다. 고령화율처럼 둘 다에 영향을 주는 제3의 요인을 생각하십시오.'],
  tips: ['걷기 실천율 ↔ 비만율, 흡연율 ↔ 폐암 사망률처럼 사업 논리를 뒷받침하는 쌍을 찾을 때 씁니다.'] });

// 3.7 핫스팟
shot({ t: '3.7 핫스팟 — 공간 군집과 추세', sub: 'Getis-Ord Gi*(90/95/99%) 핫·콜드스팟 + Mann-Kendall 추세', img: ['H_hot_01'], img2: ['H_hot_02'],
  bullets: ['인접한 시군구끼리 값이 함께 높은(핫) 또는 낮은(콜드) 군집을 지도에 표시합니다.', '추세: 연도별 값의 Mann-Kendall z와 Sen 기울기로 「유의하게 증가/감소」를 판정.', '섬 지역은 가장 가까운 2곳을 이웃으로 씁니다.'],
  tips: ['광역 공동사업(인접 시군구 연합)의 근거로 핫스팟 지도를 쓰십시오.'] });

// 3.8 연대기
shot({ t: '3.8 연대기 전시관', sub: '지침·백서·계획을 연도별 3D 복도에, 올해의 10대 뉴스와 변화의 벽', img: ['I_chron_top'],
  bullets: ['39건의 정책·지침 이벤트를 연도 플라크로 전시(링크만, AI 요약).', '올해의 10대 뉴스: 시군구 중앙값의 전년 대비 변화에서 자동 산출(역대 기록 가산).', '변화의 벽: 요약집 25개 지표의 연도별 변화 애니메이션. 「개선 1.8%p」처럼 말로 표시.'],
  tips: ['교육·발표 도입부에 「자동 관람」을 켜 두면 배경 설명이 됩니다.'] });

// 3.9 조사 단위
shot({ t: '3.9 조사 단위', sub: '보건소 조사 단위 258곳{r:chs25}과 보건기관 3,607곳{r:fac}(보건지소·진료소 등) 연결', img: ['J_units_01'],
  bullets: ['지역사회건강조사 조사 단위 ↔ KOSIS 코드 전량 매핑, 연도별 참여 단위.', '시도별 보건기관 수(KOSIS 2025)와 공공데이터포털 지역보건의료기관 현황(2025-12-31).', '수원시 4개 보건소처럼 시군구 하나에 조사 단위가 여럿인 경우를 확인합니다.'],
  tips: ['지역사회건강조사 지표의 전국 순위·중앙값은 이 258곳 목록을 기준으로 합니다(질병관리청 공표 방식).'] });

// 3.10 자료원
shot({ t: '3.10 자료원 — 카드', sub: '기관 · 지표 수 · 연도 · 단위 · 갱신 주기 · 다음 공표 · 표 ID · 최종 갱신일 · 경유 · 산식 · 한계', img: ['K_sources_01'],
  bullets: ['원 출처 기관 기준 11종. 김동현 교수 DB(질병관리청 자료실)는 원천이 아니라 「경유」로 표기.', '자체 산출 2종에는 「근사·공식 아님」 배지와 한계 4가지.', '「지역별 실제 숫자는 어느 화면에서 볼 수 있는지」 안내.'],
  tips: ['보고서 「자료원」 절은 이 카드 내용을 그대로 옮기면 됩니다.'] });
shot({ t: '3.10 자료원 — 보건소별 보유 매트릭스', sub: '258행 × 자료원별 ●◐○ · 검색 · 결측 필터 · CSV', img: ['K_sources_02'],
  bullets: ['● 그 단위로 값 있음 · ◐ 소속 시군구 값으로 대체 · ○ 없음.', '실제 결측은 4곳뿐(군위군 건강수명, 창원 3개 보건소 박탈지수).'],
  tips: ['우리 보건소 행을 검색해 어떤 자료가 시군구 값으로 대체되는지 먼저 확인하십시오.'] });

// 3.11 의견·문의
shot({ t: '3.11 의견·문의', sub: '서버 없이 이메일로 받습니다 · 보고 있던 화면 주소와 브라우저 정보 자동 첨부', img: ['L_feedback_00'],
  bullets: ['구분(오류·수정 의견·자료 문의·기타) · 내용 · 이름/소속 · 회신 이메일.', '✉ 이메일 앱으로 보내기 / 📋 내용 복사(카카오톡 등에 붙여넣기) / 🐙 GitHub 이슈(개발자용).', '쓰던 글은 브라우저에 자동 저장. 자주 묻는 질문 5개.'],
  tips: ['오류를 신고할 때는 지표명·지역·연도와 함께 「화면 링크 첨부」를 켜 두십시오.'] });

// ─── PART 4 ───
divider(4, '활용 시나리오', '실제 업무 흐름에 맞춰 어떤 메뉴를 어떤 순서로 쓰는지 다섯 가지 예를 듭니다.');
stepsSlide({ t: '시나리오 1 — 지역보건의료계획 「현황 분석」 작성', sub: '약 1시간이면 그림·표·근거를 갖춘 초안이 나옵니다',
  steps: [
    { h: '지역 프로파일 열기', b: '우리 시군구 선택 → 영역 점수·등급·강점 TOP5·개선 TOP5를 캡처(↓PNG).' },
    { h: '핵심 지표 6~8개 고르기', b: '개선 TOP5 + 요약집 25개 중 중요 지표. 각 지표의 추이·순위 카드를 ↓SVG로 저장.' },
    { h: '동류군·형평성 보강', b: '동류군 비교로 「여건 대비」 위치, 건강형평성 카드로 박탈 분위별 격차를 한 줄씩.' },
    { h: '자료원 절 작성', b: '자료원 탭 카드에서 기관·연도·산식·한계를 옮겨 적기. 자체 산출 지표는 「근사」 표기.' },
    { h: '주소 공유', b: '심의 위원에게 화면 주소를 보내 같은 화면을 보게 하기.' },
  ] });
stepsSlide({ t: '시나리오 2 — 사업 우선순위 정하기', sub: '황금다이아몬드 + 근거 지침 + 동류군',
  steps: [
    { h: '황금다이아몬드', b: '「최근 3년 vs 이전 3년」로 악화+나쁨(1순위) 지표를 추립니다.' },
    { h: '무엇부터 손댈 것인가', b: '하위 지표를 근거 판정 순으로 정렬해 「현행 근거 있음」부터 고릅니다.' },
    { h: '근거 지침 확인', b: '지표 분석의 근거 카드에서 NICE 가이드라인 번호·권고 문장을 인용.' },
    { h: '예방·관리 사업 찾기', b: '개선 과제에서 권고 사업 카드를 열어 시도·국가 계획의 사업명을 확인.' },
    { h: '동류군으로 검증', b: '같은 여건의 12곳과 비교해 정말 우리만 나쁜지 확인합니다.' },
  ] });
stepsSlide({ t: '시나리오 3 — 성과지표 목표치 세우기', sub: '성과지표 탭의 5종 산식',
  steps: [
    { h: '성과지표 탭', b: '보유 13개 지표의 최근값·추세·전국 중앙값을 확인.' },
    { h: '5종 산식 비교', b: '전년 대비·추세 연장·중앙값 도달·상위 25%·격차 절반 중 현실적인 값 선택.' },
    { h: '신뢰구간 확인', b: '순위 카드에서 ±오차를 보고 목표 폭이 오차보다 큰지 점검.' },
    { h: '계산기로 득점 예상', b: '목표·실적을 넣어 달성률·득점을 미리 계산.' },
    { h: '연도별 추이표 CSV', b: '기준값 3년 평균을 표로 첨부.' },
  ] });
stepsSlide({ t: '시나리오 4 — 의회·주민 설명자료 만들기', sub: '영상 · 인쇄 · SVG',
  steps: [
    { h: '지표 고르기', b: '변화가 큰 지표(비만율·걷기 실천율 등)를 고릅니다.' },
    { h: '전체 보기 → 영상 저장', b: '시도 내 시군구 탭에서 🎬 영상 저장(자동 범위). 파워포인트에 삽입.' },
    { h: '인쇄본', b: '🖨 인쇄로 한 줄 순위표를 PDF로 저장해 배포.' },
    { h: '10개 묶음', b: '순위 대신 묶음으로 표기해 「몇 위」 논쟁을 피합니다.' },
    { h: '출처 표기', b: '"자료: 질병관리청 지역사회건강조사(KOSIS) 등 · 지역 건강프로파일 대시보드".' },
  ] });
stepsSlide({ t: '시나리오 5 — 감염병 대비 대상 규모 산정', sub: '고위험군 카드 + 코로나19 참고',
  steps: [
    { h: '고위험군 카드', b: '65세 이상·기저질환·시설 정원·임신부·영유아 규모를 확인(실측/추정 구분).' },
    { h: '집단별 표 CSV', b: '30개 집단의 인원·인구 대비·시도 순위를 CSV로 저장.' },
    { h: '코로나19 참고', b: '누적 확진율·사망·치명률을 시도·전국 중앙값과 비교(순위 아님).' },
    { h: '4분위 치명률', b: '65세 이상 비율이 높을수록 치명률 2배{r:covid,risk} — 대비 필요성의 근거.' },
    { h: '주의문 인용', b: '신고 관할 기준·연령별 자료 없음을 반드시 함께 적습니다.' },
  ] });

// ─── PART 5 ───
divider(5, '해석 주의와 자주 묻는 질문', '숫자를 잘못 읽으면 도구가 오히려 해가 됩니다. 다섯 가지 주의와 FAQ.');
cautionSlide({ t: '해석 주의 ① 순위의 함정', items: [
  { h: '인접 순위 차이는 대부분 의미가 없습니다', b: '표본조사 지표는 표본오차가 있습니다. 신뢰구간이 겹치는 지역끼리는 「차이가 있다」고 말할 수 없습니다. 순위 카드의 ⟺ 신뢰구간과 ⑩ 묶음을 쓰십시오.' },
  { h: '불안정값이 많은 지표는 순위를 쓰지 마십시오', b: '우울증상 유병률은 표준화율 기준 시군구 값(2017~2025)의 62%가 불안정값입니다{r:chs}. 이런 지표는 시도 단위나 여러 해 평균으로만 말하십시오.' },
  { h: '임팩트 지표(사망·유병)는 사업 성과가 아닙니다', b: '변화가 느리고 원인이 여럿이라 사업 귀인이 불가능합니다. 계층 배지가 「임팩트」인 지표는 「기여」로만 표현하십시오.' },
] });
cautionSlide({ t: '해석 주의 ② 자체 산출 지표와 정의 변경', items: [
  { h: '건강수명·지역박탈지수는 「근사」입니다', b: '「건강수명(주관적 건강 기반·근사)」·「지역박탈지수(근사, 총조사 집계표)」로만 부르고, 절대값·연도 간 비교·1~2위 차이 강조를 피하십시오. 한계 4가지가 자료원 카드에 있습니다{r:hle,dep}.' },
  { h: '2018년 검진 제도 개편으로 정의가 바뀐 지표', b: '검진 고혈압·당뇨 판정 비율(2차 판정)은 2017년에서 끝나고, 2018년부터는 1차 판정 의심·유질환자 4종이 별도입니다. 정상A 비율은 2017→2018년에 계단이 있습니다. ⚠ 안내문이 있는 지표는 경계 전후 비교를 하지 마십시오.' },
  { h: '코로나19 자료는 신고 보건소 관할 기준', b: '사망은 사망 장소(병원) 관할로 집계되어{r:covid} 상급종합병원이 있는 지역이 높게 나옵니다. 시군구 순위를 매기지 말고 시도·중앙값 비교만 하십시오.' },
] });
cardsSlide({ t: '자주 묻는 질문', items: [
  { icon: 'Q', h: '자료는 언제 갱신되나요?', b: '지역사회건강조사 12월, 사망원인통계 9월 하순, 공단 검진통계 연말~연초. 각 자료원 카드의 「다음 공표」를 보십시오.' },
  { icon: 'Q', h: '우리 지역 값이 비어 있어요', b: '보건소 단위와 시군구 단위가 다르거나 원천에 값이 없는 경우입니다. 자료원 탭의 매트릭스에서 ●◐○를 확인하십시오.' },
  { icon: 'Q', h: '그림을 보고서에 쓰고 싶어요', b: '↓SVG(편집 가능)·↓PNG·↓CSV, 전체 보기의 인쇄·영상. 출처는 「자료: 질병관리청 지역사회건강조사(KOSIS) 등 · 지역 건강프로파일 대시보드」.' },
  { icon: 'Q', h: '휴대폰에서 저장이 안 돼요', b: '카카오톡·인스타그램 안의 브라우저는 저장이 막혀 있습니다. 「다른 브라우저로 열기」 또는 크롬·사파리에서 여십시오.' },
] });
cardsSlide({ t: '문의와 개선 요청', items: [
  { icon: '✉', h: '이메일', b: 'khealth.profile@gmail.com — 「의견·문의」 메뉴에서 보내면 화면 주소가 자동으로 붙습니다.' },
  { icon: '🌐', h: '주소', b: 'https://health-profile.kr (동일 내용: soonryu74.github.io/health-dashboard)' },
  { icon: '📚', h: '방법론 문서', b: '건강수명 산출법 · 지역박탈지수 산출 · 지표 방향성 · 랭킹 방법론 · 지역보건사업 평가이론 · 데이터 최신성 점검 — 저장소 docs 폴더.' },
  { icon: '🔄', h: '갱신 내역', b: '수정 사항은 「자료원」 탭과 「연대기 전시관」에 반영됩니다. 이 설명서는 화면이 바뀌면 함께 갱신합니다.' },
] });
// ─── 참고문헌 (대시보드 화면 하단 목록과 같은 번호) ───
for (let p = 0; p * REF_PER_SLIDE < REFS.length; p++) {
  const s = pres.addSlide();
  if (pageNo + 1 !== refSlideOf(p * REF_PER_SLIDE + 1)) throw new Error(`참고문헌 쪽 번호 불일치: 실제 ${pageNo + 1}, 예상 ${refSlideOf(p * REF_PER_SLIDE + 1)} — REF_SLIDE_FIRST=${pageNo + 1} 로 다시 실행`);
  title(s, p ? '참고문헌 (계속)' : '참고문헌', '본문의 파란 [번호]를 누르면 이 쪽으로 옵니다 · 번호는 대시보드 화면 하단 「참고문헌」과 같습니다 · 주소를 누르면 원문이 열립니다');
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
  s.addText(runs, T({ x: 0.5, y: 1.45, w: W - 1, h: H - 2.1, valign: 'top', fontSize: 10.5 }));
  footer(s);
}
{
  const s = pres.addSlide(); s.background = { color: C.NAVY };
  s.addText('감사합니다', T({ x: 0.8, y: 2.6, w: 11.5, h: 1.0, fontSize: 36, bold: true, color: C.WHITE }));
  s.addText('지역 건강프로파일 대시보드 · https://health-profile.kr · khealth.profile@gmail.com', T({ x: 0.8, y: 3.7, w: 11.5, h: 0.5, fontSize: 14, color: 'CADCFC' }));
  pageNo += 1;
}

await pres.writeFile({ fileName: OUT });
console.log('written', OUT, 'slides', pageNo);
