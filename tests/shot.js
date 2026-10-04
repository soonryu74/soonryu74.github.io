/* 화면 캡처. 실행: npm i playwright-core && node tests/shot.js
   결과는 docs/care-platform/screens/ 에 저장된다. */
const { chromium } = require('playwright-core');
const path = require('path');
const ROOT = 'file:///home/user/soonryu74.github.io/dolbom/';
const GY   = 'file:///home/user/soonryu74.github.io/gyeotae/';
const OUT  = '/home/user/soonryu74.github.io/docs/care-platform/screens/';

(async () => {
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--no-sandbox','--disable-dev-shm-usage','--font-render-hinting=none']
  });
  const desktop = await browser.newContext({ viewport:{width:1280,height:900}, deviceScaleFactor:1, locale:'ko-KR' });
  const mobile  = await browser.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:1, locale:'ko-KR', isMobile:true, hasTouch:true });

  async function shot(ctx, url, file, fn, full=true){
    const p = await ctx.newPage();
    await p.goto(url, { waitUntil:'load' });
    await p.waitForTimeout(600);
    if (fn) { await fn(p); await p.waitForTimeout(700); }
    await p.screenshot({ path: OUT+file, fullPage: full });
    console.log('saved', file);
    await p.close();
  }

  // 1) 가족 추천 — 설문 작성 후 결과
  await shot(desktop, ROOT+'gajok.html', '01-가족추천-데스크톱.png', async p => {
    await p.click('[data-group="who"] [data-v="senior"]');
    await p.click('[data-group="duration"] [data-v="long"]');
    await p.click('[data-group="mobility"] [data-v="most"]');
    await p.click('[data-group="cognition"] [data-v="severe"]');
    await p.click('[data-group="needs"] [data-v="medical"]');
    await p.click('[data-group="needs"] [data-v="bath"]');
    await p.click('[data-group="context"] [data-v="discharge"]');
    await p.click('#run');
  });

  // 1b) '잘 모르겠어요' 경로
  await shot(desktop, ROOT+'gajok.html', '02-가족추천-잘모르겠어요.png', async p => {
    await p.click('[data-group="who"] [data-v="unknown"]');
    await p.click('[data-group="duration"] [data-v="unknown"]');
    await p.click('[data-group="mobility"] [data-v="unknown"]');
    await p.click('[data-group="cognition"] [data-v="unknown"]');
    await p.click('#run');
  });

  // 2) 지역 창구 — 확인된 지역 / 미확인 지역
  await shot(desktop, ROOT+'jiyeok.html?sido=%EA%B2%BD%EA%B8%B0%EB%8F%84&gu=%EB%B6%80%EC%B2%9C%EC%8B%9C', '03-지역창구-확인된지역.png');
  await shot(desktop, ROOT+'jiyeok.html?sido=%EC%A0%84%EB%9D%BC%EB%82%A8%EB%8F%84&gu=%EB%AA%A9%ED%8F%AC%EC%8B%9C', '04-지역창구-미확인지역.png');

  // 3) 기관 평가 검색
  await shot(desktop, ROOT+'gigwan.html', '05-기관평가.png', async p => { await p.waitForTimeout(2500); });

  // 4) 일자리 디렉토리
  await shot(desktop, ROOT+'gujik.html', '06-구직디렉토리.png', async p => { await p.waitForTimeout(2500); });

  // 5) 모심 홈
  await shot(desktop, ROOT+'index.html', '07-모심홈.png');

  // 6) 곁애 랜딩
  await shot(desktop, GY+'index.html', '08-곁애랜딩.png');

  // 모바일
  await shot(mobile, ROOT+'index.html', '09-모바일-모심홈.png');
  await shot(mobile, ROOT+'gajok.html', '10-모바일-가족설문.png');
  await shot(mobile, ROOT+'jiyeok.html?sido=%EA%B2%BD%EA%B8%B0%EB%8F%84&gu=%EB%B6%80%EC%B2%9C%EC%8B%9C', '11-모바일-지역창구.png');
  await shot(mobile, GY+'index.html', '12-모바일-곁애.png');

  // 200% 확대(= CSS 뷰포트 195px) 화면
  const zoom = await browser.newContext({ viewport:{width:195,height:844}, deviceScaleFactor:1, locale:'ko-KR', isMobile:true });
  await shot(zoom, ROOT+'gajok.html',  '13-200퍼센트확대-가족설문.png');
  await shot(zoom, ROOT+'jiyeok.html?sido=%EA%B2%BD%EA%B8%B0%EB%8F%84&gu=%EB%B6%80%EC%B2%9C%EC%8B%9C', '14-200퍼센트확대-지역창구.png');

  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
