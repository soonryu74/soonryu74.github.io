/* 보고서 화면 점검(irpt) — 실행: BASE=http://127.0.0.1:8911 node scripts/qa/report_indicator_e2e.mjs [출력 폴더] */
const { chromium } = await import("/opt/node22/lib/node_modules/playwright/index.mjs");
const fs = await import("node:fs");
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const OUT = process.argv[2]; const fails=[]; const ck=(ok,m)=>{console.log(`${ok?"✔":"✘"} ${m}`); if(!ok) fails.push(m);};
const U = (process.env.BASE || "http://127.0.0.1:8911") + "/index.html";
for (const [w,h,s] of [[1440,900,"light"],[390,844,"dark"],[430,932,"light"],[768,1024,"light"]]) {
  const ctx = await b.newContext({ viewport:{width:w,height:h}, colorScheme:s, acceptDownloads:true, permissions:["clipboard-read","clipboard-write"] });
  const pg = await ctx.newPage(); const errs=[]; pg.on("pageerror",e=>errs.push(e.message)); pg.on("console",m=>{if(m.type()==="error")errs.push(m.text());});
  // 지표 분석(현재흡연율, 강릉) → 버튼
  await pg.goto(`${U}#view=analysis&ind=DT_H_SM&sido=009&sgg=00901`, {waitUntil:"load"}); await pg.waitForTimeout(2200);
  await pg.getByRole("button",{name:/전국 취약지역 보고서/}).click(); await pg.waitForTimeout(2000);
  ck(await pg.evaluate(()=>location.hash.includes("view=ireport")), `[${w}] 지표 분석 → ireport`);
  ck((await pg.locator("article.rpt h1").innerText())==="현재흡연율", `[${w}] 제목 현재흡연율`);
  const sec = await pg.locator("article.rpt h2").allInnerTexts(); ck(sec.length>=8, `[${w}] 절 ${sec.length}개: ${sec.join(" | ")}`);
  const nv = await pg.locator(".rpt-vul tbody tr").count(); ck(nv>=20 && nv<=30, `[${w}] 검토 대상 ${nv}행`);
  ck(await pg.locator(".rpt-bar").count()===17, `[${w}] 시도 막대 17`);
  ck(await pg.evaluate(()=>document.documentElement.scrollWidth-innerWidth)<=0, `[${w}] 가로 넘침 없음`);
  ck(await pg.locator(".controls select, .controls input").count()>0 && await pg.locator(".yearctrl").count()===0, `[${w}] 지표 선택 있음·연도 컨트롤 숨김`);
  await pg.getByRole("button",{name:"📋 문장 초안 복사"}).click(); await pg.waitForTimeout(300);
  const clip = await pg.evaluate(()=>navigator.clipboard.readText()).catch(()=>"");
  ck(clip.includes("「현재흡연율」의") && clip.includes("검토 대상"), `[${w}] 초안 복사`);
  if (w===1440) {
    for (const [btn, ext] of [[/워드/, "doc"], [/전체 지역 CSV/, "csv"]]) {
      const [dl] = await Promise.all([pg.waitForEvent("download",{timeout:8000}).catch(()=>null), pg.getByRole("button",{name:btn}).click()]);
      if (dl) { const p = `${OUT}/ir.${ext}`; await dl.saveAs(p); const t=fs.readFileSync(p,"utf8"); ck(ext==="doc" ? (t.includes("<h1>현재흡연율</h1>") && !t.includes("예방·관리 탭에서")) : t.split("\n").length>=250, `[${w}] ${ext} 저장 ${t.length}B ${t.split("\n").length}줄`); }
      else ck(false, `[${w}] ${ext} 다운로드 없음`);
    }
    await pg.emulateMedia({ media:"print" }); await pg.pdf({ path:`${OUT}/ir.pdf`, format:"A4", printBackground:true });
    const hidden = await pg.evaluate(()=>["header.top",".controls",".rpt-actions",".rpt-noprint"].map(s=>{const e=document.querySelector(s);return e?getComputedStyle(e).display:"none";}));
    ck(hidden.every(d=>d==="none"), `인쇄 숨김 ${hidden}`);
    await pg.emulateMedia({ media:"screen" });
    // 강릉 행 강조 여부(검토 대상에 있으면)
    console.log("  rpt-me rows", await pg.locator(".rpt-me").count());
    // 지표 바꾸기: 고위험음주율 via hash
    await pg.goto(`${U}#view=ireport&ind=DT_117075_H_DR_HIGH_WH&sido=009&sgg=00901`, {waitUntil:"load"}); await pg.waitForTimeout(2000);
    ck((await pg.locator("article.rpt h1").innerText())==="고위험음주율", `고위험음주율 보고서`);
    // 행정 지표(CI 열 없음)
    await pg.goto(`${U}#view=ireport&ind=K_CHK_RATE&sido=009`, {waitUntil:"load"}); await pg.waitForTimeout(2000);
    const th = await pg.locator(".rpt-vul thead th").allInnerTexts(); ck(!th.includes("95% CI"), `행정 지표 CI 열 없음 ${th.join(",")}`);
    // 맥락 지표 안내
    const ctxId = await pg.evaluate(()=>null);
    await pg.goto(`${U}#view=ireport&ind=K_POP_TOTAL&sido=009`, {waitUntil:"load"}); await pg.waitForTimeout(1500);
    console.log("  context notice:", (await pg.locator(".rpt-actions .desc").first().innerText().catch(()=>"(none)")).slice(0,80), "| h1:", await pg.locator("article.rpt h1").count());
    // 지역 보고서 ↔ 지표 보고서 전환
    await pg.goto(`${U}#view=report&ind=DT_H_SM&sido=009&sgg=00901`, {waitUntil:"load"}); await pg.waitForTimeout(2000);
    await pg.locator(".rpt-mode").getByRole("button",{name:"지표별", exact:true}).click(); await pg.waitForTimeout(1500);
    ck((await pg.locator("article.rpt h1").innerText())==="현재흡연율", `지역 보고서 → 지표별 전환`);
    await pg.locator(".rpt-mode").getByRole("button",{name:"지역별", exact:true}).click(); await pg.waitForTimeout(1500);
    ck((await pg.locator("article.rpt h1").innerText())==="강원 강릉시", `지표별 → 지역 보고서 전환`);
    // 검색
    await pg.keyboard.press("/"); await pg.waitForTimeout(300); await pg.keyboard.type("취약지역"); await pg.waitForTimeout(400);
    await pg.keyboard.press("Enter"); await pg.waitForTimeout(1500);
    ck(await pg.evaluate(()=>location.hash.includes("view=ireport")), `검색 「취약지역」 → ireport`);
  }
  await pg.screenshot({ path:`${OUT}/ir_${w}.png`, fullPage:false });
  ck(errs.length===0, `[${w}] 오류 ${errs.length} ${errs.slice(0,2)}`);
  await ctx.close();
}
await b.close(); console.log(fails.length?`실패 ${fails.length}`:"전부 통과");
