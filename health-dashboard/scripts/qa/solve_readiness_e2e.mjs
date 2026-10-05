/* MIT Solve 준비 점검 — 4개 화면 크기에서 심사 흐름(홈 → 지역 선택 → 지표 → 우선 검토 → 근거 → 대응 → 방법 → 사용 의견 → 자료원 → /solve),
   접근성 자동 점검(이름 없는 버튼·링크, alt 없는 이미지, 제목 순서, 작은 글씨), 내부 링크 상태.
   준비: index.html · solve/ · docs/ 를 한 폴더에 두고 정적 서버(equity_e2e.mjs 와 같음).
   실행: BASE=http://127.0.0.1:8911 OUT=./qa_shots node scripts/qa/solve_readiness_e2e.mjs */
const PW = process.env.PW || "/opt/node22/lib/node_modules/playwright/index.mjs";
const { chromium } = await import(PW);
const BASE = process.env.BASE || "http://127.0.0.1:8911";
const OUT = process.env.OUT || ".";
const b = await chromium.launch({ executablePath: process.env.CHROME || "/opt/pw-browsers/chromium" });
const fails = [], notes = [];
const check = (ok, msg) => { console.log(`${ok ? "✔" : "✘"} ${msg}`); if (!ok) fails.push(msg); };
const VPS = [[390, 844], [430, 932], [768, 1024], [1440, 900]];

async function a11y(pg, where) {
  const r = await pg.evaluate(() => {
    const vis = (e) => { const s = getComputedStyle(e); const bb = e.getBoundingClientRect(); return s.display !== "none" && s.visibility !== "hidden" && bb.width > 0 && bb.height > 0; };
    const name = (e) => (e.getAttribute("aria-label") || e.getAttribute("title") || e.textContent || "").trim() || (e.querySelector("img[alt]")?.alt || "");
    const unnamed = [...document.querySelectorAll("button, a[href], [role=button]")].filter(vis).filter((e) => !name(e)).map((e) => e.outerHTML.slice(0, 80));
    const noAlt = [...document.querySelectorAll("img")].filter((i) => !i.hasAttribute("alt")).map((i) => i.src.slice(0, 60));
    const hs = [...document.querySelectorAll("h1,h2,h3,h4")].filter(vis).map((h) => +h.tagName[1]);
    const jumps = hs.filter((h, i) => i > 0 && h - hs[i - 1] > 1).length;
    const texts = [...document.querySelectorAll("body *")].filter((e) => e.childNodes.length && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1) && vis(e) && !e.closest("svg"));
    const small = texts.filter((e) => parseFloat(getComputedStyle(e).fontSize) < 12).length;
    return { unnamed, noAlt, jumps, small, total: texts.length };
  });
  check(r.unnamed.length === 0, `${where} 이름 없는 버튼·링크 ${r.unnamed.length}개 ${r.unnamed.slice(0, 2).join(" | ")}`);
  check(r.noAlt.length === 0, `${where} alt 없는 이미지 ${r.noAlt.length}개`);
  notes.push(`${where}: 제목 단계 건너뜀 ${r.jumps}곳 · 12px 미만 글자 요소 ${r.small}/${r.total}`);
}
const overflow = (pg) => pg.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
const clipped = (pg, sel) => pg.evaluate((s) => [...document.querySelectorAll(s)].filter((e) => { const bb = e.getBoundingClientRect(); return bb.right > window.innerWidth + 1 || bb.left < -1; }).length, sel);

for (const [w, h] of VPS) {
  const pg = await b.newPage({ viewport: { width: w, height: h } });
  const errs = []; pg.on("pageerror", (e) => errs.push(e.message)); pg.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
  // 홈 → 지역 검색(고흥) → 프로파일
  await pg.goto(`${BASE}/index.html`, { waitUntil: "load" }); await pg.waitForTimeout(1800);
  await pg.fill("#heq-q", "강릉"); await pg.locator(".heq-hits button").first().click(); await pg.waitForTimeout(400);
  await pg.getByRole("button", { name: /Health Equity Profile 보기/ }).click(); await pg.waitForTimeout(2200);
  check(await pg.evaluate(() => location.hash.includes("view=profile") && location.hash.includes("sgg=00901")), `[${w}] 홈 검색 → 강릉시 프로파일`);
  // Priority → Why → Action
  const steps = await pg.evaluate(() => ({ p: !!document.querySelector(".eq-step"), items: document.querySelectorAll(".eq-item").length, why: document.querySelectorAll(".eq-item .eq-why li").length, act: document.querySelectorAll(".eq-item .eq-act").length }));
  check(steps.p && steps.items >= 1 && steps.why >= steps.items * 2 && steps.act === steps.items, `[${w}] PRIORITY ${steps.items} · WHY ${steps.why}줄 · ACTION ${steps.act}`);
  check(await clipped(pg, ".eq-card, .eq-item, .eq-facts > div, .eq-btns .themebtn") === 0, `[${w}] 우선 검토 카드 요소 잘림 없음`);
  // 방법 링크
  await pg.locator(".eq-method-link").click(); await pg.waitForTimeout(900);
  check(await pg.locator(".eq-method-box").evaluate((e) => e.open), `[${w}] 「우선순위를 정하는 방법」 → 계산 방법 펼침`);
  // 영어 모드
  await pg.locator(".eq-lang button", { hasText: "EN" }).click(); await pg.waitForTimeout(600);
  const enTxt = await pg.locator(".eq-step").innerText();
  check(/PRIORITY/.test(enTxt) && (await pg.locator(".eq-card h3").innerText()).startsWith("Health Equity Priority") && await pg.evaluate(() => location.hash.includes("en=1")), `[${w}] 영어 모드 전환(해시 en=1)`);
  await pg.screenshot({ path: `${OUT}/flow_${w}_priority_en.png` });
  // 사용 의견
  await pg.getByRole("button", { name: "Give Feedback" }).first().click(); await pg.waitForTimeout(400);
  const dlg = pg.locator("[role=dialog]");
  check(await dlg.count() === 1, `[${w}] Give Feedback 설문 열림`);
  await dlg.locator("select").selectOption({ index: 1 });
  await dlg.locator(".uf-q").nth(0).locator(".uf-opt").nth(3).click();
  check((await dlg.locator(".uf-preview").innerText()).includes("4/5"), `[${w}] 설문 답이 글로 만들어짐`);
  check(await clipped(pg, "[role=dialog] .uf-opt, [role=dialog] .themebtn") === 0, `[${w}] 설문 요소 잘림 없음`);
  await pg.keyboard.press("Escape"); await pg.waitForTimeout(200);
  check(await dlg.count() === 0, `[${w}] Esc 로 설문 닫힘`);
  await pg.locator(".eq-lang button", { hasText: "한국어" }).click(); await pg.waitForTimeout(400);
  await a11y(pg, `[${w}] 프로파일`);
  check(await overflow(pg) <= 0, `[${w}] 프로파일 가로 넘침 없음`);
  // 지표·그래프 → 자료원
  await pg.goto(`${BASE}/index.html#view=analysis&ind=DT_H_OBE_OBE&sido=009&sgg=00901`, { waitUntil: "load" }); await pg.waitForTimeout(2200);
  check(await pg.locator("svg").count() > 3 && await overflow(pg) <= 0, `[${w}] 지표 분석 그래프 표시·넘침 없음`);
  await pg.goto(`${BASE}/index.html#view=sources`, { waitUntil: "load" }); await pg.waitForTimeout(1500);
  check(await pg.locator(".rev-card").count() === 1 && await overflow(pg) <= 0, `[${w}] 자료원(출처) 화면`);
  await pg.goto(`${BASE}/index.html#view=radar`, { waitUntil: "load" }); await pg.waitForTimeout(1200);
  check(await pg.locator("#methodology").count() === 1 && await overflow(pg) <= 0, `[${w}] 영문 소개 · Methodology`);
  await a11y(pg, `[${w}] 영문 소개`);
  // /solve
  await pg.goto(`${BASE}/solve/`, { waitUntil: "load" }); await pg.waitForTimeout(600);
  check(await pg.locator("h1").innerText() === "From local health data to local action." && await overflow(pg) <= 0, `[${w}] /solve 랜딩`);
  await a11y(pg, `[${w}] /solve`);
  await pg.screenshot({ path: `${OUT}/solve_${w}.png` });
  check(errs.length === 0, `[${w}] 콘솔·JS 오류 ${errs.length}건 ${errs.slice(0, 2).join(" | ")}`);
  await pg.close();
}

// /solve 2분 심사 흐름: 90초 투어(실제 캡처 5장) · CTA 4개 · 「What is real today」 숫자 = 증거 묶음 · 하지 않는 것 6개 · 과장 표현 없음 · 다크
{
  const { readFileSync } = await import("node:fs");
  const CE = JSON.parse(readFileSync(new URL("../../data/competition_evidence.json", import.meta.url), "utf8"));
  for (const scheme of ["light", "dark"]) {
    const pg = await (await b.newContext({ viewport: scheme === "dark" ? { width: 390, height: 844 } : { width: 1440, height: 900 }, colorScheme: scheme })).newPage();
    await pg.goto(`${BASE}/solve/`, { waitUntil: "load" });
    await pg.evaluate(async () => { for (const i of document.querySelectorAll("img")) { i.loading = "eager"; if (!i.complete) await new Promise((r) => { i.onload = i.onerror = r; }); } });
    const tour = await pg.$$eval(".tour > li", (lis) => lis.map((li) => ({ step: li.querySelector(".step")?.textContent.trim(), img: li.querySelector("img")?.naturalWidth || 0, open: li.querySelector("a.open")?.getAttribute("href") })));
    check(tour.length === 5 && tour.every((t) => t.img > 0 && t.open) && /FIND A COMMUNITY/.test(tour[0].step) && /SCALE THE FRAMEWORK/.test(tour[4].step), `[/solve ${scheme}] 90초 투어 5단계 · 실제 캡처 로드 ${tour.filter((t) => t.img > 0).length}/5`);
    if (scheme === "light") {
      const ctas = await pg.$$eval(".hero .ctas a", (as) => as.map((a) => [a.textContent.trim(), a.getAttribute("href")]));
      const want = [["Try Korea Demo", /view=profile.*en=1/], ["Open Global Prototype", /global\//], ["View Methodology", /#method/], ["View Data Validation", /DATA_VALIDATION/]];
      check(want.every(([t, re]) => ctas.some(([x, h]) => x.startsWith(t) && re.test(h))), `[/solve] CTA 4개 ${ctas.map((c) => c[0]).join(" · ")}`);
      const real = await pg.locator("#real").innerText();
      const K = CE.korea, G = CE.global, n = (v) => Number(v).toLocaleString("en-US");
      const nums = [K.indicators, K.survey_indicators, K.survey_units, K.admin_indicators, K.municipalities, `${K.year_first}–${K.year_last}`, G.economies, G.indicators, n(G.observed_values_since_2000), G.evidence_sources_verified].map(String);
      check(nums.every((x) => real.includes(x)) && real.includes(CE.qa_line.slice(0, 20)), `[/solve] What is real today 숫자 = 증거 묶음(${nums.join(", ")})`);
      check(!/\b\d+ (health )?indicators (across|for|in) \d+ (survey units|areas|jurisdictions)( and \d+ municipalities)?/i.test((await pg.locator("body").innerText()).replace(/\b\d+ survey indicators across \d+ survey units/gi, "")), "[/solve] 데이터 수준 섞은 표현 없음(지표 총수 × 조사 단위)");
      check((await pg.locator("#not .notdo li").count()) === 6, "[/solve] 하지 않는 것 6개");
      const body = await pg.locator("body").innerText();
      const bad = [/deployed (in|across) \d+ countr/i, /used by \d+ countr/i, /validated by (the )?government/i, /WHO[- ](supported|approved)/i, /MIT[- ](supported|funded)/i, /in partnership with/i].filter((re) => re.test(body));
      check(bad.length === 0 && /prototype applied to data from \d+ countries and economies/i.test(body) && /Built in Korea\. Tested as a portable framework globally\./.test(body), `[/solve] 과장 표현 0 · 「prototype applied to data from … countries and economies」 문구`);
    }
    check(await overflow(pg) <= 0, `[/solve ${scheme}] 가로 넘침 ${await overflow(pg)}px`);
    await pg.screenshot({ path: `${OUT}/solve_demo_${scheme}.png`, fullPage: true });
    await pg.close();
  }
}
// 링크: /solve 와 영문 소개의 내부 링크 상태
{
  const pg = await b.newPage();
  const hrefs = new Set();
  for (const u of [`${BASE}/solve/`, `${BASE}/index.html#view=radar`]) {
    await pg.goto(u, { waitUntil: "load" }); await pg.waitForTimeout(1200);
    (await pg.evaluate(() => [...document.querySelectorAll("a[href]")].map((a) => a.href))).forEach((h) => hrefs.add(h));
  }
  for (const h of hrefs) {
    if (!h.startsWith(BASE)) continue;
    const r = await pg.request.get(h.split("#")[0]);
    check(r.status() < 400, `링크 ${h.replace(BASE, "")} → ${r.status()}`);
  }
  await pg.close();
}
await b.close();
console.log("\n" + notes.join("\n"));
console.log(fails.length ? `\n실패 ${fails.length}건` : "\n전부 통과");
process.exit(fails.length ? 1 : 0);
