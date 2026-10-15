/* 목장 나눔터 — 모든 화면이 함께 쓰는 것들 (여러 교회가 함께 쓴다) */
window.CHURCH = (function () {
  var SB_URL = 'https://dxhmprqfgigljgbstqrg.supabase.co';
  // 아래 키는 브라우저에 드러나도 되는 공개 키다. 실제 보호는 데이터베이스 RLS가 한다.
  var SB_KEY = 'sb_publishable__FXGut04uxuz44s2443_8g_AByEuL-n';
  var FN = SB_URL + '/functions/v1/';
  var DOMAIN = 'gajeong.local';
  // 웹 푸시 공개키 (비밀키는 서버 함수에만 있다)
  var LS_CHURCH = 'gajeong-church';   // 마지막으로 들어간 교회 — 다음 로그인 화면에 이름·로고를 보여 준다
  var NEUTRAL_ICON = 'assets/icon-192.png';

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
  function weekLabel(weekStart) {
    var a = new Date(weekStart + 'T00:00:00Z');
    var b = new Date(weekStart + 'T00:00:00Z'); b.setUTCDate(b.getUTCDate() + 6);
    var m = a.getUTCMonth() + 1, d1 = a.getUTCDate(), m2 = b.getUTCMonth() + 1, d2 = b.getUTCDate();
    return a.getUTCFullYear() + '년 ' + m + '월 ' + d1 + '일 ~ ' + m2 + '월 ' + d2 + '일';
  }
  function weekShort(weekStart) {
    var a = new Date(weekStart + 'T00:00:00Z');
    return (a.getUTCMonth() + 1) + '월 ' + a.getUTCDate() + '일 주';
  }
  function whenText(iso) {
    if (!iso) return '';
    var p = {};
    new Intl.DateTimeFormat('en-GB', {
      timeZone: TZ, month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false
    }).formatToParts(new Date(iso)).forEach(function (x) { p[x.type] = x.value; });
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
      return '<option value="' + esc(x[0]) + '">' + esc(x[1]) + ' (' + esc(x[0]) + ')</option>';
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
  function t(str) {
    if (terms === BASE_TERMS) return str;
    return String(str).replace(TERM_RE, function (m, w, j) {
      var y = terms[w === '목장' ? 'unit' : w === '목자' ? 'leader' : 'member'];
      return y + (j ? josa(y, j) : '');
    });
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
        if (!p || /^(SCRIPT|STYLE|TEXTAREA)$/.test(p.nodeName) || (p.closest && p.closest('[data-noterm]'))) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var n;
    while ((n = w.nextNode())) {
      if (!ORIG.has(n)) { if (!first || !/목[장자원]/.test(n.nodeValue)) continue; ORIG.set(n, n.nodeValue); }
      n.nodeValue = t(ORIG.get(n));
    }
    $$('[placeholder],[title],[aria-label]', root || document.body).forEach(function (el) {
      ['placeholder', 'title', 'aria-label'].forEach(function (a) {
        var v = el.getAttribute(a); if (v == null) return;
        var k = 'data-orig-' + a;
        if (!el.hasAttribute(k)) { if (!first || !/목[장자원]/.test(v)) return; el.setAttribute(k, v); }
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
    translatePage();
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
    var r = await sb.from('church_church').select('id, slug, name, timezone, logo_url, theme, terms').maybeSingle();
    if (r.error || !r.data) return null;
    church = r.data;
    setTimezone(church.timezone);
    rememberChurch(church);
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
    return location.origin + location.pathname.replace(/[^/]*$/, '') + encodeURIComponent(c.slug) + '/';
  }

  /* ── 계정 ────────────────────────────────────────────── */
  function emailOf(loginId) { return String(loginId).trim().toLowerCase() + '@' + DOMAIN; }

  async function signIn(loginId, password) {
    var r = await sb.auth.signInWithPassword({ email: emailOf(loginId), password: password });
    if (r.error) {
      var m = r.error.message || '';
      if (/invalid login|credentials/i.test(m)) throw new Error('아이디나 비밀번호가 맞지 않습니다.');
      throw new Error(m);
    }
    return r.data;
  }

  async function signOut() { await sb.auth.signOut(); location.href = 'index.html'; }

  async function me() {
    var s = await sb.auth.getSession();
    if (!s.data.session) return null;
    var uid = s.data.session.user.id;
    var r = await sb.from('church_profile').select('id, login_id, name, role, church_id').eq('id', uid).maybeSingle();
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

  async function callFn(name, payload) {
    var s = await sb.auth.getSession();
    var headers = { 'Content-Type': 'application/json', apikey: SB_KEY };
    if (s.data.session) headers.Authorization = 'Bearer ' + s.data.session.access_token;
    var res = await fetch(FN + name, { method: 'POST', headers: headers, body: JSON.stringify(payload) });
    var out = {};
    try { out = await res.json(); } catch (e) { out = {}; }
    if (!res.ok || out.error) throw new Error(out.error || ('처리하지 못했습니다 (' + res.status + ')'));
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
      ? '알림이 막혀 있습니다. 브라우저 설정에서 이 사이트 알림을 허용해 주세요.'
      : '알림 허용을 눌러 주셔야 받을 수 있습니다.');
    var reg = await pushRegistration();
    await navigator.serviceWorker.ready;
    var sub = await reg.pushManager.getSubscription() ||
      await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64((await notify({ action: 'key' })).publicKey) });
    var j = sub.toJSON();
    var r = await sb.rpc('church_push_save', {
      p_endpoint: j.endpoint, p_p256dh: j.keys.p256dh, p_auth: j.keys.auth, p_ua: navigator.userAgent.slice(0, 200)
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
      '<button class="small" id="btn-signout">로그아웃</button></div></div>';
    document.body.insertBefore(el, document.body.firstChild);
    el.querySelector('#btn-signout').addEventListener('click', signOut);
    if (c.logo_url) { var fav = document.querySelector('link[rel="icon"]'); if (fav) fav.href = c.logo_url; }
    return el;
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
    THEMES: THEMES, setTheme: setTheme, applyLook: applyLook, translatePage: translatePage
  };
})();

// 로그인한 화면(목사·목자)은 이 기기가 기억하는 교회 모양을 바로 입힌다 — 서버 답을 기다리는 동안 깜빡이지 않게.
// (로그인 화면은 주소의 교회가 다를 수 있어 index.html이 직접 정한다)
(function () {
  if (/(^|\/)(index\.html)?$/.test(location.pathname)) return;
  try {
    var mem = JSON.parse(localStorage.getItem('gajeong-church') || 'null');
    if (mem) window.CHURCH.applyLook(mem);
  } catch (e) {}
})();
