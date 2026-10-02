// 소개 영상(MP4) 생성기 — 대시보드의 모든 메뉴와 숨은 옵션(순위 산출 방식·모의 패널·직접 가중치·전체 보기 등)을
// Playwright 로 실제로 클릭하며 녹화하고, 자막·커서를 페이지 안 DOM 으로 그려 영상에 그대로 찍는다.
//
// 사용법(저장소 밖 scratchpad 에서 실행, 로컬 서버 8911 에 index.html 이 떠 있어야 한다):
//   node demo_video.mjs dry   <outdir>        장면·선택자 점검만(녹화 없음, 실패 단계는 ✗ 로 표시하고 계속)
//   node demo_video.mjs full  <outdir>        전체 시연판(모든 장면) → <outdir>/full.mp4
//   node demo_video.mjs hl    <outdir>        하이라이트판(hl: true 장면만) → <outdir>/hl.mp4
//   node demo_video.mjs both  <outdir>        둘 다
//   node demo_video.mjs fonttest <outdir>     자막 글꼴(한글·기호) 확인용 PNG
// 환경변수: PW_PATH(playwright index.mjs) · PW_CHROMIUM(실행 파일) · FFMPEG · BASE(http://127.0.0.1:8911/index.html) · SPEED(1 = 기본, 0.5 = 2배 빠르게 점검)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const PW = process.env.PW_PATH || '/opt/node22/lib/node_modules/playwright/index.mjs';
const { chromium } = await import(PW);
const CHROMIUM = process.env.PW_CHROMIUM || '/opt/pw-browsers/chromium';
const FFMPEG = process.env.FFMPEG || '/usr/local/lib/python3.11/dist-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2';
const BASE = process.env.BASE || 'http://127.0.0.1:8911/index.html';
const MODE = process.argv[2] || 'dry';
const OUT = process.argv[3] || '.';
const DRY = MODE === 'dry';
const SPEED = DRY ? 0.12 : Number(process.env.SPEED || 1);
const W = 1280, H = 720;
fs.mkdirSync(OUT, { recursive: true });

// ───────────────────────── 페이지 안 오버레이(커서·자막·진행 칩·타이틀 카드) ─────────────────────────
const OVERLAY_CSS = `
#dv-cur{position:fixed;z-index:2147483000;width:20px;height:20px;border-radius:50%;background:rgba(216,64,42,.9);border:2px solid #fff;
  box-shadow:0 0 0 4px rgba(216,64,42,.3),0 2px 6px rgba(0,0,0,.35);pointer-events:none;transform:translate(-50%,-50%);left:-80px;top:-80px;
  transition:left .32s cubic-bezier(.4,0,.2,1),top .32s cubic-bezier(.4,0,.2,1)}
#dv-rip{position:fixed;z-index:2147482999;width:20px;height:20px;border-radius:50%;border:3px solid #d8402a;pointer-events:none;
  transform:translate(-50%,-50%);opacity:0;left:-80px;top:-80px}
#dv-rip.go{animation:dvrip .55s ease-out}
@keyframes dvrip{0%{transform:translate(-50%,-50%) scale(.7);opacity:.95}100%{transform:translate(-50%,-50%) scale(3.2);opacity:0}}
#dv-cap{position:fixed;z-index:2147482998;left:50%;bottom:26px;transform:translateX(-50%);max-width:1120px;padding:11px 22px;
  background:rgba(15,26,46,.9);color:#fff;font:700 23px/1.4 "NanumSquareRound","NanumBarunGothic","NanumGothic",sans-serif;border-radius:14px;
  pointer-events:none;opacity:0;transition:opacity .22s;text-align:center;white-space:pre-line;letter-spacing:-.01em;
  box-shadow:0 4px 18px rgba(0,0,0,.35)}
#dv-cap.show{opacity:1}
#dv-cap small{display:block;font-size:17px;font-weight:500;color:#cadcfc;margin-top:3px}
#dv-chip{position:fixed;z-index:2147482998;left:14px;bottom:26px;padding:5px 11px;background:rgba(15,26,46,.75);color:#cadcfc;
  font:700 14px "NanumBarunGothic","NanumGothic",sans-serif;border-radius:999px;pointer-events:none;opacity:0;transition:opacity .2s}
#dv-chip.show{opacity:1}
#dv-card{position:fixed;inset:0;z-index:2147483001;background:#1e2761;color:#fff;display:none;flex-direction:column;align-items:center;
  justify-content:center;font-family:"NanumSquareRound","NanumBarunGothic","NanumGothic",sans-serif;text-align:center;padding:40px;
  background-image:radial-gradient(circle at 20% 20%,rgba(202,220,252,.18),transparent 55%)}
#dv-card.show{display:flex}
#dv-card h1{font-size:52px;margin:0 0 16px;font-weight:800;letter-spacing:-.02em}
#dv-card p{font-size:24px;margin:5px 0;color:#cadcfc;font-weight:500}
#dv-card .tag{display:inline-block;margin-top:22px;padding:7px 16px;border:1.5px solid rgba(202,220,252,.6);border-radius:999px;font-size:18px;color:#fff}
`;
const OVERLAY_INIT = `(() => {
  const mount = () => {
    if (document.getElementById('dv-cur')) return;
    const st = document.createElement('style'); st.id = 'dv-style'; st.textContent = ${JSON.stringify(OVERLAY_CSS)}; document.head.appendChild(st);
    for (const id of ['dv-rip', 'dv-cur', 'dv-chip', 'dv-cap', 'dv-card']) { const d = document.createElement('div'); d.id = id; document.body.appendChild(d); }
    window.__dv = {
      cur(x, y) { const c = document.getElementById('dv-cur'); c.style.left = x + 'px'; c.style.top = y + 'px'; },
      rip(x, y) { const r = document.getElementById('dv-rip'); r.style.left = x + 'px'; r.style.top = y + 'px'; r.classList.remove('go'); void r.offsetWidth; r.classList.add('go'); },
      cap(t, sub) { const c = document.getElementById('dv-cap'); if (!t) { c.classList.remove('show'); return; } c.innerHTML = ''; c.append(document.createTextNode(t)); if (sub) { const s = document.createElement('small'); s.textContent = sub; c.appendChild(s); } c.classList.add('show'); },
      chip(t) { const c = document.getElementById('dv-chip'); c.textContent = t || ''; c.classList.toggle('show', !!t); },
      card(h, lines, tag) { const c = document.getElementById('dv-card'); c.innerHTML = ''; if (!h) { c.classList.remove('show'); return; }
        const h1 = document.createElement('h1'); h1.textContent = h; c.appendChild(h1);
        for (const l of lines || []) { const p = document.createElement('p'); p.textContent = l; c.appendChild(p); }
        if (tag) { const s = document.createElement('span'); s.className = 'tag'; s.textContent = tag; c.appendChild(s); }
        c.classList.add('show'); },
    };
  };
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
})();`;

// ───────────────────────── 실행 도우미 ─────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, Math.max(0, Math.round(ms * SPEED))));
let page;
const log = [];
const fails = [];
function loc(sel) {
  if (typeof sel !== 'string') return sel;
  return page.locator(sel).first();
}
async function center(sel) {
  const l = loc(sel);
  await l.waitFor({ state: 'visible', timeout: 6000 });
  await l.scrollIntoViewIfNeeded();
  await sleep(120);
  let b = await l.boundingBox();
  if (!b) throw new Error('boundingBox 없음: ' + sel);
  if (b.y + b.height / 2 > H - 110 || b.y < 70) {   // 자막 띠(아래 110px)·머리글 아래로 들어오면 화면 가운데로 옮긴다
    await page.evaluate((dy) => window.scrollBy({ top: dy }), b.y + b.height / 2 - H / 2);
    await sleep(250);
    b = await l.boundingBox();
  }
  return { x: b.x + b.width / 2, y: b.y + b.height / 2, l, b };
}
async function moveTo(x, y) {
  await page.evaluate(([x, y]) => window.__dv && window.__dv.cur(x, y), [x, y]);
  await page.mouse.move(x, y, { steps: 6 });
  await sleep(380);
}
async function click(sel, { pause = 700 } = {}) {
  const { x, y } = await center(sel);
  await moveTo(x, y);
  await page.evaluate(([x, y]) => window.__dv && window.__dv.rip(x, y), [x, y]);
  await page.mouse.click(x, y);
  await sleep(pause);
}
async function hover(sel, { pause = 900 } = {}) {
  const { x, y } = await center(sel);
  await moveTo(x, y);
  await sleep(pause);
}
async function select(sel, value, { pause = 800 } = {}) {
  const { x, y, l } = await center(sel);
  await moveTo(x, y);
  await page.evaluate(([x, y]) => window.__dv && window.__dv.rip(x, y), [x, y]);
  await l.selectOption(value);
  await sleep(pause);
}
async function range(sel, to, { pause = 500, steps = 8 } = {}) {   // React 호환: 네이티브 setter + input/change 이벤트, 값은 단계적으로 움직여 보이게
  const { x, y, l, b } = await center(sel);
  await moveTo(x, y);
  const from = Number(await l.evaluate((e) => e.value));
  const min = Number(await l.evaluate((e) => e.min || 0)), max = Number(await l.evaluate((e) => e.max || 100));
  for (let i = 1; i <= steps; i++) {
    const v = Math.round(from + (to - from) * (i / steps));
    await l.evaluate((e, v) => { const s = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; s.call(e, v); e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); }, v);
    const px = b.x + ((v - min) / (max - min)) * b.width;
    await page.evaluate(([x, y]) => window.__dv && window.__dv.cur(x, y), [px, y]);
    await sleep(70);
  }
  await sleep(pause);
}
async function type(sel, text, { pause = 600, clear = true } = {}) {
  await click(sel, { pause: 200 });
  if (clear) await page.keyboard.press('Control+A');
  await page.keyboard.type(text, { delay: Math.round(55 * SPEED) });
  await sleep(pause);
}
async function key(k, { pause = 600 } = {}) { await page.keyboard.press(k); await sleep(pause); }
async function scrollTo(sel, { pause = 800, offset = 90 } = {}) {   // 요소가 화면 위쪽(offset px)에 오도록 부드럽게
  const l = loc(sel);
  await l.waitFor({ state: 'attached', timeout: 6000 });
  await l.evaluate((e, off) => { const y = e.getBoundingClientRect().top + window.scrollY - off; window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' }); }, offset);
  await sleep(pause);
}
async function scrollBy(dy, { pause = 800 } = {}) { await page.evaluate((dy) => window.scrollBy({ top: dy, behavior: 'smooth' }), dy); await sleep(pause); }
async function cap(t, sub) { await page.evaluate(([t, s]) => window.__dv && window.__dv.cap(t, s), [t, sub || '']); }
async function chip(t) { await page.evaluate((t) => window.__dv && window.__dv.chip(t), t); }
async function card(h, lines, tag) { await page.evaluate(([h, l, t]) => window.__dv && window.__dv.card(h, l, t), [h, lines || [], tag || '']); }
async function go(hash, { pause = 1400 } = {}) {   // 앱이 hashchange 를 처리한다
  await page.evaluate((h) => { location.hash = h; }, hash);
  await sleep(pause);
  await page.evaluate(() => window.scrollTo({ top: 0 }));
  await sleep(150);
}
// ───────────────────────── 장면 목록 ─────────────────────────
// 각 장면: { id, hl(하이라이트판 포함), cap[제목, 부제], run, hold(장면 끝 정지 초) }
// 피함: 🖨 인쇄 · 🎬 영상 저장 · ↓SVG/PNG/CSV 내려받기 · mailto · GitHub 이슈 · 원문 문서(새 탭)
const SCENES = [];
const S = (id, hl, capt, run, hold = 1.2) => SCENES.push({ id, hl, cap: capt, run, hold });
const ANAL = 'view=analysis&ind=DT_H_OBE_OBE&sido=009&sgg=00901&year=2025';   // 강원 강릉시 · 비만율 2025
const PROF = 'view=profile&sido=009&sgg=00901';
const RK = '.card:has(.rank) ';          // 지표 분석 순위 카드
const TAB = (t) => `.seg.views .seg-btn:has-text("${t}")`;
const CTL = '.controls .ctrl ';

// ── 0. 타이틀 ──
S('title', true, null, async () => {
  await go('view=home', { pause: 1600 });
  await card('지역 건강프로파일 대시보드', ['health-profile.kr', '시군구·보건소 258곳의 건강수준을 공표 통계로 한 화면에', '모든 메뉴와 숨은 옵션을 직접 눌러 보여 드립니다'], MODE === 'hl' ? '하이라이트' : '전체 시연');
  await sleep(3200);
  await card(null);
}, 0.3);

// ── 1. 홈 ──
S('home', false, ['홈 — 카드 5장', '17개 시도 지도 · 258개 보건소 순위 · 취약인구 · 지자체 계획 수립 · 처음이세요?(소개 영상·설명서)'], async () => {
  await sleep(1200);
  await hover('.home .hc-map', { pause: 700 });
  await hover('.hc-help .help-links', { pause: 900 }).catch(() => {});
}, 0.8);
S('home-chip', true, ['지도 위 지표 칩을 바꾸면 17개 시도 색과 순위가 함께 바뀝니다', '흡연 → 비만 → 걷기'], async () => {
  for (const t of ['비만', '걷기', '고위험음주', '흡연']) await click(`.home-ind .seg-btn:has-text("${t}")`, { pause: 1000 });
}, 0.6);
S('home-find', true, ['우리 보건소 찾기 — 「강릉」을 치면 258곳 순위 속 우리 위치가 보입니다', '상위 10곳만 공개 · 꼴찌는 공개하지 않습니다'], async () => {
  await scrollTo('.hc-find input', { offset: 200 });
  await type('.hc-find input', '강릉', { pause: 1600 });
}, 1);
S('home-plan', false, ['지자체 계획 수립 카드 — 제9기 지역보건의료계획(2027~2030) 4단계가 메뉴로 이어집니다', '현황 분석 → 우선순위 → 목표치 → 사업 선정'], async () => {
  await scrollTo('.hc-steps', { offset: 220 });
  for (let i = 1; i <= 4; i++) await hover(`.hc-steps li:nth-child(${i}) button`, { pause: 650 });
}, 0.8);

// ── 2. 검색 ──
S('search', true, ['검색 — 「/」 를 누르고 이름만 치면 어느 메뉴에 있든 바로 갑니다', '메뉴 · 카드 · 지표 171개 · 지역 · 자료원 · FAQ · 지식베이스 · 문서'], async () => {
  await go('view=home', { pause: 900 });
  await click('.srch-btn', { pause: 600 });
  await page.keyboard.type('건강수명', { delay: Math.round(90 * SPEED) });
  await sleep(1700);
  await key('ArrowDown', { pause: 500 }); await key('Enter', { pause: 2000 });
}, 1.2);

// ── 3. 지표 분석 ──
S('an-overview', true, ['지표 분석 — 현황 · 추이 · 지도 · 순위 · 연도표 · 격차 · 형평성 · 근거를 한 화면에', '강원 강릉시 · 비만율 2025 · 전국 258곳 조사 단위 기준'], async () => {
  await go(ANAL);
  await sleep(700);
  for (let i = 0; i < 4; i++) await scrollBy(560, { pause: 850 });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' })); await sleep(900);
}, 0.5);
S('an-pick', false, ['지표 선택 — 171개 지표를 영역 칩으로 고르거나 이름으로 검색합니다'], async () => {
  await click('.pick-btn', { pause: 900 });
  await click('.pick-panel .chips .chip:has-text("정신건강")', { pause: 1100 });
  await click('.pick-panel .chips .chip:has-text("식생활")', { pause: 900 }).catch(() => {});
  await type('.pick-panel input.pick-search', '고위험음주', { pause: 900 });
  await click('.pick-item:has-text("고위험음주")', { pause: 1400 });
}, 0.8);
S('an-region', false, ['지역 선택 — 시도 → 시군구 (보건소가 여럿인 시는 보건소 단위까지)', '서울 강남구 ↔ 강원 강릉시'], async () => {
  await select('#selSido', '001', { pause: 900 });
  await select('#selSgg', { label: '강남구' }, { pause: 1400 });
  await select('#selSido', '009', { pause: 800 });
  await select('#selSgg', { label: '강릉시' }, { pause: 1300 });
}, 0.6);
S('an-std', false, ['조율 ↔ 표준화율 — 연령 구조를 보정한 값으로 지역을 비교합니다', '비교 범위: 전국 ↔ 소속 시도'], async () => {
  await go(ANAL, { pause: 1000 });
  await click(CTL + '.seg .seg-btn:has-text("조율")', { pause: 1100 });
  await click(CTL + '.seg .seg-btn:has-text("표준화율")', { pause: 1000 });
  await select('.scope-sel', 'sido:009', { pause: 1200 });
  await select('.scope-sel', 'nation', { pause: 1000 });
}, 0.5);
S('an-year', true, ['연도 — 슬라이더를 끌거나 ▶ 로 2008년부터 재생하면 지도·순위·게이지가 같이 움직입니다'], async () => {
  await range('#selYear', 6, { pause: 800 });
  await click('.playbtn', { pause: 6000 });
  await click('.pb-stop', { pause: 400 }).catch(() => {});
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' })); await sleep(500);
  const max = Number(await page.locator('#selYear').evaluate((e) => e.max));
  await range('#selYear', max, { pause: 600 });
}, 0.4);
S('an-map', true, ['비교 범위 — 드롭다운 하나로 지도·순위·격차·연도표가 함께 바뀝니다', '전국 17개 시도 / 전국 시군구(조사 단위 258곳) / 시도 내 시군구(17개 시도 중 선택) · 🏷 지역명'], async () => {
  await scrollTo('.mapcard', { offset: 80 });
  await select('.scope-sel', 'sidoAll', { pause: 1400 });
  await select('.scope-sel', 'nation', { pause: 1400 });
  await select('.scope-sel', 'sido:001', { pause: 1400 });
  await select('.scope-sel', 'sido:009', { pause: 1200 });
  await click('.map-seg .seg-btn:has-text("🏷")', { pause: 1100 });
  await click('.map-seg .seg-btn:has-text("🏷")', { pause: 900 });
  await hover('.mapcard path.poly.sel', { pause: 1000 }).catch(() => {});
  await hover('.mapcard path.poly:nth-of-type(6)', { pause: 1000 }).catch(() => {});
}, 0.5);
S('an-rank', true, ['순위 — 비교 범위를 따르는 집단(시도 내 시군구) · 양호/나쁜 순 · ⟺ 신뢰구간 · 불안정값 제외 · ⑩ 묶음', '신뢰구간이 겹치는 지역은 흐리게 = 차이가 불확실'], async () => {
  await scrollTo(RK, { offset: 70 });
  await click(RK + '.seg-btn:has-text("양호한 순"), ' + RK + '.seg-btn:has-text("나쁜 순")', { pause: 1200 });
  await click(RK + '.seg-btn:has-text("양호한 순"), ' + RK + '.seg-btn:has-text("나쁜 순")', { pause: 800 });
  await click(RK + '.ci-bar .seg-btn:has-text("신뢰구간")', { pause: 1200 });
  await click(RK + '.ci-bar .seg-btn:has-text("신뢰구간")', { pause: 900 });
  await click(RK + '.ci-bar .seg-btn:has-text("불안정값")', { pause: 1200 });
  await click(RK + '.ci-bar .seg-btn:has-text("불안정값")', { pause: 800 });
  await click(RK + '.seg-btn:has-text("⑩")', { pause: 1600 });
  await click(RK + '.seg-btn:has-text("⑩")', { pause: 600 });
}, 0.5);
S('an-rankall', true, ['⛶ 전체 보기 — 258곳을 막대 하나씩 한 화면에, ▶ 로 2008년부터 자리가 바뀌는 애니메이션', '크게 · 속도 · 연도 칩 · 인쇄 · 영상 저장(mp4)'], async () => {
  await click(RK + '.seg-btn:has-text("⛶")', { pause: 1400 });
  await click('.rall .ra-actions .ra-btn:has-text("재생")', { pause: 7000 });
  await click('.rall .ra-actions .ra-btn:has-text("정지")', { pause: 500 }).catch(() => {});
  await click('.rall .ra-actions .ra-btn:has-text("크게")', { pause: 1100 });
  await click('.rall .ra-bar .ra-y:has-text("20")', { pause: 1100 });
  await click('.rall .ra-bar .ra-step[aria-label="다음 연도"]', { pause: 900 });
  await select('.rall select.ra-sel:not(.sm)', '600', { pause: 700 });
  await hover('.rall .ra-dl', { pause: 900 }).catch(() => {});
  await click('.rall .ra-actions .ra-btn:has-text("닫기")', { pause: 800 });
}, 0.4);
S('an-yeartable', false, ['연도별 추이표 — 수치 · 순위 · 증감, 행을 누르면 그 연도로'], async () => {
  const YT = '.card:has(h3:has-text("연도별 추이표")) table.yeartbl tbody tr';
  await scrollTo('.card:has(h3:has-text("연도별 추이표"))', { offset: 70 });
  await click(YT + ':nth-child(3)', { pause: 1300 });
  await click(YT + ':last-child', { pause: 1100 });   // 마지막 행 = 최신 연도로 되돌린다
}, 0.5);
S('an-gap', false, ['격차 — 상자그림으로 분포와 최대·최소 지역, 우리 위치'], async () => {
  await scrollTo('.card:has(h3:has-text("격차"))', { offset: 70 });
  await hover('.card:has(h3:has-text("격차")) svg', { pause: 1200 });
}, 0.6);
S('an-equity', false, ['건강형평성 — 지역박탈지수 5분위별 분포, 「산출 예시」를 펼치면 우리 지역 숫자로 산식을 검산'], async () => {
  await go(ANAL, { pause: 1000 });
  await scrollTo('.card:has(h3:has-text("건강형평성"))', { offset: 70 });
  await sleep(800);
  await click('.card:has(h3:has-text("건강형평성")) details.calc > summary', { pause: 1500 });
  await scrollBy(300, { pause: 1000 });
}, 0.6);
S('an-evidence', false, ['근거 지침 — NICE 권고문 예시 · CPSTF 권고(원문 링크) · 계층 배지', '「CPSTF 권고 N건 보기」를 펼치면 Community Guide 판정·연도·원문'], async () => {
  await scrollTo('.card.evpanel', { offset: 70 });
  await click('.evpanel .evguide .xbtn', { pause: 1400 });
  await click('.evpanel .evcp .xbtn', { pause: 1500 });
  await scrollBy(320, { pause: 900 });
  await hover('.evpanel a.evtext', { pause: 800 }).catch(() => {});
}, 0.5);
S('an-cite', false, ['참고문헌 번호 — 숫자 옆 [n]을 누르면 원 통계표 · 기관 · 갱신일 · 원문 링크'], async () => {
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' })); await sleep(800);
  await click('.cite-btn', { pause: 1800 });
  await hover('.cite-pop .linkbtn', { pause: 700 }).catch(() => {});
  await click('.cite-btn', { pause: 500 });
}, 0.5);
S('an-theme', false, ['다크 모드 · 글자 크기 — 다크에서도 지도 라벨은 구역 밝기에 맞춰 보입니다'], async () => {
  await click('header .themebtn:has-text("다크")', { pause: 1200 });
  await scrollTo('.mapcard', { offset: 80 }); await sleep(1200);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' })); await sleep(600);
  await click('header .themebtn:has-text("라이트")', { pause: 900 });
  await click('header .themebtn[title="글자 크게"]', { pause: 700 });
  await click('header .themebtn[title="글자 크게"]', { pause: 1000 });
  await click('header .themebtn[title="글자 작게"]', { pause: 500 });
  await click('header .themebtn[title="글자 작게"]', { pause: 500 });
}, 0.4);

// ── 4. 지역 프로파일 ──
S('pf-overview', true, ['지역 프로파일 — 종합 양호도 · 등급 배지 · 영역별 순위 · 강점 TOP 5 · 개선 TOP 5', '강릉시 · 기본값 = 표준화율 · 균등 가중 · 3년 평균 · 도시/군 리그'], async () => {
  await go(PROF);
  await sleep(1200);
  await scrollBy(500, { pause: 1000 });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' })); await sleep(700);
}, 0.5);
S('pf-weights', true, ['순위 산출 방식 ① 가중치 — 균등 → 모의 패널(AI 시뮬레이션, 검증용) → 직접 조정', '직접 조정을 누르면 영역 9개 슬라이더가 나타나고 순위·등급이 바로 바뀝니다'], async () => {
  await scrollTo('.card.rankset', { offset: 70 });
  await click('.rankset .seg-btn:has-text("모의 패널")', { pause: 1600 });
  await click('.rankset .seg-btn:has-text("직접 조정")', { pause: 1500 });
  await range('.sliders label.slider:has(span:text-is("흡연")) input', 30, { pause: 900 });
  await range('.sliders label.slider:has(span:text-is("만성질환")) input', 0, { pause: 900 });
  await range('.sliders label.slider:has(span:text-is("정신건강")) input', 25, { pause: 900 });
  await hover('.sliders .desc', { pause: 800 });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' })); await sleep(1500);
  await scrollTo('.card.rankset', { offset: 70 });
  await click('.rankset .seg-btn:text-is("균등")', { pause: 1200 });
}, 0.5);
S('pf-smooth', true, ['순위 산출 방식 ② 평활 — 3년 평균 ↔ 단년도', '③ 리그 — 도시/군 ↔ 통합(229곳 한 줄)'], async () => {
  await click('.rankset .seg-btn:has-text("단년도")', { pause: 1500 });
  await click('.rankset .seg-btn:has-text("3년 평균")', { pause: 1100 });
  await click('.rankset .seg-btn:text-is("통합")', { pause: 1500 });
  await click('.rankset .seg-btn:has-text("도시 / 군")', { pause: 1100 });
}, 0.4);
S('pf-exclude', true, ['순위 산출 방식 ④ 결과지표 4개 — 제외(기본) ↔ 포함', '사망률·유병률 같은 결과·임팩트 지표는 보건소 활동에 귀인할 수 없어 기본으로 뺍니다'], async () => {
  await click('.rankset .seg-btn:text-is("포함")', { pause: 1600 });
  await click('.rankset .seg-btn:text-is("제외")', { pause: 1000 });
  await hover('.rankset .hint', { pause: 900 }).catch(() => {});
}, 0.4);
S('pf-badges', false, ['영역 칩 · 강점 TOP 5 · 개선 TOP 5 — 누르면 그 지표의 분석 화면으로'], async () => {
  await scrollTo('.indchips', { offset: 90 });
  await hover('.indchips .indchip:nth-child(3)', { pause: 900 });
  await scrollTo('.badges', { offset: 90 });
  await hover('.badges .badge-card:nth-child(1)', { pause: 1000 });
}, 0.5);
S('pf-hle', false, ['기대수명·건강수명 — 시군구 생명표(근사) · 「산출 예시」로 ①~⑥ 단계 검산'], async () => {
  await scrollTo('.card.hle', { offset: 70 });
  await sleep(700);
  await click('.card.hle details.calc > summary', { pause: 1500 });
  await scrollBy(340, { pause: 1100 });
}, 0.5);
S('pf-gd', false, ['황금다이아몬드 — 시간축(기준연도 대비) × 공간축(시도/전국 대비) 3×3', '비교 대상 · 여유 ±% · 기간 프리셋 · 연도 칩을 바꿔 봅니다'], async () => {
  await scrollTo('.card.gd', { offset: 70 });
  await select('.gd .ctrls label.subchip:has-text("비교") select', 'nation', { pause: 1200 });
  await select('.gd .ctrls label.subchip:has-text("여유") select', '10', { pause: 1200 });
  await click('.gd .ctrls .themebtn:has-text("전년 대비")', { pause: 1300 });
  await click('.gd .ctrls .themebtn:has-text("최근 3년")', { pause: 1200 });
  await click('.gd-years .gd-yrow:nth-child(2) .ychip:nth-child(2)', { pause: 1200 }).catch(() => {});
}, 0.5);
S('pf-peer', false, ['동류군 비교 — 고령화율·재정자립도·인구밀도·박탈분위가 비슷한 12곳과 비교', '지표를 바꾸거나 행을 누르면 그 지역 프로파일로'], async () => {
  await scrollTo('.card.peer', { offset: 70 });
  await select('.peer select', 'DT_H_OBE_OBE', { pause: 1300 });
  await click('.peer table.yeartbl tbody tr:nth-child(2)', { pause: 1800 });
  await go(PROF, { pause: 900 });
}, 0.3);
S('pf-risk', false, ['감염병 고위험군 — 30개 집단(실측/추정) · 분류 탭 · 「산출 방법」 · 코로나19 실적 참고'], async () => {
  await scrollTo('.card.risk', { offset: 70 });
  await click('.risk .seg .seg-btn:has-text("기저질환")', { pause: 1200 });
  await click('.risk .seg .seg-btn:has-text("감염취약시설")', { pause: 1100 });
  await click('.risk .seg .seg-btn:text-is("전체")', { pause: 800 });
  await click('.risk details.method > summary', { pause: 1300 });
  await scrollBy(380, { pause: 900 });
}, 0.5);
S('pf-prio', false, ['우선순위 카드 — 하위 25/30/40% 기준을 바꾸면 개선 대상이 바뀝니다 · 근거 공백 보기'], async () => {
  await scrollTo('.card.prio', { offset: 70 });
  await select('.prio .cutsel select', '40', { pause: 1300 });
  await select('.prio .cutsel select', '25', { pause: 1200 });
  await select('.prio .cutsel select', '30', { pause: 800 });
  await click('.prio details.evgaps > summary', { pause: 1300 });
}, 0.5);
S('pf-rec', false, ['권고 예방·관리 사업 — 하위 지표에 시도 → 국가 → WPRO → WHO 순 권고 · 개선 과제 「펼쳐 보기」'], async () => {
  await scrollTo('.rec', { offset: 70 });
  await hover('.rec .rechead .xbtn', { pause: 900 });
  await click('.profile .themebtn:has-text("펼쳐 보기")', { pause: 1400 });
  await scrollBy(300, { pause: 900 });
}, 0.4);
S('pf-table', false, ['전체 지표 표 — 값 · 백분위 · 순위 · 계층, 행을 누르면 분석 화면으로'], async () => {
  await scrollTo('table.proftbl', { offset: 70 });
  await hover('table.proftbl tbody tr:nth-child(2)', { pause: 800 });
  await scrollBy(400, { pause: 900 });
}, 0.4);

// ── 5. 성과지표 ──
S('kpi', true, ['성과지표 — 통합건강증진사업 핵심성과지표 16개 중 보유 13개', '행을 펼치면 목표치 설정법 5종 · 계산기에 목표치를 넣으면 달성률·득점'], async () => {
  await go('view=kpi&sido=009&sgg=00901');
  await sleep(800);
  await click('table.kpitbl tbody tr:not(.kpi-miss)', { pause: 1400 });
  await scrollTo('.kpi-calc', { offset: 160 });
  await type('.kpi-calc input[type=number]', '30', { pause: 1600 });
  await scrollTo('tr.kpi-miss', { offset: 200 });
  await click('tr.kpi-miss details.miss-d > summary', { pause: 1500 });
}, 0.5);

// ── 6. 지역 비교 ──
S('cmp', true, ['지역 비교 — 분석 화면의 「+ 비교에 추가」로 담고(최대 6곳), 추이 · 막대 · 연도표 · 전 지표 비교표', '전국 중앙값 · 시도 · 시군구를 섞어 비교'], async () => {
  await go(ANAL, { pause: 1000 });
  await click(CTL + '.themebtn:has-text("비교에 추가")', { pause: 1000 });
  await click(TAB('지역 비교'), { pause: 1400 });
  await select('.cmpadd select:nth-of-type(1)', '001', { pause: 700 });
  await select('.cmpadd select:nth-of-type(2)', { label: '강남구' }, { pause: 700 });
  await click('.cmpadd .themebtn:has-text("+ 추가")', { pause: 1400 });
  await scrollBy(520, { pause: 1000 });
  await scrollTo('table.cmptbl', { offset: 80 });
  await click('table.cmptbl tbody tr:nth-child(3)', { pause: 1400 });
}, 0.5);

// ── 7. 예방·관리 ──
S('ncd', true, ['예방·관리 — WHO · WPRO · 국가 · 시도 계획 182개 항목, 영역별 묶음 · 목차 칩 · 검색', '「원문 열기 ↗」는 출처 원문을 새 창에서 엽니다'], async () => {
  await go('view=ncd&sido=009&sgg=00901');
  await sleep(800);
  await click('.ncd .setitem:first-child .seg-btn:has-text("국가")', { pause: 1300 });
  await click('.ncdtoc .chip:has-text("음주")', { pause: 1300 }).catch(() => {});
  await click('.ncd .card:first-child .chips .chip:has-text("음주")', { pause: 1200 });
  await click('.ncd .card:first-child .chips .chip:has-text("모든 영역")', { pause: 900 });
  await type('.ncd input.pick-search', '금연', { pause: 1300 });
  await hover('.ncdcard a.srclink', { pause: 1200 });
  await type('.ncd input.pick-search', '', { pause: 500 });
  await page.keyboard.press('Backspace');
  await click('.ncd h3 .themebtn:has-text("펼치기")', { pause: 1300 });
}, 0.4);

// ── 8. 연관지표 · 핫스팟 · 연대기 · 조사 단위 · 자료원 ──
S('corr', false, ['연관지표 — 두 지표의 산점도 · 피어슨/스피어만/켄달 · 연도별 상관, ▶ 로 연도 재생', '단위를 17개 시도로 바꾸면 집단이 달라집니다'], async () => {
  await go('view=corr');
  await sleep(800);
  await select('.corr .ctrls label.subchip:has-text("Y") select', 'DT_H_OBE_OBE', { pause: 1400 });
  await select('.corr .ctrls label.subchip:has-text("단위") select', 'sido', { pause: 1300 });
  await select('.corr .ctrls label.subchip:has-text("단위") select', 'sgg', { pause: 900 });
  await click('.corr .ctrls .seg-btn:has-text("▶")', { pause: 5000 });
  await click('.corr .ctrls .seg-btn:has-text("■")', { pause: 500 }).catch(() => {});
  await scrollBy(500, { pause: 1000 });
}, 0.4);
S('hot', false, ['핫스팟 — Getis-Ord Gi* 공간 군집(90/95/99%) ↔ Mann-Kendall 시간 추세', '지도의 구역을 누르면 그 지역 분석으로'], async () => {
  await go('view=hot');
  await sleep(1200);
  await hover('.hot .mapwrap path.poly:nth-of-type(80)', { pause: 1000 }).catch(() => {});
  await click('.hot .ctrls .seg .seg-btn:has-text("시간 추세")', { pause: 2000 });
  await click('.hot .ctrls .seg .seg-btn:has-text("공간 군집")', { pause: 1300 });
  await select('.hot .ctrls label.subchip:has-text("지표") select', 'DT_H_OBE_OBE', { pause: 1600 });
}, 0.4);
S('chron', false, ['연대기 전시관 — 3D 복도에서 연도별 사건 · 10대 뉴스 · 주제 칩 · ▶ 자동 관람'], async () => {
  await go('view=chronicle');
  await sleep(1200);
  await click('.m-topics .m-tchip:has-text("흡연")', { pause: 1200 });
  await click('.hall-nav.next', { pause: 1000 });
  await click('.hall-nav.next', { pause: 1000 });
  await click('.m-topics .m-tchip:has-text("흡연")', { pause: 600 });
  await click('.m-play', { pause: 5500 });
  await click('.m-play', { pause: 500 });
  await scrollBy(600, { pause: 1100 });
}, 0.4);
S('units', false, ['조사 단위 — 258개 보건소 단위 ↔ 시군구 코드 · 지도 · 기관 목록(3,607곳)'], async () => {
  await go('view=units');
  await sleep(800);
  await type('.units input.pick-search', '강릉', { pause: 1200 });
  await click('.unitlist tbody tr', { pause: 1200 });
  await scrollTo('.unitmap', { offset: 70 });
  await click('.unitmap path.poly:nth-of-type(120)', { pause: 1300 });
  await click('details.faclist > summary', { pause: 1300 }).catch(() => {});
}, 0.4);
S('sources', false, ['자료원 — 출처 기관 10종 카드(갱신 주기 · 다음 공표 · 표ID · 한계) + 258곳 보유 매트릭스', '건강수명·박탈지수는 「근사·공식 아님」 배지와 「한계 4가지」'], async () => {
  await go('view=sources');
  await sleep(800);
  await scrollTo('.srccard:has(details.sc-lim)', { offset: 70 });
  await click('.srccard details.sc-lim > summary', { pause: 1500 });
  await scrollTo('.srcview .seg-btn:has-text("결측")', { offset: 120 });
  await click('.srcview .seg-btn:has-text("결측")', { pause: 1400 });
  await click('.srcview .seg-btn:text-is("전체")', { pause: 700 });
  await type('.srcview input.pick-search', '강릉', { pause: 1200 });
}, 0.4);

// ── 9. 의견·문의 · 공유 ──
S('feedback', false, ['의견·문의 — 서버 없이 이메일 앱 · 내용 복사 · GitHub 이슈로 보냅니다 (화면 링크 자동 첨부)', '사용설명서 68쪽 · 활용법 100쪽 · 소개 영상 · 방법론 문서 14건도 여기서'], async () => {
  await go('view=feedback');
  await sleep(700);
  await select('.fb-form select', { label: '수정 의견(이렇게 바꿔 주세요)' }, { pause: 900 });
  await type('.fb-msg textarea', '강릉시 비만율 순위 카드에 보건소 이름을 함께 보여 주세요.', { pause: 700 });
  await type('.fb-two input >> nth=0', '○○보건소 건강증진팀', { pause: 700 });
  await click('details.fb-preview > summary', { pause: 1500 });
  await scrollTo('details.method-docs', { offset: 300 });
  await hover('.feedback a:has-text("파워포인트 내려받기") >> nth=1', { pause: 900 }).catch(() => {});
  await click('details.method-docs summary', { pause: 1500 });
  await scrollBy(300, { pause: 800 });
}, 0.5);
S('share', true, ['공유 — 주소창의 해시가 곧 화면 상태입니다. 링크를 복사해 보내면 같은 지표·지역·연도·설정이 열립니다', 'health-profile.kr/#view=analysis&ind=…&sido=009&sgg=00901&year=2025'], async () => {
  await go(ANAL, { pause: 1200 });
  await hover('.title-home', { pause: 1200 });
}, 1.6);

// ───────────────────────── 실행 ─────────────────────────
async function run(mode) {
  const scenes = mode === 'hl' ? SCENES.filter((s) => s.hl) : SCENES;
  const br = await chromium.launch({ executablePath: CHROMIUM });
  const ctx = await br.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, locale: 'ko-KR', ...(DRY || mode === 'fonttest' ? {} : { recordVideo: { dir: path.join(OUT, 'raw_' + mode), size: { width: W, height: H } } }) });
  await ctx.addInitScript(OVERLAY_INIT);
  page = await ctx.newPage();
  page.on('dialog', (d) => d.dismiss().catch(() => {}));
  const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(BASE + '#view=home', { waitUntil: 'load' });
  await sleep(1500);
  if (mode === 'fonttest') {
    await cap('한글 자막 테스트 — 순위 산출 방식 · 모의 패널 · ⟺ 신뢰구간 · ⑩ 묶음 · ⛶ 전체 보기 · 🏷 지역명 · ▶ 재생 · ↗ 원문', '부제: 강릉시 비만율 35.4% (258곳 중 193위) · ±1.9%p');
    await chip('3 / 44 · 지표 분석');
    await page.evaluate(() => window.__dv.cur(400, 300));
    await sleep(500);
    await page.screenshot({ path: path.join(OUT, 'fonttest.png') });
    await card('지역 건강프로파일 대시보드', ['health-profile.kr', '시군구·보건소 258곳의 건강수준을 공표 통계로 한 화면에'], '전체 시연 · 약 8분');
    await sleep(300);
    await page.screenshot({ path: path.join(OUT, 'fonttest_card.png') });
    await br.close();
    return;
  }
  const t0 = Date.now();
  const edl = [];
  for (let i = 0; i < scenes.length; i++) {
    const s = scenes[i];
    const start = (Date.now() - t0) / 1000;
    try {
      if (s.cap) { await cap(s.cap[0], s.cap[1]); await chip(`${i + 1} / ${scenes.length}`); }
      await s.run();
      await sleep(s.hold * 1000);
      log.push(`OK  ${s.id}`);
    } catch (e) {
      fails.push(`${s.id}: ${String(e.message).split('\n')[0].slice(0, 160)}`);
      log.push(`✗   ${s.id}: ${String(e.message).split('\n')[0].slice(0, 160)}`);
      if (!DRY) await sleep(400);
    }
    edl.push({ id: s.id, start: +start.toFixed(2), end: +(((Date.now() - t0) / 1000)).toFixed(2), cap: s.cap && s.cap[0] });
    if (DRY) process.stdout.write(log[log.length - 1] + '\n');
  }
  await cap(null); await chip(null);
  if (!DRY) {
    await card('health-profile.kr', ['지역 건강프로파일 대시보드 · 사용설명서 68쪽 · 활용법 100쪽은 「의견·문의」 탭에서', 'khealth.profile@gmail.com'], '감사합니다');
    await sleep(3000);
  }
  const video = DRY ? null : await page.video();
  await ctx.close();
  await br.close();
  fs.writeFileSync(path.join(OUT, `edl_${mode}.json`), JSON.stringify(edl, null, 1));
  if (errs.length) console.log('page errors:', errs.slice(0, 5).join(' | '));
  if (video) {
    const webm = await video.path();
    const mp4 = path.join(OUT, `${mode}.mp4`);
    execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-i', webm, '-vf', `fps=25,scale=${W}:${H},format=yuv420p`, '-c:v', 'libx264', '-preset', 'slow', '-crf', '23', '-profile:v', 'high', '-movflags', '+faststart', '-an', mp4], { stdio: 'inherit' });
    const mb = fs.statSync(mp4).size / 1e6;
    if (mb > 60) execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-i', webm, '-vf', `fps=25,scale=${W}:${H},format=yuv420p`, '-c:v', 'libx264', '-preset', 'slow', '-b:v', '850k', '-maxrate', '1200k', '-bufsize', '2400k', '-profile:v', 'high', '-movflags', '+faststart', '-an', mp4], { stdio: 'inherit' });
    console.log(`${mode}: ${mp4} ${(fs.statSync(mp4).size / 1e6).toFixed(1)}MB · ${edl[edl.length - 1].end}s · 장면 ${scenes.length}`);
  }
  console.log(`scenes ${scenes.length} · fails ${fails.length}`);
  if (fails.length) console.log(fails.map((f) => '  ✗ ' + f).join('\n'));
}

if (MODE === 'both') { await run('full'); fails.length = 0; await run('hl'); }
else await run(MODE === 'dry' ? 'full' : MODE);
