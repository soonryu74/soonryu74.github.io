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
    bindTabs(); bindWeek(); bindManage(); bindNotify(); bindChurch(); bindPeople();
    await loadMokjangs();
    await openFromLink() || await loadWeek();
    // 화면이 열려 있는 채로 알림을 누르면 주소 끝(#j=…)만 바뀐다 — 그때도 그 일기로 간다
    window.addEventListener('hashchange', function () { openFromLink(); });
  })();

  /* 알림을 눌러 들어오면(moksa.html#j=일기) 그 주로 가서 그 목장을 펼친다 */
  async function openFromLink() {
    var m = /[#&]j=([0-9a-f-]{36})/.exec(location.hash);
    if (!m) return false;
    var r = await sb.from('church_journal').select('id, mokjang_id, week_start').eq('id', m[1]).maybeSingle();
    if (!r.data) return false;
    week = r.data.week_start;
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
  var ASK_LATER = 'gajeong-notify-later';
  async function bindNotify() {
    $('#notify-on').addEventListener('click', function () { turnOn($('#msg-notify')); });
    $('#notify-ask-on').addEventListener('click', function () { turnOn($('#msg-notify-ask')); });
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
        var r = await C.notify({ action: 'test' });
        C.say($('#msg-notify'), r.sent ? T('시험 알림을 보냈습니다. 몇 초 안에 와야 합니다.')
          : T('알림을 받을 기기가 없습니다. 먼저 [이 기기에서 알림 받기]를 눌러 주세요.'), r.sent ? 'ok' : 'err', true);
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
                  'ios-home': T('홈 화면에 추가해야 함'), unsupported: T('이 브라우저는 알림을 못 받음') }[st];
    var help = {
      on: T('다른 휴대전화나 컴퓨터에서도 받으시려면 그 기기에서 한 번 더 켜 주세요.'),
      off: '',
      denied: T('주소창 왼쪽 자물쇠(또는 설정 → 사이트 설정 → 알림)에서 이 사이트 알림을 허용으로 바꿔 주세요.'),
      'ios-home': T('아이폰은 사파리 아래쪽 공유 단추 → [홈 화면에 추가]를 하신 뒤, 홈 화면의 아이콘으로 열어서 켜 주세요.'),
      unsupported: T('안드로이드는 크롬, 아이폰은 사파리(홈 화면에 추가)에서 받을 수 있습니다.')
    }[st];
    $('#notify-state').textContent = label;
    $('#notify-state').className = 'badge ' + (st === 'on' ? 'done' : 'todo');
    $('#notify-help').textContent = help;
    $('#notify-on').hidden = st === 'on' || st === 'unsupported' || st === 'ios-home';
    $('#notify-off').hidden = st !== 'on';
    $('#notify-test').hidden = st !== 'on';

    // 주간 현황 맨 위 안내: 아직 안 켰고, '나중에'를 누른 지 7일이 지났을 때만
    var later = 0; try { later = +localStorage.getItem(ASK_LATER) || 0; } catch (e) {}
    var ask = (st === 'off' || st === 'ios-home') && Date.now() - later > 7 * 864e5;
    $('#notify-ask').hidden = !ask;
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

    $('#ch-copy').addEventListener('click', async function () {
      var v = $('#ch-link').value;
      try { await navigator.clipboard.writeText(v); C.say($('#msg-church'), T('주소를 복사했습니다.'), 'ok'); }
      catch (e) { $('#ch-link').select(); C.say($('#msg-church'), T('주소를 길게 눌러 복사해 주세요.'), 'ok'); }
    });
    $('#form-church').addEventListener('submit', async function (e) {
      e.preventDefault();
      var r = await sb.from('church_church')
        .update({ name: $('#ch-name').value.trim(), timezone: $('#ch-tz').value, theme: theme, terms: pickedTerms() })
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
          '<div class="s">' + (esc(C.memberDatesLine(m)) || T('날짜 없음')) + '</div></div>' +
          T('<button class="small act-dates">날짜</button>') + '</div>';
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
        window.scrollTo(0, 0);
      });
    });
  }

  function bindWeek() {
    $('#wk-prev').addEventListener('click', function () { week = C.addWeeks(week, -1); loadWeek(); });
    $('#wk-next').addEventListener('click', function () { week = C.addWeeks(week, 1); loadWeek(); });
    $('#wk-this').addEventListener('click', function () { week = C.mondayOf(); loadWeek(); });
    $('#g-prev').addEventListener('click', function () { week = C.addWeeks(week, -1); loadGather(); });
    $('#g-next').addEventListener('click', function () { week = C.addWeeks(week, 1); loadGather(); });
    $('#g-only').addEventListener('change', loadGather);
    $('#g-print').addEventListener('click', function () { window.print(); });
  }

  async function loadMokjangs() {
    var r = await sb.from('church_mokjang').select('*').order('sort_order').order('created_at');
    if (r.error) { alert(T('불러오지 못했습니다: ') + r.error.message); return; }
    mokjangs = r.data || [];
  }

  /* 한 주 자료를 통째로 가져온다 */
  async function fetchWeek() {
    var js = (await sb.from('church_journal').select('*').eq('week_start', week)).data || [];
    var ids = js.map(function (j) { return j.id; });
    var ps = [], cs = [];
    if (ids.length) {
      ps = (await sb.from('church_prayer').select('*').in('journal_id', ids).order('sort_order')).data || [];
      cs = (await sb.from('church_comment').select('*').in('journal_id', ids).order('created_at')).data || [];
    }
    var byMj = {};
    js.forEach(function (j) {
      byMj[j.mokjang_id] = { j: j, ps: ps.filter(function (p) { return p.journal_id === j.id; }),
                             cs: cs.filter(function (c) { return c.journal_id === j.id; }) };
    });
    return byMj;
  }

  /* ── 주간 현황 ─────────────────────────────────── */
  async function loadWeek() {
    $('#wk-label').textContent = C.weekLabel(week);
    $('#week-list').innerHTML = T('<p class="empty">불러오는 중…</p>');
    var data = await fetchWeek();
    var live = mokjangs.filter(function (m) { return m.active; });
    var done = live.filter(function (m) { return data[m.id] && data[m.id].j.status === 'submitted'; }).length;
    var wrote = live.filter(function (m) { return data[m.id]; }).length;

    $('#stat').innerHTML =
      '<div><b>' + live.length + T('</b><span>목장</span></div>') +
      '<div><b>' + done + T('</b><span>제출함</span></div>') +
      '<div><b>' + (live.length - done) + T('</b><span>아직</span></div>') +
      '<div><b>' + (wrote - done) + T('</b><span>쓰는 중</span></div>');

    if (!live.length) {
      $('#week-list').innerHTML = T('<div class="card"><p class="empty">아직 목장이 없습니다. <b>목장·목자 관리</b>에서 목자 계정을 만들어 주세요.</p></div>');
      return;
    }

    $('#week-list').innerHTML = live.map(function (m) {
      var d = data[m.id];
      var state = !d ? T('<span class="badge todo">아직 안 씀</span>')
        : d.j.status === 'submitted' ? T('<span class="badge done">제출함</span>')
        : T('<span class="badge">쓰는 중</span>');
      var reply = d && d.cs.length ? '<span class="badge gold">' + T('답글 {0}', d.cs.length) + '</span>' : '';
      return '<details class="mj" data-mj="' + m.id + '"' + (d ? '' : ' data-empty="1"') + '>' +
        '<summary>' + esc(m.name) + ' ' + state + ' ' + reply +
        '<span class="spacer"></span><span class="quiet" style="font-weight:400; font-size:14px">' +
        esc(m.mokja_name || '') + '</span></summary>' +
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
      h += d.ps.map(function (p) {
        return '<div class="member"><div class="head"><span class="name">' + esc(p.name) + '</span>' +
          (p.attended ? '' : T('<span class="badge">결석</span>')) +
          (p.answered ? T('<span class="badge done">응답됨</span>') : '') + '</div>' +
          '<div class="prose">' + (p.content ? esc(p.content) : T('<span class="quiet">(적지 않음)</span>')) + '</div></div>';
      }).join('');
    }
    if (j.body) h += T('<div class="section-title">목장 이야기</div><div class="prose">') + esc(j.body) + '</div>';
    if (j.mokjang_prayer) h += T('<div class="section-title">목장 전체 기도제목</div><div class="prose">') + esc(j.mokjang_prayer) + '</div>';

    h += T('<div class="section-title">목사님 말씀</div>');
    h += d.cs.map(function (c) {
      return '<div class="member" style="background:var(--brand-soft); border-color:#cfe0d5">' +
        '<div class="head"><span class="name">' + esc(c.author_name) + '</span>' +
        '<span class="quiet" style="font-size:13px">' + C.whenText(c.created_at) + '</span>' +
        (c.author_id === me.id ? '<span class="spacer"></span><button class="small danger del-cmt" data-id="' + c.id + T('">지우기</button>') : '') +
        '</div><div class="prose">' + esc(c.body) + '</div></div>';
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
    });
    form.querySelector('button').disabled = false;
    if (r.error) return alert(T('남기지 못했습니다: ') + r.error.message);
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
  async function loadGather() {
    $('#g-label').textContent = C.weekLabel(week);
    $('#g-print-head').innerHTML = T('<h2 style="margin:0">목장 기도제목 — ') + esc(C.weekLabel(week)) + '</h2>';
    $('#gather-list').innerHTML = T('<p class="empty">불러오는 중…</p>');
    var data = await fetchWeek();
    var only = $('#g-only').checked;
    var live = mokjangs.filter(function (m) { return m.active && data[m.id]; });
    if (!live.length) {
      $('#gather-list').innerHTML = T('<div class="card"><p class="empty">이 주에 올라온 일기가 없습니다.</p></div>');
      return;
    }
    $('#gather-list').innerHTML = live.map(function (m) {
      var d = data[m.id], j = d.j, h = '';
      h += '<div class="card"><h2>' + esc(m.name) +
        (j.status === 'submitted' ? '' : T(' <span class="badge todo">임시</span>')) + '</h2>' +
        '<p class="desc">' + esc(m.mokja_name || '') +
        (j.present_count != null ? ' · ' + T('{0}명 참석', j.present_count) : '') + '</p>';
      var withText = d.ps.filter(function (p) { return p.content; });
      if (withText.length) {
        h += '<ul style="margin:0 0 12px; padding-left:20px">' + withText.map(function (p) {
          return '<li style="margin:6px 0"><b>' + esc(p.name) + '</b> — ' + esc(p.content) +
            (p.answered ? T(' <span class="badge done">응답됨</span>') : '') + '</li>';
        }).join('') + '</ul>';
      } else {
        h += T('<p class="quiet">적힌 목원 기도제목이 없습니다.</p>');
      }
      if (j.mokjang_prayer) {
        h += T('<div class="section-title" style="margin-top:8px">목장 전체</div>') +
          '<div class="prose">' + esc(j.mokjang_prayer) + '</div>';
      }
      if (!only && j.body) {
        h += T('<div class="section-title">목장 이야기</div><div class="prose">') + esc(j.body) + '</div>';
      }
      return h + '</div>';
    }).join('');
  }

  /* ── 관리 ──────────────────────────────────────── */
  function bindManage() {
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
    var profs = (await sb.from('church_profile').select('id, login_id, name, role')).data || [];
    var byId = {}; profs.forEach(function (p) { byId[p.id] = p; });

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
      return '<div class="list-item" data-mj="' + m.id + '" data-uid="' + (m.mokja_id || '') + '">' +
        '<div class="grow"><div class="t">' + esc(m.name) + (m.active ? '' : T(' <span class="badge">쉼</span>')) + '</div>' +
        '<div class="s">' + esc(m.mokja_name || T('담당 목자 없음')) +
        (p ? T(' · 아이디 ') + esc(p.login_id) : '') +
        (m.meet_day ? ' · ' + esc(m.meet_day) : '') + '</div></div>' +
        (m.mokja_id ? T('<button class="small act-pw">비밀번호 새로</button>') : '') +
        T('<button class="small act-rename">이름 고치기</button>') +
        '<button class="small act-hide">' + (m.active ? T('잠시 쉼으로') : T('다시 활동')) + '</button>' +
        (m.mokja_id ? T('<button class="small danger act-del">계정 삭제</button>') : '') +
        T('<button class="small danger act-drop">목장 지우기</button>') +
        '</div>';
    }).join('');
  }

  async function onManageClick(e) {
    var btn = e.target.closest('button'); if (!btn) return;
    var item = e.target.closest('.list-item');
    var mjId = item.dataset.mj, uid = item.dataset.uid;
    var m = mokjangs.find(function (x) { return x.id === mjId; });

    try {
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
        if (!confirm(T('{0} 목자의 계정을 지울까요?\n지금까지 쓴 일기와 기도제목은 그대로 남습니다.', m.mokja_name))) return;
        await C.callAdmin({ action: 'delete_user', user_id: uid });
        await sb.from('church_mokjang').update({ mokja_name: m.mokja_name + T(' (지난 목자)') }).eq('id', mjId);
      } else if (btn.classList.contains('act-drop')) {
        if (!confirm(T('{0} 을(를) 통째로 지울까요?\n\n이 목장의 목원 명단과 지금까지의 일기·기도제목이 모두 함께 사라지고, 되돌릴 수 없습니다.\n(시험 삼아 만든 목장을 치울 때 쓰세요.)', m.name))) return;
        if (uid && !confirm(T('담당 목자 {0} 의 계정도 함께 지울까요?\n[확인]을 누르면 계정까지 지웁니다. [취소]를 누르면 목장만 지웁니다.', m.mokja_name))) {
          await sb.from('church_mokjang').delete().eq('id', mjId);
        } else {
          await sb.from('church_mokjang').delete().eq('id', mjId);
          if (uid) await C.callAdmin({ action: 'delete_user', user_id: uid });
        }
      }
      await loadMokjangs(); renderManage(); loadWeek();
    } catch (err) {
      C.say($('#msg-manage'), err.message, 'err');
    }
  }
})();
