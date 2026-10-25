/* 목사 화면 — 모든 목장을 본다 */
(function () {
  var C = window.CHURCH, sb = C.sb, $ = C.$, $$ = C.$$, esc = C.esc, T = C.t;
  var me = null, week = C.mondayOf(), mokjangs = [];

  (async function start() {
    me = await C.guard('pastor');
    if (!me) return;
    week = C.mondayOf();                 // 교회 시간대가 정해진 뒤 다시 센다
    C.header(me, T('목장 나눔터'));
    if (C.has('member_dates')) $('.tabs button[data-pane="people"]').hidden = false;   // 성도 날짜는 켠 교회만
    bindTabs(); bindWeek(); bindManage(); bindNotify(); bindChurch(); bindPeople(); bindStats(); bindRemind(); bindEntry();
    await loadMokjangs();
    await openFromLink() || await loadWeek();
    // 앱을 켜 둔 채 주일이 지나면, 다시 볼 때 새 주로 넘어간다
    var startWeek = week;
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState !== 'visible') return;
      var now = C.mondayOf();
      if (now !== startWeek) { if (week === startWeek) { week = now; loadWeek(); } startWeek = now; }
    });
    // 화면이 열려 있는 채로 알림을 누르면 주소 끝(#j=…)만 바뀐다 — 그때도 그 일기로 간다
    window.addEventListener('hashchange', function () { openFromLink(); });
  })();

  /* 알림을 눌러 들어오면(moksa.html#j=일기) 그 주로 가서 그 목장을 펼친다 */
  async function openFromLink() {
    if (/^#gather\b/.test(location.hash)) {   // 토요일 밤 '기도제목이 모였습니다' 알림 → 기도제목 모아보기
      history.replaceState(null, '', location.pathname);
      var gb = $('.tabs button[data-pane="gather"]'); if (gb) setTimeout(function () { gb.click(); }, 0);
      return false;
    }
    var m = /[#&]j=([0-9a-f-]{36})/.exec(location.hash);
    if (!m) return false;
    var r = await sb.from('church_journal').select('id, mokjang_id, week_start').eq('id', m[1]).maybeSingle();
    if (!r.data) return false;
    week = C.mondayOf(r.data.week_start);   // 예전(월요일 시작) 일기도 그 주일로
    // 다른 탭을 보고 있었으면 주간 현황으로 (알림을 눌렀는데 안 보이는 일이 없게)
    var tb = $('.tabs button[data-pane="week"]');
    if (tb && !tb.classList.contains('on')) tb.click();
    await loadWeek();
    var d = $('#week-list .mj[data-mj="' + r.data.mokjang_id + '"]');
    if (d) { d.open = true; d.scrollIntoView({ block: 'start' }); }
    history.replaceState(null, '', location.pathname);
    return true;
  }

  /* ── 휴대전화 알림 ─────────────────────────────── */
  var ASK_LATER = 'darak-notify-later';
  async function bindNotify() {
    $('#notify-on').addEventListener('click', function () { turnOn($('#msg-notify')); });
    $('#notify-ask-on').addEventListener('click', function () { if (C.inApp()) return C.openExternal(); turnOn($('#msg-notify-ask')); });
    document.addEventListener('click', function (e) { if (e.target.closest('.open-ext')) C.openExternal(); });
    $('#notify-ask-later').addEventListener('click', function () {
      try { localStorage.setItem(ASK_LATER, String(Date.now())); } catch (e) {}
      $('#notify-ask').hidden = true;
    });
    $('#notify-off').addEventListener('click', async function () {
      try { await C.pushDisable(); C.say($('#msg-notify'), T('이 기기 알림을 껐습니다.'), 'ok'); }
      catch (e) { C.say($('#msg-notify'), e.message, 'err'); }
      showNotify();
    });
    $('#notify-test').addEventListener('click', async function () {
      var b = $('#notify-test'); b.disabled = true;
      try {
        var r = await C.pushTest();
        C.say($('#msg-notify'), r.sent
          ? T('시험 알림 두 개를 보냈습니다. ① 이 휴대폰 알림, ② 서버 알림이 몇 초 안에 와야 합니다. 둘 다 안 보이면 휴대폰 설정 → 애플리케이션 → Chrome → 알림을 켜 주세요. ①만 오고 ②가 안 오면 운영자에게 알려 주세요.')
          : r.devices ? T('서버 알림이 이 휴대폰으로 가지 못했습니다 (코드 {0}). [이 기기 알림 끄기]를 누른 뒤 다시 켜 주세요.', r.code)
          : T('이 휴대폰이 알림 받기에 등록되어 있지 않습니다. [이 기기 알림 끄기]를 누른 뒤 다시 켜 주세요.'), r.sent ? 'ok' : 'err', true);
      } catch (e) { C.say($('#msg-notify'), e.message, 'err'); }
      b.disabled = false;
    });
    showNotify();
  }

  async function turnOn(msgEl) {
    try {
      await C.pushEnable();
      C.say(msgEl, T('알림을 켰습니다. 목자가 일기를 제출하면 이 기기로 알려 드립니다.'), 'ok', true);
    } catch (e) { C.say(msgEl, e.message, 'err'); }
    showNotify();
  }

  async function showNotify() {
    var st = 'unsupported';
    try { st = await C.pushState(); } catch (e) {}
    var label = { on: T('이 기기에서 받는 중'), off: T('꺼져 있음'), denied: T('브라우저에서 막혀 있음'),
                  'ios-home': T('홈 화면에 추가해야 함'), unsupported: T('이 브라우저는 알림을 못 받음'),
                  inapp: T('카카오톡 안에서는 알림을 못 받음') }[st];
    var help = {
      on: T('다른 휴대전화나 컴퓨터에서도 받으시려면 그 기기에서 한 번 더 켜 주세요.'),
      off: '',
      denied: T('주소창 왼쪽 자물쇠(또는 설정 → 사이트 설정 → 알림)에서 이 사이트 알림을 허용으로 바꿔 주세요.'),
      'ios-home': T('아이폰은 사파리 아래쪽 공유 단추 → [홈 화면에 추가]를 하신 뒤, 홈 화면의 아이콘으로 열어서 켜 주세요.'),
      unsupported: T('안드로이드는 크롬, 아이폰은 사파리(홈 화면에 추가)에서 받을 수 있습니다.'),
      inapp: T('카카오톡·네이버 앱 안에서 연 화면은 알림을 받을 수 없습니다. 크롬(아이폰은 사파리)으로 열어서 켜 주세요.')
    }[st];
    $('#notify-state').textContent = label;
    $('#notify-state').className = 'badge ' + (st === 'on' ? 'done' : 'todo');
    $('#notify-help').textContent = help;
    if (st === 'inapp') $('#notify-help').insertAdjacentHTML('beforeend', ' <button type="button" class="small primary open-ext">' + esc(T('크롬·사파리로 열기')) + '</button>');
    $('#notify-on').hidden = st === 'on' || st === 'unsupported' || st === 'ios-home' || st === 'inapp';
    $('#notify-off').hidden = st !== 'on';
    $('#notify-test').hidden = st !== 'on';

    // 주간 현황 맨 위 안내: 아직 안 켰고, '나중에'를 누른 지 7일이 지났을 때만
    var later = 0; try { later = +localStorage.getItem(ASK_LATER) || 0; } catch (e) {}
    var ask = (st === 'off' || st === 'ios-home' || st === 'inapp') && Date.now() - later > 7 * 864e5;
    $('#notify-ask').hidden = !ask;
    if (st === 'inapp') { $('#notify-ask-desc').textContent = help; $('#notify-ask-on').textContent = T('크롬·사파리로 열기'); }
    if (st === 'ios-home') {
      $('#notify-ask-desc').textContent = help;
      $('#notify-ask-on').hidden = true;
    }
  }

  /* ── 교회 정보 ─────────────────────────────────── */
  function bindChurch() {
    var c = C.getChurch() || {};
    var saved = { theme: c.theme || 'note', terms: c.terms || {} };
    $('#ch-name').value = c.name || '';
    C.fillTimezones($('#ch-tz'), c.timezone);
    $('#ch-link').value = c.slug ? C.churchLink(c) : '';
    bindLogo();

    // 부르는 말: 자주 쓰는 묶음 + 직접 쓰기
    var P = C.TERM_PRESETS, cur = C.cleanTerms(c.terms);
    var idx = P.findIndex(function (x) { return x.unit === cur.unit && x.leader === cur.leader && x.member === cur.member; });
    $('#ch-terms').innerHTML = P.map(function (x, i) {
      return '<option value="' + i + '">' + esc(x.unit + ' · ' + x.leader + ' · ' + x.member) + '</option>';
    }).join('') + T('<option value="own">직접 쓰기</option>');
    $('#ch-terms').value = idx >= 0 ? String(idx) : 'own';
    $('#ch-t-unit').value = cur.unit; $('#ch-t-leader').value = cur.leader; $('#ch-t-member').value = cur.member;
    function pickedTerms() {
      var v = $('#ch-terms').value;
      if (v !== 'own') return P[+v];
      return C.cleanTerms({ unit: $('#ch-t-unit').value, leader: $('#ch-t-leader').value, member: $('#ch-t-member').value });
    }
    function showOwn() { $('#ch-terms-own').hidden = $('#ch-terms').value !== 'own'; }
    showOwn();
    $('#ch-terms').addEventListener('change', showOwn);

    // 디자인: 누르면 바로 미리 보기
    var theme = saved.theme;
    $('#ch-theme').innerHTML = C.THEMES.map(function (x) {
      return '<button type="button" class="theme-pick" data-theme-id="' + x.id + '">' +
        '<span class="sw" style="background:' + x.colors[0] + '"><i style="background:' + x.colors[1] + '"></i>' +
        '<b style="background:' + x.colors[1] + '"></b><u style="background:' + x.colors[2] + '"></u></span>' +
        '<span><span class="nm">' + esc(T(x.name)) + '</span><br><span class="ds">' + esc(T(x.desc)) + '</span></span></button>';
    }).join('');
    function markTheme() { $$('#ch-theme .theme-pick').forEach(function (b) { b.classList.toggle('on', b.dataset.themeId === theme); }); }
    markTheme();
    $$('#ch-theme .theme-pick').forEach(function (b) {
      b.addEventListener('click', function () { theme = b.dataset.themeId; C.setTheme(theme); markTheme(); });
    });

    // 계절 꾸미기: 누르면 바로 미리 보기
    var SEASON_OPTS = [['auto', '자동', 'linear-gradient(90deg,#a3242b 50%,#132b52 50%)'], ['xmas', '성탄', 'linear-gradient(135deg,#a3242b,#6e1218)'],
      ['snowman', '눈사람', 'linear-gradient(160deg,#cfe6f7,#eef6fc)'], ['aurora', '오로라', 'linear-gradient(120deg,#0c1a3a,#2fbf8f 60%,#6e6cff)'], ['off', '끄기', 'var(--paper-2)']];
    var seasonPick = (c.features || {}).season === false ? 'off' : ((c.features || {}).season || 'auto');
    $('#ch-season').innerHTML = SEASON_OPTS.map(function (o) {
      return '<button type="button" data-season-id="' + o[0] + '"><span class="sw" style="background:' + o[2] + '"></span>' + esc(T(o[1])) + '</button>';
    }).join('');
    function markSeason() { $$('#ch-season button').forEach(function (b) { b.classList.toggle('on', b.dataset.seasonId === seasonPick); }); }
    markSeason();
    $$('#ch-season button').forEach(function (b) {
      b.addEventListener('click', function () {
        seasonPick = b.dataset.seasonId; markSeason();
        var keep = (c.features || {}).season; c.features = Object.assign({}, c.features, { season: seasonPick });
        C.setSeason(C.season()); c.features.season = keep;
      });
    });

    $('#ch-copy').addEventListener('click', async function () {
      var v = $('#ch-link').value;
      try { await navigator.clipboard.writeText(v); C.say($('#msg-church'), T('주소를 복사했습니다.'), 'ok'); }
      catch (e) { $('#ch-link').select(); C.say($('#msg-church'), T('주소를 길게 눌러 복사해 주세요.'), 'ok'); }
    });
    $('#form-church').addEventListener('submit', async function (e) {
      e.preventDefault();
      var r = await sb.from('church_church')
        .update({ name: $('#ch-name').value.trim(), timezone: $('#ch-tz').value, theme: theme, terms: pickedTerms(),
                  features: Object.assign({}, c.features, { season: seasonPick }) })
        .eq('id', c.id).select().single();
      if (r.error) return C.say($('#msg-church'), r.error.message, 'err');
      var keepId = c.id; Object.assign(c, r.data); c.id = keepId;
      saved = { theme: c.theme, terms: c.terms };
      C.setTimezone(c.timezone); C.rememberChurch(c); C.applyLook(c);
      $('.top .church').textContent = c.name;
      $('.top h1').textContent = C.t('목장 나눔터');
      C.say($('#msg-church'), T('저장했습니다. 다른 화면은 새로 열 때 바뀝니다.'), 'ok');
    });
  }

  /* ── 교회 로고: 화면에서 512px 이하 PNG로 줄여 서버 함수로 보낸다 ── */
  function shrinkToPng(file, max) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        var cv = document.createElement('canvas');
        cv.width = Math.max(1, Math.round(img.naturalWidth * k)); cv.height = Math.max(1, Math.round(img.naturalHeight * k));
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        URL.revokeObjectURL(url); resolve(cv.toDataURL('image/png'));
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error(T('이 그림은 열 수 없습니다. PNG나 JPG로 골라 주세요.'))); };
      img.src = url;
    });
  }
  function bindLogo() {
    var c = C.getChurch() || {};
    function show(u) {
      $('#ch-logo').src = u || C.logoOf({});
      $('#ch-logo-del').hidden = !u;
      $('.top img.mark').src = u || C.logoOf({});
    }
    show(c.logo_url);
    $('#ch-logo-pick').addEventListener('click', function () { $('#ch-logo-file').click(); });
    $('#ch-logo-file').addEventListener('change', async function () {
      var f = this.files && this.files[0]; this.value = '';
      if (!f) return;
      C.say($('#msg-logo'), T('올리는 중…'), 'ok');
      try {
        var data = await shrinkToPng(f, 512);
        var r = await C.callAdmin({ action: 'set_logo', data: data });
        c.logo_url = r.logo_url; C.rememberChurch(c); show(c.logo_url);
        C.say($('#msg-logo'), T('로고를 바꿨습니다.'), 'ok');
      } catch (e) { C.say($('#msg-logo'), e.message, 'err'); }
    });
    $('#ch-logo-del').addEventListener('click', async function () {
      if (!confirm(T('교회 로고를 지울까요?'))) return;
      try {
        await C.callAdmin({ action: 'remove_logo' });
        c.logo_url = ''; C.rememberChurch(c); show('');
        C.say($('#msg-logo'), T('로고를 지웠습니다.'), 'ok');
      } catch (e) { C.say($('#msg-logo'), e.message, 'err'); }
    });
  }

  /* ── 성도 명단: 교회 등록·생명의 삶·침례 날짜 ───────── */
  var people = [];
  var PEOPLE_FILTER = {
    nobap: function (m) { return !m.baptized_on; },
    nolife: function (m) { return !m.life_start && !m.life_end; },
    life: function (m) { return m.life_start && !m.life_end; },
    nodate: function (m) { return !C.DATE_FIELDS.some(function (f) { return m[f.key]; }); }
  };
  async function loadPeople() {
    var r = await sb.from('church_mokwon').select('*').order('sort_order').order('created_at');
    if (r.error) return C.say($('#msg-people'), r.error.message, 'err');
    people = r.data || [];
    if (C.has('member_photos')) peoplePhoto = await C.photoUrls(people);   // 성도 사진을 켠 교회만
    renderPeople();
  }
  var peoplePhoto = {};
  function renderPeople() {
    var f = PEOPLE_FILTER[$('#pp-filter').value], all = people.filter(function (m) { return m.active; });
    $('#pp-stat').innerHTML =
      '<div><b>' + all.length + T('</b><span>목원</span></div>') +
      '<div><b>' + all.filter(function (m) { return m.baptized_on; }).length + T('</b><span>침례</span></div>') +
      '<div><b>' + all.filter(PEOPLE_FILTER.life).length + T('</b><span>생명의 삶 하는 중</span></div>') +
      '<div><b>' + all.filter(function (m) { return m.life_end; }).length + T('</b><span>생명의 삶 마침</span></div>');
    var html = mokjangs.map(function (mj) {
      var list = people.filter(function (m) { return m.mokjang_id === mj.id && (!f || f(m)); });
      if (!list.length) return '';
      return '<div class="people-mj"><h3>' + esc(mj.name) + '</h3>' + list.map(function (m) {
        return '<div class="list-item" data-id="' + esc(m.id) + '">' + (C.has('member_photos') ? C.avatar(m, peoplePhoto[m.id]) : '') +
          '<div class="grow"><div class="t">' + esc(m.name) +
          (m.tag ? ' <span class="badge gold">' + esc(m.tag) + '</span>' : '') +
          (m.active ? '' : T(' <span class="badge">쉼</span>')) + '</div>' +
          '<div class="s">' + (esc(C.memberDatesLine(m)) || T('등록 정보 없음')) + '</div></div>' +
          T('<button class="small act-dates">등록 정보</button>') + '</div>';
      }).join('') + '</div>';
    }).join('');
    $('#people-list').innerHTML = html || T('<p class="empty">해당하는 분이 없습니다.</p>');
  }
  function bindPeople() {
    $('#pp-filter').addEventListener('change', renderPeople);
    $('#people-list').addEventListener('click', function (e) {
      var btn = e.target.closest('button'); if (!btn || btn.getAttribute('type') === 'submit') return;
      var item = e.target.closest('.list-item'), m = people.find(function (x) { return x.id === item.dataset.id; });
      if (!m) return;
      var open = item.querySelector('.dates-form');
      if (open) open.remove(); else item.insertAdjacentHTML('beforeend', C.memberDatesForm(m));
    });
    $('#people-list').addEventListener('submit', async function (e) {
      e.preventDefault();
      var form = e.target, got = C.readDatesForm(form);
      if (got.error) return C.say($('#msg-people'), got.error, 'err');
      var r = await sb.from('church_mokwon').update(got.values).eq('id', form.dataset.id);
      if (r.error) return C.say($('#msg-people'), r.error.message, 'err');
      var m = people.find(function (x) { return x.id === form.dataset.id; });
      if (m) Object.assign(m, got.values);
      renderPeople();
      C.say($('#msg-people'), T('{0} 님 날짜를 저장했습니다.', m ? m.name : ''), 'ok');
    });
  }

  function bindTabs() {
    $$('.tabs button').forEach(function (b) {
      b.addEventListener('click', function () {
        $$('.tabs button').forEach(function (x) { x.classList.remove('on'); });
        $$('.pane').forEach(function (x) { x.classList.remove('on'); });
        b.classList.add('on');
        $('#pane-' + b.dataset.pane).classList.add('on');
        if (b.dataset.pane === 'gather') loadGather();
        if (b.dataset.pane === 'manage') renderManage();
        if (b.dataset.pane === 'people') loadPeople();
        if (b.dataset.pane === 'stats') loadStats();
        window.scrollTo(0, 0);
      });
    });
  }

  /* ── 월별 출석 ───────────────────────────────────
     제출한 일기로 센다. 한 주는 주일부터라 그 주일이 속한 달로 묶는다.
     · 모임한 목장 = 그달에 일기를 한 번이라도 제출한 목장 / 지금 활동 중인 목장
     · 목원 참석   = 주마다 참석 체크된 목원 수의 평균 / 지금 목원 수
     달은 우리 교회 첫 일기가 있는 달부터 보여 준다 (그 전 달은 의미가 없어서) */
  var stats = null, statMonth = null;
  var MAX_MONTHS = 12;
  function monthKey(ymd) { return ymd.slice(0, 7); }
  function monthLabel(k, short) {
    var y = +k.slice(0, 4), m = +k.slice(5, 7);
    if (C.lang() === 'en') return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m - 1] + (short ? '' : ' ' + y);
    return short ? m + '월' : y + '년 ' + m + '월';
  }
  function pct(a, b) { return b ? Math.min(100, Math.round(a * 100 / b)) : null; }
  function round1(x) { return Math.round(x * 10) / 10; }

  async function loadStats() {
    $('#st-table').innerHTML = T('<p class="empty">불러오는 중…</p>');
    var nowWeek = C.mondayOf(), nowKey = monthKey(nowWeek);
    var first = (await sb.from('church_journal').select('week_start').eq('status', 'submitted').order('week_start').limit(1)).data || [];
    var startKey = first.length ? monthKey(C.mondayOf(first[0].week_start)) : nowKey;
    var keys = [], d = new Date(nowKey + '-01T00:00:00Z');
    for (var i = 0; i < MAX_MONTHS; i++) {
      var k = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - i, 1)).toISOString().slice(0, 7);
      if (k < startKey) break;
      keys.unshift(k);
    }
    var from = C.addWeeks(keys[0] + '-01', -1);   // 그달 첫 주일이 1일 앞일 수 있어 한 주 앞부터
    var js = (await sb.from('church_journal').select('id, mokjang_id, week_start, status, present_count')
      .gte('week_start', from).eq('status', 'submitted').limit(5000)).data || [];
    var ps = [];
    for (var j0 = 0; j0 < js.length; j0 += 150) {
      var ids = js.slice(j0, j0 + 150).map(function (j) { return j.id; });
      ps = ps.concat((await sb.from('church_prayer').select('journal_id, mokwon_id, attended').in('journal_id', ids)).data || []);
    }
    var att = {};
    ps.forEach(function (p) { if (p.attended) att[p.journal_id] = (att[p.journal_id] || 0) + 1; });
    var live = mokjangs.filter(function (x) { return x.active; }), liveIds = {};
    live.forEach(function (x) { liveIds[x.id] = 1; });
    var mw = (await sb.from('church_mokwon').select('*')).data || [];
    var members = {}, memberTotal = 0;
    mw.forEach(function (w) { if (w.active !== false && liveIds[w.mokjang_id]) { members[w.mokjang_id] = (members[w.mokjang_id] || 0) + 1; memberTotal++; } });
    var m = {};
    keys.forEach(function (k) { m[k] = { weeks: {}, groups: {}, meets: 0 }; });
    js.forEach(function (j) {
      var wk = C.mondayOf(j.week_start), k = monthKey(wk); if (!m[k]) return;
      var o = m[k], a = att[j.id] || 0, g = o.groups[j.mokjang_id] || (o.groups[j.mokjang_id] = { meets: 0, a: 0, pc: 0, pcn: 0 });
      o.meets++; g.meets++; g.a += a;
      if (j.present_count != null) { g.pc += j.present_count; g.pcn++; }   // 목원 명단이 없는 목장은 '모인 사람 수'로 보여 준다
      o.weeks[wk] = (o.weeks[wk] || 0) + a;
    });
    keys.forEach(function (k) {
      var o = m[k], ws = Object.keys(o.weeks);
      o.met = Object.keys(o.groups).filter(function (id) { return liveIds[id]; }).length;
      o.avg = ws.length ? round1(ws.reduce(function (t, w) { return t + o.weeks[w]; }, 0) / ws.length) : null;
      o.rate = o.avg == null ? null : pct(o.avg, memberTotal);
    });
    var ans = (await sb.from('church_prayer').select('id, journal_id, name, content, answer_note').eq('answered', true).limit(5000)).data || [];
    stats = { keys: keys, m: m, live: live, members: members, memberTotal: memberTotal, startKey: startKey, answered: ans };
    stats.care = careData(live, js, ps, att, mw);
    renderCareOverview();
    if (!statMonth || !m[statMonth]) statMonth = keys[keys.length - 1];
    renderStats();
  }

  /* ── 목양 한눈에: 돌보면 좋을 분 · 생일·기념일 · 영혼 구원 · 분가 · 삶공부 ── */
  var SPLIT_AT = 12;   // 최근 8주 평균 이만큼 모이면 분가를 준비할 때
  function careData(live, js, ps, att, mw) {
    var liveIds = {}; live.forEach(function (x) { liveIds[x.id] = x; });
    var members = mw.filter(function (w) { return w.active !== false && liveIds[w.mokjang_id]; });
    var byMj = {};
    js.forEach(function (j) { (byMj[j.mokjang_id] = byMj[j.mokjang_id] || []).push(j); });
    var away = [], split = [];
    live.forEach(function (x) {
      var list = (byMj[x.id] || []).slice().sort(function (a, b) { return a.week_start < b.week_start ? 1 : -1; });
      var st = C.absentStreaks(list.slice(0, 6), ps);
      members.forEach(function (w) { if (w.mokjang_id === x.id && st[w.id] >= C.ABSENT_WEEKS) away.push({ m: w, mj: x, n: st[w.id] }); });
      var last = list.slice(0, 8), sum = 0, cnt = 0;
      last.forEach(function (j) { var v = j.present_count != null ? j.present_count : att[j.id]; if (v != null) { sum += v; cnt++; } });
      if (cnt >= 4 && sum / cnt >= SPLIT_AT) split.push({ mj: x, avg: round1(sum / cnt) });
    });
    var dates = C.has('member_dates'), y = C.today().slice(0, 4);
    return {
      away: away.sort(function (a, b) { return b.n - a.n; }), split: split,
      ev: dates ? C.careThisWeek(members, C.mondayOf()) : [],
      vip: members.filter(function (w) { return /vip/i.test(w.tag || ''); }),
      reg: dates ? members.filter(function (w) { return (w.registered_on || '').slice(0, 4) === y; }) : [],
      bap: dates ? members.filter(function (w) { return (w.baptized_on || '').slice(0, 4) === y; }) : [],
      members: members, dates: dates, year: y
    };
  }
  function mjName(w) { var x = mokjangs.filter(function (m) { return m.id === w.mokjang_id; })[0]; return x ? x.name : ''; }
  function renderCareOverview() {
    var c = stats.care, box = $('#care-rows'); if (!box || !c) return;
    var row = function (id, label, value, sub) {
      return '<button type="button" class="care-row" data-care="' + id + '"><span class="care-l">' + esc(label) + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</span><b>' + esc(value) + '</b><i>›</i></button>';
    };
    var lifeDone = c.members.filter(function (w) { return w.life_end; }).length;
    box.innerHTML =
      row('away', T('돌보면 좋을 분'), T('{0}명', c.away.length), T('{0}주 이상 연달아 못 오신 목원', C.ABSENT_WEEKS)) +
      (c.dates ? row('ev', T('이번 주 생일·기념일'), T('{0}명', c.ev.length), T('생일·결혼기념일·침례·등록 기념일')) : '') +
      row('soul', T('영혼 구원'), c.dates ? T('VIP {0} · 등록 {1} · 침례 {2}', c.vip.length, c.reg.length, c.bap.length) : T('VIP {0}명', c.vip.length), c.dates ? T('{0}년 교회 등록·침례', c.year) : T('VIP 표시를 한 목원')) +
      row('split', T('분가를 준비할 목장'), T('{0}곳', c.split.length), T('최근 8주 평균 {0}명 이상 모이는 목장', SPLIT_AT)) +
      (c.dates ? row('course', T('삶공부'), T('생명의 삶 {0}명', lifeDone), T('누가 어떤 삶공부를 마쳤는지')) : '');
  }
  function careSheet(kind) {
    var c = stats.care; if (!c) return;
    var li = function (name, rest) { return '<li><b>' + esc(name) + '</b> <span class="quiet">' + esc(rest) + '</span></li>'; };
    var ul = function (items, empty) { return items.length ? '<ul class="care-list">' + items.join('') + '</ul>' : '<p class="desc">' + esc(empty) + '</p>'; };
    var title = '', html = '';
    if (kind === 'away') {
      title = T('돌보면 좋을 분');
      html = '<p class="desc">' + esc(T('제출된 일기에서 {0}주 이상 연달아 [참석]이 빠진 목원입니다. 목자님께 안부를 여쭤 보시거나 심방을 권해 주세요.', C.ABSENT_WEEKS)) + '</p>' +
        ul(c.away.map(function (x) { return li(x.m.name, x.mj.name + ' · ' + T('{0}주째', x.n)); }), T('지금은 없습니다. 감사합니다!'));
    } else if (kind === 'ev') {
      title = T('이번 주 생일·기념일');
      html = ul(c.ev.map(function (x) { return li(x.m.name, mjName(x.m) + ' · ' + x.label + ' ' + C.mdText(x.md)); }), T('이번 주에는 없습니다. [성도 명단]의 [등록 정보]에서 생일·결혼기념일을 넣을 수 있습니다.'));
    } else if (kind === 'soul') {
      title = T('영혼 구원');
      html = '<div class="section-title">' + esc(T('지금 VIP {0}명', c.vip.length)) + '</div>' + ul(c.vip.map(function (w) { return li(w.name, mjName(w)); }), T('VIP로 표시된 목원이 없습니다.')) +
        (c.dates ? '<div class="section-title">' + esc(T('{0}년 교회 등록 {1}명', c.year, c.reg.length)) + '</div>' + ul(c.reg.map(function (w) { return li(w.name, mjName(w) + ' · ' + C.dayText(w.registered_on)); }), T('없습니다.')) +
          '<div class="section-title">' + esc(T('{0}년 침례 {1}명', c.year, c.bap.length)) + '</div>' + ul(c.bap.map(function (w) { return li(w.name, mjName(w) + ' · ' + C.dayText(w.baptized_on)); }), T('없습니다.')) : '');
    } else if (kind === 'split') {
      title = T('분가를 준비할 목장');
      html = '<p class="desc">' + esc(T('최근 제출된 일기 8주(4주 이상 있을 때) 평균 {0}명 이상 모이는 목장입니다.', SPLIT_AT)) + '</p>' +
        ul(c.split.map(function (x) { return li(x.mj.name, (x.mj.mokja_name ? x.mj.mokja_name + ' · ' : '') + T('평균 {0}명', x.avg)); }), T('지금은 없습니다.'));
    } else if (kind === 'course') {
      title = T('삶공부');
      var lifeDone = c.members.filter(function (w) { return w.life_end; }), lifeNow = c.members.filter(function (w) { return w.life_start && !w.life_end; });
      var notYet = c.members.filter(function (w) { return !w.life_start && !w.life_end && !/vip/i.test(w.tag || ''); });
      html = '<div class="section-title">' + esc(T('생명의 삶 마침 {0}명', lifeDone.length)) + '</div>' + ul(lifeDone.map(function (w) { return li(w.name, mjName(w)); }), T('없습니다.')) +
        (lifeNow.length ? '<div class="section-title">' + esc(T('생명의 삶 하는 중 {0}명', lifeNow.length)) + '</div>' + ul(lifeNow.map(function (w) { return li(w.name, mjName(w)); }), '') : '') +
        C.COURSES.map(function (k) {
          var who = c.members.filter(function (w) { return (w.courses || {})[k]; });
          return who.length ? '<div class="section-title">' + esc(T('{0} 마침 {1}명', T(k), who.length)) + '</div>' + ul(who.map(function (w) { return li(w.name, mjName(w)); }), '') : '';
        }).join('') +
        '<div class="section-title">' + esc(T('생명의 삶을 권해 드릴 분 {0}명', notYet.length)) + '</div>' + ul(notYet.map(function (w) { return li(w.name, mjName(w)); }), T('없습니다.'));
    }
    C.sheet({ kicker: T('목양 한눈에'), title: title, cls: 'care-sheet', html: html });
  }

  function renderStats() {
    var keys = stats.keys, m = stats.m, cur = m[statMonth], live = stats.live, total = stats.memberTotal;
    var unmet = live.filter(function (x) { return !cur.groups[x.id]; });
    stats.unmet = unmet;
    // 첫 칸: 이 달 한 번도 안 모인 목장 (누르면 목록 + 격려 보내기) · 셋째 칸: 처음부터 쌓인 기도 응답 (누르면 목록)
    $('#st-tiles').innerHTML =
      '<button type="button" class="st-tap' + (unmet.length ? ' warn' : '') + '" id="st-unmet"><b>' + T('{0}곳', unmet.length) + '</b><span>' + esc(T('{0} 한 번도 안 모인 목장', monthLabel(statMonth, true))) + '</span><i>' + esc(T('누르면 목록 ›')) + '</i></button>' +
      '<div><b>' + (cur.avg == null ? '–' : cur.avg) + '/' + total + '</b><span>' + esc(T('목원 참석 (한 주 평균)')) + (cur.rate == null ? '' : ' ' + cur.rate + '%') + '</span></div>' +
      '<button type="button" class="st-tap" id="st-answered"><b>' + T('{0}건', stats.answered.length) + '</b><span>' + esc(T('누적 기도 응답')) + '</span><i>' + esc(T('누르면 목록 ›')) + '</i></button>';
    $('#st-line').textContent = cur.meets
      ? T('{0}: 목장 {1}곳 중 {2}곳이 한 번 이상 모였고({3}곳은 아직 한 번도 안 모임), 목원 {4}명 중 한 주 평균 {5}명({6}%)이 참석했습니다. 모임은 모두 {7}번 제출되었습니다.', monthLabel(statMonth), live.length, cur.met, unmet.length, total, cur.avg, cur.rate, cur.meets)
      : T('{0}: 아직 제출된 일기가 없습니다.', monthLabel(statMonth));
    $('#st-since').textContent = T('{0}부터 (우리 교회 첫 일기)', monthLabel(stats.startKey));
    $('#st-bars').innerHTML = keys.map(function (k) {
      var o = m[k], v = o.rate, on = k === statMonth;
      return '<button type="button" role="listitem" class="bar' + (on ? ' on' : '') + '" data-k="' + k + '" aria-label="' +
        esc(monthLabel(k) + ' ' + (v == null ? T('기록 없음') : v + '%')) + '">' +
        '<span class="bar-val">' + (on && v != null ? v + '%' : '') + '</span>' +
        '<span class="bar-col"><span class="bar-fill" style="height:' + (v || 0) + '%"></span></span>' +
        '<span class="bar-x">' + esc(monthLabel(k, true)) + '</span></button>';
    }).join('');
    $('#st-bars').insertAdjacentHTML('afterbegin', '<span class="tick" style="top:14px">100%</span><span class="tick" style="top:99px">50%</span><span class="tick" style="bottom:-6px">0</span>');
    $('#st-month-title').textContent = T('{0} 목장별 출석', monthLabel(statMonth));
    var noList = 0;
    $('#st-table').innerHTML = '<table class="st-table"><thead><tr>' + T('<th>목장</th><th>모임</th><th>참석 (평균)</th><th>참석률</th>') + '</tr></thead><tbody>' +
      live.map(function (x) {
        var g = cur.groups[x.id], n = stats.members[x.id] || 0, avg = g && g.meets ? round1(g.a / g.meets) : null;
        var cell = avg == null ? '–' : avg + '/' + n;
        if (avg != null && !n) { noList++; cell = (g.pcn ? T('{0}명', round1(g.pc / g.pcn)) : '–') + '<span class="st-note">' + esc(T('목원 명단 없음')) + '</span>'; }
        return '<tr><td>' + esc(x.name) + (x.mokja_name ? '<span class="st-who">' + esc(x.mokja_name) + '</span>' : '') + '</td>' +
          '<td>' + (g ? g.meets : 0) + '</td><td>' + cell + '</td>' +
          '<td>' + (avg == null || !n ? '–' : pct(avg, n) + '%') + '</td></tr>';
      }).join('') + '</tbody></table>' +
      (noList ? '<p class="hint">' + esc(T('목원 명단이 없는 목장은 일기에 적은 \'모인 사람 수\'를 보여 드리고, 참석률 계산에서는 뺍니다. 그 목자님께 [목원 명단]에 이름을 넣어 달라고 해 주세요.')) + '</p>' : '');
  }

  // 이 달 한 번도 안 모인 목장 → 목록 + 목사님 격려 (앱 알림 · 카톡)
  function openUnmet() {
    var list = stats.unmet || [], c = C.getChurch() || {};
    var def = T('목자님, 요즘 모임 준비하시느라 애쓰시지요. 늘 기도로 함께합니다. 이번 주에는 한 번 모여 서로의 이야기와 기도제목을 나눠 보면 좋겠습니다. 힘내세요!');
    var html = list.length
      ? '<ul class="unmet-list">' + list.map(function (x) {
          return '<li><label class="check"><input type="checkbox" class="um-pick" value="' + esc(x.id) + '" checked' + (x.mokja_id ? '' : ' disabled') + '> <b>' + esc(x.name) + '</b>' +
            (x.mokja_name ? ' <span class="quiet">' + esc(T('{0} 목자님', x.mokja_name)) + '</span>' : '') + (x.mokja_id ? '' : ' <span class="quiet">' + esc(T('(목자 없음)')) + '</span>') + '</label></li>';
        }).join('') + '</ul>' +
        '<label>' + esc(T('격려 메시지')) + '<textarea id="um-body" maxlength="500">' + esc(def) + '</textarea></label>' +
        '<p class="sheet-meta">' + esc(T('고른 목자에게 앱 알림으로 보내거나, 카카오톡으로 따로 보낼 수 있습니다.')) + '</p><div class="msg" id="msg-um"></div>'
      : '<p class="desc">' + esc(T('이 달에는 모든 목장이 한 번 이상 모였습니다. 감사합니다!')) + '</p>';
    var picked = function () { return Array.prototype.map.call(document.querySelectorAll('.um-pick:checked'), function (i) { return i.value; }); };
    var foot = [{ label: T('닫기') }];
    if (list.length) foot = [{ label: T('닫기') },
      { label: T('카톡으로 보내기'), fn: async function () {
        var ids = picked(), body = $('#um-body').value.trim(); if (!body) { C.say($('#msg-um'), T('보낼 글을 적어 주세요.'), 'err'); return true; }
        var names = list.filter(function (x) { return ids.indexOf(x.id) >= 0; }).map(function (x) { return x.mokja_name || x.name; });
        var text = (names.length ? names.map(function (n) { return T('{0} 목자님', n); }).join(', ') + '\n\n' : '') + body + '\n\n' + C.churchLink(c);
        if (navigator.share && !C.inApp()) { try { await navigator.share({ text: text }); return true; } catch (e) { if (e && e.name === 'AbortError') return true; } }
        var copied = false; try { await navigator.clipboard.writeText(text); copied = true; } catch (e) {}
        C.say($('#msg-um'), copied ? T('글을 복사했습니다. 카카오톡에 붙여 넣어 보내 주세요.') : T('아래 글을 길게 눌러 복사해서 카카오톡으로 보내 주세요.') + '\n\n' + text, 'ok', true);
        return true;
      } },
      { label: T('앱 알림으로 보내기'), fn: async function () {
        var ids = picked(), body = $('#um-body').value.trim();
        if (!ids.length) { C.say($('#msg-um'), T('보낼 목장을 골라 주세요.'), 'err'); return true; }
        if (!body) { C.say($('#msg-um'), T('보낼 글을 적어 주세요.'), 'err'); return true; }
        try {
          var r = await C.notify({ action: 'encourage', mokjang_ids: ids, body: body });
          var msg = T('목자 {0}명에게 격려 알림을 보냈습니다.', r.reached || 0);
          if (r.noDevice && r.noDevice.length) msg += ' ' + T('알림을 켜지 않은 목자: {0} — [카톡으로 보내기]로 따로 보내 주세요.', r.noDevice.join(', '));
          C.say($('#msg-um'), msg, r.reached ? 'ok' : 'err', true);
        } catch (e) { C.say($('#msg-um'), e.message, 'err'); }
        return true;
      } }];
    C.sheet({ kicker: monthLabel(statMonth), title: T('한 번도 안 모인 목장 {0}곳', list.length), cls: 'unmet-sheet', html: html, foot: foot });
  }
  // 처음부터 쌓인 기도 응답 목록 (새것부터)
  async function openAnswered() {
    var ans = stats.answered || [];
    var close = C.sheet({ kicker: T('누적 기도 응답'), title: T('기도 응답 {0}건', ans.length), cls: 'answered-sheet',
      html: '<div id="ans-list"><p class="empty">' + esc(T('불러오는 중…')) + '</p></div>' });
    if (!ans.length) { $('#ans-list').innerHTML = '<p class="desc">' + esc(T('아직 응답됨으로 표시된 기도제목이 없습니다. 목자가 일기에서 [응답됨]에 체크하면 여기에 쌓입니다.')) + '</p>'; return; }
    var jids = [], seen = {}; ans.forEach(function (a) { if (!seen[a.journal_id]) { seen[a.journal_id] = 1; jids.push(a.journal_id); } });
    var js = [];
    for (var i = 0; i < jids.length; i += 100) js = js.concat((await sb.from('church_journal').select('id, mokjang_id, week_start').in('id', jids.slice(i, i + 100))).data || []);
    var jb = {}; js.forEach(function (j) { jb[j.id] = j; });
    var mb = {}; mokjangs.forEach(function (x) { mb[x.id] = x; });
    var rows = ans.map(function (a) { var j = jb[a.journal_id] || {}; return { a: a, wk: j.week_start ? C.mondayOf(j.week_start) : '', mj: mb[j.mokjang_id] }; })
      .sort(function (x, y) { return x.wk < y.wk ? 1 : x.wk > y.wk ? -1 : 0; });
    var box = $('#ans-list'); if (!box) return;
    box.innerHTML = '<ul class="pr-list ans-list">' + rows.map(function (r) {
      return '<li><span class="pr-name">' + esc(r.a.name || '') + '</span><span class="pr-text">' + esc(r.a.content || '') + '</span>' +
        (r.a.answer_note ? '<p class="ans-note">' + esc(T('응답')) + ' · ' + esc(r.a.answer_note) + '</p>' : '') +
        '<span class="sheet-meta">' + esc([r.mj && r.mj.name, r.wk && C.weekShort(r.wk)].filter(Boolean).join(' · ')) + '</span></li>';
    }).join('') + '</ul>';
  }

  function bindStats() {
    $('#care-rows').addEventListener('click', function (e) { var b = e.target.closest('.care-row'); if (b) careSheet(b.dataset.care); });
    var tip = $('#st-tip');
    $('#st-tiles').addEventListener('click', function (e) {
      if (e.target.closest('#st-unmet')) openUnmet();
      if (e.target.closest('#st-answered')) openAnswered();
    });
    $('#st-bars').addEventListener('click', function (e) {
      var b = e.target.closest('.bar'); if (!b) return;
      statMonth = b.dataset.k; renderStats();
    });
    // 막대 위에 올리면(휴대폰은 누르고 있으면) 그 달 숫자를 보여 준다
    $('#st-bars').addEventListener('pointerover', function (e) {
      var b = e.target.closest('.bar'); if (!b || !stats) return;
      var o = stats.m[b.dataset.k];
      tip.textContent = monthLabel(b.dataset.k) + ' · ' + (o.rate == null ? T('기록 없음')
        : T('모인 목장 {0}/{1} · 목원 한 주 평균 {2}/{3}명 ({4}%)', o.met, stats.live.length, o.avg, stats.memberTotal, o.rate));
      tip.hidden = false;
      var box = $('#st-bars').getBoundingClientRect(), bb = b.getBoundingClientRect();
      tip.style.left = Math.max(0, Math.min(box.width - tip.offsetWidth, bb.left - box.left + bb.width / 2 - tip.offsetWidth / 2)) + 'px';
    });
    $('#st-bars').addEventListener('pointerleave', function () { tip.hidden = true; });
  }

  /* ── 첫 화면 알약 단추 · 목자에게 공지 ─────────────── */
  function pastorChips(total, done) {
    var n = ((C.getChurch() || {}).features || {}).notice; if (!C.noticeLive(n)) n = null;
    C.heroChips([   // 공지 쓰기를 맨 앞에 (찾기 쉽게)
      { label: n ? T('공지 바꾸기') : T('공지 보내기'), fn: openNotice, dot: !!n, cls: 'primary' },
    ].concat(n ? [{ label: T('지금 공지 보기'), fn: function () { C.showNotice(n, true); } }] : []).concat([
      { label: week === C.mondayOf() ? T('이번 주 제출') : T('이 주 제출'), value: done + '/' + total, go: 'week' },
      { label: T('기도제목 모아보기'), go: 'gather' },
      { label: T('출석 통계'), go: 'stats' }
    ]));
    // 목사님도 들어오실 때마다 지금 걸린 공지를 한 번 보여 드린다 ([오늘 하루 보지 않기]를 누르셨으면 그날은 안 뜬다)
    if (!pastorChips.shown) { pastorChips.shown = true; if (n) C.showNotice(n); }
  }
  function openNotice() {
    var c = C.getChurch() || {}, n = (c.features || {}).notice; if (!C.noticeLive(n)) n = null;
    var done = function (r, text) { c.features = Object.assign({}, c.features, { notice: r.notice || null }); loadWeek(); C.say($('#msg-remind'), text, 'ok', true); };
    var foot = [{ label: T('취소') }];
    if (n) foot.unshift({ label: T('공지 내리기'), fn: async function () {
      if (!confirm(T('지금 공지를 내릴까요?'))) return true;
      try { done(await C.notify({ action: 'notice', clear: true }), T('공지를 내렸습니다.')); } catch (e) { C.say($('#msg-nt'), e.message, 'err'); return true; }
    } });
    foot.push({ label: T('공지 올리기'), fn: async function () {
      var title = $('#nt-title').value.trim(), body = $('#nt-body').value.trim();
      if (!title || !body) { C.say($('#msg-nt'), T('제목과 내용을 적어 주세요.'), 'err'); return true; }
      try {
        var d = $('#nt-days').value, until = d === 'date' ? $('#nt-until').value : C.addDays(C.today(), +d - 1);
        if (!until || until < C.today()) { C.say($('#msg-nt'), T('오늘이나 그 뒤 날짜를 골라 주세요.'), 'err'); return true; }
        var r = await C.notify({ action: 'notice', title: title, body: body, until: until });
        done(r, T('공지를 올렸습니다. 목자가 앱을 열면 아래에서 올라옵니다. (알림 받은 목자 {0}명)', r.reached || 0));
      } catch (e) { C.say($('#msg-nt'), e.message, 'err'); return true; }
    } });
    if (n) foot[foot.length - 1].label = T('고쳐서 올리기');
    setTimeout(function () {
      var sel = $('#nt-days'); if (!sel) return;
      sel.addEventListener('change', function () { $('#nt-until-row').hidden = sel.value !== 'date'; });
      // 지금 걸린 공지를 그대로 불러와 고칠 수 있게 (기간도 그대로)
      if (n) { $('#nt-title').value = n.title || ''; $('#nt-body').value = n.body || ''; if (n.until && n.until >= C.today()) { sel.value = 'date'; $('#nt-until').value = n.until; $('#nt-until-row').hidden = false; } }
      var fresh = $('#nt-fresh'); if (fresh) fresh.addEventListener('click', function () {   // [새로 작성하기] → 빈칸에서 새 공지
        $('#nt-title').value = ''; $('#nt-body').value = ''; sel.value = '7'; $('#nt-until-row').hidden = true;
        var st = fresh.closest('.sheet').querySelector('.sheet-title'); if (st) st.textContent = T('목자들에게 공지 보내기');
        var ok = Array.prototype.slice.call(fresh.closest('.sheet').querySelectorAll('.sheet-foot button')).pop(); if (ok) ok.textContent = T('공지 올리기');
        fresh.hidden = true; $('#nt-title').focus();
      });
    }, 0);
    C.sheet({ kicker: T('공지'), title: n ? T('공지 바꾸기') : T('목자들에게 공지 보내기'), cls: 'notice-edit', foot: foot,
      html: (n ? '<p class="sheet-meta" style="margin:0 0 14px">' + esc(T('지금 걸린 공지입니다. 고쳐서 다시 올리거나, 아래 [새로 작성하기]로 새 공지를 쓰세요.') + (n.until ? ' (' + C.untilText(n) + ')' : '')) + '</p>' : '') +
        '<label>' + esc(T('제목')) + '<input type="text" id="nt-title" maxlength="60" placeholder="' + esc(T('예: 다음 주는 연합 목장 모임입니다')) + '"></label>' +
        '<label>' + esc(T('내용')) + '<textarea id="nt-body" maxlength="1000"></textarea></label>' +
        '<label>' + esc(T('띄우는 기간')) + '<select id="nt-days">' + [[1, '오늘 하루'], [3, '3일'], [7, '1주일'], [14, '2주일'], [30, '한 달']].map(function (o) {
          return '<option value="' + o[0] + '"' + (o[0] === 7 ? ' selected' : '') + '>' + esc(T(o[1])) + '</option>'; }).join('') +
          '<option value="date">' + esc(T('날짜 고르기')) + '</option></select></label>' +
        '<label id="nt-until-row" hidden>' + esc(T('이날까지 띄우기')) + '<input type="date" id="nt-until" min="' + C.today() + '" max="' + C.addDays(C.today(), 90) + '" value="' + C.addDays(C.today(), 6) + '"></label>' +
        '<p class="sheet-meta" style="margin-top:6px">' + esc(T('기간 동안 목자가 앱을 열면 아래에서 올라오고, 알림도 함께 갑니다. 기간이 지나면 저절로 내려갑니다.')) + '</p><div class="msg" id="msg-nt"></div>' +
        (n ? '<button type="button" class="nt-fresh" id="nt-fresh">' + esc(T('＋ 새로 작성하기')) + '</button>' : '') });
  }

  /* ── 제출 안 한 목장에 알림 · 마감 알림 ───────────── */
  function showRemind(live, data) {
    var left = live.filter(function (m) { return m.mokja_id && !(data[m.id] && data[m.id].j.status === 'submitted'); });
    var can = left.length && week <= C.mondayOf();   // 다가올 주에는 보내지 않는다
    $('#remind-row').hidden = !can;
    if (can) $('#btn-remind').textContent = T('안 낸 목장에 앱 알림 ({0}곳)', left.length);
    $('#btn-remind').dataset.n = left.length;
    remindLeft = left;
  }
  var remindLeft = [];
  function bindRemind() {
    $('#btn-remind').addEventListener('click', async function () {
      var b = this;
      if (!confirm(T('{0} 일기를 제출하지 않은 목장 {1}곳의 목자에게 알림을 보낼까요?', C.weekLabel(week), b.dataset.n))) return;
      b.disabled = true;
      try {
        var r = await C.notify({ action: 'remind', week: week });
        var msg = T('목자 {0}명에게 알림을 보냈습니다.', r.reached);
        if (r.noDevice && r.noDevice.length) msg += ' ' + T('알림을 켜지 않은 목자: {0} — 카카오톡으로 따로 알려 주세요.', r.noDevice.join(', '));
        C.say($('#msg-remind'), msg, r.reached ? 'ok' : 'err', true);
      } catch (e) { C.say($('#msg-remind'), e.message, 'err'); }
      b.disabled = false;
    });

    // 카카오톡: 안 낸 목장 목록 + 바로 쓰는 주소를 글로 만들어 목자 단톡방에 보낸다 (휴대폰 '공유' → 카카오톡)
    $('#btn-remind-kakao').addEventListener('click', async function () {
      var c = C.getChurch() || {};
      var text = T('[{0}] {1} 목장 일기를 아직 제출하지 않은 목장입니다.', c.name || '', C.weekLabel(week)) + '\n' +
        remindLeft.map(function (m) { return '· ' + m.name + (m.mokja_name ? ' (' + T('{0} 목자님', m.mokja_name) + ')' : ''); }).join('\n') + '\n\n' +
        T('모임 이야기와 기도제목을 올려 주세요. 여기서 바로 쓰실 수 있습니다:') + '\n' + C.churchLink(c);
      if (navigator.share && !C.inApp()) {
        try { await navigator.share({ text: text }); C.say($('#msg-remind'), T('공유 창에서 카카오톡 → 목자 단톡방을 고르시면 됩니다.'), 'ok'); return; }
        catch (e) { if (e && e.name === 'AbortError') return; }
      }
      var copied = false; try { await navigator.clipboard.writeText(text); copied = true; } catch (e) {}
      C.say($('#msg-remind'), (copied ? T('알림 글을 복사했습니다. 카카오톡 목자 단톡방에 붙여 넣어 보내 주세요.')
        : T('아래 글을 길게 눌러 복사해서 카카오톡 목자 단톡방에 보내 주세요.')) + '\n\n' + text, 'ok', true);
    });

    var DOWS = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
    var c = C.getChurch() || {}, f = c.features || {};
    var dl = f.deadline === false ? null : (f.deadline || { dow: 6, hour: 20 });
    $('#dl-dow').innerHTML = '<option value="-1">' + esc(T('끄기')) + '</option>' +
      DOWS.map(function (d, i) { return '<option value="' + i + '">' + esc(T(d)) + '</option>'; }).join('');
    $('#dl-hour').innerHTML = Array.apply(null, Array(24)).map(function (_, h) {
      var label = C.lang() === 'en' ? ((h % 12) || 12) + (h < 12 ? ' AM' : ' PM') : (h < 12 ? '오전 ' : '오후 ') + ((h % 12) || 12) + '시';
      return '<option value="' + h + '">' + label + '</option>';
    }).join('');
    $('#dl-dow').value = dl ? dl.dow : -1; $('#dl-hour').value = dl ? dl.hour : 20;
    $('#dl-hour').disabled = !dl;
    $('#dl-dow').addEventListener('change', function () { $('#dl-hour').disabled = this.value === '-1'; });
    $('#dg-on').checked = f.digest !== false;
    $('#dg-on').addEventListener('change', async function () {
      var on = this.checked;
      try {
        var cur = (await sb.from('church_church').select('features').eq('id', c.id).maybeSingle()).data;
        var nf = Object.assign({}, (cur && cur.features) || f, { digest: on });
        var r = await sb.from('church_church').update({ features: nf }).eq('id', c.id);
        if (r.error) throw new Error(r.error.message);
        f = nf; c.features = nf;
        C.say($('#msg-deadline'), on ? T('매주 토요일 밤 9시에 이번 주 기도제목이 모였다고 알려 드립니다.') : T('토요일 밤 기도제목 알림을 껐습니다.'), 'ok');
      } catch (e) { this.checked = !on; C.say($('#msg-deadline'), e.message, 'err'); }
    });
    $('#dl-save').addEventListener('click', async function () {
      try {
        var r = await C.notify({ action: 'set_deadline', dow: +$('#dl-dow').value, hour: +$('#dl-hour').value });
        f.deadline = r.deadline; c.features = f;
        C.say($('#msg-deadline'), r.deadline ? T('저장했습니다. 매주 {0} {1}에 제출 안 한 목자에게 알림이 갑니다.', T(DOWS[r.deadline.dow]), $('#dl-hour').selectedOptions[0].textContent)
          : T('마감 알림을 껐습니다.'), 'ok');
      } catch (e) { C.say($('#msg-deadline'), e.message, 'err'); }
    });
  }

  /* ── 목자 입장 링크 (누르면 비밀번호 없이 바로 들어감) ── */
  function bindEntry() {
    var links = [];
    function linkOf(x) { return C.churchLink(C.getChurch() || {}) + '#key=' + x.key; }
    async function copy(text, okMsg) {
      try { await navigator.clipboard.writeText(text); C.say($('#msg-entry'), okMsg, 'ok'); }
      catch (e) { C.say($('#msg-entry'), T('복사하지 못했습니다. 링크를 길게 눌러 복사해 주세요.'), 'err'); }
    }
    $('#entry-make').addEventListener('click', async function () {
      if (!confirm(T('목자들의 입장 링크를 새로 만들까요? 전에 만든 링크는 쓸 수 없게 됩니다.'))) return;
      var b = this; b.disabled = true;
      try {
        links = (await C.callAdmin({ action: 'entry_links' })).links || [];
        links.sort(function (a, b2) { return (a.since_move ? 1 : 0) - (b2.since_move ? 1 : 0) || a.name.localeCompare(b2.name); });
        $('#entry-list').innerHTML = links.map(function (x, i) {
          return '<div class="list-item" data-i="' + i + '"><div class="grow"><div class="t">' + esc(x.name) +
            (x.since_move ? '' : ' <span class="badge todo">' + esc(T('새 주소로 아직 안 들어옴')) + '</span>') + '</div>' +
            '<div class="s" style="word-break:break-all">' + esc(linkOf(x)) + '</div></div>' +
            '<button type="button" class="small entry-copy">' + esc(T('복사')) + '</button></div>';
        }).join('') || T('<p class="empty">아직 목자가 없습니다.</p>');
        $('#entry-copy-all').hidden = !links.length;
        C.say($('#msg-entry'), T('입장 링크 {0}개를 만들었습니다. 목자마다 [복사]해서 카카오톡으로 보내 주세요.', links.length), 'ok');
      } catch (e) { C.say($('#msg-entry'), e.message, 'err'); }
      b.disabled = false;
    });
    $('#entry-list').addEventListener('click', function (e) {
      var b = e.target.closest('.entry-copy'); if (!b) return;
      var x = links[+b.closest('.list-item').dataset.i];
      copy(T('{0}님, 목장 나눔터 입장 링크입니다. 누르시면 바로 들어가집니다.', x.name) + '\n' + linkOf(x), T('{0}님 링크를 복사했습니다.', x.name));
    });
    $('#entry-copy-all').addEventListener('click', function () {
      copy(links.map(function (x) { return x.name + '\n' + linkOf(x); }).join('\n\n'), T('모든 링크를 복사했습니다.'));
    });
  }

  function bindWeek() {
    $('#wk-prev').addEventListener('click', function () { week = C.addWeeks(week, -1); loadWeek(); });
    $('#wk-next').addEventListener('click', function () { week = C.addWeeks(week, 1); loadWeek(); });
    $('#wk-this').addEventListener('click', function () { week = C.mondayOf(); loadWeek(); });
    $('#g-prev').addEventListener('click', function () { week = C.addWeeks(week, -1); loadGather(); });
    $('#g-next').addEventListener('click', function () { week = C.addWeeks(week, 1); loadGather(); });
    $('#g-story').addEventListener('change', loadGather);
    $('#g-range').addEventListener('change', function () {
      var custom = this.value === 'custom';
      $('#g-custom').hidden = !custom;
      if (custom && !$('#g-from').value) { $('#g-from').value = C.addWeeks(week, -3); $('#g-to').value = C.addDays(week, 6); }
      loadGather();
    });
    ['#g-from', '#g-to'].forEach(function (s) { $(s).addEventListener('change', loadGather); });
    $('#g-print').addEventListener('click', function () {
      // 카카오톡 같은 앱 안 화면은 인쇄 창이 열리지 않는다 → 크롬·사파리로 옮겨서
      if (C.inApp()) { if (confirm(T('카카오톡 안에서는 인쇄·PDF 저장이 되지 않습니다. 크롬(아이폰은 사파리)으로 열까요?'))) C.openExternal(); return; }
      window.print();
    });
  }

  async function loadMokjangs() {
    var r = await sb.from('church_mokjang').select('*').order('sort_order').order('created_at');
    if (r.error) { alert(T('불러오지 못했습니다: ') + r.error.message); return; }
    mokjangs = r.data || [];
  }

  /* 한 주 자료를 통째로 가져온다 */
  async function fetchWeek() {
    // 예전(월요일 시작)에 저장된 일기도 함께 — 목장마다 하나만 (주일 기준 것을 먼저)
    var all = (await sb.from('church_journal').select('*').in('week_start', C.weekKeys(week))).data || [];
    var seen = {}, js = [];
    all.sort(function (a, b) { return a.week_start === week ? -1 : b.week_start === week ? 1 : 0; })
      .forEach(function (j) { if (!seen[j.mokjang_id]) { seen[j.mokjang_id] = 1; js.push(j); } });
    var ids = js.map(function (j) { return j.id; });
    var ps = [], cs = [];
    if (ids.length) {
      ps = (await sb.from('church_prayer').select('*').in('journal_id', ids).order('sort_order')).data || [];
      cs = (await sb.from('church_comment').select('*').in('journal_id', ids).order('created_at')).data || [];
    }
    cmtPhoto = await C.authorPhotos(cs);
    var byMj = {};
    js.forEach(function (j) {
      byMj[j.mokjang_id] = { j: j, ps: ps.filter(function (p) { return p.journal_id === j.id; }),
                             cs: cs.filter(function (c) { return c.journal_id === j.id; }) };
    });
    return byMj;
  }

  var cmtPhoto = null;   // 말씀 남긴 분 사진 (성도 사진을 켠 교회만)

  /* ── 주간 현황 ─────────────────────────────────── */
  async function loadWeek() {
    $('#wk-label').textContent = C.weekLabel(week);
    $('#week-list').innerHTML = T('<p class="empty">불러오는 중…</p>');
    var data = await fetchWeek();
    var live = mokjangs.filter(function (m) { return m.active; });
    var done = live.filter(function (m) { return data[m.id] && data[m.id].j.status === 'submitted'; }).length;
    var wrote = live.filter(function (m) { return data[m.id]; }).length;

    // 네 칸의 합이 맞게: 전체 목장 = 제출함 + 쓰는 중 + 아직 안 씀 (예전엔 '아직'에 쓰는 중이 겹쳐 셌다)
    $('#stat').innerHTML =
      '<div><b>' + live.length + T('</b><span>전체 목장</span></div>') +
      '<div><b>' + done + T('</b><span>제출함</span></div>') +
      '<div><b>' + (wrote - done) + T('</b><span>쓰는 중</span></div>') +
      '<div><b>' + (live.length - wrote) + T('</b><span>아직 안 씀</span></div>');
    $('#stat-line').textContent = T('이 주 일기: 목장 {0}곳 중 {1}곳이 썼고, 그중 {2}곳이 제출했습니다.', live.length, wrote, done);
    showRemind(live, data);
    pastorChips(live.length, done);

    if (!live.length) {
      $('#week-list').innerHTML = T('<div class="card"><p class="empty">아직 목장이 없습니다. <b>목장·목자 관리</b>에서 목자 계정을 만들어 주세요.</p></div>');
      return;
    }

    if (C.has('member_photos') && !leaderPhoto) {   // 목자 사진 (한 번만 불러 둔다)
      var lp = (await sb.from('church_profile').select('id, name, photo_path').eq('role', 'mokja')).data || [];
      var lu = await C.photoUrls(lp); leaderPhoto = {}; lp.forEach(function (p) { leaderPhoto[p.id] = lu[p.id]; });
    }
    $('#week-list').innerHTML = live.map(function (m) {
      var d = data[m.id];
      var state = !d ? T('<span class="badge todo">아직 안 씀</span>')
        : d.j.status === 'submitted' ? T('<span class="badge done">제출함</span>')
        : T('<span class="badge">쓰는 중</span>');
      var reply = d && d.cs.length ? '<span class="badge gold">' + T('답글 {0}', d.cs.length) + '</span>' : '';
      return '<details class="mj" data-mj="' + m.id + '"' + (d ? '' : ' data-empty="1"') + '>' +
        '<summary>' + (leaderPhoto ? C.avatar({ name: m.mokja_name || m.name, kind: 'leader' }, leaderPhoto[m.mokja_id]) : '') +
        '<span class="mj-main"><span class="mj-name">' + esc(m.name) + '</span>' +
        '<span class="mj-sub">' + (m.mokja_name ? '<span class="quiet">' + esc(m.mokja_name) + '</span>' : '') + state + ' ' + reply + '</span></span>' +
        '</summary>' +
        '<div>' + (d ? detailHtml(m, d) : T('<p class="quiet">이번 주 일기가 아직 없습니다.</p>')) + '</div>' +
        '</details>';
    }).join('');

    $$('#week-list .mj').forEach(function (d) {
      var form = $('.cmt', d);
      if (form) form.addEventListener('submit', onComment);
    });
  }

  function detailHtml(m, d) {
    var j = d.j;
    var h = '';
    h += '<p class="quiet" style="margin:0 0 10px">' +
      (j.met_on ? T('모인 날 ') + esc(j.met_on) : T('모인 날 미기재')) +
      (j.present_count != null ? ' · ' + T('{0}명 참석', j.present_count) : '') +
      (j.submitted_at ? T(' · 제출 ') + C.whenText(j.submitted_at) : '') + '</p>';

    if (d.ps.length) {
      h += T('<div class="section-title">목원별 기도제목</div>');
      h += C.prayerList(d.ps);
    }
    if (j.body) h += T('<div class="section-title">목장 이야기</div><div class="prose">') + C.proseHtml(j.body) + '</div>';
    if (j.mokjang_prayer) h += T('<div class="section-title">목장 전체 기도제목</div><div class="prose">') + C.proseHtml(j.mokjang_prayer) + '</div>';

    h += T('<div class="section-title">목사님 말씀</div>');
    h += d.cs.map(function (c) {
      return '<div class="member" style="background:var(--brand-soft); border-color:#cfe0d5">' +
        C.commentHead(c, cmtPhoto) +
        (c.author_id === me.id ? '<span class="spacer"></span><button class="small danger del-cmt" data-id="' + c.id + T('">지우기</button>') : '') +
        '</div><div class="prose">' + C.proseHtml(c.body) + '</div></div>';
    }).join('');

    h += '<form class="cmt noprint" data-j="' + j.id + '" style="margin-top:10px">' +
      T('<textarea name="b" placeholder="목자에게 남길 말씀을 적어 주세요" required></textarea>') +
      T('<div class="row end" style="margin-top:8px"><button class="primary small" type="submit">남기기</button></div></form>');
    return h;
  }

  async function onComment(e) {
    e.preventDefault();
    var form = e.currentTarget, jid = form.dataset.j, body = form.b.value.trim();
    if (!body) return;
    form.querySelector('button').disabled = true;
    var r = await sb.from('church_comment').insert({
      journal_id: jid, author_id: me.id, author_name: me.name, body: body
    }).select('id').single();
    form.querySelector('button').disabled = false;
    if (r.error) return alert(T('남기지 못했습니다: ') + r.error.message);
    C.notify({ action: 'commented', comment_id: r.data.id }).catch(function () {});   // 순장 휴대전화로 알림
    form.b.value = '';
    var open = $$('#week-list .mj').filter(function (d) { return d.open; }).map(function (d) { return d.dataset.mj; });
    await loadWeek();
    open.forEach(function (id) { var d = $('#week-list .mj[data-mj="' + id + '"]'); if (d) d.open = true; });
  }

  document.addEventListener('click', async function (e) {
    var b = e.target.closest('.del-cmt'); if (!b) return;
    if (!confirm(T('이 말씀을 지울까요?'))) return;
    await sb.from('church_comment').delete().eq('id', b.dataset.id);
    loadWeek();
  });

  /* ── 기도제목 모아보기 ─────────────────────────── */
  // 한 목장 일기 카드 (기도제목 모아보기)
  function gatherCard(m, d, story) {
    var j = d.j, h = '';
    h += '<div class="card"><h2>' + esc(m.name) +
      (j.status === 'submitted' ? '' : T(' <span class="badge todo">임시</span>')) + '</h2>' +
      '<p class="desc">' + esc(m.mokja_name || '') +
      (j.present_count != null ? ' · ' + T('{0}명 참석', j.present_count) : '') + '</p>';
    if (story && j.body) {
      h += T('<div class="section-title">목장 이야기</div><div class="prose">') + C.proseHtml(j.body) + '</div>' +
        T('<div class="section-title">기도제목</div>');
    }
    var withText = d.ps.filter(function (p) { return p.content; });
    if (withText.length) {
      h += C.prayerList(withText, { noAbsent: true });
    } else {
      h += T('<p class="quiet">적힌 목원 기도제목이 없습니다.</p>');
    }
    if (j.mokjang_prayer) {
      h += T('<div class="section-title" style="margin-top:8px">목장 전체</div>') +
        '<div class="prose">' + C.proseHtml(j.mokjang_prayer) + '</div>';
    }
    return h + '</div>';
  }
  // 여러 주를 한 번에: { 주일 키: { 목장 id: { j, ps } } } — 예전(월요일 시작) 일기도 그 주로 묶는다
  async function fetchRange(from, to) {
    var q = sb.from('church_journal').select('*').gte('week_start', from).order('week_start');
    if (to) q = q.lte('week_start', C.addDays(to, 1));
    var all = (await q).data || [];
    var out = {}, js = [];
    all.forEach(function (j) {
      var wk = C.mondayOf(j.week_start), w = out[wk] || (out[wk] = {});
      if (to && wk > to) return;
      var old = w[j.mokjang_id];
      if (old && old.j.week_start === wk) return;   // 주일 기준 것을 먼저
      w[j.mokjang_id] = { j: j, ps: [] };
    });
    Object.keys(out).forEach(function (wk) { Object.keys(out[wk]).forEach(function (k) { js.push(out[wk][k]); }); });
    var byJ = {}; js.forEach(function (d) { byJ[d.j.id] = d; });
    var ids = Object.keys(byJ);
    for (var i = 0; i < ids.length; i += 100) {   // 주소가 너무 길어지지 않게 100개씩
      var ps = (await sb.from('church_prayer').select('*').in('journal_id', ids.slice(i, i + 100)).order('sort_order')).data || [];
      ps.forEach(function (p) { if (byJ[p.journal_id]) byJ[p.journal_id].ps.push(p); });
    }
    return out;
  }
  function dayText(d) { return new Intl.DateTimeFormat(C.lang() === 'en' ? 'en-US' : 'ko-KR', { timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(d + 'T00:00:00Z')); }
  function spanText(fromWk, toWk) { return T('{0} ~ {1}', dayText(fromWk), dayText(C.addDays(toWk, 6))); }
  function gatherRange() {
    var r = $('#g-range').value;
    if (r === 'month') return { from: C.addWeeks(week, -3), to: week, label: spanText(C.addWeeks(week, -3), week) };
    if (r === 'all') return { from: '2000-01-01', to: null, label: T('전체 기간') };
    if (r === 'custom') {
      var f = $('#g-from').value, e = $('#g-to').value;
      if (!f || !e) return null;
      if (f > e) { var x = f; f = e; e = x; }
      return { from: C.mondayOf(f), to: C.mondayOf(e), label: spanText(C.mondayOf(f), C.mondayOf(e)) };
    }
    return null;
  }

  /* ── 함께 기도해요 (선교사님 · 협력 교회 · 지역·협회) — 교회 features.shared_prayers ── */
  var SP_KINDS = [['missionary', '선교사님'], ['church', '협력 교회'], ['region', '지역·협회'], ['etc', '기타']];
  function spKind(k) { var x = SP_KINDS.filter(function (o) { return o[0] === k; })[0]; return T(x ? x[1] : '기타'); }
  function sharedList() { var l = ((C.getChurch() || {}).features || {}).shared_prayers; return Array.isArray(l) ? l : []; }
  async function saveShared(list) {
    var c = C.getChurch() || {};
    var cur = (await sb.from('church_church').select('features').eq('id', c.id).maybeSingle()).data;   // 그사이 바뀐 다른 설정(공지 등)을 지우지 않게 새로 읽어서 합친다
    var f = Object.assign({}, (cur && cur.features) || c.features || {}, { shared_prayers: list });
    var r = await sb.from('church_church').update({ features: f }).eq('id', c.id);
    if (r.error) throw new Error(r.error.message);
    c.features = f;
  }
  function renderShared() {
    var list = sharedList(), box = $('#sp-list'); if (!box) return;
    $('#shared-card').classList.toggle('noprint', !list.length);   // 비어 있으면 인쇄에서 뺀다
    box.innerHTML = list.length
      ? '<ul class="pr-list sp-list">' + list.map(function (x, i) {
          return '<li><span class="pr-name">' + esc(spKind(x.kind)) + (x.who ? ' · ' + esc(x.who) : '') + '</span>' +
            '<div class="pr-text">' + C.proseHtml(x.text || '') + '</div>' +
            '<span class="sp-acts noprint"><button type="button" class="small ghost" data-sp-edit="' + i + '">' + esc(T('고치기')) + '</button>' +
            '<button type="button" class="small ghost" data-sp-del="' + i + '">' + esc(T('지우기')) + '</button></span></li>';
        }).join('') + '</ul>'
      : '<p class="quiet noprint">' + esc(T('아직 없습니다. [＋ 기도제목 넣기]로 선교사님이나 협력 교회 기도제목을 넣어 보세요.')) + '</p>';
    if (box.dataset.bound) return;
    box.dataset.bound = '1';
    $('#sp-add').addEventListener('click', function () { editShared(-1); });
    box.addEventListener('click', async function (e) {
      var ed = e.target.closest('[data-sp-edit]'), del = e.target.closest('[data-sp-del]');
      if (ed) editShared(+ed.dataset.spEdit);
      if (del) {
        var l = sharedList().slice(), x = l[+del.dataset.spDel]; if (!x) return;
        if (!confirm(T('이 기도제목을 지울까요?'))) return;
        l.splice(+del.dataset.spDel, 1);
        try { await saveShared(l); renderShared(); } catch (err) { alert(err.message); }
      }
    });
  }
  function editShared(i) {
    var l = sharedList(), x = i >= 0 ? l[i] : null;
    C.sheet({ kicker: T('함께 기도해요'), title: x ? T('기도제목 고치기') : T('기도제목 넣기'), cls: 'sp-sheet',
      html: '<label>' + esc(T('구분')) + '<select id="sp-kind">' + SP_KINDS.map(function (o) {
          return '<option value="' + o[0] + '"' + ((x ? x.kind : 'missionary') === o[0] ? ' selected' : '') + '>' + esc(T(o[1])) + '</option>'; }).join('') + '</select></label>' +
        '<label>' + esc(T('누구를 위해')) + '<input type="text" id="sp-who" maxlength="60" placeholder="' + esc(T('예: 캄보디아 김OO 선교사님 가정')) + '" value="' + esc(x ? x.who || '' : '') + '"></label>' +
        '<label>' + esc(T('기도제목')) + '<textarea id="sp-text" maxlength="1000">' + esc(x ? x.text || '' : '') + '</textarea></label><div class="msg" id="msg-sp"></div>',
      foot: [{ label: T('취소') }, { label: T('저장'), fn: async function () {
        var who = $('#sp-who').value.trim(), text = $('#sp-text').value.trim();
        if (!text) { C.say($('#msg-sp'), T('기도제목을 적어 주세요.'), 'err'); return true; }
        var item = { id: x ? x.id : 'sp' + Date.now().toString(36), kind: $('#sp-kind').value, who: who, text: text, at: new Date().toISOString() };
        var nl = sharedList().slice(); if (x) nl[i] = item; else nl.push(item);
        try { await saveShared(nl.slice(0, 50)); renderShared(); } catch (err) { C.say($('#msg-sp'), err.message, 'err'); return true; }
      } }] });
  }

  async function loadGather() {
    renderShared();
    var range = $('#g-range').value, story = $('#g-story').checked;   // 기본은 기도제목만 (주일 중보기도용), 켜면 목장 이야기를 맨 위에
    var one = range === 'week';
    ['#g-prev', '#g-label', '#g-next'].forEach(function (s) { $(s).hidden = !one; });
    $('#gather-list').innerHTML = T('<p class="empty">불러오는 중…</p>');
    if (one) {
      $('#g-label').textContent = C.weekLabel(week);
      $('#g-print-head').innerHTML = T('<h2 style="margin:0">목장 기도제목 — ') + esc(C.weekLabel(week)) + '</h2>';
      var data = await fetchWeek();
      var live = mokjangs.filter(function (m) { return m.active && data[m.id]; });
      if (!live.length) {
        $('#gather-list').innerHTML = T('<div class="card"><p class="empty">이 주에 올라온 일기가 없습니다.</p></div>');
        return;
      }
      $('#gather-list').innerHTML = live.map(function (m) { return gatherCard(m, data[m.id], story); }).join('');
      return;
    }
    var g = gatherRange();
    if (!g) { $('#gather-list').innerHTML = T('<div class="card"><p class="empty">시작 날짜와 끝 날짜를 골라 주세요.</p></div>'); return; }
    $('#g-print-head').innerHTML = T('<h2 style="margin:0">목장 기도제목 — ') + esc(g.label) + '</h2>';
    var weeks = await fetchRange(g.from, g.to), keys = Object.keys(weeks).sort();   // 오래된 주부터 차례로 (책처럼)
    var order = mokjangs.slice();   // 목장 순서는 주간 현황과 같게 (지금은 없어진 목장도 그때 일기는 보인다)
    var html = keys.map(function (wk) {
      var w = weeks[wk], list = order.filter(function (m) { return w[m.id]; });
      if (!list.length) return '';
      return '<section class="gather-week"><h2 class="gather-week-h">' + esc(C.weekLabel(wk)) +
        ' <span class="quiet">' + esc(T('목장 {0}곳', list.length)) + '</span></h2>' +
        list.map(function (m) { return gatherCard(m, w[m.id], story); }).join('') + '</section>';
    }).join('');
    $('#gather-list').innerHTML = html || T('<div class="card"><p class="empty">이 기간에 올라온 일기가 없습니다.</p></div>');
  }


  /* ── 관리 ──────────────────────────────────────── */
  /* ── 목자(순장) 스스로 가입 코드 ── */
  function showJoin(code) {
    $('#join-off').hidden = !!code; $('#join-on').hidden = !code;
    if (!code) return;
    $('#join-code').textContent = code;
    var link = C.churchLink(C.getChurch());
    $('#join-link').value = link + (link.indexOf('?') >= 0 ? '&' : '?') + 'join=' + encodeURIComponent(code);
  }
  function bindJoin() {
    C.callAdmin({ action: 'join_code_get' }).then(function (r) { showJoin(r.code); }).catch(function () {});
    async function make() {
      try { showJoin((await C.callAdmin({ action: 'join_code_new' })).code); C.say($('#msg-join'), T('새 가입 코드를 만들었습니다. 예전 코드는 이제 쓸 수 없습니다.'), 'ok'); }
      catch (e) { C.say($('#msg-join'), e.message, 'err'); }
    }
    $('#join-make').addEventListener('click', make);
    $('#join-new').addEventListener('click', function () { if (confirm(T('코드를 바꾸면 예전 코드와 주소로는 가입할 수 없습니다. 바꿀까요?'))) make(); });
    $('#join-stop').addEventListener('click', async function () {
      if (!confirm(T('가입을 끌까요? 이미 가입한 목자는 그대로 씁니다.'))) return;
      try { await C.callAdmin({ action: 'join_code_off' }); showJoin(null); C.say($('#msg-join'), T('가입을 껐습니다.'), 'ok'); }
      catch (e) { C.say($('#msg-join'), e.message, 'err'); }
    });
    $('#join-copy').addEventListener('click', async function () {
      var v = $('#join-link').value;
      try { await navigator.clipboard.writeText(v); C.say($('#msg-join'), T('주소를 복사했습니다.'), 'ok'); }
      catch (e) { $('#join-link').select(); C.say($('#msg-join'), T('주소를 길게 눌러 복사해 주세요.'), 'ok'); }
    });
  }

  function bindManage() {
    bindJoin();
    $('#form-new').addEventListener('submit', async function (e) {
      e.preventDefault();
      var b = $('#btn-new'); b.disabled = true; b.textContent = T('만드는 중…');
      try {
        await C.callAdmin({
          action: 'create_mokja',
          login_id: $('#n-id').value, password: $('#n-pw').value,
          name: $('#n-name').value, mokjang_name: $('#n-mj').value.trim() || T('{0} 목장', $('#n-name').value.trim()), meet_day: $('#n-day').value
        });
        C.say($('#msg-new'), T('{0} 목자 계정을 만들었습니다. 아이디 {1} · 비밀번호 {2} 를 알려 주세요.',
          $('#n-name').value, $('#n-id').value.trim().toLowerCase(), $('#n-pw').value), 'ok', true);
        $('#form-new').reset();
        await loadMokjangs(); renderManage(); loadWeek();
      } catch (err) {
        C.say($('#msg-new'), err.message, 'err');
      }
      b.disabled = false; b.textContent = T('계정 만들기');
    });


    C.bindMyPhoto(me);   // 내 사진 (성도 사진을 켠 교회만)
    $('#my-name').value = me.name || '';
    $('#form-myname').addEventListener('submit', async function (e) {
      e.preventDefault();
      var nm = $('#my-name').value.trim();
      if (!nm) return C.say($('#msg-myname'), T('이름을 적어 주세요.'), 'err');
      var r = await sb.from('church_profile').update({ name: nm }).eq('id', me.id).select().single();
      if (r.error) return C.say($('#msg-myname'), r.error.message, 'err');
      me.name = r.data.name;
      $('.top .who span').textContent = C.title2(me);
      C.say($('#msg-myname'), T('이름을 바꿨습니다.'), 'ok');
    });

    $('#form-pw').addEventListener('submit', async function (e) {
      e.preventDefault();
      var a = $('#pw1').value, b2 = $('#pw2').value;
      if (a.length < 8) return C.say($('#msg-pw'), T('비밀번호는 8자 이상으로 정해 주세요.'), 'err');
      if (a !== b2) return C.say($('#msg-pw'), T('두 번 넣으신 비밀번호가 서로 다릅니다.'), 'err');
      var r = await sb.auth.updateUser({ password: a });
      if (r.error) return C.say($('#msg-pw'), r.error.message, 'err');
      $('#pw1').value = $('#pw2').value = '';
      C.say($('#msg-pw'), T('비밀번호를 바꿨습니다.'), 'ok');
    });

    $('#btn-new-code').addEventListener('click', async function () {
      var b = this; b.disabled = true;
      try {
        var r = await C.callAdmin({ action: 'new_recovery_code' });
        $('#code-box').textContent = r.recovery_code; $('#code-box').hidden = false;
        C.say($('#msg-code'), T('새 복구 코드입니다. 사진을 찍거나 적어 두세요.'), 'ok', true);
      } catch (err) { C.say($('#msg-code'), err.message, 'err'); }
      b.disabled = false;
    });

    $('#btn-leave').addEventListener('click', async function () {
      if (!$('#leave-pw').value) return C.say($('#msg-leave'), T('비밀번호를 넣어 주세요.'), 'err');
      if (!confirm(T('정말 탈퇴할까요? 되돌릴 수 없습니다.'))) return;
      var b = this; b.disabled = true;
      try {
        await C.checkPassword(me.login_id, $('#leave-pw').value);
        await C.callAdmin({ action: 'delete_me' });
        await C.afterLeave();
      } catch (err) { C.say($('#msg-leave'), err.message, 'err'); b.disabled = false; }
    });
    $('#btn-drop-church').addEventListener('click', async function () {
      var c = C.getChurch() || {};
      if (!$('#leave-pw').value) return C.say($('#msg-leave'), T('비밀번호를 넣어 주세요.'), 'err');
      if ($('#leave-church').value.trim() !== (c.name || '').trim()) return C.say($('#msg-leave'), T('교회 이름이 맞지 않습니다'), 'err');
      if (!confirm(T('{0} 의 모든 자료를 지울까요? 되돌릴 수 없습니다.', c.name))) return;
      var b = this; b.disabled = true;
      try {
        await C.checkPassword(me.login_id, $('#leave-pw').value);
        await C.callAdmin({ action: 'delete_church', confirm_name: $('#leave-church').value });
        await C.afterLeave();
      } catch (err) { C.say($('#msg-leave'), err.message, 'err'); b.disabled = false; }
    });

    $('#form-pastor').addEventListener('submit', async function (e) {
      e.preventDefault();
      var b = $('#btn-pastor'); b.disabled = true; b.textContent = T('만드는 중…');
      try {
        await C.callAdmin({
          action: 'create_pastor',
          login_id: $('#p-id').value, password: $('#p-pw').value, name: $('#p-name').value
        });
        C.say($('#msg-pastor'), T('{0} 목사 계정을 만들었습니다. 아이디 {1} · 비밀번호 {2} 를 알려 주세요.',
          $('#p-name').value, $('#p-id').value.trim().toLowerCase(), $('#p-pw').value), 'ok', true);
        $('#form-pastor').reset();
        renderManage();
      } catch (err) {
        C.say($('#msg-pastor'), err.message, 'err');
      }
      b.disabled = false; b.textContent = T('목사 계정 만들기');
    });

    $('#manage-list').addEventListener('click', onManageClick);
    $('#pastor-list').addEventListener('click', onPastorClick);
  }

  async function onPastorClick(e) {
    var btn = e.target.closest('button'); if (!btn) return;
    var item = e.target.closest('.list-item'), uid = item.dataset.uid, nm = item.dataset.name;
    try {
      if (btn.classList.contains('act-pw')) {
        var np = prompt(T('새 비밀번호를 정해 주세요 (8자 이상).'));
        if (np === null) return;
        await C.callAdmin({ action: 'reset_password', user_id: uid, password: np });
        C.say($('#msg-pastor'), T('{0} 목사의 새 비밀번호는 {1} 입니다.', nm, np), 'ok', true);
        return;
      }
      if (btn.classList.contains('act-del')) {
        if (!confirm(T('{0} 목사 계정을 지울까요?', nm))) return;
        await C.callAdmin({ action: 'delete_user', user_id: uid });
        renderManage();
      }
    } catch (err) { C.say($('#msg-pastor'), err.message, 'err'); }
  }

  async function renderManage() {
    var profs = (await sb.from('church_profile').select('id, login_id, name, role, photo_path')).data || [];
    var byId = {}; profs.forEach(function (p) { byId[p.id] = p; });
    var photos = C.has('member_photos'), pUrl = photos ? await C.photoUrls(profs) : {};
    manageProfs = byId;

    var pastors = profs.filter(function (p) { return p.role === 'pastor'; });
    $('#pastor-list').innerHTML = pastors.map(function (p) {
      var mine = p.id === me.id;
      return '<div class="list-item" data-uid="' + p.id + '" data-name="' + esc(p.name) + '">' +
        '<div class="grow"><div class="t">' + esc(p.name) +
        (mine ? T(' <span class="badge done">지금 나</span>') : '') + '</div>' +
        T('<div class="s">아이디 ') + esc(p.login_id || '') + '</div></div>' +
        (mine ? '' : T('<button class="small act-pw">비밀번호 새로</button>')) +
        (mine || pastors.length <= 1 ? '' : T('<button class="small danger act-del">계정 삭제</button>')) +
        '</div>';
    }).join('');

    var box = $('#manage-list');
    if (!mokjangs.length) { box.innerHTML = T('<p class="empty">아직 목장이 없습니다.</p>'); return; }
    box.innerHTML = mokjangs.map(function (m) {
      var p = m.mokja_id ? byId[m.mokja_id] : null;
      return '<div class="list-item mg-item" data-mj="' + m.id + '" data-uid="' + (m.mokja_id || '') + '"><div class="mg-head">' +
        (photos ? C.avatar({ name: m.mokja_name || m.name, kind: 'leader' }, p && pUrl[p.id]) : '') +
        '<div class="grow"><div class="t">' + esc(m.name) + (m.active ? '' : T(' <span class="badge">쉼</span>')) + '</div>' +
        '<div class="s">' + esc(m.mokja_name || T('담당 목자 없음')) +
        (p ? (C.isKeyless(p) ? T(' · 열쇠 코드로 들어옴') : T(' · 아이디 ') + esc(p.login_id)) : '') +
        (m.meet_day ? ' · ' + esc(m.meet_day) : '') + '</div></div></div><div class="acts">' +
        (m.mokja_id && !(p && C.isKeyless && C.isKeyless(p)) ? T('<button class="small act-link">입장 링크</button>') : '') +
        (m.mokja_id ? (C.isKeyless(p) ? T('<button class="small act-key">열쇠 코드 새로</button>')
                                      : T('<button class="small act-pw">비밀번호 새로</button>')) : '') +
        (photos && p ? (pUrl[p.id] ? T('<button class="small act-mphoto">사진 바꾸기</button>') : T('<button class="small act-mphoto">사진</button>')) : '') +
        (photos && p && pUrl[p.id] ? T('<button class="small act-mphoto-del">사진 지우기</button>') : '') +
        T('<button class="small act-rename">이름 고치기</button>') +
        '<button class="small act-hide">' + (m.active ? T('잠시 쉼으로') : T('다시 활동')) + '</button>' +
        '</div><div class="acts-danger">' +
        (m.mokja_id ? T('<button class="small danger act-del">계정 삭제</button>') : '') +
        T('<button class="small danger act-drop">목장 지우기</button>') +
        '</div></div>';
    }).join('');
  }

  var manageProfs = {}, leaderPhoto = null;   // 목자 id → 사진 주소
  async function onManageClick(e) {
    var btn = e.target.closest('button'); if (!btn) return;
    var item = e.target.closest('.list-item');
    var mjId = item.dataset.mj, uid = item.dataset.uid;
    var m = mokjangs.find(function (x) { return x.id === mjId; });
    if (btn.classList.contains('act-mphoto-del')) {   // 목자 사진 지우기
      var wp = manageProfs[uid]; if (!wp) return;
      if (!confirm(T('{0} 목자 사진을 지울까요?', m.mokja_name))) return;
      try { await C.photoRemove(wp, 'church_profile'); leaderPhoto = null; await renderManage();
            C.say($('#msg-manage'), T('{0} 목자 사진을 지웠습니다.', m.mokja_name), 'ok'); }
      catch (err) { C.say($('#msg-manage'), err.message, 'err'); }
      return;
    }
    if (btn.classList.contains('act-mphoto')) {   // 목자 사진을 목사님이 대신 넣는다
      var fi = $('#mokja-photo-file'), who = manageProfs[uid];
      fi.value = '';
      fi.onchange = async function () {
        var f = fi.files && fi.files[0]; if (!f || !who) return;
        try { await C.photoSave(who, f, 'church_profile'); leaderPhoto = null; await renderManage();
              C.say($('#msg-manage'), T('{0} 목자 사진을 넣었습니다.', m.mokja_name), 'ok'); }
        catch (err) { C.say($('#msg-manage'), err.message, 'err'); }
      };
      fi.click();
      return;
    }

    try {
      if (btn.classList.contains('act-key')) {   // 비밀번호 없이 쓰는 목자 — 기기를 잃었을 때 새 열쇠 코드
        if (!confirm(T('{0} 목자의 열쇠 코드를 새로 만들까요? 예전 코드는 쓸 수 없게 됩니다.', m.mokja_name))) return;
        var kr = await C.callAdmin({ action: 'leader_new_key', user_id: uid });
        C.say($('#msg-manage'), T('{0} 목자의 새 열쇠 코드는 {1} 입니다. 알려 주세요.', m.mokja_name, kr.key), 'ok', true);
        return;
      }
      if (btn.classList.contains('act-link')) {   // 이 목자 한 사람의 입장 링크 (누르면 비밀번호 없이 들어감)
        if (!confirm(T('{0} 목자의 입장 링크를 만들까요? 전에 보낸 링크는 쓸 수 없게 됩니다.', m.mokja_name))) return;
        var lk = ((await C.callAdmin({ action: 'entry_links', user_id: uid })).links || [])[0];
        var url = C.churchLink(C.getChurch() || {}) + '#key=' + lk.key;
        var text = T('{0}님, 목장 나눔터 입장 링크입니다. 누르시면 바로 들어가집니다.', m.mokja_name) + '\n' + url;
        var copied = false; try { await navigator.clipboard.writeText(text); copied = true; } catch (e) {}
        C.say($('#msg-manage'), (copied ? T('{0} 목자 입장 링크를 복사했습니다. 카카오톡에 붙여 넣어 그 목자에게만 보내 주세요.', m.mokja_name)
          : T('{0} 목자 입장 링크입니다. 길게 눌러 복사해서 그 목자에게만 보내 주세요.', m.mokja_name)) + '\n' + url, 'ok', true);
        $('#msg-manage').scrollIntoView({ block: 'center' });
        return;
      }
      if (btn.classList.contains('act-pw')) {
        var np = prompt(T('새 비밀번호를 정해 주세요 (8자 이상).\n정하신 뒤 목자에게 알려 주세요.'));
        if (np === null) return;
        await C.callAdmin({ action: 'reset_password', user_id: uid, password: np });
        C.say($('#msg-manage'), T('{0} 목자의 새 비밀번호는 {1} 입니다.', m.mokja_name, np), 'ok', true);
        return;
      }
      if (btn.classList.contains('act-rename')) {
        var nn = prompt(T('목장 이름'), m.name); if (nn === null) return;
        var nd = prompt(T('모이는 요일 (비워도 됩니다)'), m.meet_day || ''); if (nd === null) nd = m.meet_day;
        await sb.from('church_mokjang').update({ name: nn.trim(), meet_day: (nd || '').trim() }).eq('id', mjId);
      } else if (btn.classList.contains('act-hide')) {
        await sb.from('church_mokjang').update({ active: !m.active }).eq('id', mjId);
      } else if (btn.classList.contains('act-del')) {
        if (!confirm(T('{0} 목자의 계정을 지울까요?\n목장과 지금까지 쓴 일기·기도제목은 그대로 남고, 이 목자는 더 이상 들어올 수 없습니다.\n(목자가 바뀔 때 쓰세요)', m.mokja_name))) return;
        await C.callAdmin({ action: 'delete_user', user_id: uid });
        await sb.from('church_mokjang').update({ mokja_name: m.mokja_name + T(' (지난 목자)') }).eq('id', mjId);
      } else if (btn.classList.contains('act-drop')) {
        var typed = prompt(T('{0} 을(를) 통째로 지웁니다.\n목원 명단과 지금까지의 일기·기도제목이 모두 사라지고 되돌릴 수 없습니다.\n(잠깐 모이지 않는 목장은 [잠시 쉼으로]를 쓰세요)\n\n정말 지우시려면 목장 이름을 그대로 적어 주세요.', m.name));
        if (typed === null) return;
        if (typed.trim() !== String(m.name).trim()) { C.say($('#msg-manage'), T('목장 이름이 맞지 않아 지우지 않았습니다.'), 'err'); $('#msg-manage').scrollIntoView({ block: 'center' }); return; }
        await sb.from('church_mokjang').delete().eq('id', mjId);
        if (uid && confirm(T('목장을 지웠습니다.\n담당 목자 {0} 의 계정도 지울까요? ([취소]를 누르면 계정은 남겨 둡니다)', m.mokja_name))) {
          await C.callAdmin({ action: 'delete_user', user_id: uid });
        }
      }
      await loadMokjangs(); renderManage(); loadWeek();
    } catch (err) {
      C.say($('#msg-manage'), err.message, 'err');
    }
  }
})();
