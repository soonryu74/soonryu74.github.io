// 중보기도 나눔터 흐름 검사 — 실제 Supabase에 시험 모임('TEST-…')을 만들고 끝나면 지운다.
//   저장소 루트에서:  python3 -m http.server 8899 &   →   node jungbo/test/run.js
//   (지우기는 SQL로 한다: delete from pray_group where name like 'TEST-%')
const { chromium, devices } = require('playwright');
const BASE = (process.env.BASE || 'http://127.0.0.1:8899') + '/jungbo/';
const TAG = 'TEST-' + Date.now().toString(36);
let pass = 0, fail = 0;
const ok = (n, c, x = '') => { c ? (pass++, console.log('  PASS', n)) : (fail++, console.log('  FAIL', n, x)); };

async function ctx(browser) {
  const c = await browser.newContext(Object.assign({}, devices['Pixel 7'], { permissions: [] }));
  await c.addInitScript(() => {   // 공유 창·알림은 시험에서 쓰지 않는다
    try { delete window.navigator.__proto__.share; } catch (e) {}
    window.__shared = []; navigator.share = async (d) => { window.__shared.push(d); };
    window.confirm = () => true; window.prompt = () => '새이름';
    try { localStorage.setItem('jungbo-bgm', 'off'); } catch (e) {}   // 검사 중에는 찬양을 끈다 (소리 재생이 자동 클릭 검사를 방해한다)
  });
  const p = await c.newPage();
  p.errs = []; p.on('pageerror', e => p.errs.push(String(e)));
  return { c, p };
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const b = await chromium.launch();
  let inviteLink = '';

  console.log('\n[1] 모임 만들기 (인도자)');
  const A = await ctx(b);
  await A.p.goto(BASE); await A.p.waitForSelector('#enter-cards:not([hidden])');
  await A.p.fill('#new-group', TAG + ' 모임'); await A.p.fill('#new-name', '김인도');
  await A.p.click('#btn-create');
  await A.p.waitForSelector('#v-main:not([hidden])', { timeout: 20000 });
  await A.p.waitForSelector('.sheet-bg.open .code');
  ok('본 화면 + 초대 창', (await A.p.textContent('#top-group')).includes(TAG));
  inviteLink = (await A.p.textContent('.sheet-bg.open .linkbox')).trim();
  ok('초대 주소에 ?g=', /\?g=[A-Z2-9]{8}$/.test(inviteLink), inviteLink);
  await A.p.click('.sheet-bg.open [data-c]'); await sleep(400);

  console.log('\n[2] 긴급기도 올리기 → 공유 창');
  await A.p.click('#fab'); await A.p.waitForSelector('.sheet-bg.open [data-kind="urgent"]');
  await A.p.click('[data-kind="urgent"]');
  await A.p.fill('#w-for', '박집사님 수술'); await A.p.fill('#w-body', '내일 아침 심장 수술입니다. 함께 기도해 주세요.');
  await A.p.click('.sheet-bg.open [data-ok]');
  await A.p.waitForSelector('.sheet-bg.open [data-kakao]', { timeout: 20000 });
  ok('긴급 알리기 창', (await A.p.textContent('.sheet-bg.open .title')).includes('긴급'));
  await A.p.click('.sheet-bg.open [data-kakao]'); await sleep(500);
  const shared = await A.p.evaluate(() => window.__shared);
  ok('공유 글에 긴급 + 주소', shared.length === 1 && /긴급기도가 올라왔습니다/.test(shared[0].text) && /#p=/.test(shared[0].text), JSON.stringify(shared));
  await sleep(400);
  ok('목록 맨 위 긴급 카드', await A.p.$('.post.urgent') !== null);
  ok('긴급 알약', (await A.p.textContent('#chips')).includes('긴급'));

  console.log('\n[3] 식구 들어오기 (초대 주소) → 기도했어요 · 이모지 · 댓글');
  const B = await ctx(b);
  await B.p.goto(inviteLink); await B.p.waitForSelector('#join-card:not([hidden])');
  await B.p.waitForFunction(() => document.querySelector('#join-title').textContent.includes('들어가기') && document.querySelector('#join-title').textContent.includes('「'));
  await B.p.fill('#join-name', '이은혜'); await B.p.click('#btn-join');
  await B.p.waitForSelector('#v-main:not([hidden])', { timeout: 20000 });
  await B.p.waitForSelector('.post.urgent');
  await sleep(700); if (await B.p.$('.sheet-bg.open')) { await B.p.click('.sheet-bg.open .sheet-foot button'); await sleep(400); }
  ok('식구 화면에 긴급 글', (await B.p.textContent('.post.urgent')).includes('박집사님'));
  await B.p.click('.post.urgent [data-pray]'); await sleep(1200);
  ok('기도했어요 1명', (await B.p.textContent('.post.urgent [data-pray] b')) === '1');
  await B.p.click('.post.urgent .for'); await B.p.waitForSelector('.sheet-bg.open .emoji-row');
  await B.p.click('.sheet-bg.open [data-emoji="❤️"]'); await sleep(1000);
  ok('이모지 켜짐', await B.p.$('.sheet-bg.open [data-emoji="❤️"].on') !== null);
  await B.p.fill('.sheet-bg.open textarea[data-cmt]', '함께 기도합니다 🙏'); await B.p.click('.sheet-bg.open [data-send-cmt]'); await sleep(1200);
  ok('댓글 보임', (await B.p.textContent('.sheet-bg.open .comments')).includes('함께 기도합니다'));
  ok('식구는 글 관리 없음', await B.p.$('.sheet-bg.open [data-answer]') === null);

  console.log('\n[4] 인도자 화면 갱신 · 응답받았어요');
  await A.p.reload(); await A.p.waitForSelector('.post.urgent'); await sleep(600);
  if (await A.p.$('.sheet-bg.open')) { await A.p.click('.sheet-bg.open .sheet-foot button'); await sleep(400); }
  ok('인도자 화면에 기도 1명·댓글 1', (await A.p.textContent('.post.urgent')).includes('💬 1') && (await A.p.textContent('.post.urgent [data-pray] b')) === '1');
  await A.p.click('.post.urgent .for'); await A.p.waitForSelector('.sheet-bg.open [data-answer]');
  ok('기도한 분 이름', (await A.p.textContent('.sheet-bg.open .prayed-names')).includes('이은혜'));
  await A.p.click('.sheet-bg.open [data-answer]'); await A.p.waitForSelector('#ans-note');
  await A.p.fill('#ans-note', '수술 잘 끝났습니다. 감사합니다.'); await A.p.click('.sheet-bg.open:last-child [data-ok]'); await sleep(1500);
  ok('응답받음 표시', (await A.p.textContent('.sheet-bg.open')).includes('응답받았어요'));
  await A.p.click('.sheet-bg.open [data-close]'); await sleep(500);
  await A.p.click('#tabs button[data-tab="answered"]'); await sleep(1200);
  ok('응답받음 탭에 글', (await A.p.textContent('#feed')).includes('수술 잘 끝났습니다'));

  console.log('\n[5] 모임 탭 (식구 목록 · 인도자 설정) · 열쇠 코드로 다시 들어가기');
  await A.p.click('#tabs button[data-tab="group"]'); await A.p.waitForSelector('#pane-group .member'); await sleep(500);
  const members = await A.p.textContent('#pane-group');
  ok('식구 2명 표시', members.includes('김인도') && members.includes('이은혜'));
  ok('인도자 설정 카드', await A.p.$('#g-name') !== null);
  const token = await A.p.evaluate(() => JSON.parse(localStorage.getItem('jungbo-accounts'))[0].token);
  ok('열쇠 코드 꼴', /^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(token), token);
  const C = await ctx(b);
  await C.p.goto(BASE); await C.p.waitForSelector('#enter-cards:not([hidden])');
  await C.p.evaluate(() => { document.querySelector('#key-code').closest('details').open = true; });
  await C.p.fill('#key-code', token.toLowerCase()); await C.p.click('#btn-key');
  await C.p.waitForSelector('#v-main:not([hidden])', { timeout: 20000 });
  await C.p.waitForFunction(() => /김인도/.test(document.querySelector('#top-me').textContent), null, { timeout: 15000 });
  ok('열쇠 코드(소문자)로 들어옴', (await C.p.textContent('#top-me')).includes('김인도'));

  console.log('\n[6] 잘못된 초대 코드 · 화면 오류');
  await C.p.goto(BASE + '?g=ZZZZZZZZ'); await C.p.waitForSelector('#join-card:not([hidden])');
  await C.p.waitForFunction(() => document.querySelector('#btn-join').disabled);
  ok('없는 초대 코드 안내', (await C.p.textContent('#join-title')).includes('맞지 않아요'));
  ok('페이지 오류 없음', A.p.errs.length + B.p.errs.length + C.p.errs.length === 0, [A.p.errs, B.p.errs, C.p.errs].flat().join(' | '));

  console.log('\n[7] 정리 — 글 지우기 · 식구 빼기 · 모임 나가기 (인도자 권한 검사 겸)');
  await A.p.goto(BASE); await A.p.waitForSelector('#v-main:not([hidden])'); await sleep(800);
  if (await A.p.$('.sheet-bg.open')) { await A.p.click('.sheet-bg.open .sheet-foot button'); await sleep(400); }
  await A.p.click('#tabs button[data-tab="answered"]'); await A.p.waitForSelector('#feed .post'); await sleep(300);
  await A.p.click('#feed .post .for'); await A.p.waitForSelector('.sheet-bg.open [data-del-post]');
  await A.p.click('.sheet-bg.open [data-del-post]'); await sleep(1200);
  ok('글 지움', (await A.p.textContent('#feed')).includes('아직 응답받음으로'));
  await A.p.click('#tabs button[data-tab="group"]'); await A.p.waitForSelector('#pane-group [data-remove]');
  await A.p.click('#pane-group [data-remove]');
  await A.p.waitForFunction(() => !/이은혜/.test(document.querySelector('#pane-group').textContent), null, { timeout: 15000 }).catch(() => {});
  ok('식구 뺌', !(await A.p.textContent('#pane-group')).includes('이은혜'));
  await A.p.click('#pane-group [data-leave]'); await sleep(1500);
  ok('모임 나감 → 첫 화면', await A.p.$('#v-enter:not([hidden])') !== null);
  ok('뺀 식구의 열쇠는 무효', await B.p.evaluate(async () => { try { await (await fetch(location.href)).text(); location.reload(); } catch (e) {} return true; }));
  await B.p.waitForSelector('#v-enter:not([hidden])', { timeout: 20000 });
  ok('식구 화면도 첫 화면으로', (await B.p.textContent('#enter-msg')).includes('맞지 않아요'));

  await b.close();
  console.log(`\n${pass} passed, ${fail} failed · 시험 모임 이름: ${TAG}`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
