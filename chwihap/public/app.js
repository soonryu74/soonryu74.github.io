/* 업무망 취합도우미 — 화면 코드 (빌드 도구 없이 바로 동작) */
'use strict';

const $app = document.getElementById('app');
const DEPT_COLORS = ['#2563eb', '#059669', '#d97706', '#7c3aed', '#db2777', '#0891b2', '#65a30d', '#dc2626', '#4f46e5', '#0d9488', '#9333ea', '#ca8a04'];
const TYPE_LABEL = { modify: '수정', delete: '삭제', new: '신설' };
const STATUS = {
  draft: ['작성중', ''],
  pending: ['검토대기', 'blue'],
  accepted: ['채택', 'green'],
  rejected: ['불채택', 'red'],
  hold: ['보류', 'orange'],
};

const S = {
  mode: location.pathname.startsWith('/d/') ? 'dept' : 'admin',
  token: location.pathname.startsWith('/d/') ? decodeURIComponent(location.pathname.slice(3)) : null,
  project: null,
  list: null,
  presence: [],
  open: {}, // 펼친 이력 등
  drafts: {}, // 부서 화면: articleId(또는 new:xxx) → 작성 중 의견
  filter: 'all',
  cmp: { from: 'v0', to: 'current', all: false },
  pendingRender: false,
  live: false,
  me: '',
};

// ───────────── 도우미 ─────────────
function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'style') el.style.cssText = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'value') el.value = v;
      else if (k === 'checked' || k === 'disabled' || k === 'selected') el[k] = !!v;
      else el.setAttribute(k, v === true ? '' : v);
    }
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid == null || kid === false) continue;
    el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  return el;
}

async function api(method, url, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (S.token) headers['X-Dept-Token'] = S.token;
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined, credentials: 'same-origin' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || '요청을 처리하지 못했습니다.');
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

let toastTimer;
function toast(msg) {
  document.querySelectorAll('.toast').forEach((t) => t.remove());
  const t = h('div', { class: 'toast', role: 'status' }, msg);
  document.body.append(t);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.remove(), 3200);
}

function fail(e) {
  toast(e.message || String(e));
}

function fmt(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getMonth() + 1}/${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function dday(deadline) {
  if (!deadline) return null;
  const end = new Date(deadline + 'T23:59:59');
  const days = Math.ceil((end - new Date()) / 86400000);
  if (days < 0) return h('span', { class: 'badge red' }, '마감 지남');
  if (days === 0) return h('span', { class: 'badge red' }, '오늘 마감');
  return h('span', { class: days <= 3 ? 'badge orange' : 'badge' }, `마감 D-${days}`);
}

function deptColor(project, deptId) {
  const i = project.depts.findIndex((d) => d.id === deptId);
  return i < 0 ? '#6b7280' : DEPT_COLORS[i % DEPT_COLORS.length];
}
function deptChip(project, deptId) {
  const d = project.depts.find((x) => x.id === deptId);
  return h('span', { class: 'dept-chip', style: `background:${deptColor(project, deptId)}` }, d ? d.name : '담당자');
}
function statusBadge(status) {
  const [label, cls] = STATUS[status] || [status, ''];
  return h('span', { class: 'badge ' + cls }, label);
}

// 변경 부분 표시(파란 밑줄 = 추가, 빨간 취소선 = 삭제)
function diffView(a, b) {
  const ops = Diff.diff(a, b);
  return h('div', { class: 'text orig' }, ops.map((o) => (o.t === 'eq' ? o.s : h('span', { class: o.t === 'ins' ? 'ins' : 'del' }, o.s))));
}
function sideView(parts) {
  return h('div', { class: 'text' }, parts.map((p) => (p.mark ? h('span', { class: 'mk' }, p.s) : p.s)));
}

function modal(title, bodyFn, actions) {
  const bg = h('div', { class: 'modal-bg', onclick: (e) => { if (e.target === bg) close(); } });
  const close = () => bg.remove();
  const box = h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true' }, h('h3', null, title));
  const body = bodyFn(close);
  box.append(body, h('div', { class: 'row', style: 'justify-content:flex-end;margin-top:16px' }, h('button', { class: 'btn', onclick: close }, '닫기'), ...actions(close)));
  bg.append(box);
  document.body.append(bg);
  const first = box.querySelector('input,textarea');
  if (first) first.focus();
  return close;
}

function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text).then(() => toast('복사했습니다. 메신저나 메일에 붙여넣기 하세요.'));
  const ta = h('textarea', { style: 'position:fixed;opacity:0' });
  ta.value = text;
  document.body.append(ta);
  ta.select();
  document.execCommand('copy');
  ta.remove();
  toast('복사했습니다. 메신저나 메일에 붙여넣기 하세요.');
  return Promise.resolve();
}

// 입력 중에는 다시 그리지 않고, 입력칸을 벗어나면 그립니다.
function isEditing() {
  const a = document.activeElement;
  return a && (a.tagName === 'TEXTAREA' || (a.tagName === 'INPUT' && a.type === 'text')) && !a.closest('.modal');
}
function softRender() {
  if (isEditing() || document.querySelector('.modal-bg')) { S.pendingRender = true; return; }
  render();
}
document.addEventListener('focusout', () => setTimeout(() => { if (S.pendingRender && !isEditing() && !document.querySelector('.modal-bg')) { S.pendingRender = false; render(); } }, 50));

// ───────────── 실시간 연결 ─────────────
let es = null;
let refreshTimer = null;
function connect(query) {
  if (es) es.close();
  es = new EventSource('/api/events?' + query);
  es.onopen = () => { S.live = true; updateLive(); };
  es.onerror = () => { S.live = false; updateLive(); };
  es.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.type === 'presence') { S.presence = msg.list; softRender(); }
    if (msg.type === 'change') { clearTimeout(refreshTimer); refreshTimer = setTimeout(reload, 250); }
  };
}
function updateLive() {
  const el = document.querySelector('.live');
  if (el) { el.className = 'live' + (S.live ? ' on' : ''); el.textContent = S.live ? '실시간 연결됨' : '연결 끊김 · 자동 재연결 중'; }
}
async function reload() {
  try {
    if (S.mode === 'dept') { S.project = await api('GET', '/api/dept'); syncDrafts(); }
    else if (S.project) S.project = await api('GET', '/api/projects/' + S.project.id);
    S.presence = S.project.presence || S.presence;
    softRender();
  } catch (e) { fail(e); }
}

let presenceTimer = null;
function setPresence(articleId, projectId) {
  clearInterval(presenceTimer);
  const post = () => api('POST', '/api/presence', { articleId, who: S.me, projectId }).catch(() => {});
  post();
  if (articleId) presenceTimer = setInterval(post, 10000);
}

function topBar(right) {
  return h('div', { class: 'top' },
    h('div', { class: 'logo', onclick: () => { if (S.mode === 'admin') go('#/'); } }, '업무망 ', h('span', null, '취합도우미')),
    h('div', { class: 'spacer' }),
    h('span', { class: 'live' + (S.live ? ' on' : '') }, S.live ? '실시간 연결됨' : ''),
    right || null
  );
}

function render() {
  S.pendingRender = false;
  const y = window.scrollY;
  $app.replaceChildren(S.mode === 'dept' ? deptPage() : adminPage());
  window.scrollTo(0, y);
}

// ═════════════════════ 부서(수정자) 화면 ═════════════════════
function syncDrafts() {
  const p = S.project;
  const byArticle = {};
  for (const prop of p.proposals) {
    const key = prop.type === 'new' ? 'new:' + prop.id : prop.articleId;
    byArticle[key] = prop;
  }
  // 서버 내용 반영(입력 중인 칸은 건드리지 않음)
  const focusedKey = document.activeElement && document.activeElement.dataset && document.activeElement.dataset.key ? document.activeElement.dataset.key.replace(/:r$/, '') : null;
  for (const [key, prop] of Object.entries(byArticle)) {
    const d = S.drafts[key];
    if (key === focusedKey && d) continue;
    if (!d || d.rev == null || prop.rev > d.rev || prop.status !== d.status) {
      S.drafts[key] = { id: prop.id, type: prop.type, text: prop.text, reason: prop.reason, rev: prop.rev, status: prop.status, decisionReason: prop.decisionReason, anchor: prop.articleId, baseText: prop.baseText, savedAt: prop.updatedAt, author: prop.author };
    }
  }
  for (const key of Object.keys(S.drafts)) {
    const d = S.drafts[key];
    if (d.id && !p.proposals.some((x) => x.id === d.id) && key !== focusedKey) delete S.drafts[key];
  }
}

async function deptInit() {
  try {
    S.me = localStorage.getItem('chwihap.name') || '';
  } catch { S.me = ''; }
  try {
    S.project = await api('GET', '/api/dept');
  } catch (e) {
    $app.replaceChildren(topBar(), h('main', null, h('div', { class: 'card login' }, h('h1', null, '링크를 열 수 없습니다'), h('p', null, e.message))));
    return;
  }
  syncDrafts();
  S.presence = S.project.presence || [];
  render();
  connect('t=' + encodeURIComponent(S.token));
  if (!S.me) askName();
}

function askName() {
  let input;
  modal('성함을 알려 주세요', () => h('div', null,
    h('p', { class: 'sub' }, '누가 고쳤는지 이력에 남기기 위해서입니다. 한 번만 적으면 됩니다.'),
    input = h('input', { type: 'text', placeholder: '예: 김민수 주무관', maxlength: 20, value: S.me })
  ), (close) => [h('button', { class: 'btn primary', onclick: () => {
    const v = input.value.trim();
    if (!v) return toast('성함을 적어 주세요.');
    S.me = v;
    try { localStorage.setItem('chwihap.name', v); } catch {}
    close();
    render();
  } }, '확인')]);
}

const saveTimers = {};
function queueSave(key, article) {
  const d = S.drafts[key];
  d.state = 'typing';
  updateSaveLabel(key);
  clearTimeout(saveTimers[key]);
  saveTimers[key] = setTimeout(() => saveDraft(key, article), 700);
}

async function saveDraft(key, article) {
  const d = S.drafts[key];
  if (!d) return;
  const unchanged = d.type === 'modify' && d.text === article.text && !d.reason;
  const emptyNew = d.type === 'new' && !d.text.trim() && !d.reason;
  d.state = 'saving';
  updateSaveLabel(key);
  try {
    if (unchanged || emptyNew) {
      if (d.id) await api('DELETE', '/api/dept/proposals/' + d.id);
      if (d.type === 'new' && emptyNew && d.removeWhenEmpty) delete S.drafts[key];
      else Object.assign(d, { id: null, rev: null, state: 'saved', savedAt: new Date().toISOString() });
    } else {
      const r = await api('PUT', '/api/dept/proposals', { id: d.id, articleId: d.type === 'new' ? d.anchor : article.id, type: d.type, text: d.text, reason: d.reason, author: S.me, rev: d.rev });
      Object.assign(d, { id: r.proposal.id, rev: r.proposal.rev, state: 'saved', savedAt: r.proposal.updatedAt });
      if (d.type === 'new' && key.startsWith('tmp:')) { S.drafts['new:' + d.id] = d; delete S.drafts[key]; }
    }
  } catch (e) {
    if (e.status === 409 && e.data && e.data.proposal) {
      const p = e.data.proposal;
      Object.assign(d, { id: p.id, text: p.text, reason: p.reason, rev: p.rev, state: 'saved' });
      toast(e.message);
      render();
      return;
    }
    d.state = 'error';
    d.error = e.message;
  }
  updateSaveLabel(key);
}

function updateSaveLabel(key) {
  const el = document.querySelector(`[data-save="${CSS.escape(key)}"]`);
  if (!el) return;
  const d = S.drafts[key] || {};
  const map = { typing: ['입력 중…', ''], saving: ['저장 중…', ''], saved: ['저장됨 ✓ ' + fmt(d.savedAt), 'ok'], error: ['저장 실패: ' + (d.error || ''), 'err'] };
  const [t, c] = map[d.state] || (d.id ? ['저장됨 ✓ ' + fmt(d.savedAt), 'ok'] : ['', '']);
  el.textContent = t;
  el.className = 'saved ' + c;
  const cnt = document.getElementById('propcount');
  if (cnt) cnt.textContent = `수정 의견 ${Object.values(S.drafts).filter((x) => x.id).length}건`;
}

function deptPage() {
  const p = S.project;
  const sub = p.submission || {};
  const submitted = sub.status === 'submitted';
  const mineCount = p.articles.filter((a) => a.mine).length;
  const myProps = Object.values(S.drafts).filter((d) => d.id);
  const decided = myProps.filter((d) => ['accepted', 'rejected', 'hold'].includes(d.status)).length;

  const header = h('div', null,
    h('div', { class: 'row' }, h('span', { class: 'dept-chip', style: 'background:var(--brand)' }, p.dept.name), dday(p.deadline), p.deadline ? h('span', { class: 'sub' }, `마감 ${p.deadline}`) : null),
    h('h1', null, p.title),
    p.notice ? h('div', { class: 'banner info text' }, p.notice) : null,
    submitted
      ? h('div', { class: 'banner ok' }, h('b', null, `${p.dept.name} 제출 완료`), ` · ${fmt(sub.submittedAt)} · 제출 ${sub.submitter || ''} · 확인 ${sub.confirmer || ''}`, decided ? ` · 담당자 검토 ${decided}건 완료` : '')
      : h('div', { class: 'banner warn' }, '고칠 부분만 바로 고치면 자동으로 저장됩니다. 다 고치셨으면 아래 [제출하기]를 눌러 주세요. 고칠 게 없으면 그냥 제출하면 "의견 없음"으로 처리됩니다.')
  );

  const filterRow = h('div', { class: 'tabs' },
    h('button', { class: S.filter !== 'every' ? 'on' : '', onclick: () => { S.filter = 'all'; render(); } }, `우리 부서 담당 조문 (${mineCount})`),
    h('button', { class: S.filter === 'every' ? 'on' : '', onclick: () => { S.filter = 'every'; render(); } }, '전체 원문 보기')
  );

  const list = h('div');
  for (const a of p.articles) {
    const showAll = S.filter === 'every';
    if (!a.mine && !showAll) continue;
    if (a.heading) { list.append(h('div', { class: 'card art heading' }, a.text)); continue; }
    list.append(deptArticleCard(a, submitted));
    for (const [key, d] of Object.entries(S.drafts)) {
      if (d.type === 'new' && d.anchor === a.id) list.append(deptNewCard(key, d, a, submitted));
    }
  }
  if (!list.childNodes.length) list.append(h('div', { class: 'empty' }, '우리 부서에 배정된 조문이 없습니다. [전체 원문 보기]에서 내용을 확인할 수 있습니다.'));

  const bar = h('div', { class: 'bar' }, h('div', { class: 'inner' },
    h('div', { class: 'grow' }, submitted ? h('b', null, '제출 완료') : [h('b', { id: 'propcount' }, `수정 의견 ${myProps.length}건`), h('span', { class: 'sub' }, ' 작성됨')], S.me ? h('span', { class: 'sub' }, ` · ${S.me} `) : null, h('button', { class: 'linkbtn', onclick: askName }, '이름 바꾸기')),
    submitted
      ? h('button', { class: 'btn', onclick: unsubmit }, '제출 취소')
      : h('button', { class: 'btn primary big', onclick: submitDept }, '제출하기')
  ));

  return h('div', null, topBar(), h('main', null, header, filterRow, list), bar);
}

function whoIsEditing(articleId) {
  return S.presence.filter((x) => x.articleId === articleId && x.who !== `${S.project.dept.name} ${S.me}`.trim()).map((x) => x.who);
}

function deptArticleCard(a, submitted) {
  const key = a.id;
  const d = S.drafts[key];
  const editors = whoIsEditing(a.id);
  const card = h('div', { class: 'card art' + (a.mine ? ' mine' : '') + (d && d.id ? ' changed' : '') });
  card.append(h('div', { class: 'head' },
    h('h3', null, a.label),
    a.mine ? h('span', { class: 'badge blue' }, '우리 부서 담당') : null,
    d && d.id ? h('span', { class: 'badge orange' }, TYPE_LABEL[d.type] + ' 의견') : null,
    d && d.id && d.status !== 'draft' ? statusBadge(d.status) : null,
    editors.length ? h('span', { class: 'presence' }, `✎ ${editors.join(', ')} 님이 고치는 중`) : null
  ));

  if (!a.mine || submitted || (d && d.id && d.status !== 'draft')) {
    // 읽기 전용
    if (d && d.id) {
      card.append(d.type === 'delete' ? h('div', { class: 'text orig' }, h('span', { class: 'del' }, a.text)) : diffView(a.text, d.text));
      if (d.reason) card.append(h('div', { class: 'hint' }, '사유: ' + d.reason));
      if (d.status !== 'draft' && d.status !== 'pending') card.append(h('div', { class: 'banner ' + (d.status === 'accepted' ? 'ok' : 'warn'), style: 'margin:8px 0 0' }, `담당자 처리: ${STATUS[d.status][0]}`, d.decisionReason ? ` — ${d.decisionReason}` : ''));
    } else card.append(h('div', { class: 'text orig' }, a.text));
    return card;
  }

  const draft = d || (S.drafts[key] = { type: 'modify', text: a.text, reason: '', rev: null, status: 'draft' });
  const isDelete = draft.type === 'delete';
  const preview = h('div');
  const refreshPreview = () => {
    preview.replaceChildren();
    if (!isDelete && draft.text !== a.text) preview.append(h('div', { class: 'hint' }, '바뀐 부분 미리보기'), diffView(a.text, draft.text));
  };

  card.append(h('details', { class: 'hint' }, h('summary', null, '원문 보기'), h('div', { class: 'text orig', style: 'margin-top:6px' }, a.text)));

  if (isDelete) {
    card.append(h('div', { class: 'text orig', style: 'margin-top:8px' }, h('span', { class: 'del' }, a.text)), h('div', { class: 'hint' }, '이 조문 전체를 삭제하자는 의견입니다.'));
  } else {
    const ta = h('textarea', {
      'data-key': key,
      rows: Math.min(18, Math.max(4, a.text.split('\n').length + 1)),
      oninput: (e) => { draft.text = e.target.value; refreshPreview(); queueSave(key, a); },
      onfocus: () => setPresence(a.id),
      onblur: () => setPresence(null),
      'aria-label': a.label + ' 수정',
    });
    ta.value = draft.text;
    card.append(h('label', { class: 'field', style: 'margin-top:8px' }, '여기서 바로 고치세요'), ta, preview);
    refreshPreview();
  }
  const reason = h('input', { type: 'text', 'data-key': key + ':r', placeholder: '고친 이유 (한 줄이면 충분합니다)', value: draft.reason, maxlength: 2000,
    oninput: (e) => { draft.reason = e.target.value; queueSave(key, a); } });
  card.append(h('div', { style: 'margin-top:8px' }, reason));
  card.append(h('div', { class: 'row', style: 'margin-top:8px' },
    h('button', { class: 'btn small', onclick: () => { Object.assign(draft, { type: 'modify', text: a.text, reason: '' }); saveDraft(key, a).then(render); } }, '원래대로'),
    h('button', { class: 'btn small ' + (isDelete ? '' : 'bad'), onclick: () => { draft.type = isDelete ? 'modify' : 'delete'; if (!isDelete) draft.text = ''; else draft.text = a.text; saveDraft(key, a).then(render); } }, isDelete ? '삭제 제안 취소' : '이 조문 삭제 제안'),
    h('button', { class: 'btn small', onclick: () => { const k = 'tmp:' + Date.now(); S.drafts[k] = { type: 'new', text: '', reason: '', anchor: a.id, rev: null, status: 'draft', removeWhenEmpty: true }; render(); const el = document.querySelector(`[data-key="${k}"]`); if (el) el.focus(); } }, '+ 아래에 새 조문 제안'),
    h('div', { class: 'grow' }),
    h('span', { class: 'saved', 'data-save': key })
  ));
  setTimeout(() => updateSaveLabel(key));
  return card;
}

function deptNewCard(key, d, anchor, submitted) {
  const card = h('div', { class: 'card art changed', style: 'margin-left:24px' });
  card.append(h('div', { class: 'head' }, h('h3', null, '새 조문 제안'), h('span', { class: 'sub' }, `${anchor.label} 다음에 넣기`), d.status !== 'draft' ? statusBadge(d.status) : null));
  if (submitted || d.status !== 'draft') {
    card.append(h('div', { class: 'text orig' }, h('span', { class: 'ins' }, d.text)));
    if (d.reason) card.append(h('div', { class: 'hint' }, '사유: ' + d.reason));
    if (d.decisionReason) card.append(h('div', { class: 'hint' }, '담당자: ' + d.decisionReason));
    return card;
  }
  const fake = { id: anchor.id, text: '' };
  const ta = h('textarea', { 'data-key': key, rows: 4, placeholder: '예: 제5조의2(보조금 정산) ① …', oninput: (e) => { d.text = e.target.value; queueSave(key, fake); } });
  ta.value = d.text;
  card.append(ta,
    h('div', { style: 'margin-top:8px' }, h('input', { type: 'text', 'data-key': key + ':r', placeholder: '신설 이유', value: d.reason, oninput: (e) => { d.reason = e.target.value; queueSave(key, fake); } })),
    h('div', { class: 'row', style: 'margin-top:8px' },
      h('button', { class: 'btn small bad', onclick: async () => { if (d.id) await api('DELETE', '/api/dept/proposals/' + d.id).catch(fail); delete S.drafts[key]; render(); } }, '이 제안 지우기'),
      h('div', { class: 'grow' }), h('span', { class: 'saved', 'data-save': key })));
  setTimeout(() => updateSaveLabel(key));
  return card;
}

async function flushSaves() {
  const keys = Object.keys(saveTimers);
  for (const k of keys) clearTimeout(saveTimers[k]);
  for (const [key, d] of Object.entries(S.drafts)) {
    if (d.state === 'typing' || d.state === 'error') {
      const a = S.project.articles.find((x) => x.id === (d.type === 'new' ? null : key)) || { id: d.anchor, text: '' };
      await saveDraft(key, a);
    }
  }
}

function submitDept() {
  if (!S.me) return askName();
  const n = Object.values(S.drafts).filter((d) => d.id).length;
  let input;
  modal('제출할까요?', () => h('div', null,
    h('p', null, n ? `수정 의견 ${n}건을 담당자에게 제출합니다.` : '수정 의견이 없습니다. "의견 없음"으로 제출합니다.'),
    h('label', { class: 'field' }, '확인하신 부서장(책임자) 이름'),
    input = h('input', { type: 'text', placeholder: '예: 박OO 팀장', maxlength: 20 }),
    h('p', { class: 'hint' }, '제출 후에도 담당자가 검토를 시작하기 전까지는 [제출 취소]로 다시 고칠 수 있습니다.')
  ), (close) => [h('button', { class: 'btn primary', onclick: async () => {
    if (!input.value.trim()) return toast('부서장 이름을 적어 주세요.');
    try {
      await flushSaves();
      await api('POST', '/api/dept/submit', { confirmer: input.value.trim(), author: S.me });
      close();
      toast('제출했습니다. 수고하셨습니다!');
      await reload();
      render();
    } catch (e) { fail(e); }
  } }, '제출하기')]);
}

async function unsubmit() {
  if (!confirm('제출을 취소하고 다시 고칠까요?')) return;
  try { await api('POST', '/api/dept/unsubmit'); await reload(); render(); } catch (e) { fail(e); }
}

// ═════════════════════ 취합 담당자 화면 ═════════════════════
function go(hash) {
  if (location.hash === hash) route();
  else location.hash = hash;
}
window.addEventListener('hashchange', () => { if (S.mode === 'admin') route(); });

let status = null;
async function adminInit() {
  try { status = await api('GET', '/api/status'); } catch (e) { return fail(e); }
  route();
}

async function route() {
  if (!status.setup || !status.admin) return render();
  const hash = location.hash || '#/';
  const m = hash.match(/^#\/p\/([\w-]+)(?:\/(\w+))?/);
  try {
    if (m) {
      if (!S.project || S.project.id !== m[1]) {
        S.project = await api('GET', '/api/projects/' + m[1]);
        S.presence = S.project.presence || [];
        S.cmp = { from: 'v0', to: 'current', all: false };
        S.filter = 'has';
        connect('project=' + m[1]);
      }
      S.view = 'project';
      S.tab = m[2] || 'status';
    } else if (hash.startsWith('#/new')) {
      S.view = 'new';
    } else {
      S.view = 'list';
      S.project = null;
      if (es) { es.close(); es = null; S.live = false; }
      S.list = await api('GET', '/api/projects');
    }
  } catch (e) {
    fail(e);
    if (e.status === 401) { status.admin = false; }
    else if (m) { location.hash = '#/'; return; }
  }
  window.scrollTo(0, 0);
  render();
}

function adminPage() {
  if (!status.setup || !status.admin) return loginPage();
  const logout = h('button', { class: 'btn small', onclick: async () => { await api('POST', '/api/logout').catch(() => {}); status.admin = false; render(); } }, '로그아웃');
  const main = h('main');
  if (S.view === 'new') main.append(newProjectPage());
  else if (S.view === 'project') main.append(projectPage());
  else main.append(listPage());
  return h('div', null, topBar(logout), main);
}

function loginPage() {
  const first = !status.setup;
  const pw = h('input', { type: 'password', placeholder: first ? '6자 이상' : '비밀번호', autocomplete: first ? 'new-password' : 'current-password' });
  const pw2 = first ? h('input', { type: 'password', placeholder: '한 번 더', autocomplete: 'new-password' }) : null;
  const submit = async (e) => {
    e.preventDefault();
    try {
      if (first) {
        if (pw.value !== pw2.value) return toast('두 비밀번호가 다릅니다.');
        await api('POST', '/api/setup', { password: pw.value });
      } else await api('POST', '/api/login', { password: pw.value });
      status = await api('GET', '/api/status');
      route();
    } catch (err) { fail(err); }
  };
  return h('div', null, topBar(), h('main', null, h('form', { class: 'card login stack', onsubmit: submit },
    h('h1', null, first ? '처음 오셨네요' : '취합 담당자 로그인'),
    h('p', { class: 'sub' }, first ? '취합 담당자용 비밀번호를 정해 주세요. 부서 수정자는 비밀번호 없이, 담당자가 보내는 링크로 들어옵니다.' : '부서 수정자는 로그인 없이 담당자가 보낸 링크로 들어오시면 됩니다.'),
    h('div', null, h('label', { class: 'field' }, '비밀번호'), pw),
    pw2 ? h('div', null, h('label', { class: 'field' }, '비밀번호 확인'), pw2) : null,
    h('button', { class: 'btn primary big', type: 'submit' }, first ? '시작하기' : '로그인')
  )));
}

function listPage() {
  const wrap = h('div');
  wrap.append(h('div', { class: 'row' }, h('div', { class: 'grow' }, h('h1', null, '취합 목록'), h('div', { class: 'sub' }, '지침·규정 개정 의견을 부서별로 받아 한 번에 정리합니다.')), h('button', { class: 'btn primary big', onclick: () => go('#/new') }, '+ 새 취합 만들기')));
  if (!S.list || !S.list.length) {
    wrap.append(h('div', { class: 'card empty' }, h('p', null, '아직 취합 건이 없습니다.'), h('p', { class: 'sub' }, '[새 취합 만들기]에서 지침 원문을 붙여 넣고 부서를 적으면 부서별 링크가 만들어집니다.')));
    return wrap;
  }
  wrap.append(h('div', { style: 'margin-top:16px' }, S.list.map((p) => h('div', { class: 'card row', style: 'cursor:pointer', onclick: () => go('#/p/' + p.id) },
    h('div', { class: 'grow' }, h('h3', null, p.title), h('div', { class: 'sub' }, `만든 날 ${fmt(p.createdAt)} · 최근 변경 ${fmt(p.updatedAt)}`)),
    dday(p.deadline),
    h('span', { class: p.submitted === p.depts ? 'badge green' : 'badge' }, `제출 ${p.submitted}/${p.depts}`),
    p.pending ? h('span', { class: 'badge blue' }, `검토대기 ${p.pending}`) : null
  ))));
  return wrap;
}

// ───────────── 새 취합 만들기 ─────────────
const NEW = { title: '', deadline: '', notice: '', depts: '', text: '', parsed: null, matrix: null };
function newProjectPage() {
  const wrap = h('div', { class: 'stack' });
  wrap.append(h('div', null, h('button', { class: 'linkbtn', onclick: () => go('#/') }, '← 목록'), h('h1', null, '새 취합 만들기')));

  const bind = (k) => (e) => { NEW[k] = e.target.value; };
  wrap.append(h('div', { class: 'card stack' },
    h('h3', null, '1. 기본 정보'),
    h('div', null, h('label', { class: 'field' }, '제목'), h('input', { type: 'text', value: NEW.title, placeholder: '예: 2027년도 보조사업 운영지침 개정 의견 조회', oninput: bind('title') })),
    h('div', { class: 'row' },
      h('div', { style: 'flex:0 0 200px' }, h('label', { class: 'field' }, '제출 마감일'), h('input', { type: 'date', value: NEW.deadline, oninput: bind('deadline') })),
      h('div', { class: 'grow' }, h('label', { class: 'field' }, '부서에 보낼 안내문 (선택)'), h('input', { type: 'text', value: NEW.notice, placeholder: '예: 소관 조문 위주로 검토 부탁드립니다. 문의 기획팀 홍길동(내선 1234)', oninput: bind('notice') }))),
    h('div', null, h('label', { class: 'field' }, '의견 받을 부서 (한 줄에 하나)'), h('textarea', { rows: 5, placeholder: '기획팀\n총무팀\n사업1팀\n사업2팀', value: NEW.depts, oninput: bind('depts') }))
  ));

  const matrixBox = h('div');
  wrap.append(h('div', { class: 'card stack' },
    h('h3', null, '2. 지침 원문 붙여넣기'),
    h('p', { class: 'hint' }, '한글(HWP) 파일에서 본문 전체를 복사(Ctrl+A → Ctrl+C / 맥은 ⌘+A → ⌘+C)해 아래에 붙여 넣으세요. "제1조", "제2조의2" 기준으로 자동으로 나눕니다. 조문 번호가 없는 문서는 빈 줄 기준으로 나눕니다.'),
    h('textarea', { rows: 12, value: NEW.text, oninput: bind('text'), placeholder: '제1조(목적) 이 지침은 …\n제2조(정의) 이 지침에서 사용하는 용어의 뜻은 다음과 같다.\n1. …' }),
    h('div', null, h('button', { class: 'btn', onclick: async () => {
      try {
        const r = await api('POST', '/api/parse', { text: NEW.text });
        NEW.parsed = r.articles;
        const n = deptNames().length;
        NEW.matrix = r.articles.map((a) => (a.heading ? [] : Array.from({ length: n }, (_, i) => i)));
        render();
      } catch (e) { fail(e); }
    } }, '조문 나누기 (미리보기)')),
    matrixBox
  ));
  if (NEW.parsed) matrixBox.append(assignMatrix());

  wrap.append(h('div', { class: 'row' }, h('div', { class: 'grow' }), h('button', { class: 'btn primary big', onclick: createProject }, '만들고 부서 링크 받기')));
  return wrap;
}
function deptNames() {
  return [...new Set(NEW.depts.split('\n').map((s) => s.trim()).filter(Boolean))];
}
function assignMatrix() {
  const names = deptNames();
  if (!names.length) return h('p', { class: 'banner warn' }, '1번에 부서를 먼저 적으면 조문별 담당 부서를 고를 수 있습니다.');
  NEW.matrix = NEW.parsed.map((a, i) => (NEW.matrix[i] || []).filter((x) => x < names.length));
  const toggleCol = (ci) => {
    const allOn = NEW.parsed.every((a, i) => a.heading || NEW.matrix[i].includes(ci));
    NEW.parsed.forEach((a, i) => { if (a.heading) return; NEW.matrix[i] = allOn ? NEW.matrix[i].filter((x) => x !== ci) : [...new Set([...NEW.matrix[i], ci])]; });
    render();
  };
  return h('div', null,
    h('p', null, h('b', null, `${NEW.parsed.filter((a) => !a.heading).length}개 조문`), '으로 나눴습니다. 조문별로 의견을 받을 부서를 고르세요. (부서 이름을 누르면 열 전체 선택/해제)'),
    h('div', { class: 'tablewrap' }, h('table', { class: 'grid matrix' },
      h('thead', null, h('tr', null, h('th', null, '조문'), names.map((n, ci) => h('th', null, h('button', { class: 'linkbtn', onclick: () => toggleCol(ci) }, n))))),
      h('tbody', null, NEW.parsed.map((a, i) => a.heading
        ? h('tr', null, h('td', { colspan: names.length + 1, style: 'background:#f7f8fa;font-weight:700' }, a.text))
        : h('tr', null, h('td', { title: a.text }, a.label), names.map((n, ci) => h('td', null, h('input', { type: 'checkbox', checked: NEW.matrix[i].includes(ci), 'aria-label': `${a.label} ${n}`, onchange: (e) => { NEW.matrix[i] = e.target.checked ? [...NEW.matrix[i], ci] : NEW.matrix[i].filter((x) => x !== ci); } }))))))
    ))
  );
}
async function createProject() {
  const names = deptNames();
  if (!NEW.title.trim()) return toast('제목을 적어 주세요.');
  if (!names.length) return toast('부서를 적어 주세요.');
  if (!NEW.parsed) return toast('원문을 붙여 넣고 [조문 나누기]를 눌러 주세요.');
  try {
    const r = await api('POST', '/api/projects', {
      title: NEW.title, deadline: NEW.deadline, notice: NEW.notice, depts: names,
      articles: NEW.parsed.map((a, i) => ({ text: a.text, heading: a.heading, depts: NEW.matrix[i] || [] })),
    });
    Object.assign(NEW, { title: '', deadline: '', notice: '', depts: '', text: '', parsed: null, matrix: null });
    toast('만들었습니다. 부서별 링크를 보내 주세요.');
    go('#/p/' + r.id + '/status');
  } catch (e) { fail(e); }
}

// ───────────── 취합 건 화면 ─────────────
function projectPage() {
  const p = S.project;
  const pending = p.proposals.filter((x) => x.status === 'pending').length;
  const tabs = [['status', '현황판'], ['review', `조문별 검토${pending ? ` (${pending})` : ''}`], ['table', '신구대비표·내보내기'], ['history', '버전·기록'], ['settings', '설정']];
  const wrap = h('div');
  wrap.append(h('div', { class: 'noprint' }, h('button', { class: 'linkbtn', onclick: () => go('#/') }, '← 목록'),
    h('div', { class: 'row' }, h('h1', { class: 'grow' }, p.title), dday(p.deadline))));
  wrap.append(h('div', { class: 'tabs', role: 'tablist' }, tabs.map(([k, label]) => h('button', { class: S.tab === k ? 'on' : '', role: 'tab', onclick: () => go(`#/p/${p.id}/${k}`) }, label))));
  const body = { status: statusTab, review: reviewTab, table: tableTab, history: historyTab, settings: settingsTab }[S.tab] || statusTab;
  wrap.append(body());
  return wrap;
}

function deptLink(d) {
  return `${location.origin}/d/${encodeURIComponent(d.token)}`;
}

function statusTab() {
  const p = S.project;
  const subs = p.submissions || {};
  const submitted = p.depts.filter((d) => (subs[d.id] || {}).status === 'submitted').length;
  const cnt = (st) => p.proposals.filter((x) => x.status === st).length;
  const conflicts = conflictArticles();
  const wrap = h('div');
  wrap.append(h('div', { class: 'stats' },
    h('div', { class: 'stat' }, h('b', null, `${submitted} / ${p.depts.length}`), h('span', null, '부서 제출')),
    h('div', { class: 'stat' }, h('b', null, cnt('pending')), h('span', null, '검토 대기')),
    h('div', { class: 'stat' }, h('b', null, cnt('accepted')), h('span', null, '채택')),
    h('div', { class: 'stat' }, h('b', null, cnt('rejected') + cnt('hold')), h('span', null, '불채택·보류')),
    h('div', { class: 'stat' }, h('b', { style: conflicts.length ? 'color:var(--bad)' : '' }, conflicts.length), h('span', null, '여러 부서가 고친 조문'))
  ));

  const allLinks = p.depts.map((d) => `${d.name}: ${deptLink(d)}`).join('\n');
  wrap.append(h('div', { class: 'row', style: 'margin-top:20px' }, h('h2', { class: 'grow', style: 'margin:0' }, '부서별 현황'),
    h('button', { class: 'btn', onclick: () => copyText(`[${p.title}] 의견 제출 링크${p.deadline ? ` (마감 ${p.deadline})` : ''}\n\n${allLinks}`) }, '전체 링크 한 번에 복사')));
  wrap.append(h('div', { class: 'tablewrap', style: 'margin-top:10px' }, h('table', { class: 'grid' },
    h('thead', null, h('tr', null, ['부서', '상태', '의견 수', '제출', '확인자', '지금', '링크'].map((t) => h('th', null, t)))),
    h('tbody', null, p.depts.map((d) => {
      const s = subs[d.id] || {};
      const props = p.proposals.filter((x) => x.deptId === d.id);
      const drafts = props.filter((x) => x.status === 'draft').length;
      const on = S.presence.filter((x) => x.deptId === d.id);
      return h('tr', null,
        h('td', null, deptChip(p, d.id)),
        h('td', { class: 'center' }, s.status === 'submitted' ? h('span', { class: 'badge green' }, s.noChange ? '제출(의견 없음)' : '제출 완료') : drafts ? h('span', { class: 'badge orange' }, `작성 중 ${drafts}건`) : h('span', { class: 'badge' }, '미제출')),
        h('td', { class: 'center' }, props.filter((x) => x.status !== 'draft').length),
        h('td', null, fmt(s.submittedAt), s.submitter ? ` ${s.submitter}` : ''),
        h('td', null, s.confirmer || ''),
        h('td', null, on.length ? h('span', { class: 'presence' }, on.map((x) => x.who).join(', ')) : ''),
        h('td', null, h('div', { class: 'row' },
          h('button', { class: 'btn small', onclick: () => copyText(`[${p.title}] ${d.name} 의견 제출 링크${p.deadline ? ` (마감 ${p.deadline})` : ''}\n${deptLink(d)}`) }, '링크 복사'),
          s.status === 'submitted' ? h('button', { class: 'btn small', onclick: () => reopenDept(d) }, '다시 열기') : null))
      );
    }))
  )));

  if (conflicts.length) {
    wrap.append(h('h2', null, '여러 부서가 함께 고친 조문 (먼저 조정 필요)'));
    conflicts.forEach(({ a, props }) => wrap.append(h('div', { class: 'card row', style: 'cursor:pointer', onclick: () => { S.filter = 'conflict'; go(`#/p/${p.id}/review`); } },
      h('b', { class: 'grow' }, a.label), props.map((x) => deptChip(p, x.deptId)))));
  }
  return wrap;
}

async function reopenDept(d) {
  if (!confirm(`${d.name}의 제출을 되돌려 다시 고칠 수 있게 할까요? (이미 처리한 의견은 그대로 둡니다)`)) return;
  try { await api('POST', `/api/projects/${S.project.id}/depts/${d.id}/reopen`); await reload(); } catch (e) { fail(e); }
}

function conflictArticles() {
  const p = S.project;
  const out = [];
  for (const a of p.articles) {
    const props = p.proposals.filter((x) => x.articleId === a.id && x.type !== 'new' && x.status === 'pending');
    if (new Set(props.map((x) => x.deptId)).size >= 2) out.push({ a, props });
  }
  return out;
}

// ───────────── 조문별 검토 ─────────────
function reviewTab() {
  const p = S.project;
  const wrap = h('div');
  const filters = [['all', '전체'], ['has', '의견 있는 조문'], ['pending', '검토 대기'], ['conflict', '여러 부서 충돌']];
  if (!filters.some(([k]) => k === S.filter)) S.filter = 'has';
  wrap.append(h('div', { class: 'row noprint' }, filters.map(([k, label]) => h('button', { class: 'btn small' + (S.filter === k ? ' primary' : ''), onclick: () => { S.filter = k; render(); } }, label)),
    h('div', { class: 'grow' }), h('span', { class: 'hint' }, '파란 밑줄 = 추가, 빨간 취소선 = 삭제')));
  const conflictIds = new Set(conflictArticles().map((c) => c.a.id));
  let shown = 0;
  for (const a of p.articles) {
    const props = p.proposals.filter((x) => x.articleId === a.id && x.status !== 'draft');
    const own = props.filter((x) => x.type !== 'new');
    const news = props.filter((x) => x.type === 'new');
    if (S.filter === 'has' && !props.length) continue;
    if (S.filter === 'pending' && !props.some((x) => x.status === 'pending')) continue;
    if (S.filter === 'conflict' && !conflictIds.has(a.id)) continue;
    if (a.heading) { if (S.filter === 'all') wrap.append(h('div', { class: 'card art heading' }, a.text)); continue; }
    shown++;
    wrap.append(adminArticleCard(a, own, conflictIds.has(a.id)));
    news.forEach((x) => wrap.append(h('div', { class: 'card', style: 'margin-left:24px' }, h('div', { class: 'head row' }, h('h3', null, '새 조문 신설 제안'), h('span', { class: 'sub' }, `${a.label} 다음`)), proposalCard(x, a))));
  }
  if (!shown) wrap.append(h('div', { class: 'empty' }, S.filter === 'all' ? '조문이 없습니다.' : '해당하는 조문이 없습니다.'));
  return wrap;
}

function adminArticleCard(a, props, conflict) {
  const p = S.project;
  const revs = p.revisions.filter((r) => r.articleId === a.id);
  const editing = S.presence.filter((x) => x.articleId === a.id);
  const base = p.versions[0].articles.find((x) => x.id === a.id);
  const card = h('div', { class: 'card art' + (props.length ? ' changed' : '') });
  card.append(h('div', { class: 'head' },
    h('h3', { class: 'grow' }, a.label),
    a.deleted ? h('span', { class: 'badge red' }, '삭제됨') : null,
    a.isNew ? h('span', { class: 'badge green' }, '신설') : null,
    conflict ? h('span', { class: 'badge red' }, '여러 부서 충돌') : null,
    editing.length ? h('span', { class: 'presence' }, `✎ ${editing.map((x) => x.who).join(', ')} 작성 중`) : null,
    h('span', { class: 'sub' }, '담당:'), a.depts.length ? a.depts.map((id) => deptChip(p, id)) : h('span', { class: 'sub' }, '없음')
  ));
  card.append(a.deleted ? h('div', { class: 'text orig' }, h('span', { class: 'del' }, a.text)) : base && base.text !== a.text ? diffView(base.text, a.text) : h('div', { class: 'text orig' }, a.text));
  if (base && base.text !== a.text && !a.deleted) card.append(h('div', { class: 'hint' }, '원본(배포본) 대비 현재까지 반영된 변경입니다.'));

  props.forEach((x) => card.append(proposalCard(x, a)));

  const histOpen = S.open['h:' + a.id];
  card.append(h('div', { class: 'row noprint', style: 'margin-top:10px' },
    h('button', { class: 'btn small', onclick: () => editArticle(a) }, '직접 수정'),
    h('button', { class: 'btn small', onclick: () => assignDepts(a) }, '담당 부서'),
    h('button', { class: 'btn small', onclick: () => { S.open['h:' + a.id] = !histOpen; render(); } }, `이력 ${revs.length}건 ${histOpen ? '▲' : '▼'}`)));
  if (histOpen) card.append(timeline(a, revs));
  return card;
}

function proposalCard(x, a) {
  const p = S.project;
  const cur = a.text;
  const stale = x.status === 'pending' && x.type !== 'new' && x.baseText !== cur;
  const box = h('div', { class: 'prop ' + x.status });
  box.append(h('div', { class: 'meta' }, deptChip(p, x.deptId), x.author ? h('span', null, x.author) : null, h('span', { class: 'badge' }, TYPE_LABEL[x.type]), statusBadge(x.status), h('span', null, fmt(x.submittedAt)),
    stale ? h('span', { class: 'badge orange', title: '이 의견을 낸 뒤 조문이 바뀌었습니다(다른 의견 채택·직접 수정).' }, '원문 바뀜 · 재검토 필요') : null));
  if (x.type === 'modify') {
    if (x.status === 'accepted') box.append(diffView(x.appliedBefore, x.appliedText));
    else box.append(diffView(stale ? x.baseText : cur, x.text));
    if (stale) box.append(h('div', { class: 'hint' }, '위 표시는 이 부서가 본 원문 기준입니다. 그대로 채택하면 현재 조문이 이 부서 안으로 통째로 바뀌니, 필요하면 [고쳐서 채택]을 쓰세요.'));
  } else if (x.type === 'delete') box.append(h('div', { class: 'text orig' }, h('span', { class: 'del' }, x.baseText || cur), h('div', { class: 'hint' }, '→ 조문 삭제 제안')));
  else box.append(h('div', { class: 'text orig' }, h('span', { class: 'ins' }, x.status === 'accepted' ? x.appliedText : x.text)));
  if (x.reason) box.append(h('div', { style: 'margin-top:6px' }, h('b', null, '사유 '), x.reason));

  if (x.status === 'pending') {
    const reason = h('input', { type: 'text', placeholder: '처리 사유 (선택, 부서에 그대로 보입니다)' });
    const decide = (status, text) => api('POST', `/api/projects/${p.id}/proposals/${x.id}/decide`, { status, reason: reason.value, text }).then(reload).catch(fail);
    box.append(h('div', { class: 'row noprint', style: 'margin-top:8px' },
      h('div', { class: 'grow', style: 'min-width:200px' }, reason),
      h('button', { class: 'btn ok', onclick: () => decide('accepted') }, '채택'),
      x.type !== 'delete' ? h('button', { class: 'btn', onclick: () => {
        let ta;
        modal('고쳐서 채택', () => h('div', null, h('p', { class: 'hint' }, '부서 안을 다듬어서 반영합니다.'), ta = h('textarea', { rows: 10 })), (close) => [h('button', { class: 'btn primary', onclick: () => { decide('accepted', ta.value); close(); } }, '이대로 채택')]);
        ta.value = x.text;
      } }, '고쳐서 채택') : null,
      h('button', { class: 'btn warn', onclick: () => decide('hold') }, '보류'),
      h('button', { class: 'btn bad', onclick: () => decide('rejected') }, '불채택')));
  } else {
    box.append(h('div', { class: 'row noprint', style: 'margin-top:8px' },
      h('div', { class: 'grow sub' }, `처리: ${STATUS[x.status][0]} · ${fmt(x.decidedAt)}`, x.decisionReason ? ` · ${x.decisionReason}` : ''),
      h('button', { class: 'btn small', onclick: () => api('POST', `/api/projects/${p.id}/proposals/${x.id}/decide`, { status: 'pending' }).then(reload).catch(fail) }, '결정 취소')));
  }
  return box;
}

function timeline(a, revs) {
  const p = S.project;
  if (!revs.length) return h('div', { class: 'hint', style: 'margin-top:8px' }, '아직 바뀐 적이 없습니다.');
  return h('div', { class: 'timeline' }, revs.slice().reverse().map((r) => {
    const who = r.deptId ? [deptChip(p, r.deptId), ' 의견 채택'] : [r.actor, r.direct ? ' 직접 수정' : ''];
    const what = r.undo ? ' (되돌림)' : r.created ? ' (신설)' : r.deleted ? ' (삭제)' : '';
    return h('div', { class: 'ev' },
      h('div', { class: 'meta row' }, h('b', null, fmt(r.ts)), who, what, r.note ? h('span', { class: 'sub' }, `— ${r.note}`) : null),
      diffView(r.before || '', r.after || ''),
      r.before ? h('button', { class: 'btn small noprint', style: 'margin-top:4px', onclick: async () => {
        if (!confirm('이 변경 이전 내용으로 되돌릴까요? (되돌린 것도 이력에 남습니다)')) return;
        try { await api('POST', `/api/projects/${p.id}/articles/${a.id}/restore`, { revisionId: r.id, side: 'before' }); await reload(); } catch (e) { fail(e); }
      } }, '이 변경 전으로 되돌리기') : null);
  }));
}

function editArticle(a) {
  let ta, note;
  modal(`${a.label} 직접 수정`, () => h('div', null, ta = h('textarea', { rows: 12 }), h('label', { class: 'field', style: 'margin-top:8px' }, '수정 사유 (신구대비표 사유 칸에 들어갑니다)'), note = h('input', { type: 'text', placeholder: '예: 자구 정비' })),
    (close) => [h('button', { class: 'btn primary', onclick: async () => {
      try { await api('POST', `/api/projects/${S.project.id}/articles/${a.id}/edit`, { text: ta.value, note: note.value }); close(); await reload(); } catch (e) { fail(e); }
    } }, '저장')]);
  ta.value = a.text;
}

function assignDepts(a) {
  const p = S.project;
  const boxes = p.depts.map((d) => h('input', { type: 'checkbox', checked: a.depts.includes(d.id), value: d.id }));
  modal(`${a.label} 담당 부서`, () => h('div', { class: 'stack' }, p.depts.map((d, i) => h('label', { class: 'row' }, boxes[i], d.name))),
    (close) => [h('button', { class: 'btn primary', onclick: async () => {
      try { await api('POST', `/api/projects/${p.id}/articles/${a.id}/assign`, { deptIds: boxes.filter((b) => b.checked).map((b) => b.value) }); close(); await reload(); } catch (e) { fail(e); }
    } }, '저장')]);
}

// ───────────── 신구대비표 ─────────────
function currentSnapshot() {
  return S.project.articles.map((a) => ({ id: a.id, label: a.label, text: a.text, deleted: !!a.deleted }));
}
function versionOf(key) {
  if (key === 'current') return currentSnapshot();
  const v = S.project.versions.find((x) => x.id === key);
  return v ? v.articles : currentSnapshot();
}
function reasons() {
  const p = S.project;
  const out = {};
  const add = (id, s) => { (out[id] = out[id] || []).push(s); };
  const name = (id) => (p.depts.find((d) => d.id === id) || {}).name || '';
  p.proposals.filter((x) => x.status === 'accepted').forEach((x) => add(x.type === 'new' ? x.createdArticleId : x.articleId, `${x.reason || '(사유 없음)'} (${name(x.deptId)})`));
  p.revisions.filter((r) => r.direct && r.note).forEach((r) => add(r.articleId, `${r.note} (취합 담당)`));
  return out;
}

function tableTab() {
  const p = S.project;
  const opts = [...p.versions.map((v) => [v.id, `${v.name} (${fmt(v.ts)})`]), ['current', '현재 작업본']];
  const sel = (k) => h('select', { onchange: (e) => { S.cmp[k] = e.target.value; render(); } }, opts.map(([id, label]) => h('option', { value: id, selected: S.cmp[k] === id }, label)));
  const rows = Diff.compare(versionOf(S.cmp.from), versionOf(S.cmp.to), { all: S.cmp.all });
  const rs = reasons();
  const q = `from=${encodeURIComponent(S.cmp.from)}&to=${encodeURIComponent(S.cmp.to)}${S.cmp.all ? '&all=1' : ''}`;
  const dl = (ext, label) => h('a', { class: 'btn', href: `/api/projects/${p.id}/export.${ext}?${q}` }, label);
  const wrap = h('div');
  wrap.append(h('div', { class: 'card noprint' },
    h('div', { class: 'row' }, h('span', null, '비교'), h('div', { style: 'min-width:200px' }, sel('from')), h('span', null, '→'), h('div', { style: 'min-width:200px' }, sel('to')),
      h('label', { class: 'row' }, h('input', { type: 'checkbox', checked: S.cmp.all, onchange: (e) => { S.cmp.all = e.target.checked; render(); } }), '안 바뀐 조문도 표시')),
    h('div', { class: 'row', style: 'margin-top:12px' },
      h('button', { class: 'btn primary', onclick: () => window.print() }, '인쇄 · PDF 저장'),
      dl('hwpx', '한글(HWPX)'), dl('docx', '워드(DOCX)'), dl('xlsx', '엑셀(XLSX)')),
    h('p', { class: 'hint' }, 'PDF는 인쇄 창에서 프린터를 "PDF로 저장"으로 고르면 됩니다. 한글·워드 파일에는 신구대비표와 최종 개정본이 함께 들어갑니다. 엑셀에는 부서 의견 목록도 들어갑니다.')));
  wrap.append(h('div', { class: 'card' },
    h('h2', { class: 'center', style: 'margin-top:0' }, `${p.title} 신·구조문 대비표`),
    rows.length ? h('div', { class: 'tablewrap' }, h('table', { class: 'grid' },
      h('colgroup', null, h('col', { style: 'width:12%' }), h('col', { style: 'width:34%' }), h('col', { style: 'width:34%' }), h('col', { style: 'width:20%' })),
      h('thead', null, h('tr', null, ['조문', '현 행', '개 정 안', '개정 사유'].map((t) => h('th', null, t)))),
      h('tbody', null, rows.map((r) => h('tr', null, h('td', null, r.label), h('td', null, sideView(r.oldSide)), h('td', null, sideView(r.newSide)), h('td', { class: 'text' }, (rs[r.id] || []).join('\n'))))))) : h('div', { class: 'empty' }, '두 시점 사이에 바뀐 조문이 없습니다.')));
  return wrap;
}

// ───────────── 버전·기록 ─────────────
const ACTION = { 'proposal-save': '의견 작성·수정', 'proposal-delete': '의견 삭제', submit: '제출', unsubmit: '제출 취소', 'project-create': '취합 생성', settings: '설정 변경', 'dept-add': '부서 추가', 'dept-token-reset': '링크 재발급', 'dept-reopen': '제출 되돌림', 'article-edit': '조문 직접 수정', 'article-restore': '조문 되돌림', decide: '의견 처리', 'version-save': '버전 저장', export: '파일 내보내기' };
function historyTab() {
  const p = S.project;
  const wrap = h('div');
  const name = h('input', { type: 'text', placeholder: '예: 1차 취합안, 부서장 회의 반영본' });
  wrap.append(h('div', { class: 'card' }, h('h3', null, '지금 상태를 버전으로 저장'), h('p', { class: 'hint' }, '저장한 버전끼리 [신구대비표] 탭에서 비교할 수 있습니다.'),
    h('div', { class: 'row' }, h('div', { class: 'grow' }, name), h('button', { class: 'btn primary', onclick: async () => {
      try { await api('POST', `/api/projects/${p.id}/versions`, { name: name.value }); toast('저장했습니다.'); await reload(); } catch (e) { fail(e); }
    } }, '버전 저장'))));
  wrap.append(h('h2', null, '저장된 버전'), h('div', { class: 'tablewrap' }, h('table', { class: 'grid' },
    h('thead', null, h('tr', null, ['이름', '저장 시각', '조문 수', ''].map((t) => h('th', null, t)))),
    h('tbody', null, p.versions.slice().reverse().map((v) => h('tr', null, h('td', null, v.name), h('td', null, fmt(v.ts)), h('td', { class: 'center' }, v.articles.filter((a) => !a.deleted).length),
      h('td', null, h('button', { class: 'btn small', onclick: () => { S.cmp = { from: v.id, to: 'current', all: false }; go(`#/p/${p.id}/table`); } }, '현재와 비교'))))))));
  const logBox = h('div', null, h('p', { class: 'hint' }, '불러오는 중…'));
  wrap.append(h('h2', null, '작업 기록 (감사 기록)'), logBox);
  api('GET', `/api/projects/${p.id}/audit`).then((logs) => {
    logBox.replaceChildren(logs.length ? h('div', { class: 'tablewrap' }, h('table', { class: 'grid' },
      h('thead', null, h('tr', null, ['시각', '누가', '무엇을', '접속 PC'].map((t) => h('th', null, t)))),
      h('tbody', null, logs.map((l) => h('tr', null, h('td', null, fmt(l.ts)), h('td', null, l.actor === 'admin' ? '취합 담당자' : l.actor), h('td', null, ACTION[l.action] || l.action, l.detail && l.detail.status ? ` (${(STATUS[l.detail.status] || [''])[0]})` : '', l.detail && l.detail.kind ? ` (${l.detail.kind})` : ''), h('td', null, l.ip))))))
      : h('p', { class: 'hint' }, '기록이 없습니다.'));
  }).catch(fail);
  return wrap;
}

// ───────────── 설정 ─────────────
function settingsTab() {
  const p = S.project;
  const title = h('input', { type: 'text', value: p.title });
  const deadline = h('input', { type: 'date', value: p.deadline });
  const notice = h('input', { type: 'text', value: p.notice || '' });
  const newDept = h('input', { type: 'text', placeholder: '추가할 부서 이름' });
  const wrap = h('div');
  wrap.append(h('div', { class: 'card stack' }, h('h3', null, '기본 정보'),
    h('div', null, h('label', { class: 'field' }, '제목'), title),
    h('div', { class: 'row' }, h('div', { style: 'flex:0 0 200px' }, h('label', { class: 'field' }, '마감일'), deadline), h('div', { class: 'grow' }, h('label', { class: 'field' }, '안내문'), notice)),
    h('div', null, h('button', { class: 'btn primary', onclick: async () => {
      try { await api('POST', `/api/projects/${p.id}/settings`, { title: title.value, deadline: deadline.value, notice: notice.value }); toast('저장했습니다.'); await reload(); } catch (e) { fail(e); }
    } }, '저장'))));
  wrap.append(h('div', { class: 'card stack' }, h('h3', null, '부서 추가 · 링크 재발급'),
    h('div', { class: 'row' }, h('div', { class: 'grow' }, newDept), h('button', { class: 'btn', onclick: async () => {
      try { await api('POST', `/api/projects/${p.id}/depts`, { name: newDept.value }); await reload(); toast('추가했습니다. [담당 부서]에서 조문을 배정해 주세요.'); } catch (e) { fail(e); }
    } }, '부서 추가')),
    h('p', { class: 'hint' }, '링크가 다른 사람에게 잘못 전달됐다면 재발급하세요. 예전 링크는 바로 막힙니다.'),
    h('div', { class: 'row' }, p.depts.map((d) => h('button', { class: 'btn small', onclick: async () => {
      if (!confirm(`${d.name} 링크를 새로 만들까요? 예전 링크는 더 이상 열리지 않습니다.`)) return;
      try { await api('POST', `/api/projects/${p.id}/depts/${d.id}/token`); await reload(); toast('새 링크를 만들었습니다. 현황판에서 복사해 보내 주세요.'); } catch (e) { fail(e); }
    } }, `${d.name} 재발급`)))));
  wrap.append(h('div', { class: 'card stack' }, h('h3', { style: 'color:var(--bad)' }, '취합 건 삭제'),
    h('p', { class: 'hint' }, '모든 의견과 이력이 지워집니다. 먼저 [신구대비표·내보내기]에서 파일로 받아 두세요.'),
    h('div', null, h('button', { class: 'btn bad', onclick: async () => {
      if (prompt(`삭제하려면 제목을 똑같이 적어 주세요:\n${p.title}`) !== p.title) return toast('제목이 달라 삭제하지 않았습니다.');
      try { await api('DELETE', `/api/projects/${p.id}`); S.project = null; go('#/'); } catch (e) { fail(e); }
    } }, '삭제'))));
  return wrap;
}

// ───────────── 시작 ─────────────
if (S.mode === 'dept') deptInit();
else adminInit();
