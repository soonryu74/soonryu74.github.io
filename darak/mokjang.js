/* 목자 화면 — 내 목장 하나만 다룬다 */
(function () {
  var C = window.CHURCH, sb = C.sb, $ = C.$, $$ = C.$$, esc = C.esc, T = C.t;
  var me = null, mokjang = null, mokwon = [], week = C.mondayOf(), journal = null, prayers = [], dirty = false;
  var rendered = null;  // 지금 화면에 그려져 있는 기도제목 줄
  var solo = false;     // 목사님 없이 나 혼자 쓰는 목장 (다락방 앱에서 코드 없이 시작한 경우)

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
    solo = C.has('solo');
    if (C.isKeyless(me)) {   // 비밀번호 없이 쓰는 목자: 비밀번호 칸 대신 열쇠 코드
      $('#pw-card').hidden = true; $('#key-card').hidden = false;
      $('#leave-pw-box').hidden = true; $('#leave-pw').required = false;
    }
    if (solo) {   // 제출할 목사님이 없으니 '저장'만, 대신 [내 계정]에 '우리 교회에 연결하기'
      $('#btn-submit').hidden = true;
      $('#btn-save').textContent = T('저장'); $('#btn-save').classList.add('primary');
      $('#link-card').hidden = false;
      $('#leave-desc').textContent = T('내 계정과 목장, 목원 명단, 지금까지 쓴 일기가 모두 지워집니다. 되돌릴 수 없습니다.');
    }
    $('#mj-name').value = mokjang.name;
    $('#mj-day').value = mokjang.meet_day || '';

    bindTabs(); bindWeek(); bindWrite(); bindMembers(); bindMine();
    await loadMokwon();
    await pickStartWeek();
    await loadWeek();
    watchNewWeek();
    window.addEventListener('beforeunload', function (e) {
      if (dirty) { e.preventDefault(); e.returnValue = ''; }
    });
  })();

  function fail(m) { alert(T('불러오지 못했습니다: ') + m); }

  // 주일·월요일에는 지난주 모임 일기를 마저 쓰는 일이 많다 —
  // 이번 주 일기가 아직 없고 지난주 일기가 제출 전이면 지난주를 먼저 연다 (혼자 쓰는 다락방은 '저장' 전이면)
  var startWeek = null;
  async function pickStartWeek() {
    startWeek = week;
    if (C.dayOfWeek() > 1) return;
    var now = await findJournal(week, 'id');
    if (now.data) return;
    var last = await findJournal(C.addWeeks(week, -1), 'id, status');
    if (last.data && last.data.status !== 'submitted' && !solo) {
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
  function markDirty() { dirty = true; $('#save-state').textContent = T('아직 저장되지 않았습니다'); }

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
    if (!mokwon.length) { box.innerHTML = T('<p class="empty">아직 목원이 없습니다. 위에 이름을 넣어 주세요.</p>'); return; }
    var dates = C.has('member_dates');   // 성도 날짜(교회 등록·생명의 삶·침례)는 켠 교회만
    box.innerHTML = mokwon.map(function (m) {
      return '<div class="list-item" data-id="' + m.id + '">' +
        '<div class="grow"><div class="t">' + esc(m.name) +
        (m.tag ? ' <span class="badge gold">' + esc(m.tag) + '</span>' : '') +
        (m.active ? '' : T(' <span class="badge">쉼</span>')) + '</div>' +
        (dates ? '<div class="s">' + esc(C.memberDatesLine(m)) + '</div>' : '') + '</div>' +
        T('<button class="small act-edit">이름 고치기</button>') +
        (dates ? T('<button class="small act-dates">날짜</button>') : '') +
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
      } else if (btn.classList.contains('act-del')) {
        if (!confirm(T('{0} 님을 명단에서 지울까요?\n지난 주 기록에 적힌 기도제목은 그대로 남습니다.', m.name))) return;
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
    $('#wk-state').textContent = submitted ? T('제출함') : (journal ? (solo ? T('저장됨') : T('임시 저장됨')) : T('아직 안 썼습니다'));
    $('#wk-state').className = 'badge ' + (submitted ? 'done' : 'todo');
    $('#save-state').textContent = journal && journal.updated_at ? (T('마지막 저장 ') + C.whenText(journal.updated_at)) : '';
    dirty = false;
    rendered = null;
    renderMembers();
  }

  function defaultMetOn() {
    // 그 주 금요일을 기본값으로 (주일부터 세어 5일째 — 모임이 대개 주말 저녁)
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
      // 방금 새로 넣은 줄의 id를 화면 상태에 되돌려 적는다.
      // (이게 없으면 다음 저장 때 같은 기도제목을 또 넣어 중복이 쌓였다)
      var idOf = {};
      prayers.forEach(function (p) { if (p.mokwon_id) idOf[p.mokwon_id] = p.id; });
      (rendered || []).forEach(function (row) { if (!row.id && row.mokwon_id && idOf[row.mokwon_id]) row.id = idOf[row.mokwon_id]; });
      dirty = false;
      // 제출이면 목사님 휴대전화로 알림 (실패해도 제출은 이미 끝났다)
      if (status === 'submitted') C.notify({ action: 'submitted', journal_id: journal.id }).catch(function () {});
      $('#wk-state').textContent = status === 'submitted' ? T('제출함') : (solo ? T('저장됨') : T('임시 저장됨'));
      $('#wk-state').className = 'badge ' + (status === 'submitted' ? 'done' : 'todo');
      $('#save-state').textContent = T('마지막 저장 ') + C.whenText(journal.updated_at);
      C.say($('#msg-write'), status === 'submitted'
        ? T('목사님께 전달했습니다. 제출한 뒤에도 고치실 수 있습니다.')
        : (solo ? T('저장했습니다.') : T('저장했습니다. 나중에 이어서 쓰셔도 됩니다.')), 'ok');
    } catch (err) {
      C.say($('#msg-write'), T('저장하지 못했습니다: ') + err.message, 'err');
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
        (j.status === 'submitted' ? T('제출함') : solo ? T('저장됨') : T('임시')) + '</span></summary>' +
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
    $('.detail', d).innerHTML = renderJournal(j, ps, cs);
  }

  function renderJournal(j, ps, cs) {
    var h = '';
    if (j.met_on) h += T('<p class="quiet" style="margin:0 0 10px">모인 날 ') + esc(j.met_on) +
      (j.present_count != null ? ' · ' + T('{0}명', j.present_count) : '') + '</p>';
    if (ps.length) {
      h += T('<div class="section-title">목원별 기도제목</div>');
      h += ps.map(function (p) {
        return '<div class="member"><div class="head"><span class="name">' + esc(p.name) + '</span>' +
          (p.attended ? '' : T('<span class="badge">결석</span>')) +
          (p.answered ? T('<span class="badge done">응답됨</span>') : '') + '</div>' +
          '<div class="prose">' + (p.content ? esc(p.content) : T('<span class="quiet">(적지 않음)</span>')) + '</div></div>';
      }).join('');
    }
    if (j.body) h += T('<div class="section-title">목장 이야기</div><div class="prose">') + esc(j.body) + '</div>';
    if (j.mokjang_prayer) h += T('<div class="section-title">목장 전체 기도제목</div><div class="prose">') + esc(j.mokjang_prayer) + '</div>';
    h += T('<div class="section-title">목사님 말씀</div>');
    h += cs.length ? cs.map(function (c) {
      return '<div class="member" style="background:var(--brand-soft); border-color:#cfe0d5">' +
        '<div class="head"><span class="name">' + esc(c.author_name) + '</span>' +
        '<span class="quiet" style="font-size:13px">' + C.whenText(c.created_at) + '</span></div>' +
        '<div class="prose">' + esc(c.body) + '</div></div>';
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

    // 열쇠 코드 새로 받기 (비밀번호 없이 쓰는 목자)
    $('#btn-new-key').addEventListener('click', async function () {
      if (!confirm(T('새 열쇠 코드를 받으면 예전 코드는 쓸 수 없습니다. 새로 받을까요?'))) return;
      try {
        var r = await C.callAdmin({ action: 'new_key' });
        $('#my-key').textContent = r.key; $('#my-key').hidden = false;
        C.say($('#msg-key'), T('새 열쇠 코드입니다. 사진으로 찍어 두세요.'), 'ok');
      } catch (err) { C.say($('#msg-key'), err.message, 'err'); }
    });

    // 혼자 쓰던 목장을 교회에 연결 — 명단·일기가 그대로 교회로 옮겨진다
    $('#form-link').addEventListener('submit', async function (e) {
      e.preventDefault();
      var b = $('#btn-link'); b.disabled = true;
      try {
        var r = await C.callAdmin({ action: 'link_church', join_code: $('#link-code').value });
        C.say($('#msg-link'), T('{0}에 연결했습니다. 이제 일기를 목사님께 제출할 수 있습니다.', r.name || ''), 'ok', true);
        setTimeout(function () { location.reload(); }, 1800);
      } catch (err) { C.say($('#msg-link'), err.message, 'err'); b.disabled = false; }
    });

    $('#form-leave').addEventListener('submit', async function (e) {
      e.preventDefault();
      if (!confirm(T('정말 탈퇴할까요? 되돌릴 수 없습니다.'))) return;
      var b = $('#btn-leave'); b.disabled = true;
      try {
        if (!C.isKeyless(me)) await C.checkPassword(me.login_id, $('#leave-pw').value);
        await C.callAdmin({ action: solo ? 'delete_solo' : 'delete_me' });
        await C.afterLeave();
      } catch (err) { C.say($('#msg-leave'), err.message, 'err'); b.disabled = false; }
    });
  }
})();
