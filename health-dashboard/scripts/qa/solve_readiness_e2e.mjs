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
// 격차 정의(노은정 2026 발표 기준): 발표 예시(경기 광주시 2025 비만율 표준화)를 화면이 그대로 재현하는지
{
  const pg = await b.newPage({ viewport: { width: 1280, height: 1000 } });
  await pg.goto(`${BASE}/index.html#view=analysis&ind=DT_H_OBE_OBE&sido=008&sgg=00819&year=2025&scope=nation`, { waitUntil: "load" });
  await pg.waitForSelector(".rmr-card"); await pg.waitForTimeout(800);
  const t = await pg.locator(".rmr-sentence").innerText();
  check(["38.4%(95% 신뢰구간 34.7~42.1%)", "258곳 중 값이 높은 순 58번째(상위 약 22%)", "수도권 101곳 중 값이 높은 순 19번째(상위 약 19%)", "3.0%p 높지만", "통계적으로 유의하지 않다", "31.3%)와는 7.1%p(1.23배)"].every((x) => t.includes(x)), "우리 지역 읽기: 발표 예시(경기 광주시 비만율) 해석 문장 재현");
  check((await pg.locator(".rmr-steps > li").count()) === 5, "우리 지역 읽기 5단계");
  const rows = await pg.locator(".gap-main .gr-tbl tbody tr").allInnerTexts();
  check(rows.length === 5 && /24\.9%p/.test(rows[0]) && /7\.3%p/.test(rows[1]) && /1\.23배/.test(rows[1]), `격차 읽기 3방식(최대−최소 24.9%p · 경계값 7.3%p·1.23배) + 2행: ${rows.map((r) => r.split("\t")[0]).join(" / ")}`);
  // SII·RII · BGV 병행 표기(2026-10-30): 같은 표 안에 절대·상대로
  check(/SII \+4\.4%p/.test(rows[3]) && /RII 1\.13배/.test(rows[3]) && /95% 구간/.test(rows[3]), `격차 읽기: 박탈 경사 SII +4.4%p · RII 1.13배 (${rows[3].replace(/\s+/g, " ").slice(0, 80)})`);
  check(/BGV \d+\.\d\d/.test(rows[4]) && /√BGV = \d/.test(rows[4]) && /인구 가중/.test(rows[4]), "격차 읽기: 집단 간 분산 BGV·√BGV(시군구 인구 가중)");
  await pg.locator("details.dist-sum summary").click();
  check(/BGV/.test(await pg.locator("details.dist-sum").innerText()) && (await pg.locator("details.dist-sum thead th").allInnerTexts()).some((x) => /BGV/.test(x)), "분포 요약지표 표에 BGV 열");
  await pg.goto(`${BASE}/index.html#view=analysis&ind=DT_H_OBE_OBE&sido=008&year=2025&scope=sidoAll`, { waitUntil: "load" }); await pg.waitForTimeout(800);
  const gm = await pg.locator(".gap-main").innerText();
  check(/30곳 이하라 쓰지 않음/.test(gm), "17개 시도 비교에서는 분위 방식 미적용 표시");
  check(/17개 시도 비교에는 해당 없음/.test(gm) && /17개 시도 · \d{4}년 주민등록 인구 가중/.test(gm), "17개 시도 비교: SII 해당 없음 · BGV 는 17개 시도 인구 가중");
  await pg.close();
}
// 아르곤 검토 반영(2026-10-14): ③ 점수 구성 막대 · ④ 표 서식째 복사 · ① 계획 수립 단계 안내 띠
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, permissions: ["clipboard-read", "clipboard-write"] });
  const pg = await ctx.newPage();
  await pg.goto(`${BASE}/index.html#view=profile&sido=014&sgg=01401`, { waitUntil: "load" });
  await pg.waitForSelector(".eq-item .eq-sbar");
  const sb = await pg.$$eval(".eq-item", (els) => els.map((e) => {
    const nums = [...e.querySelectorAll(".eq-sbar-leg b")].map((x) => x.textContent);
    const tot = +(e.querySelector(".eq-sbar-h small")?.textContent.match(/([\d.]+) \/ 1/) || [])[1];
    const sum = nums.filter((x) => /^[\d.]+$/.test(x)).reduce((a, x) => a + +x, 0);
    const w = [...e.querySelectorAll(".eq-sbar-track td")].reduce((a, td) => a + parseFloat(td.style.width), 0);
    return { n: nums.length, tot, sum, w };
  }));
  check(sb.length > 0 && sb.every((x) => x.n === 4 && Math.abs(x.sum - x.tot) <= 0.02 && Math.abs(x.w - 100) <= 0.3), `점수 구성 막대: 항목마다 4요소, 범례 합 = 합계, 칸 너비 합 100% (${sb.map((x) => x.tot).join(", ")})`);
  await pg.goto(`${BASE}/index.html#view=profile&sido=001`, { waitUntil: "load" });
  await pg.waitForSelector(".eq-item .eq-sbar");
  check(/박탈\s*없음/.test(await pg.locator(".eq-item .eq-sbar-leg").first().innerText()), "점수 구성 막대: 시도(서울)는 박탈 「없음」(0점 아님)");
  // 순위 표기(2026-10-26 소유자 지적 "17위인데 양호하다고 써 있다"): 「(양호한 순)」 대신 구간 + 기준
  const pfTxt = await pg.locator(".profile").innerText();
  check(!/\(양호한 순\)|양호한 순 \d/.test(pfTxt) && /고혈압 진단 경험자의 치료율[\s\S]{0,120}17개 시도 중 17위 · 하위권 \(1위 = 가장 양호\)/.test(pfTxt), "서울 프로파일: 「(양호한 순)」 없음, 고혈압 치료율 「17개 시도 중 17위 · 하위권 (1위 = 가장 양호)」");
  const on = async () => (await pg.locator(".plan-steps button.on").innerText()).replace(/\s+/g, " ");
  check((await pg.locator(".plan-steps li").count()) === 5, "계획 수립 띠 5단계");
  await pg.locator(".plan-steps li").nth(2).locator("button").click(); await pg.waitForTimeout(2200);
  const rmrTop = await pg.evaluate(() => document.querySelector(".rmr-card")?.getBoundingClientRect().top);
  check(/격차/.test(await on()) && rmrTop != null && Math.abs(rmrTop) < 120, `계획 수립 띠 ③ 격차 → 지표 분석 「우리 지역 읽기」 (top ${Math.round(rmrTop)})`);
  await pg.locator(".plan-steps li").nth(3).locator("button").click(); await pg.waitForTimeout(2200);
  const eqTop = await pg.evaluate(() => document.querySelector(".eq-card")?.getBoundingClientRect().top);
  check(/우선순위/.test(await on()) && eqTop != null && Math.abs(eqTop) < 120, "계획 수립 띠 ④ → 우선 검토 항목 카드");
  await pg.locator(".plan-steps li").nth(4).locator("button").click(); await pg.waitForSelector(".rpt");
  check(await pg.evaluate(() => document.documentElement.scrollWidth - innerWidth) <= 1, "계획 수립 띠 ⑤ → 보고서, 390px 가로 넘침 없음");
  for (const v of ["report", "ireport", "elder"]) {
    await pg.goto(`${BASE}/index.html#view=${v}&sido=014&sgg=01401&ind=DT_H_SM`, { waitUntil: "load" });
    await pg.waitForSelector(".rpt");
    await pg.locator("button", { hasText: "표 서식째 복사" }).click(); await pg.waitForTimeout(400);
    const c = await pg.evaluate(async () => { const it = (await navigator.clipboard.read())[0]; const h = await (await it.getType("text/html")).text(); return { tbl: (h.match(/border="1"/g) || []).length, inl: /border:1px solid #999/.test(h), btn: /<button/.test(h), src: /자료원|출처/.test(h) }; });
    check(c.tbl >= 3 && c.inl && !c.btn && c.src, `${v}: 표 서식째 복사 — 클립보드 HTML 표 ${c.tbl}개(인라인 테두리, 버튼 제외, 출처 포함)`);
  }
  await ctx.close();
}
// WHO 건강 불평등 모니터링 기준(2026-10-16): 분포 요약지표·박탈 경사·자료원 대응표
{
  const pg = await b.newPage({ viewport: { width: 390, height: 900 } });
  await pg.goto(`${BASE}/index.html#view=analysis&ind=DT_H_OBE_OBE&sido=008&sgg=00819&year=2025&scope=nation`, { waitUntil: "load" });
  await pg.waitForSelector("details.dist-sum"); await pg.waitForTimeout(500);
  const sum = await pg.locator("details.dist-sum summary").innerText();
  check(/COV 12\.4%/.test(sum) && /MDMU 3\.4%p/.test(sum) && /258곳/.test(sum), `분포 요약지표: ${sum.replace(/\s+/g, " ").slice(0, 90)}`);
  await pg.locator("details.dist-sum summary").click(); await pg.waitForTimeout(200);
  check((await pg.locator("details.dist-sum tbody tr").count()) >= 5, "분포 요약지표 연도 표");
  const sii = await pg.locator(".sii-read").innerText();
  check(/경사불평등지수\(SII/.test(sii) && /상대불평등지수\(RII/.test(sii) && /95% 구간/.test(sii) && /\+4\.4%p/.test(sii) && /1\.13배/.test(sii), "건강형평성 카드: 박탈 경사 SII·RII(비만율 +4.4%p · 1.13배)");
  check(await pg.evaluate(() => document.documentElement.scrollWidth - innerWidth) <= 1, "390px 지표 분석 가로 넘침 없음(새 표 포함)");
  await pg.goto(`${BASE}/index.html#view=sources`, { waitUntil: "load" }); await pg.waitForSelector(".who-mon");
  const who = await pg.locator(".who-mon").innerText();
  check(/① 범위 정하기/.test(who) && /⑤ 지식 전환/.test(who) && /성별·연령·소득·교육/.test(who), "자료원 탭: WHO 5단계 대응표·한계");
  await pg.close();
}
// 메인 공유·검색 기본값(카톡·네이버·구글 미리보기): 설명·canonical·OG·JSON-LD, 미리보기 그림 1200×630
{
  const html = await (await fetch(`${BASE}/index.html`)).text();
  const head = html.slice(0, html.indexOf("</head>"));
  const has = (re) => re.test(head);
  check(has(/<meta name="description" content="[^"]{30,}"/) && has(/<link rel="canonical" href="https:\/\/health-profile\.kr\/"/), "메인 head: 설명·canonical");
  check(["og:title", "og:description", "og:image", "og:url", "twitter:card"].every((k) => head.includes(`"${k}"`)) && /og:image" content="https:\/\/health-profile\.kr\/og\.jpg"/.test(head), "메인 head: OG·트위터 카드(og.jpg)");
  const ld = head.match(/<script type="application\/ld\+json">([^<]+)<\/script>/);
  let okLd = false; try { const j = JSON.parse(ld[1]); okLd = j["@type"] === "WebApplication" && j.url === "https://health-profile.kr/" && !("aggregateRating" in j); } catch (e) {}
  check(okLd, "메인 head: JSON-LD WebApplication(평점·사용자 수 없음)");
  const { readFileSync } = await import("node:fs");
  const og = readFileSync(new URL("../../og.jpg", import.meta.url));
  let w = 0, h = 0; for (let i = 2; i < og.length - 9;) { if (og[i] !== 0xff) break; const m = og[i + 1], len = og.readUInt16BE(i + 2); if (m >= 0xc0 && m <= 0xc3) { h = og.readUInt16BE(i + 5); w = og.readUInt16BE(i + 7); break; } i += 2 + len; }
  check(w === 1200 && h === 630, `og.jpg ${w}×${h}`);
}
await b.close();
console.log("\n" + notes.join("\n"));
console.log(fails.length ? `\n실패 ${fails.length}건` : "\n전부 통과");
process.exit(fails.length ? 1 : 0);
