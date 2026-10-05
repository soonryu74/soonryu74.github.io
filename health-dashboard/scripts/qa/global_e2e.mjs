/* Global Health Equity Radar(/global/) 검증 — 원본 WDI JSON 과 화면을 독립적으로 대조한다.
   사용: 로컬 서버(health-dashboard 를 루트로 8911)를 띄운 뒤 node scripts/qa/global_e2e.mjs [출력 폴더]
   점검: 4개 화면 크기·라이트/다크 오류·가로 넘침 / 5개국(+TLS·UGA) 전 지표 값·연도 = 원본 / 결측은 「No data available」 /
   우선 신호를 원본에서 따로 계산한 백분위로 재확인(방향 포함) / 무작위 10개 데이터 포인트 / 비교 연도 표기 / 검색 / WHY / 지도 / 방법론 / 금지 표현 */
import { readFileSync, mkdirSync } from "node:fs";
const { chromium } = await import("/opt/node22/lib/node_modules/playwright/index.mjs");
const ROOT = new URL("../../", import.meta.url).pathname;
const OUT = process.argv[2] || "/tmp/global_e2e"; mkdirSync(OUT, { recursive: true });
const BASE = process.env.BASE || "http://127.0.0.1:8911/global/";
const RAW = JSON.parse(readFileSync(ROOT + "global/data/health_equity_wdi_latest.json", "utf8"));
const IND = JSON.parse(readFileSync(ROOT + "global/data/indicators.json", "utf8"));
const fails = []; const ck = (ok, m) => { console.log(`${ok ? "✔" : "✘"} ${m}`); if (!ok) fails.push(m); };
const raw = {}; for (const r of RAW) (raw[r["Country Code"]] ||= {})[r["Indicator Code"]] = r;
const byLabel = Object.fromEntries(Object.values(IND).map((i) => [i.label, i]));

// 원본에서 독립 계산: 같은 소득그룹·2015년 이후 값 중 더 양호한 비율(동률 절반)
function indepU(c, code) {
  const me = raw[c][code], ind = IND[code]; if (!me || me.year < 2015 || ind.direction === "context") return null;
  if (code === "SI.POV.DDAY" && me["Income Group"] === "High income") return null; // 공개 규칙: 고소득국 빈곤($3.00) 신호 제외
  let pool = RAW.filter((r) => r["Indicator Code"] === code && r.year >= 2015 && r["Income Group"] === me["Income Group"]);
  if (pool.length < 10) pool = RAW.filter((r) => r["Indicator Code"] === code && r.year >= 2015);
  const hi = ind.direction === "higher_is_concern"; let better = 0, tie = 0;
  for (const p of pool) { if (p.value === me.value) tie++; else if (hi ? p.value < me.value : p.value > me.value) better++; }
  return (better + tie / 2) / pool.length;
}
const num = (t) => { const m = t.replace(/,/g, "").match(/-?\d+(\.\d+)?/); return m ? parseFloat(m[0]) : NaN; };
function valueMatches(text, r) {
  const v = r.value, code = r["Indicator Code"];
  if (code === "SP.POP.TOTL") { const n = num(text) * (/billion/.test(text) ? 1e9 : /million/.test(text) ? 1e6 : 1); return Math.abs(n - v) / v < 0.01; }
  const n = num(text), dec = (text.replace(/,/g, "").match(/\.(\d+)/) || ["", ""])[1].length;
  return Math.abs(n - v) <= 0.5 * 10 ** -dec + 1e-9;
}
async function readTable(pg) {
  return pg.$$eval(".country .itbl tbody tr:not(.dom)", (trs) => trs.map((tr) => ({ label: tr.querySelector("summary")?.textContent.trim(), value: tr.children[1]?.textContent.trim(), year: tr.children[2]?.textContent.trim(), pos: tr.children[3]?.textContent.trim() })));
}

const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
// 1) 화면 크기·테마
for (const [w, h, s] of [[390, 844, "light"], [430, 932, "dark"], [768, 1024, "light"], [1440, 900, "dark"]]) {
  const pg = await (await b.newContext({ viewport: { width: w, height: h }, colorScheme: s })).newPage(); const errs = [];
  pg.on("pageerror", (e) => errs.push(e.message)); pg.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
  await pg.goto(BASE + "#c=KOR", { waitUntil: "load" }); await pg.waitForSelector("html[data-ready='1']");
  await pg.evaluate(() => document.getElementById("map").scrollIntoView()); await pg.waitForSelector("#map-body svg path", { timeout: 15000 });
  const ov = await pg.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  ck(errs.length === 0 && ov <= 0, `[${w} ${s}] JS 오류 ${errs.length} · 가로 넘침 ${ov}px`);
  await pg.screenshot({ path: `${OUT}/global_${w}_${s}.png`, fullPage: false });
  await pg.close();
}
const pg = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage(); const errs = [];
pg.on("pageerror", (e) => errs.push(e.message));
await pg.goto(BASE + "#c=KOR", { waitUntil: "load" }); await pg.waitForSelector("html[data-ready='1']");

// 2) 커버리지 숫자 = 원본
const cov = await pg.locator("#cov").innerText();
const nC = new Set(RAW.map((r) => r["Country Code"])).size, nI = new Set(RAW.map((r) => r["Indicator Code"])).size;
ck(cov.includes(String(nC)) && cov.includes(String(nI)) && cov.includes(RAW.length.toLocaleString("en-US")), `커버리지 ${nC}개국·${nI}개 지표·${RAW.length}개 관측 표시`);

// 3) 국가별 전 지표 대조 + 신호 재계산
for (const c of ["KOR", "VNM", "USA", "JPN", "AUS", "TLS", "UGA"]) {
  await pg.goto(BASE + `#c=${c}`); await pg.waitForFunction((cc) => window.__GHER?.S.sel === cc, c); await pg.waitForTimeout(150);
  const rows = await readTable(pg);
  let ok = 0, bad = [], missOk = 0, missBad = [];
  for (const r of rows) {
    const ind = byLabel[r.label], src = raw[c][ind.code];
    if (!src) { (r.value === "No data available" ? missOk++ : missBad.push(r.label)); continue; }
    if (String(src.year) === r.year && valueMatches(r.value, src)) ok++; else bad.push(`${r.label}: UI ${r.value} ${r.year} vs ${src.value} ${src.year}`);
  }
  const expectMissing = nI - Object.keys(raw[c]).length;
  ck(rows.length === nI && bad.length === 0, `[${c}] ${rows.length}개 지표 값·연도 원본 일치 ${ok}${bad.length ? " — " + bad.slice(0, 2).join(" | ") : ""}`);
  ck(missOk === expectMissing && !missBad.length, `[${c}] 결측 ${expectMissing}개 → 「No data available」 ${missOk}개(0 으로 표시 없음)`);
  // 신호: 화면의 Priority signal 목록 = 원본에서 독립 계산한 u ≥ 0.8
  const uiSig = await pg.$$eval(".sigs > .sig", (els) => els.filter((e) => e.querySelector(".t-priority")).map((e) => e.querySelector(".sig-name").textContent.trim()));
  const indep = Object.keys(raw[c]).filter((code) => { const u = indepU(c, code); return u != null && u >= 0.8; }).map((code) => IND[code].label);
  const same = uiSig.length === indep.length && indep.every((l) => uiSig.includes(l));
  ck(same, `[${c}] 우선 신호 ${uiSig.length}개 = 독립 재계산 ${indep.length}개 (${uiSig.join(", ") || "없음"})`);
  // 방향: 높을수록 우려 지표의 신호는 값이 비교 집단 중앙값보다 높아야 한다
  for (const l of uiSig) {
    const ind = byLabel[l], me = raw[c][ind.code].value;
    const pool = RAW.filter((r) => r["Indicator Code"] === ind.code && r.year >= 2015 && r["Income Group"] === raw[c][ind.code]["Income Group"]).map((r) => r.value).sort((a, b) => a - b);
    const med = pool[Math.floor(pool.length / 2)];
    const okDir = ind.direction === "higher_is_concern" ? me >= med : me <= med;
    if (!okDir) ck(false, `[${c}] 방향 오류 ${l}`);
  }
  const srcShown = await pg.$$eval(".country .ind-info", (els) => els.filter((e) => /Source:/.test(e.textContent)).length);
  ck(srcShown === nI, `[${c}] 지표마다 출처 표시 ${srcShown}/${nI}`);
}

// 4) 무작위 10개 데이터 포인트(고정 시드)
let seed = 20261005; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
const picks = Array.from({ length: 10 }, () => RAW[Math.floor(rnd() * RAW.length)]);
let rok = 0;
for (const r of picks) {
  await pg.goto(BASE + `#c=${r["Country Code"]}`); await pg.waitForFunction((cc) => window.__GHER?.S.sel === cc, r["Country Code"]);
  const row = (await readTable(pg)).find((x) => x.label === IND[r["Indicator Code"]].label);
  const good = row && row.year === String(r.year) && valueMatches(row.value, r);
  if (good) rok++;
  console.log(`   ${good ? "·" : "✘"} ${r["Country Name"]} · ${r.radar_label}: 원본 ${r.value} (${r.year}) / 화면 ${row?.value} (${row?.year})`);
}
ck(rok === 10, `무작위 10개 데이터 포인트 화면 = 원본 ${rok}/10`);

// 5) WHY · ACTION
await pg.goto(BASE + "#c=VNM"); await pg.waitForFunction(() => window.__GHER?.S.sel === "VNM");
await pg.locator(".sigs > .sig .sig-head").first().click();
const why = await pg.locator(".why:not([hidden])").first().innerText();
ck(/latest available: \d{4}/.test(why) && /less favourable direction/.test(why) && /does not establish a cause/.test(why), "WHY: 값·연도·비교 집단·인과 아님 문구");
ck(await pg.locator(".acts .act").count() >= 1, `ACTION: 가능한 행동 영역 ${await pg.locator(".acts .act").count()}개(신호 지표에만)`);

// 6) 비교 — 연도 각각 표기
await pg.goto(BASE + "#c=KOR&vs=VNM"); await pg.waitForFunction(() => window.__GHER?.S.vs === "VNM");
const cmpRows = await pg.$$eval(".ctbl tbody tr", (trs) => trs.map((tr) => [tr.children[1].textContent, tr.children[2].textContent, tr.children[3].textContent]));
const diffYears = Object.keys(IND).filter((code) => raw.KOR[code] && raw.VNM[code] && raw.KOR[code].year !== raw.VNM[code].year).length;
ck(cmpRows.length === nI && cmpRows.filter((r) => /Different years/.test(r[2])).length === diffYears, `비교 KOR vs VNM: ${cmpRows.length}행, 연도 다른 지표 ${diffYears}개 모두 표시`);

// 7) 검색
for (const [q, want] of [["Vietnam", "VNM"], ["korea", "KOR"], ["united st", "USA"]]) {
  await pg.fill("#q", q); await pg.waitForTimeout(100); await pg.keyboard.press("Enter"); await pg.waitForTimeout(200);
  ck(await pg.evaluate(() => window.__GHER.S.sel) === want, `검색 「${q}」 → ${want}`);
}

// 8) 지도
await pg.evaluate(() => document.getElementById("map").scrollIntoView()); await pg.waitForSelector("#map-body svg path");
const nPath = await pg.locator("#map-body path").count(), nHas = await pg.locator("#map-body path.has").count();
await pg.selectOption("#map-ind", "SH.TBS.INCD"); await pg.waitForTimeout(300);
await pg.locator('#map-body path[data-c="UGA"]').click(); await pg.waitForTimeout(300);
ck(nPath > 150 && nHas > 120 && (await pg.evaluate(() => window.__GHER.S.sel)) === "UGA", `지도: 경계 ${nPath}개·색칠 ${nHas}개, 지표 전환·클릭으로 국가 선택`);

// 9) 방법론
await pg.goto(BASE + "methodology/"); await pg.waitForFunction(() => document.querySelectorAll("#m-table tbody tr").length > 0);
ck((await pg.locator("#m-table tbody tr").count()) === nI, `방법론 지표 표 ${nI}행`);
const mtxt = await pg.locator("main").innerText();
ck(["Data source", "Indicator selection", "Latest available year", "Missing data", "Comparison method", "Priority Signal", "Exploratory Priority Score", "Limitations", "License"].every((k) => mtxt.includes(k)), "방법론 9개 항목");

// 10) 금지 표현(본문 텍스트)
await pg.goto(BASE + "#c=KOR"); await pg.waitForSelector("html[data-ready='1']");
const all = (await pg.locator("body").innerText()) + mtxt;
const banned = ["WHO-supported", "WHO-approved", "MIT-supported", "MIT-funded", "AI predicts", "AI recommends", "real-time surveillance", "proven globally", "risk map"];
const hit = banned.filter((w) => all.toLowerCase().includes(w.toLowerCase()));
ck(hit.length === 0, `금지 표현 0 (${hit.join(", ")})`);
ck(errs.length === 0, `오류 ${errs.length}`);
await b.close();
console.log(fails.length ? `\n실패 ${fails.length}` : "\n전부 통과");
process.exit(fails.length ? 1 : 0);
