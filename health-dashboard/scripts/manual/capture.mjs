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
const cards = async (prefix) => {
  const n = await p.locator('.card').count();
  for (let i = 0; i < n; i++) {
    const c = p.locator('.card').nth(i);
    if (!(await c.isVisible())) continue;
    const box = await c.boundingBox(); if (!box || box.height < 80 || box.width < 200) continue;
    const t = (await c.locator('h3').first().innerText().catch(() => '')).split('\n')[0].trim();
    await shot(`${prefix}_${String(i).padStart(2, '0')}_${safe(t || 'card')}`, c, t);
  }
};
const clickBtn = async (scopeSel, text) => { await p.evaluate(({ scopeSel, text }) => { const root = scopeSel ? document.querySelector(scopeSel) : document; const b = [...root.querySelectorAll('button')].find((x) => x.textContent.trim().includes(text)); b && b.click(); }, { scopeSel, text }); await p.waitForTimeout(500); };
const cardBy = (t) => p.locator('.card', { has: p.locator('h3', { hasText: t }) }).first();

// ── 지표 분석 (비만율 · 서울 강남구) ──
// 홈(메인 화면) — 카드 4장 격자 전체와 카드별
await go('#view=home&sido=009&sgg=00901', 2500);
await shot('A0_home_grid', '.home-grid', '홈: 카드 4장');
await cards('A0_home');
await go('#ind=DT_H_OBE_OBE&sido=001&sgg=00101&year=2025&scope=nation');
await p.screenshot({ path: `${OUT}/A_home_top.png` }); manifest.push({ name: 'A_home_top', file: `${OUT}/A_home_top.png`, note: '첫 화면(지표 분석) 상단' });
await shot('A_header', 'header.top', '제목·부제');
await shot('A_nav', '.seg.views', '메뉴 탭');
await shot('A_controls', '.controls', '지표·지역·비교·값 유형 선택');
await shot('A_year', '.ctrl.yearctrl', '연도 슬라이더·재생');
await shot('A_kpis', '.kpis', '상단 요약 타일 4개');
await cards('B_analysis');
// 지도 3모드
const mapCard = cardBy('단계구분도');
await clickBtn(null, '전국 시도'); await shot('B_map_sido', mapCard, '지도: 전국 시도 모드');
await clickBtn(null, '전국 시군구'); await shot('B_map_nation', mapCard, '지도: 전국 시군구');
await clickBtn(null, '시도 내 시군구'); await shot('B_map_insido', mapCard, '지도: 시도 내 시군구');
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
