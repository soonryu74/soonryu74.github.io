/* Health Equity Radar 화면 점검(지시서 18절 8~10: 모바일 카드 · 다크모드 · 기존 라우트 회귀).
   준비: 빌드된 index.html 과 solve/ 를 한 폴더에 두고 정적 서버를 띄운다.
     cp index.html $QA/ && cp -r solve $QA/ && (cd $QA && python3 -m http.server 8911)
   실행: BASE=http://127.0.0.1:8911 OUT=./qa_shots node scripts/qa/equity_e2e.mjs
   Playwright 위치는 PW(기본: 전역 설치 경로), 크로미움은 CHROME(기본 /opt/pw-browsers/chromium). */
const PW = process.env.PW || "/opt/node22/lib/node_modules/playwright/index.mjs";
const { chromium } = await import(PW);
const BASE = process.env.BASE || "http://127.0.0.1:8911";
const OUT = process.env.OUT || ".";
const b = await chromium.launch({ executablePath: process.env.CHROME || "/opt/pw-browsers/chromium" });
const fails = [];
const check = (ok, msg) => { console.log(`${ok ? "✔" : "✘"} ${msg}`); if (!ok) fails.push(msg); };

async function page(w, scheme = "light") {
  const pg = await b.newPage({ viewport: { width: w, height: 1000 }, colorScheme: scheme });
  pg.errs = [];
  pg.on("pageerror", (e) => pg.errs.push(e.message));
  return pg;
}
const go = async (pg, hash, wait = 1800) => { await pg.goto(`${BASE}/index.html#${hash}`, { waitUntil: "load" }); await pg.waitForTimeout(wait); };
const overflow = (pg) => pg.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

// 10. 기존 라우트 회귀 + radar — 1400·390 폭에서 JS 오류·가로 넘침 없음
const VIEWS = ["home", "analysis", "profile", "kpi", "compare", "ncd", "corr", "hot", "chronicle", "units", "sources", "feedback", "radar"];
for (const w of [1400, 390]) {
  const pg = await page(w);
  for (const v of VIEWS) {
    await go(pg, `view=${v}&ind=DT_H_OBE_OBE&sido=009&sgg=00901&cmp=NAT,00901,00101`, v === "hot" ? 2500 : 1500);
    const ov = await overflow(pg);
    check(pg.errs.length === 0 && ov <= 0, `[${w}] ${v} 오류 ${pg.errs.length}건 · 가로 넘침 ${ov}px`);
    pg.errs.length = 0;
  }
  await pg.close();
}

// 프로파일 우선 검토 카드: 시군구·시도·다보건소 시·박탈 5분위
for (const [code, sido, name] of [["00901", "009", "강릉시"], [null, "001", "서울특별시"], ["00822", "008", "수원시"], ["01302", "013", "고흥군"]]) {
  const pg = await page(1400);
  await go(pg, `view=profile&sido=${sido}${code ? `&sgg=${code}` : ""}`, 2200);
  const info = await pg.evaluate(() => {
    const items = [...document.querySelectorAll(".eq-item")];
    return { n: items.length, doms: items.map((e) => e.querySelector(".eq-dom")?.textContent), tiers: items.map((e) => e.querySelector(".eq-tier")?.textContent.trim()), why: items.map((e) => e.querySelectorAll(".eq-why li").length), empty: !!document.querySelector(".eq-card .empty") };
  });
  check((info.n >= 1 || info.empty) && new Set(info.doms).size === info.doms.length, `${name}: 우선 검토 ${info.n}개 · 영역 중복 없음 (${info.doms.join(", ")})`);
  check(info.tiers.every((t) => /우선 검토|관찰 필요/.test(t)) && info.why.every((n) => n >= 2), `${name}: 등급 글자 표시·근거 2줄 이상`);
  check(pg.errs.length === 0, `${name}: JS 오류 없음`);
  await pg.close();
}

// 버튼 동작: 유사 지역 비교 → 동류군 카드 지표 변경 / 관련 지표 보기 → 지표 분석
{
  const pg = await page(1400);
  await go(pg, "view=profile&sido=009&sgg=00901", 2200);
  const first = (await pg.locator(".eq-item .eq-name").first().textContent()).replace("ⓘ", "").trim();
  await pg.locator(".eq-item").first().getByRole("button", { name: "유사 지역 비교" }).click();
  await pg.waitForTimeout(900);
  const peerSel = await pg.evaluate(() => { const s = document.querySelector(".peer select"); return s ? s.options[s.selectedIndex].text : null; });
  check(peerSel && peerSel.includes(first.slice(0, 6)), `유사 지역 비교 → 동류군 지표 「${peerSel}」`);
  await pg.locator(".eq-item").first().scrollIntoViewIfNeeded(); await pg.waitForTimeout(1200);   // 부드러운 스크롤이 끝난 뒤(스크롤 중엔 팝오버가 닫힘)
  await pg.locator(".eq-item").first().locator(".info-btn").click(); await pg.waitForTimeout(300);
  check(await pg.locator(".info-pop").count() === 1, "ⓘ 지표 정보 창 열림");
  await pg.keyboard.press("Escape");
  check(await pg.locator(".info-pop").count() === 0, "Esc 로 정보 창 닫힘");
  await pg.locator(".eq-item").first().getByRole("button", { name: "관련 지표 보기" }).click();
  await pg.waitForTimeout(1200);
  check(await pg.evaluate(() => location.hash.includes("view=analysis")), "관련 지표 보기 → 지표 분석 화면");
  await go(pg, "view=profile&sido=009&sgg=00901", 2200);
  await pg.locator(".eq-item").first().getByRole("button", { name: "연도별 변화 보기" }).click();
  await pg.waitForTimeout(2500);
  check(await pg.evaluate(() => location.hash.includes("view=analysis") && !!document.querySelector(".yeartbl")) && pg.errs.length === 0, "연도별 변화 보기 → 지표 분석 연도별 추이표");
  await pg.close();
}

// 홈: 검색 → 미니 카드 3개 → 프로파일 이동
{
  const pg = await page(390);
  await go(pg, "view=home", 1800);
  await pg.fill("#heq-q", "고흥");
  await pg.locator(".heq-hits button").first().click();
  await pg.waitForTimeout(500);
  check(await pg.locator(".heq-mini").count() === 3, "홈 미니 카드 3개");
  check((await pg.locator(".heq-cur").textContent()).includes("고흥군"), "홈 검색 「고흥」 → 고흥군 선택");
  await pg.getByRole("button", { name: /Health Equity Profile 보기/ }).click();
  await pg.waitForTimeout(1500);
  check(await pg.evaluate(() => location.hash.includes("view=profile") && location.hash.includes("sgg=01302")), "CTA → 고흥군 프로파일");
  check(await overflow(pg) <= 0, "390px 프로파일 가로 넘침 없음");
  await pg.close();
}

// 핫스팟 복합 취약 신호
{
  const pg = await page(1400);
  await go(pg, "view=hot", 2500);
  await pg.getByRole("button", { name: "복합 취약 신호" }).click();
  await pg.waitForTimeout(1500);
  const n = await pg.locator(".poly.ehs-flag").count();
  const rows = await pg.locator(".hot table.yeartbl tbody tr").count();
  check(n > 0 && n === rows, `복합 취약 신호 지역 ${n}곳(지도) = ${rows}행(목록)`);
  check(pg.errs.length === 0, "핫스팟 JS 오류 없음");
  await pg.screenshot({ path: `${OUT}/hot_multi_1400.png` });
  await pg.close();
}

// 비교 형평성 표 / 영문 페이지 숫자 / solve 리다이렉트
{
  const pg = await page(1400);
  await go(pg, "view=compare&ind=DT_H_SM&sido=009&sgg=00901&cmp=NAT,00901,00101", 1800);
  check(await pg.locator("table.ceq tbody tr").count() === 2, "형평성 요약 비교 2곳(전국 중앙값 제외)");
  await go(pg, "view=radar", 1500);
  const t = await pg.locator(".radar-stats").innerText();
  check(/171/.test(t) && /258/.test(t) && /2008–2025/.test(t), `영문 페이지 수치: ${t.replace(/\s+/g, " ")}`);
  // 2026-10-04: /solve 는 리다이렉트가 아니라 독립 영문 랜딩(scripts/build_solve.py) — 앱으로 들어가는 링크를 확인
  await pg.goto(`${BASE}/solve/index.html`, { waitUntil: "load" }); await pg.waitForTimeout(500);
  check(/From local health data to local action/.test(await pg.locator("h1").innerText()) && (await pg.locator('a[href*="en=1"]').count()) > 0, "solve/ 영문 랜딩 · Live Radar 링크");
  await pg.close();
}

// 9. 다크모드·A+ 캡처(육안 확인용) + 8. 모바일 카드
for (const [w, scheme] of [[1400, "dark"], [390, "dark"], [390, "light"]]) {
  const pg = await page(w, scheme);
  await go(pg, "view=profile&sido=009&sgg=00901", 2200);
  await pg.locator(".eq-card").screenshot({ path: `${OUT}/eq_${w}_${scheme}.png` });
  await go(pg, "view=home", 1500);
  await pg.locator(".hc-eq").screenshot({ path: `${OUT}/home_eq_${w}_${scheme}.png` });
  await go(pg, "view=radar", 1200);
  await pg.screenshot({ path: `${OUT}/radar_${w}_${scheme}.png`, fullPage: false });
  await pg.close();
}
{
  const pg = await page(390);
  await go(pg, "view=profile&sido=009&sgg=00901", 2000);
  for (let i = 0; i < 2; i++) await pg.getByRole("button", { name: "A+" }).click().catch(() => {});
  await pg.waitForTimeout(500);
  check(await overflow(pg) <= 0, "390px + A+ 두 번: 가로 넘침 없음");
  await pg.close();
}

await b.close();
console.log(fails.length ? `\n실패 ${fails.length}건` : "\n전부 통과");
process.exit(fails.length ? 1 : 0);
