/* 목장 나눔터 테스트용 가짜 서버 — supabase 클라이언트·서버 함수·푸시 API를 흉내 낸다.
   실제 RLS와 같은 결과가 나오게 '교회 범위'를 흉내 낸다. 기도제목 중복 방지 트리거는 일부러 흉내 내지 않는다
   (화면이 스스로 중복을 만들지 않는지 보려고). */
(function () {
  var seed = window.__SEED || {};
  var DB = JSON.parse(JSON.stringify(seed.db || {}));
  ['church_church','church_profile','church_mokjang','church_mokwon','church_journal','church_prayer','church_comment','church_push']
    .forEach(function (t) { DB[t] = DB[t] || []; });
  var nid = 1000;
  var KEY = '__mock_session';
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } }
  function save(s) { try { s ? localStorage.setItem(KEY, JSON.stringify(s)) : localStorage.removeItem(KEY); } catch (e) {} }
  // 화면을 옮겨도 자료가 남게 sessionStorage에 DB를 둔다
  try { var kept = sessionStorage.getItem('__mock_db'); if (kept) DB = JSON.parse(kept); } catch (e) {}
  function persist() { try { sessionStorage.setItem('__mock_db', JSON.stringify(DB)); } catch (e) {} }
  window.__DB = function () { return DB; };
  window.__calls = JSON.parse(sessionStorage.getItem('__mock_calls') || '[]');
  function record(c) { window.__calls.push(c); sessionStorage.setItem('__mock_calls', JSON.stringify(window.__calls)); }

  var session = load();
  function me() { return session ? DB.church_profile.filter(function (p) { return p.id === session.user.id; })[0] : null; }
  function mjOf(id) { return DB.church_mokjang.filter(function (m) { return m.id === id; })[0]; }
  function jOf(id) { return DB.church_journal.filter(function (j) { return j.id === id; })[0]; }
  function canSeeMj(p, mid) {
    var m = mjOf(mid); if (!m) return false;
    return m.mokja_id === p.id || (p.role === 'pastor' && m.church_id === p.church_id);
  }
  function rls(table, rows) {
    var p = me(); if (!p) return [];
    switch (table) {
      case 'church_church': return rows.filter(function (r) { return r.id === p.church_id; });
      case 'church_profile': return rows.filter(function (r) { return r.id === p.id || (p.role === 'pastor' && r.church_id === p.church_id); });
      case 'church_mokjang': return rows.filter(function (r) { return canSeeMj(p, r.id); });
      case 'church_mokwon': case 'church_journal': return rows.filter(function (r) { return canSeeMj(p, r.mokjang_id); });
      case 'church_prayer': case 'church_comment':
        return rows.filter(function (r) { var j = jOf(r.journal_id); return j && canSeeMj(p, j.mokjang_id); });
      case 'church_push': return rows.filter(function (r) { return r.user_id === p.id; });
    }
    return rows;
  }

  function qb(table) {
    var st = { op: 'select', filters: [], orders: [], limit: null, data: null, ret: false, single: null };
    var api = {
      select: function () { if (st.op !== 'select') st.ret = true; return api; },
      eq: function (c, v) { st.filters.push(function (r) { return String(r[c]) === String(v); }); return api; },
      gte: function (c, v) { st.filters.push(function (r) { return r[c] != null && String(r[c]) >= String(v); }); return api; },
      in: function (c, arr) { var a = (arr || []).map(String); st.filters.push(function (r) { return a.indexOf(String(r[c])) >= 0; }); return api; },
      order: function (c, o) { st.orders.push([c, !o || o.ascending !== false]); return api; },
      limit: function (n) { st.limit = n; return api; },
      maybeSingle: function () { st.single = 'maybe'; return api; },
      single: function () { st.single = 'one'; return api; },
      insert: function (d) { st.op = 'insert'; st.data = d; return api; },
      update: function (d) { st.op = 'update'; st.data = d; return api; },
      delete: function () { st.op = 'delete'; return api; },
      then: function (res, rej) { return Promise.resolve(run(table, st)).then(res, rej); }
    };
    return api;
  }
  function match(rows, st) { return rows.filter(function (r) { return st.filters.every(function (f) { return f(r); }); }); }
  function sortRows(rows, st) {
    if (!st.orders.length) return rows;
    return rows.slice().sort(function (a, b) {
      for (var i = 0; i < st.orders.length; i++) {
        var c = st.orders[i][0], asc = st.orders[i][1], x = a[c] == null ? '' : a[c], y = b[c] == null ? '' : b[c];
        if (x < y) return asc ? -1 : 1; if (x > y) return asc ? 1 : -1;
      }
      return 0;
    });
  }
  function wrap(rows, st) {
    if (st.single === 'maybe') return { data: rows[0] || null, error: null };
    if (st.single === 'one') return rows[0] ? { data: rows[0], error: null } : { data: null, error: { message: '없음' } };
    return { data: rows, error: null };
  }
  function run(table, st) {
    var all = DB[table];
    var out;
    if (st.op === 'select') {
      var rows = sortRows(match(rls(table, all), st), st);
      if (st.limit) rows = rows.slice(0, st.limit);
      out = wrap(rows.map(function (r) { return Object.assign({}, r); }), st);
    } else if (st.op === 'insert') {
      var items = Array.isArray(st.data) ? st.data : [st.data];
      var made = items.map(function (d) {
        var row = Object.assign({ id: 'n' + (++nid), created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          table === 'church_mokwon' || table === 'church_mokjang' ? { active: true, tag: '' } : {}, d);   // DB 기본값 흉내
        all.push(row); return Object.assign({}, row);
      });
      out = wrap(made, st);
    } else if (st.op === 'update') {
      var hit = match(rls(table, all), st);
      hit.forEach(function (r) { Object.assign(r, st.data, { updated_at: new Date().toISOString() }); });
      out = wrap(hit.map(function (r) { return Object.assign({}, r); }), st);
    } else if (st.op === 'delete') {
      var gone = match(rls(table, all), st);
      DB[table] = all.filter(function (r) { return gone.indexOf(r) < 0; });
      out = wrap([], st);
    }
    persist();
    return out;
  }

  var client = {
    auth: {
      signInWithPassword: function (o) {
        var id = String(o.email).split('@')[0];
        var p = DB.church_profile.filter(function (x) { return x.login_id === id; })[0];
        var pw = (DB.__newpw && p && DB.__newpw[p.id]) || 'pass1234';
        if (!p || o.password !== pw) return Promise.resolve({ data: null, error: { message: 'Invalid login credentials' } });
        session = { access_token: 'tok-' + p.id, user: { id: p.id } }; save(session);
        return Promise.resolve({ data: { session: session }, error: null });
      },
      signOut: function () { session = null; save(null); return Promise.resolve({ error: null }); },
      getSession: function () { return Promise.resolve({ data: { session: session } }); },
      updateUser: function () { return Promise.resolve({ data: {}, error: null }); }
    },
    from: qb,
    rpc: function (fn, args) {
      record({ rpc: fn, args: args });
      if (fn === 'church_public_church') {
        var c = DB.church_church.filter(function (x) { return x.slug === args.p_slug; })[0];
        return Promise.resolve({ data: c ? [{ name: c.name, logo_url: c.logo_url, theme: c.theme || 'note', terms: c.terms || {} }] : [], error: null });
      }
      if (fn === 'church_push_save' || fn === 'church_push_save2') {
        DB.church_push = DB.church_push.filter(function (r) { return r.endpoint !== args.p_endpoint; });
        DB.church_push.push({ id: 'push' + (++nid), user_id: session.user.id, endpoint: args.p_endpoint, p256dh: args.p_p256dh, auth: args.p_auth });
        persist();
        return Promise.resolve({ data: null, error: null });
      }
      return Promise.resolve({ data: null, error: { message: 'unknown rpc' } });
    }
  };
  // 사진 저장소 흉내 (비공개 — 그 목원을 볼 수 있는 사람만 올리고 지운다)
  var PIX = 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==';
  client.storage = { from: function () { return {
    upload: function (path, blob, opts) {
      var p = me(), wid = String(path).split('/').pop().replace(/\.jpg$/, ''), w = DB.church_mokwon.find(function (x) { return x.id === wid; });
      var pf = /^p_/.test(wid) && DB.church_profile.find(function (x) { return x.id === wid.slice(2); });
      var okProfile = pf && p && (pf.id === p.id || (p.role === 'pastor' && p.church_id === pf.church_id));
      if (!okProfile && (!p || !w || !canSeeMj(p, w.mokjang_id))) return Promise.resolve({ data: null, error: { message: 'new row violates row-level security policy' } });
      DB.__photos = DB.__photos || {}; DB.__photos[path] = { type: opts && opts.contentType, size: blob && blob.size }; persist();
      return Promise.resolve({ data: { path: path }, error: null });
    },
    remove: function (paths) { (paths || []).forEach(function (x) { if (DB.__photos) delete DB.__photos[x]; }); persist(); return Promise.resolve({ data: [], error: null }); },
    createSignedUrls: function (paths) { return Promise.resolve({ data: paths.map(function (x) { return { path: x, signedUrl: (DB.__photos && DB.__photos[x]) ? PIX : null }; }), error: null }); }
  }; } };
  window.supabase = { createClient: function () { return client; } };

  // 서버 함수 흉내
  var realFetch = window.fetch;
  window.fetch = function (url, opt) {
    var u = String(url);
    if (u.indexOf('/functions/v1/') < 0) return realFetch.apply(window, arguments);
    var b = {}; try { b = JSON.parse(opt.body); } catch (e) {}
    record({ fn: u.split('/functions/v1/')[1], body: b });
    var reply = { ok: true };
    if (u.indexOf('church-admin') >= 0 && b.action === 'entry_links') {
      var mine = me();
      DB.__keys = DB.__keys || {};
      reply = { ok: true, links: DB.church_profile.filter(function (x) { return x.church_id === mine.church_id && x.role === 'mokja'; }).map(function (x, i) {
        var k = 'ENTR-' + String(1000 + i) + '-' + x.id.toUpperCase().replace(/[^A-Z0-9]/g, '').padEnd(4, 'X').slice(0, 4);
        Object.keys(DB.__keys).forEach(function (old) { if (DB.__keys[old] === x.id) delete DB.__keys[old]; });
        DB.__keys[k.replace(/-/g, '')] = x.id;
        return { user_id: x.id, name: x.name, login_id: x.login_id, key: k, since_move: false };
      }) };
    }
    if (u.indexOf('church-admin') >= 0 && b.action === 'key_login') {
      var kid = (DB.__keys || {})[String(b.key || '').toUpperCase().replace(/[^A-Z0-9]/g, '')];
      var kp = kid && DB.church_profile.find(function (x) { return x.id === kid; });
      if (!kp) { reply = { error: '입장 링크가 맞지 않습니다. 목사님께 새 링크를 받아 주세요' }; }
      else { DB.__newpw = DB.__newpw || {}; DB.__newpw[kp.id] = 'keypw-' + kp.id; reply = { ok: true, login_id: kp.login_id, password: 'keypw-' + kp.id }; }
    }
    if (u.indexOf('church-admin') >= 0 && b.action === 'check_slug') {   // 서버 slugProblem 흉내
      var taken = DB.church_church.some(function (x) { return x.slug === b.slug; });
      var bad = !/^[a-z][a-z0-9-]{0,18}[a-z0-9]$/.test(b.slug || '') ? '교회 주소는 영어 소문자와 숫자로 2~20자로 적어 주세요 (예: hanul)'
        : ['assets', 'darak', 'video', 'admin'].indexOf(b.slug) >= 0 ? '이 주소는 쓸 수 없습니다. 다른 이름을 골라 주세요'
        : taken ? '이미 다른 교회가 쓰는 주소입니다. 다른 이름을 골라 주세요' : null;
      reply = { ok: true, available: !bad, problem: bad };
    }
    if (u.indexOf('church-admin') >= 0 && b.action === 'register_church' && b.slug && DB.church_church.some(function (x) { return x.slug === b.slug; })) {
      reply = { error: '이미 다른 교회가 쓰는 주소입니다. 다른 이름을 골라 주세요' };
    } else
    if (u.indexOf('church-admin') >= 0 && b.action === 'register_church') {
      if (b.invite_code !== 'GOOD-CODE') reply = { error: '초대 코드가 맞지 않습니다' };
      else {
        var cid = 'c' + (++nid), uid = 'u' + (++nid);
        DB.church_church.push({ id: cid, slug: b.slug || 'newch1', name: b.church_name, timezone: b.timezone, logo_url: '' });
        DB.church_profile.push({ id: uid, login_id: b.login_id, name: b.name, role: 'pastor', church_id: cid });
        DB.__recovery = DB.__recovery || {}; DB.__recovery[uid] = 'ABCD-EFGH-JKMN';
        reply = { ok: true, slug: b.slug || 'newch1', recovery_code: 'ABCD-EFGH-JKMN' };
      }
    }
    if (u.indexOf('church-admin') >= 0 && b.action === 'set_logo') {
      var me0 = me();
      var ch0 = me0 && DB.church_church.find(function (x) { return x.id === me0.church_id; });
      if (!/^data:image\/png;base64,/.test(b.data || '')) reply = { error: 'PNG 그림이 아닙니다' };
      else { ch0.logo_url = 'https://storage.example/' + ch0.id + '.png?v=1'; reply = { ok: true, logo_url: ch0.logo_url }; }
    }
    if (u.indexOf('church-admin') >= 0 && b.action === 'remove_logo') {
      var me1 = me();
      DB.church_church.find(function (x) { return x.id === me1.church_id; }).logo_url = ''; reply = { ok: true };
    }
    if (u.indexOf('church-admin') >= 0 && b.action === 'delete_me') {
      var me2 = me();
      var pastors = DB.church_profile.filter(function (x) { return x.role === 'pastor' && x.church_id === me2.church_id; });
      if (me2.role === 'pastor' && pastors.length <= 1) reply = { error: '마지막 목사 계정은 탈퇴할 수 없습니다. 교회를 그만 쓰시려면 [교회 지우기]를 눌러 주세요' };
      else {
        DB.church_profile = DB.church_profile.filter(function (x) { return x.id !== me2.id; });
        DB.church_mokjang.forEach(function (m) { if (m.mokja_id === me2.id) m.mokja_id = null; });
      }
    }
    if (u.indexOf('church-admin') >= 0 && b.action === 'delete_church') {
      var me3 = me(), ch3 = DB.church_church.find(function (x) { return x.id === me3.church_id; });
      if ((b.confirm_name || '').trim() !== ch3.name) reply = { error: '교회 이름이 맞지 않습니다' };
      else {
        var mjs = DB.church_mokjang.filter(function (m) { return m.church_id === ch3.id; }).map(function (m) { return m.id; });
        DB.church_mokjang = DB.church_mokjang.filter(function (m) { return mjs.indexOf(m.id) < 0; });
        DB.church_journal = DB.church_journal.filter(function (j) { return mjs.indexOf(j.mokjang_id) < 0; });
        DB.church_profile = DB.church_profile.filter(function (x) { return x.church_id !== ch3.id; });
        DB.church_church = DB.church_church.filter(function (x) { return x.id !== ch3.id; });
      }
    }
    if (u.indexOf('church-admin') >= 0 && b.action === 'new_recovery_code') {
      DB.__recovery = DB.__recovery || {}; DB.__recovery[me().id] = 'PQRS-TUVW-XYZ2'; reply = { ok: true, recovery_code: 'PQRS-TUVW-XYZ2' };
    }
    if (u.indexOf('church-admin') >= 0 && b.action === 'recover') {
      var pf = DB.church_profile.find(function (x) { return x.login_id === String(b.login_id || '').toLowerCase(); });
      var want = pf && DB.__recovery && DB.__recovery[pf.id];
      if (!want || want.replace(/-/g, '') !== String(b.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '')) reply = { error: '아이디나 복구 코드가 맞지 않습니다' };
      else { DB.__newpw = DB.__newpw || {}; DB.__newpw[pf.id] = b.password; }
    }
    function keyless(name, church) {   // 비밀번호 없는 목자 계정 + 열쇠 코드
      var uid = 'u' + (++nid), lid = 'k_test' + nid, pw = 'pw' + nid, key = 'KEYS-' + String(1000 + nid) + '-ABCD';
      DB.church_profile.push({ id: uid, login_id: lid, name: name, role: 'mokja', church_id: church });
      DB.__newpw = DB.__newpw || {}; DB.__newpw[uid] = pw;
      DB.__keys = DB.__keys || {}; Object.keys(DB.__keys).forEach(function (k) { if (DB.__keys[k] === uid) delete DB.__keys[k]; });
      DB.__keys[key.replace(/-/g, '')] = uid;
      return { uid: uid, login_id: lid, password: pw, key: key };
    }
    if (u.indexOf('darak-admin') >= 0 && b.action === 'join_mokja') {
      var jc = (DB.__join || {})[String(b.join_code || '').toUpperCase().replace(/[^A-Z0-9]/g, '')];
      if (!jc) reply = { error: '가입 코드가 맞지 않습니다. 목사님께 다시 물어봐 주세요' };
      else {
        var jch = DB.church_church.find(function (x) { return x.id === jc; }), unit = (jch.terms && jch.terms.unit) || '다락방';
        var ja = keyless(b.name, jc);
        DB.church_mokjang.push({ id: 'mj' + (++nid), name: (b.mokjang_name || '').trim() || b.name + ' ' + unit, mokja_id: ja.uid, mokja_name: b.name,
          church_id: jc, sort_order: 0, active: true, created_at: '2026-10-16' });
        reply = { ok: true, slug: jch.slug, login_id: ja.login_id, password: ja.password, key: ja.key };
      }
    }
    if (u.indexOf('darak-admin') >= 0 && b.action === 'start_solo') {
      var sc = 'c' + (++nid), sname = (b.mokjang_name || '').trim() || b.name + ' 다락방';
      DB.church_church.push({ id: sc, slug: 'solo' + nid, name: sname, timezone: b.timezone || 'Australia/Melbourne', logo_url: '',
        terms: { unit: '다락방', leader: '순장', member: '순원' }, features: { solo: true } });
      var sa = keyless(b.name, sc);
      DB.church_mokjang.push({ id: 'mj' + (++nid), name: sname, mokja_id: sa.uid, mokja_name: b.name, church_id: sc, sort_order: 0, active: true, created_at: '2026-10-16' });
      reply = { ok: true, slug: 'solo' + nid, login_id: sa.login_id, password: sa.password, key: sa.key };
    }
    if (u.indexOf('darak-admin') >= 0 && b.action === 'key_login') {
      var kuid = (DB.__keys || {})[String(b.key || '').toUpperCase().replace(/[^A-Z0-9]/g, '')];
      var kp = kuid && DB.church_profile.find(function (x) { return x.id === kuid; });
      if (!kp) reply = { error: '열쇠 코드가 맞지 않습니다' };
      else { DB.__newpw = DB.__newpw || {}; DB.__newpw[kuid] = 'pw' + (++nid); reply = { ok: true, login_id: kp.login_id, password: DB.__newpw[kuid] }; }
    }
    if (u.indexOf('darak-admin') >= 0 && (b.action === 'new_key' || b.action === 'leader_new_key')) {
      var target = b.action === 'new_key' ? me() : DB.church_profile.find(function (x) { return x.id === b.user_id; });
      var nk = 'NEWK-' + String(1000 + (++nid)) + '-WXYZ';
      Object.keys(DB.__keys || {}).forEach(function (k) { if (DB.__keys[k] === target.id) delete DB.__keys[k]; });
      DB.__keys = DB.__keys || {}; DB.__keys[nk.replace(/-/g, '')] = target.id;
      reply = { ok: true, key: nk };
    }
    if (u.indexOf('darak-admin') >= 0 && (b.action === 'link_church' || b.action === 'delete_solo')) {
      var ms = me(), mch = DB.church_church.find(function (x) { return x.id === ms.church_id; });
      if (!(mch && mch.features && mch.features.solo)) reply = { error: '혼자 쓰는 순장 계정이 아닙니다' };
      else if (b.action === 'delete_solo') {
        DB.church_profile = DB.church_profile.filter(function (x) { return x.id !== ms.id; });
        DB.church_mokjang = DB.church_mokjang.filter(function (m) { return m.church_id !== mch.id; });
        DB.church_church = DB.church_church.filter(function (x) { return x.id !== mch.id; });
      } else {
        var tgt = (DB.__join || {})[String(b.join_code || '').toUpperCase().replace(/[^A-Z0-9]/g, '')];
        if (!tgt) reply = { error: '가입 코드가 맞지 않습니다. 목사님께 다시 물어봐 주세요' };
        else {
          DB.church_mokjang.forEach(function (m) { if (m.church_id === mch.id) m.church_id = tgt; });
          ms.church_id = tgt;
          DB.church_church = DB.church_church.filter(function (x) { return x.id !== mch.id; });
          reply = { ok: true, name: DB.church_church.find(function (x) { return x.id === tgt; }).name };
        }
      }
    }
    if (u.indexOf('darak-admin') >= 0 && /^join_code_/.test(b.action)) {
      var mej = me(); DB.__join = DB.__join || {};
      var cur = Object.keys(DB.__join).find(function (k) { return DB.__join[k] === mej.church_id; });
      if (mej.role !== 'pastor') reply = { error: '목사 계정만 쓸 수 있습니다' };
      else if (b.action === 'join_code_get') reply = { ok: true, code: cur ? cur.slice(0, 4) + '-' + cur.slice(4) : null };
      else {
        if (cur) delete DB.__join[cur];
        if (b.action === 'join_code_new') { var nc = 'JOIN' + (1000 + (++nid)); DB.__join[nc] = mej.church_id; reply = { ok: true, code: nc.slice(0, 4) + '-' + nc.slice(4) }; }
      }
    }
    if (u.indexOf('church-notify') >= 0) reply = b.action === 'key' ? { publicKey: 'BEd3W7naVVZVjZKZZYJiVVxsVFqwxfQM4oNwgxuRb88ja3SPrlpHK0WKduDOHUVXfRhz3I6ZlC-iNnyB4Ob64p4' } : { ok: true, sent: b.action === 'test' ? DB.church_push.length : 1, devices: 1 };
    if (u.indexOf('church-notify') >= 0 && b.action === 'remind') reply = { ok: true, leaders: 1, reached: DB.church_push.length ? 1 : 0, sent: 1, devices: 1, noDevice: DB.church_push.length ? [] : ['김목자'] };
    if (u.indexOf('church-notify') >= 0 && b.action === 'set_deadline') {
      var chd = DB.church_church.find(function (x) { return x.id === me().church_id; });
      chd.features = Object.assign({}, chd.features, { deadline: b.dow === -1 ? false : { dow: b.dow, hour: b.hour } });
      reply = { ok: true, deadline: chd.features.deadline };
    }
    persist();
    var status = reply.error ? 403 : 200;
    return Promise.resolve(new Response(JSON.stringify(reply), { status: status, headers: { 'Content-Type': 'application/json' } }));
  };

  // 푸시 API 흉내 (window.__NO_PUSH 가 있으면 지원 안 하는 브라우저로)
  if (!window.__NO_PUSH) {
    var state = JSON.parse(sessionStorage.getItem('__mock_push') || '{"perm":"default","sub":null}');
    function keep() { sessionStorage.setItem('__mock_push', JSON.stringify(state)); }
    function subObj() {
      return state.sub && { endpoint: state.sub, toJSON: function () { return { endpoint: state.sub, keys: { p256dh: 'P256', auth: 'AUTH' } }; },
        unsubscribe: function () { state.sub = null; keep(); return Promise.resolve(true); } };
    }
    var reg = { pushManager: {
      getSubscription: function () { return Promise.resolve(subObj()); },
      subscribe: function () { state.sub = 'https://push.example/dev-' + Date.now(); keep(); return Promise.resolve(subObj()); }
    } };
    window.PushManager = function () {};
    window.Notification = { get permission() { return state.perm; },
      requestPermission: function () { state.perm = window.__DENY ? 'denied' : 'granted'; keep(); return Promise.resolve(state.perm); } };
    Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: {
      register: function () { state.reg = true; keep(); return Promise.resolve(reg); },
      getRegistration: function () { return Promise.resolve(state.reg ? reg : undefined); },
      ready: Promise.resolve(reg)
    } });
  } else {
    try { delete window.PushManager; } catch (e) {}
  }
})();
