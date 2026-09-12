/* 목장 나눔터 — 모든 화면이 함께 쓰는 것들 */
window.CHURCH = (function () {
  var SB_URL = 'https://dxhmprqfgigljgbstqrg.supabase.co';
  // 아래 키는 브라우저에 드러나도 되는 공개 키다. 실제 보호는 데이터베이스 RLS가 한다.
  var SB_KEY = 'sb_publishable__FXGut04uxuz44s2443_8g_AByEuL-n';
  var FN_URL = SB_URL + '/functions/v1/church-admin';
  var DOMAIN = 'gajeong.local';

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

  /* ── 날짜 (교회가 있는 멜번 현지 시각 기준) ─────────────
     서머타임이 해마다 바뀌므로 시차를 숫자로 박지 않고 표준 시간대 이름을 쓴다.
     보는 사람이 한국에 있든 멜번에 있든 같은 '이번 주'를 본다. */
  var TZ = 'Australia/Melbourne';
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
    var r = await sb.from('church_profile').select('id, login_id, name, role').eq('id', uid).maybeSingle();
    if (r.error || !r.data) return null;
    return r.data;
  }

  // 로그인 안 했으면 로그인 화면으로, 역할이 다르면 제 화면으로 돌려보낸다
  async function guard(needRole) {
    var p = await me();
    if (!p) { location.replace('index.html'); return null; }
    if (needRole && p.role !== needRole) {
      location.replace(p.role === 'pastor' ? 'moksa.html' : 'mokjang.html');
      return null;
    }
    return p;
  }

  async function callAdmin(payload) {
    var s = await sb.auth.getSession();
    var headers = { 'Content-Type': 'application/json', apikey: SB_KEY };
    if (s.data.session) headers.Authorization = 'Bearer ' + s.data.session.access_token;
    var res = await fetch(FN_URL, { method: 'POST', headers: headers, body: JSON.stringify(payload) });
    var out = {};
    try { out = await res.json(); } catch (e) { out = {}; }
    if (!res.ok || out.error) throw new Error(out.error || ('처리하지 못했습니다 (' + res.status + ')'));
    return out;
  }

  // '홍길동' → '홍길동 목사님'. 이미 직함이 붙어 있으면 겹쳐 붙이지 않는다.
  function title2(p) {
    var n = (p.name || '').trim();
    var suffix = p.role === 'pastor' ? '목사님' : '목자님';
    if (/(목사|목자)(님)?$/.test(n)) return n;
    return n ? n + ' ' + suffix : suffix;
  }

  function header(profile, title, extraHtml) {
    var el = document.createElement('div');
    el.className = 'top';
    el.innerHTML =
      '<div class="top-in' + (document.querySelector('.wrap-wide') ? ' wide' : '') + '">' +
      '<img class="mark" src="assets/mark.png" alt="">' +
      '<div class="titles"><h1>' + esc(title) + '</h1>' +
      '<span class="church">멜번방주교회 &amp; ALF</span></div>' +
      (extraHtml || '') +
      '<div class="who"><span>' + esc(title2(profile)) + '</span>' +
      '<button class="small" id="btn-signout">로그아웃</button></div></div>';
    document.body.insertBefore(el, document.body.firstChild);
    el.querySelector('#btn-signout').addEventListener('click', signOut);
    return el;
  }

  return {
    sb: sb, $: $, $$: $$, esc: esc, say: say,
    mondayOf: mondayOf, addWeeks: addWeeks, weekLabel: weekLabel, weekShort: weekShort,
    ymd: ymd, today: today, whenText: whenText,
    signIn: signIn, signOut: signOut, me: me, guard: guard, callAdmin: callAdmin, header: header, title2: title2
  };
})();
