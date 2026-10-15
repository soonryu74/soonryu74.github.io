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
        var row = Object.assign({ id: 'n' + (++nid), created_at: new Date().toISOString(), updated_at: new Date().toISOString() }, d);
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
        if (!p || o.password !== 'pass1234') return Promise.resolve({ data: null, error: { message: 'Invalid login credentials' } });
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
      if (fn === 'church_public_info') {
        var c = DB.church_church.filter(function (x) { return x.slug === args.p_slug; })[0];
        return Promise.resolve({ data: c ? [{ name: c.name, logo_url: c.logo_url }] : [], error: null });
      }
      if (fn === 'church_push_save') {
        DB.church_push = DB.church_push.filter(function (r) { return r.endpoint !== args.p_endpoint; });
        DB.church_push.push({ id: 'push' + (++nid), user_id: session.user.id, endpoint: args.p_endpoint, p256dh: args.p_p256dh, auth: args.p_auth });
        persist();
        return Promise.resolve({ data: null, error: null });
      }
      return Promise.resolve({ data: null, error: { message: 'unknown rpc' } });
    }
  };
  window.supabase = { createClient: function () { return client; } };

  // 서버 함수 흉내
  var realFetch = window.fetch;
  window.fetch = function (url, opt) {
    var u = String(url);
    if (u.indexOf('/functions/v1/') < 0) return realFetch.apply(window, arguments);
    var b = {}; try { b = JSON.parse(opt.body); } catch (e) {}
    record({ fn: u.split('/functions/v1/')[1], body: b });
    var reply = { ok: true };
    if (u.indexOf('church-admin') >= 0 && b.action === 'register_church') {
      if (b.invite_code !== 'GOOD-CODE') reply = { error: '초대 코드가 맞지 않습니다' };
      else {
        var cid = 'c' + (++nid), uid = 'u' + (++nid);
        DB.church_church.push({ id: cid, slug: 'newch1', name: b.church_name, timezone: b.timezone, logo_url: '' });
        DB.church_profile.push({ id: uid, login_id: b.login_id, name: b.name, role: 'pastor', church_id: cid });
        reply = { ok: true, slug: 'newch1' };
      }
    }
    if (u.indexOf('church-notify') >= 0) reply = { ok: true, sent: b.action === 'test' ? DB.church_push.length : 1, devices: 1 };
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
