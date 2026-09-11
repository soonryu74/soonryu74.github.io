/* 목자 화면 — 내 목장 하나만 다룬다 */
(function () {
  var C = window.CHURCH, sb = C.sb, $ = C.$, $$ = C.$$, esc = C.esc;
  var me = null, mokjang = null, mokwon = [], week = C.mondayOf(), journal = null, prayers = [], dirty = false;
  var rendered = null;  // 지금 화면에 그려져 있는 기도제목 줄

  /* ── 시작 ──────────────────────────────────────── */
  (async function start() {
    me = await C.guard('mokja');
    if (!me) return;

    var r = await sb.from('church_mokjang').select('*').order('sort_order').limit(1);
    if (r.error) return fail(r.error.message);
    mokjang = (r.data || [])[0];
    if (!mokjang) {
      C.header(me, '목장 나눔터');
      $('.wrap').innerHTML =
        '<div class="card"><h2>아직 목장이 배정되지 않았습니다</h2>' +
        '<p class="desc">목사님께서 목장을 만들어 주시면 이 화면에 일기 쓰는 곳이 열립니다.</p>' +
        '<button id="o">로그아웃</button></div>';
      $('#o').addEventListener('click', C.signOut);
      return;
    }
    C.header(me, mokjang.name);
    $('#mj-name').value = mokjang.name;
    $('#mj-day').value = mokjang.meet_day || '';

    bindTabs(); bindWeek(); bindWrite(); bindMembers(); bindMine();
    await loadMokwon();
    await loadWeek();
    window.addEventListener('beforeunload', function (e) {
      if (dirty) { e.preventDefault(); e.returnValue = ''; }
    });
  })();

  function fail(m) { alert('불러오지 못했습니다: ' + m); }
  function markDirty() { dirty = true; $('#save-state').textContent = '아직 저장되지 않았습니다'; }

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
    if (dirty && !confirm('저장하지 않은 내용이 있습니다. 그래도 옮기시겠습니까?')) return;
    week = w; dirty = false; await loadWeek();
  }

  /* ── 목원 명단 ─────────────────────────────────── */
  async function loadMokwon() {
    var r = await sb.from('church_mokwon').select('*')
      .eq('mokjang_id', mokjang.id).order('sort_order').order('created_at');
    if (r.error) return fail(r.error.message);
    mokwon = r.data || [];
    renderMemberList();
  }

  function renderMemberList() {
    var box = $('#member-list');
    if (!mokwon.length) { box.innerHTML = '<p class="empty">아직 목원이 없습니다. 위에 이름을 넣어 주세요.</p>'; return; }
    box.innerHTML = mokwon.map(function (m) {
      return '<div class="list-item" data-id="' + m.id + '">' +
        '<div class="grow"><div class="t">' + esc(m.name) +
        (m.tag ? ' <span class="badge gold">' + esc(m.tag) + '</span>' : '') +
        (m.active ? '' : ' <span class="badge">쉼</span>') + '</div></div>' +
        '<button class="small act-edit">이름 고치기</button>' +
        '<button class="small act-toggle">' + (m.active ? '잠시 쉼으로' : '다시 참여') + '</button>' +
        '<button class="small danger act-del">삭제</button></div>';
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
      C.say($('#msg-members'), name + ' 님을 넣었습니다.', 'ok');
    });

    $('#member-list').addEventListener('click', async function (e) {
      var btn = e.target.closest('button'); if (!btn) return;
      var id = e.target.closest('.list-item').dataset.id;
      var m = mokwon.find(function (x) { return x.id === id; });
      if (!m) return;

      if (btn.classList.contains('act-edit')) {
        var nm = prompt('이름', m.name); if (nm === null) return;
        var tg = prompt('표시 (새가족·VIP 등, 비워도 됩니다)', m.tag || ''); if (tg === null) tg = m.tag;
        await sb.from('church_mokwon').update({ name: nm.trim(), tag: (tg || '').trim() }).eq('id', id);
      } else if (btn.classList.contains('act-toggle')) {
        await sb.from('church_mokwon').update({ active: !m.active }).eq('id', id);
      } else if (btn.classList.contains('act-del')) {
        if (!confirm(m.name + ' 님을 명단에서 지울까요?\n지난 주 기록에 적힌 기도제목은 그대로 남습니다.')) return;
        await sb.from('church_mokwon').delete().eq('id', id);
      }
      await loadMokwon(); renderMembers();
    });
  }

  /* ── 한 주 불러오기 ────────────────────────────── */
  async function loadWeek() {
    $('#wk-label').textContent = C.weekLabel(week);
    $('#wk-state').textContent = '불러오는 중';
    $('#wk-state').className = 'badge';

    var r = await sb.from('church_journal').select('*')
      .eq('mokjang_id', mokjang.id).eq('week_start', week).maybeSingle();
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
    $('#wk-state').textContent = submitted ? '제출함' : (journal ? '임시 저장됨' : '아직 안 썼습니다');
    $('#wk-state').className = 'badge ' + (submitted ? 'done' : 'todo');
    $('#save-state').textContent = journal && journal.updated_at ? ('마지막 저장 ' + C.whenText(journal.updated_at)) : '';
    dirty = false;
    rendered = null;
    renderMembers();
  }

  function defaultMetOn() {
    // 그 주 금요일을 기본값으로 (가정교회 목장 모임이 대개 주중 저녁)
    var d = new Date(week + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + 4);
    return C.ymd(d);
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
        '<label class="check"><input type="checkbox" class="f-att"' + (p.attended ? ' checked' : '') + '> 참석</label>' +
        '<label class="check"><input type="checkbox" class="f-ans"' + (p.answered ? ' checked' : '') + '> 응답됨</label>' +
        '</div>' +
        '<textarea class="f-con" placeholder="' + esc(p.name) + ' 님의 기도제목">' + esc(p.content) + '</textarea>' +
        '</div>';
    }).join('');
    $$('#members-box textarea').forEach(grow);
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
    $('#btn-save').addEventListener('click', function () { save('draft'); });
    $('#btn-submit').addEventListener('click', function () { save('submitted'); });
    $('#btn-all-present').addEventListener('click', function () {
      $$('#members-box .f-att').forEach(function (c) { c.checked = true; }); markDirty();
    });
    $('#btn-copy-last').addEventListener('click', copyLast);
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
      dirty = false;
      $('#wk-state').textContent = status === 'submitted' ? '제출함' : '임시 저장됨';
      $('#wk-state').className = 'badge ' + (status === 'submitted' ? 'done' : 'todo');
      $('#save-state').textContent = '마지막 저장 ' + C.whenText(journal.updated_at);
      C.say($('#msg-write'), status === 'submitted'
        ? '목사님께 전달했습니다. 제출한 뒤에도 고치실 수 있습니다.'
        : '저장했습니다. 나중에 이어서 쓰셔도 됩니다.', 'ok');
    } catch (err) {
      C.say($('#msg-write'), '저장하지 못했습니다: ' + err.message, 'err');
    }
    bs.disabled = bu.disabled = false;
  }

  async function copyLast() {
    var prev = C.addWeeks(week, -1);
    var j = await sb.from('church_journal').select('id')
      .eq('mokjang_id', mokjang.id).eq('week_start', prev).maybeSingle();
    if (!j.data) return C.say($('#msg-write'), '지난주에 쓰신 일기가 없습니다.', 'err');
    var pr = await sb.from('church_prayer').select('*').eq('journal_id', j.data.id);
    var by = {}; (pr.data || []).forEach(function (p) { if (p.mokwon_id) by[p.mokwon_id] = p.content; });
    var n = 0;
    $$('#members-box .member').forEach(function (el) {
      var i = +el.dataset.i, ta = $('.f-con', el);
      var row = (rendered || [])[i]; if (!row) return;
      if (!ta.value.trim() && by[row.mokwon_id]) { ta.value = by[row.mokwon_id]; ta.dispatchEvent(new Event('input')); n++; }
    });
    markDirty();
    C.say($('#msg-write'), n ? (n + '명의 지난주 기도제목을 가져왔습니다. 바뀐 부분만 고쳐 주세요.') : '가져올 내용이 없습니다.', n ? 'ok' : 'err');
  }

  /* ── 지난 일기 ─────────────────────────────────── */
  async function loadPast() {
    var box = $('#past-list');
    box.innerHTML = '<p class="empty">불러오는 중…</p>';
    var r = await sb.from('church_journal').select('*')
      .eq('mokjang_id', mokjang.id).order('week_start', { ascending: false }).limit(60);
    var js = r.data || [];
    if (!js.length) { box.innerHTML = '<p class="empty">아직 쓴 일기가 없습니다.</p>'; return; }
    box.innerHTML = js.map(function (j) {
      return '<details data-id="' + j.id + '" style="border:1px solid var(--line); border-radius:12px; padding:12px 14px; margin:10px 0; background:#fff">' +
        '<summary style="cursor:pointer; font-weight:700">' + esc(C.weekLabel(j.week_start)) +
        ' <span class="badge ' + (j.status === 'submitted' ? 'done' : 'todo') + '">' +
        (j.status === 'submitted' ? '제출함' : '임시') + '</span></summary>' +
        '<div class="detail quiet" style="margin-top:10px">펼치는 중…</div></details>';
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
    $('.detail', d).innerHTML = renderJournal(j, ps, cs);
  }

  function renderJournal(j, ps, cs) {
    var h = '';
    if (j.met_on) h += '<p class="quiet" style="margin:0 0 10px">모인 날 ' + esc(j.met_on) +
      (j.present_count != null ? ' · ' + j.present_count + '명' : '') + '</p>';
    if (ps.length) {
      h += '<div class="section-title">목원별 기도제목</div>';
      h += ps.map(function (p) {
        return '<div class="member"><div class="head"><span class="name">' + esc(p.name) + '</span>' +
          (p.attended ? '' : '<span class="badge">결석</span>') +
          (p.answered ? '<span class="badge done">응답됨</span>' : '') + '</div>' +
          '<div class="prose">' + (p.content ? esc(p.content) : '<span class="quiet">(적지 않음)</span>') + '</div></div>';
      }).join('');
    }
    if (j.body) h += '<div class="section-title">목장 이야기</div><div class="prose">' + esc(j.body) + '</div>';
    if (j.mokjang_prayer) h += '<div class="section-title">목장 전체 기도제목</div><div class="prose">' + esc(j.mokjang_prayer) + '</div>';
    h += '<div class="section-title">목사님 말씀</div>';
    h += cs.length ? cs.map(function (c) {
      return '<div class="member" style="background:var(--brand-soft); border-color:#cfe0d5">' +
        '<div class="head"><span class="name">' + esc(c.author_name) + '</span>' +
        '<span class="quiet" style="font-size:13px">' + C.whenText(c.created_at) + '</span></div>' +
        '<div class="prose">' + esc(c.body) + '</div></div>';
    }).join('') : '<p class="quiet">아직 없습니다.</p>';
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
      C.say($('#msg-mokjang'), '저장했습니다.', 'ok');
    });

    $('#form-pw').addEventListener('submit', async function (e) {
      e.preventDefault();
      var a = $('#pw1').value, b = $('#pw2').value;
      if (a.length < 8) return C.say($('#msg-pw'), '비밀번호는 8자 이상으로 정해 주세요.', 'err');
      if (a !== b) return C.say($('#msg-pw'), '두 번 넣으신 비밀번호가 서로 다릅니다.', 'err');
      var r = await sb.auth.updateUser({ password: a });
      if (r.error) return C.say($('#msg-pw'), r.error.message, 'err');
      $('#pw1').value = $('#pw2').value = '';
      C.say($('#msg-pw'), '비밀번호를 바꿨습니다.', 'ok');
    });
  }
})();
