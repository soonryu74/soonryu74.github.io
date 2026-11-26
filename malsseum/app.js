/* 말씀 알림 — 화면. 목록·설정은 이 기기(localStorage)와 서버에 함께 둔다. 로그인 없이 연결 코드로 내 것을 찾는다. */
(function () {
  'use strict';
  var SB_URL = 'https://dxhmprqfgigljgbstqrg.supabase.co';   // Supabase 프로젝트 korea-now (서울)
  var SB_KEY = 'sb_publishable__FXGut04uxuz44s2443_8g_AByEuL-n';   // 공개 키 — 실제 보호는 서버 함수(연결 코드 확인)가 한다
  var FN = SB_URL + '/functions/v1/mal-notify';
  var LS = 'malsseum.v1';
  var KIND = { verse: '성경 구절', quote: '좋은 글귀', prayer: '기도제목' };
  var $ = function (id) { return document.getElementById(id); };

  // ── 상태 ──
  var st = load();
  function fresh() {
    // 처음 여는 사람은 기본 72구절을 1시간마다 하나씩 받도록 채워 둔다
    return { key: newKey(), items: defaults(), kinds: ['verse', 'quote', 'prayer'], interval_min: 60, quiet_start: 22, quiet_end: 7,
      enabled: true, cursor: 0, next_at: null, synced: false, seeded: true };
  }
  function load() {
    try { var s = JSON.parse(localStorage.getItem(LS) || 'null'); if (s && s.key) return s; } catch (e) {}
    var f = fresh(); keep(f); return f;
  }
  function defaults() { return (window.MAL_DEFAULT || []).map(function (x) { return { id: x.id, kind: x.kind, ref: x.ref, text: x.text }; }); }
  function keep(s) { try { localStorage.setItem(LS, JSON.stringify(s || st)); } catch (e) {} }
  function newKey() {
    var abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', a = new Uint8Array(16), out = '';
    crypto.getRandomValues(a);
    for (var i = 0; i < a.length; i++) out += abc[a[i] % abc.length];
    return out;
  }
  var fmtKey = function (k) { return k.replace(/(.{4})(?=.)/g, '$1-'); };
  function newId() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); }
  function tz() { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Seoul'; } catch (e) { return 'Asia/Seoul'; } }

  // ── 서버 ──
  async function api(payload) {
    var res = await fetch(FN, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: SB_KEY },
      body: JSON.stringify(Object.assign({ key: st.key }, payload)) });
    var data = await res.json().catch(function () { return {}; });
    if (!res.ok) throw new Error(data.error || '서버에 닿지 못했습니다');
    return data;
  }
  function settings() {
    return { kinds: st.kinds, interval_min: st.interval_min, quiet_start: st.quiet_start, quiet_end: st.quiet_end, enabled: st.enabled, tz: tz() };
  }
  function takeUser(u) {
    ['items', 'kinds', 'interval_min', 'quiet_start', 'quiet_end', 'enabled', 'cursor', 'next_at'].forEach(function (k) { st[k] = u[k]; });
    st.synced = true; keep();
  }
  var saveTimer = 0, saving = null;
  function save() {            // 고칠 때마다 부른다: 기기에 바로 적고, 잠깐 뒤 서버에 올린다
    keep(); render();
    $('saveState').textContent = '저장하는 중…';
    clearTimeout(saveTimer);
    saveTimer = setTimeout(push, 600);
  }
  async function push() {
    if (saving) { await saving.catch(function () {}); }
    saving = api({ action: 'save', items: st.items, settings: settings() });
    try {
      var r = await saving;
      if (r.user) { st.cursor = r.user.cursor; st.next_at = r.user.next_at; st.synced = true; keep(); renderNow(); }
      $('saveState').textContent = '저장했습니다';
    } catch (e) { $('saveState').textContent = '저장하지 못했습니다 — 인터넷을 확인해 주세요 (이 기기에는 남아 있습니다)'; }
    finally { saving = null; }
  }

  // ── 그리기 ──
  function active() { return st.items.filter(function (it) { return st.kinds.indexOf(it.kind) >= 0; }); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function renderNow() {
    var list = active();
    var it = list.length ? list[(st.cursor || 0) % list.length] : null;
    $('nowRef').textContent = it ? (it.ref || KIND[it.kind]) : '';
    $('nowText').textContent = it ? it.text : (st.items.length ? '보낼 종류에 맞는 글이 없습니다.' : '아래에서 글을 먼저 넣어 주세요.');
    var when = '';
    if (it && !st.enabled) when = '알림 보내기가 꺼져 있습니다';
    else if (it && st.next_at) {
      var d = new Date(st.next_at);
      if (d.getTime() > Date.now() - 6 * 60000) {
        var day = d.toDateString() === new Date().toDateString() ? '오늘' : '내일';
        when = day + ' ' + d.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' }) + '에 보냅니다';
      }
    }
    $('nowWhen').textContent = when;
    return it;
  }
  function render() {
    var cur = renderNow();
    $('interval').value = String(st.interval_min);
    $('quietStart').value = String(st.quiet_start);
    $('quietEnd').value = String(st.quiet_end);
    $('enabled').checked = !!st.enabled;
    [].forEach.call($('kinds').querySelectorAll('input'), function (c) { c.checked = st.kinds.indexOf(c.value) >= 0; });
    $('count').textContent = st.items.length ? st.items.length + '개' : '';
    $('empty').hidden = st.items.length > 0;
    renderSeed();
    $('list').innerHTML = st.items.map(function (it, i) {
      var off = st.kinds.indexOf(it.kind) < 0;
      return '<li class="item' + (off ? ' off' : '') + (cur && cur.id === it.id ? ' cur' : '') + '" data-id="' + esc(it.id) + '">' +
        '<button class="body" type="button" data-act="edit">' +
          '<span class="tag k-' + it.kind + '">' + KIND[it.kind] + '</span>' +
          (it.ref ? '<span class="ref">' + esc(it.ref) + '</span>' : '') +
          '<span class="text">' + esc(it.text) + '</span>' +
        '</button>' +
        '<span class="move">' +
          '<button type="button" data-act="up" aria-label="위로"' + (i === 0 ? ' disabled' : '') + '>▲</button>' +
          '<button type="button" data-act="down" aria-label="아래로"' + (i === st.items.length - 1 ? ' disabled' : '') + '>▼</button>' +
        '</span></li>';
    }).join('');
  }
  var toastT = 0;
  function toast(msg) {
    var t = $('toast'); t.textContent = msg; t.classList.add('on');
    clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('on'); }, 3200);
  }

  // ── 설정 ──
  function hourLabel(h) { return (h < 12 ? '오전 ' : '오후 ') + (h % 12 === 0 ? 12 : h % 12) + '시'; }
  ['quietStart', 'quietEnd'].forEach(function (id) {
    var html = ''; for (var h = 0; h < 24; h++) html += '<option value="' + h + '">' + hourLabel(h) + '</option>';
    $(id).innerHTML = html;
  });
  $('interval').onchange = function () { st.interval_min = Number(this.value); save(); };
  $('quietStart').onchange = function () { st.quiet_start = Number(this.value); save(); };
  $('quietEnd').onchange = function () { st.quiet_end = Number(this.value); save(); };
  $('enabled').onchange = function () { st.enabled = this.checked; save(); };
  $('kinds').onchange = function () {
    var k = [].filter.call(this.querySelectorAll('input'), function (c) { return c.checked; }).map(function (c) { return c.value; });
    if (!k.length) { toast('종류는 하나 이상 골라 주세요'); render(); return; }
    st.kinds = k; st.cursor = 0; save();
  };

  // ── 목록 ──
  var editing = null;
  var REF_LABEL = { verse: '어디 말씀인가요 (예: 시편 23:1)', quote: '누구의 글인가요 (비워도 됩니다)', prayer: '누구를 위한 기도인가요 (비워도 됩니다)' };
  function kindOf(name) { var c = document.querySelector('input[name="' + name + '"]:checked'); return c ? c.value : 'verse'; }
  function setKind(name, v) { var c = document.querySelector('input[name="' + name + '"][value="' + v + '"]'); if (c) c.checked = true; }
  function lenHint() {
    var n = $('editText').value.length;
    $('editLen').textContent = n > 120 ? n + '자 — 알림에는 앞부분만 보일 수 있습니다 (휴대폰마다 다릅니다)' : (n ? n + '자' : '');
  }
  function openEdit(it) {
    editing = it || null;
    $('editTitle').textContent = it ? '글 고치기' : '글 넣기';
    setKind('kind', it ? it.kind : (st.lastKind || 'verse'));
    $('refLabel').textContent = REF_LABEL[kindOf('kind')];
    $('editRef').value = it ? it.ref : '';
    $('editText').value = it ? it.text : '';
    $('editDel').hidden = !it;
    lenHint();
    $('editDlg').showModal();
  }
  $('editKind').onchange = function () { $('refLabel').textContent = REF_LABEL[kindOf('kind')]; };
  $('editText').oninput = lenHint;
  $('addBtn').onclick = function () { openEdit(null); };
  $('editCancel').onclick = function () { $('editDlg').close(); };
  $('editForm').onsubmit = function () {
    var text = $('editText').value.trim(); if (!text) return;
    var kind = kindOf('kind'), ref = $('editRef').value.trim();
    if (editing) { editing.kind = kind; editing.ref = ref; editing.text = text; }
    else { st.items.push({ id: newId(), kind: kind, ref: ref, text: text }); st.lastKind = kind; }
    save();
  };
  $('editDel').onclick = function () {
    if (!editing || !confirm('이 글을 지울까요?')) return;
    st.items = st.items.filter(function (x) { return x !== editing; });
    $('editDlg').close(); save();
  };
  $('list').onclick = function (e) {
    var b = e.target.closest('button[data-act]'); if (!b) return;
    var id = b.closest('li').dataset.id, i = st.items.findIndex(function (x) { return x.id === id; });
    if (i < 0) return;
    if (b.dataset.act === 'edit') return openEdit(st.items[i]);
    var j = b.dataset.act === 'up' ? i - 1 : i + 1;
    if (j < 0 || j >= st.items.length) return;
    var t = st.items[i]; st.items[i] = st.items[j]; st.items[j] = t;
    save();
  };
  $('bulkBtn').onclick = function () { $('bulkText').value = ''; $('bulkFile').value = ''; bulkCount(); $('bulkDlg').showModal(); };
  function bulkCount() {
    var n = $('bulkText').value.split(/\n+/).filter(function (l) { return l.trim(); }).length;
    $('bulkInfo').textContent = n ? n + '줄을 넣을 준비가 됐습니다' : '';
  }
  $('bulkText').oninput = bulkCount;
  // CSV 한 덩어리를 줄·칸으로 나눈다 (따옴표 안의 쉼표·줄바꿈을 지킨다)
  function parseCsv(text, sep) {
    var rows = [], row = [], cell = '', q = false;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
      else if (c === '"') q = true;
      else if (c === sep) { row.push(cell); cell = ''; }
      else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
      else if (c !== '\r') cell += c;
    }
    row.push(cell); rows.push(row);
    return rows;
  }
  var one = function (s) { return String(s || '').replace(/\s+/g, ' ').trim(); };
  function fileToLines(name, text) {
    text = text.replace(/^\uFEFF/, '');
    var isCsv = /\.csv$/i.test(name), isTsv = /\.tsv$/i.test(name) || (!isCsv && text.indexOf('\t') >= 0 && text.indexOf('|') < 0);
    if (!isCsv && !isTsv) return text.replace(/\r/g, '').split(/\n+/).map(function (l) { return l.trim(); }).filter(Boolean);
    var rows = parseCsv(text, isCsv ? ',' : '\t').map(function (r) { return r.map(one); }).filter(function (r) { return r.join(''); });
    // 첫 줄이 제목 줄(출처, 내용 …)이면 뺀다
    if (rows.length > 1 && /^(출처|장절|구절|제목|ref|reference|verse|번호|no\.?)$/i.test(rows[0][0])) rows.shift();
    return rows.map(function (r) {
      if (r.length === 1) return r[0];
      if (r.length > 2 && /^\d+$/.test(r[0])) r = r.slice(1);          // 맨 앞 번호 칸은 버린다
      return r[0] + ' | ' + r.slice(1).filter(Boolean).join(' ');
    });
  }
  $('bulkFile').onchange = function () {
    var f = this.files && this.files[0]; if (!f) return;
    if (f.size > 1024 * 1024) { toast('파일이 너무 큽니다 (1MB까지)'); this.value = ''; return; }
    var rd = new FileReader();
    rd.onload = function () {
      var lines = fileToLines(f.name, String(rd.result || ''));
      if (!lines.length) { toast('파일에서 글을 찾지 못했습니다'); return; }
      $('bulkText').value = lines.join('\n'); bulkCount();
    };
    rd.onerror = function () { toast('파일을 읽지 못했습니다'); };
    rd.readAsText(f, 'utf-8');
  };
  $('bulkCancel').onclick = function () { $('bulkDlg').close(); };
  $('bulkForm').onsubmit = function () {
    var kind = kindOf('bkind'), n = 0;
    $('bulkText').value.split(/\n+/).forEach(function (line) {
      line = line.trim(); if (!line) return;
      var p = line.indexOf('|'); if (p < 0) p = line.indexOf('\t');
      var ref = p >= 0 ? line.slice(0, p).trim() : '', text = (p >= 0 ? line.slice(p + 1) : line).trim();
      if (!text || st.items.length >= 500) return;
      st.items.push({ id: newId(), kind: kind, ref: ref.slice(0, 60), text: text.slice(0, 600) }); n++;
    });
    if (n) { save(); toast(n + '개를 넣었습니다' + (st.items.length >= 500 ? ' (목록은 500개까지입니다)' : '')); }
  };

  // ── 기본 72구절 ──
  function addDefaults() {       // 아직 없는 것만 뒤에 붙인다
    var have = {}; st.items.forEach(function (x) { have[x.id] = 1; });
    var add = defaults().filter(function (x) { return !have[x.id]; }).slice(0, Math.max(0, 500 - st.items.length));
    st.items = st.items.concat(add); st.seeded = true;
    return add.length;
  }
  function renderSeed() {
    var have = {}; st.items.forEach(function (x) { have[x.id] = 1; });
    $('seedBtn').hidden = !defaults().some(function (x) { return !have[x.id]; });
  }
  $('seedBtn').onclick = function () {
    var n = addDefaults(); save();
    toast(n ? '기본 ' + n + '구절을 넣었습니다' : '이미 모두 들어 있습니다');
  };
  // 이 앱을 먼저 쓰던 기기: 목록이 비어 있으면 한 번만 기본 72구절을 채운다
  function seedOnce() { if (!st.seeded && !st.items.length && addDefaults()) save(); else if (!st.seeded) { st.seeded = true; keep(); } }

  // ── 연결 코드 ──
  var shown = false;
  $('keyShow').onclick = function () {
    shown = !shown;
    $('keyView').textContent = shown ? fmtKey(st.key) : '············';
    this.textContent = shown ? '코드 숨기기' : '코드 보기';
  };
  $('keyEnter').onclick = function () { $('keyInput').value = ''; $('keyErr').textContent = ''; $('keyDlg').showModal(); };
  $('keyCancel').onclick = function () { $('keyDlg').close(); };
  $('keyForm').onsubmit = async function (e) {
    e.preventDefault();
    var k = $('keyInput').value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (k.length < 12) { $('keyErr').textContent = '코드가 너무 짧습니다'; return; }
    try {
      var old = st.key; st.key = k;
      var r = await api({ action: 'load' });
      if (!r.user) { st.key = old; $('keyErr').textContent = '이 코드로 저장된 목록이 없습니다'; return; }
      var sub = await currentSub();
      if (sub) { st.key = old; await api({ action: 'unsubscribe', endpoint: sub.endpoint }).catch(function () {}); st.key = k; }
      takeUser(r.user);
      if (sub) await api({ action: 'subscribe', subscription: sub.toJSON() });
      $('keyDlg').close(); render(); toast('연결했습니다');
    } catch (err) { $('keyErr').textContent = err.message; }
  };

  // ── 알림 ──
  var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var standalone = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  var canPush = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  var regP = 'serviceWorker' in navigator ? navigator.serviceWorker.register('sw.js').catch(function () { return null; }) : Promise.resolve(null);
  async function currentSub() { var reg = await regP; return reg && reg.pushManager ? reg.pushManager.getSubscription() : null; }
  function urlB64(s) {
    var pad = '='.repeat((4 - s.length % 4) % 4), raw = atob((s + pad).replace(/-/g, '+').replace(/_/g, '/')), out = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }
  async function renderPush() {
    var btn = $('pushBtn'), state = $('pushState'), test = $('testBtn');
    btn.hidden = true; test.hidden = true; $('testState').hidden = true; $('iosGuide').hidden = true;
    if (!canPush) {
      if (isIOS && !standalone) { state.textContent = '아직 알림을 받을 수 없습니다.'; $('iosGuide').hidden = false; }
      else state.textContent = '이 브라우저는 알림을 받을 수 없습니다. 크롬이나 사파리(홈 화면 추가)로 열어 주세요.';
      return;
    }
    if (Notification.permission === 'denied') { state.textContent = '알림이 막혀 있습니다. 휴대폰 설정에서 이 앱의 알림을 허용해 주세요.'; return; }
    var sub = await currentSub();
    btn.hidden = false;
    if (sub && Notification.permission === 'granted') {
      state.textContent = '이 기기로 알림을 받고 있습니다.';
      btn.textContent = '알림 끄기'; btn.className = 'btn'; test.hidden = false; $('testState').hidden = false;
    } else {
      state.textContent = '이 기기는 아직 알림을 받지 않습니다.';
      btn.textContent = '알림 켜기'; btn.className = 'btn primary';
    }
  }
  $('pushBtn').onclick = async function () {
    this.disabled = true;
    try {
      var reg = await regP, sub = await currentSub();
      if (sub && Notification.permission === 'granted') {
        await api({ action: 'unsubscribe', endpoint: sub.endpoint }).catch(function () {});
        await sub.unsubscribe();
        toast('이 기기의 알림을 껐습니다');
      } else {
        if (!reg) throw new Error('알림을 준비하지 못했습니다');
        var perm = await Notification.requestPermission();
        if (perm !== 'granted') throw new Error('알림을 허용해야 받을 수 있습니다');
        await navigator.serviceWorker.ready;
        clearTimeout(saveTimer); await push();          // 서버에 내 자리가 먼저 있어야 한다
        var k = (await api({ action: 'key' })).publicKey;
        sub = sub || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64(k) });
        await api({ action: 'subscribe', subscription: sub.toJSON() });
        toast('알림을 켰습니다');
      }
    } catch (e) { toast(e.message || '알림을 켜지 못했습니다'); }
    this.disabled = false; renderPush();
  };
  $('testBtn').onclick = async function () {
    var out = $('testState'), t = new Date().toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' });
    this.disabled = true; out.textContent = '보내는 중…';
    try {
      var sub = await currentSub();
      var r = await api({ action: 'test', endpoint: sub ? sub.endpoint : '' });
      out.textContent = r.sent
        ? t + '에 보냈습니다. 알림이 안 보이면 화면 위를 쓸어내려 알림창을 확인해 주세요. 무음·방해 금지 모드에서는 소리 없이 들어옵니다.'
        : '보내지 못했습니다. [알림 끄기]를 눌렀다가 다시 [알림 켜기]를 눌러 주세요.';
    } catch (e) { out.textContent = '보내지 못했습니다 — ' + e.message; }
    this.disabled = false;
  };

  // ── 시작 ──
  render(); renderPush();
  (async function () {
    try {
      var r = await api({ action: 'load' });
      if (r.user) {
        if (st.synced) { takeUser(r.user); render(); }
        else if (st.items.length) push();              // 서버보다 이 기기가 새것(올리다 끊긴 경우)
        else { takeUser(r.user); render(); }
      }
      seedOnce();
      $('saveState').textContent = '';
    } catch (e) { $('saveState').textContent = '인터넷에 닿지 않아 이 기기에 저장된 내용을 보여 드립니다'; }
  })();
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState !== 'visible' || saving) return;
    api({ action: 'load' }).then(function (r) { if (r.user && !saving) { takeUser(r.user); render(); } }).catch(function () {});
    renderPush();
  });
})();
