/* 목장 나눔터 — 모든 화면이 함께 쓰는 것들 (여러 교회가 함께 쓴다) */
window.CHURCH = (function () {
  var SB_URL = 'https://dxhmprqfgigljgbstqrg.supabase.co';
  // 아래 키는 브라우저에 드러나도 되는 공개 키다. 실제 보호는 데이터베이스 RLS가 한다.
  var SB_KEY = 'sb_publishable__FXGut04uxuz44s2443_8g_AByEuL-n';
  var FN = SB_URL + '/functions/v1/';
  var DOMAIN = 'gajeong.local';
  // 웹 푸시 공개키 (비밀키는 서버 함수에만 있다)
  var LS_CHURCH = 'gajeong-church';   // (로그인 화면용) 마지막으로 본 교회
  var LS_MINE = 'gajeong-my-church';  // (목사·목자 화면용) 로그인한 내 교회   // 마지막으로 들어간 교회 — 다음 로그인 화면에 이름·로고를 보여 준다
  var NEUTRAL_ICON = 'assets/icon-192.png';

  /* ── 화면 언어 ─────────────────────────────────────────────
     화면 글자는 한국어로 써 두고, 고른 언어의 사전(lang-<코드>.js → window.I18N[코드])에서 찾아 바꾼다.
     사전에 없는 글은 한국어로 둔다. 언어를 더하려면 사전 파일 하나를 더하고 LANGS에 한 줄 넣으면 된다. */
  var LANGS = [{ id: 'ko', name: '한국어' }, { id: 'en', name: 'English' }];
  var LS_LANG = 'gajeong-lang';
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
    auth: { persistSession: true, autoRefreshToken: true, storageKey: 'gajeong-auth' }
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
  // 한 주는 주일(일요일)부터 토요일까지 — 주일이 되면 새 주가 시작된다 (예전 이름 mondayOf를 그대로 쓴다)
  function mondayOf(dateStr) {
    var d = new Date((dateStr || today()) + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() - d.getUTCDay());   // 주일까지 되돌아간다
    return ymd(d);
  }
  // 예전(월요일 시작)에 저장된 일기도 함께 찾도록: [주일, 그다음 월요일]
  function weekKeys(weekStart) {
    var d = new Date(weekStart + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + 1);
    return [weekStart, ymd(d)];
  }
  function dayOfWeek(dateStr) { return new Date((dateStr || today()) + 'T00:00:00Z').getUTCDay(); }
  function addDays(day, n) { var d = new Date(day + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return ymd(d); }
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
  var BASE_TERMS = { unit: '목장', leader: '목자', member: '목원' };
  var TERM_PRESETS = [
    { unit: '목장', leader: '목자', member: '목원' },
    { unit: '다락방', leader: '순장', member: '순원' },
    { unit: '구역', leader: '구역장', member: '구역원' },
    { unit: '셀', leader: '리더', member: '셀원' },
    { unit: '순', leader: '순장', member: '순원' }
  ];
  var terms = BASE_TERMS;
  function cleanTerms(x) {
    var o = {};
    ['unit', 'leader', 'member'].forEach(function (k) {
      var v = x && typeof x[k] === 'string' ? x[k].trim().slice(0, 8) : '';
      o[k] = /^[가-힣A-Za-z0-9 ]+$/.test(v) ? v : BASE_TERMS[k];
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
  var THEME_COLOR = { note: '#ffffff', sky: '#ffffff', night: '#1a1e21' };   // 머리말 색과 같게
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
  // 로그인 전: 주소의 ?c=… 교회의 이름·로고
  async function publicChurch() {
    var slug = new URLSearchParams(location.search).get('c');
    if (!slug) return null;   // 공용 첫 화면은 어느 교회 것도 아니다 (교회 화면은 /코드/ 주소로)
    var r = await sb.rpc('church_public_church', { p_slug: slug });
    var row = r.data && r.data[0];
    if (!row) return null;
    var c = { slug: slug, name: row.name, logo_url: row.logo_url, theme: row.theme, terms: row.terms };
    rememberChurch(c);   // 다음에 열 때는 서버 답을 기다리지 않고 바로 그린다
    return c;
  }
  // 교회 전용 주소 /코드/ — 카카오톡 미리보기에 교회 이름·로고가 뜬다 (GitHub Actions가 만들어 둠, 없으면 404.html이 넘겨 줌)
  function churchLink(c) {
    return new URL(encodeURIComponent(c.slug) + '/', document.baseURI).href;   // 교회 주소(/코드/)에서 열어도 맨 위 기준
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

  async function signOut() {
    // 이 기기만 로그아웃 (기본값 'global'은 같은 계정으로 들어가 있는 다른 휴대폰까지 모두 로그아웃시킨다)
    try { await sb.auth.signOut({ scope: 'local' }); } catch (e) {}
    try { localStorage.removeItem(LS_MINE); } catch (e) {}
    var c = church || rememberedChurch();   // 로그아웃하면 우리 교회 로그인 화면으로
    location.href = 'index.html' + (c && c.slug ? '?c=' + encodeURIComponent(c.slug) : '');
  }

  async function me() {
    var s = await sb.auth.getSession();
    if (!s.data.session) return null;
    var uid = s.data.session.user.id;
    var r = await sb.from('church_profile').select('id, login_id, name, role, church_id, photo_path').eq('id', uid).maybeSingle();
    if (r.error || !r.data) return null;
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
  function callAdmin(payload) { return callFn('church-admin', payload); }
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
  // 카카오톡·네이버·인스타그램 같은 앱 안에서 열린 화면 (휴대폰 알림을 못 받는다)
  function inApp() { return /KAKAOTALK|NAVER\(inapp|Instagram|FBAN|FBAV|Line\/|DaumApps|; wv\)/i.test(navigator.userAgent); }
  // 지금 화면을 크롬(안드로이드)·사파리(아이폰)로 다시 연다
  function openExternal() {
    var url = location.href.replace(/#.*$/, '');
    if (/KAKAOTALK/i.test(navigator.userAgent)) { location.href = 'kakaotalk://web/openExternal?url=' + encodeURIComponent(url); return; }
    if (/android/i.test(navigator.userAgent)) { location.href = 'intent://' + url.replace(/^https?:\/\//, '') + '#Intent;scheme=https;package=com.android.chrome;end'; return; }
    alert(t('오른쪽 위(또는 아래) 메뉴에서 [Safari로 열기]를 눌러 주세요.'));
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
  // 시험 알림: ① 이 휴대폰이 직접 띄우는 알림(휴대폰·크롬 설정 확인) ② 서버에서 '이 기기로만' 보내는 알림(보내는 길 확인)
  async function pushTest() {
    var reg = await navigator.serviceWorker.getRegistration('./');
    var sub = reg && await reg.pushManager.getSubscription();
    var local = false;
    try { if (reg) { await reg.showNotification(t('① 이 휴대폰 알림'), { body: t('이 알림이 보이면 휴대폰 설정은 괜찮습니다.'), icon: 'assets/icon-192.png', tag: 'local-test' }); local = true; } } catch (e) {}
    var r = await notify({ action: 'test', endpoint: sub ? sub.endpoint : '' });
    if (sub && !r.devices) { await pushEnable(); r = await notify({ action: 'test', endpoint: sub.endpoint }); }   // 서버에 이 기기 등록이 없으면 다시 등록
    return { local: local, sent: r.sent || 0, devices: r.devices || 0, code: (r.codes || [])[0] || 0 };
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
      '<div class="who"><span class="who-avatar"></span><span class="who-name">' + esc(title2(profile)) + '</span>' +
      '<button class="small who-toggle" type="button" aria-expanded="false">' + esc(t('메뉴')) + '</button>' +
      '<div class="who-menu"><span class="who-menu-name">' + esc(title2(profile)) + '</span>' + langButton() +
      '<button class="small" id="btn-guide">' + esc(t('사용법 영상')) + '</button>' +
      '<button class="small" id="btn-signout">' + esc(t('로그아웃')) + '</button></div></div></div>';
    document.body.insertBefore(el, document.body.firstChild);
    el.querySelector('#btn-signout').addEventListener('click', signOut);
    el.querySelector('#btn-guide').addEventListener('click', function () { el.classList.remove('menu-open'); guideSheet(profile); });
    signOutCard();
    // 왼쪽 위 로고·교회 이름을 누르면 첫 화면(첫 탭, 맨 위)으로
    var goHome = function () {
      var first = document.querySelector('.tabs button'); if (first && !first.classList.contains('on')) first.click();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    ['.mark', '.titles'].forEach(function (s) { var x = el.querySelector(s); x.classList.add('home-link'); x.title = t('처음 화면으로'); x.addEventListener('click', goHome); });
    // 휴대폰에서는 머리말을 한 줄로: English·로그아웃은 [메뉴] 안에
    var tg = el.querySelector('.who-toggle');
    tg.addEventListener('click', function (e) { e.stopPropagation(); var o = el.classList.toggle('menu-open'); tg.setAttribute('aria-expanded', o ? 'true' : 'false'); });
    document.addEventListener('click', function (e) { if (!e.target.closest('.who-menu')) { el.classList.remove('menu-open'); tg.setAttribute('aria-expanded', 'false'); } });
    bindLangButton(el);
    if (c.logo_url) { var fav = document.querySelector('link[rel="icon"]'); if (fav) fav.href = c.logo_url; }
    guideWho = profile;
    topAvatar(profile);
    hero(profile);
    bgm(el);
    return el;
  }

  /* ── 첫 화면 인사 띠 (카페 앱처럼) · 성탄 절기 ─────────── */
  // 성탄 모양: 10월 24일 ~ 12월 31일, 새해(1~2월)는 오로라
  var XMAS_FROM = '10-24', XMAS_TO = '12-31';
  // 목사님이 [계절 꾸미기]에서 고를 수 있다: 자동(성탄 → 새해 오로라) · 성탄 · 눈사람 · 오로라 · 끄기
  var SEASONS = ['xmas', 'snowman', 'aurora'];
  function season() {
    var v = ((church && church.features) || {}).season;
    if (v === false || v === 'off') return '';
    if (SEASONS.indexOf(v) >= 0) return v;
    var md = today().slice(5);
    if (md >= XMAS_FROM && md <= XMAS_TO) return 'xmas';
    if (md >= '01-01' && md <= '02-29') return 'aurora';   // 새해: 오로라
    return '';
  }
  function setSeason(v) {   // 미리 보기용
    if (v) document.documentElement.setAttribute('data-season', v); else document.documentElement.removeAttribute('data-season');
  }
  // 인사는 보는 사람이 있는 곳의 시간으로 (한국은 아침, 미국은 저녁 …) — 휴대폰 시계를 따른다
  function heroText(profile) {
    var now = new Date(), h = now.getHours();
    var days = ['주일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
    var part = h < 5 ? '밤' : h < 12 ? '아침' : h < 18 ? '오후' : '저녁', md = today().slice(5), s = season();
    var kicker = s === 'xmas' ? (md === '12-24' || md === '12-25' ? t('메리 크리스마스') : t('성탄을 기다리며'))
      : s === 'aurora' ? (md <= '01-03' ? t('새해 복 많이 받으세요') : t('새해에도 함께'))
      : s === 'snowman' ? t('포근한 겨울 보내세요') : t('이번 주도 함께');
    // 이름 + 님: '이호석님', '허민 목사님'
    var nm = String(profile.name || '').trim().replace(/님$/, ''), who;
    if (LANG === 'en') who = profile.role === 'pastor' ? 'Pastor ' + nm.replace(/\s*목사$/, '') : nm;
    else if (profile.role === 'pastor') who = /목사$/.test(nm) ? nm + '님' : (nm ? nm + ' ' : '') + '목사님';
    else who = nm ? nm + '님' : t('목자') + '님';
    return { kicker: kicker, title: who + ',', sub: t('평안한 {0} {1}', t(days[now.getDay()]), t(part + (part === '오후' ? '예요' : '이에요'))) };   // 오후예요 · 아침이에요
  }
  function hero(profile) {
    var wrap = document.querySelector('.wrap'), tabs = wrap && wrap.querySelector('.tabs');
    if (!tabs || wrap.querySelector('.hero')) return;
    var x = heroText(profile), s = season();
    if (s) document.documentElement.setAttribute('data-season', s);
    var el = document.createElement('section'); el.className = 'hero noprint';
    el.innerHTML = '<div class="hero-in"><span class="hero-kicker">' + esc(x.kicker) + '</span>' +
      '<p class="hero-title">' + esc(x.title) + '<br>' + esc(x.sub) + '</p></div><div class="hero-chips"></div>';
    wrap.insertBefore(el, tabs);
    // 휴대폰 위 상태 표시줄 색도 첫 화면에서는 인사 띠 색으로
    var meta = document.querySelector('meta[name="theme-color"]'), plain = meta && meta.getAttribute('content');
    var TOP = { xmas: '#a3242b', aurora: '#0c1a3a', snowman: '#cfe6f7' };
    function tint() {
      if (!meta) return;
      var home = tabs.querySelector('button') && tabs.querySelector('button').classList.contains('on');
      meta.setAttribute('content', home && TOP[document.documentElement.getAttribute('data-season')] || plain);
    }
    tint(); tabs.addEventListener('click', function () { setTimeout(tint, 0); });
  }
  // 인사 띠 아래 알약 단추: [{ label, value, go(탭 이름) 또는 fn, dot }]
  function heroChips(list) {
    var box = document.querySelector('.hero-chips'); if (!box) return;
    list = list.concat([{ label: t('사용법 영상'), fn: function () { guideSheet(guideWho); }, cls: 'guide-chip' }]);
    box._list = list;
    box.innerHTML = list.map(function (c, i) {
      return '<button type="button" class="hero-chip' + (c.dot ? ' dot' : '') + (c.cls ? ' ' + c.cls : '') + '" data-i="' + i + '"><span>' + esc(c.label) + '</span>' +
        (c.value != null && c.value !== '' ? '<b>' + esc(String(c.value)) + '</b>' : '') + '</button>';
    }).join('');
    if (box.dataset.bound) return;
    box.dataset.bound = '1';
    box.addEventListener('click', function (e) {
      var b = e.target.closest('.hero-chip'), c = b && box._list[+b.dataset.i]; if (!c) return;
      if (c.go) { var tb = document.querySelector('.tabs button[data-pane="' + c.go + '"]'); if (tb) tb.click(); }
      if (c.fn) c.fn();
    });
  }

  // 사용법 영상 (로그인 첫 화면과 같은 영상) — 목사님은 두 가지, 목자님은 목자용만
  var guideWho = null;
  var GUIDE_V = '?v=20261024';   // 영상을 새로 만들면 바꾼다 (index.html도 이 값을 쓴다)
  function guideSheet(p) {
    var pastor = p && p.role === 'pastor', lang = LANG === 'en' ? 'en' : 'ko';
    sheet({ kicker: t('처음이시면 2분만 보세요'), title: t('사용법 영상'), cls: 'guide-sheet',
      html: (pastor ? '<div class="guide-tabs"><button type="button" class="small on" data-who="pastor">' + esc(t('목사님용')) + '</button>' +
        '<button type="button" class="small" data-who="leader">' + esc(t('목자용')) + '</button></div>' : '') +
        '<video class="guide-video" controls playsinline preload="metadata"></video>' });
    var box = document.querySelector('.guide-sheet:last-of-type'), v = box.querySelector('video');
    function show(who) {
      var base = 'video/guide-' + who + '-' + lang;
      v.poster = base + '.jpg' + GUIDE_V; v.src = base + '.mp4' + GUIDE_V;
      box.querySelectorAll('.guide-tabs button').forEach(function (b) { b.classList.toggle('on', b.dataset.who === who); });
    }
    box.addEventListener('click', function (e) { var b = e.target.closest('.guide-tabs button'); if (b) show(b.dataset.who); });
    show(pastor ? 'pastor' : 'leader');
  }
  // [내 계정]·[관리] 맨 아래에도 로그아웃 (머리말 [메뉴] 안에만 있으면 찾기 어렵다)
  function signOutCard() {
    var card = document.getElementById('my-photo-card'), pane = card && card.closest('.pane');
    if (!pane || pane.querySelector('.signout-card')) return;
    var x = document.createElement('div'); x.className = 'card signout-card';
    x.innerHTML = '<h2>' + esc(t('이 기기에서 나가기')) + '</h2><p class="desc">' + esc(t('다른 사람 계정으로 들어가려면 먼저 로그아웃하세요.')) + '</p>' +
      '<button type="button">' + esc(t('로그아웃')) + '</button>';
    x.querySelector('button').addEventListener('click', signOut);
    pane.appendChild(x);
  }

  // 아래에서 올라오는 창: { kicker, title, html, cls, foot: [{ label, fn }] } — fn이 true를 돌려주면 닫지 않는다
  function sheet(o) {
    var foot = o.foot || [{ label: t('닫기') }];
    var bg = document.createElement('div'); bg.className = 'sheet-bg ' + (o.cls || '');
    bg.innerHTML = '<div class="sheet" role="dialog" aria-modal="true"><div class="sheet-body">' +
      (o.kicker ? '<span class="sheet-kicker">' + esc(o.kicker) + '</span>' : '') +
      (o.title ? '<h2 class="sheet-title">' + esc(o.title) + '</h2>' : '') + (o.html || '') + '</div>' +
      '<div class="sheet-foot">' + foot.map(function (f, i) { return '<button type="button" class="ghost" data-i="' + i + '">' + esc(f.label) + '</button>'; }).join('') + '</div></div>';
    document.body.appendChild(bg);
    requestAnimationFrame(function () { requestAnimationFrame(function () { bg.classList.add('open'); }); });
    function close() { document.removeEventListener('keydown', onKey); bg.classList.remove('open'); setTimeout(function () { bg.remove(); }, 260); }
    function onKey(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', onKey);
    bg.addEventListener('click', async function (e) {
      if (e.target === bg) return close();
      var b = e.target.closest('.sheet-foot button'); if (!b) return;
      var f = foot[+b.dataset.i] || {};
      if (f.fn && (await f.fn(bg)) === true) return;
      close();
    });
    return close;
  }

  // 목사님 공지 (features.notice = { id, title, body, at, by }) — 앱을 열면 아래에서 올라온다
  function noticeHtml(n) {
    var d = n.at ? new Date(n.at) : null;
    var when = d ? new Intl.DateTimeFormat(LANG === 'en' ? 'en-US' : 'ko-KR', { timeZone: TZ, month: 'long', day: 'numeric' }).format(d) : '';
    return '<div class="prose sheet-text">' + proseHtml(n.body || '') + '</div>' +
      '<p class="sheet-meta">' + esc([when, n.by, untilText(n)].filter(Boolean).join(' · ')) + '</p>';
  }
  function untilText(n) {
    if (!n || !n.until) return '';
    var d = new Date(n.until + 'T00:00:00Z');
    return t('{0}까지', new Intl.DateTimeFormat(LANG === 'en' ? 'en-US' : 'ko-KR', { timeZone: 'UTC', month: 'long', day: 'numeric' }).format(d));
  }
  // 공지가 아직 기간 안인지 (기간이 없던 예전 공지는 2주)
  function noticeLive(n) {
    if (!n || !n.id) return false;
    if (n.until) return today() <= n.until;
    return !n.at || Date.now() - new Date(n.at).getTime() <= 14 * 864e5;
  }
  function showNotice(n, force) {
    if (!n || !n.id) return;
    var key = 'notice-hide-' + n.id, hid = '';
    try { hid = localStorage.getItem(key) || sessionStorage.getItem(key) || ''; } catch (e) {}
    if (!noticeLive(n)) return;   // 기간이 지난 공지는 띄우지 않는다
    if (!force && (hid === today() || hid === 'session')) return;
    sheet({ kicker: t('공지'), title: n.title || t('목사님 공지'), html: noticeHtml(n), cls: 'notice-sheet', foot: [
      { label: t('오늘 하루 보지 않기'), fn: function () { try { localStorage.setItem(key, today()); } catch (e) {} } },
      { label: t('닫기'), fn: function () { try { sessionStorage.setItem(key, 'session'); } catch (e) {} } }
    ] });
  }

  // 기도 응답 축하: 작은 하트가 위에서 떨어지고 가운데 짧은 글 (움직임 줄이기 설정이면 건너뛴다)
  function hearts(label) {
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var box = document.createElement('div'); box.className = 'hearts noprint'; box.setAttribute('aria-hidden', 'true');
    var colors = ['#e5484d', '#f76b8a', '#f5a524', '#ff8fab', '#d6336c'];
    for (var i = 0; i < 26; i++) {
      var h = document.createElement('span'); h.textContent = '♥';
      h.style.left = (Math.random() * 96) + 'vw';
      h.style.fontSize = (14 + Math.random() * 20) + 'px';
      h.style.color = colors[i % colors.length];
      h.style.animationDelay = (Math.random() * .7).toFixed(2) + 's';
      h.style.animationDuration = (1.9 + Math.random() * 1.5).toFixed(2) + 's';
      h.style.setProperty('--dx', Math.round(Math.random() * 90 - 45) + 'px');
      box.appendChild(h);
    }
    if (label) { var m = document.createElement('b'); m.className = 'hearts-label'; m.textContent = label; box.appendChild(m); }
    document.body.appendChild(box);
    setTimeout(function () { box.remove(); }, 4000);
  }

  /* ── 배경 음악 (조용한 첼로) ─────────────────────────────
     휴대폰은 한 번 눌러야 소리를 낼 수 있어서, 처음 화면을 누를 때 작게 시작한다.
     머리말 ♪ 단추로 끄고 켠다 (기기마다 기억). 음악 파일이 없으면 단추도 없다. 성탄 절기엔 성탄 곡이 있으면 그것으로 */
  var BGM_VOL = 0.22;
  async function bgm(top) {
    var xmas = season() === 'xmas' || season() === 'snowman';   // 겨울(성탄·눈사람)엔 성탄 곡
    var on = true; try { on = localStorage.getItem('bgm') !== 'off'; } catch (e) {}
    var a = new Audio(); a.loop = true; a.preload = 'auto';
    // 아이폰은 소리 크기(volume)를 못 바꿔 늘 최대로 나온다 → 미리 작게 만든 곡(-soft)을 쓴다 (무음 모드에서도 나오게 <audio> 그대로)
    var fixedVol = (function () { try { a.volume = 0.5; var r = a.volume !== 0.5; a.volume = 1; return r; } catch (e) { return true; } })();
    a.src = (xmas ? 'assets/bgm-xmas' : 'assets/bgm') + (fixedVol ? '-soft' : '') + '.mp3?v=3';   // 화면이 열리자마자 받아 둔다
    var btn = document.createElement('button'); btn.type = 'button'; btn.className = 'small bgm-btn';
    var who = top.querySelector('.who'); who.insertBefore(btn, top.querySelector('.who-toggle'));
    a.addEventListener('error', function () { btn.remove(); off(); });   // 곡 파일이 없으면 단추도 없앤다
    function setVol(v) { if (!fixedVol) a.volume = Math.max(0, Math.min(1, v)); }
    setVol(0);
    var timer = null, started = false;
    function fade(to, step, then) {
      clearInterval(timer);
      if (fixedVol) { if (then) then(); return; }
      timer = setInterval(function () {
        var now = a.volume, v = now + (to > now ? step : -step);
        if ((to > now && v >= to) || (to <= now && v <= to)) { setVol(to); clearInterval(timer); if (then) then(); return; }
        setVol(v);
      }, 60);
    }
    function play() {
      return Promise.resolve(a.play()).then(function () { started = true; btn.classList.remove('wait'); fade(BGM_VOL, 0.05); return true; }, function () { return false; });
    }
    function stop() { fade(0, 0.04, function () { a.pause(); }); }
    function show() { btn.classList.toggle('off', !on); btn.textContent = '♪'; btn.title = on ? t('배경 음악 끄기') : t('배경 음악 켜기'); btn.setAttribute('aria-label', btn.title); }
    show();
    // 브라우저는 소리 나는 자동 재생을 막는 경우가 많다: 먼저 바로 틀어 보고, 막히면 화면을 처음 누르는 순간 튼다 (그동안 ♪가 깜빡인다)
    var EV = ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'];
    function off() { EV.forEach(function (n) { document.removeEventListener(n, first, true); }); }
    function first(e) {
      if (e.target.closest && e.target.closest('.bgm-btn')) return;
      if (!on || started) return off();
      play().then(function (ok) { if (ok) off(); });   // 막히면 다음 누름에서 다시
    }
    if (on) {
      EV.forEach(function (n) { document.addEventListener(n, first, true); });
      play().then(function (ok) { if (ok) off(); else if (on && !started) btn.classList.add('wait'); });
    }
    btn.addEventListener('click', function () {
      on = !on; try { localStorage.setItem('bgm', on ? 'on' : 'off'); } catch (e) {}
      off(); btn.classList.remove('wait');
      if (on) play(); else stop();
      show();
    });
    document.addEventListener('visibilitychange', function () {   // 다른 앱으로 가면 멈추고, 돌아오면 다시
      if (document.hidden) { if (!a.paused) a.pause(); } else if (on && started) play();
    });
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
  var DEFAULT_ON = { member_photos: true };   // 모든 교회 기본으로 켜는 기능 (교회 설정에 false면 끔)
  function has(feature) {
    var f = church && church.features || {};
    return feature in f ? !!f[feature] : !!(church && DEFAULT_ON[feature]);
  }
  /* ── 성도 사진 (켠 교회만: features.member_photos) ──────────
     휴대폰에서 가로세로 400px JPEG(약 40KB)로 줄여 올린다. 저장소는 비공개 — 그 교회 목사님과 담당 목자만 본다.
     경로 = <교회 id>/<목원 id>.jpg, 보여 줄 때는 1시간짜리 서명 주소를 받아 쓴다. */
  var PHOTO_BUCKET = 'church-member-photo';
  function squareJpeg(file, size) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var s = Math.min(img.naturalWidth, img.naturalHeight), cv = document.createElement('canvas');
        cv.width = cv.height = size;
        cv.getContext('2d').drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 0, 0, size, size);
        URL.revokeObjectURL(url);
        cv.toBlob(function (b) { b ? resolve(b) : reject(new Error(t('사진을 줄이지 못했습니다.'))); }, 'image/jpeg', 0.82);
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error(t('이 사진은 열 수 없습니다. JPG나 PNG 사진을 골라 주세요.'))); };
      img.src = url;
    });
  }
  // table: church_mokwon(목원) 또는 church_profile(목자·목사 본인 — 파일 이름 앞에 p_)
  async function photoSave(m, file, table) {
    table = table || 'church_mokwon';
    var blob = await squareJpeg(file, 400);
    var path = church.id + '/' + (table === 'church_profile' ? 'p_' : '') + m.id + '.jpg';
    var up = await sb.storage.from(PHOTO_BUCKET).upload(path, blob, { upsert: true, contentType: 'image/jpeg', cacheControl: '60' });
    if (up.error) throw new Error(up.error.message);
    var r = await sb.from(table).update({ photo_path: path }).eq('id', m.id);
    if (r.error) throw new Error(r.error.message);
    m.photo_path = path;
  }
  async function photoRemove(m, table) {
    if (!m.photo_path) return;
    await sb.storage.from(PHOTO_BUCKET).remove([m.photo_path]);
    await sb.from(table || 'church_mokwon').update({ photo_path: null }).eq('id', m.id);
    m.photo_path = null;
  }
  // 머리말 이름 옆에 내 사진 (카톡 프로필처럼) — 사진이 없으면 비워 둔다
  async function topAvatar(p) {
    var slot = document.querySelector('.top .who-avatar'); if (!slot) return;
    if (!has('member_photos')) { slot.innerHTML = ''; return; }
    var u = '';
    if (p.photo_path) { try { u = (await photoUrls([p]))[p.id] || ''; } catch (e) {} }
    slot.innerHTML = avatar(p, u);   // 사진이 없으면 기본 얼굴 (목자 빨강 · 목사 교회 색)
    slot.title = t('내 사진');
    if (!slot.dataset.bound) {   // 누르면 [내 사진] 칸으로
      slot.dataset.bound = '1';
      slot.addEventListener('click', function () {
        var card = document.getElementById('my-photo-card'), pane = card && card.closest('.pane'); if (!pane) return;
        var tab = document.querySelector('.tabs button[data-pane="' + pane.id.replace(/^pane-/, '') + '"]'); if (tab) tab.click();
        setTimeout(function () { card.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, 50);
      });
    }
  }
  // [내 계정]의 '내 사진' 칸 (목자·목사 공통) — 목사님이 목자 얼굴을 알아볼 수 있게
  function bindMyPhoto(p) {
    var card = $('#my-photo-card'); if (!card || !has('member_photos')) return;
    card.hidden = false;
    async function show() {
      var u = (await photoUrls([p]))[p.id];
      $('#my-photo').innerHTML = avatar(p, u);
      $('#my-photo-del').hidden = !p.photo_path;
      topAvatar(p);
    }
    $('#my-photo-pick').addEventListener('click', function () { $('#my-photo-file').value = ''; $('#my-photo-file').click(); });
    $('#my-photo-file').addEventListener('change', async function () {
      var f = this.files && this.files[0]; if (!f) return;
      say($('#msg-my-photo'), t('사진을 올리는 중…'), 'ok');
      try { await photoSave(p, f, 'church_profile'); await show(); say($('#msg-my-photo'), t('내 사진을 넣었습니다.'), 'ok'); }
      catch (e) { say($('#msg-my-photo'), e.message, 'err'); }
    });
    $('#my-photo-del').addEventListener('click', async function () {
      if (!confirm(t('내 사진을 지울까요?'))) return;
      await photoRemove(p, 'church_profile'); await show(); say($('#msg-my-photo'), t('사진을 지웠습니다.'), 'ok');
    });
    show();
  }
  // 목원 목록 → { 목원 id: 서명 주소 }
  async function photoUrls(list) {
    var withPhoto = list.filter(function (m) { return m.photo_path; }), out = {};
    if (!withPhoto.length) return out;
    var r = await sb.storage.from(PHOTO_BUCKET).createSignedUrls(withPhoto.map(function (m) { return m.photo_path; }), 3600);
    var byPath = {};
    (r.data || []).forEach(function (x) { if (x.signedUrl) byPath[x.path] = x.signedUrl; });
    withPhoto.forEach(function (m) { if (byPath[m.photo_path]) out[m.id] = byPath[m.photo_path]; });
    return out;
  }
  // 사진이 없을 때 이름 첫 글자 동그라미: 이름마다 네 가지 색 중 하나 (카페 앱 메뉴처럼)
  function avTone(name) { var h = 0, x = String(name || ''); for (var i = 0; i < x.length; i++) h = (h * 31 + x.charCodeAt(i)) >>> 0; return h % 4; }
  // 누구인지에 따라 색: 목자 빨강 · 목원 초록 · VIP 미색 · 목사 교회 색 (m.kind로 직접 줄 수도 있다)
  function avKind(m) {
    if (m.kind) return m.kind;
    if (m.role === 'mokja') return 'leader';
    if (m.role === 'pastor') return 'pastor';
    if ('mokjang_id' in m) return /vip/i.test(m.tag || '') ? 'vip' : 'member';
    return 'tone' + avTone(m.name);
  }
  function avatar(m, url) {
    return url ? '<img class="avatar" src="' + esc(url) + '" alt="">'
               : '<span class="avatar av-' + avKind(m) + '" aria-hidden="true">' + esc((m.name || '?').trim().charAt(0)) + '</span>';
  }

  // 긴 글을 읽기 쉽게: '-'·'•'·'1.'로 시작하는 줄은 목록으로, 나머지 줄은 문단으로 (사람이 쓴 글은 그대로 두고 모양만)
  function proseHtml(text) {
    var out = [], list = [];
    function flush() { if (list.length) { out.push('<ul class="prose-list">' + list.join('') + '</ul>'); list = []; } }
    String(text || '').replace(/\r/g, '').split('\n').forEach(function (ln) {
      var x = ln.trim(); if (!x) { flush(); return; }
      var m = /^(?:[-–•·*▪]|\d{1,2}[.)])\s*(.+)$/.exec(x);
      if (m) list.push('<li>' + esc(m[1]) + '</li>'); else { flush(); out.push('<p>' + esc(x) + '</p>'); }
    });
    flush();
    return out.join('');
  }
  // 목원별 기도제목: 굵은 이름 — 내용 (기도제목 모아보기와 같은 모양), 결석·응답됨은 이름 옆에
  function prayerList(ps, opts) {
    opts = opts || {};
    return '<ul class="pr-list">' + ps.map(function (p) {
      var text = p.content ? proseHtml(p.content) : (opts.hideEmpty ? '' : '<p class="quiet">' + esc(t('(적지 않음)')) + '</p>');
      return '<li><span class="pr-name">' + esc(p.name) + '</span>' +
        (p.attended === false && !opts.noAbsent ? ' <span class="badge">' + esc(t('결석')) + '</span>' : '') +
        (p.answered ? ' <span class="badge done">' + esc(t('응답됨')) + '</span>' : '') +
        '<div class="pr-text">' + text + '</div></li>';
    }).join('') + '</ul>';
  }
  // 말씀(댓글) 남긴 분 사진 → { author_id: 서명 주소 }. 경로가 정해져 있어 프로필을 따로 읽지 않는다
  async function authorPhotos(cs) {
    if (!has('member_photos') || !cs.length) return null;
    var seen = {}, list = [];
    cs.forEach(function (c) { if (c.author_id && !seen[c.author_id]) { seen[c.author_id] = 1; list.push({ id: c.author_id, photo_path: church.id + '/p_' + c.author_id + '.jpg' }); } });
    try { return await photoUrls(list); } catch (e) { return {}; }
  }
  // 말씀 머리줄: [사진] 이름 · 언제 (닫는 </div>는 부르는 쪽에서)
  function commentHead(c, urls) {
    return '<div class="head cmt-head">' + (urls ? avatar({ name: c.author_name, kind: 'pastor' }, urls[c.author_id]) : '') +
      '<span class="name">' + esc(c.author_name) + '</span>' +
      '<span class="quiet" style="font-size:13px">' + whenText(c.created_at) + '</span>';
  }

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
    mondayOf: mondayOf, weekKeys: weekKeys, dayOfWeek: dayOfWeek, addWeeks: addWeeks, addDays: addDays, weekLabel: weekLabel, weekShort: weekShort,
    ymd: ymd, today: today, whenText: whenText, setTimezone: setTimezone, timezone: timezone,
    signIn: signIn, signOut: signOut, guideSheet: guideSheet, GUIDE_V: GUIDE_V, me: me, guard: guard, callAdmin: callAdmin, notify: notify,
    header: header, title2: title2,
    loadChurch: loadChurch, publicChurch: publicChurch, rememberChurch: rememberChurch,
    churchLink: churchLink, logoOf: logoOf, getChurch: function () { return church; }, fillTimezones: fillTimezones,
    pushSupported: pushSupported, pushState: pushState, pushTest: pushTest, inApp: inApp, openExternal: openExternal, pushEnable: pushEnable, pushDisable: pushDisable,
    isIOS: isIOS, standalone: standalone,
    t: t, terms: function () { return terms; }, setTerms: setTerms, TERM_PRESETS: TERM_PRESETS, cleanTerms: cleanTerms,
    THEMES: THEMES, setTheme: setTheme, applyLook: applyLook, translatePage: translatePage,
    checkPassword: checkPassword, afterLeave: afterLeave,
    setSeason: setSeason, noticeLive: noticeLive, untilText: untilText, hearts: hearts, hero: hero, heroChips: heroChips, sheet: sheet, showNotice: showNotice, noticeHtml: noticeHtml, season: season,
    has: has, DATE_FIELDS: DATE_FIELDS, photoSave: photoSave, photoRemove: photoRemove, photoUrls: photoUrls, avatar: avatar, authorPhotos: authorPhotos, commentHead: commentHead, proseHtml: proseHtml, prayerList: prayerList, bindMyPhoto: bindMyPhoto, dayText: dayText, memberDatesLine: memberDatesLine, memberDatesForm: memberDatesForm, readDatesForm: readDatesForm,
    lang: function () { return LANG; }, LANGS: LANGS, setLang: setLang, langButton: langButton, bindLangButton: bindLangButton
  };
})();

// 로그인한 화면(목사·목자)은 이 기기가 기억하는 교회 모양을 바로 입힌다 — 서버 답을 기다리는 동안 깜빡이지 않게.
// (로그인 화면은 주소의 교회가 다를 수 있어 index.html이 직접 정한다)
(function () {
  if (/(^|\/)(index\.html)?$/.test(location.pathname)) return;
  try {
    var mem = JSON.parse(localStorage.getItem('gajeong-my-church') || 'null');
    if (mem) window.CHURCH.applyLook(mem);
  } catch (e) {}
})();
// 화면에 있는 글자를 고른 언어로 (교회 모양이 나중에 오면 그때 한 번 더)
window.CHURCH.translatePage();
