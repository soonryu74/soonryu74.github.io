/* 목자 화면 — 내 목장 하나만 다룬다 */
(function () {
  var C = window.CHURCH, sb = C.sb, $ = C.$, $$ = C.$$, esc = C.esc, T = C.t;
  var me = null, mokjang = null, mokwon = [], week = C.mondayOf(), journal = null, prayers = [], dirty = false;
  var rendered = null;  // 지금 화면에 그려져 있는 기도제목 줄

  /* ── 시작 ──────────────────────────────────────── */
  (async function start() {
    me = await C.guard('mokja');
    if (!me) return;
    week = C.mondayOf();                 // 교회 시간대가 정해진 뒤 다시 센다

    var r = await sb.from('church_mokjang').select('*').order('sort_order').limit(1);
    if (r.error) return fail(r.error.message);
    mokjang = (r.data || [])[0];
    if (!mokjang) {
      C.header(me, T('목장 나눔터'));
      $('.wrap').innerHTML =
        T('<div class="card"><h2>아직 목장이 배정되지 않았습니다</h2>') +
        T('<p class="desc">목사님께서 목장을 만들어 주시면 이 화면에 일기 쓰는 곳이 열립니다.</p>') +
        T('<button id="o">로그아웃</button></div>');
      $('#o').addEventListener('click', C.signOut);
      return;
    }
    C.header(me, mokjang.name);
    $('#mj-name').value = mokjang.name;
    $('#mj-day').value = mokjang.meet_day || '';

    bindTabs(); bindWeek(); bindWrite(); bindMembers(); bindMine(); bindNotify();
    await loadMokwon();
    await pickStartWeek();
    await loadWeek();
    watchNewWeek();
    showNoticeBar();
    openFromLink();
    // 화면이 열려 있는 채로 알림을 누르면 주소 끝(#j=…)만 바뀐다 — 그때도 그 일기로 간다
    window.addEventListener('hashchange', openFromLink);
    window.addEventListener('beforeunload', function (e) {
      if (dirty) { e.preventDefault(); e.returnValue = ''; }
    });
  })();

  function fail(m) { alert(T('불러오지 못했습니다: ') + m); }

  /* 말씀 알림을 눌러 들어오면(mokjang.html#j=일기) [지난 일기]에서 그 주를 펼친다 */
  async function openFromLink() {
    var m = /[#&]j=([0-9a-f-]{36})/.exec(location.hash);
    if (!m) return;
    history.replaceState(null, '', location.pathname);
    // 탭 단추를 누르면 목록을 한 번 더 불러 펼친 것이 덮이므로, 탭만 직접 바꾼다
    $$('.tabs button').forEach(function (x) { x.classList.toggle('on', x.dataset.pane === 'past'); });
    $$('.pane').forEach(function (x) { x.classList.toggle('on', x.id === 'pane-past'); });
    await loadPast();
    var d = $('#past-list details[data-id="' + m[1] + '"]');
    if (d) { d.open = true; d.scrollIntoView({ block: 'start' }); }
  }

  /* ── 휴대전화 알림 (목사님 말씀) ───────────────── */
  var ASK_LATER = 'gajeong-notify-later-mokja';
  function bindNotify() {
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
      C.say(msgEl, T('알림을 켰습니다. 목사님이 말씀을 남기시면 이 기기로 알려 드립니다.'), 'ok', true);
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
    // 일기 쓰기 맨 위 안내: 아직 안 켰고, '나중에'를 누른 지 7일이 지났을 때만
    var later = 0; try { later = +localStorage.getItem(ASK_LATER) || 0; } catch (e) {}
    $('#notify-ask').hidden = !((st === 'off' || st === 'ios-home' || st === 'inapp') && Date.now() - later > 7 * 864e5);
    if (st === 'inapp') { $('#notify-ask-desc').textContent = help; $('#notify-ask-on').textContent = T('크롬·사파리로 열기'); }
    if (st === 'ios-home') { $('#notify-ask-desc').textContent = help; $('#notify-ask-on').hidden = true; }
  }

  // 주일·월요일에는 지난주 모임 일기를 마저 쓰는 일이 많다 —
  // 이번 주 일기가 아직 없고 지난주 일기가 제출 전이면 지난주를 먼저 연다
  var startWeek = null;
  async function pickStartWeek() {
    startWeek = week;
    if (C.dayOfWeek() > 1) return;
    var now = await findJournal(week, 'id');
    if (now.data) return;
    var last = await findJournal(C.addWeeks(week, -1), 'id, status');
    if (last.data && last.data.status !== 'submitted') {
      week = C.addWeeks(week, -1);
      C.say($('#msg-write'), T('지난주 일기가 아직 제출 전이라 지난주를 먼저 열었습니다. 이번 주는 [다음주 ›]를 누르세요.'), 'ok');
    }
  }
  // 앱을 켜 둔 채 주일이 지나면, 다시 볼 때 새 주로 넘어간다
  function watchNewWeek() {
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState !== 'visible' || dirty) return;
      var now = C.mondayOf();
      if (now !== startWeek) { startWeek = now; week = now; loadWeek(); }
    });
  }
  function markDirty() { dirty = true; $('#save-state').textContent = T('아직 저장되지 않았습니다'); clearTimeout(markDirty.t); markDirty.t = setTimeout(keepDraft, 700); }

  // 쓰던 글을 이 기기에도 적어 둔다 — 로그인이 풀려 저장이 안 돼도 글이 사라지지 않게
  function draftKey() { return 'draft:' + mokjang.id + ':' + week; }
  function keepDraft() {
    if (!mokjang || !rendered) return;
    try {
      var rows = {};
      collect().forEach(function (p) { rows[p.mokwon_id || ('n:' + p.name)] = { c: p.content, a: p.attended, r: p.answered }; });
      localStorage.setItem(draftKey(), JSON.stringify({ at: Date.now(), met_on: $('#met-on').value, present: $('#present').value,
        body: $('#body').value, mprayer: $('#mprayer').value, rows: rows }));
    } catch (e) {}
  }
  function dropDraft() { clearTimeout(markDirty.t); try { localStorage.removeItem(draftKey()); } catch (e) {} }
  // 서버에 저장된 것보다 나중에 쓴 글이 이 기기에 남아 있으면 되살린다
  function restoreDraft() {
    var d = null; try { d = JSON.parse(localStorage.getItem(draftKey()) || 'null'); } catch (e) {}
    if (!d) return;
    if (journal && journal.updated_at && new Date(journal.updated_at).getTime() >= d.at) return dropDraft();
    $('#met-on').value = d.met_on || $('#met-on').value; $('#present').value = d.present || '';
    $('#body').value = d.body || ''; $('#mprayer').value = d.mprayer || '';
    $$('#members-box .member').forEach(function (el) {
      var row = (rendered || [])[+el.dataset.i]; if (!row) return;
      var x = (d.rows || {})[row.mokwon_id || ('n:' + row.name)]; if (!x) return;
      $('.f-con', el).value = x.c || ''; $('.f-att', el).checked = !!x.a; $('.f-ans', el).checked = !!x.r;
      $('.f-con', el).dispatchEvent(new Event('input', { bubbles: true }));
    });
    markDirty();
    C.say($('#msg-write'), T('저장하지 못하고 남아 있던 글을 되살렸습니다. 확인하시고 [저장]이나 [제출]을 눌러 주세요.'), 'ok', true);
  }
  // 로그인이 풀린 채로 저장하면 서버가 막는다 (row-level security) — 글은 보관하고 다시 로그인하게 한다
  async function lostLogin(err) {
    if (/row-level security|JWT|401|not authenticated/i.test(String(err && err.message))) return true;
    try { return !(await sb.auth.getSession()).data.session; } catch (e) { return false; }
  }
  function askRelogin() {
    keepDraft();
    C.say($('#msg-write'), T('로그인이 풀려서 저장하지 못했습니다. 쓰신 글은 이 기기에 보관해 두었습니다.'), 'err');
    C.sheet({ kicker: T('쓰신 글은 그대로 있어요'), title: T('다시 로그인해 주세요'),
      html: '<p class="desc">' + esc(T('오래 열어 두었거나 다른 기기에서 로그아웃하면 로그인이 풀릴 수 있습니다. 다시 로그인하시면 쓰던 글이 그대로 돌아오고, 그때 저장하시면 됩니다.')) + '</p>',
      foot: [{ label: T('나중에') }, { label: T('다시 로그인'), fn: function () { dirty = false; C.signOut(); } }] });
  }

  /* ── 탭 ────────────────────────────────────────── */
  function bindTabs() {
    $$('.tabs button').forEach(function (b) {
      b.addEventListener('click', function () {
        $$('.tabs button').forEach(function (x) { x.classList.remove('on'); });
        $$('.pane').forEach(function (x) { x.classList.remove('on'); });
        b.classList.add('on');
        $('#pane-' + b.dataset.pane).classList.add('on');
        if (b.dataset.pane === 'past') loadPast();
        if (b.dataset.pane === 'write') renderMembers();
        window.scrollTo(0, 0);
      });
    });
  }

  /* ── 주차 ──────────────────────────────────────── */
  function bindWeek() {
    $('#wk-prev').addEventListener('click', function () { go(C.addWeeks(week, -1)); });
    $('#wk-next').addEventListener('click', function () { go(C.addWeeks(week, 1)); });
  }
  async function go(w) {
    if (dirty && !confirm(T('저장하지 않은 내용이 있습니다. 그래도 옮기시겠습니까?'))) return;
    if (dirty) dropDraft();   // 옮기기로 했으면 쓰던 글은 버린다
    week = w; dirty = false; await loadWeek();
  }

  /* ── 목원 명단 ─────────────────────────────────── */
  async function loadMokwon() {
    var r = await sb.from('church_mokwon').select('*')
      .eq('mokjang_id', mokjang.id).order('sort_order').order('created_at');
    if (r.error) return fail(r.error.message);
    mokwon = r.data || [];
    if (C.has('member_photos')) photoUrl = await C.photoUrls(mokwon);
    renderMemberList();
  }
  var photoUrl = {};   // 목원 id → 사진 주소 (성도 사진을 켠 교회만)

  function renderMemberList() {
    var box = $('#member-list');
    if (!mokwon.length) { box.innerHTML = T('<p class="empty">아직 목원이 없습니다. 위에 이름을 넣어 주세요.</p>'); return; }
    var dates = C.has('member_dates');   // 성도 날짜(교회 등록·생명의 삶·침례)는 켠 교회만
    var photos = C.has('member_photos');
    box.innerHTML = mokwon.map(function (m) {
      return '<div class="list-item" data-id="' + m.id + '">' +
        (photos ? C.avatar(m, photoUrl[m.id]) : '') +
        '<div class="grow"><div class="t">' + esc(m.name) +
        (m.tag ? ' <span class="badge gold">' + esc(m.tag) + '</span>' : '') +
        (m.active ? '' : T(' <span class="badge">쉼</span>')) + '</div>' +
        (dates ? '<div class="s">' + esc(C.memberDatesLine(m)) + '</div>' : '') + '</div>' +
        T('<button class="small act-edit">이름 고치기</button>') +
        (dates ? T('<button class="small act-dates">등록 정보</button>') : '') +
        (photos ? T('<button class="small act-photo">사진</button>') : '') +
        (photos && m.photo_path ? T('<button class="small act-photo-del">사진 지우기</button>') : '') +
        '<button class="small act-toggle">' + (m.active ? T('잠시 쉼으로') : T('다시 참여')) + '</button>' +
        T('<button class="small danger act-del">삭제</button></div>');
    }).join('');
  }

  function bindMembers() {
    $('#form-add').addEventListener('submit', async function (e) {
      e.preventDefault();
      var name = $('#new-name').value.trim();
      if (!name) return;
      var r = await sb.from('church_mokwon').insert({
        mokjang_id: mokjang.id, name: name, tag: $('#new-tag').value.trim(),
        sort_order: mokwon.length + 1
      });
      if (r.error) return C.say($('#msg-members'), r.error.message, 'err');
      $('#new-name').value = ''; $('#new-tag').value = '';
      await loadMokwon(); renderMembers();
      C.say($('#msg-members'), T('{0} 님을 넣었습니다.', name), 'ok');
    });

    $('#member-list').addEventListener('submit', async function (e) {
      e.preventDefault();
      var form = e.target, got = C.readDatesForm(form);
      if (got.error) return C.say($('#msg-members'), got.error, 'err');
      var r = await sb.from('church_mokwon').update(got.values).eq('id', form.dataset.id);
      if (r.error) return C.say($('#msg-members'), r.error.message, 'err');
      await loadMokwon(); renderMembers();
      C.say($('#msg-members'), T('날짜를 저장했습니다.'), 'ok');
    });

    var photoFor = null;
    if (C.has('member_photos')) $('#photo-hint').hidden = false;
    $('#photo-file').addEventListener('change', async function () {
      var f = this.files && this.files[0], m = photoFor; photoFor = null;
      if (!f || !m) return;
      C.say($('#msg-members'), T('사진을 올리는 중…'), 'ok');
      try { await C.photoSave(m, f); await loadMokwon(); C.say($('#msg-members'), T('{0} 님 사진을 넣었습니다.', m.name), 'ok'); }
      catch (err) { C.say($('#msg-members'), err.message, 'err'); }
    });

    $('#member-list').addEventListener('click', async function (e) {
      var btn = e.target.closest('button'); if (!btn) return;
      var id = e.target.closest('.list-item').dataset.id;
      var m = mokwon.find(function (x) { return x.id === id; });
      if (!m) return;

      if (btn.getAttribute('type') === 'submit') return;   // 날짜 저장은 아래 submit에서
      if (btn.classList.contains('act-dates') || btn.classList.contains('act-close')) {   // 교회 등록·생명의 삶·침례 날짜
        var item = e.target.closest('.list-item'), open = item.querySelector('.dates-form');
        if (open) open.remove(); else item.insertAdjacentHTML('beforeend', C.memberDatesForm(m));
        return;
      }
      if (btn.classList.contains('act-edit')) {
        var nm = prompt(T('이름'), m.name); if (nm === null) return;
        var tg = prompt(T('표시 (새가족·VIP 등, 비워도 됩니다)'), m.tag || ''); if (tg === null) tg = m.tag;
        await sb.from('church_mokwon').update({ name: nm.trim(), tag: (tg || '').trim() }).eq('id', id);
      } else if (btn.classList.contains('act-toggle')) {
        await sb.from('church_mokwon').update({ active: !m.active }).eq('id', id);
      } else if (btn.classList.contains('act-photo')) {   // 성도 사진: 고르면 400px로 줄여 올린다
        photoFor = m; $('#photo-file').value = ''; $('#photo-file').click();
        return;
      } else if (btn.classList.contains('act-photo-del')) {
        if (!confirm(T('{0} 님 사진을 지울까요?', m.name))) return;
        await C.photoRemove(m);
      } else if (btn.classList.contains('act-del')) {
        if (!confirm(T('{0} 님을 명단에서 지울까요?\n지난 주 기록에 적힌 기도제목은 그대로 남습니다.', m.name))) return;
        await C.photoRemove(m);
        await sb.from('church_mokwon').delete().eq('id', id);
      }
      await loadMokwon(); renderMembers();
    });
  }

  /* ── 한 주 불러오기 ────────────────────────────── */
  async function loadWeek() {
    $('#wk-label').textContent = C.weekLabel(week);
    $('#wk-state').textContent = T('불러오는 중');
    $('#wk-state').className = 'badge';

    var r = await findJournal(week, '*');
    if (r.error) return fail(r.error.message);
    journal = r.data || null;

    prayers = [];
    if (journal) {
      var pr = await sb.from('church_prayer').select('*').eq('journal_id', journal.id).order('sort_order');
      prayers = pr.data || [];
    }

    $('#met-on').value = (journal && journal.met_on) || defaultMetOn();
    $('#present').value = (journal && journal.present_count != null) ? journal.present_count : '';
    $('#body').value = (journal && journal.body) || '';
    $('#mprayer').value = (journal && journal.mokjang_prayer) || '';

    var submitted = journal && journal.status === 'submitted';
    $('#wk-state').textContent = submitted ? T('제출함') : (journal ? T('임시 저장됨') : T('아직 안 썼습니다'));
    $('#wk-state').className = 'badge ' + (submitted ? 'done' : 'todo');
    $('#save-state').textContent = journal && journal.updated_at ? (T('마지막 저장 ') + C.whenText(journal.updated_at)) : '';
    dirty = false;
    rendered = null;
    renderMembers();
    restoreDraft();
    mokjaChips(submitted);
  }

  // 첫 화면 알약 단추 · 목사님 공지
  function mokjaChips(submitted) {
    var n = ((me.church || {}).features || {}).notice; if (!C.noticeLive(n)) n = null;
    C.heroChips([
      { label: week === C.mondayOf() ? T('이번 주 일기') : T('이 주 일기'), value: submitted ? T('제출함') : (journal ? T('쓰는 중') : T('아직')), go: 'write', dot: !submitted },
      { label: T('목원'), value: T('{0}명', mokwon.filter(function (w) { return w.active !== false; }).length), go: 'members' },
      { label: T('지난 일기'), go: 'past' }
    ].concat(n ? [{ label: T('목사님 공지'), fn: function () { C.showNotice(n, true); }, dot: true }] : []));
  }
  function showNoticeBar() {
    var n = ((me.church || {}).features || {}).notice, pane = $('#pane-write'); if (!pane) return;
    var old = $('#notice-bar'); if (old) old.remove();
    if (!C.noticeLive(n)) return;
    var b = document.createElement('button'); b.type = 'button'; b.id = 'notice-bar'; b.className = 'notice-bar noprint';
    b.innerHTML = '<b>' + esc(T('공지')) + '</b><span>' + esc(n.title || '') + '</span>';
    b.addEventListener('click', function () { C.showNotice(n, true); });
    pane.insertBefore(b, pane.firstChild);
    C.showNotice(n);
  }

  function defaultMetOn() {
    // 그 주 금요일을 기본값으로 (주일부터 세어 5일째 — 가정교회 목장 모임이 대개 주말 저녁)
    var d = new Date(week + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + 5);
    return C.ymd(d);
  }
  // 그 주 일기 — 예전(월요일 시작)에 저장된 것도 찾아서 주일 기준으로 옮겨 둔다
  async function findJournal(w, cols) {
    var r = await sb.from('church_journal').select(cols).eq('mokjang_id', mokjang.id).in('week_start', C.weekKeys(w));
    if (r.error) return r;
    var rows = r.data || [], j = rows.find(function (x) { return x.week_start === w; }) || rows[0] || null;
    if (j && j.week_start !== w) {
      await sb.from('church_journal').update({ week_start: w }).eq('id', j.id);
      j.week_start = w;
    }
    return { data: j, error: null };
  }

  /* 저장된 기도제목 + 현재 명단을 합쳐서 줄을 만든다 */
  function rows() {
    var out = [], seen = {};
    prayers.forEach(function (p) {
      out.push({ id: p.id, mokwon_id: p.mokwon_id, name: p.name, attended: p.attended, content: p.content, answered: p.answered });
      if (p.mokwon_id) seen[p.mokwon_id] = true;
    });
    mokwon.filter(function (m) { return m.active && !seen[m.id]; }).forEach(function (m) {
      out.push({ id: null, mokwon_id: m.id, name: m.name, attended: true, content: '', answered: false });
    });
    return out;
  }

  /* 화면에 쳐 넣던 글을 잃지 않게, 다시 그리기 전에 먼저 거둬들인다 */
  function syncFromDom() {
    if (!rendered) return;
    $$('#members-box .member').forEach(function (el) {
      var i = +el.dataset.i; if (!rendered[i]) return;
      rendered[i].attended = $('.f-att', el).checked;
      rendered[i].answered = $('.f-ans', el).checked;
      rendered[i].content = $('.f-con', el).value;
    });
  }

  function renderMembers() {
    syncFromDom();
    var prev = {};
    (rendered || []).forEach(function (p) { if (p.mokwon_id) prev[p.mokwon_id] = p; });
    var list = rows();
    list.forEach(function (p) {
      var q = p.mokwon_id ? prev[p.mokwon_id] : null;
      if (!q) return;
      p.attended = q.attended; p.answered = q.answered;
      if (q.content) p.content = q.content;
    });
    rendered = list;
    var box = $('#members-box');
    $('#no-members').style.display = list.length ? 'none' : 'block';
    box.innerHTML = list.map(function (p, i) {
      var tag = (mokwon.find(function (m) { return m.id === p.mokwon_id; }) || {}).tag;
      return '<div class="member" data-i="' + i + '">' +
        '<div class="head"><span class="name">' + esc(p.name) + '</span>' +
        (tag ? '<span class="badge gold">' + esc(tag) + '</span>' : '') +
        '<span class="spacer"></span>' +
        '<label class="check"><input type="checkbox" class="f-att"' + (p.attended ? ' checked' : '') + T('> 참석</label>') +
        '<label class="check"><input type="checkbox" class="f-ans"' + (p.answered ? ' checked' : '') + T('> 응답됨</label>') +
        '</div>' +
        '<textarea class="f-con" placeholder="' + esc(T('{0} 님의 기도제목', p.name)) + '">' + esc(p.content) + '</textarea>' +
        '</div>';
    }).join('');
    $$('#members-box textarea').forEach(grow);
    renderChips();
  }

  // 목원 이름 줄: 누가 아직 기도제목을 안 적었는지 한눈에 (누르면 그 칸으로)
  function renderChips() {
    var box = $('#members-chips'); if (!box) return;
    var els = $$('#members-box .member');
    if (!els.length) { box.innerHTML = ''; return; }
    var done = 0;
    box.innerHTML = '<div class="chips-head">' + T('기도제목 적은 사람') + ' <b class="chips-count"></b></div><div class="chips">' +
      els.map(function (el, i) {
        var ok = !!$('.f-con', el).value.trim(); if (ok) done++;
        return '<button type="button" class="chip' + (ok ? ' done' : '') + '" data-i="' + i + '">' + esc($('.name', el).textContent) + '</button>';
      }).join('') + '</div>';
    $('.chips-count', box).textContent = done + ' / ' + els.length;
  }
  function bindChips() {
    var box = $('#members-chips'); if (!box) return;
    box.addEventListener('click', function (e) {
      var c = e.target.closest('.chip'); if (!c) return;
      var el = $$('#members-box .member')[+c.dataset.i]; if (!el) return;
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      setTimeout(function () { $('.f-con', el).focus({ preventScroll: true }); }, 300);
    });
    $('#members-box').addEventListener('input', function (e) {
      if (!e.target.classList.contains('f-con')) return;
      var el = e.target.closest('.member'), i = $$('#members-box .member').indexOf(el);
      var c = $('#members-chips .chip[data-i="' + i + '"]'); if (!c) return renderChips();
      var was = c.classList.contains('done'), now = !!e.target.value.trim();
      if (was !== now) renderChips();
    });
  }

  function grow(t) {
    var fit = function () { t.style.height = 'auto'; t.style.height = (t.scrollHeight + 4) + 'px'; };
    t.addEventListener('input', fit); setTimeout(fit, 0);
  }

  function collect() {
    syncFromDom();
    return (rendered || []).map(function (p) {
      return { id: p.id, mokwon_id: p.mokwon_id, name: p.name,
               attended: p.attended, answered: p.answered, content: (p.content || '').trim() };
    });
  }

  /* ── 저장 ──────────────────────────────────────── */
  function bindWrite() {
    ['#met-on', '#present', '#body', '#mprayer'].forEach(function (s) {
      $(s).addEventListener('input', markDirty);
    });
    $('#members-box').addEventListener('input', markDirty);
    $('#members-box').addEventListener('change', markDirty);
    $('#members-box').addEventListener('change', function (e) {   // 응답됨에 체크하면 하트가 떨어진다
      if (e.target.classList.contains('f-ans') && e.target.checked) C.hearts(T('기도 응답, 함께 감사해요'));
    });
    $('#btn-save').addEventListener('click', function () { save('draft'); });
    $('#btn-submit').addEventListener('click', function () { save('submitted'); });
    $('#btn-all-present').addEventListener('click', function () {
      $$('#members-box .f-att').forEach(function (c) { c.checked = true; }); markDirty();
    });
    $('#btn-copy-last').addEventListener('click', copyLast);
    bindChips();
    grow($('#body')); grow($('#mprayer'));
  }

  async function save(status) {
    var bs = $('#btn-save'), bu = $('#btn-submit');
    bs.disabled = bu.disabled = true;
    try {
      var list = collect();
      var payload = {
        mokjang_id: mokjang.id, week_start: week,
        met_on: $('#met-on').value || null,
        present_count: $('#present').value === '' ? null : +$('#present').value,
        total_count: mokwon.filter(function (m) { return m.active; }).length,
        body: $('#body').value.trim(),
        mokjang_prayer: $('#mprayer').value.trim(),
        status: status, author_id: me.id
      };
      if (status === 'submitted') payload.submitted_at = new Date().toISOString();

      if (journal) {
        var u = await sb.from('church_journal').update(payload).eq('id', journal.id).select().single();
        if (u.error) throw new Error(u.error.message);
        journal = u.data;
      } else {
        var c = await sb.from('church_journal').insert(payload).select().single();
        if (c.error) throw new Error(c.error.message);
        journal = c.data;
      }

      var adds = [], ups = [];
      list.forEach(function (p, i) {
        var base = { mokwon_id: p.mokwon_id, name: p.name, attended: p.attended, content: p.content, answered: p.answered, sort_order: i };
        if (p.id) ups.push(Object.assign({ id: p.id, journal_id: journal.id }, base));
        else adds.push(Object.assign({ journal_id: journal.id }, base));
      });
      if (adds.length) {
        var ai = await sb.from('church_prayer').insert(adds);
        if (ai.error) throw new Error(ai.error.message);
      }
      for (var k = 0; k < ups.length; k++) {
        var one = ups[k], id = one.id; delete one.id;
        var uu = await sb.from('church_prayer').update(one).eq('id', id);
        if (uu.error) throw new Error(uu.error.message);
      }

      var pr = await sb.from('church_prayer').select('*').eq('journal_id', journal.id).order('sort_order');
      prayers = pr.data || [];
      // 방금 새로 넣은 줄의 id를 화면 상태에 되돌려 적는다.
      // (이게 없으면 다음 저장 때 같은 기도제목을 또 넣어 중복이 쌓였다)
      var idOf = {};
      prayers.forEach(function (p) { if (p.mokwon_id) idOf[p.mokwon_id] = p.id; });
      (rendered || []).forEach(function (row) { if (!row.id && row.mokwon_id && idOf[row.mokwon_id]) row.id = idOf[row.mokwon_id]; });
      dirty = false; dropDraft();
      // 제출이면 목사님 휴대전화로 알림 (실패해도 제출은 이미 끝났다)
      if (status === 'submitted') C.notify({ action: 'submitted', journal_id: journal.id }).catch(function () {});
      $('#wk-state').textContent = status === 'submitted' ? T('제출함') : T('임시 저장됨');
      $('#wk-state').className = 'badge ' + (status === 'submitted' ? 'done' : 'todo');
      $('#save-state').textContent = T('마지막 저장 ') + C.whenText(journal.updated_at);
      C.say($('#msg-write'), status === 'submitted'
        ? T('목사님께 전달했습니다. 제출한 뒤에도 고치실 수 있습니다.')
        : T('저장했습니다. 나중에 이어서 쓰셔도 됩니다.'), 'ok');
    } catch (err) {
      if (await lostLogin(err)) askRelogin();
      else C.say($('#msg-write'), T('저장하지 못했습니다: ') + err.message, 'err');
    }
    bs.disabled = bu.disabled = false;
  }

  async function copyLast() {
    var prev = C.addWeeks(week, -1);
    var j = await findJournal(prev, 'id, week_start');
    if (!j.data) return C.say($('#msg-write'), T('지난주에 쓰신 일기가 없습니다.'), 'err');
    var pr = await sb.from('church_prayer').select('*').eq('journal_id', j.data.id);
    var by = {}; (pr.data || []).forEach(function (p) { if (p.mokwon_id) by[p.mokwon_id] = p.content; });
    var n = 0;
    $$('#members-box .member').forEach(function (el) {
      var i = +el.dataset.i, ta = $('.f-con', el);
      var row = (rendered || [])[i]; if (!row) return;
      if (!ta.value.trim() && by[row.mokwon_id]) { ta.value = by[row.mokwon_id]; ta.dispatchEvent(new Event('input')); n++; }
    });
    markDirty();
    C.say($('#msg-write'), n ? T('{0}명의 지난주 기도제목을 가져왔습니다. 바뀐 부분만 고쳐 주세요.', n) : T('가져올 내용이 없습니다.'), n ? 'ok' : 'err');
  }

  /* ── 지난 일기 ─────────────────────────────────── */
  async function loadPast() {
    var box = $('#past-list');
    box.innerHTML = T('<p class="empty">불러오는 중…</p>');
    var r = await sb.from('church_journal').select('*')
      .eq('mokjang_id', mokjang.id).order('week_start', { ascending: false }).limit(60);
    var js = r.data || [];
    if (!js.length) { box.innerHTML = T('<p class="empty">아직 쓴 일기가 없습니다.</p>'); return; }
    box.innerHTML = js.map(function (j) {
      return '<details data-id="' + j.id + '" style="border:1px solid var(--line); border-radius:12px; padding:12px 14px; margin:10px 0; background:#fff">' +
        '<summary style="cursor:pointer; font-weight:700">' + esc(C.weekLabel(j.week_start)) +
        ' <span class="badge ' + (j.status === 'submitted' ? 'done' : 'todo') + '">' +
        (j.status === 'submitted' ? T('제출함') : T('임시')) + '</span></summary>' +
        T('<div class="detail quiet" style="margin-top:10px">펼치는 중…</div></details>');
    }).join('');
    $$('#past-list details').forEach(function (d) {
      d.addEventListener('toggle', function () {
        if (d.open && !d.dataset.loaded) { d.dataset.loaded = '1'; fillPast(d); }
      });
    });
  }

  async function fillPast(d) {
    var id = d.dataset.id;
    var j = (await sb.from('church_journal').select('*').eq('id', id).single()).data;
    var ps = (await sb.from('church_prayer').select('*').eq('journal_id', id).order('sort_order')).data || [];
    var cs = (await sb.from('church_comment').select('*').eq('journal_id', id).order('created_at')).data || [];
    $('.detail', d).innerHTML = renderJournal(j, ps, cs, await C.authorPhotos(cs));
  }

  function renderJournal(j, ps, cs, urls) {
    var h = '';
    if (j.met_on) h += T('<p class="quiet" style="margin:0 0 10px">모인 날 ') + esc(j.met_on) +
      (j.present_count != null ? ' · ' + T('{0}명', j.present_count) : '') + '</p>';
    if (ps.length) {
      h += T('<div class="section-title">목원별 기도제목</div>');
      h += C.prayerList(ps);
    }
    if (j.body) h += T('<div class="section-title">목장 이야기</div><div class="prose">') + C.proseHtml(j.body) + '</div>';
    if (j.mokjang_prayer) h += T('<div class="section-title">목장 전체 기도제목</div><div class="prose">') + C.proseHtml(j.mokjang_prayer) + '</div>';
    h += T('<div class="section-title">목사님 말씀</div>');
    h += cs.length ? cs.map(function (c) {
      return '<div class="member" style="background:var(--brand-soft); border-color:#cfe0d5">' +
        C.commentHead(c, urls) + '</div>' +
        '<div class="prose">' + C.proseHtml(c.body) + '</div></div>';
    }).join('') : T('<p class="quiet">아직 없습니다.</p>');
    return h;
  }

  /* ── 내 계정 ───────────────────────────────────── */
  function bindMine() {
    $('#form-mokjang').addEventListener('submit', async function (e) {
      e.preventDefault();
      var r = await sb.from('church_mokjang')
        .update({ name: $('#mj-name').value.trim(), meet_day: $('#mj-day').value.trim() })
        .eq('id', mokjang.id).select().single();
      if (r.error) return C.say($('#msg-mokjang'), r.error.message, 'err');
      mokjang = r.data;
      $('.top h1').textContent = mokjang.name;
      C.say($('#msg-mokjang'), T('저장했습니다.'), 'ok');
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
      await sb.from('church_mokjang').update({ mokja_name: nm }).eq('id', mokjang.id);
      C.say($('#msg-myname'), T('이름을 바꿨습니다.'), 'ok');
    });

    $('#form-pw').addEventListener('submit', async function (e) {
      e.preventDefault();
      var a = $('#pw1').value, b = $('#pw2').value;
      if (a.length < 8) return C.say($('#msg-pw'), T('비밀번호는 8자 이상으로 정해 주세요.'), 'err');
      if (a !== b) return C.say($('#msg-pw'), T('두 번 넣으신 비밀번호가 서로 다릅니다.'), 'err');
      var r = await sb.auth.updateUser({ password: a });
      if (r.error) return C.say($('#msg-pw'), r.error.message, 'err');
      $('#pw1').value = $('#pw2').value = '';
      C.say($('#msg-pw'), T('비밀번호를 바꿨습니다.'), 'ok');
    });

    $('#form-leave').addEventListener('submit', async function (e) {
      e.preventDefault();
      if (!confirm(T('정말 탈퇴할까요? 되돌릴 수 없습니다.'))) return;
      var b = $('#btn-leave'); b.disabled = true;
      try {
        await C.checkPassword(me.login_id, $('#leave-pw').value);
        await C.callAdmin({ action: 'delete_me' });
        await C.afterLeave();
      } catch (err) { C.say($('#msg-leave'), err.message, 'err'); b.disabled = false; }
    });
  }
})();
