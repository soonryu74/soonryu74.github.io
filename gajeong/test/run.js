// 목장 나눔터 화면 검사 — 가짜 서버(mock.js)로 여러 교회·알림·중복 저장을 확인한다.
//   저장소 루트에서 정적 서버를 띄운 뒤:  node gajeong/test/run.js  (기본 http://127.0.0.1:8899)
const { chromium, devices } = require('playwright');
const fs = require('fs'), path = require('path');
const BASE = (process.env.BASE || 'http://127.0.0.1:8899') + '/gajeong/';
const MOCK = fs.readFileSync(path.join(__dirname, 'mock.js'), 'utf8');
const NOW = new Date('2026-10-18T02:00:00Z'); // 멜번 주일 13시(→10/18 주) · LA 토 19시(→10/11 주) — 한 주는 주일부터

const SEED = { db: {
  church_church: [
    { id: 'cb', slug: 'bangjoo', name: '멜번방주교회 & ALF', timezone: 'Australia/Melbourne', logo_url: 'assets/logo.png', theme: 'sky', features: { member_dates: true, member_photos: true } },
    { id: 'cl', slug: 'lach01', name: 'LA 새소망교회', timezone: 'America/Los_Angeles', logo_url: '', theme: 'night', features: { member_photos: false },
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
    ok('멜번 기준 이번 주 = 10월 18일(주일)부터', (await p.textContent('#wk-label')).startsWith('2026년 10월 18일'), await p.textContent('#wk-label'));
    await p.click('#wk-prev'); await p.waitForTimeout(300);
    const list = await p.textContent('#week-list');
    ok('우리 교회 목장만 보임', list.includes('김 목장') && !list.includes('LA 목장'));
    await p.click('#btn-signout'); await p.waitForURL(/index\.html/); await p.waitForTimeout(300);
    ok('로그아웃 뒤 로그인 화면이 교회를 기억', (await p.textContent('#hero-church')).includes('멜번방주교회'));
    ok('JS 오류 없음', p.errs.length === 0, p.errs.join('|'));
    await c.close(); }
  { const { c, p } = await ctx(b);
    await login(p, 'pastorla');
    ok('LA 기준 이번 주 = 10월 11일(주일)부터', (await p.textContent('#wk-label')).startsWith('2026년 10월 11일'), await p.textContent('#wk-label'));
    const list = await p.textContent('#week-list');
    ok('LA 목사는 LA 목장만', list.includes('LA 목장') && !list.includes('김 목장'));
    ok('공용 아이콘(로고 없는 교회)', /icon-192\.png$/.test(await p.getAttribute('.top img.mark', 'src')));
    ok('다락방 교회: 탭 이름이 바뀜', (await p.textContent('.tabs')).includes('다락방·순장 관리') && !(await p.textContent('.tabs')).includes('목장'));
    ok('다락방 교회: 머리말', (await p.textContent('.top h1')) === '다락방 나눔터');
    ok('다락방 교회: 조사도 맞춤(순장이)', (await p.textContent('body')).includes('순장이 일기를'), '');
    ok('다락방 교회: 사람이 쓴 이름은 그대로', list.includes('LA 목장'));
    ok('다락방 교회: 밤 디자인', (await p.getAttribute('html', 'data-theme')) === 'night');
    await c.close(); }

  console.log('\n[2b] 로그인한 채 다른 교회·등록 주소를 열면');
  { const { c, p } = await ctx(b);
    await login(p, 'pastor1');
    await p.goto(BASE + 'index.html?new=BJ-V3DEXG'); await p.waitForTimeout(500);
    ok('등록 주소: 내 교회로 넘기지 않고 등록 화면', /index\.html/.test(p.url()) && await p.isVisible('#setup'));
    ok('등록 주소: 지금 들어가 있는 교회를 알려 줌', await p.isVisible('#signed-in') && (await p.textContent('#signed-in')).includes('멜번방주교회'));
    ok('등록 주소: 교회 이름·디자인 섞이지 않음', (await p.textContent('#hero-church')).trim() === '' && (await p.getAttribute('html', 'data-theme')) !== 'sky');
    await p.goto(BASE + 'index.html?c=lach01'); await p.waitForTimeout(500);
    ok('다른 교회 주소: 그 교회 화면 그대로', /index\.html/.test(p.url()) && (await p.textContent('#hero-church')).includes('LA 새소망'));
    ok('다른 교회 주소: 내 교회로 가기 단추', await p.isVisible('#go-mine'));
    await p.click('#go-mine'); await p.waitForURL(/moksa/); await p.waitForSelector('.top h1'); await p.waitForTimeout(300);
    ok('내 교회로 돌아오면 내 교회 모양(파랑, 목장)', (await p.getAttribute('html', 'data-theme')) === 'sky' && (await p.textContent('.top h1')) === '목장 나눔터');
    await p.goto(BASE + 'index.html?c=bangjoo'); await p.waitForURL(/moksa/);
    ok('내 교회 주소면 바로 내 화면으로', /moksa/.test(p.url()));
    ok('JS 오류 없음', p.errs.length === 0, p.errs.join('|'));
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
    await p.fill('#sslug', 'bangjoo'); await p.waitForTimeout(800);
    ok('교회 주소: 이미 쓰는 주소면 바로 안내', /이미 다른 교회가 쓰는 주소/.test(await p.textContent('#slug-hint')));
    await p.fill('#sslug', ''); await p.type('#sslug', 'Ha Nul!'); await p.waitForTimeout(800);
    ok('교회 주소: 대문자·빈칸·기호는 빼고 소문자로', (await p.inputValue('#sslug')) === 'hanul' && /쓸 수 있는 주소/.test(await p.textContent('#slug-hint')), await p.inputValue('#sslug'));
    await p.fill('#scode', 'GOOD-CODE'); await p.click('#btn-setup');
    await p.waitForSelector('#got-code:not([hidden])'); 
    ok('등록하면 복구 코드를 보여 줌', (await p.textContent('#code-box')) === 'ABCD-EFGH-JKMN');
    await p.click('#code-done');
    await p.waitForURL(/moksa\.html/); await p.waitForSelector('.top h1'); await p.waitForTimeout(300);
    ok('등록 뒤 새 교회 목사 화면', (await p.textContent('.top .church')) === '새소망교회');
    const reg = (await calls(p)).filter(x => x.body && x.body.action === 'register_church').pop();
    ok('시간대·이름·코드가 서버로 감', reg && reg.body.timezone === 'Asia/Seoul' && reg.body.church_name === '새소망교회');
    ok('고른 교회 주소로 등록', reg.body.slug === 'hanul' && (await db(p)).church_church.some(x => x.slug === 'hanul'), JSON.stringify(reg.body.slug) + JSON.stringify((await db(p)).church_church.map(x => x.slug)));
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
    const j = d.church_journal.find(x => x.mokjang_id === 'mj1' && x.week_start === '2026-10-18');
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
    const saved = (await calls(p)).find(x => x.rpc === 'church_push_save2');
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
    ok('열린 화면: 그 일기의 주로 이동', (await p.textContent('#wk-label')).startsWith('2026년 10월 11일'), await p.textContent('#wk-label'));
    ok('열린 화면: 그 목장이 펼쳐짐', await p.evaluate(() => !!document.querySelector('#week-list .mj[data-mj="mj1"]')?.open));
    await p.click('.tabs button[data-pane="manage"]'); await p.waitForTimeout(300);
    await p.evaluate(() => { location.hash = 'j=11111111-1111-4111-8111-111111111111'; });
    await p.waitForTimeout(600);
    ok('다른 탭을 보던 중에 알림을 눌러도 그 일기가 보임', await p.isVisible('#week-list .mj[data-mj="mj1"] summary'));
    // 새로 열 때
    await p.goto(BASE + 'index.html'); await p.waitForTimeout(300);
    await p.goto(BASE + 'moksa.html#j=11111111-1111-4111-8111-111111111111');
    await p.waitForSelector('#week-list .mj'); await p.waitForTimeout(600);
    ok('새 창: 그 일기의 주로 이동', (await p.textContent('#wk-label')).startsWith('2026년 10월 11일'), await p.textContent('#wk-label'));
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

  console.log('\n[10] 비밀번호 잊었을 때');
  { const { c, p } = await ctx(b);
    await login(p, 'pastor1');
    await p.click('.tabs button[data-pane="manage"]'); await p.waitForTimeout(300);
    await p.click('#btn-new-code'); await p.waitForTimeout(300);
    ok('목사: 복구 코드 새로 받기', (await p.textContent('#code-box')) === 'PQRS-TUVW-XYZ2' && await p.isVisible('#code-box'));
    await p.click('#btn-signout'); await p.waitForURL(/index/); await p.waitForTimeout(300);
    await p.click('#to-recover'); await p.waitForTimeout(200);
    ok('잊었나요 → 새 비밀번호 화면', await p.isVisible('#recover') && !(await p.isVisible('#login')));
    await p.fill('#rid', 'pastor1'); await p.fill('#rcode', 'wrong-code-xx'); await p.fill('#rpw1', 'newpass99'); await p.fill('#rpw2', 'newpass99');
    await p.click('#btn-recover'); await p.waitForTimeout(300);
    ok('틀린 복구 코드는 안 됨', (await p.textContent('#msg-recover')).includes('맞지 않습니다'));
    await p.fill('#rcode', 'pqrs tuvw xyz2'); await p.click('#btn-recover');
    await p.waitForURL(/moksa/); await p.waitForSelector('.top h1');
    ok('맞는 코드(띄어쓰기·소문자도 됨)면 새 비밀번호로 바로 들어감', /moksa/.test(p.url()));
    ok('JS 오류 없음', p.errs.length === 0, p.errs.join('|'));
    await c.close(); }

  console.log('\n[9] 탈퇴');
  { const { c, p } = await ctx(b);
    await login(p, 'mokja1');
    await p.click('.tabs button[data-pane="mine"]'); await p.waitForTimeout(300);
    await p.fill('#leave-pw', 'wrong'); p.once('dialog', d => d.accept());
    await p.click('#btn-leave'); await p.waitForTimeout(400);
    ok('목자: 비밀번호 틀리면 탈퇴 안 됨', (await p.textContent('#msg-leave')).includes('비밀번호가 맞지 않습니다') && (await db(p)).church_profile.some(x => x.id === 'm1'));
    await p.fill('#leave-pw', 'pass1234'); p.once('dialog', d => d.accept());
    await p.click('#btn-leave'); await p.waitForURL(/left=1/); await p.waitForTimeout(400);
    ok('목자: 탈퇴하면 계정이 지워지고 로그인 화면으로', !(await db(p)).church_profile.some(x => x.id === 'm1') && (await p.textContent('#msg-login')).includes('탈퇴했습니다'));
    ok('목자: 쓴 일기는 교회 기록으로 남음', (await db(p)).church_journal.some(x => x.mokjang_id === 'mj1'));
    await c.close(); }
  { const { c, p } = await ctx(b);
    await login(p, 'pastorla');
    await p.click('.tabs button[data-pane="manage"]'); await p.waitForTimeout(300);
    await p.fill('#leave-pw', 'pass1234'); p.once('dialog', d => d.accept());
    await p.click('#btn-leave'); await p.waitForTimeout(400);
    ok('마지막 목사는 내 계정만 탈퇴 못 함', (await p.textContent('#msg-leave')).length > 5 && (await db(p)).church_profile.some(x => x.id === 'p2'));
    await p.fill('#leave-church', '틀린 이름'); await p.click('#btn-drop-church'); await p.waitForTimeout(300);
    ok('교회 이름이 다르면 안 지워짐', (await db(p)).church_church.some(x => x.id === 'cl'));
    await p.fill('#leave-church', 'LA 새소망교회'); p.once('dialog', d => d.accept());
    await p.click('#btn-drop-church'); await p.waitForURL(/left=1/); await p.waitForTimeout(300);
    const d9 = await db(p);
    ok('교회 전체 지우기: 교회·계정·목장·일기 모두 사라짐', !d9.church_church.some(x => x.id === 'cl') && !d9.church_profile.some(x => x.church_id === 'cl') && !d9.church_mokjang.some(x => x.church_id === 'cl') && !d9.church_journal.some(x => x.mokjang_id === 'mj2'));
    ok('다른 교회는 그대로', d9.church_church.some(x => x.id === 'cb') && d9.church_mokjang.some(x => x.id === 'mj1'));
    await c.close(); }

  console.log('\n[8] 영어 화면');
  { const { c, p } = await ctx(b);
    await p.goto(BASE + 'index.html'); await p.waitForTimeout(300);
    ok('처음엔 한국어 + English 단추', (await p.textContent('.hero h1')) === '목장 나눔터' && (await p.textContent('#lang-bar')).includes('English'));
    await p.click('#lang-bar .lang-btn'); await p.waitForTimeout(500);
    ok('English 누르면 로그인 화면이 영어로', (await p.textContent('.hero h1')) === 'Mokjang Sharing' && (await p.textContent('#login h2')) === 'Sign in');
    ok('입력칸 안내도 영어', (await p.getAttribute('#pw', 'placeholder')) === 'Password');
    ok('단추는 한국어로 돌아가기', (await p.textContent('#lang-bar')).includes('한국어'));
    await p.fill('#lid', 'nobody'); await p.fill('#pw', 'x'); await p.click('#btn-login'); await p.waitForTimeout(300);
    ok('오류 글도 영어', (await p.textContent('#msg-login')).includes('incorrect'));
    await login(p, 'pastor1');
    ok('목사 화면 탭 영어', (await p.textContent('.tabs')).includes('Groups & leaders') && (await p.textContent('.tabs')).includes('Prayer overview'));
    ok('주 표시 영어', /^Oct 18 – Oct 24, 2026/.test(await p.textContent('#wk-label')), await p.textContent('#wk-label'));
    ok('직함 영어', (await p.textContent('.top .who')).includes('Pastor 담임'), await p.textContent('.top .who'));
    await p.click('#wk-prev'); await p.waitForTimeout(300);
    ok('목장 상태 뱃지 영어', (await p.textContent('#week-list')).includes('Submitted'));
    ok('사람이 쓴 목장 이름은 그대로', (await p.textContent('#week-list')).includes('김 목장'));
    await p.click('.tabs button[data-pane="manage"]'); await p.waitForTimeout(300);
    ok('관리 화면 영어', (await p.textContent('#pane-manage')).includes('Create a leader account'));
    ok('한국어 글자가 거의 안 남음', await p.evaluate(() => {
      const w = document.createTreeWalker(document.querySelector('#pane-manage'), NodeFilter.SHOW_TEXT); let n, left = [];
      while ((n = w.nextNode())) if (/[가-힣]/.test(n.nodeValue) && n.parentNode.offsetParent && !n.parentNode.closest('#ch-terms,#manage-list,#pastor-list,input,.avatar')) left.push(n.nodeValue.trim());
      return left.filter(x => !/^(멜번방주교회|담임목사|목장|목자|목원|다락방|순장|순원|구역|구역장|구역원|셀|리더|셀원|순)/.test(x)).length === 0 || left;
    }) === true);
    await p.click('.top .lang-btn'); await p.waitForTimeout(600);
    ok('머리말 단추로 한국어로 돌아옴', (await p.textContent('.tabs')).includes('목장·목자 관리'));
    ok('JS 오류 없음', p.errs.length === 0, p.errs.join('|'));
    await c.close(); }
  { const { c, p } = await ctx(b);
    await p.addInitScript(() => localStorage.setItem('gajeong-lang', 'en'));
    await login(p, 'mokja1');
    ok('목자 화면 탭 영어', (await p.textContent('.tabs')).includes('Members') && (await p.textContent('.tabs')).includes('Past journals'));
    ok('저장 단추 영어', (await p.textContent('#btn-submit')) === 'Submit to pastor');
    ok('기도제목 칸 안내 영어', /'s prayer request$/.test(await p.getAttribute('#members-box textarea', 'placeholder')));
    ok('JS 오류 없음', p.errs.length === 0, p.errs.join('|'));
    await c.close(); }

  console.log('\n[성도 날짜] 교회 등록·생명의 삶·침례');
  { const { c, p } = await ctx(b);
    await login(p, 'mokja1');
    await p.click('.tabs button[data-pane="members"]'); await p.waitForTimeout(300);
    await p.click('#member-list .list-item[data-id="w1"] .act-dates'); await p.waitForTimeout(100);
    const f = '#member-list .list-item[data-id="w1"] .dates-form';
    ok('목자: 날짜 칸 4개', (await p.$$(f + ' input[type=date]')).length === 4);
    await p.fill(f + ' [name=life_start]', '2026-03-01'); await p.fill(f + ' [name=life_end]', '2026-01-01');
    await p.click(f + ' button[type=submit]'); await p.waitForTimeout(300);
    ok('목자: 끝이 시작보다 앞이면 막음', (await p.textContent('#msg-members')).includes('앞입니다'));
    await p.fill(f + ' [name=registered_on]', '2024-05-12'); await p.fill(f + ' [name=life_end]', '');
    await p.fill(f + ' [name=baptized_on]', '2025-01-05');
    await p.click(f + ' button[type=submit]'); await p.waitForTimeout(400);
    const w1 = (await db(p)).church_mokwon.find(x => x.id === 'w1');
    ok('목자: 날짜 저장됨', w1.registered_on === '2024-05-12' && w1.life_start === '2026-03-01' && !w1.life_end && w1.baptized_on === '2025-01-05', JSON.stringify(w1));
    const line = (await p.textContent('#member-list .list-item[data-id="w1"] .s')).replace(/\u00a0/g, ' ');
    ok('목자: 명단에 날짜 줄', line.includes('교회 등록 2024. 5. 12.') && line.includes('생명의 삶 2026. 3. 1. ~ 하는 중') && line.includes('침례 2025. 1. 5.'), line);
    ok('JS 오류 없음', p.errs.length === 0, p.errs.join('|'));
    await c.close(); }
  { const { c, p } = await ctx(b);
    await login(p, 'pastor1');
    await p.evaluate(() => { const d = window.__DB().church_mokwon[0]; d.baptized_on = '2025-01-05'; d.life_start = '2026-03-01'; });
    await p.click('.tabs button[data-pane="people"]'); await p.waitForTimeout(400);
    const txt = await p.textContent('#people-list');
    ok('목사: 성도 명단에 목장별 목원', txt.includes('김 목장') && txt.includes('정하늘') && txt.includes('최민수'), txt);
    ok('목사: 다른 교회 목원은 안 보임', !txt.includes('LA 목장'));
    await p.selectOption('#pp-filter', 'nobap'); await p.waitForTimeout(100);
    const nb = await p.textContent('#people-list');
    ok('목사: 침례 아직 → 최민수만', nb.includes('최민수') && !nb.includes('정하늘'), nb);
    await p.click('#people-list .list-item[data-id="w2"] .act-dates');
    await p.fill('#people-list .dates-form [name=baptized_on]', '2026-10-11');
    await p.click('#people-list .dates-form button[type=submit]'); await p.waitForTimeout(400);
    ok('목사: 날짜 저장됨', (await db(p)).church_mokwon.find(x => x.id === 'w2').baptized_on === '2026-10-11');
    ok('목사: 저장 후 필터에서 빠짐', (await p.textContent('#people-list')).includes('해당하는 분이 없습니다'));
    ok('목사: 숫자 칸', (await p.textContent('#pp-stat')).replace(/\s/g, '').startsWith('2목원2침례1생명의 삶 하는 중'.replace(/\s/g, '')), await p.textContent('#pp-stat'));
    ok('JS 오류 없음', p.errs.length === 0, p.errs.join('|'));
    await c.close(); }
  { const { c, p } = await ctx(b);
    await p.addInitScript(() => localStorage.setItem('gajeong-lang', 'en'));
    await login(p, 'pastor1');
    await p.click('.tabs button[data-pane="people"]'); await p.waitForTimeout(400);
    ok('영어: 성도 명단 탭·필터', (await p.textContent('.tabs')).includes('Church members') && (await p.textContent('#pp-filter')).includes('Not yet baptized'));
    await c.close(); }

  { const { c, p } = await ctx(b);
    await login(p, 'pastorla');
    ok('다른 교회(기능 안 켬): 성도 명단 탭 없음', !(await p.isVisible('.tabs button[data-pane="people"]')));
    await c.close(); }
  { const { c, p } = await ctx(b);
    await login(p, 'mokjala');
    await p.click('.tabs button[data-pane="members"]'); await p.waitForTimeout(300);
    ok('다른 교회(기능 안 켬): 목원 날짜 단추 없음', (await p.$$('#member-list .act-dates')).length === 0);
    await c.close(); }

  console.log('\n[성도 사진] 방주교회만 · 줄여서 · 비공개');
  { const { c, p } = await ctx(b);
    await login(p, 'mokja1');
    await p.click('.tabs button[data-pane="members"]'); await p.waitForTimeout(300);
    ok('사진 없으면 이름 첫 글자', (await p.textContent('#member-list .list-item[data-id="w1"] .avatar')).trim() === '정');
    ok('동의 안내가 보임', await p.isVisible('#photo-hint'));
    const [fc] = await Promise.all([p.waitForEvent('filechooser'), p.click('#member-list .list-item[data-id="w1"] .act-photo')]);
    await fc.setFiles(path.join(__dirname, '..', 'assets', 'og.png')); await p.waitForTimeout(800);
    let d = await db(p);
    const ph = (d.__photos || {})['cb/w1.jpg'];
    ok('사진은 JPEG로 줄여서 올라감', ph && ph.type === 'image/jpeg' && ph.size > 0 && ph.size < 80000, JSON.stringify(ph));
    ok('목원에 사진 경로 저장', d.church_mokwon.find(w => w.id === 'w1').photo_path === 'cb/w1.jpg');
    ok('명단에 사진이 보임', await p.$eval('#member-list .list-item[data-id="w1"] .avatar', e => e.tagName) === 'IMG');
    p.once('dialog', dl => dl.accept());
    await p.click('#member-list .list-item[data-id="w1"] .act-photo-del'); await p.waitForTimeout(500);
    d = await db(p);
    ok('사진 지우기', !(d.__photos || {})['cb/w1.jpg'] && !d.church_mokwon.find(w => w.id === 'w1').photo_path);
    const [fc2] = await Promise.all([p.waitForEvent('filechooser'), p.click('#member-list .list-item[data-id="w2"] .act-photo')]);
    await fc2.setFiles(path.join(__dirname, '..', 'assets', 'og.png')); await p.waitForTimeout(800);
    ok('JS 오류 없음', p.errs.length === 0, p.errs.join('|'));
    await p.evaluate(() => CHURCH.signOut());
    await login(p, 'pastor1');
    await p.click('.tabs button[data-pane="people"]'); await p.waitForTimeout(500);
    ok('목사 성도 명단에 사진', await p.$eval('#people-list .list-item[data-id="w2"] .avatar', e => e.tagName) === 'IMG');
    await c.close(); }
  { const { c, p } = await ctx(b);
    await login(p, 'mokjala');
    await p.click('.tabs button[data-pane="members"]'); await p.waitForTimeout(300);
    ok('사진을 끈 교회: 사진 단추·자리 없음', (await p.$$('#member-list .act-photo, #member-list .avatar')).length === 0 && !(await p.isVisible('#photo-hint')));
    await c.close(); }

  console.log('\n[계정 사진] 목자 본인 사진 → 목사님이 봄');
  { const { c, p } = await ctx(b);
    await login(p, 'mokja1');
    await p.click('.tabs button[data-pane="mine"]'); await p.waitForTimeout(300);
    ok('목자 [내 계정]에 내 사진 칸', await p.isVisible('#my-photo-card') && (await p.textContent('#my-photo .avatar')).trim() === '김');
    const [fc] = await Promise.all([p.waitForEvent('filechooser'), p.click('#my-photo-pick')]);
    await fc.setFiles(path.join(__dirname, '..', 'assets', 'og.png')); await p.waitForTimeout(800);
    let d = await db(p);
    ok('목자 본인 사진 올라감', (d.__photos || {})['cb/p_m1.jpg'] && d.church_profile.find(x => x.id === 'm1').photo_path === 'cb/p_m1.jpg');
    ok('내 사진이 보임', await p.$eval('#my-photo .avatar', e => e.tagName) === 'IMG' && await p.isVisible('#my-photo-del'));
    ok('JS 오류 없음', p.errs.length === 0, p.errs.join('|'));
    await p.evaluate(() => CHURCH.signOut());
    await login(p, 'pastor1');
    ok('목사 주간 현황에 목자 사진', await p.$eval('#week-list .mj[data-mj="mj1"] summary .avatar', e => e.tagName) === 'IMG');
    await p.click('.tabs button[data-pane="manage"]'); await p.waitForTimeout(500);
    ok('목장 목록에 목자 사진', await p.$eval('#manage-list .list-item[data-mj="mj1"] .avatar', e => e.tagName) === 'IMG');
    ok('목사 [내 사진] 칸', await p.isVisible('#my-photo-card'));
    await p.evaluate(() => { const D = window.__DB(); D.church_profile.find(x => x.id === 'm1').photo_path = null; sessionStorage.setItem('__mock_db', JSON.stringify(D)); });
    await p.click('.tabs button[data-pane="week"]'); await p.click('.tabs button[data-pane="manage"]'); await p.waitForTimeout(500);
    const [fc2] = await Promise.all([p.waitForEvent('filechooser'), p.click('#manage-list .list-item[data-mj="mj1"] .act-mphoto')]);
    await fc2.setFiles(path.join(__dirname, '..', 'assets', 'og.png')); await p.waitForTimeout(800);
    ok('목사님이 목자 사진을 대신 넣음', (await db(p)).church_profile.find(x => x.id === 'm1').photo_path === 'cb/p_m1.jpg' && (await p.textContent('#msg-manage')).includes('사진을 넣었습니다'));
    ok('JS 오류 없음', p.errs.length === 0, p.errs.join('|'));
    await c.close(); }
  { const { c, p } = await ctx(b);
    await login(p, 'mokjala');
    await p.click('.tabs button[data-pane="mine"]'); await p.waitForTimeout(300);
    ok('사진을 끈 교회: 내 사진 칸 없음', !(await p.isVisible('#my-photo-card')));
    await c.close(); }

  console.log('\n[주일부터 새 주] 지난주 말씀은 지난주에 · 이번 주는 빈 화면');
  { const { c, p } = await ctx(b);
    await login(p, 'pastor1');
    await p.evaluate(() => { const D = window.__DB(); D.church_comment.push({ id: 'cm9', journal_id: '11111111-1111-4111-8111-111111111111', author_id: 'p1', author_name: '담임목사', body: '지난주 말씀', created_at: '2026-10-13T00:00:00Z' }); sessionStorage.setItem('__mock_db', JSON.stringify(D)); });
    await p.reload(); await p.waitForSelector('.top h1'); await p.waitForTimeout(500);
    ok('주일: 이번 주는 비어 있음(지난주 말씀 안 보임)', (await p.textContent('#wk-label')).startsWith('2026년 10월 18일') && !(await p.textContent('#week-list')).includes('지난주 말씀'));
    await p.click('#wk-prev'); await p.waitForTimeout(500);
    await p.click('#week-list .mj[data-mj="mj1"] summary'); await p.waitForTimeout(200);
    ok('지난주로 가면 지난주 일기·말씀 (예전 월요일 기준 일기도 찾음)', (await p.textContent('#week-list')).includes('지난주 말씀') && (await p.textContent('#week-list')).includes('지난주 이야기'));
    ok('JS 오류 없음', p.errs.length === 0, p.errs.join('|'));
    await c.close(); }
  { const { c, p } = await ctx(b);
    await login(p, 'mokja1');
    await p.evaluate(() => { const D = window.__DB(); const j = D.church_journal.find(x => x.id === '11111111-1111-4111-8111-111111111111'); j.status = 'draft'; j.week_start = '2026-10-12';
      D.church_journal = D.church_journal.filter(x => !(x.mokjang_id === 'mj1' && x.week_start === '2026-10-18')); sessionStorage.setItem('__mock_db', JSON.stringify(D)); });
    await p.reload(); await p.waitForSelector('.top h1'); await p.waitForTimeout(600);
    ok('주일에 지난주 일기가 제출 전이면 지난주를 먼저 엶', (await p.textContent('#wk-label')).startsWith('2026년 10월 11일') && (await p.textContent('#msg-write')).includes('지난주를 먼저'), await p.textContent('#wk-label'));
    ok('예전(월요일) 일기를 주일 기준으로 옮겨 둠', (await db(p)).church_journal.find(x => x.id === '11111111-1111-4111-8111-111111111111').week_start === '2026-10-11');
    await p.click('#wk-next'); await p.waitForTimeout(400);
    ok('[다음주]로 이번 주', (await p.textContent('#wk-label')).startsWith('2026년 10월 18일'));
    ok('이번 주 모인 날 기본값 = 그 주 금요일', (await p.inputValue('#met-on')) === '2026-10-23', await p.inputValue('#met-on'));
    ok('JS 오류 없음', p.errs.length === 0, p.errs.join('|'));
    await c.close(); }

  console.log('\n[주간 현황 숫자] 네 칸의 합 = 전체 목장');
  { const { c, p } = await ctx(b);
    await login(p, 'pastor1');
    await p.evaluate(() => { const D = window.__DB();
      D.church_mokjang.push({ id: 'mj3', name: '세 목장', mokja_id: null, mokja_name: '', church_id: 'cb', sort_order: 3, active: true, created_at: '2026-01-03' },
                            { id: 'mj4', name: '네 목장', mokja_id: null, mokja_name: '', church_id: 'cb', sort_order: 4, active: true, created_at: '2026-01-04' },
                            { id: 'mj5', name: '쉬는 목장', mokja_id: null, mokja_name: '', church_id: 'cb', sort_order: 5, active: false, created_at: '2026-01-05' });
      D.church_journal.push({ id: 'j3', mokjang_id: 'mj3', week_start: '2026-10-11', status: 'draft', body: '', created_at: '2026-10-13', updated_at: '2026-10-13' });
      sessionStorage.setItem('__mock_db', JSON.stringify(D)); });
    await p.reload(); await p.waitForSelector('.top h1'); await p.waitForTimeout(400);
    await p.click('#wk-prev'); await p.waitForTimeout(500);
    const st = (await p.textContent('#stat')).replace(/\s/g, '');
    ok('지난주: 전체 3 = 제출 1 + 쓰는 중 1 + 아직 1 (쉬는 목장 빼고)', st === '3전체목장1제출함1쓰는중1아직안씀', st);
    ok('설명 줄', (await p.textContent('#stat-line')).includes('목장 3곳 중 2곳이 썼고, 그중 1곳이 제출'));
    await p.click('#wk-this'); await p.waitForTimeout(500);
    ok('이번 주(빈 주): 전체 3 · 아직 3', (await p.textContent('#stat')).replace(/\s/g, '') === '3전체목장0제출함0쓰는중3아직안씀');
    await c.close(); }

  console.log('\n[목사님 말씀] 목자에게 알림 · 말씀 앞에 목사님 사진');
  { const { c, p } = await ctx(b);
    await login(p, 'pastor1');
    await p.evaluate(() => { const D = window.__DB(); D.church_profile.find(x => x.id === 'p1').photo_path = 'cb/p_p1.jpg';
      D.__photos = { 'cb/p_p1.jpg': { type: 'image/jpeg', size: 1000 } }; sessionStorage.setItem('__mock_db', JSON.stringify(D)); });
    await p.reload(); await p.waitForSelector('.top h1'); await p.waitForTimeout(400);
    await p.click('#wk-prev'); await p.waitForTimeout(500);
    await p.click('#week-list .mj[data-mj="mj1"] summary');
    await p.fill('#week-list .mj[data-mj="mj1"] .cmt textarea', '수고 많으셨습니다');
    await p.click('#week-list .mj[data-mj="mj1"] .cmt button'); await p.waitForTimeout(600);
    const cm = (await db(p)).church_comment.find(x => x.body === '수고 많으셨습니다');
    const n = (await calls(p)).filter(x => x.fn === 'church-notify' && x.body.action === 'commented');
    ok('말씀을 남기면 목자 알림 요청', cm && n.length === 1 && n[0].body.comment_id === cm.id, JSON.stringify(n));
    ok('목사 화면: 말씀 앞에 목사님 사진', await p.$eval('#week-list .mj[data-mj="mj1"] .cmt-head .avatar', e => e.tagName) === 'IMG');
    await p.click('.top #btn-signout').catch(() => {}); await p.waitForTimeout(600);
    await login(p, 'mokja1');
    ok('목자: 알림이 꺼져 있으면 일기 쓰기 맨 위에 안내', await p.isVisible('#notify-ask') && (await p.textContent('#notify-ask')).includes('목사님이 말씀을'));
    await p.click('#notify-ask-on'); await p.waitForTimeout(400);
    ok('목자: 알림 켜짐', !(await p.isVisible('#notify-ask')) && (await db(p)).church_push.length > 0);
    await p.goto(BASE + 'mokjang.html#j=11111111-1111-4111-8111-111111111111'); await p.waitForSelector('.top h1'); await p.waitForTimeout(900);
    ok('알림을 누르면 [지난 일기]에서 그 주가 펼쳐짐', await p.isVisible('#pane-past') && await p.$eval('#past-list details[data-id="11111111-1111-4111-8111-111111111111"]', e => e.open));
    ok('목자 화면: 말씀과 목사님 사진', (await p.textContent('#past-list')).includes('수고 많으셨습니다') && await p.$eval('#past-list .cmt-head .avatar', e => e.tagName) === 'IMG');
    ok('주소 끝 #j= 지움', !(await p.evaluate(() => location.hash)));
    ok('JS 오류 없음', p.errs.length === 0, p.errs.join('|'));
    await c.close(); }
  { const { c, p } = await ctx(b);   // 사진 기능 안 켠 교회: 말씀 앞 사진 자리 없음
    await login(p, 'pastorla');   // LA는 아직 토요일 → 이번 주에 일기가 있다
    await p.click('#week-list .mj[data-mj="mj2"] summary');
    await p.fill('#week-list .mj[data-mj="mj2"] .cmt textarea', '감사합니다');
    await p.click('#week-list .mj[data-mj="mj2"] .cmt button'); await p.waitForTimeout(600);
    ok('사진을 끈 교회: 말씀은 보이고 사진 자리 없음', (await p.textContent('#week-list')).includes('감사합니다') && (await p.$$('#week-list .cmt-head .avatar')).length === 0);
    await c.close(); }

  console.log('\n[사진 기본] 교회 설정에 없으면 사진 기능이 켜짐');
  { const { c, p } = await ctx(b);
    await p.goto(BASE + 'index.html'); await p.waitForTimeout(200);
    await p.evaluate(() => { const D = window.__DB(); delete D.church_church.find(x => x.id === 'cl').features; sessionStorage.setItem('__mock_db', JSON.stringify(D)); });
    await login(p, 'mokjala');
    await p.click('.tabs button[data-pane="members"]'); await p.waitForTimeout(300);
    ok('설정 없는 교회: 사진 안내가 보임', await p.isVisible('#photo-hint'));
    await p.click('.tabs button[data-pane="mine"]'); await p.waitForTimeout(300);
    ok('설정 없는 교회: 내 사진 칸', await p.isVisible('#my-photo-card'));
    ok('JS 오류 없음', p.errs.length === 0, p.errs.join('|'));
    await c.close(); }

  console.log('\n[자주 묻는 질문] 첫 화면 · 영어');
  { const { c, p } = await ctx(b);
    await p.goto(BASE + 'index.html'); await p.waitForTimeout(400);
    ok('자주 묻는 질문 9개', (await p.$$('#faq details')).length === 9);
    await p.click('#faq details:first-of-type summary');
    ok('누르면 답이 펼쳐짐', (await p.textContent('#faq details[open]')).includes('수파베이스'));
    await p.click('.lang-btn'); await p.waitForTimeout(500);
    const left = await p.evaluate(() => [...document.querySelectorAll('#faq summary, #faq p')].map(e => e.textContent).filter(t => /[가-힣]/.test(t)));
    ok('영어로 바꾸면 질문·답 모두 영어', left.length === 0, JSON.stringify(left));
    ok('JS 오류 없음', p.errs.length === 0, p.errs.join('|'));
    await c.close(); }

  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
