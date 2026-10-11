/* 다시봄 — 사람 기억 노트 (프로토타입)
   원칙: 상대 알림 없음 · 서버 없음(이 기기 IndexedDB) · 자동 수집 없음 · 본인이 봐도 괜찮은 메모만.
   PIN을 켜면 전체 데이터가 AES-GCM으로 암호화되어 저장되고, 키는 메모리에만 있다. */
(function () {
  'use strict';

  // ---------- 저장 (IndexedDB, 단일 blob) ----------
  const DB_NAME = 'dasibom', STORE = 'kv';
  function openDB() {
    return new Promise((res, rej) => {
      const r = indexedDB.open(DB_NAME, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(STORE);
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  }
  async function kvGet(k) {
    const db = await openDB();
    return new Promise((res, rej) => {
      const t = db.transaction(STORE, 'readonly').objectStore(STORE).get(k);
      t.onsuccess = () => res(t.result); t.onerror = () => rej(t.error);
    });
  }
  async function kvSet(k, v) {
    const db = await openDB();
    return new Promise((res, rej) => {
      const t = db.transaction(STORE, 'readwrite');
      t.objectStore(STORE).put(v, k);
      t.oncomplete = () => res(); t.onerror = () => rej(t.error);
    });
  }
  async function kvDel(k) {
    const db = await openDB();
    return new Promise((res, rej) => {
      const t = db.transaction(STORE, 'readwrite');
      t.objectStore(STORE).delete(k);
      t.oncomplete = () => res(); t.onerror = () => rej(t.error);
    });
  }

  // ---------- 암호화 ----------
  const enc = new TextEncoder(), dec = new TextDecoder();
  const b64 = {
    to: buf => btoa(String.fromCharCode(...new Uint8Array(buf))),
    from: s => Uint8Array.from(atob(s), c => c.charCodeAt(0))
  };
  async function deriveKey(pin, salt) {
    const base = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 250000, hash: 'SHA-256' }, base,
      { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }
  async function encryptJSON(obj, key) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(obj)));
    return { iv: b64.to(iv), ct: b64.to(ct) };
  }
  async function decryptJSON(blob, key) {
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64.from(blob.iv) }, key, b64.from(blob.ct));
    return JSON.parse(dec.decode(pt));
  }

  // ---------- 상태 ----------
  const state = {
    data: null,        // { people: [], settings: {} }
    key: null,         // CryptoKey (PIN 켜진 경우)
    meta: null,        // { v, enc, salt, promiseSeen, autoLockMin }
    hiddenAt: null,
    practice: null
  };
  const defaultData = () => ({ people: [], settings: {} });
  const defaultMeta = () => ({ v: 1, enc: false, salt: null, promiseSeen: false, autoLockMin: 5 });

  async function loadMeta() {
    state.meta = Object.assign(defaultMeta(), (await kvGet('meta')) || {});
  }
  async function saveMeta() { await kvSet('meta', state.meta); }

  async function loadData(key) {
    const blob = await kvGet('data');
    if (!blob) return defaultData();
    if (state.meta.enc) return Object.assign(defaultData(), await decryptJSON(blob, key));
    return Object.assign(defaultData(), blob);
  }
  async function saveData() {
    if (!state.data) return;
    if (state.meta.enc) await kvSet('data', await encryptJSON(state.data, state.key));
    else await kvSet('data', state.data);
  }

  // ---------- 유틸 ----------
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const today = () => new Date().toISOString().slice(0, 10);
  function fmtDate(s) {
    if (!s) return '';
    const [y, m, d] = s.split('-').map(Number);
    if (!y) return s;
    return `${y}년 ${m}월 ${d}일`;
  }
  function daysAgo(s) {
    if (!s) return null;
    return Math.floor((Date.now() - new Date(s).getTime()) / 86400000);
  }
  function relDate(s) {
    const d = daysAgo(s);
    if (d === null) return '';
    if (d <= 0) return '오늘';
    if (d === 1) return '어제';
    if (d < 30) return `${d}일 전`;
    if (d < 365) return `${Math.floor(d / 30)}개월 전`;
    return `${Math.floor(d / 365)}년 전`;
  }
  let toastTimer;
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.hidden = true, 2200);
  }
  function confirmBox({ title, msg, typed, danger = true }) {
    return new Promise(res => {
      $('#confirm-title').textContent = title; $('#confirm-msg').textContent = msg;
      const inp = $('#confirm-input'); inp.hidden = !typed; inp.value = ''; inp.placeholder = typed ? `"${typed}" 입력` : '';
      const yes = $('#confirm-yes'), no = $('#confirm-no');
      yes.className = 'btn ' + (danger ? 'danger' : 'primary');
      const scr = $('#confirm-screen'); scr.hidden = false;
      const check = () => yes.disabled = typed ? inp.value.trim() !== typed : false; check();
      inp.oninput = check;
      const done = v => { scr.hidden = true; yes.onclick = no.onclick = inp.oninput = null; res(v); };
      yes.onclick = () => done(true); no.onclick = () => done(false);
      if (typed) inp.focus();
    });
  }

  // ---------- 민감 내용 점검 ----------
  const BLOCK_PATTERNS = [
    { re: /\d{6}\s*-?\s*[1-4]\d{6}/, what: '주민등록번호로 보이는 숫자' },
    { re: /\b(?:\d[ -]?){15,16}\b/, what: '카드번호로 보이는 숫자' }
  ];
  const WARN_WORDS = {
    '건강': ['암 ', '암이', '우울', '정신과', '장애', '투병', '질병', '수술', '입원', '알코올', '중독'],
    '종교': ['교회', '성당', '불교', '기독', '천주교', '이슬람', '무교', '신천지', '전도'],
    '정치': ['민주당', '국민의힘', '정의당', '보수 ', '진보 ', '좌파', '우파', '지지자', '대선', '탄핵'],
    '성적 지향·가족 상황': ['동성', '게이', '레즈', '트랜스', '이혼', '재혼', '미혼모', '사별'],
    '돈·평가': ['빚', '신용불량', '파산', '연봉', '월급', '못생', '뚱뚱', '재수없', '싫다', '별로다', '한심']
  };
  function checkSensitive(text) {
    for (const b of BLOCK_PATTERNS) if (b.re.test(text)) return { block: true, what: b.what };
    const hits = [];
    for (const [cat, words] of Object.entries(WARN_WORDS)) {
      if (words.some(w => text.includes(w))) hits.push(cat);
    }
    return hits.length ? { block: false, cats: hits } : null;
  }
  function askSensitive(cats) {
    return new Promise(res => {
      $('#sensitive-msg').textContent = `${cats.join(', ')}에 관한 내용이 있는 것 같아요. 다시봄은 "상대가 어깨 너머로 봐도 괜찮은 메모"를 권해요. 상대를 잘 대하기 위해 꼭 필요한 내용이라면 저장해도 됩니다.`;
      const scr = $('#sensitive-screen'); scr.hidden = false;
      const done = v => { scr.hidden = true; res(v); };
      $('#sensitive-edit').onclick = () => done(false);
      $('#sensitive-save').onclick = () => done(true);
    });
  }

  // ---------- 검색 ----------
  function personText(p) {
    const parts = [p.name, p.group, (p.traits || []).join(' '), p.family, p.note];
    for (const m of p.meetings || []) {
      parts.push(m.where, m.talked, m.ask, fmtDate(m.date), m.date);
      if (m.date) { const [y, mo] = m.date.split('-'); parts.push(`${Number(mo)}월`, `${y}년`); }
    }
    return parts.filter(Boolean).join(' ').toLowerCase();
  }
  function search(q) {
    const tokens = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!tokens.length) return [];
    return state.data.people.filter(p => { const t = personText(p); return tokens.every(k => t.includes(k)); });
  }
  function hl(text, q) {
    let out = esc(text);
    for (const k of q.trim().split(/\s+/).filter(Boolean)) {
      const re = new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      out = out.replace(re, m => `<mark>${m}</mark>`);
    }
    return out;
  }
  const lastMeeting = p => (p.meetings || []).slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];
  const byRecent = (a, b) => ((lastMeeting(b) || {}).date || '').localeCompare((lastMeeting(a) || {}).date || '');
  const groupsOf = () => {
    const m = new Map();
    for (const p of state.data.people) { const g = p.group || '그룹 없음'; m.set(g, (m.get(g) || 0) + 1); }
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  };

  // ---------- 화면 ----------
  const view = $('#view');
  function route() {
    if (!state.data) return;
    const h = location.hash.replace(/^#/, '') || 'home';
    const [name, ...rest] = h.split('/');
    const arg = decodeURIComponent(rest.join('/'));
    $$('.tabbar a').forEach(a => a.classList.toggle('active', a.dataset.tab === name || (name === 'group' && a.dataset.tab === 'groups') || (name === 'person' && a.dataset.tab === 'home')));
    const fn = { home: vHome, new: vNew, person: vPerson, edit: vEdit, meet: vMeet, groups: vGroups, group: vGroup, practice: vPractice, settings: vSettings }[name] || vHome;
    fn(arg);
    window.scrollTo(0, 0);
  }

  function personCard(p, q = '') {
    const m = lastMeeting(p);
    const traits = (p.traits || []).filter(Boolean).join(' · ');
    return `<a class="person" href="#person/${p.id}">
      <div class="name">${q ? hl(p.name, q) : esc(p.name)}${p.group ? `<span class="chip">${esc(p.group)}</span>` : ''}</div>
      ${traits ? `<div class="traits">${q ? hl(traits, q) : esc(traits)}</div>` : ''}
      <div class="meta">${m ? `${esc(m.where || '')}${m.where ? ' · ' : ''}${relDate(m.date)}` : '만남 기록 없음'}${m && m.ask ? ` · 물어볼 것: ${esc(m.ask)}` : ''}</div>
    </a>`;
  }

  function vHome() {
    const people = state.data.people;
    const stale = people.filter(p => { const m = lastMeeting(p); return m && daysAgo(m.date) > 365 * 3; });
    view.innerHTML = `
      <h1>누구더라?</h1>
      <p class="sub">이름이 아니어도 돼요. 기억나는 단서로 찾아보세요.</p>
      <div class="search"><input id="q" type="search" placeholder="안경 부산 캠핑 · 6월 세미나 · 2학년" autocomplete="off" aria-label="검색"></div>
      <p class="hint">여러 단서를 띄어 쓰면 모두 맞는 사람만 보여요.</p>
      ${stale.length ? `<div class="banner">3년 넘게 만남 기록이 없는 분이 ${stale.length}명 있어요. <a href="#settings">설정</a>에서 정리할 수 있어요.</div>` : ''}
      <div id="results"></div>`;
    const results = $('#results');
    const renderList = (list, q) => {
      if (!people.length) {
        results.innerHTML = `<div class="empty"><span class="serif">아직 아무도 없어요</span>오늘 만난 분을 30초만 적어볼까요?<div class="actions" style="justify-content:center"><a class="btn primary" href="#new">첫 기록 남기기</a><button id="sample" class="btn" type="button">예시 3명 넣어보기</button></div></div>`;
        $('#sample').onclick = addSamples;
        return;
      }
      if (!list.length) { results.innerHTML = `<div class="empty">맞는 분이 없어요. 단서를 하나 줄여보세요.</div>`; return; }
      results.innerHTML = `<p class="hint">${q ? `${list.length}명` : `최근 만난 순 · ${people.length}명`}</p><ul class="list">${list.map(p => `<li>${personCard(p, q)}</li>`).join('')}</ul>`;
    };
    renderList(people.slice().sort(byRecent).slice(0, 30), '');
    $('#q').oninput = e => { const q = e.target.value; renderList(q.trim() ? search(q) : people.slice().sort(byRecent).slice(0, 30), q.trim()); };
  }

  function meetingFields(m = {}) {
    return `
      <label for="f-date">언제</label><input id="f-date" type="date" value="${esc(m.date || today())}">
      <label for="f-where">어디서 · 어떤 자리 <small>(맥락이 기억의 열쇠)</small></label><input id="f-where" value="${esc(m.where || '')}" placeholder="노모어매뉴얼 오프라인 모임, 2학년 3반 첫 수업">
      <label for="f-talked">나눈 이야기</label><textarea id="f-talked" placeholder="노트북LM으로 논문 정리 중이라고">${esc(m.talked || '')}</textarea>
      <label for="f-ask">다음에 물어볼 것 <small>(기억해줬다는 감동이 여기서)</small></label><input id="f-ask" value="${esc(m.ask || '')}" placeholder="딸 수능 결과, 캠핑 다녀온 얘기">`;
  }
  function personFields(p = {}) {
    const t = p.traits || ['', '', ''];
    const groups = groupsOf().map(([g]) => g).filter(g => g !== '그룹 없음');
    return `
      <label for="f-name">이름 <small>(별칭도 괜찮아요)</small></label><input id="f-name" required value="${esc(p.name || '')}" placeholder="김OO, 안경 쓴 사장님">
      <label for="f-group">그룹 <small>(학급·기수·모임·거래처)</small></label>
      <input id="f-group" list="groups-dl" value="${esc(p.group || '')}" placeholder="2026 2학년 3반, 유튜브 모임">
      <datalist id="groups-dl">${groups.map(g => `<option value="${esc(g)}">`).join('')}</datalist>
      <label>특징 3개 <small>(얼굴 대신 단서로 기억해요)</small></label>
      <div class="traits-input">
        <input id="f-t1" value="${esc(t[0] || '')}" placeholder="안경">
        <input id="f-t2" value="${esc(t[1] || '')}" placeholder="부산 말투">
        <input id="f-t3" value="${esc(t[2] || '')}" placeholder="캠핑 좋아함">
      </div>
      <details class="more" ${p.family || p.note ? 'open' : ''}><summary>가족·기념일, 자유 메모 (선택)</summary>
        <label for="f-family">가족 · 기념일</label><input id="f-family" value="${esc(p.family || '')}" placeholder="딸 고3, 결혼기념일 5월">
        <label for="f-note">자유 메모 <small>(본인이 봐도 괜찮은 내용만)</small></label><textarea id="f-note">${esc(p.note || '')}</textarea>
      </details>`;
  }
  function readPersonFields() {
    return {
      name: $('#f-name').value.trim(), group: $('#f-group').value.trim(),
      traits: [$('#f-t1').value.trim(), $('#f-t2').value.trim(), $('#f-t3').value.trim()],
      family: $('#f-family').value.trim(), note: $('#f-note').value.trim()
    };
  }
  function readMeetingFields() {
    return { date: $('#f-date').value || today(), where: $('#f-where').value.trim(), talked: $('#f-talked').value.trim(), ask: $('#f-ask').value.trim() };
  }
  async function guardSensitive(...texts) {
    const r = checkSensitive(texts.join(' '));
    if (!r) return true;
    if (r.block) { toast(`${r.what}는 저장할 수 없어요.`); return false; }
    return askSensitive(r.cats);
  }

  function vNew() {
    view.innerHTML = `
      <h1>30초 기록</h1>
      <p class="sub">만난 직후가 가장 잘 기억나요. 다 채우지 않아도 됩니다.</p>
      <form id="new-form">
        ${personFields()}
        <h3 style="margin-top:1.6rem">이번 만남</h3>
        ${meetingFields()}
        <div class="form-foot"><button class="btn primary block" type="submit">저장 (이 기기에만)</button></div>
        <p class="fine">상대에게는 아무것도 전송되지 않습니다.</p>
      </form>`;
    $('#new-form').onsubmit = async e => {
      e.preventDefault();
      const p = readPersonFields(), m = readMeetingFields();
      if (!p.name) return toast('이름(또는 별칭)은 필요해요.');
      if (!await guardSensitive(p.name, p.traits.join(' '), p.family, p.note, m.where, m.talked, m.ask)) return;
      const person = Object.assign({ id: uid(), created: today(), meetings: [m] }, p);
      state.data.people.push(person);
      await saveData();
      toast('저장했어요');
      location.hash = `#person/${person.id}`;
    };
    $('#f-name').focus();
  }

  function vPerson(id) {
    const p = state.data.people.find(x => x.id === id);
    if (!p) { location.hash = '#home'; return; }
    const ms = (p.meetings || []).slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const last = ms[0];
    view.innerHTML = `
      <div class="eyebrow">${esc(p.group || '그룹 없음')}</div>
      <h1>${esc(p.name)}</h1>
      <p class="sub">${(p.traits || []).filter(Boolean).map(esc).join(' · ') || '특징 메모 없음'}</p>
      ${last ? `<div class="card next">
        <div class="k">지난번 · ${esc(fmtDate(last.date))} (${relDate(last.date)})${last.where ? ' · ' + esc(last.where) : ''}</div>
        ${last.talked ? `<div class="v">${esc(last.talked)}</div>` : ''}
        ${last.ask ? `<div class="k">다음에 물어볼 것</div><div class="v big">${esc(last.ask)}</div>` : '<div class="v muted">다음에 물어볼 것이 비어 있어요.</div>'}
      </div>` : ''}
      <div class="actions">
        <a class="btn primary" href="#meet/${p.id}">오늘 만났어요 · 만남 추가</a>
        <a class="btn" href="#edit/${p.id}">고치기</a>
        <button id="del" class="btn ghost" type="button">지우기</button>
      </div>
      ${p.family || p.note ? `<div class="card"><dl class="kv">${p.family ? `<dt>가족·기념일</dt><dd>${esc(p.family)}</dd>` : ''}${p.note ? `<dt>메모</dt><dd>${esc(p.note)}</dd>` : ''}</dl></div>` : ''}
      <div class="card"><h3 style="margin-bottom:.6rem">만남 ${ms.length}번</h3>
        <ul class="meetings">${ms.map((m, i) => `<li>
          <div class="when">${esc(fmtDate(m.date))}${m.where ? ' · ' + esc(m.where) : ''}</div>
          ${m.talked ? `<div>${esc(m.talked)}</div>` : ''}
          ${m.ask ? `<div class="muted">물어볼 것: ${esc(m.ask)}</div>` : ''}
          <button class="btn small ghost del-m" data-i="${i}" type="button">이 만남 지우기</button>
        </li>`).join('') || '<li class="muted">아직 없어요</li>'}</ul>
      </div>
      <p class="fine">이 기록은 이 기기 안에만 있고, ${esc(p.name)} 님은 이 기록의 존재를 모릅니다.</p>`;
    $('#del').onclick = async () => {
      if (await confirmBox({ title: `${p.name} 님 기록을 지울까요?`, msg: '지우면 되돌릴 수 없어요. 만남 기록도 함께 사라집니다.' })) {
        state.data.people = state.data.people.filter(x => x.id !== id);
        await saveData(); toast('지웠어요'); location.hash = '#home';
      }
    };
    $$('.del-m').forEach(b => b.onclick = async () => {
      const m = ms[Number(b.dataset.i)];
      if (await confirmBox({ title: '이 만남을 지울까요?', msg: `${fmtDate(m.date)} 기록이 사라져요.` })) {
        p.meetings = p.meetings.filter(x => x !== m); await saveData(); vPerson(id);
      }
    });
  }

  function vEdit(id) {
    const p = state.data.people.find(x => x.id === id);
    if (!p) { location.hash = '#home'; return; }
    view.innerHTML = `<h1>고치기</h1><p class="sub">${esc(p.name)}</p><form id="edit-form">${personFields(p)}
      <div class="row-btns"><a class="btn" href="#person/${p.id}">취소</a><button class="btn primary" type="submit">저장</button></div></form>`;
    $('#edit-form').onsubmit = async e => {
      e.preventDefault();
      const f = readPersonFields();
      if (!f.name) return toast('이름(또는 별칭)은 필요해요.');
      if (!await guardSensitive(f.name, f.traits.join(' '), f.family, f.note)) return;
      Object.assign(p, f, { updated: today() }); await saveData(); toast('저장했어요'); location.hash = `#person/${p.id}`;
    };
  }

  function vMeet(id) {
    const p = state.data.people.find(x => x.id === id);
    if (!p) { location.hash = '#home'; return; }
    const last = lastMeeting(p);
    view.innerHTML = `<h1>만남 추가</h1><p class="sub">${esc(p.name)}${last && last.ask ? ` · 지난번에 물어보려던 것: <b>${esc(last.ask)}</b>` : ''}</p>
      <form id="meet-form">${meetingFields({ where: last ? last.where : '' })}
      <div class="row-btns"><a class="btn" href="#person/${p.id}">취소</a><button class="btn primary" type="submit">저장</button></div></form>`;
    $('#meet-form').onsubmit = async e => {
      e.preventDefault();
      const m = readMeetingFields();
      if (!await guardSensitive(m.where, m.talked, m.ask)) return;
      (p.meetings = p.meetings || []).push(m); await saveData(); toast('만남을 더했어요'); location.hash = `#person/${p.id}`;
    };
  }

  function vGroups() {
    const gs = groupsOf();
    view.innerHTML = `<h1>그룹</h1><p class="sub">학급·기수·모임·거래처 단위로 모아 봐요.</p>
      ${gs.length ? `<ul class="groups">${gs.map(([g, n]) => `<li><a class="group" href="#group/${encodeURIComponent(g)}"><b>${esc(g)}</b><span>${n}명</span></a></li>`).join('')}</ul>`
        : `<div class="empty"><span class="serif">그룹이 아직 없어요</span>기록할 때 그룹 칸을 채우면 여기에 모여요.</div>`}`;
  }
  function vGroup(g) {
    const list = state.data.people.filter(p => (p.group || '그룹 없음') === g).sort((a, b) => a.name.localeCompare(b.name, 'ko'));
    view.innerHTML = `<div class="eyebrow">그룹</div><h1>${esc(g)}</h1><p class="sub">${list.length}명 · 이름순</p>
      <div class="actions"><a class="btn small" href="#practice/${encodeURIComponent(g)}">이 그룹 이름 익히기</a></div>
      <ul class="list">${list.map(p => `<li>${personCard(p)}</li>`).join('')}</ul>`;
  }

  // ---------- 이름 익히기 ----------
  function vPractice(g) {
    const gs = groupsOf();
    const pool = state.data.people.filter(p => (p.traits || []).some(Boolean) && (!g || (p.group || '그룹 없음') === g));
    if (!state.practice || state.practice.group !== (g || '') ) {
      state.practice = { group: g || '', order: pool.map(p => p.id).sort(() => Math.random() - .5), i: 0, ok: 0, again: [], shown: false };
    }
    const pr = state.practice;
    const header = `<h1>이름 익히기</h1><p class="sub">특징을 보고 이름을 떠올려 보세요. 이 기기 안에서만 진행돼요.</p>
      <label for="pg">그룹</label><select id="pg"><option value="">전체</option>${gs.map(([x]) => `<option value="${esc(x)}" ${x === g ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select>`;
    if (!pool.length) {
      view.innerHTML = header + `<div class="empty"><span class="serif">연습할 사람이 없어요</span>특징을 한 개 이상 적은 사람만 카드가 돼요.</div>`;
      $('#pg').onchange = e => { state.practice = null; location.hash = '#practice' + (e.target.value ? '/' + encodeURIComponent(e.target.value) : ''); };
      return;
    }
    if (pr.i >= pr.order.length) {
      view.innerHTML = header + `<div class="flash"><div class="q">한 바퀴 끝!</div><div class="ctx">${pr.order.length}명 중 ${pr.ok}명 바로 기억났어요.</div>
        <div class="row-btns">${pr.again.length ? `<button id="again" class="btn primary" type="button">헷갈린 ${pr.again.length}명만 다시</button>` : ''}<button id="restart" class="btn" type="button">처음부터</button></div></div>`;
      $('#pg').onchange = e => { state.practice = null; location.hash = '#practice' + (e.target.value ? '/' + encodeURIComponent(e.target.value) : ''); };
      $('#restart').onclick = () => { state.practice = null; vPractice(g); };
      const ag = $('#again'); if (ag) ag.onclick = () => { state.practice = { group: g || '', order: pr.again.slice(), i: 0, ok: 0, again: [], shown: false }; vPractice(g); };
      return;
    }
    const p = state.data.people.find(x => x.id === pr.order[pr.i]);
    if (!p) { pr.i++; return vPractice(g); }
    const m = lastMeeting(p);
    view.innerHTML = header + `
      <p class="progress">${pr.i + 1} / ${pr.order.length}</p>
      <div class="flash">
        <div class="q">${(p.traits || []).filter(Boolean).map(esc).join(' · ')}</div>
        <div class="ctx">${m && m.where ? esc(m.where) : ''}${p.group ? ` · ${esc(p.group)}` : ''}</div>
        ${pr.shown ? `<div class="a">${esc(p.name)}</div>` : ''}
        <div class="row-btns">${pr.shown
          ? `<button id="no" class="btn" type="button">아직</button><button id="yes" class="btn primary" type="button">기억났어요</button>`
          : `<button id="show" class="btn primary" type="button">이름 보기</button>`}</div>
      </div>`;
    $('#pg').onchange = e => { state.practice = null; location.hash = '#practice' + (e.target.value ? '/' + encodeURIComponent(e.target.value) : ''); };
    const next = ok => { if (ok) pr.ok++; else pr.again.push(p.id); pr.i++; pr.shown = false; vPractice(g); };
    const s = $('#show'); if (s) s.onclick = () => { pr.shown = true; vPractice(g); };
    const y = $('#yes'); if (y) y.onclick = () => next(true);
    const n = $('#no'); if (n) n.onclick = () => next(false);
  }

  // ---------- 설정 ----------
  function vSettings() {
    const n = state.data.people.length, mCount = state.data.people.reduce((s, p) => s + (p.meetings || []).length, 0);
    const stale = state.data.people.filter(p => { const m = lastMeeting(p); return m && daysAgo(m.date) > 365 * 3; });
    view.innerHTML = `<h1>설정</h1><div class="settings">
      <section><div class="stat"><div><b>${n}</b><span>사람</span></div><div><b>${mCount}</b><span>만남</span></div><div><b>이 기기</b><span>저장 위치</span></div><div><b>${state.meta.enc ? '켜짐' : '꺼짐'}</b><span>PIN 암호화</span></div></div></section>
      <section><h3>PIN 잠금</h3><p class="desc">PIN을 켜면 모든 기록이 암호화되어 저장되고, 앱을 열 때마다 PIN을 묻습니다. PIN을 잊으면 아무도(우리도) 열 수 없어요.</p>
        ${state.meta.enc
          ? `<div class="actions"><button id="pin-change" class="btn small" type="button">PIN 바꾸기</button><button id="pin-off" class="btn small ghost" type="button">PIN 끄기</button></div>
             <label for="auto-lock">자동 잠금</label><select id="auto-lock">${[1, 5, 15, 60].map(v => `<option value="${v}" ${state.meta.autoLockMin === v ? 'selected' : ''}>${v}분 뒤</option>`).join('')}<option value="0" ${state.meta.autoLockMin === 0 ? 'selected' : ''}>앱을 닫을 때만</option></select>`
          : `<form id="pin-form"><label for="pin1">새 PIN (4자리 이상)</label><input id="pin1" type="password" inputmode="numeric" minlength="4" required autocomplete="off"><label for="pin2">한 번 더</label><input id="pin2" type="password" inputmode="numeric" minlength="4" required autocomplete="off"><div class="form-foot"><button class="btn primary" type="submit">PIN 켜기</button></div></form>`}
      </section>
      <section><h3>내보내기 · 가져오기</h3><p class="desc">백업은 여러분이 고른 곳(내 컴퓨터, 내 드라이브)에 파일로 남습니다. 우리 서버로는 가지 않아요.</p>
        <div class="actions"><button id="export" class="btn small" type="button">${state.meta.enc ? '암호화된 파일로 내보내기' : '파일로 내보내기'}</button>
        ${state.meta.enc ? `<button id="export-plain" class="btn small ghost" type="button">암호 없이 내보내기</button>` : ''}
        <label class="btn small" for="import" style="margin:0">가져오기<input id="import" type="file" accept="application/json,.json,.dasibom" hidden></label></div></section>
      <section><h3>정리</h3><p class="desc">${stale.length ? `3년 넘게 만남 기록이 없는 분이 ${stale.length}명 있어요. 이제 기억할 필요가 없다면 지워도 됩니다.` : '3년 넘게 만남 기록이 없는 분은 없어요.'}</p>
        ${stale.length ? `<button id="stale" class="btn small" type="button">${stale.length}명 지우기</button>` : ''}</section>
      <section><h3>전부 지우기</h3><p class="desc">이 기기의 기록을 모두 지웁니다. 되돌릴 수 없어요.</p><button id="wipe" class="btn small danger" type="button">전부 지우기</button></section>
      <section><h3>약속</h3><p class="desc">다시봄이 하지 않는 것 다섯 가지.</p><button id="show-promise" class="btn small" type="button">약속 다시 보기</button></section>
      <p class="fine">다시봄 프로토타입 · 서버 없음 · 이 기기 IndexedDB 저장 · <a href="../docs/people-memory-plan.md">기획안</a></p>
    </div>`;

    const pf = $('#pin-form'); if (pf) pf.onsubmit = async e => {
      e.preventDefault();
      const a = $('#pin1').value, b = $('#pin2').value;
      if (a !== b) return toast('두 PIN이 달라요.');
      await enablePin(a); toast('PIN을 켰어요. 기록이 암호화되었습니다.'); vSettings();
    };
    const pc = $('#pin-change'); if (pc) pc.onclick = async () => {
      const a = prompt('새 PIN (4자리 이상)'); if (!a || a.length < 4) return;
      const b = prompt('한 번 더'); if (a !== b) return toast('두 PIN이 달라요.');
      await enablePin(a); toast('PIN을 바꿨어요.');
    };
    const po = $('#pin-off'); if (po) po.onclick = async () => {
      if (await confirmBox({ title: 'PIN을 끌까요?', msg: '기록이 암호화 없이 이 기기에 저장됩니다.' })) {
        state.meta.enc = false; state.meta.salt = null; state.key = null; await saveMeta(); await saveData(); $('#lock-now').hidden = true; toast('PIN을 껐어요.'); vSettings();
      }
    };
    const al = $('#auto-lock'); if (al) al.onchange = async e => { state.meta.autoLockMin = Number(e.target.value); await saveMeta(); toast('저장했어요'); };
    $('#export').onclick = () => exportFile(state.meta.enc);
    const ep = $('#export-plain'); if (ep) ep.onclick = async () => {
      if (await confirmBox({ title: '암호 없이 내보낼까요?', msg: '이 파일은 누구든 열 수 있어요. 저장 위치를 잘 골라주세요.' })) exportFile(false);
    };
    $('#import').onchange = e => { const f = e.target.files[0]; if (f) importFile(f); };
    const st = $('#stale'); if (st) st.onclick = async () => {
      if (await confirmBox({ title: `${stale.length}명을 지울까요?`, msg: '3년 넘게 만남 기록이 없는 분들입니다. 되돌릴 수 없어요.' })) {
        const ids = new Set(stale.map(p => p.id)); state.data.people = state.data.people.filter(p => !ids.has(p.id)); await saveData(); toast('정리했어요'); vSettings();
      }
    };
    $('#wipe').onclick = async () => {
      if (await confirmBox({ title: '정말 전부 지울까요?', msg: '확인을 위해 아래에 "지우기"라고 적어주세요.', typed: '지우기' })) {
        await kvDel('data'); await kvDel('meta'); state.data = defaultData(); state.key = null; state.meta = defaultMeta(); state.meta.promiseSeen = true; await saveMeta(); $('#lock-now').hidden = true; toast('모두 지웠어요'); location.hash = '#home'; route();
      }
    };
    $('#show-promise').onclick = () => showPromise(true);
  }

  async function enablePin(pin) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    state.key = await deriveKey(pin, salt);
    state.meta.enc = true; state.meta.salt = b64.to(salt);
    await saveMeta(); await saveData();
    $('#lock-now').hidden = false;
  }

  function download(name, text) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' })); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  async function exportFile(encrypted) {
    const stamp = today();
    if (encrypted) {
      const blob = await encryptJSON(state.data, state.key);
      download(`dasibom-${stamp}.dasibom.json`, JSON.stringify({ app: 'dasibom', v: 1, enc: true, salt: state.meta.salt, ...blob }));
    } else {
      download(`dasibom-${stamp}.json`, JSON.stringify({ app: 'dasibom', v: 1, enc: false, data: state.data }, null, 1));
    }
    toast('파일을 내보냈어요');
  }
  async function importFile(file) {
    let obj;
    try { obj = JSON.parse(await file.text()); } catch { return toast('파일을 읽을 수 없어요.'); }
    if (obj.app !== 'dasibom') return toast('다시봄 파일이 아니에요.');
    let incoming;
    if (obj.enc) {
      const pin = prompt('이 파일의 PIN'); if (!pin) return;
      try { incoming = await decryptJSON(obj, await deriveKey(pin, b64.from(obj.salt))); } catch { return toast('PIN이 맞지 않아요.'); }
    } else incoming = obj.data;
    if (!incoming || !Array.isArray(incoming.people)) return toast('내용이 비어 있어요.');
    const mine = new Map(state.data.people.map(p => [p.id, p]));
    let added = 0, updated = 0;
    for (const p of incoming.people) {
      const cur = mine.get(p.id);
      if (!cur) { state.data.people.push(p); added++; }
      else if ((p.updated || p.created || '') > (cur.updated || cur.created || '')) { Object.assign(cur, p); updated++; }
    }
    await saveData(); toast(`${added}명 추가, ${updated}명 갱신`); vSettings();
  }

  async function addSamples() {
    const samples = [
      { name: '예시 · 안경 사장님', group: '예시', traits: ['안경', '부산 말투', '캠핑 좋아함'], family: '딸 고3', meetings: [{ date: '2026-09-03', where: '노모어매뉴얼 오프라인 모임', talked: '노트북LM으로 논문 정리 중', ask: '딸 수능 결과' }] },
      { name: '예시 · 민지', group: '예시', traits: ['앞자리', '질문 많음', '축구'], meetings: [{ date: '2026-03-02', where: '2학년 3반 첫 수업', talked: '영어 듣기가 어렵다고', ask: '축구 대회 결과' }] },
      { name: '예시 · 카페 옆자리 분', group: '예시', traits: ['보라색 노트북', '조용함', '아이스 라떼'], meetings: [{ date: '2026-08-20', where: '동네 카페', talked: '1인 창업 준비 중, 바이브코딩 관심', ask: '앱 만들기 시작했는지' }] }
    ];
    for (const s of samples) state.data.people.push(Object.assign({ id: uid(), created: today() }, s));
    await saveData(); toast('예시 3명을 넣었어요 (그룹: 예시)'); route();
  }

  // ---------- 약속 · 잠금 ----------
  function showPromise(manual) {
    const scr = $('#promise-screen'); scr.hidden = false;
    $('#promise-ok').onclick = async () => { scr.hidden = true; if (!manual) { state.meta.promiseSeen = true; await saveMeta(); } };
  }
  function lock() {
    if (!state.meta.enc) return;
    state.key = null; state.data = null; view.innerHTML = '';
    $('#lock-screen').hidden = false; $('#unlock-pin').value = ''; $('#unlock-error').hidden = true; $('#unlock-pin').focus();
  }
  async function unlock(pin) {
    try {
      const key = await deriveKey(pin, b64.from(state.meta.salt));
      state.data = await loadData(key); state.key = key;
      $('#lock-screen').hidden = true; route(); return true;
    } catch { $('#unlock-error').hidden = false; return false; }
  }

  // ---------- 시작 ----------
  async function init() {
    await loadMeta();
    if (state.meta.enc) {
      $('#lock-now').hidden = false;
      $('#lock-screen').hidden = false; $('#unlock-pin').focus();
    } else {
      state.data = await loadData(null);
      route();
      if (!state.meta.promiseSeen) showPromise(false);
    }
    $('#unlock-form').onsubmit = e => { e.preventDefault(); unlock($('#unlock-pin').value); };
    $('#lock-now').onclick = lock;
    window.addEventListener('hashchange', route);
    document.addEventListener('visibilitychange', () => {
      if (!state.meta.enc) return;
      if (document.hidden) state.hiddenAt = Date.now();
      else if (state.hiddenAt && state.meta.autoLockMin > 0 && Date.now() - state.hiddenAt > state.meta.autoLockMin * 60000 && state.key) lock();
    });
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
  init().catch(err => { console.error(err); view.innerHTML = `<div class="empty">시작하는 중 문제가 생겼어요. 새로고침해 주세요.<br><small>${esc(err.message)}</small></div>`; });
})();
