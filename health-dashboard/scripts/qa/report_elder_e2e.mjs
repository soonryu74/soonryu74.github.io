/* 보고서 화면 점검(elrpt) — 실행: BASE=http://127.0.0.1:8911 node scripts/qa/report_elder_e2e.mjs [출력 폴더] */
const { chromium } = await import("/opt/node22/lib/node_modules/playwright/index.mjs");
const fs = await import("node:fs");
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const OUT = process.argv[2]; const fails=[]; const ck=(ok,m)=>{console.log(`${ok?"✔":"✘"} ${m}`); if(!ok) fails.push(m);};
const U = (process.env.BASE || "http://127.0.0.1:8911") + "/index.html";
for (const [w,h,s] of [[1440,900,"light"],[390,844,"dark"],[430,932,"light"],[768,1024,"light"]]) {
  const ctx = await b.newContext({ viewport:{width:w,height:h}, colorScheme:s, acceptDownloads:true, permissions:["clipboard-read","clipboard-write"] });
  const pg = await ctx.newPage(); const errs=[]; pg.on("pageerror",e=>errs.push(e.message)); pg.on("console",m=>{if(m.type()==="error")errs.push(m.text());});
  await pg.goto(`${U}#view=home&sido=009&sgg=00901`, {waitUntil:"load"}); await pg.waitForTimeout(1800);
  await pg.getByRole("button",{name:/고령층\(65세\+\) 취약 보고서/}).first().click(); await pg.waitForTimeout(2000);
  ck(await pg.evaluate(()=>location.hash.includes("view=elder")), `[${w}] 홈 ④ → elder`);
  ck((await pg.locator("article.rpt h1").innerText()).includes("고령층"), `[${w}] 제목`);
  const sec = await pg.locator("article.rpt h2").allInnerTexts(); ck(sec.length>=7, `[${w}] 절 ${sec.length}: ${sec.join(" | ")}`);
  const ns = await pg.locator(".rpt-vul tbody tr").count(); ck(ns>=20 && ns<=80, `[${w}] 신호 지역 ${ns}행`);
  ck(await pg.locator("article.rpt .rpt-sum th").filter({hasText:"강원 강릉시"}).count()===1, `[${w}] 선택 지역(강릉) 요약 행`);
  { // 「복합 고령 취약 신호 시군구」 정의 상자: 2절(표 바로 위)·4절, 6개 항목 이름 포함
    const NAMES = ["독거노인", "기초연금", "저작불편", "폐렴", "낙상", "교통사고"];
    const defs = await pg.$$eval("article.rpt section", (ss) => ss.map((s) => { const d = s.querySelector(".rpt-def"); return d ? { h: s.querySelector("h2")?.textContent || "", t: d.textContent, beforeTable: !!(d.nextElementSibling && d.nextElementSibling.tagName === "TABLE") } : null; }).filter(Boolean));
    const s2 = defs.find((d) => d.h.includes("시도별")), s4 = defs.find((d) => d.h.includes("복합 고령 취약 신호 지역"));
    ck(!!s2 && s2.beforeTable && !!s4 && [s2, s4].every((d) => NAMES.every((n) => d.t.includes(n)) && /3개 이상/.test(d.t) && /4개 미만/.test(d.t)), `[${w}] 정의 상자 2절(표 위)·4절 — 항목 6개·3개 이상·4개 미만 미판정`);
  }
  ck(await pg.evaluate(()=>document.documentElement.scrollWidth-innerWidth)<=0, `[${w}] 가로 넘침 없음`);
  ck(await pg.locator(".yearctrl").count()===0, `[${w}] 연도 컨트롤 숨김`);
  await pg.getByRole("button",{name:"📋 문장 초안 복사"}).click(); await pg.waitForTimeout(300);
  const clip = await pg.evaluate(()=>navigator.clipboard.readText()).catch(()=>"");
  ck(clip.includes("65세 이상") && clip.includes("복합 고령 취약 신호"), `[${w}] 초안 복사`);
  if (w===1440) {
    for (const [btn, ext] of [[/워드/, "doc"], [/전체 시군구 CSV/, "csv"]]) {
      const [dl] = await Promise.all([pg.waitForEvent("download",{timeout:8000}).catch(()=>null), pg.getByRole("button",{name:btn}).click()]);
      if (dl) { const p = `${OUT}/el.${ext}`; await dl.saveAs(p); const t=fs.readFileSync(p,"utf8"); ck(ext==="doc" ? (t.includes("고령층 취약 현황") && !t.includes("예방·관리 탭에서") && (t.match(/class="rpt-def"/g)||[]).length===2 && t.includes("신호 지역 수 / 시도 안 시군구 수")) : t.trim().split("\n").length===230, `[${w}] ${ext} ${t.length}B ${t.trim().split("\n").length}줄`); }
      else ck(false, `[${w}] ${ext} 다운로드 없음`);
    }
    await pg.waitForTimeout(2500);
    await pg.emulateMedia({ media:"print" }); await pg.pdf({ path:`${OUT}/el.pdf`, format:"A4", printBackground:true });
    const hidden = await pg.evaluate(()=>["header.top",".controls",".rpt-actions",".rpt-noprint"].map(s=>{const e=document.querySelector(s);return e?getComputedStyle(e).display:"none";}));
    ck(hidden.every(d=>d==="none"), `인쇄 숨김 ${hidden}`);
    await pg.emulateMedia({ media:"screen" });
    // 전환
    await pg.locator(".rpt-mode").getByRole("button",{name:"지역별", exact:true}).click(); await pg.waitForTimeout(1500);
    ck((await pg.locator("article.rpt h1").innerText())==="강원 강릉시", `고령층 → 지역별`);
    await pg.locator(".rpt-mode").getByRole("button",{name:"고령층 65+"}).click(); await pg.waitForTimeout(1500);
    ck(await pg.evaluate(()=>location.hash.includes("view=elder")), `지역별 → 고령층`);
    await pg.locator(".rpt-mode").getByRole("button",{name:"지표별", exact:true}).click(); await pg.waitForTimeout(1500);
    ck(await pg.evaluate(()=>location.hash.includes("view=ireport")), `고령층 → 지표별`);
    // 시도 선택
    await pg.goto(`${U}#view=elder&sido=013`, {waitUntil:"load"}); await pg.waitForTimeout(1800);
    ck(await pg.locator("article.rpt .rpt-sum th").filter({hasText:"전라남도"}).count()===1, `시도(전남) 요약 행`);
    // 신호 지역 강조: 영암군 01322?
    // 프로파일 RiskCard 링크
    await pg.goto(`${U}#view=profile&sido=009&sgg=00901`, {waitUntil:"load"}); await pg.waitForTimeout(2500);
    await pg.getByRole("button",{name:"고령층(65세+) 취약 보고서 →"}).click(); await pg.waitForTimeout(1500);
    ck(await pg.evaluate(()=>location.hash.includes("view=elder")), `프로파일 고위험군 카드 → elder`);
    // 검색
    await pg.keyboard.press("/"); await pg.waitForTimeout(300); await pg.keyboard.type("독거노인"); await pg.waitForTimeout(400);
    const first = await pg.locator(".srch-item").first().innerText(); console.log("  search first:", first.replace(/\n/g," "));
  }
  await pg.screenshot({ path:`${OUT}/el_${w}.png`, fullPage:false });
  ck(errs.length===0, `[${w}] 오류 ${errs.length} ${errs.slice(0,2)}`);
  await ctx.close();
}
await b.close(); console.log(fails.length?`실패 ${fails.length}`:"전부 통과");
