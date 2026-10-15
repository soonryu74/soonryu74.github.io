/* 목사 화면 — 모든 목장을 본다 */
(function () {
  var C = window.CHURCH, sb = C.sb, $ = C.$, $$ = C.$$, esc = C.esc;
  var me = null, week = C.mondayOf(), mokjangs = [];

  (async function start() {
    me = await C.guard('pastor');
    if (!me) return;
    week = C.mondayOf();                 // 교회 시간대가 정해진 뒤 다시 센다
    C.header(me, '목장 나눔터');
    bindTabs(); bindWeek(); bindManage(); bindNotify(); bindChurch();
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
      try { await C.pushDisable(); C.say($('#msg-notify'), '이 기기 알림을 껐습니다.', 'ok'); }
      catch (e) { C.say($('#msg-notify'), e.message, 'err'); }
      showNotify();
    });
    $('#notify-test').addEventListener('click', async function () {
      var b = $('#notify-test'); b.disabled = true;
      try {
        var r = await C.notify({ action: 'test' });
        C.say($('#msg-notify'), r.sent ? '시험 알림을 보냈습니다. 몇 초 안에 와야 합니다.'
          : '알림을 받을 기기가 없습니다. 먼저 [이 기기에서 알림 받기]를 눌러 주세요.', r.sent ? 'ok' : 'err', true);
      } catch (e) { C.say($('#msg-notify'), e.message, 'err'); }
      b.disabled = false;
    });
    showNotify();
  }

  async function turnOn(msgEl) {
    try {
      await C.pushEnable();
      C.say(msgEl, '알림을 켰습니다. 목자가 일기를 제출하면 이 기기로 알려 드립니다.', 'ok', true);
    } catch (e) { C.say(msgEl, e.message, 'err'); }
    showNotify();
  }

  async function showNotify() {
    var st = 'unsupported';
    try { st = await C.pushState(); } catch (e) {}
    var label = { on: '이 기기에서 받는 중', off: '꺼져 있음', denied: '브라우저에서 막혀 있음',
                  'ios-home': '홈 화면에 추가해야 함', unsupported: '이 브라우저는 알림을 못 받음' }[st];
    var help = {
      on: '다른 휴대전화나 컴퓨터에서도 받으시려면 그 기기에서 한 번 더 켜 주세요.',
      off: '',
      denied: '주소창 왼쪽 자물쇠(또는 설정 → 사이트 설정 → 알림)에서 이 사이트 알림을 허용으로 바꿔 주세요.',
      'ios-home': '아이폰은 사파리 아래쪽 공유 단추 → [홈 화면에 추가]를 하신 뒤, 홈 화면의 아이콘으로 열어서 켜 주세요.',
      unsupported: '안드로이드는 크롬, 아이폰은 사파리(홈 화면에 추가)에서 받을 수 있습니다.'
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
    $('#ch-name').value = c.name || '';
    C.fillTimezones($('#ch-tz'), c.timezone);
    $('#ch-link').value = c.slug ? C.churchLink(c) : '';
    $('#ch-copy').addEventListener('click', async function () {
      var v = $('#ch-link').value;
      try { await navigator.clipboard.writeText(v); C.say($('#msg-church'), '주소를 복사했습니다.', 'ok'); }
      catch (e) { $('#ch-link').select(); C.say($('#msg-church'), '주소를 길게 눌러 복사해 주세요.', 'ok'); }
    });
    $('#form-church').addEventListener('submit', async function (e) {
      e.preventDefault();
      var r = await sb.from('church_church')
        .update({ name: $('#ch-name').value.trim(), timezone: $('#ch-tz').value })
        .eq('id', c.id).select().single();
      if (r.error) return C.say($('#msg-church'), r.error.message, 'err');
      c = r.data; C.setTimezone(c.timezone); C.rememberChurch(c);
      $('.top .church').textContent = c.name;
      C.say($('#msg-church'), '저장했습니다.', 'ok');
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
    if (r.error) { alert('불러오지 못했습니다: ' + r.error.message); return; }
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
    $('#week-list').innerHTML = '<p class="empty">불러오는 중…</p>';
    var data = await fetchWeek();
    var live = mokjangs.filter(function (m) { return m.active; });
    var done = live.filter(function (m) { return data[m.id] && data[m.id].j.status === 'submitted'; }).length;
    var wrote = live.filter(function (m) { return data[m.id]; }).length;

    $('#stat').innerHTML =
      '<div><b>' + live.length + '</b><span>목장</span></div>' +
      '<div><b>' + done + '</b><span>제출함</span></div>' +
      '<div><b>' + (live.length - done) + '</b><span>아직</span></div>' +
      '<div><b>' + (wrote - done) + '</b><span>쓰는 중</span></div>';

    if (!live.length) {
      $('#week-list').innerHTML = '<div class="card"><p class="empty">아직 목장이 없습니다. <b>목장·목자 관리</b>에서 목자 계정을 만들어 주세요.</p></div>';
      return;
    }

    $('#week-list').innerHTML = live.map(function (m) {
      var d = data[m.id];
      var state = !d ? '<span class="badge todo">아직 안 씀</span>'
        : d.j.status === 'submitted' ? '<span class="badge done">제출함</span>'
        : '<span class="badge">쓰는 중</span>';
      var reply = d && d.cs.length ? '<span class="badge gold">답글 ' + d.cs.length + '</span>' : '';
      return '<details class="mj" data-mj="' + m.id + '"' + (d ? '' : ' data-empty="1"') + '>' +
        '<summary>' + esc(m.name) + ' ' + state + ' ' + reply +
        '<span class="spacer"></span><span class="quiet" style="font-weight:400; font-size:14px">' +
        esc(m.mokja_name || '') + '</span></summary>' +
        '<div>' + (d ? detailHtml(m, d) : '<p class="quiet">이번 주 일기가 아직 없습니다.</p>') + '</div>' +
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
      (j.met_on ? '모인 날 ' + esc(j.met_on) : '모인 날 미기재') +
      (j.present_count != null ? ' · ' + j.present_count + '명 참석' : '') +
      (j.submitted_at ? ' · 제출 ' + C.whenText(j.submitted_at) : '') + '</p>';

    if (d.ps.length) {
      h += '<div class="section-title">목원별 기도제목</div>';
      h += d.ps.map(function (p) {
        return '<div class="member"><div class="head"><span class="name">' + esc(p.name) + '</span>' +
          (p.attended ? '' : '<span class="badge">결석</span>') +
          (p.answered ? '<span class="badge done">응답됨</span>' : '') + '</div>' +
          '<div class="prose">' + (p.content ? esc(p.content) : '<span class="quiet">(적지 않음)</span>') + '</div></div>';
      }).join('');
    }
    if (j.body) h += '<div class="section-title">목장 이야기</div><div class="prose">' + esc(j.body) + '</div>';
    if (j.mokjang_prayer) h += '<div class="section-title">목장 전체 기도제목</div><div class="prose">' + esc(j.mokjang_prayer) + '</div>';

    h += '<div class="section-title">목사님 말씀</div>';
    h += d.cs.map(function (c) {
      return '<div class="member" style="background:var(--brand-soft); border-color:#cfe0d5">' +
        '<div class="head"><span class="name">' + esc(c.author_name) + '</span>' +
        '<span class="quiet" style="font-size:13px">' + C.whenText(c.created_at) + '</span>' +
        (c.author_id === me.id ? '<span class="spacer"></span><button class="small danger del-cmt" data-id="' + c.id + '">지우기</button>' : '') +
        '</div><div class="prose">' + esc(c.body) + '</div></div>';
    }).join('');

    h += '<form class="cmt noprint" data-j="' + j.id + '" style="margin-top:10px">' +
      '<textarea name="b" placeholder="목자에게 남길 말씀을 적어 주세요" required></textarea>' +
      '<div class="row end" style="margin-top:8px"><button class="primary small" type="submit">남기기</button></div></form>';
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
    if (r.error) return alert('남기지 못했습니다: ' + r.error.message);
    form.b.value = '';
    var open = $$('#week-list .mj').filter(function (d) { return d.open; }).map(function (d) { return d.dataset.mj; });
    await loadWeek();
    open.forEach(function (id) { var d = $('#week-list .mj[data-mj="' + id + '"]'); if (d) d.open = true; });
  }

  document.addEventListener('click', async function (e) {
    var b = e.target.closest('.del-cmt'); if (!b) return;
    if (!confirm('이 말씀을 지울까요?')) return;
    await sb.from('church_comment').delete().eq('id', b.dataset.id);
    loadWeek();
  });

  /* ── 기도제목 모아보기 ─────────────────────────── */
  async function loadGather() {
    $('#g-label').textContent = C.weekLabel(week);
    $('#g-print-head').innerHTML = '<h2 style="margin:0">목장 기도제목 — ' + esc(C.weekLabel(week)) + '</h2>';
    $('#gather-list').innerHTML = '<p class="empty">불러오는 중…</p>';
    var data = await fetchWeek();
    var only = $('#g-only').checked;
    var live = mokjangs.filter(function (m) { return m.active && data[m.id]; });
    if (!live.length) {
      $('#gather-list').innerHTML = '<div class="card"><p class="empty">이 주에 올라온 일기가 없습니다.</p></div>';
      return;
    }
    $('#gather-list').innerHTML = live.map(function (m) {
      var d = data[m.id], j = d.j, h = '';
      h += '<div class="card"><h2>' + esc(m.name) +
        (j.status === 'submitted' ? '' : ' <span class="badge todo">임시</span>') + '</h2>' +
        '<p class="desc">' + esc(m.mokja_name || '') +
        (j.present_count != null ? ' · ' + j.present_count + '명 참석' : '') + '</p>';
      var withText = d.ps.filter(function (p) { return p.content; });
      if (withText.length) {
        h += '<ul style="margin:0 0 12px; padding-left:20px">' + withText.map(function (p) {
          return '<li style="margin:6px 0"><b>' + esc(p.name) + '</b> — ' + esc(p.content) +
            (p.answered ? ' <span class="badge done">응답됨</span>' : '') + '</li>';
        }).join('') + '</ul>';
      } else {
        h += '<p class="quiet">적힌 목원 기도제목이 없습니다.</p>';
      }
      if (j.mokjang_prayer) {
        h += '<div class="section-title" style="margin-top:8px">목장 전체</div>' +
          '<div class="prose">' + esc(j.mokjang_prayer) + '</div>';
      }
      if (!only && j.body) {
        h += '<div class="section-title">목장 이야기</div><div class="prose">' + esc(j.body) + '</div>';
      }
      return h + '</div>';
    }).join('');
  }

  /* ── 관리 ──────────────────────────────────────── */
  function bindManage() {
    $('#form-new').addEventListener('submit', async function (e) {
      e.preventDefault();
      var b = $('#btn-new'); b.disabled = true; b.textContent = '만드는 중…';
      try {
        await C.callAdmin({
          action: 'create_mokja',
          login_id: $('#n-id').value, password: $('#n-pw').value,
          name: $('#n-name').value, mokjang_name: $('#n-mj').value, meet_day: $('#n-day').value
        });
        C.say($('#msg-new'), $('#n-name').value + ' 목자 계정을 만들었습니다. 아이디 ' +
          $('#n-id').value.trim().toLowerCase() + ' · 비밀번호 ' + $('#n-pw').value + ' 를 알려 주세요.', 'ok', true);
        $('#form-new').reset();
        await loadMokjangs(); renderManage(); loadWeek();
      } catch (err) {
        C.say($('#msg-new'), err.message, 'err');
      }
      b.disabled = false; b.textContent = '계정 만들기';
    });


    $('#my-name').value = me.name || '';
    $('#form-myname').addEventListener('submit', async function (e) {
      e.preventDefault();
      var nm = $('#my-name').value.trim();
      if (!nm) return C.say($('#msg-myname'), '이름을 적어 주세요.', 'err');
      var r = await sb.from('church_profile').update({ name: nm }).eq('id', me.id).select().single();
      if (r.error) return C.say($('#msg-myname'), r.error.message, 'err');
      me.name = r.data.name;
      $('.top .who span').textContent = C.title2(me);
      C.say($('#msg-myname'), '이름을 바꿨습니다.', 'ok');
    });

    $('#form-pw').addEventListener('submit', async function (e) {
      e.preventDefault();
      var a = $('#pw1').value, b2 = $('#pw2').value;
      if (a.length < 8) return C.say($('#msg-pw'), '비밀번호는 8자 이상으로 정해 주세요.', 'err');
      if (a !== b2) return C.say($('#msg-pw'), '두 번 넣으신 비밀번호가 서로 다릅니다.', 'err');
      var r = await sb.auth.updateUser({ password: a });
      if (r.error) return C.say($('#msg-pw'), r.error.message, 'err');
      $('#pw1').value = $('#pw2').value = '';
      C.say($('#msg-pw'), '비밀번호를 바꿨습니다.', 'ok');
    });

    $('#form-pastor').addEventListener('submit', async function (e) {
      e.preventDefault();
      var b = $('#btn-pastor'); b.disabled = true; b.textContent = '만드는 중…';
      try {
        await C.callAdmin({
          action: 'create_pastor',
          login_id: $('#p-id').value, password: $('#p-pw').value, name: $('#p-name').value
        });
        C.say($('#msg-pastor'), $('#p-name').value + ' 목사 계정을 만들었습니다. 아이디 ' +
          $('#p-id').value.trim().toLowerCase() + ' · 비밀번호 ' + $('#p-pw').value + ' 를 알려 주세요.', 'ok', true);
        $('#form-pastor').reset();
        renderManage();
      } catch (err) {
        C.say($('#msg-pastor'), err.message, 'err');
      }
      b.disabled = false; b.textContent = '목사 계정 만들기';
    });

    $('#manage-list').addEventListener('click', onManageClick);
    $('#pastor-list').addEventListener('click', onPastorClick);
  }

  async function onPastorClick(e) {
    var btn = e.target.closest('button'); if (!btn) return;
    var item = e.target.closest('.list-item'), uid = item.dataset.uid, nm = item.dataset.name;
    try {
      if (btn.classList.contains('act-pw')) {
        var np = prompt('새 비밀번호를 정해 주세요 (8자 이상).');
        if (np === null) return;
        await C.callAdmin({ action: 'reset_password', user_id: uid, password: np });
        C.say($('#msg-pastor'), nm + ' 목사의 새 비밀번호는 ' + np + ' 입니다.', 'ok', true);
        return;
      }
      if (btn.classList.contains('act-del')) {
        if (!confirm(nm + ' 목사 계정을 지울까요?')) return;
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
        (mine ? ' <span class="badge done">지금 나</span>' : '') + '</div>' +
        '<div class="s">아이디 ' + esc(p.login_id || '') + '</div></div>' +
        (mine ? '' : '<button class="small act-pw">비밀번호 새로</button>') +
        (mine || pastors.length <= 1 ? '' : '<button class="small danger act-del">계정 삭제</button>') +
        '</div>';
    }).join('');

    var box = $('#manage-list');
    if (!mokjangs.length) { box.innerHTML = '<p class="empty">아직 목장이 없습니다.</p>'; return; }
    box.innerHTML = mokjangs.map(function (m) {
      var p = m.mokja_id ? byId[m.mokja_id] : null;
      return '<div class="list-item" data-mj="' + m.id + '" data-uid="' + (m.mokja_id || '') + '">' +
        '<div class="grow"><div class="t">' + esc(m.name) + (m.active ? '' : ' <span class="badge">쉼</span>') + '</div>' +
        '<div class="s">' + esc(m.mokja_name || '담당 목자 없음') +
        (p ? ' · 아이디 ' + esc(p.login_id) : '') +
        (m.meet_day ? ' · ' + esc(m.meet_day) : '') + '</div></div>' +
        (m.mokja_id ? '<button class="small act-pw">비밀번호 새로</button>' : '') +
        '<button class="small act-rename">이름 고치기</button>' +
        '<button class="small act-hide">' + (m.active ? '잠시 쉼으로' : '다시 활동') + '</button>' +
        (m.mokja_id ? '<button class="small danger act-del">계정 삭제</button>' : '') +
        '<button class="small danger act-drop">목장 지우기</button>' +
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
        var np = prompt('새 비밀번호를 정해 주세요 (8자 이상).\n정하신 뒤 목자에게 알려 주세요.');
        if (np === null) return;
        await C.callAdmin({ action: 'reset_password', user_id: uid, password: np });
        C.say($('#msg-manage'), m.mokja_name + ' 목자의 새 비밀번호는 ' + np + ' 입니다.', 'ok', true);
        return;
      }
      if (btn.classList.contains('act-rename')) {
        var nn = prompt('목장 이름', m.name); if (nn === null) return;
        var nd = prompt('모이는 요일 (비워도 됩니다)', m.meet_day || ''); if (nd === null) nd = m.meet_day;
        await sb.from('church_mokjang').update({ name: nn.trim(), meet_day: (nd || '').trim() }).eq('id', mjId);
      } else if (btn.classList.contains('act-hide')) {
        await sb.from('church_mokjang').update({ active: !m.active }).eq('id', mjId);
      } else if (btn.classList.contains('act-del')) {
        if (!confirm(m.mokja_name + ' 목자의 계정을 지울까요?\n지금까지 쓴 일기와 기도제목은 그대로 남습니다.')) return;
        await C.callAdmin({ action: 'delete_user', user_id: uid });
        await sb.from('church_mokjang').update({ mokja_name: m.mokja_name + ' (지난 목자)' }).eq('id', mjId);
      } else if (btn.classList.contains('act-drop')) {
        if (!confirm(m.name + ' 을(를) 통째로 지울까요?\n\n이 목장의 목원 명단과 지금까지의 일기·기도제목이 모두 함께 사라지고, 되돌릴 수 없습니다.\n(시험 삼아 만든 목장을 치울 때 쓰세요.)')) return;
        if (uid && !confirm('담당 목자 ' + m.mokja_name + ' 의 계정도 함께 지울까요?\n[확인]을 누르면 계정까지 지웁니다. [취소]를 누르면 목장만 지웁니다.')) {
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
