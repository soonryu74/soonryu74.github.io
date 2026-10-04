// 사용설명서용 화면 캡처 — 모든 메뉴의 카드를 개별 PNG 로 저장하고 manifest.json 에 목록을 남긴다
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const OUT = '/tmp/claude-0/-home-user-soonryu74-github-io/e16f7b4f-1860-59c2-9e17-e9d4583aa91f/scratchpad/manual/shots';
fs.mkdirSync(OUT, { recursive: true });
const BASE = 'http://127.0.0.1:8911/index.html';
const safe = (s) => s.replace(/[^\w가-힣]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40);
const manifest = [];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1.5, colorScheme: 'light' });
const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
const go = async (hash, ms = 2000) => { await p.goto(BASE + hash); await p.waitForTimeout(ms); };
const shot = async (name, loc, note = '') => {
  try {
    const el = typeof loc === 'string' ? p.locator(loc).first() : loc;
    await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(250);
    const box = await el.boundingBox(); if (!box || box.height < 40) return;
    const f = `${OUT}/${name}.png`; await el.screenshot({ path: f });
    manifest.push({ name, file: f, w: Math.round(box.width), h: Math.round(box.height), note }); console.log('✓', name, Math.round(box.width) + 'x' + Math.round(box.height));
  } catch (e) { console.log('✗', name, e.message.slice(0, 80)); }
};
// Health Equity Radar 로 새로 생긴 카드(우선 검토·홈 빠르게 보기·형평성 요약 비교)는 번호 매기기에서 빼고 따로 찍는다
// → 기존 카드 번호(C_profile_07 등, 설명서·활용법이 이 번호로 그림을 찾음)가 밀리지 않게 한다.
const NEW_CARD = (el) => el.matches('.eq-card, .hc-eq') || /^(형평성 요약 비교|10년 추세|시군구 우수사례|질병관리청 지역사회건강조사 발간물)/.test(el.querySelector('h3')?.textContent?.trim() || '');   // 2026-10-02~03 에 생긴 카드
const cards = async (prefix) => {
  const n = await p.locator('.card').count();
  let skipped = 0;
  for (let i = 0; i < n; i++) {
    const c = p.locator('.card').nth(i);
    if (await c.evaluate(NEW_CARD)) { skipped++; continue; }
    if (!(await c.isVisible())) continue;
    const box = await c.boundingBox(); if (!box || box.height < 80 || box.width < 200) continue;
    const t = (await c.locator('h3').first().innerText().catch(() => '')).split('\n')[0].trim();
    await shot(`${prefix}_${String(i - skipped).padStart(2, '0')}_${safe(t || 'card')}`, c, t);
  }
};
const clickBtn = async (scopeSel, text) => { await p.evaluate(({ scopeSel, text }) => { const root = scopeSel ? document.querySelector(scopeSel) : document; const b = [...root.querySelectorAll('button')].find((x) => x.textContent.trim().includes(text)); b && b.click(); }, { scopeSel, text }); await p.waitForTimeout(500); };
const cardBy = (t) => p.locator('.card', { has: p.locator('h3', { hasText: t }) }).first();

// ── 지표 분석 (비만율 · 서울 강남구) ──
// 홈(메인 화면) — 카드 6장 격자 전체와 카드별
await go('#view=home&sido=009&sgg=00901', 2500);
await shot('A0_home_grid', '.home-grid', '홈: 카드 6장');
await cards('A0_home');
await go('#ind=DT_H_OBE_OBE&sido=001&sgg=00101&year=2025&scope=nation');
await p.screenshot({ path: `${OUT}/A_home_top.png` }); manifest.push({ name: 'A_home_top', file: `${OUT}/A_home_top.png`, note: '첫 화면(지표 분석) 상단' });
await shot('A_header', 'header.top', '제목·부제');
await shot('A_nav', '.seg.views', '메뉴 탭');
// 전역 검색(오른쪽 위 ⌕ 검색): 「건강수명」을 쳐서 메뉴·카드·지표가 함께 나오는 모습
try { await p.locator('.srch-btn').first().click({ timeout: 2000 }); await p.waitForTimeout(300); await p.keyboard.type('건강수명'); await p.waitForTimeout(500);
  await shot('A_search', '.srch-panel', '검색 상자: 「건강수명」 결과(메뉴·카드·지표)'); await p.keyboard.press('Escape'); await p.waitForTimeout(300); } catch (e) { console.log('search', e.message.slice(0, 60)); }
await shot('A_controls', '.controls', '지표·지역·비교·값 유형 선택');
await shot('A_year', '.ctrl.yearctrl', '연도 슬라이더·재생');
await shot('A_kpis', '.kpis', '상단 요약 타일 4개');
await cards('B_analysis');
// 지도 3모드
const mapCard = cardBy('단계구분도');
// 비교 범위 드롭다운(지도·순위·격차 공통): 17개 시도 / 전국 시군구 / 시도 내 시군구
await p.selectOption('.scope-sel', 'sidoAll'); await p.waitForTimeout(600); await shot('B_map_sido', mapCard, '지도: 비교 범위 「전국 — 17개 시도」');
await p.selectOption('.scope-sel', 'nation'); await p.waitForTimeout(600); await shot('B_map_nation', mapCard, '지도: 비교 범위 「전국 — 시군구」');
await p.selectOption('.scope-sel', 'sido:001'); await p.waitForTimeout(600); await shot('B_map_insido', mapCard, '지도: 비교 범위 「서울특별시 내 시군구」');
await shot('A_scope', '.ctrl:has(.scope-sel)', '비교 범위 드롭다운');
// 순위 토글
const rankCard = cardBy('순위');
await clickBtn(null, '⑩ 묶음'); await shot('B_rank_group', rankCard, '순위: 10개 묶음 보기'); await clickBtn(null, '⑩ 묶음');
await clickBtn(null, '나쁜 순'); await shot('B_rank_rev', rankCard, '순위: 나쁜 순'); await clickBtn(null, '양호한 순');
await clickBtn(null, '전체 보기'); await p.waitForTimeout(1200);
await p.screenshot({ path: `${OUT}/B_rankall.png` }); manifest.push({ name: 'B_rankall', file: `${OUT}/B_rankall.png`, note: '순위 전체 보기(1열)' });
await shot('B_rankall_head', '.ra-head', '전체 보기 상단 버튼(재생·크게·인쇄·영상·SVG·PNG·CSV)');
await p.emulateMedia({ media: 'print' }); await p.waitForTimeout(400);
await p.screenshot({ path: `${OUT}/B_rankall_print.png` }); manifest.push({ name: 'B_rankall_print', file: `${OUT}/B_rankall_print.png`, note: '인쇄 모드' });
await p.emulateMedia({ media: 'screen' }); await p.keyboard.press('Escape'); await p.waitForTimeout(400);
// 지표 선택기 열기
try { await p.locator('.pick-btn').first().click({ timeout: 2000 }); await p.waitForTimeout(500); await p.screenshot({ path: `${OUT}/A_picker_open.png` }); manifest.push({ name: 'A_picker_open', file: `${OUT}/A_picker_open.png`, note: '지표 선택기' }); await p.keyboard.press('Escape'); } catch (e) { console.log('picker', e.message.slice(0, 60)); }
// 신뢰구간 있는 지표(현재흡연율) 순위
await go('#ind=DT_H_SM&sido=001&sgg=00101&year=2025&scope=nation');
await shot('B_rank_ci', cardBy('순위'), '순위: 신뢰구간·불안정값 제외(현재흡연율)');
await shot('B_evidence', cardBy('근거'), '근거 중재(NICE·CPSTF)');
// 다크 모드
await p.emulateMedia({ colorScheme: 'dark' }); await go('#ind=DT_H_OBE_OBE&sido=001&sgg=00101&scope=sido', 1500);
await p.screenshot({ path: `${OUT}/A_dark.png` }); manifest.push({ name: 'A_dark', file: `${OUT}/A_dark.png`, note: '다크 모드' });
await p.emulateMedia({ colorScheme: 'light' });

// ── 지역 프로파일 (강남구 · 구례군) ──
await go('#view=profile&sido=001&sgg=00101', 2500);
await p.screenshot({ path: `${OUT}/C_profile_top.png` }); manifest.push({ name: 'C_profile_top', file: `${OUT}/C_profile_top.png`, note: '지역 프로파일 상단' });
await cards('C_profile');
await go('#view=profile&sido=013&sgg=01305', 2500);
await cards('C2_gurye');

// ── Health Equity Radar (2026-10-03): 우선 검토 · ⓘ 정보 창 · 홈 빠르게 보기 · 복합 취약 신호 · 형평성 요약 비교 · 영문 소개 ──
await go('#view=profile&sido=009&sgg=00901', 2500);
await shot('N_eq_card', '.eq-card', '프로파일: 우리 지역 우선 검토 항목(강릉시)');
await shot('N_eq_item', '.eq-item', '우선 검토 카드 1개: 값·왜 우선인가·참고 자료·버튼');
try {   // 슬라이드에서 읽히도록 카드 윗부분(요약 + 우선 검토 3개의 값 격자)만 잘라 찍는다
  const c = p.locator('.eq-card'); await c.scrollIntoViewIfNeeded(); await p.waitForTimeout(300);
  const bx = await c.boundingBox(); const why = await p.locator('.eq-item .eq-why').first().boundingBox();
  if (bx && why) { const f = `${OUT}/N_eq_top.png`; await c.screenshot({ path: f, clip: undefined }).catch(() => {});
    await p.evaluate((y) => window.scrollTo(0, y), Math.max(0, (await p.evaluate(() => window.scrollY)) + bx.y - 10)); await p.waitForTimeout(300);
    const b2 = await c.boundingBox(); const w2 = await p.locator('.eq-item .eq-why').first().boundingBox();
    await p.screenshot({ path: f, clip: { x: b2.x, y: b2.y, width: b2.width, height: Math.min(b2.height, w2.y - b2.y + 6) } });
    manifest.push({ name: 'N_eq_top', file: f, note: '우선 검토 항목 윗부분' }); console.log('✓ N_eq_top'); }
} catch (e) { console.log('✗ N_eq_top', e.message.slice(0, 60)); }
try {   // 정보 창은 스크롤하면 닫히므로 먼저 자리를 잡고 연 뒤 화면 일부를 잘라 찍는다
  const it = p.locator('.eq-item').first(); await it.scrollIntoViewIfNeeded(); await p.waitForTimeout(900);
  await it.locator('.info-btn').evaluate((el) => el.click()); await p.waitForTimeout(500);
  const box = await p.locator('.info-pop').boundingBox({ timeout: 4000 });
  if (box) { const f = `${OUT}/N_info_pop.png`; await p.screenshot({ path: f, clip: { x: Math.max(0, box.x - 8), y: Math.max(0, box.y - 8), width: box.width + 16, height: box.height + 16 } }); manifest.push({ name: 'N_info_pop', file: f, note: 'ⓘ 지표 정보 창' }); console.log('✓ N_info_pop'); }
  await p.keyboard.press('Escape');
} catch (e) { console.log('✗ N_info_pop', e.message.slice(0, 60)); }
await go('#view=home&sido=009&sgg=00901', 2500);
await shot('N_home_eq', '.hc-eq', '홈 ③ 내 지역 건강격차 빠르게 보기');
await go('#view=hot', 3000); await clickBtn(null, '복합 취약 신호'); await p.waitForTimeout(1500);
await shot('N_hot_multi_ctrl', cardBy('여러 지표가 함께'), '핫스팟: 복합 취약 신호 조건');
await shot('N_hot_multi_map', cardBy('복합 취약 신호 지도'), '핫스팟: 복합 취약 신호 지도');
await shot('N_hot_multi_list', cardBy('복합 취약 신호 지역 목록'), '핫스팟: 복합 취약 신호 지역 목록');
await go('#view=compare&ind=DT_H_SM&sido=009&sgg=00901&cmp=NAT,00901,01302,00101', 2500);
await shot('N_compare_eq', cardBy('형평성 요약 비교'), '지역 비교: 형평성 요약 비교');
await go('#ind=DT_H_OBE_OBE&sido=009&sgg=00901&year=2025&scope=nation', 2500);
await shot('N_trend', cardBy('10년 추세'), '지표 분석: 10년 추세(2015년 이후 연간 변화)');
await go('#view=radar', 2000); await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(400);
await p.screenshot({ path: `${OUT}/N_radar.png` }); manifest.push({ name: 'N_radar', file: `${OUT}/N_radar.png`, note: '영문 소개(Health Equity Radar)' });

// ── 성과지표 ──
await go('#view=kpi&sido=001&sgg=00101', 2000); await p.screenshot({ path: `${OUT}/D_kpi_top.png` }); manifest.push({ name: 'D_kpi_top', file: `${OUT}/D_kpi_top.png`, note: '성과지표 상단' }); await cards('D_kpi');
// ── 지역 비교 ──
await go('#view=compare&ind=DT_H_OBE_OBE&sido=001&sgg=00101&cmp=NAT,001,00101,01305,01411', 2500); await p.screenshot({ path: `${OUT}/E_compare_top.png` }); manifest.push({ name: 'E_compare_top', file: `${OUT}/E_compare_top.png`, note: '지역 비교 상단' }); await cards('E_compare');
// ── 예방·관리 ──
await go('#view=ncd&sido=001&sgg=00101', 2000); await p.screenshot({ path: `${OUT}/F_ncd_top.png` }); manifest.push({ name: 'F_ncd_top', file: `${OUT}/F_ncd_top.png`, note: '예방·관리' }); await cards('F_ncd');
// ── 연관지표 ──
await go('#view=corr&ind=DT_H_OBE_OBE&sido=001&sgg=00101', 2500); await p.screenshot({ path: `${OUT}/G_corr_top.png` }); manifest.push({ name: 'G_corr_top', file: `${OUT}/G_corr_top.png`, note: '연관지표' }); await cards('G_corr');
// ── 핫스팟 ──
await go('#view=hot&ind=DT_H_OBE_OBE&sido=001&sgg=00101', 3000); await p.screenshot({ path: `${OUT}/H_hot_top.png` }); manifest.push({ name: 'H_hot_top', file: `${OUT}/H_hot_top.png`, note: '핫스팟' }); await cards('H_hot');
// ── 연대기 ──
await go('#view=chronicle&sido=001&sgg=00101', 3000); await p.screenshot({ path: `${OUT}/I_chron_top.png` }); manifest.push({ name: 'I_chron_top', file: `${OUT}/I_chron_top.png`, note: '연대기 전시관' }); await cards('I_chron');
// ── 조사 단위 ──
await go('#view=units&sido=001&sgg=00101', 2500); await p.screenshot({ path: `${OUT}/J_units_top.png` }); manifest.push({ name: 'J_units_top', file: `${OUT}/J_units_top.png`, note: '조사 단위' }); await cards('J_units');
// ── 자료원 ──
await go('#view=sources', 2500); await p.screenshot({ path: `${OUT}/K_sources_top.png` }); manifest.push({ name: 'K_sources_top', file: `${OUT}/K_sources_top.png`, note: '자료원' }); await cards('K_sources');
await shot('K_matrix', '.cov-tbl, .covmat, table.cov, .tblscroll', '보유 매트릭스');
// ── 의견·문의 ──
await go('#view=feedback', 1500); await p.screenshot({ path: `${OUT}/L_feedback_top.png` }); manifest.push({ name: 'L_feedback_top', file: `${OUT}/L_feedback_top.png`, note: '의견·문의' }); await cards('L_feedback');

// ── 모바일 ──
const m = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: 'light' }).then((c) => c.newPage());
await m.goto(BASE + '#ind=DT_H_OBE_OBE&sido=001&sgg=00101'); await m.waitForTimeout(2000);
await m.screenshot({ path: `${OUT}/A_mobile.png` }); manifest.push({ name: 'A_mobile', file: `${OUT}/A_mobile.png`, note: '휴대폰 화면' });
await m.goto(BASE + '#view=profile&sido=001&sgg=00101'); await m.waitForTimeout(2500);
await m.screenshot({ path: `${OUT}/C_mobile_profile.png` }); manifest.push({ name: 'C_mobile_profile', file: `${OUT}/C_mobile_profile.png`, note: '휴대폰 프로파일' });

fs.writeFileSync(`${OUT}/manifest.json`, JSON.stringify(manifest, null, 1));
console.log('done', manifest.length, 'errors', errs);
await b.close();
