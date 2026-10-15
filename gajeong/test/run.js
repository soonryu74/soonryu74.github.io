// 목장 나눔터 화면 검사 — 가짜 서버(mock.js)로 여러 교회·알림·중복 저장을 확인한다.
//   저장소 루트에서 정적 서버를 띄운 뒤:  node gajeong/test/run.js  (기본 http://127.0.0.1:8899)
const { chromium, devices } = require('playwright');
const fs = require('fs'), path = require('path');
const BASE = (process.env.BASE || 'http://127.0.0.1:8899') + '/gajeong/';
const MOCK = fs.readFileSync(path.join(__dirname, 'mock.js'), 'utf8');
const NOW = new Date('2026-10-19T02:00:00Z'); // 멜번 월 13시(→10/19 주) · LA 일 19시(→10/12 주)

const SEED = { db: {
  church_church: [
    { id: 'cb', slug: 'bangjoo', name: '멜번방주교회 & ALF', timezone: 'Australia/Melbourne', logo_url: 'assets/logo.png', theme: 'sky' },
    { id: 'cl', slug: 'lach01', name: 'LA 새소망교회', timezone: 'America/Los_Angeles', logo_url: '', theme: 'night',
      terms: { unit: '다락방', leader: '순장', member: '순원' } } ],
  church_profile: [
    { id: 'p1', login_id: 'pastor1', name: '담임목사', role: 'pastor', church_id: 'cb' },
    { id: 'm1', login_id: 'mokja1', name: '김목자', role: 'mokja', church_id: 'cb' },
    { id: 'p2', login_id: 'pastorla', name: '이목사', role: 'pastor', church_id: 'cl' },
    { id: 'm2', login_id: 'mokjala', name: '박목자', role: 'mokja', church_id: 'cl' } ],
  church_mokjang: [
    { id: 'mj1', name: '김 목장', mokja_id: 'm1', mokja_name: '김목자', church_id: 'cb', sort_order: 0, active: true, created_at: '2026-01-01' },
    { id: 'mj2', name: 'LA 목장', mokja_id: 'm2', mokja_name: '박목자', church_id: 'cl', sort_order: 0, active: true, created_at: '2026-01-01' } ],
  church_mokwon: [
    { id: 'w1', mokjang_id: 'mj1', name: '정하늘', tag: '', sort_order: 1, active: true, created_at: '2026-01-01' },
    { id: 'w2', mokjang_id: 'mj1', name: '최민수', tag: '', sort_order: 2, active: true, created_at: '2026-01-02' } ],
  church_journal: [
    { id: '11111111-1111-4111-8111-111111111111', mokjang_id: 'mj1', week_start: '2026-10-12', status: 'submitted', body: '지난주 이야기',
      mokjang_prayer: '', present_count: 2, submitted_at: '2026-10-13T00:00:00Z', created_at: '2026-10-13', updated_at: '2026-10-13' },
    { id: '22222222-2222-4222-8222-222222222222', mokjang_id: 'mj2', week_start: '2026-10-12', status: 'submitted', body: 'LA 이야기',
      mokjang_prayer: '', present_count: 3, submitted_at: '2026-10-13T00:00:00Z', created_at: '2026-10-13', updated_at: '2026-10-13' } ],
  church_prayer: [], church_comment: [], church_push: [] } };

let pass = 0, fail = 0;
const ok = (n, c, x = '') => { c ? (pass++, console.log('  PASS', n)) : (fail++, console.log('  FAIL', n, x)); };

async function ctx(browser, opts = {}) {
  const c = await browser.newContext(Object.assign({ viewport: { width: 900, height: 1000 } }, opts.device || {}));
  await c.clock.install({ time: NOW });
  await c.addInitScript(`window.__SEED=${JSON.stringify(SEED)};${opts.noPush ? 'window.__NO_PUSH=1;' : ''}${opts.deny ? 'window.__DENY=1;' : ''}`);
  await c.addInitScript(MOCK);
  await c.route('**/cdn.jsdelivr.net/**', r => r.abort());
  const p = await c.newPage();
  p.errs = []; p.on('pageerror', e => p.errs.push(String(e)));
  return { c, p };
}
async function login(p, id) {
  await p.goto(BASE + 'index.html'); await p.waitForTimeout(250);
  await p.fill('#lid', id); await p.fill('#pw', 'pass1234'); await p.click('#btn-login');
  await p.waitForURL(/moksa|mokjang/); await p.waitForSelector('.top h1'); await p.waitForTimeout(400);
}
const calls = p => p.evaluate(() => window.__calls);
const db = p => p.evaluate(() => window.__DB());

(async () => {
  const b = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {});

  console.log('\n[1] 로그인 화면 — 교회 표시');
  { const { c, p } = await ctx(b);
    await p.goto(BASE + 'index.html'); await p.waitForTimeout(300);
    ok('처음 오면 특정 교회 이름 없음', (await p.textContent('#hero-church')).trim() === '');
    ok('처음 오면 공용 아이콘', /icon-192\.png$/.test(await p.getAttribute('#hero-logo', 'src')));
    ok('공용 화면에는 새 교회 등록 링크', await p.isVisible('#to-setup'));
    await p.goto(BASE + 'index.html?c=bangjoo'); await p.waitForTimeout(300);
    ok('?c=bangjoo → 교회 이름', (await p.textContent('#hero-church')).includes('멜번방주교회'));
    ok('?c=bangjoo → 교회 로고', /assets\/logo\.png$/.test(await p.getAttribute('#hero-logo', 'src')));
    ok('?c=bangjoo → 파란 디자인', (await p.getAttribute('html', 'data-theme')) === 'sky');
    await p.goto(BASE + 'index.html?c=lach01'); await p.waitForTimeout(300);
    ok('?c=lach01 → 다락방 나눔터 · 밤 디자인', (await p.textContent('.hero h1')) === '다락방 나눔터' && (await p.getAttribute('html', 'data-theme')) === 'night');
    await p.goto(BASE + 'index.html?c=bangjoo'); await p.waitForTimeout(300);
    ok('다시 방주 → 목장 나눔터로 돌아옴(섞이지 않음)', (await p.textContent('.hero h1')) === '목장 나눔터' && (await p.getAttribute('html', 'data-theme')) === 'sky');
    ok('교회 화면에는 새 교회 등록 링크 없음', !(await p.isVisible('#to-setup')));
    await p.goto(BASE + 'index.html?new'); await p.waitForTimeout(300);
    ok('?new → 기억한 교회가 있어도 등록 화면 바로', await p.isVisible('#setup') && (await p.textContent('#hero-church')).trim() === '');
    { const c2 = await b.newContext(); const q = await c2.newPage();
      await q.route('**/rpc/**', r => new Promise(res => setTimeout(() => res(r.abort()), 3000)));
      await q.route('**/cdn.jsdelivr.net/**', r => r.abort());
      await q.goto(BASE + 'bangjoo/'); await q.waitForURL(/\?c=bangjoo/, { waitUntil: 'domcontentloaded' });
      ok('교회 주소로 들어오면 서버 답 전에도 처음부터 교회 로고(깜빡임 없음)', /assets\/logo\.png$/.test(await q.getAttribute('#hero-logo', 'src')) && !(await q.isVisible('#to-setup')));
      await q.goto(BASE + 'index.html?c=zzzz', { waitUntil: 'domcontentloaded' });
      ok('다른 교회 주소면 기억한 교회 로고를 쓰지 않음(섞이지 않음)', (await q.getAttribute('#hero-logo', 'src')) === null && (await q.textContent('#hero-church')) === '');
      await c2.close(); }
    await p.goto(BASE + 'index.html?new=BJ-V3DEXG'); await p.waitForTimeout(300);
    ok('?new=코드 → 초대 코드 미리 채움', (await p.inputValue('#scode')) === 'BJ-V3DEXG');
    await p.goto(BASE + 'bangjoo/'); await p.waitForURL(/\?c=bangjoo/); await p.waitForTimeout(300);
    ok('/bangjoo/ → 교회 화면으로', (await p.textContent('#hero-church')).includes('멜번방주교회'));
    await c.close(); }

  console.log('\n[2] 교회마다 시간대 · 서로 안 보임');
  { const { c, p } = await ctx(b);
    await login(p, 'pastor1');
    ok('머리말에 교회 이름', (await p.textContent('.top .church')) === '멜번방주교회 & ALF');
    ok('멜번 기준 이번 주 = 10월 19일 주', (await p.textContent('#wk-label')).startsWith('2026년 10월 19일'), await p.textContent('#wk-label'));
    await p.click('#wk-prev'); await p.waitForTimeout(300);
    const list = await p.textContent('#week-list');
    ok('우리 교회 목장만 보임', list.includes('김 목장') && !list.includes('LA 목장'));
    await p.click('#btn-signout'); await p.waitForURL(/index\.html/); await p.waitForTimeout(300);
    ok('로그아웃 뒤 로그인 화면이 교회를 기억', (await p.textContent('#hero-church')).includes('멜번방주교회'));
    ok('JS 오류 없음', p.errs.length === 0, p.errs.join('|'));
    await c.close(); }
  { const { c, p } = await ctx(b);
    await login(p, 'pastorla');
    ok('LA 기준 이번 주 = 10월 12일 주', (await p.textContent('#wk-label')).startsWith('2026년 10월 12일'), await p.textContent('#wk-label'));
    const list = await p.textContent('#week-list');
    ok('LA 목사는 LA 목장만', list.includes('LA 목장') && !list.includes('김 목장'));
    ok('공용 아이콘(로고 없는 교회)', /icon-192\.png$/.test(await p.getAttribute('.top img.mark', 'src')));
    ok('다락방 교회: 탭 이름이 바뀜', (await p.textContent('.tabs')).includes('다락방·순장 관리') && !(await p.textContent('.tabs')).includes('목장'));
    ok('다락방 교회: 머리말', (await p.textContent('.top h1')) === '다락방 나눔터');
    ok('다락방 교회: 조사도 맞춤(순장이)', (await p.textContent('body')).includes('순장이 일기를'), '');
    ok('다락방 교회: 사람이 쓴 이름은 그대로', list.includes('LA 목장'));
    ok('다락방 교회: 밤 디자인', (await p.getAttribute('html', 'data-theme')) === 'night');
    await c.close(); }

  console.log('\n[3] 새 교회 등록');
  { const { c, p } = await ctx(b);
    await p.goto(BASE + 'index.html'); await p.waitForTimeout(250);
    await p.click('#to-setup');
    ok('시간대 목록이 채워짐', (await p.$$('#stz option')).length >= 10);
    await p.fill('#scode', 'WRONG'); await p.fill('#schurch', '새소망교회'); await p.selectOption('#stz', 'Asia/Seoul');
    await p.fill('#sname', '홍길동'); await p.fill('#slid', 'newpastor'); await p.fill('#spw', 'pass1234');
    await p.click('#btn-setup'); await p.waitForTimeout(300);
    ok('틀린 초대 코드 → 안내', /초대 코드가 맞지 않습니다/.test(await p.textContent('#msg-setup')));
    await p.fill('#scode', 'GOOD-CODE'); await p.click('#btn-setup');
    await p.waitForURL(/moksa\.html/); await p.waitForSelector('.top h1'); await p.waitForTimeout(300);
    ok('등록 뒤 새 교회 목사 화면', (await p.textContent('.top .church')) === '새소망교회');
    const reg = (await calls(p)).find(x => x.body && x.body.action === 'register_church');
    ok('시간대·이름·코드가 서버로 감', reg && reg.body.timezone === 'Asia/Seoul' && reg.body.church_name === '새소망교회');
    ok('새 교회는 목장이 비어 있음', /아직 목장이 없습니다/.test(await p.textContent('#week-list')));
    await c.close(); }

  console.log('\n[4] 목자 저장 — 중복 없음 · 제출하면 알림');
  { const { c, p } = await ctx(b);
    await login(p, 'mokja1');
    const areas = await p.$$('#members-box .f-con');
    await areas[0].fill('첫 번째 기도제목');
    await p.click('#btn-save'); await p.waitForTimeout(400);
    await areas[0].fill('고친 기도제목');
    await p.click('#btn-save'); await p.waitForTimeout(400);
    await p.click('#btn-submit'); await p.waitForTimeout(500);
    const d = await db(p);
    const j = d.church_journal.find(x => x.mokjang_id === 'mj1' && x.week_start === '2026-10-19');
    const rows = d.church_prayer.filter(x => x.journal_id === j.id);
    ok('세 번 저장해도 목원 수만큼만(2줄)', rows.length === 2, rows.length);
    ok('마지막 내용으로 저장', rows.some(x => x.content === '고친 기도제목'));
    const n = (await calls(p)).filter(x => x.fn === 'church-notify');
    ok('제출하면 알림 요청 1번', n.length === 1 && n[0].body.action === 'submitted' && n[0].body.journal_id === j.id, JSON.stringify(n));
    ok('임시 저장은 알림 안 보냄', n.length === 1);
    ok('JS 오류 없음', p.errs.length === 0, p.errs.join('|'));
    await c.close(); }

  console.log('\n[5] 목사 휴대전화 알림 켜기');
  { const { c, p } = await ctx(b);
    await login(p, 'pastor1');
    ok('알림이 꺼져 있으면 주간 현황 맨 위에 안내', await p.isVisible('#notify-ask'));
    await p.click('#notify-ask-on'); await p.waitForTimeout(400);
    const saved = (await calls(p)).find(x => x.rpc === 'church_push_save');
    ok('구독을 서버에 저장', saved && /push\.example/.test(saved.args.p_endpoint));
    ok('켜면 안내가 사라짐', !(await p.isVisible('#notify-ask')));
    await p.click('.tabs button[data-pane="manage"]'); await p.waitForTimeout(300);
    ok('관리 탭 상태: 받는 중', (await p.textContent('#notify-state')) === '이 기기에서 받는 중');
    await p.click('#notify-test'); await p.waitForTimeout(300);
    ok('시험 알림 요청', (await calls(p)).some(x => x.fn === 'church-notify' && x.body.action === 'test'));
    ok('시험 알림 안내 문구', /시험 알림을 보냈습니다/.test(await p.textContent('#msg-notify')));
    await p.click('#notify-off'); await p.waitForTimeout(300);
    ok('끄면 상태: 꺼져 있음', (await p.textContent('#notify-state')) === '꺼져 있음');
    ok('JS 오류 없음', p.errs.length === 0, p.errs.join('|'));
    await c.close(); }
  { const { c, p } = await ctx(b, { deny: true });
    await login(p, 'pastor1');
    await p.click('#notify-ask-on'); await p.waitForTimeout(300);
    ok('알림을 거부하면 고치는 방법 안내', /허용/.test(await p.textContent('#msg-notify-ask')));
    await c.close(); }
  { const { c, p } = await ctx(b, { noPush: true, device: devices['iPhone 13'] });
    await login(p, 'pastor1');
    ok('아이폰(홈 화면 아님) → 홈 화면에 추가 안내', /홈 화면에 추가/.test(await p.textContent('#notify-ask')));
    await p.click('.tabs button[data-pane="manage"]'); await p.waitForTimeout(300);
    ok('아이폰 상태 표시', (await p.textContent('#notify-state')) === '홈 화면에 추가해야 함');
    ok('아이폰에서는 켜기 단추 숨김', !(await p.isVisible('#notify-on')));
    await c.close(); }

  console.log('\n[6] 알림을 누르면 그 일기로');
  { const { c, p } = await ctx(b);
    await login(p, 'pastor1');
    // 화면이 열려 있을 때 — 주소 끝만 바뀐다
    await p.evaluate(() => { location.hash = 'j=11111111-1111-4111-8111-111111111111'; });
    await p.waitForTimeout(600);
    ok('열린 화면: 그 일기의 주로 이동', (await p.textContent('#wk-label')).startsWith('2026년 10월 12일'), await p.textContent('#wk-label'));
    ok('열린 화면: 그 목장이 펼쳐짐', await p.evaluate(() => !!document.querySelector('#week-list .mj[data-mj="mj1"]')?.open));
    await p.click('.tabs button[data-pane="manage"]'); await p.waitForTimeout(300);
    await p.evaluate(() => { location.hash = 'j=11111111-1111-4111-8111-111111111111'; });
    await p.waitForTimeout(600);
    ok('다른 탭을 보던 중에 알림을 눌러도 그 일기가 보임', await p.isVisible('#week-list .mj[data-mj="mj1"] summary'));
    // 새로 열 때
    await p.goto(BASE + 'index.html'); await p.waitForTimeout(300);
    await p.goto(BASE + 'moksa.html#j=11111111-1111-4111-8111-111111111111');
    await p.waitForSelector('#week-list .mj'); await p.waitForTimeout(600);
    ok('새 창: 그 일기의 주로 이동', (await p.textContent('#wk-label')).startsWith('2026년 10월 12일'), await p.textContent('#wk-label'));
    ok('새 창: 그 목장이 펼쳐짐', await p.evaluate(() => !!document.querySelector('#week-list .mj[data-mj="mj1"]')?.open));
    await c.close(); }

  console.log('\n[7] 교회 정보 고치기');
  { const { c, p } = await ctx(b);
    await login(p, 'pastor1');
    await p.click('.tabs button[data-pane="manage"]'); await p.waitForTimeout(300);
    ok('목자에게 보낼 주소 = 교회 전용 주소', /\/bangjoo\/$/.test(await p.inputValue('#ch-link')));
    await p.fill('#ch-name', '멜번방주교회'); await p.selectOption('#ch-tz', 'Asia/Seoul');
    await p.click('#form-church button[type="submit"]'); await p.waitForTimeout(300);
    ok('머리말 이름이 바로 바뀜', (await p.textContent('.top .church')) === '멜번방주교회');
    const ch = (await db(p)).church_church.find(x => x.id === 'cb');
    ok('이름·시간대 저장', ch.name === '멜번방주교회' && ch.timezone === 'Asia/Seoul');
    await p.selectOption('#ch-terms', '1');
    await p.click('#ch-theme .theme-pick[data-theme-id="night"]');
    ok('디자인 누르면 바로 미리 보기', (await p.getAttribute('html', 'data-theme')) === 'night');
    await p.click('#form-church button[type="submit"]'); await p.waitForTimeout(300);
    const ch3 = (await db(p)).church_church.find(x => x.id === 'cb');
    ok('부르는 말·디자인 저장', ch3.theme === 'night' && ch3.terms.unit === '다락방' && ch3.terms.leader === '순장', JSON.stringify(ch3.terms));
    ok('저장하면 화면 글자도 바로 바뀜', (await p.textContent('.tabs')).includes('다락방·순장 관리') && (await p.textContent('.top h1')) === '다락방 나눔터');
    await p.reload(); await p.waitForSelector('.top h1'); await p.waitForTimeout(300);
    ok('다시 열어도 다락방·밤 디자인', (await p.textContent('.top h1')) === '다락방 나눔터' && (await p.getAttribute('html', 'data-theme')) === 'night');
    await p.click('.tabs button[data-pane="manage"]'); await p.waitForTimeout(300);
    ok('다시 열면 고른 부르는 말이 선택돼 있음', (await p.inputValue('#ch-terms')) === '1');
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR42mP8z8BQz0AEYBxVSF8FAJ2YB/2D4nBRAAAAAElFTkSuQmCC', 'base64');
    await p.setInputFiles('#ch-logo-file', { name: 'logo.png', mimeType: 'image/png', buffer: png }); await p.waitForTimeout(600);
    const ch2 = (await db(p)).church_church.find(x => x.id === 'cb');
    ok('로고 올리기 → 서버 저장', /storage\.example\/cb\.png/.test(ch2.logo_url), ch2.logo_url);
    ok('로고 올리기 → 머리말·미리보기 바로 바뀜', /storage\.example/.test(await p.getAttribute('.top img.mark', 'src')) && /storage\.example/.test(await p.getAttribute('#ch-logo', 'src')));
    const call = (await calls(p)).find(x => x.body.action === 'set_logo');
    ok('화면이 PNG로 줄여 보냄', call && /^data:image\/png;base64,/.test(call.body.data));
    p.once('dialog', d => d.accept());
    await p.click('#ch-logo-del'); await p.waitForTimeout(400);
    ok('로고 지우기', (await db(p)).church_church.find(x => x.id === 'cb').logo_url === '' && /icon-192\.png$/.test(await p.getAttribute('#ch-logo', 'src')));
    ok('JS 오류 없음', p.errs.length === 0, p.errs.join('|'));
    await c.close(); }

  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
