/* 다락방 나눔터 — 모든 화면이 함께 쓰는 것들 (여러 교회가 함께 쓴다)
   목장 나눔터(../gajeong)를 복사해 따로 만든 앱. 같은 서버를 쓰고, 순장 스스로 가입(darak-admin)이 더 있다. */
window.CHURCH = (function () {
  var SB_URL = 'https://dxhmprqfgigljgbstqrg.supabase.co';
  // 아래 키는 브라우저에 드러나도 되는 공개 키다. 실제 보호는 데이터베이스 RLS가 한다.
  var SB_KEY = 'sb_publishable__FXGut04uxuz44s2443_8g_AByEuL-n';
  var FN = SB_URL + '/functions/v1/';
  var DOMAIN = 'gajeong.local';
  // 웹 푸시 공개키 (비밀키는 서버 함수에만 있다)
  var LS_CHURCH = 'darak-church';   // (로그인 화면용) 마지막으로 본 교회
  var LS_MINE = 'darak-my-church';  // (목사·목자 화면용) 로그인한 내 교회   // 마지막으로 들어간 교회 — 다음 로그인 화면에 이름·로고를 보여 준다
  var NEUTRAL_ICON = 'assets/icon-192.png';

  /* ── 화면 언어 ─────────────────────────────────────────────
     화면 글자는 한국어로 써 두고, 고른 언어의 사전(lang-<코드>.js → window.I18N[코드])에서 찾아 바꾼다.
     사전에 없는 글은 한국어로 둔다. 언어를 더하려면 사전 파일 하나를 더하고 LANGS에 한 줄 넣으면 된다. */
  var LANGS = [{ id: 'ko', name: '한국어' }, { id: 'en', name: 'English' }];
  var LS_LANG = 'darak-lang';
  var LANG = (function () {
    var v = ''; try { v = localStorage.getItem(LS_LANG) || ''; } catch (e) {}
    return LANGS.some(function (x) { return x.id === v; }) ? v : 'ko';
  })();
  var DICT = (window.I18N && window.I18N[LANG]) || {};
  document.documentElement.setAttribute('lang', LANG);
  async function setLang(id) {
    try { localStorage.setItem(LS_LANG, id); } catch (e) {}
    // 알림을 켜 둔 기기면 알림 글도 새 언어로 오게 서버에 알려 둔다
    try {
      var reg = 'serviceWorker' in navigator && await navigator.serviceWorker.getRegistration('./');
      var sub = reg && await reg.pushManager.getSubscription();
      if (sub && (await sb.auth.getSession()).data.session) {
        var j = sub.toJSON();
        await sb.rpc('church_push_save2', { p_endpoint: j.endpoint, p_p256dh: j.keys.p256dh, p_auth: j.keys.auth,
          p_ua: navigator.userAgent.slice(0, 200), p_lang: id });
      }
    } catch (e) {}
    location.reload();
  }

  var sb = window.supabase.createClient(SB_URL, SB_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: 'darak-auth' }
  });

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function say(el, text, kind, keep) {
    if (!el) return;
    el.textContent = text;
    el.className = 'msg show ' + (kind || 'ok');
    if (kind !== 'err' && !keep) setTimeout(function () { el.className = 'msg'; }, 4000);
  }

  /* ── 날짜 (교회가 있는 곳의 현지 시각 기준) ─────────────
     교회마다 시간대를 정해 두고, 들어오면 그 교회 시간대로 '이번 주'를 센다.
     서머타임이 해마다 바뀌므로 시차를 숫자로 박지 않고 표준 시간대 이름을 쓴다. */
  var TZ = 'Australia/Melbourne';
  function setTimezone(tz) {
    try { new Intl.DateTimeFormat('en', { timeZone: tz }); TZ = tz; } catch (e) { /* 모르는 이름이면 그대로 */ }
  }
  function timezone() { return TZ; }
  function today() {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(new Date());
  }
  function ymd(d) { return d.toISOString().slice(0, 10); }
  function mondayOf(dateStr) {
    var d = new Date((dateStr || today()) + 'T00:00:00Z');
    var back = (d.getUTCDay() + 6) % 7;  // 월요일까지 되돌아갈 날 수
    d.setUTCDate(d.getUTCDate() - back);
    return ymd(d);
  }
  function addWeeks(weekStart, n) {
    var d = new Date(weekStart + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + n * 7);
    return ymd(d);
  }
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function weekLabel(weekStart) {
    var a = new Date(weekStart + 'T00:00:00Z');
    var b = new Date(weekStart + 'T00:00:00Z'); b.setUTCDate(b.getUTCDate() + 6);
    var m = a.getUTCMonth() + 1, d1 = a.getUTCDate(), m2 = b.getUTCMonth() + 1, d2 = b.getUTCDate();
    if (LANG === 'en') return MON[m - 1] + ' ' + d1 + ' – ' + MON[m2 - 1] + ' ' + d2 + ', ' + b.getUTCFullYear();
    return a.getUTCFullYear() + '년 ' + m + '월 ' + d1 + '일 ~ ' + m2 + '월 ' + d2 + '일';
  }
  function weekShort(weekStart) {
    var a = new Date(weekStart + 'T00:00:00Z');
    if (LANG === 'en') return 'Week of ' + MON[a.getUTCMonth()] + ' ' + a.getUTCDate();
    return (a.getUTCMonth() + 1) + '월 ' + a.getUTCDate() + '일 주';
  }
  function whenText(iso) {
    if (!iso) return '';
    var p = {};
    new Intl.DateTimeFormat('en-GB', {
      timeZone: TZ, month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false
    }).formatToParts(new Date(iso)).forEach(function (x) { p[x.type] = x.value; });
    if (LANG === 'en') return MON[+p.month - 1] + ' ' + p.day + ', ' + p.hour + ':' + p.minute;
    return p.month + '월 ' + p.day + '일 ' + p.hour + ':' + p.minute;
  }

  /* 교회 시간대 고르기 — 자주 쓰는 곳 + 이 기기 시간대 */
  var TZ_CHOICES = [
    ['Australia/Melbourne', '호주 멜번'], ['Australia/Sydney', '호주 시드니'], ['Australia/Brisbane', '호주 브리즈번'],
    ['Australia/Adelaide', '호주 애들레이드'], ['Australia/Perth', '호주 퍼스'], ['Pacific/Auckland', '뉴질랜드'],
    ['Asia/Seoul', '한국'], ['Asia/Tokyo', '일본'], ['Asia/Singapore', '싱가포르'], ['Asia/Manila', '필리핀'],
    ['Asia/Ho_Chi_Minh', '베트남'], ['America/Los_Angeles', '미국 서부'], ['America/Chicago', '미국 중부'],
    ['America/New_York', '미국 동부'], ['America/Vancouver', '캐나다 서부'], ['America/Toronto', '캐나다 동부'],
    ['Europe/London', '영국'], ['Europe/Berlin', '독일·유럽 중부']
  ];
  function deviceTimezone() { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { return ''; } }
  function fillTimezones(sel, current) {
    var dev = deviceTimezone(), list = TZ_CHOICES.slice();
    if (dev && !list.some(function (x) { return x[0] === dev; })) list.unshift([dev, '이 기기 시간대']);
    if (current && !list.some(function (x) { return x[0] === current; })) list.unshift([current, '지금 설정']);
    sel.innerHTML = list.map(function (x) {
      return '<option value="' + esc(x[0]) + '">' + esc(t(x[1])) + ' (' + esc(x[0]) + ')</option>';
    }).join('');
    sel.value = current || dev || 'Australia/Melbourne';
  }

  /* ── 교회마다 부르는 말 (목장·목자·목원 → 다락방·순장·순원 …) ─────────
     화면 글자는 '목장/목자/목원'으로 써 두고, 교회 설정에 따라 바꿔 보여 준다.
     받침이 달라지면 조사(이/가, 을/를, 은/는, 과/와, 으로/로)도 맞춘다. 사람이 쓴 글(일기·이름)은 바꾸지 않는다. */
  var BASE_TERMS = { unit: '목장', leader: '목자', member: '목원' };   // 화면 글자에 써 둔 말
  var DEFAULT_TERMS = { unit: '다락방', leader: '순장', member: '순원' };   // 다락방 앱: 교회가 따로 안 정했으면 이 말로
  var TERM_PRESETS = [
    { unit: '목장', leader: '목자', member: '목원' },
    { unit: '다락방', leader: '순장', member: '순원' },
    { unit: '구역', leader: '구역장', member: '구역원' },
    { unit: '셀', leader: '리더', member: '셀원' },
    { unit: '순', leader: '순장', member: '순원' }
  ];
  var terms = DEFAULT_TERMS;
  function cleanTerms(x) {
    var o = {};
    ['unit', 'leader', 'member'].forEach(function (k) {
      var v = x && typeof x[k] === 'string' ? x[k].trim().slice(0, 8) : '';
      o[k] = /^[가-힣A-Za-z0-9 ]+$/.test(v) ? v : DEFAULT_TERMS[k];
    });
    return o;
  }
  function batchim(word) {   // 0: 받침 없음, 1: 받침(ㄹ 아님), 2: ㄹ 받침
    var c = word.charCodeAt(word.length - 1);
    if (c < 0xAC00 || c > 0xD7A3) return /[136780lmnr]$/i.test(word) ? 1 : 0;
    var j = (c - 0xAC00) % 28;
    return j === 0 ? 0 : j === 8 ? 2 : 1;
  }
  function josa(word, j) {
    var b = batchim(word);
    switch (j) {
      case '이': case '가': return b ? '이' : '가';
      case '을': case '를': return b ? '을' : '를';
      case '은': case '는': return b ? '은' : '는';
      case '과': case '와': return b ? '과' : '와';
      case '으로': case '로': return b === 1 ? '으로' : '로';
    }
    return j;
  }
  var TERM_RE = /(목장|목자|목원)(으로|로|이|가|을|를|은|는|과|와)?/g;
  function lookup(str) {
    if (Object.prototype.hasOwnProperty.call(DICT, str)) return DICT[str];
    var m = /^(\s*)([\s\S]*?)(\s*)$/.exec(str), core = m[2].replace(/\s+/g, ' ');
    if (core && Object.prototype.hasOwnProperty.call(DICT, core)) return m[1] + DICT[core] + m[3];
    return null;
  }
  function termed(str) {
    if (terms === BASE_TERMS) return str;
    return str.replace(TERM_RE, function (m, w, j) {
      var y = terms[w === '목장' ? 'unit' : w === '목자' ? 'leader' : 'member'];
      return y + (j ? josa(y, j) : '');
    });
  }
  function fill(str, args) {
    return args.length ? str.replace(/\{(\d)\}/g, function (m, i) { return args[+i] == null ? '' : String(args[+i]); }) : str;
  }
  // t('글', 값0, 값1…) — 고른 언어로 바꾸고, 교회 부르는 말을 입히고, {0}{1}…에 값을 넣는다
  function t(str) {
    str = String(str);
    var args = Array.prototype.slice.call(arguments, 1);
    if (LANG !== 'ko') { var x = lookup(str); if (x != null) return fill(x, args); }
    return fill(termed(str), args);
  }
  // 화면에 원래 있던 글자(HTML)만 바꾼다. 원문을 기억해 두어 다시 바꿔도 처음 글에서 시작한다.
  // 처음 한 번 화면에 있던 글자만 기억한다. 그 뒤에 그려지는 자료(사람이 쓴 글)는 건드리지 않는다.
  var ORIG = typeof WeakMap === 'function' ? new WeakMap() : null, sealed = false;
  function translatePage(root) {
    if (!ORIG) return;
    var first = !sealed; sealed = true;
    var w = document.createTreeWalker(root || document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        var p = n.parentNode;
        if (!p || /^(SCRIPT|STYLE|TEXTAREA)$/.test(p.nodeName)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var n;
    while ((n = w.nextNode())) {
      if (!ORIG.has(n)) { if (!first || !/[가-힣]/.test(n.nodeValue)) continue; ORIG.set(n, n.nodeValue); }
      var noterm = n.parentNode.closest && n.parentNode.closest('[data-noterm]');
      n.nodeValue = noterm ? (LANG !== 'ko' && lookup(ORIG.get(n)) != null ? lookup(ORIG.get(n)) : ORIG.get(n)) : t(ORIG.get(n));
    }
    $$('[placeholder],[title],[aria-label]', root || document.body).forEach(function (el) {
      ['placeholder', 'title', 'aria-label'].forEach(function (a) {
        var v = el.getAttribute(a); if (v == null) return;
        var k = 'data-orig-' + a;
        if (!el.hasAttribute(k)) { if (!first || !/[가-힣]/.test(v)) return; el.setAttribute(k, v); }
        el.setAttribute(a, t(el.getAttribute(k)));
      });
    });
    if (!document.documentElement.hasAttribute('data-orig-title')) document.documentElement.setAttribute('data-orig-title', document.title);
    document.title = t(document.documentElement.getAttribute('data-orig-title'));
  }
  function setTerms(x) {
    var c = cleanTerms(x);
    terms = (c.unit === BASE_TERMS.unit && c.leader === BASE_TERMS.leader && c.member === BASE_TERMS.member) ? BASE_TERMS : c;
  }

  /* ── 교회마다 디자인 ─────────────────────────────────── */
  var THEMES = [
    { id: 'note', name: '묵상 노트', desc: '미색 종이 · 상록 · 명조', colors: ['#f5f1e8', '#1f4d3b', '#a77a2a'] },
    { id: 'sky', name: '맑은 하늘', desc: '흰 바탕 · 파랑 · 또렷한 글씨', colors: ['#eef3f8', '#0b57a4', '#c9650f'] },
    { id: 'night', name: '밤 기도', desc: '어두운 화면 · 금빛', colors: ['#121517', '#1a1e21', '#d6b36e'] }
  ];
  var THEME_COLOR = { note: '#1f4d3b', sky: '#0b57a4', night: '#15191b' };
  function setTheme(id) {
    if (!THEME_COLOR[id]) id = 'note';
    document.documentElement.setAttribute('data-theme', id);
    var m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute('content', THEME_COLOR[id]);
  }
  // 교회의 모양(디자인 + 부르는 말)을 화면에 입힌다
  function applyLook(c) {
    setTheme(c && c.theme);
    setTerms(c && c.terms);
    setAppIcon(c);
    translatePage();
  }
  // 홈 화면에 추가할 때 교회 로고·이름으로 — 교회 주소 폴더(/코드/)의 manifest·아이콘 (GitHub Actions가 만들어 둠)
  function setAppIcon(c) {
    return;   // 다락방 앱은 앱 자체 아이콘(manifest)을 쓴다
    if (!c || !/^[a-z0-9-]{2,40}$/.test(c.slug || '') || !c.logo_url) return;
    var base = new URL(c.slug + '/', document.baseURI).href;
    var m = document.querySelector('link[rel="manifest"]'); if (m) m.href = base + 'manifest.webmanifest';
    var a = document.querySelector('link[rel="apple-touch-icon"]'); if (a) a.href = base + 'icon-180.png';
    var t = document.querySelector('meta[name="apple-mobile-web-app-title"]'); if (t && c.name) t.setAttribute('content', c.name);
  }

  /* ── 교회 ────────────────────────────────────────────── */
  var church = null;
  function logoOf(c) { return (c && c.logo_url) ? c.logo_url : NEUTRAL_ICON; }
  function rememberChurch(c) {
    try {
      localStorage.setItem(LS_CHURCH, JSON.stringify({ slug: c.slug, name: c.name, logo_url: c.logo_url || '',
        theme: c.theme || 'note', terms: c.terms || {} }));
    } catch (e) {}
  }
  function rememberedChurch() {
    try { return JSON.parse(localStorage.getItem(LS_CHURCH) || 'null'); } catch (e) { return null; }
  }
  async function loadChurch() {
    var r = await sb.from('church_church').select('id, slug, name, timezone, logo_url, theme, terms, features').maybeSingle();
    if (r.error || !r.data) return null;
    church = r.data;
    setTimezone(church.timezone);
    rememberChurch(church);
    try { localStorage.setItem(LS_MINE, localStorage.getItem(LS_CHURCH)); } catch (e) {}
    applyLook(church);
    return church;
  }
  // 로그인 전: 주소의 ?c=… 또는 이 기기가 기억하는 교회의 이름·로고
  async function publicChurch() {
    var slug = new URLSearchParams(location.search).get('c');
    if (!slug) {
      var mem = rememberedChurch();
      return mem && mem.slug ? mem : null;
    }
    var r = await sb.rpc('church_public_church', { p_slug: slug });
    var row = r.data && r.data[0];
    if (!row) return null;
    var c = { slug: slug, name: row.name, logo_url: row.logo_url, theme: row.theme, terms: row.terms };
    rememberChurch(c);   // 다음에 열 때는 서버 답을 기다리지 않고 바로 그린다
    return c;
  }
  // 교회 전용 주소 /코드/ — 카카오톡 미리보기에 교회 이름·로고가 뜬다 (GitHub Actions가 만들어 둠, 없으면 404.html이 넘겨 줌)
  function churchLink(c) {
    return new URL('./?c=' + encodeURIComponent(c.slug), document.baseURI).href;   // 다락방 앱 첫 화면 + 교회 코드
  }

  /* ── 계정 ────────────────────────────────────────────── */
  function emailOf(loginId) { return String(loginId).trim().toLowerCase() + '@' + DOMAIN; }

  async function signIn(loginId, password) {
    var r = await sb.auth.signInWithPassword({ email: emailOf(loginId), password: password });
    if (r.error) {
      var m = r.error.message || '';
      if (/invalid login|credentials/i.test(m)) throw new Error(t('아이디나 비밀번호가 맞지 않습니다.'));
      throw new Error(m);
    }
    return r.data;
  }

  // 비밀번호 없이 쓰는 목자(순장) 계정 — 서버(darak-admin)가 k_로 시작하는 아이디로 만든다
  function isKeyless(p) { return !!(p && /^k_/.test(p.login_id || '')); }
  var lastMe = null;
  async function signOut() {
    if (isKeyless(lastMe) && !confirm(t('로그아웃하면 다시 들어올 때 열쇠 코드가 필요합니다. 로그아웃할까요?'))) return;
    await sb.auth.signOut();
    try { localStorage.removeItem(LS_MINE); } catch (e) {}
    location.href = 'index.html';
  }

  async function me() {
    var s = await sb.auth.getSession();
    if (!s.data.session) return null;
    var uid = s.data.session.user.id;
    var r = await sb.from('church_profile').select('id, login_id, name, role, church_id').eq('id', uid).maybeSingle();
    if (r.error || !r.data) return null;
    lastMe = r.data;
    return r.data;
  }

  // 로그인 안 했으면 로그인 화면으로, 역할이 다르면 제 화면으로 돌려보낸다. 교회 시간대도 여기서 맞춘다.
  async function guard(needRole) {
    var p = await me();
    if (!p) { location.replace('index.html' + location.search); return null; }
    if (needRole && p.role !== needRole) {
      location.replace(p.role === 'pastor' ? 'moksa.html' : 'mokjang.html');
      return null;
    }
    p.church = await loadChurch();
    return p;
  }

  // 탈퇴처럼 되돌릴 수 없는 일 앞에서 비밀번호를 한 번 더 확인한다
  async function checkPassword(loginId, password) {
    var r = await sb.auth.signInWithPassword({ email: emailOf(loginId), password: password });
    if (r.error) throw new Error(t('비밀번호가 맞지 않습니다.'));
  }
  async function afterLeave() {
    try { await sb.auth.signOut(); } catch (e) {}
    try { localStorage.removeItem(LS_MINE); localStorage.removeItem(LS_CHURCH); } catch (e) {}
    try {
      var reg = 'serviceWorker' in navigator && await navigator.serviceWorker.getRegistration('./');
      var sub = reg && await reg.pushManager.getSubscription(); if (sub) await sub.unsubscribe();
    } catch (e) {}
    location.replace('index.html?left=1');
  }

  async function callFn(name, payload) {
    var s = await sb.auth.getSession();
    var headers = { 'Content-Type': 'application/json', apikey: SB_KEY };
    if (s.data.session) headers.Authorization = 'Bearer ' + s.data.session.access_token;
    var res = await fetch(FN + name, { method: 'POST', headers: headers, body: JSON.stringify(payload) });
    var out = {};
    try { out = await res.json(); } catch (e) { out = {}; }
    if (!res.ok || out.error) throw new Error(out.error ? t(out.error) : t('처리하지 못했습니다 ({0})', res.status));
    return out;
  }
  // 순장 스스로 가입(join_…)은 다락방 앱 전용 함수로, 나머지는 목장 나눔터와 같은 함수로
  function callAdmin(payload) { return callFn(/^(join_|start_solo|link_church|delete_solo|key_login|new_key|leader_new_key)/.test(payload.action) ? 'darak-admin' : 'church-admin', payload); }
  function notify(payload) { return callFn('church-notify', payload); }

  /* ── 휴대전화 알림 (웹 푸시) ──────────────────────────────
     안드로이드 크롬은 바로 된다. 아이폰은 '홈 화면에 추가'한 아이콘으로 열어야 된다(iOS 16.4+). */
  function isIOS() { return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); }
  function standalone() { return (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true; }
  function pushSupported() { return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window; }
  function urlB64(s) {
    var pad = '='.repeat((4 - s.length % 4) % 4);
    var raw = atob((s + pad).replace(/-/g, '+').replace(/_/g, '/'));
    var out = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }
  async function pushRegistration() {
    return navigator.serviceWorker.register('sw.js', { scope: './' });
  }
  async function pushState() {
    if (!pushSupported()) return isIOS() && !standalone() ? 'ios-home' : 'unsupported';
    if (Notification.permission === 'denied') return 'denied';
    var reg = await navigator.serviceWorker.getRegistration('./');
    var sub = reg && await reg.pushManager.getSubscription();
    return sub ? 'on' : 'off';
  }
  async function pushEnable() {
    var perm = await Notification.requestPermission();
    if (perm !== 'granted') throw new Error(perm === 'denied'
      ? t('알림이 막혀 있습니다. 브라우저 설정에서 이 사이트 알림을 허용해 주세요.')
      : t('알림 허용을 눌러 주셔야 받을 수 있습니다.'));
    var reg = await pushRegistration();
    await navigator.serviceWorker.ready;
    var sub = await reg.pushManager.getSubscription() ||
      await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64((await notify({ action: 'key' })).publicKey) });
    var j = sub.toJSON();
    var r = await sb.rpc('church_push_save2', {
      p_endpoint: j.endpoint, p_p256dh: j.keys.p256dh, p_auth: j.keys.auth, p_ua: navigator.userAgent.slice(0, 200), p_lang: LANG
    });
    if (r.error) throw new Error(r.error.message);
  }
  async function pushDisable() {
    var reg = await navigator.serviceWorker.getRegistration('./');
    var sub = reg && await reg.pushManager.getSubscription();
    if (!sub) return;
    await sb.from('church_push').delete().eq('endpoint', sub.endpoint);
    await sub.unsubscribe();
  }

  // '홍길동' → '홍길동 목사님'. 이미 직함이 붙어 있으면 겹쳐 붙이지 않는다.
  function title2(p) {
    var n = (p.name || '').trim();
    if (LANG === 'en') return (p.role === 'pastor' ? 'Pastor ' : 'Leader ') + n.replace(/\s*(목사|목자)님?$/, '');
    var suffix = p.role === 'pastor' ? '목사님' : t('목자') + '님';
    if (/(목사|목자)(님)?$/.test(n) || (terms.leader && n.slice(-terms.leader.length) === terms.leader)) return n;
    return n ? n + ' ' + suffix : suffix;
  }

  function header(profile, title, extraHtml) {
    var c = profile.church || church || {};
    var el = document.createElement('div');
    el.className = 'top';
    el.innerHTML =
      '<div class="top-in' + (document.querySelector('.wrap-wide') ? ' wide' : '') + '">' +
      '<img class="mark" src="' + esc(logoOf(c)) + '" alt="">' +
      '<div class="titles"><h1>' + esc(title) + '</h1>' +
      '<span class="church">' + esc(c.name || t('목장 나눔터')) + '</span></div>' +
      (extraHtml || '') +
      '<div class="who"><span>' + esc(title2(profile)) + '</span>' +
      langButton() +
      '<button class="small" id="btn-signout">' + esc(t('로그아웃')) + '</button></div></div>';
    document.body.insertBefore(el, document.body.firstChild);
    el.querySelector('#btn-signout').addEventListener('click', signOut);
    bindLangButton(el);
    if (c.logo_url) { var fav = document.querySelector('link[rel="icon"]'); if (fav) fav.href = c.logo_url; }
    return el;
  }

  // 언어 단추: 지금 언어가 아닌 쪽 이름을 보여 주고, 누르면 바꾼다 (언어가 셋 이상이면 차례로 돈다)
  function langButton() {
    var i = LANGS.findIndex(function (x) { return x.id === LANG; }), next = LANGS[(i + 1) % LANGS.length];
    return '<button class="small lang-btn" type="button" data-lang="' + next.id + '" aria-label="Language">' + esc(next.name) + '</button>';
  }
  function bindLangButton(root) {
    $$('.lang-btn', root).forEach(function (b) { b.addEventListener('click', function () { setLang(b.dataset.lang); }); });
  }

  /* ── 성도 날짜 (교회 등록·생명의 삶·침례) — 목자 화면·목사 화면이 함께 쓴다 ── */
  var DATE_FIELDS = [
    { key: 'registered_on', label: '교회 등록' },
    { key: 'life_start', label: '생명의 삶 시작' },
    { key: 'life_end', label: '생명의 삶 끝' },
    { key: 'baptized_on', label: '침례' }
  ];
  function dayText(v) {
    if (!v) return '';
    var p = v.split('-').map(Number);
    if (LANG === 'en') return MON[p[1] - 1] + ' ' + p[2] + ', ' + p[0];
    return p[0] + '. ' + p[1] + '. ' + p[2] + '.';
  }
  function memberDatesLine(m) {
    var out = [];
    if (m.registered_on) out.push(t('교회 등록') + ' ' + dayText(m.registered_on));
    if (m.life_start || m.life_end)
      out.push(t('생명의 삶') + ' ' + (dayText(m.life_start) || '?') + ' ~ ' + (m.life_end ? dayText(m.life_end) : (m.life_start ? t('하는 중') : '?')));
    if (m.baptized_on) out.push(t('침례') + ' ' + dayText(m.baptized_on));
    return out.map(function (x) { return x.replace(/ /g, '\u00a0'); }).join(' · ');   // 날짜 하나가 두 줄로 갈라지지 않게
  }
  // 교회마다 켠 기능 (church_church.features) — 예: member_dates(성도 날짜)는 방주교회부터
  function has(feature) { return !!(church && church.features && church.features[feature]); }
  function memberDatesForm(m) {
    return '<form class="dates-form" data-id="' + esc(m.id) + '"><div class="dates-grid">' +
      DATE_FIELDS.map(function (f) {
        return '<label>' + esc(t(f.label)) + '<input type="date" name="' + f.key + '" value="' + esc(m[f.key] || '') + '"></label>';
      }).join('') + '</div><div class="row">' +
      '<button class="primary small" type="submit">' + esc(t('날짜 저장')) + '</button>' +
      '<button class="small act-close" type="button">' + esc(t('닫기')) + '</button></div>' +
      '<p class="hint">' + esc(t('모르는 날짜는 비워 두셔도 됩니다.')) + '</p></form>';
  }
  // 고른 날짜를 읽는다 — 틀리면 { error }
  function readDatesForm(form) {
    var v = {};
    DATE_FIELDS.forEach(function (f) { v[f.key] = form.elements[f.key].value || null; });
    if (v.life_start && v.life_end && v.life_end < v.life_start) return { error: t('생명의 삶 끝난 날이 시작한 날보다 앞입니다.') };
    return { values: v };
  }

  return {
    sb: sb, $: $, $$: $$, esc: esc, say: say,
    mondayOf: mondayOf, addWeeks: addWeeks, weekLabel: weekLabel, weekShort: weekShort,
    ymd: ymd, today: today, whenText: whenText, setTimezone: setTimezone, timezone: timezone,
    signIn: signIn, signOut: signOut, me: me, guard: guard, callAdmin: callAdmin, notify: notify,
    header: header, title2: title2,
    loadChurch: loadChurch, publicChurch: publicChurch, rememberChurch: rememberChurch,
    churchLink: churchLink, logoOf: logoOf, getChurch: function () { return church; }, fillTimezones: fillTimezones,
    pushSupported: pushSupported, pushState: pushState, pushEnable: pushEnable, pushDisable: pushDisable,
    isIOS: isIOS, standalone: standalone,
    t: t, terms: function () { return terms; }, setTerms: setTerms, TERM_PRESETS: TERM_PRESETS, cleanTerms: cleanTerms,
    THEMES: THEMES, setTheme: setTheme, applyLook: applyLook, translatePage: translatePage,
    checkPassword: checkPassword, afterLeave: afterLeave, isKeyless: isKeyless,
    has: has, DATE_FIELDS: DATE_FIELDS, dayText: dayText, memberDatesLine: memberDatesLine, memberDatesForm: memberDatesForm, readDatesForm: readDatesForm,
    lang: function () { return LANG; }, LANGS: LANGS, setLang: setLang, langButton: langButton, bindLangButton: bindLangButton
  };
})();

// 로그인한 화면(목사·목자)은 이 기기가 기억하는 교회 모양을 바로 입힌다 — 서버 답을 기다리는 동안 깜빡이지 않게.
// (로그인 화면은 주소의 교회가 다를 수 있어 index.html이 직접 정한다)
(function () {
  if (/(^|\/)(index\.html)?$/.test(location.pathname)) return;
  try {
    var mem = JSON.parse(localStorage.getItem('darak-my-church') || 'null');
    if (mem) window.CHURCH.applyLook(mem);
  } catch (e) {}
})();
// 화면에 있는 글자를 고른 언어로 (교회 모양이 나중에 오면 그때 한 번 더)
window.CHURCH.translatePage();
