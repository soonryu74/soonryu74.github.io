/* 실제 과업을 키보드만으로 끝까지 수행한다.
   실행: npm i playwright-core && node tests/tasks.js */
const { chromium } = require('playwright-core');
// 마우스를 쓰지 않고 키보드만으로 실제 과업을 끝까지 수행한다.
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
 const ctx=await b.newContext({viewport:{width:390,height:844},locale:'ko-KR'});
 const p=await ctx.newPage();
 await p.route('**/fonts.googleapis.com/**', r=>r.fulfill({status:200,contentType:'text/css',body:''}));
 await p.route('**/cdn.jsdelivr.net/**', r=>r.fulfill({status:200,contentType:'text/css',body:''}));

 async function tabTo(pred, max=80){
   for(let i=0;i<max;i++){
     await p.keyboard.press('Tab');
     const ok = await p.evaluate(s=>{
       const a=document.activeElement; if(!a) return false;
       const t=(a.getAttribute('aria-label')||a.textContent||a.getAttribute('placeholder')||'').trim();
       return t.includes(s);
     }, pred);
     if(ok) return true;
   }
   return false;
 }

 console.log('=== 과업 1: 가족이 설문을 끝내고 추천을 받는다 (키보드만) ===');
 await p.goto('file:///home/user/soonryu74.github.io/dolbom/gajok.html',{waitUntil:'load'});
 await p.waitForTimeout(600);
 let steps=0;
 for (const label of ['만 65세 이상','6개월 이상','상당 부분 도움','치매 진단','진료·간호']){
   const ok = await tabTo(label);
   if(!ok){ console.log('  ✗ 도달 실패:', label); break; }
   await p.keyboard.press('Enter'); steps++;
 }
 const okRun = await tabTo('맞는 돌봄 찾기');
 if(okRun){ await p.keyboard.press('Enter'); await p.waitForTimeout(900); }
 const res = await p.$eval('#result', e=>e.innerText);
 console.log(`  선택 ${steps}/5 · 실행 ${okRun?'성공':'실패'} · 결과 ${res.length>40?'표시됨':'없음'}`);
 console.log('  결과 앞부분:', res.slice(0,150).replace(/\n/g,' / '));
 console.log('  결과 영역 aria-live:', await p.$eval('#result', e=>e.getAttribute('aria-live')));

 console.log('\n=== 과업 2: 우리 지역 창구를 찾는다 (키보드만) ===');
 await p.goto('file:///home/user/soonryu74.github.io/dolbom/jiyeok.html',{waitUntil:'load'});
 await p.waitForTimeout(600);
 let ok1 = await tabTo('경기');
 if(ok1){ await p.keyboard.press('Enter'); await p.waitForTimeout(400); }
 let ok2 = await tabTo('부천시');
 if(ok2){ await p.keyboard.press('Enter'); await p.waitForTimeout(700); }
 const r2 = await p.$eval('#result', e=>e.innerText);
 console.log(`  시·도 ${ok1?'선택됨':'실패'} · 시·군·구 ${ok2?'선택됨':'실패'}`);
 console.log('  전화번호가 결과에 있는가:', /032-625-9012/.test(r2) ? '예' : '아니오');
 console.log('  출처·확인일 표시:', /확인일 2026-10-04/.test(r2) ? '예' : '아니오');

 console.log('\n=== 과업 3: 오류 상태가 읽히는가 (곁애 접수 — 운영정보 미확정) ===');
 await p.goto('file:///home/user/soonryu74.github.io/gyeotae/index.html',{waitUntil:'load'});
 await p.waitForTimeout(600);
 let sawAlert=false; p.on('dialog', async d=>{ sawAlert=true; await d.dismiss(); });
 let ok3=false;
 for(let i=0;i<40;i++){ await p.keyboard.press('Tab');
   if(await p.evaluate(()=>document.activeElement && document.activeElement.id==='w-contact')){
     await p.keyboard.type('010-0000-0000'); ok3=true; break; } }
 let ok4=false;
 for(let i=0;i<20;i++){ await p.keyboard.press('Tab');
   if(await p.evaluate(()=>document.activeElement && document.activeElement.id==='w-gen')){
     await p.keyboard.press('Enter'); ok4=true; break; } }
 await p.waitForTimeout(900);
 const out = await p.$eval('#out', e=>e.innerText);
 console.log(`  연락처 입력 ${ok3?'성공':'실패'} · 버튼 실행 ${ok4?'성공':'실패'} · alert 발생 ${sawAlert?'있음':'없음'}`);
 console.log('  안내 표시:', out.slice(0,110).replace(/\n/g,' / '));

 // 빈 연락처로 보냈을 때 오류가 화면에 읽히는가
 await p.reload({waitUntil:'load'}); await p.waitForTimeout(600);
 for(let i=0;i<30;i++){ await p.keyboard.press('Tab');
   if(await p.evaluate(()=>document.activeElement && document.activeElement.id==='w-gen')){
     await p.keyboard.press('Enter'); break; } }
 await p.waitForTimeout(600);
 const msg = await p.$eval('#w-formerr', e=>e.innerText);
 const focused = await p.evaluate(()=>document.activeElement && document.activeElement.id);
 console.log('  빈 연락처 오류 메시지:', msg.replace(/\n/g,' / ').slice(0,90) || '(없음)');
 console.log('  오류 영역 role:', await p.$eval('#w-formerr', e=>e.getAttribute('role')));
 console.log('  초점이 고칠 곳으로 이동:', focused==='w-contact' ? '예' : '아니오 ('+focused+')');

 console.log('\n=== 과업 4: 교육 경로를 찾는다 (키보드만) ===');
 await p.goto('file:///home/user/soonryu74.github.io/dolbom/gyoyuk.html',{waitUntil:'load'});
 await p.waitForTimeout(600);
 const ok5 = await tabTo('요양보호사');
 if(ok5){ await p.keyboard.press('Enter'); await p.waitForTimeout(700); }
 const r4 = await p.$eval('#edu-result', e=>e.innerText);
 console.log(`  직종 선택 ${ok5?'성공':'실패'} · 결과 ${r4.length>40?'표시됨':'없음'}`);
 console.log('  aria-pressed 반영:', await p.evaluate(()=>{
   const on=[...document.querySelectorAll('#job-row .chip')].filter(c=>c.getAttribute('aria-pressed')==='true');
   return on.length===1 ? '예 ('+on[0].textContent.trim()+')' : '아니오 ('+on.length+'개)';
 }));
 await b.close();
})();
