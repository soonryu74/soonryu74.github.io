/* 중보기도 나눔터 — 화면 (한 파일)
   로그인 없이 '열쇠 코드'(12자)로 사람을 알아본다. 모든 읽기·쓰기는 Supabase RPC(pray_*)로 하고,
   휴대폰 알림은 Edge Function(pray-notify)이 웹 푸시로 보낸다. 카카오톡 단톡방 알림은 공유 창(또는 복사)으로 사람이 한 번 누른다. */
(function () {
  'use strict';
  var SB_URL = 'https://kagqgfcpvpcyosexdhsz.supabase.co';   // Supabase 프로젝트 jungbo-prayer (서울)
  var SB_KEY = 'sb_publishable_dONt_Z2TIOHwV210v9Yw4A_irx8sSzN';   // 공개 키 — 실제 보호는 서버 함수(열쇠 코드 확인)가 한다
  var FN = SB_URL + '/functions/v1/pray-notify';
  var EMOJI = ['🙏', '❤️', '😢', '🙌', '💪'];   // 서버(pray_react)와 같은 목록
  var LS_ACC = 'jungbo-accounts', LS_ACTIVE = 'jungbo-active', LS_NUDGE = 'jungbo-push-nudge';
  var POLL_MS = 20000;

  var sb = window.supabase.createClient(SB_URL, SB_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function say(el, text, kind, keep) {
    if (!el) return; el.textContent = text; el.className = 'msg show ' + (kind || 'ok');
    if (kind !== 'err' && !keep) setTimeout(function () { el.className = 'msg'; }, 5000);
  }
  var toastT;
  function toast(text) { var t = $('#toast'); t.textContent = text; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('show'); }, 2600); }
  function norm(code) { return String(code || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase(); }

  /* ── 오늘의 말씀 (짧은 구절, 날마다 바뀐다) ─────────────── */
  var VERSES = [
    ['너희 짐을 서로 지라 그리하여 그리스도의 법을 성취하라', '갈라디아서 6:2'],
    ['쉬지 말고 기도하라', '데살로니가전서 5:17'],
    ['아무 것도 염려하지 말고 다만 모든 일에 기도와 간구로, 너희 구할 것을 감사함으로 하나님께 아뢰라', '빌립보서 4:6'],
    ['두세 사람이 내 이름으로 모인 곳에는 나도 그들 중에 있느니라', '마태복음 18:20'],
    ['수고하고 무거운 짐 진 자들아 다 내게로 오라 내가 너희를 쉬게 하리라', '마태복음 11:28'],
    ['여호와는 마음이 상한 자를 가까이 하시고 충심으로 통회하는 자를 구원하시는도다', '시편 34:18'],
    ['너희 염려를 다 주께 맡기라 이는 그가 너희를 돌보심이라', '베드로전서 5:7'],
    ['주의 말씀은 내 발에 등이요 내 길에 빛이니이다', '시편 119:105'],
    ['의인의 간구는 역사하는 힘이 큼이니라', '야고보서 5:16'],
    ['기뻐하는 자들과 함께 기뻐하고 우는 자들과 함께 울라', '로마서 12:15'],
    ['평안을 너희에게 끼치노니 곧 나의 평안을 너희에게 주노라', '요한복음 14:27'],
    ['내가 산을 향하여 눈을 들리라 나의 도움이 어디서 올까', '시편 121:1'],
    ['그런즉 믿음, 소망, 사랑, 이 세 가지는 항상 있을 것인데 그 중의 제일은 사랑이라', '고린도전서 13:13'],
    ['강하고 담대하라 두려워하지 말며 놀라지 말라 네가 어디로 가든지 네 하나님 여호와가 너와 함께 하느니라', '여호수아 1:9'],
    ['너는 내게 부르짖으라 내가 네게 응답하겠고 네가 알지 못하는 크고 은밀한 일을 네게 보이리라', '예레미야 33:3'],
    ['여호와는 나의 목자시니 내게 부족함이 없으리로다', '시편 23:1']
  ];
  function todayVerse() {
    var d = new Date(), n = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 864e5);
    return VERSES[n % VERSES.length];
  }
  /* ── 하늘빛 (시간에 따라: 새벽·낮·노을·밤) — 메뉴에서 밤 모드로 고정할 수 있다 ── */
  var LS_SKY = 'jungbo-sky';
  // 기본은 촛불 켜진 어두운 방. 글이 잘 안 보이는 분은 메뉴에서 '밝은 모드'로
  function applySky() {
    var m = ''; try { m = localStorage.getItem(LS_SKY) || ''; } catch (e) {}
    var s = m === 'day' ? 'day' : 'night';
    document.documentElement.setAttribute('data-sky', s);
    var meta = document.querySelector('meta[name="theme-color"]'); if (meta) meta.setAttribute('content', s === 'night' ? '#07100d' : '#1f4d3b');
    var mb = $('#menu-sky'); if (mb) mb.textContent = s === 'day' ? '촛불 모드로' : '밝은 모드로';
  }
  function toggleSky() {
    var m = ''; try { m = localStorage.getItem(LS_SKY) || ''; } catch (e) {}
    try { if (m === 'day') localStorage.removeItem(LS_SKY); else localStorage.setItem(LS_SKY, 'day'); } catch (e) {}
    applySky();
  }
  applySky();
  /* 촛불 그림 */
  function candleSvg(cls) {
    return '<svg class="candle ' + (cls || '') + '" viewBox="0 0 34 52" aria-hidden="true">' +
      '<ellipse class="glow" cx="17" cy="14" rx="12" ry="14" fill="rgba(246,196,83,.28)"/>' +
      '<path class="flame" d="M17 4c3 5 7 8 7 13a7 7 0 0 1-14 0c0-5 4-8 7-13z" fill="#f6c453"/>' +
      '<path class="flame" d="M17 11c1.5 2.5 3.5 4 3.5 6.5a3.5 3.5 0 0 1-7 0c0-2.5 2-4 3.5-6.5z" fill="#fff1c2"/>' +
      '<rect x="12" y="26" width="10" height="22" rx="2" fill="#efe3c8"/><rect x="12" y="26" width="10" height="4" rx="2" fill="#dcc79c"/></svg>';
  }
  // 기도의 불빛: 사람 수만큼 작은 불 (최대 12개, 나머지는 +N)
  function lightsHtml(n, fresh) {
    n = +n || 0; if (!n) return '';
    var k = Math.min(n, 12), s = '<span class="lights" aria-label="' + n + '명이 기도했어요">';
    for (var i = 0; i < k; i++) s += '<i class="light' + (fresh && i === k - 1 ? ' new' : '') + '"></i>';
    return s + (n > 12 ? '<span class="more">+' + (n - 12) + '</span>' : '') + '</span>';
  }
  function bloom(btn) {
    if (!btn) return;
    var b = document.createElement('i'); b.className = 'bloom'; btn.appendChild(b); setTimeout(function () { b.remove(); }, 1000);
    try { if (navigator.vibrate) navigator.vibrate(25); } catch (e) {}
  }
  function fmtCode(code) { var c = norm(code); return c.replace(/(.{4})(?=.)/g, '$1-'); }

  /* ── 시간 ─────────────────────────────────────────── */
  function ago(iso) {
    if (!iso) return '';
    var s = (Date.now() - new Date(iso).getTime()) / 1000;
    if (s < 60) return '방금';
    if (s < 3600) return Math.floor(s / 60) + '분 전';
    if (s < 86400) return Math.floor(s / 3600) + '시간 전';
    if (s < 86400 * 7) return Math.floor(s / 86400) + '일 전';
    return whenText(iso);
  }
  function whenText(iso) {
    if (!iso) return '';
    var d = new Date(iso), now = new Date();
    var md = (d.getMonth() + 1) + '월 ' + d.getDate() + '일';
    return (d.getFullYear() !== now.getFullYear() ? d.getFullYear() + '년 ' : '') + md + ' ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
  }

  /* ── 서버 ─────────────────────────────────────────── */
  async function rpc(name, args) {
    var r = await sb.rpc(name, args || {});
    if (r.error) {
      var m = r.error.message || '';
      if (/Failed to fetch|NetworkError|network/i.test(m)) m = '인터넷 연결을 확인해 주세요.';
      else if (/function .* does not exist|schema cache/i.test(m)) m = '서버 준비가 아직 안 되었습니다. 잠시 뒤 다시 열어 주세요.';
      throw new Error(m);
    }
    return r.data;
  }
  async function notify(payload) {
    payload.token = acct ? acct.token : '';
    var res = await fetch(FN, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: SB_KEY }, body: JSON.stringify(payload) });
    var out = {}; try { out = await res.json(); } catch (e) {}
    if (!res.ok || out.error) throw new Error(out.error || ('알림 서버 오류 (' + res.status + ')'));
    return out;
  }
  // 알림 보내기는 실패해도 글 올리기 자체는 된 것이므로 조용히 넘긴다
  function notifyQuiet(payload) { return notify(payload).catch(function (e) { console.warn('notify', e); return { sent: 0, people: 0, failed: true }; }); }

  /* ── 내 계정들 (이 기기) ──────────────────────────────
     한 사람이 여러 모임에 들어갈 수 있어 [{ token, group_id, code, group_name, name, role }] 로 둔다. */
  function loadAccounts() { try { return JSON.parse(localStorage.getItem(LS_ACC) || '[]'); } catch (e) { return []; } }
  function saveAccounts(list) { try { localStorage.setItem(LS_ACC, JSON.stringify(list)); } catch (e) {} }
  function upsertAccount(a) {
    var list = loadAccounts().filter(function (x) { return x.group_id !== a.group_id; });
    list.unshift(a); saveAccounts(list);
    try { localStorage.setItem(LS_ACTIVE, a.group_id); } catch (e) {}
  }
  function dropAccount(groupId) {
    saveAccounts(loadAccounts().filter(function (x) { return x.group_id !== groupId; }));
    try { if (localStorage.getItem(LS_ACTIVE) === groupId) localStorage.removeItem(LS_ACTIVE); } catch (e) {}
  }
  function accountFrom(data, token) {   // RPC 응답 → 계정
    return { token: token, group_id: data.group.id, code: data.group.invite_code, group_name: data.group.name, name: data.me.name, role: data.me.role };
  }

  /* ── 상태 ─────────────────────────────────────────── */
  var acct = null, me = null, group = null, tab = 'open', feed = [], openPostId = null, pollT = null, lastFeedAt = 0;
  var q = new URLSearchParams(location.search);
  function hashPost() { var m = /#p=([0-9a-f-]{36})/i.exec(location.hash); return m ? m[1] : null; }
  function appUrl(extra) { return location.origin + location.pathname.replace(/[^/]*$/, '') + (extra || ''); }
  function groupLink() { return appUrl('?g=' + group.invite_code); }
  function postLink(id) { return appUrl('?g=' + group.invite_code + '#p=' + id); }

  function show(view) {
    ['v-enter', 'v-main'].forEach(function (id) { $('#' + id).hidden = id !== view; });
    $('#top').hidden = view !== 'v-main';
    $('#fab').hidden = view !== 'v-main' || tab === 'group';
  }

  /* ── 들어가기 화면 ─────────────────────────────────── */
  var pendingInvite = null;
  async function enterScreen(msg, kind) {
    stopPoll(); acct = null; show('v-enter');
    var ec = $('#enter-candle'); if (ec && !ec.innerHTML) ec.innerHTML = candleSvg();
    var ev = $('#enter-verse'), v = todayVerse(); if (ev) ev.innerHTML = '“' + esc(v[0]) + '”<small>' + esc(v[1]) + '</small>';
    if (msg) say($('#enter-msg'), msg, kind || 'err', true);
    var inv = q.get('g');
    if (inv && norm(inv).length >= 6) {
      pendingInvite = norm(inv);
      $('#join-card').hidden = false; $('#enter-cards').hidden = true;
      $('#join-inapp').hidden = !inApp();
      try {
        var g = await rpc('pray_group_peek', { p_invite: pendingInvite });
        if (!g) { $('#join-title').textContent = '초대 주소가 맞지 않아요'; $('#join-desc').textContent = '초대 코드를 찾지 못했습니다. 인도자에게 새 주소를 받아 주세요.'; $('#btn-join').disabled = true; }
        else {
          $('#join-title').textContent = '「' + g.name + '」에 들어가기';
          $('#join-desc').textContent = (g.member_count ? g.member_count + '명이 함께 기도하고 있어요. ' : '') + '이름만 넣으면 바로 들어와요. 아이디·비밀번호는 없어요.';
          if (g.join_open === false) { $('#join-desc').textContent = '이 모임은 지금 새 가입을 받지 않습니다. 인도자에게 말씀해 주세요.'; $('#btn-join').disabled = true; }
        }
      } catch (e) { say($('#enter-msg'), e.message, 'err', true); }
    } else {
      pendingInvite = null; $('#join-card').hidden = true; $('#enter-cards').hidden = false;
    }
  }
  async function afterEnter(data, token) {
    var a = accountFrom(data, token); upsertAccount(a);
    history.replaceState(null, '', location.pathname + '?g=' + a.code + location.hash);
    q = new URLSearchParams(location.search);
    await main();
  }
  function busy(btn, on) { btn.disabled = on; btn.dataset.label = btn.dataset.label || btn.textContent; btn.textContent = on ? '잠시만요…' : btn.dataset.label; }
  async function doJoin(code, name, btn) {
    if (!norm(code)) return say($('#enter-msg'), '초대 코드를 넣어 주세요.', 'err');
    if (!name.trim()) return say($('#enter-msg'), '이름을 넣어 주세요.', 'err');
    busy(btn, true);
    try {
      var d = await rpc('pray_join', { p_invite: norm(code), p_name: name });
      await afterEnter(d, d.token);
      toast('반갑습니다, ' + d.me.name + '님. 함께 기도해요.');
    } catch (e) { say($('#enter-msg'), e.message, 'err'); }
    busy(btn, false);
  }
  $('#btn-join').addEventListener('click', function () { doJoin(pendingInvite, $('#join-name').value, this); });
  $('#join-name').addEventListener('keydown', function (e) { if (e.key === 'Enter') $('#btn-join').click(); });
  $('#btn-join-code').addEventListener('click', function () { doJoin($('#in-code').value, $('#in-name').value, this); });
  $('#btn-create').addEventListener('click', async function () {
    var gn = $('#new-group').value, nm = $('#new-name').value;
    if (!gn.trim()) return say($('#enter-msg'), '모임 이름을 넣어 주세요.', 'err');
    if (!nm.trim()) return say($('#enter-msg'), '내 이름을 넣어 주세요.', 'err');
    busy(this, true);
    try {
      var d = await rpc('pray_create_group', { p_name: gn, p_leader_name: nm });
      await afterEnter(d, d.token);
      setTimeout(function () { inviteSheet(true); }, 400);
    } catch (e) { say($('#enter-msg'), e.message, 'err'); }
    busy(this, false);
  });
  $('#btn-key').addEventListener('click', async function () {
    var k = $('#key-code').value;
    if (norm(k).length < 12) return say($('#enter-msg'), '열쇠 코드 12자를 넣어 주세요.', 'err');
    busy(this, true);
    try { var d = await rpc('pray_me', { p_token: norm(k) }); await afterEnter(d, fmtCode(k)); toast(d.me.name + '님, 다시 오셨네요.'); }
    catch (e) { say($('#enter-msg'), e.message, 'err'); }
    busy(this, false);
  });
  $('#link-key-from-join').addEventListener('click', function (e) { e.preventDefault(); $('#join-card').hidden = true; $('#enter-cards').hidden = false; $('#key-code').focus(); });
  $('#btn-open-ext').addEventListener('click', openExternal);

  /* ── 본 화면 ──────────────────────────────────────── */
  async function main() {
    var list = loadAccounts(), want = q.get('g') ? norm(q.get('g')) : '';
    var active = ''; try { active = localStorage.getItem(LS_ACTIVE) || ''; } catch (e) {}
    acct = (want && list.filter(function (a) { return norm(a.code) === want; })[0]) ||
      (!want && list.filter(function (a) { return a.group_id === active; })[0]) || (!want && list[0]) || null;
    if (!acct && want && list.length) {
      // 초대 코드가 바뀌었을 수 있다 — 내 계정 중 그 모임인 것이 있는지 서버에 물어본다
      for (var i = 0; i < list.length; i++) {
        try { var d0 = await rpc('pray_me', { p_token: list[i].token }); if (norm(d0.group.invite_code) === want) { acct = list[i]; break; } } catch (e) {}
      }
    }
    if (!acct) return enterScreen();
    show('v-main');
    try {
      var d = await rpc('pray_me', { p_token: acct.token });
      me = d.me; group = d.group;
      acct = accountFrom(d, acct.token); upsertAccount(acct);
    } catch (e) {
      if (/열쇠 코드/.test(e.message)) { dropAccount(acct.group_id); return enterScreen('이 기기의 열쇠 코드가 더 이상 맞지 않아요 (모임에서 나갔거나 새 열쇠를 받았어요). 다시 들어와 주세요.'); }
      say($('#main-msg'), e.message, 'err', true);
      if (!group) return;
    }
    renderTop(); renderHero();
    await loadFeed();
    startPoll();
    var pid = hashPost(); if (pid) openPost(pid);
    pushNudge();
  }
  function renderTop() {
    $('#top-group').textContent = group.name;
    $('#top-me').textContent = me.name + (me.role === 'leader' ? ' · 인도자' : '') + ' · ' + group.member_count + '명';
    $('#menu-name').textContent = me.name + '님';
    document.title = group.name + ' — 중보기도 나눔터';
  }
  function renderHero() {
    var h = new Date().getHours(), sky = document.documentElement.getAttribute('data-sky');
    var kick = h < 5 ? '밤에 드리는 기도' : h < 10 ? '새벽에 드리는 기도' : h < 17 ? '오늘도 함께' : h < 21 ? '저녁에 드리는 기도' : '밤에 드리는 기도';
    var v = todayVerse();
    $('#hero-kicker').textContent = kick;
    $('#hero-verse').textContent = '“' + v[0] + '”'; $('#hero-ref').textContent = v[1];
    $('#hero-title').innerHTML = '<b>' + esc(me.name) + '</b>님, 평안하세요.';
    var urgent = feed.filter(function (p) { return p.kind === 'urgent' && p.status === 'open'; }).length;
    var open = feed.filter(function (p) { return p.status === 'open'; }).length;
    var lights = feed.reduce(function (s, p) { return s + (+p.prayed_total || 0); }, 0);
    $('#chips').innerHTML =
      (urgent ? '<span class="chip urgent">긴급 <b>' + urgent + '</b></span>' : '') +
      '<span class="chip">기도 중 <b>' + open + '</b></span>' +
      '<span class="chip lights">켜진 불빛 <b>' + lights + '</b></span>' +
      '<span class="chip">함께 <b>' + group.member_count + '</b>명</span>';
    $('#n-open').textContent = open ? open : ''; $('#n-urgent').textContent = urgent ? urgent : '';
  }

  // 목록 — 탭이 뭐든 '기도 중' 전체를 받아 두고 화면에서 거른다 (응답받음만 따로 받는다)
  async function loadFeed(silent) {
    if (!acct) return;
    try {
      var filter = tab === 'answered' ? 'answered' : 'open';
      var rows = await rpc('pray_feed', { p_token: acct.token, p_filter: filter, p_limit: 100 });
      if (filter === 'open') feed = rows; else answered = rows;
      lastFeedAt = Date.now();
      renderFeed(); if (filter === 'open') renderHero();
    } catch (e) { if (!silent) say($('#main-msg'), e.message, 'err'); }
  }
  var answered = [];
  function renderFeed() {
    var box = $('#feed');
    if (tab === 'group') return;
    if (!box.dataset.drawn) { box.dataset.drawn = '1'; box.classList.add('first'); setTimeout(function () { box.classList.remove('first'); }, 1200); }
    var rows = tab === 'answered' ? answered : tab === 'urgent' ? feed.filter(function (p) { return p.kind === 'urgent'; }) : feed;
    if (!rows.length) {
      box.innerHTML = '<div class="empty">' + candleSvg() +
        (tab === 'urgent' ? '지금 긴급기도는 없어요.<br>평안한 날이네요.' : tab === 'answered' ? '아직 응답받음으로 옮긴 기도가 없어요.<br>응답을 받으면 글에서 [응답받았어요]를 눌러 주세요.'
          : '아직 기도제목이 없어요.<br>아래 [기도제목 올리기]로 첫 기도를 올려 보세요.') + '</div>';
      return;
    }
    box.innerHTML = rows.map(postCard).join('');
  }
  function reactMini(p) {
    var keys = Object.keys(p.reactions || {}).filter(function (k) { return p.reactions[k] > 0; });
    if (!keys.length) return '';
    return '<span class="react-mini">' + keys.map(function (k) { return '<span>' + k + ' ' + p.reactions[k] + '</span>'; }).join('') + '</span>';
  }
  function postCard(p) {
    var urgent = p.kind === 'urgent' && p.status === 'open', ans = p.status === 'answered', fresh = freshLight === p.id; if (fresh) freshLight = null;
    return '<article class="post' + (urgent ? ' urgent' : '') + (ans ? ' answered' : '') + '" data-id="' + p.id + '">' +
      '<div class="post-head">' + (ans ? '<span class="badge answered">🙌 응답받음</span>' : urgent ? '<span class="badge urgent">🚨 긴급</span>' : '<span class="badge normal">기도제목</span>') +
      '<span class="who">' + esc(p.author_name) + ' · ' + ago(ans ? p.answered_at : p.created_at) + '</span></div>' +
      (p.for_whom ? '<h3 class="for">' + esc(p.for_whom) + '</h3>' : '') +
      '<p class="body">' + esc(p.body) + '</p>' +
      (ans && p.answer_note ? '<div class="answer">🙌 ' + esc(p.answer_note) + '</div>' : '') +
      '<div class="post-foot">' +
      '<button type="button" class="pray-btn' + (p.my_prayed ? ' on' : '') + '" data-pray="' + p.id + '">🙏 기도했어요 <b>' + p.prayed_people + '</b></button>' +
      lightsHtml(p.prayed_people, fresh) + reactMini(p) +
      '<span class="meta"><span>💬 ' + p.comment_count + '</span></span></div></article>';
  }
  $('#feed').addEventListener('click', function (e) {
    var pb = e.target.closest('[data-pray]');
    if (pb) { e.stopPropagation(); prayed(pb.dataset.pray, pb); return; }
    var card = e.target.closest('.post'); if (card) openPost(card.dataset.id);
  });
  $('#tabs').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    $$('#tabs button').forEach(function (x) { x.classList.toggle('on', x === b); });
    tab = b.dataset.tab;
    $('#pane-group').hidden = tab !== 'group'; $('#feed').hidden = tab === 'group'; $('#fab').hidden = tab === 'group';
    if (tab === 'group') renderGroupPane(); else { renderFeed(); loadFeed(true); }
    window.scrollTo({ top: 0 });
  });

  function startPoll() {
    stopPoll();
    pollT = setInterval(function () { if (document.visibilityState === 'visible') { loadFeed(true); if (openPostId) refreshOpenPost(); } }, POLL_MS);
  }
  function stopPoll() { if (pollT) clearInterval(pollT); pollT = null; }
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible' && acct && Date.now() - lastFeedAt > 5000) { loadFeed(true); if (openPostId) refreshOpenPost(); } });
  window.addEventListener('hashchange', function () { var id = hashPost(); if (id && id !== openPostId) openPost(id); });
  if ('serviceWorker' in navigator) navigator.serviceWorker.addEventListener('message', function (e) {
    if (e.data && e.data.type === 'open-url') { var u = new URL(e.data.url), m = /#p=([0-9a-f-]{36})/i.exec(u.hash); if (m) openPost(m[1]); else loadFeed(true); }
  });

  /* ── 기도했어요 ───────────────────────────────────── */
  var freshLight = null;   // 방금 켠 불빛을 반짝이게
  async function prayed(id, btn) {
    if (btn) { btn.classList.add('on'); var b = btn.querySelector('b'); bloom(btn); }
    try {
      var p = await rpc('pray_prayed', { p_token: acct.token, p_post: id });
      freshLight = id; mergePost(p);
      if (btn && b) b.textContent = p.prayed_people;
      toast(p.my_prayed === 1 ? '기도했어요 🙏 글쓴이에게 전해 드릴게요.' : '또 기도하셨네요 🙏 (' + p.my_prayed + '번째)');
      if (p.my_prayed === 1) notifyQuiet({ action: 'prayed', post_id: id });
      if (openPostId === id) renderDetail(p);
    } catch (e) { toast(e.message); }
  }
  function mergePost(p) {
    [feed, answered].forEach(function (arr) { for (var i = 0; i < arr.length; i++) if (arr[i].id === p.id) arr[i] = Object.assign({}, arr[i], p); });
    renderFeed(); renderHero();
  }

  /* ── 아래에서 올라오는 창 ───────────────────────────── */
  function sheet(o) {
    var bg = document.createElement('div'); bg.className = 'sheet-bg';
    bg.innerHTML = '<div class="sheet" role="dialog" aria-modal="true"><div class="sheet-grip"></div><div class="sheet-body">' + (o.html || '') + '</div>' +
      (o.foot ? '<div class="sheet-foot">' + o.foot + '</div>' : '') + '</div>';
    document.body.appendChild(bg);
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(function () { requestAnimationFrame(function () { bg.classList.add('open'); }); });
    function close() { document.removeEventListener('keydown', onKey); bg.classList.remove('open'); document.body.style.overflow = ''; setTimeout(function () { bg.remove(); }, 260); if (o.onClose) o.onClose(); }
    function onKey(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', onKey);
    bg.addEventListener('click', function (e) { if (e.target === bg) close(); });
    bg.close = close; bg.body = bg.querySelector('.sheet-body');
    return bg;
  }

  /* ── 글 보기 ──────────────────────────────────────── */
  var detailSheet = null, detailPost = null;
  async function openPost(id) {
    if (detailSheet) { detailSheet.close(); detailSheet = null; }
    openPostId = id;
    if (location.hash !== '#p=' + id) history.replaceState(null, '', location.pathname + location.search + '#p=' + id);
    detailSheet = sheet({ html: '<p class="empty">불러오는 중…</p>', foot: '<button type="button" class="ghost" data-close>닫기</button>',
      onClose: function () { openPostId = null; detailSheet = null; detailPost = null; leavePresence(); history.replaceState(null, '', location.pathname + location.search); } });
    detailSheet.addEventListener('click', onDetailClick);
    joinPresence(id);
    try { renderDetail(await rpc('pray_post_get', { p_token: acct.token, p_id: id })); }
    catch (e) { detailSheet.body.innerHTML = '<div class="msg err show">' + esc(e.message) + '</div>'; }
  }
  async function refreshOpenPost() {
    if (!openPostId || !detailSheet) return;
    try { var p = await rpc('pray_post_get', { p_token: acct.token, p_id: openPostId }); if (!$('textarea', detailSheet) || !$('textarea', detailSheet).value) renderDetail(p); } catch (e) {}
  }
  function names(list, max) {
    list = list || []; if (!list.length) return '';
    var head = list.slice(0, max || 6).join(', ');
    return list.length > (max || 6) ? head + ' 외 ' + (list.length - (max || 6)) + '명' : head;
  }
  function renderDetail(p) {
    if (!detailSheet) return;
    detailPost = p; mergePost(p);
    celebrateOnce(p);
    var urgent = p.kind === 'urgent' && p.status === 'open', ans = p.status === 'answered';
    var draft = $('textarea[data-cmt]', detailSheet); var keep = draft ? draft.value : '';
    detailSheet.body.innerHTML =
      '<div class="post-head">' + (ans ? '<span class="badge answered">🙌 응답받음</span>' : urgent ? '<span class="badge urgent">🚨 긴급기도</span>' : '<span class="badge normal">기도제목</span>') + '</div>' +
      (p.for_whom ? '<h2 class="title">' + esc(p.for_whom) + '</h2>' : '') +
      '<p class="byline">' + esc(p.author_name) + ' · ' + whenText(p.created_at) + (p.updated_at && p.updated_at !== p.created_at && !ans ? ' (고침)' : '') + '</p>' +
      '<div class="prose">' + esc(p.body) + '</div>' +
      (ans ? '<div class="post answered" style="cursor:default"><b>🙌 응답받았어요</b> <span class="byline">' + whenText(p.answered_at) + '</span>' + (p.answer_note ? '<div class="prose" style="margin:6px 0 0; font-size:16px">' + esc(p.answer_note) + '</div>' : '') + '</div>' : '') +
      '<div class="presence" id="presence" hidden></div>' +
      '<button type="button" class="big-pray' + (p.my_prayed ? ' on' : '') + '" data-pray="' + p.id + '">🙏 기도했어요' + (p.my_prayed ? ' <small>(' + p.my_prayed + '번)</small>' : '') + '</button>' +
      '<div class="prayed-box">' + lightsHtml(p.prayed_people) + '<span class="prayed-names">' + (p.prayed_people ? '<b>' + p.prayed_people + '명</b>이 ' + p.prayed_total + '번 기도했어요 — ' + esc(names(p.prayed_names, 8)) : '아직 불빛이 없어요. 첫 기도의 불을 켜 주세요.') + '</span></div>' +
      '<div class="emoji-row">' + EMOJI.map(function (e) {
        var n = (p.reactions || {})[e] || 0, on = (p.my_reactions || []).indexOf(e) >= 0, who = ((p.reaction_names || {})[e] || []).join(', ');
        return '<button type="button"' + (on ? ' class="on"' : '') + ' data-emoji="' + e + '" title="' + esc(who) + '">' + e + (n ? ' <b>' + n + '</b>' : '') + '</button>';
      }).join('') + '</div>' +
      '<div class="section-title">댓글 ' + (p.comments.length || '') + '</div>' +
      '<div class="comments">' + (p.comments.length ? p.comments.map(function (c) {
        return '<div class="cmt">' + (c.mine || me.role === 'leader' ? '<button type="button" class="ghost small del" data-del-cmt="' + c.id + '">지우기</button>' : '') +
          '<span class="who">' + esc(c.author_name) + '</span><span class="when">' + ago(c.created_at) + '</span><div class="text">' + esc(c.body) + '</div></div>';
      }).join('') : '<p class="byline">아직 댓글이 없어요. 짧은 한마디가 큰 힘이 됩니다.</p>') + '</div>' +
      '<div class="cmt-form"><textarea data-cmt placeholder="함께 기도합니다 🙏" maxlength="1000">' + esc(keep) + '</textarea><button type="button" class="primary" data-send-cmt>남기기</button></div>' +
      (p.can_edit ? '<div class="section-title">글 관리</div><div class="actions">' +
        (p.status === 'open' ? '<button type="button" class="small" data-answer>🙌 응답받았어요</button>' : '<button type="button" class="small" data-reopen>다시 기도 중으로</button>') +
        '<button type="button" class="small" data-share>' + (urgent ? '🚨 단톡방에 긴급 알리기' : '카톡으로 알리기') + '</button>' +
        '<button type="button" class="small" data-edit>고치기</button><button type="button" class="small danger" data-del-post>지우기</button></div>' : '');
    renderPresence();
  }
  async function onDetailClick(e) {
    var t = e.target, p = detailPost; if (!p) return;
    if (t.closest('[data-close]')) return detailSheet.close();
    var b;
    if ((b = t.closest('[data-pray]'))) { bloom(b); return prayed(b.dataset.pray, null); }
    if ((b = t.closest('[data-emoji]'))) {
      try { renderDetail(await rpc('pray_react', { p_token: acct.token, p_post: p.id, p_emoji: b.dataset.emoji })); } catch (err) { toast(err.message); }
      return;
    }
    if (t.closest('[data-send-cmt]')) {
      var ta = $('textarea[data-cmt]', detailSheet), text = ta.value.trim(); if (!text) return ta.focus();
      t.closest('button').disabled = true;
      try {
        var r = await rpc('pray_comment_add', { p_token: acct.token, p_post: p.id, p_body: text });
        ta.value = ''; renderDetail(r); toast('댓글을 남겼어요.');
        notifyQuiet({ action: 'commented', comment_id: r.comment_id });
      } catch (err) { toast(err.message); t.closest('button').disabled = false; }
      return;
    }
    if ((b = t.closest('[data-del-cmt]'))) {
      if (!confirm('이 댓글을 지울까요?')) return;
      try { renderDetail(await rpc('pray_comment_delete', { p_token: acct.token, p_id: b.dataset.delCmt })); } catch (err) { toast(err.message); }
      return;
    }
    if (t.closest('[data-answer]')) return answerSheet(p);
    if (t.closest('[data-reopen]')) {
      try { renderDetail(await rpc('pray_post_status', { p_token: acct.token, p_id: p.id, p_status: 'open', p_note: '' })); await loadFeed(true); } catch (err) { toast(err.message); }
      return;
    }
    if (t.closest('[data-share]')) return shareSheet(p, null);
    if (t.closest('[data-edit]')) return writeSheet(p);
    if (t.closest('[data-del-post]')) {
      if (!confirm('이 기도제목을 지울까요? 댓글도 함께 지워집니다.')) return;
      try { await rpc('pray_post_delete', { p_token: acct.token, p_id: p.id }); detailSheet.close(); feed = feed.filter(function (x) { return x.id !== p.id; }); answered = answered.filter(function (x) { return x.id !== p.id; }); renderFeed(); renderHero(); toast('지웠어요.'); }
      catch (err) { toast(err.message); }
    }
  }

  /* ── 지금 함께 기도하는 분 (실시간, 안 되면 조용히 넘긴다) ── */
  var presCh = null, presN = 0;
  function joinPresence(postId) {
    leavePresence();
    try {
      presCh = sb.channel('pray-post-' + postId, { config: { presence: { key: me.id } } });
      presCh.on('presence', { event: 'sync' }, function () {
        try { presN = Object.keys(presCh.presenceState()).length; } catch (e) { presN = 0; }
        renderPresence();
      });
      presCh.subscribe(function (status) { if (status === 'SUBSCRIBED') presCh.track({ name: me.name, at: Date.now() }); });
    } catch (e) { presCh = null; }
  }
  function leavePresence() { if (presCh) { try { sb.removeChannel(presCh); } catch (e) {} presCh = null; presN = 0; } }
  function renderPresence() {
    var el = detailSheet && $('#presence', detailSheet); if (!el) return;
    var others = Math.max(0, presN - 1);
    el.hidden = !others;
    el.textContent = others ? '지금 ' + others + '명이 이 기도 앞에 함께 있어요' : '';
  }

  /* ── 응답받았어요 ─────────────────────────────────── */
  function answerSheet(p) {
    var s = sheet({ html: '<h2 class="title">🙌 응답받았어요</h2><p class="desc">어떻게 응답받으셨는지 짧게 적어 주시면 모임 식구들에게 큰 격려가 됩니다. (안 적어도 돼요)</p>' +
      '<textarea id="ans-note" placeholder="예) 수술 잘 마치고 회복 중입니다. 기도해 주셔서 감사합니다." maxlength="1000"></textarea><div class="msg" id="ans-msg"></div>',
      foot: '<button type="button" class="ghost" data-c>취소</button><button type="button" class="primary" data-ok>응답받음으로 옮기기</button>' });
    s.addEventListener('click', async function (e) {
      if (e.target.closest('[data-c]')) return s.close();
      if (!e.target.closest('[data-ok]')) return;
      e.target.disabled = true;
      try {
        var r = await rpc('pray_post_status', { p_token: acct.token, p_id: p.id, p_status: 'answered', p_note: $('#ans-note', s).value });
        s.close(); var sn = seenAnswered(); sn.push(p.id); try { localStorage.setItem(LS_SEEN, JSON.stringify(sn)); } catch (e2) {} renderDetail(r); angels('기도가 응답되었어요 🙌'); await loadFeed(true);
        notifyQuiet({ action: 'answered', post_id: p.id });
      } catch (err) { say($('#ans-msg', s), err.message, 'err'); e.target.disabled = false; }
    });
  }
  // 기도 응답 — 작은 하트들이 날아오르고 금빛이 번진다 (움직임 줄이기 설정이면 글만)
  function angels(label) {
    toast(label);
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if ($('.angels')) return;
    var box = document.createElement('div'); box.className = 'angels'; box.setAttribute('aria-hidden', 'true');
    box.innerHTML = '<div class="light"></div>' + (label ? '<div class="label">' + esc(label) + '</div>' : '');
    var n = 30;   // 작은 하트들
    for (var i = 0; i < n; i++) {
      var an = document.createElement('div'); an.className = 'angel'; an.textContent = '♥';
      an.style.color = ['#e5484d', '#f76b8a', '#f5a524', '#ff8fab', '#d6336c', '#ffd166'][i % 6];
      var size = 16 + Math.random() * 20;
      an.style.fontSize = size + 'px';
      an.style.left = (Math.random() * 96) + 'vw';
      an.style.setProperty('--dx', Math.round(Math.random() * 90 - 45) + 'px');
      an.style.setProperty('--dur', (2.2 + Math.random() * 1.8).toFixed(2) + 's');
      an.style.animationDelay = (Math.random() * 1.2).toFixed(2) + 's';
      box.appendChild(an);
    }
    for (var j = 0; j < 30; j++) {
      var sp = document.createElement('i'); sp.className = 'spark';
      sp.style.left = (Math.random() * 100) + 'vw'; sp.style.top = (60 + Math.random() * 50) + 'vh';
      sp.style.setProperty('--dur', (2 + Math.random() * 2.5).toFixed(1) + 's'); sp.style.animationDelay = (Math.random() * 1.5).toFixed(2) + 's';
      sp.style.width = sp.style.height = (3 + Math.random() * 4).toFixed(0) + 'px';
      box.appendChild(sp);
    }
    document.body.appendChild(box);
    try { if (navigator.vibrate) navigator.vibrate([40, 60, 40]); } catch (e) {}
    setTimeout(function () { box.remove(); }, 5500);
  }
  // 식구가 응답된 기도를 처음 열 때도 천사가 난다 (한 글에 한 번)
  var LS_SEEN = 'jungbo-seen-answered';
  function seenAnswered() { try { return JSON.parse(localStorage.getItem(LS_SEEN) || '[]'); } catch (e) { return []; } }
  function celebrateOnce(p) {
    if (!p || p.status !== 'answered') return;
    var seen = seenAnswered(); if (seen.indexOf(p.id) >= 0) return;
    seen.push(p.id); if (seen.length > 300) seen = seen.slice(-300);
    try { localStorage.setItem(LS_SEEN, JSON.stringify(seen)); } catch (e) {}
    angels(p.author_name + '님의 기도가 응답되었어요 🙌');
  }

  /* ── 올리기 · 고치기 ───────────────────────────────── */
  function writeSheet(edit) {
    var kind = edit ? edit.kind : 'normal';
    var s = sheet({ html: '<h2 class="title">' + (edit ? '기도제목 고치기' : '기도제목 올리기') + '</h2>' +
      '<label>어떤 기도인가요?</label><div class="seg">' +
      '<button type="button" class="u' + (kind === 'urgent' ? ' on' : '') + '" data-kind="urgent">🚨 긴급<small>중환자·사고 등 지금 바로</small></button>' +
      '<button type="button" class="n' + (kind === 'normal' ? ' on' : '') + '" data-kind="normal">🙏 일반<small>꾸준히 함께 기도</small></button></div>' +
      '<p class="hint" id="kind-hint"></p>' +
      '<label for="w-for">누구를 위한 기도인가요? <span style="font-weight:400;color:var(--muted)">(선택)</span></label><input type="text" id="w-for" maxlength="60" placeholder="예) 김은혜 집사님 수술" value="' + esc(edit ? edit.for_whom : '') + '">' +
      '<label for="w-body">기도 내용</label><textarea id="w-body" maxlength="2000" placeholder="예) 내일 오전 9시 심장 수술이 있습니다. 수술이 잘 되고 회복이 빠르도록 기도 부탁드립니다.">' + esc(edit ? edit.body : '') + '</textarea>' +
      '<p class="hint">같은 모임 식구들만 봅니다. 본인 허락이 필요한 민감한 내용은 이름 대신 "한 지체"처럼 적어도 좋아요.</p><div class="msg" id="w-msg"></div>',
      foot: '<button type="button" class="ghost" data-c>취소</button><button type="button" class="primary" data-ok>' + (edit ? '고친 내용 저장' : '올리기') + '</button>' });
    function hint() {
      $('#kind-hint', s).textContent = kind === 'urgent' ? '올리면 알림을 켠 식구들 휴대폰에 바로 울립니다. 이어서 카카오톡 단톡방에도 알릴 수 있어요.' : '알림을 켠 식구들에게 조용히 알려 드립니다.';
      var ok = $('[data-ok]', s); ok.className = kind === 'urgent' ? 'urgentbtn' : 'primary';
    }
    hint();
    s.addEventListener('click', async function (e) {
      var kb = e.target.closest('[data-kind]');
      if (kb) { kind = kb.dataset.kind; $$('[data-kind]', s).forEach(function (x) { x.classList.toggle('on', x === kb); }); hint(); return; }
      if (e.target.closest('[data-c]')) return s.close();
      if (!e.target.closest('[data-ok]')) return;
      var body = $('#w-body', s).value.trim(); if (!body) { say($('#w-msg', s), '기도 내용을 적어 주세요.', 'err'); return $('#w-body', s).focus(); }
      e.target.disabled = true;
      try {
        var r = await rpc('pray_post_save', { p_token: acct.token, p_id: edit ? edit.id : null, p_kind: kind, p_for: $('#w-for', s).value, p_body: body });
        s.close();
        if (edit) { renderDetail(r); await loadFeed(true); toast('고쳤어요.'); return; }
        feed.unshift(r); renderFeed(); renderHero(); loadFeed(true);
        var n = await notifyQuiet({ action: 'posted', post_id: r.id });
        shareSheet(r, n);
      } catch (err) { say($('#w-msg', s), err.message, 'err'); e.target.disabled = false; }
    });
    setTimeout(function () { $(edit ? '#w-body' : '#w-for', s).focus(); }, 300);
  }
  $('#fab').addEventListener('click', function () { writeSheet(null); });

  /* ── 카카오톡 단톡방에 알리기 ──────────────────────────
     카카오톡에 자동으로 글을 올리는 공식 방법은 없어서, 올린 사람이 공유 창에서 단톡방을 한 번 고른다.
     공유 창이 없는 환경(카카오톡 안 브라우저·PC)에서는 글을 복사해 붙여 넣는다. */
  function shareText(p) {
    var urgent = p.kind === 'urgent' && p.status === 'open';
    var body = p.body.replace(/\s+/g, ' ').trim(); if (body.length > 160) body = body.slice(0, 160) + '…';
    return (urgent ? '🚨 긴급기도가 올라왔습니다' : '🙏 새 기도제목이 올라왔습니다') + '\n[' + group.name + ']\n' +
      (p.for_whom ? '▶ ' + p.for_whom + '\n' : '') + body + '\n\n' +
      (urgent ? '지금 함께 기도해 주세요 🙏\n' : '함께 기도해 주세요 🙏\n') +
      '아래 주소를 누르면 기도방이 열려요. [기도했어요]·댓글·이모지로 마음을 전해 주세요.\n' + postLink(p.id);
  }
  function shareSheet(p, n) {
    var urgent = p.kind === 'urgent' && p.status === 'open';
    var sent = n && !n.failed ? '<div class="msg ok show">휴대폰 알림을 보냈어요 — 알림 켠 식구 ' + (n.people || 0) + '명' + (n.skipped === 'recent' ? ' (방금 보내서 이번엔 건너뜀)' : '') + '.' +
      ((group.member_count - 1) > (n.people || 0) ? ' 알림을 안 켠 분들께는 카카오톡으로 알려 주세요.' : '') + '</div>' : '';
    var s = sheet({ html: '<h2 class="title">' + (urgent ? '🚨 단톡방에 긴급 알리기' : '카카오톡으로 알리기') + '</h2>' + sent +
      '<p class="desc">아래 단추를 누르고 <b>카카오톡 → 우리 단톡방</b>을 고르면 끝이에요. 식구들이 글을 누르면 바로 이 기도방이 열려요.</p>' +
      '<button type="button" class="' + (urgent ? 'urgentbtn' : 'primary') + ' wide" data-kakao style="font-size:18px;padding:16px">💬 카카오톡으로 보내기</button>' +
      '<div class="row" style="margin-top:10px"><button type="button" class="grow" data-copy>글만 복사하기</button></div>' +
      '<div id="share-fallback" hidden><p class="hint" style="margin-top:12px">이 화면에서는 공유 창이 열리지 않아요. 아래 글을 길게 눌러 복사한 뒤 단톡방에 붙여 넣어 주세요.</p><textarea readonly style="min-height:200px;font-size:15px">' + esc(shareText(p)) + '</textarea></div>' +
      '<div class="msg" id="share-msg"></div>',
      foot: '<button type="button" class="ghost" data-c>' + (n ? '나중에' : '닫기') + '</button>' });
    s.addEventListener('click', async function (e) {
      if (e.target.closest('[data-c]')) return s.close();
      if (e.target.closest('[data-kakao]')) {
        var text = shareText(p);
        if (navigator.share && !inApp()) {
          try { await navigator.share({ text: text }); s.close(); toast('단톡방에 보냈어요. 감사합니다.'); return; }
          catch (err) { if (err && err.name === 'AbortError') return; }
        }
        if (inApp()) { say($('#share-msg', s), '카카오톡 안에서는 바로 보내기가 안 돼요. 글을 복사했으니 단톡방에 붙여 넣어 주세요.', 'warn', true); }
        await copyText(text, s);
        return;
      }
      if (e.target.closest('[data-copy]')) return copyText(shareText(p), s);
    });
  }
  async function copyText(text, s) {
    try { await navigator.clipboard.writeText(text); say($('#share-msg', s), '복사했어요. 카카오톡 단톡방에 붙여 넣어 주세요.', 'ok', true); }
    catch (e) { $('#share-fallback', s).hidden = false; }
  }

  /* ── 초대장 ───────────────────────────────────────── */
  function inviteText() {
    return '🙏 [' + group.name + '] 중보기도 나눔터에 초대합니다\n아래 주소를 누르고 이름만 넣으면 바로 들어와요. (앱 설치·회원가입 없음)\n' + groupLink() +
      '\n\n들어온 뒤 [모임] 탭에서 알림을 켜 두시면 긴급기도가 올라올 때 휴대폰으로 바로 울려요.';
  }
  function inviteSheet(first) {
    var s = sheet({ html: '<h2 class="title">' + (first ? '모임을 만들었어요 🎉' : '식구 초대하기') + '</h2>' +
      (first ? '<p class="desc">이제 초대 주소를 단톡방에 올려 주세요. 식구들은 주소를 누르고 이름만 넣으면 들어와요.</p>' : '<p class="desc">주소를 누르고 이름만 넣으면 들어와요. 초대 코드를 불러 줘도 됩니다.</p>') +
      '<div class="code">' + esc(fmtCode(group.invite_code)) + '</div><div class="linkbox">' + esc(groupLink()) + '</div>' +
      '<div class="row" style="margin-top:12px"><button type="button" class="primary grow" data-kakao>💬 카카오톡으로 초대장 보내기</button><button type="button" data-copy>복사</button></div>' +
      '<div id="share-fallback" hidden><textarea readonly style="min-height:160px;font-size:15px;margin-top:10px">' + esc(inviteText()) + '</textarea></div><div class="msg" id="share-msg"></div>' +
      (first ? '<p class="hint" style="margin-top:14px">식구들에게는 이 주소 하나만 보내면 됩니다. 주소를 누르고 이름만 넣으면 들어와요.</p>' : ''),
      foot: '<button type="button" class="ghost" data-c>닫기</button>' });
    s.addEventListener('click', async function (e) {
      if (e.target.closest('[data-c]')) return s.close();
      if (e.target.closest('[data-kakao]')) {
        if (navigator.share && !inApp()) { try { await navigator.share({ text: inviteText() }); toast('초대장을 보냈어요.'); return; } catch (err) { if (err && err.name === 'AbortError') return; } }
        return copyText(inviteText(), s);
      }
      if (e.target.closest('[data-copy]')) return copyText(inviteText(), s);
    });
  }
  function showKeyOnce(token) {
    sheet({ html: '<h2 class="title">휴대폰을 바꿀 때 쓰는 열쇠 코드</h2><p class="desc">이 휴대폰에서는 주소만 누르면 바로 열려요. 휴대폰을 바꾸면 첫 화면 [휴대폰을 바꾸셨나요?]에 이 코드를 넣습니다. 사진으로 찍어 두세요.</p>' +
      '<div class="code">' + esc(token) + '</div>',
      foot: '<button type="button" class="primary" onclick="this.closest(\'.sheet-bg\').close()">네, 챙겼어요</button>' });
  }

  /* ── 모임 탭 ─────────────────────────────────────── */
  async function renderGroupPane() {
    var box = $('#pane-group'); box.hidden = false; $('#feed').hidden = true;
    var st = await pushState();
    var pushHtml = st === 'inapp' ? '<div class="msg warn show">카카오톡 안에서 열린 화면이라 휴대폰 알림을 켤 수 없어요. 크롬(아이폰은 사파리)으로 열어 주세요.</div><button type="button" class="wide" data-ext>크롬·사파리로 열기</button>'
      : st === 'ios-home' ? '<div class="msg warn show">아이폰은 <b>홈 화면에 추가</b>한 아이콘으로 열어야 알림이 와요.<br>사파리 아래 <b>공유(네모에 화살표)</b> → <b>홈 화면에 추가</b> → 홈 화면의 "중보기도" 아이콘으로 열고 여기서 알림을 켜 주세요.</div>'
      : st === 'unsupported' ? '<div class="msg warn show">이 브라우저는 휴대폰 알림을 지원하지 않아요. 크롬으로 열어 주세요.</div>'
      : st === 'denied' ? '<div class="msg err show">알림이 막혀 있어요. 휴대폰 설정 → 브라우저 → 알림에서 이 사이트를 허용한 뒤 다시 눌러 주세요.</div><button type="button" class="wide" data-push-on>다시 시도</button>'
      : st === 'on' ? '<div class="msg ok show">알림이 켜져 있어요. 긴급기도가 올라오면 바로 울립니다.</div><div class="row"><button type="button" class="grow" data-push-test>시험 알림 보내기</button><button type="button" class="ghost" data-push-off>끄기</button></div>'
      : '<button type="button" class="primary wide" data-push-on style="font-size:18px;padding:16px">🔔 알림 켜기</button><p class="hint">켜 두면 긴급기도·댓글·"기도했어요"를 휴대폰 알림으로 받아요. 언제든 끌 수 있어요.</p>';
    var members = [];
    try { members = await rpc('pray_members', { p_token: acct.token }); } catch (e) {}
    var leader = me.role === 'leader';
    box.innerHTML =
      '<div class="card"><h2>🔔 휴대폰 알림</h2><p class="desc">카카오톡과 별개로, 이 앱이 직접 보내는 알림이에요. 알림 켠 분 ' + (group.push_count || 0) + '명 / ' + group.member_count + '명</p>' + pushHtml + '<div class="msg" id="push-msg"></div></div>' +
      '<div class="card"><h2>식구 초대</h2><p class="desc">초대 코드 <b class="code" style="display:inline;padding:2px 8px;font-size:16px">' + esc(fmtCode(group.invite_code)) + '</b></p>' +
      '<div class="row"><button type="button" class="primary grow" data-invite>💬 초대장 보내기 · 주소 복사</button></div></div>' +
      '<div class="card"><h2>함께 기도하는 분들 <span style="font-size:15px;color:var(--muted)">' + members.length + '명</span></h2>' +
      members.map(function (m) {
        return '<div class="member"><span class="dot' + (m.push ? ' on' : '') + '" title="' + (m.push ? '알림 켬' : '알림 안 켬') + '"></span><span class="nm">' + esc(m.name) + (m.id === me.id ? ' (나)' : '') + '</span>' +
          (m.role === 'leader' ? '<span class="role">인도자</span>' : '') + '<span class="last">' + (m.last_seen_at ? ago(m.last_seen_at) : '') + '</span>' +
          (leader && m.id !== me.id ? '<button type="button" class="ghost small" data-role="' + m.id + '" data-to="' + (m.role === 'leader' ? 'member' : 'leader') + '">' + (m.role === 'leader' ? '인도자 해제' : '인도자로') + '</button><button type="button" class="ghost small danger" data-remove="' + m.id + '" data-nm="' + esc(m.name) + '">빼기</button>' : '') + '</div>';
      }).join('') + '<p class="hint">초록 점 = 휴대폰 알림을 켠 분. 안 켠 분께는 긴급기도를 카카오톡으로 따로 알려 주세요.</p></div>' +
      '<div class="card"><h2>내 정보</h2><div class="row"><span class="grow">이름: <b>' + esc(me.name) + '</b></span><button type="button" class="small" data-rename>이름 바꾸기</button></div>' +
      '<div class="row" style="margin-top:10px"><span class="grow">휴대폰을 바꿀 때 쓰는 열쇠 코드</span><button type="button" class="small" data-show-key>보기</button><button type="button" class="ghost small" data-new-key>새로 받기</button></div>' +
      '<div class="row" style="margin-top:10px"><span class="grow">여러 모임에 들어가 있나요?</span><button type="button" class="small" data-switch>다른 모임</button></div></div>' +
      (leader ? '<div class="card"><h2>인도자 설정</h2><label for="g-name">모임 이름</label><div class="row"><input type="text" id="g-name" class="grow" style="width:auto" maxlength="40" value="' + esc(group.name) + '"><button type="button" class="small" data-gname>저장</button></div>' +
        '<label class="toggle" style="margin-top:14px"><input type="checkbox" data-join-open' + (group.settings && group.settings.join_open === false ? '' : ' checked') + '> 초대 주소로 새 식구 받기</label><p class="hint">식구가 다 들어온 뒤 끄면, 주소가 퍼져도 모르는 사람이 못 들어와요.</p>' +
        '<div class="row" style="margin-top:10px"><button type="button" class="ghost small" data-invite-new>초대 코드 새로 만들기</button></div><div class="msg" id="g-msg"></div></div>' : '') +
      '<div class="card"><h2>그 밖에</h2><div class="row"><button type="button" class="grow" data-print>🖨 주보용 인쇄 · PDF</button></div>' +
      '<div class="row" style="margin-top:10px"><button type="button" class="ghost danger grow" data-leave>이 모임 나가기</button></div></div>' +
      '<p class="foot">중보기도 나눔터 · 올린 글은 같은 모임 식구들만 봅니다</p>';
  }
  $('#pane-group').addEventListener('click', async function (e) {
    var t = e.target, b, s = $('#pane-group');
    if (t.closest('[data-ext]')) return openExternal();
    if (t.closest('[data-push-on]')) {
      t.closest('button').disabled = true;
      try { await pushEnable(); toast('알림을 켰어요 🔔'); await refreshMe(); renderGroupPane(); }
      catch (err) { say($('#push-msg', s), err.message, 'err', true); t.closest('button').disabled = false; }
      return;
    }
    if (t.closest('[data-push-off]')) { try { await pushDisable(); toast('알림을 껐어요.'); await refreshMe(); renderGroupPane(); } catch (err) { say($('#push-msg', s), err.message, 'err'); } return; }
    if (t.closest('[data-push-test]')) {
      t.closest('button').disabled = true;
      try { var r = await pushTest(); say($('#push-msg', s), r.sent ? '시험 알림을 보냈어요. 잠시 뒤 휴대폰 위쪽을 확인해 보세요.' : '서버에서는 보냈지만 이 기기 등록을 못 찾았어요. 알림을 껐다 다시 켜 주세요. (' + (r.code || 0) + ')', r.sent ? 'ok' : 'warn', true); }
      catch (err) { say($('#push-msg', s), err.message, 'err', true); }
      t.closest('button').disabled = false; return;
    }
    if (t.closest('[data-invite]')) return inviteSheet(false);
    if ((b = t.closest('[data-remove]'))) {
      if (!confirm(b.dataset.nm + '님을 모임에서 뺄까요? 그분의 열쇠 코드는 더 이상 쓸 수 없게 됩니다.')) return;
      try { await rpc('pray_member_remove', { p_token: acct.token, p_member: b.dataset.remove }); await refreshMe(); renderGroupPane(); toast('뺐어요.'); } catch (err) { toast(err.message); }
      return;
    }
    if ((b = t.closest('[data-role]'))) {
      try { await rpc('pray_member_role', { p_token: acct.token, p_member: b.dataset.role, p_role: b.dataset.to }); renderGroupPane(); } catch (err) { toast(err.message); }
      return;
    }
    if (t.closest('[data-rename]')) {
      var nm = prompt('새 이름을 적어 주세요.', me.name); if (nm == null || !nm.trim()) return;
      try { var d = await rpc('pray_member_rename', { p_token: acct.token, p_name: nm }); me = d.me; group = d.group; acct = accountFrom(d, acct.token); upsertAccount(acct); renderTop(); renderHero(); renderGroupPane(); toast('이름을 바꿨어요.'); } catch (err) { toast(err.message); }
      return;
    }
    if (t.closest('[data-show-key]')) return showKeyOnce(acct.token);
    if (t.closest('[data-new-key]')) {
      if (!confirm('열쇠 코드를 새로 받으면 예전 코드는 못 씁니다. 다른 기기에 들어가 있던 것도 풀립니다. 계속할까요?')) return;
      try { var k = await rpc('pray_new_key', { p_token: acct.token }); acct.token = k.token; upsertAccount(acct); showKeyOnce(k.token); } catch (err) { toast(err.message); }
      return;
    }
    if (t.closest('[data-switch]')) return switchSheet();
    if (t.closest('[data-gname]')) {
      try { var d2 = await rpc('pray_group_update', { p_token: acct.token, p_name: $('#g-name', s).value, p_settings: null }); me = d2.me; group = d2.group; acct = accountFrom(d2, acct.token); upsertAccount(acct); renderTop(); say($('#g-msg', s), '모임 이름을 저장했어요.', 'ok'); } catch (err) { say($('#g-msg', s), err.message, 'err'); }
      return;
    }
    if ((b = t.closest('[data-join-open]'))) {
      try { var d3 = await rpc('pray_group_update', { p_token: acct.token, p_name: '', p_settings: { join_open: b.checked } }); group = d3.group; say($('#g-msg', s), b.checked ? '초대 주소로 새 식구를 받아요.' : '새 가입을 닫았어요. 기존 식구는 그대로 써요.', 'ok'); } catch (err) { say($('#g-msg', s), err.message, 'err'); b.checked = !b.checked; }
      return;
    }
    if (t.closest('[data-invite-new]')) {
      if (!confirm('초대 코드를 새로 만들면 예전 초대 주소는 못 씁니다. 이미 들어온 식구는 그대로예요. 계속할까요?')) return;
      try { var d4 = await rpc('pray_invite_new', { p_token: acct.token }); group = d4.group; acct = accountFrom(d4, acct.token); upsertAccount(acct); history.replaceState(null, '', location.pathname + '?g=' + acct.code); renderGroupPane(); toast('새 초대 코드를 만들었어요.'); } catch (err) { toast(err.message); }
      return;
    }
    if (t.closest('[data-print]')) return printSheet();
    if (t.closest('[data-leave]')) {
      if (!confirm('「' + group.name + '」에서 나갈까요? 올린 글은 남고, 이 기기에서 모임이 지워집니다.')) return;
      try { await rpc('pray_leave', { p_token: acct.token }); try { await pushDisable(); } catch (e2) {} dropAccount(acct.group_id); history.replaceState(null, '', location.pathname); q = new URLSearchParams(''); toast('나갔어요.'); main(); } catch (err) { toast(err.message); }
    }
  });
  async function refreshMe() { try { var d = await rpc('pray_me', { p_token: acct.token }); me = d.me; group = d.group; acct = accountFrom(d, acct.token); upsertAccount(acct); renderTop(); renderHero(); } catch (e) {} }
  $('#btn-menu').addEventListener('click', function (e) { e.stopPropagation(); var p = $('#menu-pop'); p.hidden = !p.hidden; this.setAttribute('aria-expanded', p.hidden ? 'false' : 'true'); });
  document.addEventListener('click', function (e) { if (!e.target.closest('#menu-pop')) $('#menu-pop').hidden = true; });
  $('#menu-pop').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return; $('#menu-pop').hidden = true;
    if (b.dataset.act === 'refresh') { loadFeed(); toast('새로 고쳤어요.'); }
    if (b.dataset.act === 'group') $('#tabs button[data-tab="group"]').click();
    if (b.dataset.act === 'print') printSheet();
    if (b.dataset.act === 'sky') { toggleSky(); renderHero(); }
    if (b.dataset.act === 'switch') switchSheet();
  });
  function switchSheet() {
    var list = loadAccounts();
    var s = sheet({ html: '<h2 class="title">다른 모임</h2><p class="desc">이 기기에서 들어가 있는 모임이에요.</p>' +
      list.map(function (a) { return '<div class="member"><span class="nm">' + esc(a.group_name) + '<br><span class="last">' + esc(a.name) + (a.role === 'leader' ? ' · 인도자' : '') + '</span></span>' + (a.group_id === acct.group_id ? '<span class="role">지금</span>' : '<button type="button" class="small" data-go="' + esc(a.code) + '">열기</button>') + '</div>'; }).join('') +
      '<div class="row" style="margin-top:14px"><button type="button" class="grow" data-other>다른 모임에 들어가기 · 새 모임 만들기</button></div>',
      foot: '<button type="button" class="ghost" data-c>닫기</button>' });
    s.addEventListener('click', function (e) {
      if (e.target.closest('[data-c]')) return s.close();
      var g = e.target.closest('[data-go]'); if (g) { location.href = location.pathname + '?g=' + g.dataset.go; return; }
      if (e.target.closest('[data-other]')) { s.close(); stopPoll(); history.replaceState(null, '', location.pathname); q = new URLSearchParams(''); enterScreen(); }
    });
  }

  /* ── 주보용 인쇄 ─────────────────────────────────── */
  async function printSheet() {
    if (inApp()) { if (confirm('카카오톡 안에서는 인쇄·PDF 저장이 되지 않습니다. 크롬(아이폰은 사파리)으로 열까요?')) openExternal(); return; }
    var rows = feed.slice(), today = new Date();
    $('#print-area').innerHTML = '<h1>' + esc(group.name) + ' 기도제목</h1><p class="m">' + today.getFullYear() + '년 ' + (today.getMonth() + 1) + '월 ' + today.getDate() + '일 · ' + rows.length + '건</p>' +
      rows.map(function (p) { return '<div class="pitem">' + (p.kind === 'urgent' ? '<span class="u">[긴급] </span>' : '') + (p.for_whom ? '<b>' + esc(p.for_whom) + '</b>' : '') + '<span>' + esc(p.body.replace(/\s+/g, ' ')) + '</span> <span class="m">— ' + esc(p.author_name) + ', ' + whenText(p.created_at) + '</span></div>'; }).join('');
    setTimeout(function () { window.print(); }, 100);
  }

  /* ── 휴대전화 알림 (웹 푸시) ──────────────────────────
     안드로이드 크롬은 바로 된다. 아이폰은 '홈 화면에 추가'한 아이콘으로 열어야 된다(iOS 16.4+). */
  function isIOS() { return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); }
  function standalone() { return (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true; }
  function pushSupported() { return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window; }
  function inApp() { return /KAKAOTALK|NAVER\(inapp|Instagram|FBAN|FBAV|Line\/|DaumApps|; wv\)/i.test(navigator.userAgent); }
  function openExternal() {
    var url = location.href.replace(/#.*$/, '');
    if (/KAKAOTALK/i.test(navigator.userAgent)) { location.href = 'kakaotalk://web/openExternal?url=' + encodeURIComponent(url); return; }
    if (/android/i.test(navigator.userAgent)) { location.href = 'intent://' + url.replace(/^https?:\/\//, '') + '#Intent;scheme=https;package=com.android.chrome;end'; return; }
    alert('오른쪽 위(또는 아래) 메뉴에서 [Safari로 열기]를 눌러 주세요.');
  }
  function urlB64(s) {
    var pad = '='.repeat((4 - s.length % 4) % 4), raw = atob((s + pad).replace(/-/g, '+').replace(/_/g, '/')), out = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }
  async function pushState() {
    if (inApp()) return 'inapp';
    if (!pushSupported()) return isIOS() && !standalone() ? 'ios-home' : 'unsupported';
    if (Notification.permission === 'denied') return 'denied';
    var reg = await navigator.serviceWorker.getRegistration('./');
    var sub = reg && await reg.pushManager.getSubscription();
    return sub ? 'on' : 'off';
  }
  async function pushEnable() {
    var perm = await Notification.requestPermission();
    if (perm !== 'granted') throw new Error(perm === 'denied' ? '알림이 막혀 있습니다. 브라우저 설정에서 이 사이트 알림을 허용해 주세요.' : '알림 허용을 눌러 주셔야 받을 수 있습니다.');
    var reg = await navigator.serviceWorker.register('sw.js', { scope: './' });
    await navigator.serviceWorker.ready;
    var sub = await reg.pushManager.getSubscription() ||
      await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64((await notify({ action: 'key' })).publicKey) });
    var j = sub.toJSON();
    await rpc('pray_push_save', { p_token: acct.token, p_endpoint: j.endpoint, p_p256dh: j.keys.p256dh, p_auth: j.keys.auth, p_ua: navigator.userAgent.slice(0, 200) });
    try { localStorage.setItem(LS_NUDGE, 'done'); } catch (e) {}
    $('#push-nudge').hidden = true;
  }
  async function pushDisable() {
    var reg = await navigator.serviceWorker.getRegistration('./');
    var sub = reg && await reg.pushManager.getSubscription();
    if (!sub) return;
    await rpc('pray_push_delete', { p_token: acct.token, p_endpoint: sub.endpoint });
    await sub.unsubscribe();
  }
  async function pushTest() {
    var reg = await navigator.serviceWorker.getRegistration('./');
    var sub = reg && await reg.pushManager.getSubscription();
    var r = await notify({ action: 'test', endpoint: sub ? sub.endpoint : '' });
    if (sub && !r.devices) { await pushEnable(); r = await notify({ action: 'test', endpoint: sub.endpoint }); }
    return { sent: r.sent || 0, devices: r.devices || 0, code: (r.codes || [])[0] || 0 };
  }
  // 알림을 아직 안 켠 분에게 첫 화면에서 한 번 권한다
  async function pushNudge() {
    var done = ''; try { done = localStorage.getItem(LS_NUDGE) || ''; } catch (e) {}
    var st = await pushState();
    var el = $('#push-nudge');
    if (st === 'on' || done === 'done') { el.hidden = true; return; }
    el.innerHTML = (st === 'inapp' ? '카카오톡 안에서 열렸어요. <b>긴급기도 알림</b>을 받으려면 크롬(아이폰은 사파리)으로 여세요. <button type="button" class="small" data-ext>크롬·사파리로 열기</button>'
      : st === 'ios-home' ? '아이폰은 <b>홈 화면에 추가</b>해야 긴급기도 알림이 와요. 사파리 공유 단추 → 홈 화면에 추가. <button type="button" class="small ghost" data-later>알겠어요</button>'
      : st === 'off' ? '🔔 <b>긴급기도 알림</b>을 켜 두시면 중요한 기도를 놓치지 않아요. <button type="button" class="small primary" data-on>알림 켜기</button> <button type="button" class="small ghost" data-later>나중에</button>'
      : '');
    el.hidden = !el.innerHTML;
    el.onclick = async function (e) {
      if (e.target.closest('[data-ext]')) return openExternal();
      if (e.target.closest('[data-later]')) { try { localStorage.setItem(LS_NUDGE, 'done'); } catch (e2) {} el.hidden = true; }
      if (e.target.closest('[data-on]')) { try { await pushEnable(); toast('알림을 켰어요 🔔'); await refreshMe(); } catch (err) { toast(err.message); } }
    };
  }

  // 시작
  main();
})();
