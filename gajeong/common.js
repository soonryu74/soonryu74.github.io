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

  /* ── 날짜 (한국 시간 기준) ───────────────────────────── */
  function kstNow() { return new Date(Date.now() + 9 * 3600000); }
  function ymd(d) { return d.toISOString().slice(0, 10); }
  function mondayOf(dateStr) {
    var d = dateStr ? new Date(dateStr + 'T00:00:00Z') : kstNow();
    var wd = d.getUTCDay();              // 0=일
    var back = (wd + 6) % 7;             // 월요일까지 되돌아갈 날 수
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
    var d = new Date(iso);
    var k = new Date(d.getTime() + 9 * 3600000);
    return (k.getUTCMonth() + 1) + '월 ' + k.getUTCDate() + '일 ' +
      String(k.getUTCHours()).padStart(2, '0') + ':' + String(k.getUTCMinutes()).padStart(2, '0');
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

  function header(profile, title, extraHtml) {
    var el = document.createElement('div');
    el.className = 'top';
    el.innerHTML =
      '<div class="top-in' + (document.querySelector('.wrap-wide') ? ' wide' : '') + '">' +
      '<h1>' + esc(title) + '</h1>' +
      (extraHtml || '') +
      '<div class="who"><span>' + esc(profile.name) +
      (profile.role === 'pastor' ? ' 목사님' : ' 목자님') + '</span>' +
      '<button class="small" id="btn-signout">로그아웃</button></div></div>';
    document.body.insertBefore(el, document.body.firstChild);
    el.querySelector('#btn-signout').addEventListener('click', signOut);
    return el;
  }

  return {
    sb: sb, $: $, $$: $$, esc: esc, say: say,
    mondayOf: mondayOf, addWeeks: addWeeks, weekLabel: weekLabel, weekShort: weekShort,
    ymd: ymd, kstNow: kstNow, whenText: whenText,
    signIn: signIn, signOut: signOut, me: me, guard: guard, callAdmin: callAdmin, header: header
  };
})();
