// 다락방 나눔터 화면 검사 — 가짜 서버(mock.js)로 여러 교회·알림·중복 저장을 확인한다.
//   저장소 루트에서 정적 서버를 띄운 뒤:  node darak/test/run.js  (기본 http://127.0.0.1:8899)
const { chromium, devices } = require('playwright');
const fs = require('fs'), path = require('path');
const BASE = (process.env.BASE || 'http://127.0.0.1:8899') + '/darak/';
const MOCK = fs.readFileSync(path.join(__dirname, 'mock.js'), 'utf8');
const NOW = new Date('2026-10-18T02:00:00Z'); // 멜번 주일 13시(→10/18 주) · LA 토 19시(→10/11 주) — 한 주는 주일부터

const SEED = { db: {
  church_church: [
    { id: 'cb', slug: 'bangjoo', name: '멜번방주교회 & ALF', timezone: 'Australia/Melbourne', logo_url: 'assets/logo.png', theme: 'sky', features: { member_dates: true } },
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
    ok('다시 방주 → 파란 디자인으로 돌아옴(섞이지 않음) · 따로 안 정한 교회는 다락방', (await p.textContent('.hero h1')) === '다락방 나눔터' && (await p.getAttribute('html', 'data-theme')) === 'sky');
    ok('교회 화면에는 새 교회 등록 링크 없음', !(await p.isVisible('#to-setup')));
    await p.goto(BASE + 'index.html'); await p.waitForTimeout(400);
    ok('교회를 본 뒤에도 공용 첫 화면은 공용 (교회 이름·로고·색 없음)', (await p.textContent('#hero-church')).trim() === '' && /icon-192\.png$/.test(await p.getAttribute('#hero-logo', 'src'))
      && (await p.getAttribute('html', 'data-theme')) !== 'sky' && await p.isVisible('#to-setup'));
    await p.goto(BASE + 'index.html?new'); await p.waitForTimeout(300);
    ok('?new → 기억한 교회가 있어도 등록 화면 바로', await p.isVisible('#setup') && (await p.textContent('#hero-church')).trim() === '');
    await p.goto(BASE + 'index.html?new=BJ-V3DEXG'); await p.waitForTimeout(300);
    ok('?new=코드 → 초대 코드 미리 채움', (await p.inputValue('#scode')) === 'BJ-V3DEXG');
    await c.close(); }

  console.log('\n[2] 교회마다 시간대 · 서로 안 보임');
  { const { c, p } = await ctx(b);
    await login(p, 'pastor1');
    ok('머리말에 교회 이름', (await p.textContent('.top .church')) === '멜번방주교회 & ALF');
    ok('멜번 기준 이번 주 = 10월 19일 주', (await p.textContent('#wk-label')).startsWith('2026년 10월 18일'), await p.textContent('#wk-label'));
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
    ok('내 교회로 돌아오면 내 교회 모양(파랑, 다락방)', (await p.getAttribute('html', 'data-theme')) === 'sky' && (await p.textContent('.top h1')) === '다락방 나눔터');
    await p.goto(BASE + 'index.html?c=bangjoo'); await p.waitForURL(/moksa/);
    ok('내 교회 주소면 바로 내 화면으로', /moksa/.test(p.url()));
    ok('JS 오류 없음', p.errs.length === 0, p.errs.join('|'));
    await c.close(); }

  console.log('\n[3] 새 교회 등록');
  { const { c, p } = await ctx(b);
    await p.goto(BASE + 'index.html'); await p.waitForTimeout(250);
    await p.click('#to-setup');
    ok('시간대 목록이 채워짐', (await p.$$('#stz option')).length >= 10);
    ok('처음 오는 교회도 초대 코드가 미리 들어 있음', (await p.inputValue('#scode')) === 'BJ-V3DEXG');
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
    ok('고른 교회 주소로 등록', reg.body.slug === 'hanul' && (await db(p)).church_church.some(x => x.slug === 'hanul'));
    ok('새 교회는 다락방이 비어 있음', /아직 다락방이 없습니다/.test(await p.textContent('#week-list')));
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
    ok('순장에게 보낼 주소 = 다락방 앱 + 교회 코드', /\/darak\/\?c=bangjoo$/.test(await p.inputValue('#ch-link')));
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
    ok('처음엔 한국어 + English 단추', (await p.textContent('.hero h1')) === '다락방 나눔터' && (await p.textContent('#lang-bar')).includes('English'));
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
    }).then(r => (r === true || console.log(r), r === true)));
    await p.click('.top .lang-btn'); await p.waitForTimeout(600);
    ok('머리말 단추로 한국어로 돌아옴', (await p.textContent('.tabs')).includes('다락방·순장 관리'));
    ok('JS 오류 없음', p.errs.length === 0, p.errs.join('|'));
    await c.close(); }
  { const { c, p } = await ctx(b);
    await p.addInitScript(() => localStorage.setItem('darak-lang', 'en'));
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
    ok('목사: 숫자 칸', (await p.textContent('#pp-stat')).replace(/\s/g, '').startsWith('2순원2침례1생명의 삶 하는 중'.replace(/\s/g, '')), await p.textContent('#pp-stat'));
    ok('JS 오류 없음', p.errs.length === 0, p.errs.join('|'));
    await c.close(); }
  { const { c, p } = await ctx(b);
    await p.addInitScript(() => localStorage.setItem('darak-lang', 'en'));
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

  console.log('\n[스스로 가입] 목자(순장)가 가입 코드로 직접 계정·목장 만들기');
  { const { c, p } = await ctx(b);
    await login(p, 'pastor1');
    await p.click('.tabs button[data-pane="manage"]'); await p.waitForTimeout(300);
    ok('처음엔 가입 꺼짐', await p.isVisible('#join-make') && !(await p.isVisible('#join-code')));
    await p.click('#join-make'); await p.waitForTimeout(300);
    const code = (await p.textContent('#join-code')).trim(), link = await p.inputValue('#join-link');
    ok('가입 코드·주소 보임', /^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code) && link.endsWith('/darak/?c=bangjoo&join=' + code), code + ' ' + link);
    await p.evaluate(() => CHURCH.signOut());
    await p.goto(BASE + 'index.html?c=bangjoo&join=' + code); await p.waitForTimeout(400);
    ok('가입 주소로 오면 가입 화면이 바로 열림', await p.isVisible('#form-join') && (await p.inputValue('#jcode')) === code && !(await p.isVisible('#form-login')));
    ok('가입 화면에 아이디·비밀번호 칸 없음', !(await p.$('#jlid')) && !(await p.$('#jpw')));
    await p.fill('#jname', '새목자'); await p.click('#btn-join'); await p.waitForTimeout(500);
    const key1 = (await p.textContent('#key-box')).trim();
    ok('가입하면 열쇠 코드를 보여 줌', await p.isVisible('#got-key') && /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(key1), key1);
    await p.click('#key-done');
    await p.waitForURL(/mokjang\.html/); await p.waitForSelector('.top h1'); await p.waitForTimeout(400);
    const d = await db(p), mj = d.church_mokjang.find(m => m.mokja_name === '새목자');
    ok('가입하면 목자 계정 + 목장이 생김', mj && mj.church_id === 'cb' && mj.name === '새목자 다락방' && d.church_profile.some(x => x.id === mj.mokja_id && x.role === 'mokja' && /^k_/.test(x.login_id)), JSON.stringify(mj));
    ok('가입 후 바로 목자 화면', (await p.textContent('.top h1')).includes('새목자 다락방'));
    await p.click('.tabs button[data-pane="members"]'); await p.waitForTimeout(300);
    await p.fill('#new-name', '이순원'); await p.click('#form-add button[type=submit]'); await p.waitForTimeout(300);
    ok('가입한 목자가 목원을 넣음', (await db(p)).church_mokwon.some(w => w.name === '이순원' && w.mokjang_id === mj.id));
    await p.goto(BASE + 'index.html?c=bangjoo'); await p.waitForURL(/mokjang\.html/); await p.waitForTimeout(300);
    ok('다음에 주소를 열면 바로 내 화면 (비밀번호 없이)', /mokjang\.html/.test(p.url()));
    await p.click('.tabs button[data-pane="mine"]'); await p.waitForTimeout(300);
    ok('[내 계정]: 비밀번호 칸 대신 열쇠 코드', !(await p.isVisible('#pw-card')) && await p.isVisible('#key-card'));
    p.once('dialog', dl => dl.accept());
    await p.click('.top #btn-signout'); await p.waitForURL(/index\.html/); await p.waitForTimeout(400);
    await p.click('#to-key'); await p.fill('#kcode', 'WRON-GKEY-ZZZZ'); await p.click('#btn-key'); await p.waitForTimeout(300);
    ok('틀린 열쇠 코드는 막음', (await p.textContent('#msg-key')).includes('열쇠 코드가 맞지 않습니다'));
    await p.fill('#kcode', key1.toLowerCase()); await p.click('#btn-key');
    await p.waitForURL(/mokjang\.html/); await p.waitForSelector('.top h1'); await p.waitForTimeout(300);
    ok('열쇠 코드로 다시 들어감', (await p.textContent('.top h1')).includes('새목자 다락방'));
    await p.click('.tabs button[data-pane="mine"]'); await p.waitForTimeout(300);
    p.once('dialog', dl => dl.accept());
    await p.click('#btn-new-key'); await p.waitForTimeout(300);
    const key2 = (await p.textContent('#my-key')).trim();
    ok('새 열쇠 코드 받기', /^NEWK-/.test(key2) && key2 !== key1);
    await p.evaluate(() => CHURCH.sb.auth.signOut());
    await p.goto(BASE + 'index.html'); await p.waitForTimeout(300);
    await p.click('#to-key'); await p.fill('#kcode', key1); await p.click('#btn-key'); await p.waitForTimeout(300);
    ok('예전 열쇠 코드는 못 씀', (await p.textContent('#msg-key')).includes('열쇠 코드가 맞지 않습니다'));
    await login(p, 'pastor1');
    await p.click('.tabs button[data-pane="manage"]'); await p.waitForTimeout(300);
    const row = p.locator('#manage-list .list-item', { hasText: '새목자 다락방' });
    ok('목사 화면: 열쇠 코드 목자는 [열쇠 코드 새로]', (await row.textContent()).includes('열쇠 코드로 들어옴') && await row.locator('.act-key').count() === 1);
    p.once('dialog', dl => dl.accept());
    await row.locator('.act-key').click(); await p.waitForTimeout(300);
    ok('목사님이 새 열쇠 코드를 만들어 줌', /새목자 목자의 새 열쇠 코드는 NEWK-/.test((await p.textContent('#msg-manage')).replace('순장', '목자')), await p.textContent('#msg-manage'));
    ok('JS 오류 없음', p.errs.length === 0, p.errs.join('|'));
    await c.close(); }
  { const { c, p } = await ctx(b);
    await login(p, 'pastorla');
    await p.click('.tabs button[data-pane="manage"]'); await p.waitForTimeout(300);
    ok('다락방 교회: 순장 말로 나옴', (await p.textContent('#join-card h2')).includes('순장'));
    await p.click('#join-make'); await p.waitForTimeout(300);
    const code = (await p.textContent('#join-code')).trim();
    await p.evaluate(() => CHURCH.signOut());
    await p.goto(BASE + 'index.html?c=lach01'); await p.waitForTimeout(400);
    ok('로그인 화면에 순장 시작 링크', (await p.textContent('#to-join')).includes('순장으로 시작하기'), await p.textContent('#to-join'));
    await p.click('#to-join');
    await p.fill('#jcode', 'WRON-GCOD'); await p.fill('#jname', '최순장');
    await p.click('#btn-join'); await p.waitForTimeout(300);
    ok('틀린 코드는 막음', (await p.textContent('#msg-join')).includes('가입 코드가 맞지 않습니다'));
    await p.fill('#jcode', code.toLowerCase()); await p.click('#btn-join'); await p.waitForTimeout(400);
    await p.click('#key-done'); await p.waitForURL(/mokjang\.html/); await p.waitForTimeout(400);
    ok('다락방 이름 기본값', (await db(p)).church_mokjang.some(m => m.name === '최순장 다락방' && m.church_id === 'cl'));
    await p.evaluate(() => CHURCH.sb.auth.signOut());
    await login(p, 'pastorla');
    await p.click('.tabs button[data-pane="manage"]'); await p.waitForTimeout(300);
    ok('목사 목장 목록에 새 다락방', (await p.textContent('#pane-manage')).includes('최순장 다락방'));
    p.on('dialog', dlg => dlg.accept());
    await p.click('#join-stop'); await p.waitForTimeout(300);
    ok('가입 끄기', await p.isVisible('#join-make') && !(await p.isVisible('#join-code')));
    ok('JS 오류 없음', p.errs.length === 0, p.errs.join('|'));
    await c.close(); }

  console.log('\n[혼자 시작] 코드 없이 순장 혼자 → 나중에 교회 연결');
  { const { c, p } = await ctx(b);
    // 목사님이 먼저 가입 코드를 만들어 둔다 (나중에 연결할 때 씀)
    await login(p, 'pastor1');
    await p.click('.tabs button[data-pane="manage"]'); await p.waitForTimeout(300);
    await p.click('#join-make'); await p.waitForTimeout(300);
    const code = (await p.textContent('#join-code')).trim();
    await p.evaluate(() => CHURCH.signOut());
    await p.goto(BASE + 'index.html'); await p.waitForTimeout(400);
    await p.click('#to-join');
    await p.fill('#jname', '혼자순장');
    await p.click('#btn-join'); await p.waitForTimeout(500);
    ok('코드 없이 가입 → 열쇠 코드를 보여 줌', await p.isVisible('#got-key') && /^KEYS-/.test(await p.textContent('#key-box')));
    await p.click('#key-done'); await p.waitForURL(/mokjang\.html/); await p.waitForSelector('.top h1'); await p.waitForTimeout(400);
    let d = await db(p); const mj = d.church_mokjang.find(m => m.mokja_name === '혼자순장'), ch = d.church_church.find(x => x.id === mj.church_id);
    ok('나 혼자 쓰는 다락방이 생김', mj.name === '혼자순장 다락방' && ch.features.solo === true && !d.church_profile.some(x => x.church_id === ch.id && x.role === 'pastor'));
    ok('혼자 쓰면 제출 단추 없이 저장만', !(await p.isVisible('#btn-submit')) && (await p.textContent('#btn-save')).trim() === '저장');
    await p.fill('#body', '혼자 쓴 다락방 이야기'); await p.click('#btn-save'); await p.waitForTimeout(400);
    ok('저장하면 저장됨', (await p.textContent('#wk-state')).trim() === '저장됨');
    await p.click('.tabs button[data-pane="members"]'); await p.waitForTimeout(300);
    await p.fill('#new-name', '혼자순원'); await p.click('#form-add button[type=submit]'); await p.waitForTimeout(300);
    await p.click('.tabs button[data-pane="mine"]'); await p.waitForTimeout(300);
    ok('[내 계정]에 교회 연결 칸', await p.isVisible('#form-link'));
    ok('혼자 쓰면 말씀 알림 칸·안내 없음', !(await p.isVisible('#notify-card')) && !(await p.isVisible('#notify-ask')));
    await p.fill('#link-code', 'NOPE-NOPE'); await p.click('#btn-link'); await p.waitForTimeout(300);
    ok('틀린 코드로는 연결 안 됨', (await p.textContent('#msg-link')).includes('가입 코드가 맞지 않습니다'));
    await p.fill('#link-code', code); await p.click('#btn-link'); await p.waitForTimeout(300);
    ok('연결하면 교회 이름을 알려 줌', (await p.textContent('#msg-link')).includes('멜번방주교회'));
    await p.waitForTimeout(2200); await p.waitForSelector('.top h1'); await p.waitForTimeout(400);
    d = await db(p);
    const mj2 = d.church_mokjang.find(m => m.id === mj.id);
    ok('다락방·순원·일기가 그대로 교회로 옮겨짐', mj2.church_id === 'cb' && d.church_profile.find(x => x.id === mj.mokja_id).church_id === 'cb'
      && d.church_mokwon.some(w => w.mokjang_id === mj.id && w.name === '혼자순원') && d.church_journal.some(j => j.mokjang_id === mj.id && j.body === '혼자 쓴 다락방 이야기'));
    ok('혼자 쓰던 자리는 지워짐', !d.church_church.some(x => x.id === ch.id));
    ok('연결 뒤에는 목사님께 제출 단추', await p.isVisible('#btn-submit'));
    await p.click('.tabs button[data-pane="mine"]'); await p.waitForTimeout(300);
    ok('연결 뒤에는 연결 칸이 사라짐', !(await p.isVisible('#form-link')));
    ok('연결 뒤에는 말씀 알림 칸', await p.isVisible('#notify-card'));
    await p.evaluate(() => CHURCH.sb.auth.signOut());
    await login(p, 'pastor1');
    ok('목사님 화면에 옮겨 온 다락방이 보임', (await p.textContent('#week-list')).includes('혼자순장 다락방'));
    ok('JS 오류 없음', p.errs.length === 0, p.errs.join('|'));
    await c.close(); }
  { const { c, p } = await ctx(b);
    await p.goto(BASE + 'index.html'); await p.waitForTimeout(400);
    await p.click('#to-join');
    await p.fill('#jname', '떠날순장');
    await p.click('#btn-join'); await p.waitForTimeout(500);
    await p.click('#key-done'); await p.waitForURL(/mokjang\.html/); await p.waitForSelector('.top h1'); await p.waitForTimeout(400);
    const lp = (await db(p)).church_profile.find(x => x.name === '떠날순장'), cid = lp.church_id;
    await p.click('.tabs button[data-pane="mine"]'); await p.waitForTimeout(300);
    ok('혼자 쓰는 순장 탈퇴 안내', (await p.textContent('#leave-desc')).includes('모두 지워집니다'));
    ok('비밀번호 없이 쓰는 목자는 탈퇴할 때 비밀번호를 묻지 않음', !(await p.isVisible('#leave-pw')));
    p.once('dialog', dl => dl.accept());
    await p.click('#btn-leave'); await p.waitForURL(/left=1/); await p.waitForTimeout(400);
    const d = await db(p);
    ok('탈퇴하면 계정과 나만의 다락방이 함께 지워짐', !d.church_profile.some(x => x.id === lp.id) && !d.church_church.some(x => x.id === cid) && !d.church_mokjang.some(m => m.church_id === cid));
    ok('JS 오류 없음', p.errs.length === 0, p.errs.join('|'));
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

  console.log('\n[목사님 말씀] 순장에게 알림 · 말씀 앞에 목사님 사진');
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

  console.log('\n[출석 통계] 월별 출석률');
  { const { c, p } = await ctx(b);
    await login(p, 'pastor1');
    await p.evaluate(() => { const D = window.__DB();
      D.church_journal.push({ id: 'js1', mokjang_id: 'mj1', week_start: '2026-09-06', status: 'submitted', present_count: 3, created_at: '2026-09-07', updated_at: '2026-09-07' },
                            { id: 'js2', mokjang_id: 'mj1', week_start: '2026-09-13', status: 'draft', present_count: 1, created_at: '2026-09-14', updated_at: '2026-09-14' });
      D.church_prayer.push({ id: 'q1', journal_id: 'js1', name: 'a', attended: true, sort_order: 0 }, { id: 'q2', journal_id: 'js1', name: 'b', attended: true, sort_order: 1 },
                           { id: 'q3', journal_id: 'js1', name: 'c', attended: false, sort_order: 2 }, { id: 'q4', journal_id: 'js1', name: 'd', attended: true, sort_order: 3 },
                           { id: 'q5', journal_id: 'js2', name: 'a', attended: false, sort_order: 0 });
      sessionStorage.setItem('__mock_db', JSON.stringify(D)); });
    await p.reload(); await p.waitForSelector('.top h1');
    await p.click('.tabs button[data-pane="stats"]'); await p.waitForTimeout(700);
    ok('막대 6개(최근 6달)', (await p.$$('#st-bars .bar')).length === 6);
    await p.click('#st-bars .bar[data-k="2026-09"]'); await p.waitForTimeout(300);
    const t = (await p.textContent('#st-tiles')).replace(/\s/g, '');
    ok('9월: 제출한 일기만 — 출석률 75% (3/4), 모임 1번', t.startsWith('75%') && t.includes('3/4') && t.includes('1모임'), t);
    ok('9월 목장별 표', (await p.textContent('#st-table')).includes('김 목장') && (await p.textContent('#st-table')).includes('75%'));
    await p.hover('#st-bars .bar[data-k="2026-09"]'); await p.waitForTimeout(200);
    ok('막대에 올리면 숫자 안내', /출석률 75%/.test(await p.textContent('#st-tip')));
    ok('JS 오류 없음', p.errs.length === 0, p.errs.join('|'));
    await c.close(); }

  console.log('\n[알림] 제출 안 한 목장에 알림 · 마감 알림');
  { const { c, p } = await ctx(b);
    await login(p, 'pastor1');
    p.on('dialog', d => d.accept());
    ok('이번 주: 제출 안 한 목장 알림 단추 (1곳)', await p.isVisible('#btn-remind') && /\(1/.test(await p.textContent('#btn-remind')));
    await p.click('#btn-remind'); await p.waitForTimeout(400);
    const r = (await calls(p)).filter(x => x.fn === 'church-notify' && x.body.action === 'remind');
    ok('그 주로 알림 요청', r.length === 1 && /^\d{4}-\d{2}-\d{2}$/.test(r[0].body.week), JSON.stringify(r));
    ok('알림 안 켠 목자 이름 안내', /알림을 켜지 않은 (목자|순장): 김목자/.test(await p.textContent('#msg-remind')));
    await p.click('#wk-prev'); await p.waitForTimeout(500);
    ok('모두 제출한 주에는 단추 없음', !(await p.isVisible('#btn-remind')));
    await p.click('#wk-next'); await p.click('#wk-next'); await p.waitForTimeout(500);
    ok('다가올 주에는 단추 없음', !(await p.isVisible('#btn-remind')));
    await p.click('.tabs button[data-pane="manage"]'); await p.waitForTimeout(300);
    ok('마감 알림 기본: 토요일 오후 8시', (await p.inputValue('#dl-dow')) === '6' && (await p.inputValue('#dl-hour')) === '20');
    await p.selectOption('#dl-dow', '5'); await p.selectOption('#dl-hour', '21'); await p.click('#dl-save'); await p.waitForTimeout(300);
    ok('마감 알림 저장', /매주 금요일 오후 9시/.test(await p.textContent('#msg-deadline')) && (await db(p)).church_church.find(x => x.id === 'cb').features.deadline.dow === 5);
    await p.selectOption('#dl-dow', '-1'); await p.click('#dl-save'); await p.waitForTimeout(300);
    ok('마감 알림 끄기', (await db(p)).church_church.find(x => x.id === 'cb').features.deadline === false && await p.isDisabled('#dl-hour'));
    ok('JS 오류 없음', p.errs.length === 0, p.errs.join('|'));
    await c.close(); }

  console.log('\n[입장 링크] 목사님이 만든 링크로 목자가 비밀번호 없이 들어감');
  { const { c, p } = await ctx(b);
    await login(p, 'pastor1');
    p.on('dialog', d => d.accept());
    await p.click('.tabs button[data-pane="manage"]'); await p.waitForTimeout(300);
    await p.click('#entry-make'); await p.waitForTimeout(500);
    const items = await p.$$('#entry-list .list-item');
    ok('목자마다 입장 링크', items.length === 1 && (await p.textContent('#entry-list')).includes('김목자') && /#key=ENTR-/.test(await p.textContent('#entry-list')));
    ok('새 주소로 아직 안 들어온 목자 표시', (await p.textContent('#entry-list')).includes('아직 안 들어옴'));
    const link = (await p.textContent('#entry-list .list-item .s')).trim();
    await p.evaluate(() => CHURCH.sb.auth.signOut());
    await p.goto(link); await p.waitForURL(/mokjang\.html/, { timeout: 8000 }).catch(() => {}); await p.waitForTimeout(600);
    ok('링크를 누르면 비밀번호 없이 목자 화면', /mokjang\.html/.test(p.url()) && (await p.textContent('.top')).includes('김목자'), p.url());
    await p.evaluate(() => CHURCH.sb.auth.signOut());
    await p.goto(link.replace(/#key=.*/, '#key=ABCD-EFGH-JKMN')); await p.waitForTimeout(800);
    ok('틀린 링크는 안내', /(입장 링크|열쇠 코드)가 맞지 않습니다/.test(await p.textContent('#msg-login')));
    ok('JS 오류 없음', p.errs.length === 0, p.errs.join('|'));
    await c.close(); }

  console.log('\n[카톡 안 화면] 알림 대신 크롬·사파리로 열기 안내 · 머리말 내 사진');
  { const { c, p } = await ctx(b, { device: { userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-S918N; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/128.0 Mobile Safari/537.36 KAKAOTALK 10.8.0' } });
    await login(p, 'pastor1');
    ok('카톡 안: 위 안내 띠에 크롬·사파리로 열기', await p.isVisible('#notify-ask') && (await p.textContent('#notify-ask-on')).includes('크롬'));
    await p.click('.tabs button[data-pane="manage"]'); await p.waitForTimeout(300);
    ok('카톡 안: 상태와 열기 단추', (await p.textContent('#notify-state')).includes('카카오톡') && await p.isVisible('#notify-help .open-ext') && !(await p.isVisible('#notify-on')));
    await p.evaluate(() => { const D = window.__DB(); D.church_profile.find(x => x.id === 'p1').photo_path = 'cb/p_p1.jpg'; D.__photos = { 'cb/p_p1.jpg': { type: 'image/jpeg', size: 100 } }; sessionStorage.setItem('__mock_db', JSON.stringify(D)); });
    await p.reload(); await p.waitForSelector('.top h1'); await p.waitForTimeout(500);
    ok('머리말 이름 옆에 내 사진', (await p.$$('.top .who-avatar img')).length === 1);
    ok('JS 오류 없음', p.errs.length === 0, p.errs.join('|'));
    await c.close(); }

  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
