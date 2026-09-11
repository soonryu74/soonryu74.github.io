/* 목사 화면 — 모든 목장을 본다 */
(function () {
  var C = window.CHURCH, sb = C.sb, $ = C.$, $$ = C.$$, esc = C.esc;
  var me = null, week = C.mondayOf(), mokjangs = [];

  (async function start() {
    me = await C.guard('pastor');
    if (!me) return;
    C.header(me, '목장 나눔터');
    bindTabs(); bindWeek(); bindManage();
    await loadMokjangs();
    await loadWeek();
  })();

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

    $('#manage-list').addEventListener('click', onManageClick);
  }

  async function renderManage() {
    var profs = (await sb.from('church_profile').select('id, login_id, name, role')).data || [];
    var byId = {}; profs.forEach(function (p) { byId[p.id] = p; });
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
      }
      await loadMokjangs(); renderManage(); loadWeek();
    } catch (err) {
      C.say($('#msg-manage'), err.message, 'err');
    }
  }
})();
