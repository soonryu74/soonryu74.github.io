/* 기관 평가 검색 통합 점검 — 실제 Supabase 데이터로 화면을 확인한다.
   실행: npm i playwright-core && node tests/gigwan-integration.js
   CDN 사본 준비: curl -sS https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2 -o /tmp/claude-0/supabase.js */
const { chromium } = require('playwright-core');
const fs = require('fs');
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
 const ctx=await b.newContext({viewport:{width:1280,height:1000},locale:'ko-KR'});
 const p=await ctx.newPage();
 const errs=[]; p.on('pageerror',e=>errs.push(String(e)));

 // CDN 스크립트는 미리 받아 둔 사본으로, Supabase REST 호출은 node 의 fetch 로 중계한다.
 // (헤드리스 Chromium 이 이 환경의 프록시 CA 를 신뢰하지 않아 TLS 가 끊기기 때문이며,
 //  TLS 검증을 끄지 않고 실제 데이터로 검증하기 위한 방법이다.)
 await p.route('**/cdn.jsdelivr.net/npm/@supabase/supabase-js@2', r =>
   r.fulfill({status:200, contentType:'application/javascript', body: fs.readFileSync('/tmp/claude-0/supabase.js','utf8')}));
 await p.route('**/fonts.googleapis.com/**', r => r.fulfill({status:200, contentType:'text/css', body:''}));
 await p.route('**/cdn.jsdelivr.net/gh/**', r => r.fulfill({status:200, contentType:'text/css', body:''}));
 await p.route('**/*.supabase.co/**', async r => {
   const req=r.request();
   const res=await fetch(req.url(), {method:req.method(), headers:req.headers(),
     body:['GET','HEAD'].includes(req.method())?undefined:req.postData()});
   const body=await res.text();
   const h={}; res.headers.forEach((v,k)=>{ h[k]=v; });
   h['access-control-allow-origin']='*'; h['access-control-expose-headers']='content-range,content-location';
   delete h['content-encoding']; delete h['content-length'];
   await r.fulfill({status:res.status, headers:h, body});
 });

 await p.goto('file:///home/user/soonryu74.github.io/dolbom/gigwan.html',{waitUntil:'load'});
 await p.waitForTimeout(4000);
 console.log('JS 오류:', errs.length?errs:'없음');
 console.log('건수:', await p.$eval('#count', e=>e.textContent));
 console.log('첫 카드:\n'+(await p.$eval('#list', e=>e.innerText)).slice(0,460));

 await p.fill('#flt-name','사랑재가복지센터'); await p.waitForTimeout(2500);
 console.log('\n--- 이름 검색: 사랑재가복지센터 ---');
 console.log('건수:', await p.$eval('#count', e=>e.textContent));
 console.log((await p.$eval('#list', e=>e.innerText)).slice(0,1100));
 await p.screenshot({path:'/home/user/soonryu74.github.io/docs/care-platform/screens/16-기관평가-동명기관.png',fullPage:true});

 await p.selectOption('#flt-region','인천광역시'); await p.waitForTimeout(1500);
 await p.selectOption('#flt-sigungu','남동구'); await p.waitForTimeout(2500);
 console.log('\n--- 인천 남동구 + 사랑재가복지센터 (동명 두 기관) ---');
 const body=await p.$eval('#list', e=>e.innerText);
 console.log('동명 경고 노출:', body.includes('이름이 같은 다른 기관이 있습니다') ? 'YES' : 'NO');
 console.log(body.slice(0,1200));
 await p.screenshot({path:'/home/user/soonryu74.github.io/docs/care-platform/screens/16-기관평가-동명기관.png',fullPage:true});
 await p.fill('#flt-name',''); await p.selectOption('#flt-region','서울특별시'); await p.waitForTimeout(1500);
 await p.selectOption('#flt-type','방문간호'); await p.waitForTimeout(2500);
 console.log('\n--- 서울 + 방문간호 ---');
 console.log('건수:', await p.$eval('#count', e=>e.textContent));
 console.log((await p.$eval('#list', e=>e.innerText)).slice(0,420));
 await p.screenshot({path:'/home/user/soonryu74.github.io/docs/care-platform/screens/05-기관평가.png',fullPage:true});
 await b.close();
})();
