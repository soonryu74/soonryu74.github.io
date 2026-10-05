/* 보고서 화면 점검(rpt) — 실행: BASE=http://127.0.0.1:8911 node scripts/qa/report_region_e2e.mjs [출력 폴더] */
const { chromium } = await import("/opt/node22/lib/node_modules/playwright/index.mjs");
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const OUT = process.argv[2]; const fails=[]; const ck=(ok,m)=>{console.log(`${ok?"✔":"✘"} ${m}`); if(!ok) fails.push(m);};
for (const [w,h,s] of [[1440,900,"light"],[390,844,"dark"],[768,1024,"light"]]) {
  const ctx = await b.newContext({ viewport:{width:w,height:h}, colorScheme:s, acceptDownloads:true, permissions:["clipboard-read","clipboard-write"] });
  const pg = await ctx.newPage(); const errs=[]; pg.on("pageerror",e=>errs.push(e.message)); pg.on("console",m=>{if(m.type()==="error")errs.push(m.text());});
  await pg.goto((process.env.BASE || "http://127.0.0.1:8911") + "/index.html#view=profile&sido=009&sgg=00901", {waitUntil:"load"}); await pg.waitForTimeout(2200);
  await pg.getByRole("button",{name:/지역 보고서 만들기/}).first().click(); await pg.waitForTimeout(1800);
  ck(await pg.evaluate(()=>location.hash.includes("view=report")) && await pg.locator("article.rpt h1").innerText()==="강원 강릉시", `[${w}] 프로파일 → 보고서(강릉시)`);
  const sec = await pg.locator("article.rpt h2").allInnerTexts(); ck(sec.length>=6, `[${w}] 절 ${sec.length}개: ${sec.join(" | ")}`);
  ck(await pg.locator(".rpt-all tbody tr").count()===40, `[${w}] 전체 지표 표 40행`);
  ck(await pg.evaluate(()=>document.documentElement.scrollWidth-innerWidth)<=0, `[${w}] 가로 넘침 없음`);
  await pg.getByRole("button",{name:"📋 문장 초안 복사"}).click(); await pg.waitForTimeout(300);
  const clip = await pg.evaluate(()=>navigator.clipboard.readText()).catch(()=>"");
  ck(clip.includes("강원 강릉시의 지역사회건강조사 지표 40개"), `[${w}] 문장 초안 복사`);
  const [dl] = await Promise.all([pg.waitForEvent("download",{timeout:8000}).catch(()=>null), pg.getByRole("button",{name:/워드/}).click()]);
  if (dl) { const p = `${OUT}/report_${w}.doc`; await dl.saveAs(p); const fs = await import("node:fs"); const t=fs.readFileSync(p,"utf8"); ck(t.includes("<h1>강원 강릉시</h1>") && t.length>20000, `[${w}] 워드 저장 ${dl.suggestedFilename()} ${t.length}B`); } else ck(false, `[${w}] 워드 저장 다운로드 없음`);
  // 지역 바꾸면 보고서 갱신(시도 선택)
  await pg.goto((process.env.BASE || "http://127.0.0.1:8911") + "/index.html#view=report&sido=001", {waitUntil:"load"}); await pg.waitForTimeout(1800);
  ck((await pg.locator("article.rpt h1").innerText())==="서울특별시", `[${w}] 시도 보고서(서울)`);
  await pg.screenshot({ path:`${OUT}/report_${w}.png`, fullPage:false });
  if (w===1440) {
    await pg.goto((process.env.BASE || "http://127.0.0.1:8911") + "/index.html#view=report&sido=009&sgg=00901", {waitUntil:"load"}); await pg.waitForTimeout(2000);
    await pg.emulateMedia({ media:"print" });
    await pg.pdf({ path:`${OUT}/report.pdf`, format:"A4", printBackground:true });
    const hidden = await pg.evaluate(()=>["header.top",".controls",".rpt-actions",".reflist"].map(s=>{const e=document.querySelector(s);return e?getComputedStyle(e).display:"none";}));
    ck(hidden.every(d=>d==="none"), `인쇄 시 머리글·컨트롤·버튼·참고문헌 숨김 ${hidden}`);
  }
  // 홈 빠르게 보기 → 보고서
  await pg.emulateMedia({ media:"screen" });
  await pg.goto((process.env.BASE || "http://127.0.0.1:8911") + "/index.html", {waitUntil:"load"}); await pg.waitForTimeout(1500);
  await pg.fill("#heq-q","고흥"); await pg.locator(".heq-hits button").first().click(); await pg.waitForTimeout(300);
  await pg.getByRole("button",{name:"📄 지역 보고서 만들기"}).click(); await pg.waitForTimeout(1800);
  ck((await pg.locator("article.rpt h1").innerText())==="전남 고흥군", `[${w}] 홈 → 고흥군 보고서`);
  ck(errs.length===0, `[${w}] 오류 ${errs.length} ${errs.slice(0,2)}`);
  await ctx.close();
}
await b.close(); console.log(fails.length?`실패 ${fails.length}`:"전부 통과");
