/* 키보드 접근성 점검 — 초점 표시, 탭 순서, 조작 요소 이름, aria-live.
   실행: npm i playwright-core && node tests/keyboard.js
   주의: transition 이 끝난 뒤 측정해야 한다(초점 표시가 0 에서 커진다). */
const { chromium } = require('playwright-core');
const fs = require('fs');
const PAGES = [
  ['dolbom/index.html','모심 홈'], ['dolbom/gajok.html','가족 설문'],
  ['dolbom/jiyeok.html','지역 찾기'], ['dolbom/gigwan.html','기관 평가'],
  ['dolbom/gujik.html','구직'], ['dolbom/gyoyuk.html','교육·자격'],
  ['gyeotae/index.html','곁애 랜딩'], ['gyeotae/ilja.html','곁애 일자리'],
];
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
 for (const [f,label] of PAGES){
  const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:false,locale:'ko-KR'});
  const p=await ctx.newPage();
  await p.route('**/fonts.googleapis.com/**', r=>r.fulfill({status:200,contentType:'text/css',body:''}));
  await p.route('**/cdn.jsdelivr.net/**', r=>r.fulfill({status:200,contentType:'text/css',body:''}));
  await p.goto('file:///home/user/soonryu74.github.io/'+f,{waitUntil:'load'});
  await p.waitForTimeout(800);

  // 1) 키보드로 모든 조작 요소에 닿는가 + 초점 표시가 보이는가
  const r = await p.evaluate(()=>{
    const sel='a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"])';
    const all=[...document.querySelectorAll(sel)].filter(el=>{
      const s=getComputedStyle(el); const b=el.getBoundingClientRect();
      return s.display!=='none' && s.visibility!=='hidden' && (b.width>0||b.height>0);
    });
    const noFocusStyle=[];   // 아래에서 실제 Tab 키로 다시 측정한다
    // tabindex 양수(탭 순서를 비트는 값) 사용 여부
    const positiveTab=[...document.querySelectorAll('[tabindex]')]
      .filter(el=>parseInt(el.getAttribute('tabindex'),10)>0).length;
    // 조작 요소 중 이름이 비어 있는 것
    const noName=all.filter(el=>{
      const t=(el.getAttribute('aria-label')||el.textContent||'').trim();
      if(t) return false;
      if(el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`)) return false;
      if(el.closest('label')) return false;
      if(el.querySelector('img[alt]:not([alt=""])')) return false;
      if(el.getAttribute('aria-labelledby')) return false;
      return true;
    }).map(el=>(el.tagName+'.'+(el.className||'')).slice(0,40));
    return {total:all.length, noFocusStyle, positiveTab, noName,
            live:[...document.querySelectorAll('[aria-live]')].length,
            h1:[...document.querySelectorAll('h1')].length,
            lang:document.documentElement.lang||'(없음)'};
  });
  console.log(`\n=== ${label} (${f}) ===`);
  console.log(`  조작 요소 ${r.total}개 · lang=${r.lang} · h1 ${r.h1}개 · aria-live ${r.live}개`);
  // 실제 Tab 키로 30회 이동하며 초점 표시가 보이는지 확인한다 (:focus-visible 는 키보드일 때만 적용)
  await p.evaluate(()=>{ const a=document.activeElement; if(a&&a.blur) a.blur(); });
  const bad=[];
  for(let i=0;i<Math.min(30,r.total);i++){
    await p.keyboard.press('Tab');
    await p.waitForTimeout(180);   // transition: all .12s 가 끝난 뒤에 측정한다
    const v=await p.evaluate(()=>{
      const a=document.activeElement;
      if(!a||a===document.body) return null;
      const s=getComputedStyle(a);
      const outline = s.outlineStyle!=='none' && parseFloat(s.outlineWidth)>0;
      const shadow  = s.boxShadow && s.boxShadow!=='none';
      const border  = a.matches(':focus-visible');
      return {ok: outline||shadow, fv: border, tag:(a.tagName+'.'+(a.className||'')).slice(0,36)};
    });
    if(v && !v.ok) bad.push(v.tag);
  }
  console.log(`  Tab 이동 중 초점 표시 없는 요소: ${bad.length}${bad.length?' → '+[...new Set(bad)].slice(0,4).join(', '):''}`);
  console.log(`  tabindex 양수(탭 순서 비틀기): ${r.positiveTab}`);
  console.log(`  이름 없는 조작 요소: ${r.noName.length}${r.noName.length?' → '+r.noName.slice(0,4).join(', '):''}`);

  // 2) 탭 키로 실제 순회 — 처음 12개가 화면 순서대로 도달하는가
  await p.evaluate(()=>document.body.focus());
  const order=[];
  for(let i=0;i<12;i++){
    await p.keyboard.press('Tab');
    order.push(await p.evaluate(()=>{
      const a=document.activeElement;
      if(!a||a===document.body) return '(없음)';
      return ((a.getAttribute('aria-label')||a.textContent||a.getAttribute('placeholder')||a.tagName)).trim().slice(0,18);
    }));
  }
  console.log('  탭 순서(앞 12):', order.join(' › '));
  await ctx.close();
 }
 await b.close();
})();
