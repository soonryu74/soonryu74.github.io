/* 방문 기록·머리글 점검(2026-10-05 소유자 제보 "브라우저 ← 를 누르면 구글로 나가 버린다", "A−·A+ 가 끊기지 않게", "이메일 보내기 후 창이 안 뜬다").
   실행: BASE=http://127.0.0.1:8911 node scripts/qa/history_e2e.mjs [출력 폴더]  (index.html·global/ 이 있는 정적 서버)
   점검: 이동(화면·지역·지표)은 기록이 쌓이고 연도·설정 변경은 쌓이지 않음 · ← 순서대로 되돌아가고 마지막에만 사이트 밖 ·
         「← 이전」 버튼(첫 진입엔 없음) · 새로고침 후 유지 · 검색 이동 1번 = 기록 1개 · 공유 링크 첫 진입 · 머리글 도구 한 줄 묶음 ·
         Gmail 작성 주소 · Global 나라 선택 뒤로 가기 */
import { mkdirSync } from "node:fs";
const { chromium } = await import("/opt/node22/lib/node_modules/playwright/index.mjs");
const BASE = process.env.BASE || "http://127.0.0.1:8911";
const OUT = process.argv[2] || "/tmp/history_e2e"; mkdirSync(OUT, { recursive: true });
const fails = []; const ck = (ok, m) => { console.log(`${ok ? "✔" : "✘"} ${m}`); if (!ok) fails.push(m); };
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

for (const [w, h] of [[1280, 900], [390, 844]]) {
  const pg = await (await b.newContext({ viewport: { width: w, height: h } })).newPage(); const errs = [];
  pg.on("pageerror", (e) => errs.push(e.message));
  const hv = () => pg.evaluate(() => new URLSearchParams(location.hash.slice(1)).get("view") || (location.hash ? "?" : "home"));
  const hp = (k) => pg.evaluate((kk) => new URLSearchParams(location.hash.slice(1)).get(kk), k);
  const tab = (t) => pg.locator(`.seg.views .seg-btn`, { hasText: t }).first().click();
  await pg.goto("about:blank");
  await pg.goto(BASE + "/"); await pg.waitForSelector(".seg.views");
  const len0 = await pg.evaluate(() => history.length);
  ck(await pg.locator(".back-btn").count() === 0, `[${w}] 첫 진입엔 「← 이전」 없음`);
  await tab("지표 분석"); await pg.waitForTimeout(150);
  await tab("지역 프로파일"); await pg.waitForTimeout(300);
  ck(await pg.locator(".back-btn").count() === 1, `[${w}] 이동 후 「← 이전」 보임`);
  // 지역 변경(서울 → 강릉) — 지역 선택기 대신 앱의 검색 이동 경로와 같은 상태 변경을 해시로 한 번에
  const before = await pg.evaluate(() => history.length);
  await pg.locator(".topright button", { hasText: "검색" }).first().click();
  await pg.keyboard.type("강릉"); await pg.waitForTimeout(300); await pg.keyboard.press("Enter"); await pg.waitForTimeout(400);
  const afterSearch = await pg.evaluate(() => history.length);
  ck(afterSearch - before === 1 && (await hp("sgg")) === "00901", `[${w}] 검색 「강릉」 이동 = 기록 +${afterSearch - before} (sgg ${await hp("sgg")})`);
  const viewAfterSearch = await hv();
  // 연도 변경은 기록을 늘리지 않음(지표 분석 화면에서)
  await tab("지표 분석"); await pg.waitForTimeout(200);
  const lenA = await pg.evaluate(() => history.length);
  const slider = pg.locator('.controls input[type="range"]').first();
  if (await slider.count()) {
    for (let i = 0; i < 5; i++) { await slider.focus(); await pg.keyboard.press("ArrowLeft"); await pg.waitForTimeout(60); }
  }
  const yearNow = await hp("year");
  ck((await pg.evaluate(() => history.length)) === lenA && yearNow !== null, `[${w}] 연도 5번 변경 → 기록 그대로 (year=${yearNow})`);
  ck(await hp("year") === yearNow, `[${w}] 연도는 주소에 반영`);
  // 뒤로 가기 순서
  const seq = [];
  await pg.goBack(); await pg.waitForTimeout(250); seq.push(`${await hv()}:${await hp("sgg") || "-"}`);   // 검색 직후 화면(강릉)
  await pg.goBack(); await pg.waitForTimeout(250); seq.push(`${await hv()}:${await hp("sgg") || "-"}`);   // 서울 프로파일
  await pg.goBack(); await pg.waitForTimeout(250); seq.push(`${await hv()}:${await hp("sgg") || "-"}`);   // 지표 분석
  await pg.goBack(); await pg.waitForTimeout(250); seq.push(`${await hv()}:${await hp("sgg") || "-"}`);   // 홈
  const shownView = await pg.evaluate(() => document.querySelector(".seg.views .seg-btn.on")?.textContent.trim());
  ck(seq[0] === `${viewAfterSearch}:00901` && seq[1] === "profile:-" && seq[2] === "analysis:-" && seq[3] === "home:-" && shownView === "홈", `[${w}] ← 순서: ${seq.join(" → ")} (화면 탭 ${shownView})`);
  ck(pg.url().startsWith(BASE), `[${w}] 아직 사이트 안 (${pg.url().slice(0, 40)}…)`);
  await pg.goBack(); await pg.waitForTimeout(300);
  ck(pg.url() === "about:blank", `[${w}] 그다음 ← 에서만 사이트 밖(${pg.url()})`);
  // 앞으로 → 다시 사이트, 「← 이전」 버튼으로 되돌아가기
  await pg.goForward(); await pg.waitForSelector(".seg.views"); await pg.goForward(); await pg.waitForTimeout(300);
  ck(await hv() === "analysis", `[${w}] → 앞으로 가기 (view ${await hv()})`);
  await tab("핫스팟"); await pg.waitForTimeout(200);
  await pg.locator(".back-btn").click(); await pg.waitForTimeout(300);
  ck(await hv() === "analysis", `[${w}] 「← 이전」 버튼 → 직전 화면 (view ${await hv()})`);
  // 새로고침 후 상태·버튼 유지
  await pg.reload(); await pg.waitForSelector(".seg.views"); await pg.waitForTimeout(200);
  ck(await hv() === "analysis" && (await pg.locator(".back-btn").count()) === 1, `[${w}] 새로고침 후 화면·「← 이전」 유지`);
  // 머리글: A−·A+·다크가 같은 줄(한 묶음)
  const grp = await pg.$$eval(".tool-grp > button", (bs) => bs.map((x) => Math.round(x.getBoundingClientRect().top)));
  const ov = await pg.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  ck(grp.length === 3 && new Set(grp).size === 1 && ov <= 0, `[${w}] A−·A+·다크 한 줄 (top ${grp.join(",")}) · 가로 넘침 ${ov}px`);
  await pg.screenshot({ path: `${OUT}/header_${w}.png`, clip: { x: 0, y: 0, width: w, height: Math.min(260, h) } });
  // Gmail 작성 주소
  await tab("의견·문의"); await pg.waitForSelector(".fb-form textarea");
  await pg.fill(".fb-form textarea", "뒤로 가기 점검용 문장입니다.");
  const gm = await pg.locator(".fb-actions a", { hasText: "Gmail" }).getAttribute("href");
  const u = new URL(gm);
  ck(u.host === "mail.google.com" && u.searchParams.get("view") === "cm" && u.searchParams.get("to") && /점검용/.test(u.searchParams.get("body")), `[${w}] Gmail로 보내기 → mail.google.com 작성 창(to ${u.searchParams.get("to")})`);
  ck(errs.length === 0, `[${w}] JS 오류 ${errs.length}`);
  await pg.close();
}
// 공유 링크로 바로 들어온 경우: 첫 기록은 그대로(뒤로 = 밖)
{
  const pg = await (await b.newContext()).newPage();
  await pg.goto("about:blank"); await pg.goto(BASE + "/#view=profile&sido=009&sgg=00901"); await pg.waitForSelector(".seg.views"); await pg.waitForTimeout(300);
  ck(await pg.locator(".back-btn").count() === 0, "공유 링크 첫 진입: 「← 이전」 없음");
  await pg.goBack(); await pg.waitForTimeout(300);
  ck(pg.url() === "about:blank", "공유 링크 첫 진입에서 ← = 들어오기 전 페이지");
  await pg.close();
}
// 사용 의견 → 파일 저장(.json): 서버 전송 없음, 맥락(시각·화면 크기·화면·지역·지표)만, 개인정보 칸 없음
{
  const pg = await (await b.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true })).newPage();
  await pg.goto(BASE + "/#view=profile&sido=009&sgg=00901&en=1"); await pg.waitForSelector(".uf-btn");
  await pg.locator(".uf-btn").first().click(); await pg.waitForSelector(".uf-box");
  await pg.locator(".uf-box select").selectOption({ index: 1 });
  await pg.locator('.uf-box input[name="uf-q0"][value="4"]').check();
  const [dl] = await Promise.all([pg.waitForEvent("download"), pg.locator(".uf-box button", { hasText: ".json" }).click()]);
  const j = JSON.parse(await (await import("node:fs")).promises.readFile(await dl.path(), "utf8"));
  const okKeys = ["timestamp", "viewport", "view", "region_code", "indicator_id", "role", "q1_easy_to_find", "page"].every((k) => k in j);
  const noPii = !Object.keys(j).some((k) => /name|email|phone|contact/i.test(k));
  ck(okKeys && noPii && j.view === "profile" && j.region_code === "00901" && j.q1_easy_to_find === 4 && /^\d{3,4}x\d{3,4}$/.test(j.viewport), `사용 의견 .json 저장(${dl.suggestedFilename()}): 시각·화면 크기 ${j.viewport}·화면 ${j.view}·지역 ${j.region_code}·지표 ${j.indicator_id}·개인정보 칸 없음`);
  await pg.close();
}
// Global: 나라 선택 → 뒤로 = 이전 나라
{
  const pg = await (await b.newContext()).newPage();
  await pg.goto("about:blank"); await pg.goto(BASE + "/global/#c=KOR"); await pg.waitForSelector("html[data-ready='1']");
  await pg.locator('[data-quick="VNM"]').click(); await pg.waitForTimeout(200);
  await pg.locator('[data-quick="JPN"]').click(); await pg.waitForTimeout(200);
  await pg.goBack(); await pg.waitForTimeout(300); const a = await pg.evaluate(() => window.__GHER.S.sel);
  await pg.goBack(); await pg.waitForTimeout(300); const c = await pg.evaluate(() => window.__GHER.S.sel);
  ck(a === "VNM" && c === "KOR" && (await pg.locator("#ov-h").innerText()).includes("Korea"), `Global ← : JPN → ${a} → ${c}`);
  await pg.close();
}
await b.close();
console.log(fails.length ? `\n실패 ${fails.length}` : "\n전부 통과");
process.exit(fails.length ? 1 : 0);
