/* 접근성 점검(터치 영역 44px, 조작 요소 이름). 실행: node tests/a11y.js */
const { chromium } = require('playwright-core');
const ROOT='file:///home/user/soonryu74.github.io/';
const PAGES=['dolbom/index.html','dolbom/gajok.html','dolbom/jiyeok.html','dolbom/gigwan.html','dolbom/gujik.html','gyeotae/index.html'];
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
 for (const f of PAGES){
  const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'ko-KR'});
  const p=await ctx.newPage(); await p.goto(ROOT+f,{waitUntil:'load'}); await p.waitForTimeout(900);
  const r=await p.evaluate(()=>{
   const out={small:[],noName:[],ariaToggle:[]};
   const sel='a,button,input,select,textarea,[role="button"],.chip,.region-btn';
   document.querySelectorAll(sel).forEach(el=>{
     const s=getComputedStyle(el);
     if(s.display==='none'||s.visibility==='hidden') return;
     const r=el.getBoundingClientRect();
     if(r.width===0&&r.height===0) return;
     const label=(el.getAttribute('aria-label')||el.textContent||el.value||'').trim().slice(0,30);
     if(r.height<44||r.width<44) out.small.push({tag:el.tagName.toLowerCase(),cls:(el.className||'').toString().slice(0,30),w:Math.round(r.width),h:Math.round(r.height),label});
     if(!label && !el.querySelector('img[alt]')) out.noName.push({tag:el.tagName.toLowerCase(),cls:(el.className||'').toString().slice(0,30)});
     if((el.tagName==='BUTTON'||el.getAttribute('role')==='button') && el.getAttribute('aria-pressed')===null && el.classList.contains('chip')) out.ariaToggle.push(label);
   });
   return out;
  });
  // 200% 확대 시 가로 스크롤
  await p.evaluate(()=>{document.documentElement.style.zoom='';});
  const ctx2=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true});
  const p2=await ctx2.newPage(); await p2.goto(ROOT+f,{waitUntil:'load'});
  await p2.evaluate(()=>{document.body.style.zoom='2';});
  await p2.waitForTimeout(400);
  const ov=await p2.evaluate(()=>({sw:document.documentElement.scrollWidth, cw:document.documentElement.clientWidth}));
  console.log('\n=== '+f+' ===');
  console.log(' 44px 미만 터치 영역: '+r.small.length+(r.small.length?' → '+JSON.stringify(r.small.slice(0,8),null,0):''));
  console.log(' 이름 없는 조작 요소: '+r.noName.length+(r.noName.length?' → '+JSON.stringify(r.noName.slice(0,6)):''));
  console.log(' aria-pressed 없는 칩: '+r.ariaToggle.length);
  console.log(' 200% 확대 가로 넘침: '+(ov.sw>ov.cw+2 ? 'YES ('+ov.sw+' > '+ov.cw+')' : '없음'));
  await ctx.close(); await ctx2.close();
 }
 await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
