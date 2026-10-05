/* 곁애 일자리 화면 — 격리 환경 fixture 로 목록·필터·빈 상태를 확인한다.
   실행: node tests/ilja-integration.js (jobs_fixture.json 필요) */
const { chromium } = require('playwright-core');
const fs = require('fs');
const FIX = JSON.parse(fs.readFileSync('/tmp/claude-0/jobs_fixture.json','utf8'));
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
 const ctx=await b.newContext({viewport:{width:1280,height:1000},locale:'ko-KR'});
 const p=await ctx.newPage();
 const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
 await p.route('**/cdn.jsdelivr.net/npm/@supabase/supabase-js@2', r =>
   r.fulfill({status:200, contentType:'application/javascript', body: fs.readFileSync('/tmp/claude-0/supabase.js','utf8')}));
 await p.route('**/fonts.googleapis.com/**', r => r.fulfill({status:200, contentType:'text/css', body:''}));
 await p.route('**/cdn.jsdelivr.net/gh/**', r => r.fulfill({status:200, contentType:'text/css', body:''}));
 // 격리 환경의 jobs_public 결과를 그대로 응답으로 돌려준다 (운영 DB에는 이 테이블이 없다)
 await p.route('**/rest/v1/jobs_public**', async r => {
   const u = new URL(r.request().url());
   let rows = FIX.slice();
   for (const [k,v] of u.searchParams) {
     if (k==='select'||k==='order'||k==='limit') continue;
     const [op, ...rest] = v.split('.'); const val = decodeURIComponent(rest.join('.'));
     if (op==='eq') rows = rows.filter(x => String(x[k]) === val);
     if (op==='ilike') rows = rows.filter(x => String(x[k]||'').toLowerCase().includes(val.replace(/%/g,'').toLowerCase()));
   }
   await r.fulfill({status:200, contentType:'application/json',
     headers:{'content-range':`0-${rows.length-1}/${rows.length}`,
              'access-control-expose-headers':'content-range','access-control-allow-origin':'*'},
     body: JSON.stringify(rows)});
 });
 await p.goto('file:///home/user/soonryu74.github.io/gyeotae/ilja.html',{waitUntil:'load'});
 await p.waitForTimeout(2500);
 console.log('JS 오류:', errs.length?errs:'없음');
 console.log('건수:', await p.$eval('#cnt', e=>e.textContent));
 console.log('목록:\n'+(await p.$eval('#list', e=>e.innerText)));
 await p.screenshot({path:'/home/user/soonryu74.github.io/docs/care-platform/screens/18-곁애-일자리-공고있음.png',fullPage:true});

 console.log('\n--- 직종 "간병인" 으로 좁히기 ---');
 await p.selectOption('#f-role','간병인'); await p.click('#f-run'); await p.waitForTimeout(1200);
 console.log('건수:', await p.$eval('#cnt', e=>e.textContent));
 console.log((await p.$eval('#list', e=>e.innerText)).slice(0,260));

 console.log('\n--- 없는 조건 (부산) ---');
 await p.selectOption('#f-role',''); await p.selectOption('#f-sido','부산광역시');
 await p.click('#f-run'); await p.waitForTimeout(1200);
 console.log('건수:', await p.$eval('#cnt', e=>e.textContent));
 console.log((await p.$eval('#list', e=>e.innerText)).slice(0,200));
 await b.close();
})();
