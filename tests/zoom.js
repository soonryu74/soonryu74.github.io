/* 좁은 화면·200% 확대 시 가로 스크롤 점검. 실행: node tests/zoom.js */
const { chromium } = require('playwright-core');
const ROOT='file:///home/user/soonryu74.github.io/';
const PAGES=['dolbom/index.html','dolbom/gajok.html','dolbom/jiyeok.html','dolbom/gigwan.html','dolbom/gujik.html','gyeotae/index.html'];
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
 // 390px 기기에서 200% 확대 = CSS 뷰포트 195px
 for (const w of [390,195]){
  console.log('\n--- CSS 뷰포트 '+w+'px '+(w===195?'(= 390px 기기 200% 확대)':'')+' ---');
  for (const f of PAGES){
   const ctx=await b.newContext({viewport:{width:w,height:844},isMobile:true});
   const p=await ctx.newPage(); await p.goto(ROOT+f,{waitUntil:'load'}); await p.waitForTimeout(2600);
   const r=await p.evaluate(()=>{
     const sw=document.documentElement.scrollWidth, cw=document.documentElement.clientWidth;
     const over=[];
     if(sw>cw+2) document.querySelectorAll('body *').forEach(el=>{
       const b=el.getBoundingClientRect();
       if(b.right>cw+2 && b.width>0 && over.length<4)
         over.push(el.tagName.toLowerCase()+'.'+(el.className||'').toString().split(' ')[0]+' ('+Math.round(b.right)+'px)');
     });
     return {sw,cw,over};
   });
   console.log(' '+(r.sw>r.cw+2?'넘침':'OK  ')+'  '+f.padEnd(24)+' scrollWidth '+r.sw+' / '+r.cw+(r.over.length?'  ← '+r.over.join(', '):''));
   await ctx.close();
  }
 }
 await b.close();
})();
