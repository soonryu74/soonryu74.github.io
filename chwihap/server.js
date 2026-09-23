#!/usr/bin/env node
// 업무망 취합도우미 서버 — Node.js 만 있으면 동작합니다(추가 설치 없음).
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { parseArticles, labelOf } = require('./lib/parse');
const Diff = require('./lib/diff');
const { buildXlsx, buildDocx, buildHwpx } = require('./lib/export');

const PORT = Number(process.env.PORT) || 8080;
const HOST = process.env.HOST || '0.0.0.0';
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const AUDIT_FILE = path.join(DATA_DIR, 'audit.log');
const BACKUP_DIR = path.join(DATA_DIR, 'backup');
const PUBLIC = path.join(__dirname, 'public');
const MAX_BODY = 5 * 1024 * 1024;

fs.mkdirSync(BACKUP_DIR, { recursive: true });

// ───────────── 저장소 ─────────────
let db = { admin: null, sessions: {}, projects: [] };
if (fs.existsSync(DB_FILE)) db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));

let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 150);
}
function saveNow() {
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db));
  fs.renameSync(tmp, DB_FILE);
  const day = new Date().toISOString().slice(0, 10);
  const bk = path.join(BACKUP_DIR, `db-${day}.json`);
  if (!fs.existsSync(bk)) {
    fs.copyFileSync(DB_FILE, bk);
    const old = fs.readdirSync(BACKUP_DIR).filter((f) => f.startsWith('db-')).sort();
    old.slice(0, Math.max(0, old.length - 30)).forEach((f) => fs.unlinkSync(path.join(BACKUP_DIR, f)));
  }
}
process.on('SIGINT', () => { clearTimeout(saveTimer); saveNow(); process.exit(0); });
process.on('SIGTERM', () => { clearTimeout(saveTimer); saveNow(); process.exit(0); });

function audit(req, actor, action, projectId, detail) {
  const line = JSON.stringify({ ts: new Date().toISOString(), ip: clientIp(req), actor, action, projectId: projectId || null, detail: detail || null });
  fs.appendFile(AUDIT_FILE, line + '\n', () => {});
}

const uid = (n = 9) => crypto.randomBytes(n).toString('base64url');
const now = () => new Date().toISOString();

// ───────────── 인증 ─────────────
function hashPw(pw, salt) {
  return crypto.scryptSync(String(pw), salt, 32).toString('hex');
}
function parseCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach((c) => {
    const i = c.indexOf('=');
    if (i > 0) out[c.slice(0, i).trim()] = decodeURIComponent(c.slice(i + 1).trim());
  });
  return out;
}
function isAdmin(req) {
  const sid = parseCookies(req).sid;
  const s = sid && db.sessions[sid];
  if (!s) return false;
  if (Date.now() - s.ts > 12 * 3600 * 1000) { delete db.sessions[sid]; return false; }
  return true;
}
function findDept(token) {
  if (!token) return null;
  for (const p of db.projects) {
    const d = p.depts.find((x) => x.token === token);
    if (d) return { project: p, dept: d };
  }
  return null;
}
const failures = new Map();
function clientIp(req) {
  return (req.socket.remoteAddress || '').replace('::ffff:', '');
}

// ───────────── 실시간 알림(SSE) ─────────────
const streams = new Set();
const presence = new Map(); // projectId → Map(key → {who, deptId, articleId, ts})
function broadcast(projectId, msg) {
  const data = `data: ${JSON.stringify(msg)}\n\n`;
  for (const s of streams) if (s.projectId === projectId) s.res.write(data);
}
function presenceList(projectId) {
  const m = presence.get(projectId);
  if (!m) return [];
  const t = Date.now();
  for (const [k, v] of m) if (t - v.ts > 25000) m.delete(k);
  return [...m.values()].map(({ who, deptId, articleId }) => ({ who, deptId, articleId }));
}
setInterval(() => {
  for (const pid of presence.keys()) broadcast(pid, { type: 'presence', list: presenceList(pid) });
  for (const s of streams) s.res.write(': ping\n\n');
}, 15000);

function changed(project, by) {
  project.updatedAt = now();
  save();
  broadcast(project.id, { type: 'change', by: by || '' });
}

// ───────────── 도메인 로직 ─────────────
function getProject(id) {
  return db.projects.find((p) => p.id === id);
}
function snapshot(project) {
  return project.articles.map((a) => ({ id: a.id, label: a.label, text: a.text, deleted: !!a.deleted, isNew: !!a.isNew }));
}
function deptName(project, deptId) {
  const d = project.depts.find((x) => x.id === deptId);
  return d ? d.name : '담당자';
}
function reasonsMap(project) {
  const out = {};
  const add = (id, s) => { (out[id] = out[id] || []).push(s); };
  for (const p of project.proposals) {
    if (p.status !== 'accepted') continue;
    const id = p.type === 'new' ? p.createdArticleId : p.articleId;
    add(id, `${p.reason || '(사유 없음)'} (${deptName(project, p.deptId)})`);
  }
  for (const r of project.revisions) if (r.direct && r.note) add(r.articleId, `${r.note} (취합 담당)`);
  return out;
}
function versionArticles(project, key) {
  if (!key || key === 'current') return snapshot(project);
  const v = project.versions.find((x) => x.id === key);
  if (!v) throw httpError(404, '버전을 찾을 수 없습니다.');
  return v.articles;
}
function addRevision(project, articleId, before, after, actor, extra) {
  project.revisions.push({ id: uid(), articleId, ts: now(), actor, before, after, ...extra });
}

function applyDecision(project, prop, status, reason, editedText, actor) {
  const wasAccepted = prop.status === 'accepted';
  if (wasAccepted && status !== 'accepted') undoAccept(project, prop, actor);
  if (!wasAccepted && status === 'accepted') {
    if (prop.type === 'modify') {
      const a = project.articles.find((x) => x.id === prop.articleId);
      if (!a) throw httpError(404, '조문이 없습니다.');
      const text = editedText != null && editedText !== '' ? String(editedText) : prop.text;
      prop.appliedBefore = a.text;
      prop.appliedText = text;
      addRevision(project, a.id, a.text, text, actor, { proposalId: prop.id, deptId: prop.deptId });
      a.text = text;
      a.label = labelOf(text);
    } else if (prop.type === 'delete') {
      const a = project.articles.find((x) => x.id === prop.articleId);
      if (!a) throw httpError(404, '조문이 없습니다.');
      a.deleted = true;
      addRevision(project, a.id, a.text, '', actor, { proposalId: prop.id, deptId: prop.deptId, deleted: true });
    } else if (prop.type === 'new') {
      const text = editedText != null && editedText !== '' ? String(editedText) : prop.text;
      let idx = project.articles.findIndex((x) => x.id === prop.articleId);
      if (idx < 0) idx = project.articles.length - 1;
      while (project.articles[idx + 1] && project.articles[idx + 1].isNew && project.articles[idx + 1].anchorId === prop.articleId) idx++;
      const art = { id: uid(), label: labelOf(text), text, depts: [prop.deptId], isNew: true, anchorId: prop.articleId };
      project.articles.splice(idx + 1, 0, art);
      prop.createdArticleId = art.id;
      prop.appliedText = text;
      addRevision(project, art.id, '', text, actor, { proposalId: prop.id, deptId: prop.deptId, created: true });
    }
  }
  prop.status = status;
  prop.decisionReason = reason || '';
  prop.decidedAt = status === 'pending' ? null : now();
}
function undoAccept(project, prop, actor) {
  if (prop.type === 'modify') {
    const a = project.articles.find((x) => x.id === prop.articleId);
    if (a && a.text === prop.appliedText) {
      addRevision(project, a.id, a.text, prop.appliedBefore, actor, { proposalId: prop.id, undo: true });
      a.text = prop.appliedBefore;
      a.label = labelOf(a.text);
    }
  } else if (prop.type === 'delete') {
    const a = project.articles.find((x) => x.id === prop.articleId);
    if (a) { a.deleted = false; addRevision(project, a.id, '', a.text, actor, { proposalId: prop.id, undo: true }); }
  } else if (prop.type === 'new') {
    const i = project.articles.findIndex((x) => x.id === prop.createdArticleId);
    if (i >= 0) {
      addRevision(project, project.articles[i].id, project.articles[i].text, '', actor, { proposalId: prop.id, undo: true, deleted: true });
      project.articles.splice(i, 1);
    }
    prop.createdArticleId = null;
  }
}

function adminView(project) {
  return { ...project, depts: project.depts, presence: presenceList(project.id) };
}
function deptView(project, dept) {
  return {
    id: project.id,
    title: project.title,
    deadline: project.deadline,
    notice: project.notice || '',
    dept: { id: dept.id, name: dept.name },
    submission: project.submissions[dept.id] || { status: 'draft' },
    articles: project.articles.filter((a) => !a.deleted).map((a) => ({ id: a.id, label: a.label, text: a.text, heading: !!a.heading, mine: a.depts.includes(dept.id) })),
    proposals: project.proposals.filter((p) => p.deptId === dept.id),
    presence: presenceList(project.id).filter((x) => x.deptId === dept.id),
  };
}

// ───────────── HTTP 도우미 ─────────────
function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}
function send(res, status, body, headers) {
  const isBuf = Buffer.isBuffer(body);
  res.writeHead(status, {
    'Content-Type': isBuf ? 'application/octet-stream' : 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...headers,
  });
  res.end(isBuf ? body : JSON.stringify(body));
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) { reject(httpError(413, '내용이 너무 큽니다.')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch { reject(httpError(400, '잘못된 요청입니다.')); }
    });
  });
}
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png' };
function serveFile(res, file) {
  fs.readFile(file, (err, buf) => {
    if (err) return send(res, 404, { error: '없는 페이지입니다.' });
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Content-Security-Policy': "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:",
    });
    res.end(buf);
  });
}
function fileName(project, ext) {
  const safe = project.title.replace(/[\\/:*?"<>|]/g, '_').slice(0, 60);
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `attachment; filename="export.${ext}"; filename*=UTF-8''${encodeURIComponent(`${safe}_신구대비표_${stamp}.${ext}`)}`;
}

// ───────────── 라우팅 ─────────────
async function handle(req, res) {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;
  const m = req.method;

  // 정적 파일
  if (m === 'GET' && !p.startsWith('/api/')) {
    if (p === '/lib/diff.js') return serveFile(res, path.join(__dirname, 'lib/diff.js'));
    if (p === '/' || p.startsWith('/d/')) return serveFile(res, path.join(PUBLIC, 'index.html'));
    const f = path.normalize(path.join(PUBLIC, p));
    if (!f.startsWith(PUBLIC + path.sep)) return send(res, 403, { error: '금지' });
    return serveFile(res, f);
  }

  // 공통
  if (p === '/api/status' && m === 'GET') return send(res, 200, { setup: !!db.admin, admin: isAdmin(req) });

  if (p === '/api/setup' && m === 'POST') {
    if (db.admin) throw httpError(400, '이미 설정되었습니다.');
    const { password } = await readBody(req);
    if (!password || String(password).length < 6) throw httpError(400, '비밀번호는 6자 이상으로 정해 주세요.');
    const salt = uid(12);
    db.admin = { salt, hash: hashPw(password, salt) };
    return login(req, res, 'setup');
  }
  if (p === '/api/login' && m === 'POST') {
    const ip = clientIp(req);
    const f = failures.get(ip) || { n: 0, until: 0 };
    if (f.until > Date.now()) throw httpError(429, '비밀번호를 여러 번 틀렸습니다. 1분 뒤 다시 시도해 주세요.');
    const { password } = await readBody(req);
    if (!db.admin || hashPw(password || '', db.admin.salt) !== db.admin.hash) {
      f.n++;
      if (f.n >= 5) { f.until = Date.now() + 60000; f.n = 0; }
      failures.set(ip, f);
      audit(req, 'admin', 'login-fail');
      throw httpError(401, '비밀번호가 맞지 않습니다.');
    }
    failures.delete(ip);
    return login(req, res, 'login');
  }
  if (p === '/api/logout' && m === 'POST') {
    const sid = parseCookies(req).sid;
    if (sid) delete db.sessions[sid];
    save();
    return send(res, 200, { ok: true }, { 'Set-Cookie': 'sid=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict' });
  }

  // 실시간 알림
  if (p === '/api/events' && m === 'GET') {
    let projectId = url.searchParams.get('project');
    let deptId = null;
    const t = url.searchParams.get('t');
    if (t) {
      const f = findDept(t);
      if (!f) throw httpError(403, '링크가 올바르지 않습니다.');
      projectId = f.project.id;
      deptId = f.dept.id;
    } else if (!isAdmin(req)) throw httpError(401, '로그인이 필요합니다.');
    res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
    res.write('retry: 3000\n\n');
    const s = { res, projectId, deptId };
    streams.add(s);
    req.on('close', () => streams.delete(s));
    return;
  }
  if (p === '/api/presence' && m === 'POST') {
    const body = await readBody(req);
    let projectId, deptId, who;
    const f = findDept(req.headers['x-dept-token']);
    if (f) { projectId = f.project.id; deptId = f.dept.id; who = `${f.dept.name} ${String(body.who || '').slice(0, 20)}`.trim(); }
    else if (isAdmin(req)) { projectId = body.projectId; deptId = 'admin'; who = '취합 담당자'; }
    else throw httpError(401, '권한이 없습니다.');
    if (!presence.has(projectId)) presence.set(projectId, new Map());
    const key = `${deptId}:${who}`;
    if (body.articleId) presence.get(projectId).set(key, { who, deptId, articleId: body.articleId, ts: Date.now() });
    else presence.get(projectId).delete(key);
    broadcast(projectId, { type: 'presence', list: presenceList(projectId) });
    return send(res, 200, { ok: true });
  }

  // ───── 부서(수정자) API ─────
  if (p.startsWith('/api/dept')) {
    const f = findDept(req.headers['x-dept-token']);
    if (!f) throw httpError(403, '링크가 올바르지 않거나 새로 발급되었습니다. 담당자에게 새 링크를 받아 주세요.');
    const { project, dept } = f;
    const sub = project.submissions[dept.id] || (project.submissions[dept.id] = { status: 'draft' });

    if (p === '/api/dept' && m === 'GET') return send(res, 200, deptView(project, dept));

    if (p === '/api/dept/proposals' && m === 'PUT') {
      if (sub.status === 'submitted') throw httpError(409, '이미 제출했습니다. 고치려면 [제출 취소]를 먼저 눌러 주세요.');
      const b = await readBody(req);
      const type = ['modify', 'delete', 'new'].includes(b.type) ? b.type : 'modify';
      const art = project.articles.find((a) => a.id === b.articleId && !a.deleted);
      if (!art) throw httpError(404, '조문을 찾을 수 없습니다.');
      if (!art.depts.includes(dept.id)) throw httpError(403, '우리 부서 담당 조문이 아닙니다.');
      const text = String(b.text || '').slice(0, 200000);
      let prop = b.id ? project.proposals.find((x) => x.id === b.id && x.deptId === dept.id) : null;
      if (!prop && type !== 'new') prop = project.proposals.find((x) => x.deptId === dept.id && x.articleId === art.id && x.type !== 'new');
      if (prop && prop.status !== 'draft') throw httpError(409, '담당자가 이미 처리한 의견은 고칠 수 없습니다.');
      if (prop && b.rev != null && prop.rev !== b.rev) {
        return send(res, 409, { error: `${prop.author || '같은 부서 다른 분'}이(가) 먼저 고쳤습니다. 최신 내용을 불러왔습니다.`, proposal: prop });
      }
      if (!prop) {
        prop = { id: uid(), projectId: project.id, deptId: dept.id, articleId: art.id, status: 'draft', createdAt: now(), rev: 0 };
        project.proposals.push(prop);
      }
      Object.assign(prop, { type, text, reason: String(b.reason || '').slice(0, 2000), author: String(b.author || '').slice(0, 20), baseText: prop.baseText != null && prop.rev > 0 ? prop.baseText : art.text, updatedAt: now() });
      prop.rev++;
      audit(req, `${dept.name}/${prop.author}`, 'proposal-save', project.id, { proposalId: prop.id, articleId: art.id, type });
      changed(project, dept.name);
      return send(res, 200, { proposal: prop });
    }
    const dm = p.match(/^\/api\/dept\/proposals\/([\w-]+)$/);
    if (dm && m === 'DELETE') {
      if (sub.status === 'submitted') throw httpError(409, '제출 후에는 지울 수 없습니다.');
      const i = project.proposals.findIndex((x) => x.id === dm[1] && x.deptId === dept.id && x.status === 'draft');
      if (i < 0) throw httpError(404, '의견을 찾을 수 없습니다.');
      project.proposals.splice(i, 1);
      audit(req, dept.name, 'proposal-delete', project.id, { proposalId: dm[1] });
      changed(project, dept.name);
      return send(res, 200, { ok: true });
    }
    if (p === '/api/dept/submit' && m === 'POST') {
      const b = await readBody(req);
      if (!String(b.confirmer || '').trim()) throw httpError(400, '확인하신 부서장(또는 책임자) 이름을 적어 주세요.');
      const t = now();
      project.proposals.forEach((x) => { if (x.deptId === dept.id && x.status === 'draft') { x.status = 'pending'; x.submittedAt = t; } });
      Object.assign(sub, { status: 'submitted', submittedAt: t, confirmer: String(b.confirmer).slice(0, 20), submitter: String(b.author || '').slice(0, 20), noChange: !project.proposals.some((x) => x.deptId === dept.id) });
      audit(req, `${dept.name}/${sub.submitter}`, 'submit', project.id, { confirmer: sub.confirmer });
      changed(project, dept.name);
      return send(res, 200, { ok: true });
    }
    if (p === '/api/dept/unsubmit' && m === 'POST') {
      const mine = project.proposals.filter((x) => x.deptId === dept.id);
      if (mine.some((x) => ['accepted', 'rejected', 'hold'].includes(x.status))) throw httpError(409, '담당자가 이미 검토를 시작해 제출을 취소할 수 없습니다. 담당자에게 연락해 주세요.');
      mine.forEach((x) => { x.status = 'draft'; });
      sub.status = 'draft';
      audit(req, dept.name, 'unsubmit', project.id);
      changed(project, dept.name);
      return send(res, 200, { ok: true });
    }
    throw httpError(404, '없는 기능입니다.');
  }

  // ───── 취합 담당자 API ─────
  if (!isAdmin(req)) throw httpError(401, '로그인이 필요합니다.');

  if (p === '/api/parse' && m === 'POST') {
    const { text } = await readBody(req);
    return send(res, 200, { articles: parseArticles(text) });
  }
  if (p === '/api/projects' && m === 'GET') {
    return send(res, 200, db.projects.map((x) => ({
      id: x.id, title: x.title, deadline: x.deadline, createdAt: x.createdAt, updatedAt: x.updatedAt,
      depts: x.depts.length, submitted: x.depts.filter((d) => (x.submissions[d.id] || {}).status === 'submitted').length,
      pending: x.proposals.filter((q) => q.status === 'pending').length,
    })));
  }
  if (p === '/api/projects' && m === 'POST') {
    const b = await readBody(req);
    const title = String(b.title || '').trim();
    if (!title) throw httpError(400, '제목을 적어 주세요.');
    const names = [...new Set((b.depts || []).map((s) => String(s).trim()).filter(Boolean))];
    if (!names.length) throw httpError(400, '부서를 하나 이상 적어 주세요.');
    const depts = names.map((name) => ({ id: uid(), name, token: uid(18) }));
    const arts = (b.articles || []).map((a) => ({
      id: uid(), label: labelOf(a.text), text: String(a.text || ''), heading: !!a.heading,
      depts: (a.depts || []).map((i) => depts[i] && depts[i].id).filter(Boolean),
    }));
    if (!arts.length) throw httpError(400, '원문을 붙여 넣어 주세요.');
    const project = {
      id: uid(), title, deadline: String(b.deadline || ''), notice: String(b.notice || '').slice(0, 2000), createdAt: now(), updatedAt: now(),
      depts, articles: arts, proposals: [], revisions: [], submissions: {}, versions: [],
    };
    project.versions.push({ id: 'v0', name: '원본(배포본)', ts: now(), articles: snapshot(project) });
    db.projects.unshift(project);
    audit(req, 'admin', 'project-create', project.id, { title });
    changed(project, '취합 담당자');
    return send(res, 200, { id: project.id });
  }

  const pm = p.match(/^\/api\/projects\/([\w-]+)(\/.*)?$/);
  if (!pm) throw httpError(404, '없는 기능입니다.');
  const project = getProject(pm[1]);
  if (!project) throw httpError(404, '취합 건을 찾을 수 없습니다.');
  const sub = pm[2] || '';

  if (sub === '' && m === 'GET') return send(res, 200, adminView(project));
  if (sub === '' && m === 'DELETE') {
    db.projects = db.projects.filter((x) => x !== project);
    audit(req, 'admin', 'project-delete', project.id, { title: project.title });
    save();
    return send(res, 200, { ok: true });
  }
  if (sub === '/settings' && m === 'POST') {
    const b = await readBody(req);
    if (b.title) project.title = String(b.title).slice(0, 200);
    if (b.deadline != null) project.deadline = String(b.deadline);
    if (b.notice != null) project.notice = String(b.notice).slice(0, 2000);
    audit(req, 'admin', 'settings', project.id, b);
    changed(project, '취합 담당자');
    return send(res, 200, { ok: true });
  }
  if (sub === '/depts' && m === 'POST') {
    const { name } = await readBody(req);
    if (!String(name || '').trim()) throw httpError(400, '부서 이름을 적어 주세요.');
    const d = { id: uid(), name: String(name).trim().slice(0, 40), token: uid(18) };
    project.depts.push(d);
    audit(req, 'admin', 'dept-add', project.id, { name: d.name });
    changed(project, '취합 담당자');
    return send(res, 200, { dept: d });
  }
  let mm;
  if ((mm = sub.match(/^\/depts\/([\w-]+)\/token$/)) && m === 'POST') {
    const d = project.depts.find((x) => x.id === mm[1]);
    if (!d) throw httpError(404, '부서가 없습니다.');
    d.token = uid(18);
    audit(req, 'admin', 'dept-token-reset', project.id, { dept: d.name });
    changed(project, '취합 담당자');
    return send(res, 200, { token: d.token });
  }
  if ((mm = sub.match(/^\/depts\/([\w-]+)\/reopen$/)) && m === 'POST') {
    const s = project.submissions[mm[1]];
    if (s) s.status = 'draft';
    project.proposals.forEach((x) => { if (x.deptId === mm[1] && x.status === 'pending') x.status = 'draft'; });
    audit(req, 'admin', 'dept-reopen', project.id, { dept: deptName(project, mm[1]) });
    changed(project, '취합 담당자');
    return send(res, 200, { ok: true });
  }
  if ((mm = sub.match(/^\/articles\/([\w-]+)\/assign$/)) && m === 'POST') {
    const a = project.articles.find((x) => x.id === mm[1]);
    if (!a) throw httpError(404, '조문이 없습니다.');
    const { deptIds } = await readBody(req);
    a.depts = (deptIds || []).filter((id) => project.depts.some((d) => d.id === id));
    changed(project, '취합 담당자');
    return send(res, 200, { ok: true });
  }
  if ((mm = sub.match(/^\/articles\/([\w-]+)\/edit$/)) && m === 'POST') {
    const a = project.articles.find((x) => x.id === mm[1]);
    if (!a) throw httpError(404, '조문이 없습니다.');
    const { text, note } = await readBody(req);
    if (String(text) === a.text) return send(res, 200, { ok: true });
    addRevision(project, a.id, a.text, String(text), '취합 담당자', { direct: true, note: String(note || '').slice(0, 500) });
    a.text = String(text);
    a.label = labelOf(a.text);
    audit(req, 'admin', 'article-edit', project.id, { articleId: a.id });
    changed(project, '취합 담당자');
    return send(res, 200, { ok: true });
  }
  if ((mm = sub.match(/^\/articles\/([\w-]+)\/restore$/)) && m === 'POST') {
    const a = project.articles.find((x) => x.id === mm[1]);
    const { revisionId, side } = await readBody(req);
    const r = project.revisions.find((x) => x.id === revisionId && x.articleId === mm[1]);
    if (!a || !r) throw httpError(404, '이력을 찾을 수 없습니다.');
    const target = side === 'after' ? r.after : r.before;
    addRevision(project, a.id, a.text, target, '취합 담당자', { direct: true, note: '이전 내용으로 되돌림', restoreOf: r.id });
    a.text = target;
    a.label = labelOf(target);
    a.deleted = false;
    audit(req, 'admin', 'article-restore', project.id, { articleId: a.id, revisionId });
    changed(project, '취합 담당자');
    return send(res, 200, { ok: true });
  }
  if ((mm = sub.match(/^\/proposals\/([\w-]+)\/decide$/)) && m === 'POST') {
    const prop = project.proposals.find((x) => x.id === mm[1]);
    if (!prop || prop.status === 'draft') throw httpError(404, '제출된 의견이 아닙니다.');
    const b = await readBody(req);
    if (!['accepted', 'rejected', 'hold', 'pending'].includes(b.status)) throw httpError(400, '처리 상태가 올바르지 않습니다.');
    applyDecision(project, prop, b.status, String(b.reason || '').slice(0, 1000), b.text, '취합 담당자');
    audit(req, 'admin', 'decide', project.id, { proposalId: prop.id, status: b.status });
    changed(project, '취합 담당자');
    return send(res, 200, { ok: true });
  }
  if (sub === '/versions' && m === 'POST') {
    const { name } = await readBody(req);
    const v = { id: 'v' + project.versions.length + '-' + uid(3), name: String(name || '').trim().slice(0, 60) || `${new Date().toLocaleDateString('ko-KR')} 저장본`, ts: now(), articles: snapshot(project) };
    project.versions.push(v);
    audit(req, 'admin', 'version-save', project.id, { name: v.name });
    changed(project, '취합 담당자');
    return send(res, 200, { version: { id: v.id, name: v.name } });
  }
  if (sub === '/audit' && m === 'GET') {
    const lines = fs.existsSync(AUDIT_FILE) ? fs.readFileSync(AUDIT_FILE, 'utf8').trim().split('\n') : [];
    const mine = lines.map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter((x) => x && x.projectId === project.id);
    return send(res, 200, mine.slice(-500).reverse());
  }
  if ((mm = sub.match(/^\/export\.(xlsx|docx|hwpx)$/)) && m === 'GET') {
    const from = versionArticles(project, url.searchParams.get('from') || 'v0');
    const to = versionArticles(project, url.searchParams.get('to') || 'current');
    const rows = Diff.compare(from, to, { all: url.searchParams.get('all') === '1' });
    const finalArticles = to.filter((a) => !a.deleted);
    const fromName = (project.versions.find((v) => v.id === (url.searchParams.get('from') || 'v0')) || {}).name || '';
    const toKey = url.searchParams.get('to') || 'current';
    const toName = toKey === 'current' ? '현재 작업본' : (project.versions.find((v) => v.id === toKey) || {}).name;
    const subtitle = `비교: ${fromName} → ${toName} · 출력일 ${new Date().toLocaleDateString('ko-KR')}`;
    const args = { title: project.title, subtitle, rows, reasons: reasonsMap(project), finalArticles };
    const kind = mm[1];
    let buf;
    let type;
    if (kind === 'xlsx') {
      const labelById = new Map(project.articles.map((a) => [a.id, a.label]));
      project.versions[0].articles.forEach((a) => { if (!labelById.has(a.id)) labelById.set(a.id, a.label); });
      const props = project.proposals.filter((x) => x.status !== 'draft').map((x) => ({ ...x, articleLabel: (x.type === 'new' ? '신설: ' : '') + (labelById.get(x.articleId) || '') }));
      buf = buildXlsx({ ...args, proposals: props, deptName: (id) => deptName(project, id) });
      type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    } else if (kind === 'docx') {
      buf = buildDocx(args);
      type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    } else {
      buf = buildHwpx(args);
      type = 'application/hwp+zip';
    }
    audit(req, 'admin', 'export', project.id, { kind });
    return send(res, 200, buf, { 'Content-Type': type, 'Content-Disposition': fileName(project, kind) });
  }
  throw httpError(404, '없는 기능입니다.');
}

function login(req, res, how) {
  const sid = uid(24);
  db.sessions[sid] = { ts: Date.now() };
  save();
  audit(req, 'admin', how);
  send(res, 200, { ok: true }, { 'Set-Cookie': `sid=${sid}; Path=/; HttpOnly; SameSite=Strict; Max-Age=43200` });
}

const server = http.createServer((req, res) => {
  handle(req, res).catch((e) => {
    if (!e.status) console.error(e);
    if (!res.headersSent) send(res, e.status || 500, { error: e.status ? e.message : '서버 오류가 났습니다. 다시 시도해 주세요.' });
  });
});

server.listen(PORT, HOST, () => {
  const ips = Object.values(os.networkInterfaces()).flat().filter((i) => i && i.family === 'IPv4' && !i.internal).map((i) => i.address);
  console.log('\n  ──────────────────────────────────────────');
  console.log('   업무망 취합도우미가 켜졌습니다.');
  console.log(`   이 PC에서 열기  : http://localhost:${PORT}`);
  ips.forEach((ip) => console.log(`   다른 PC에서 열기: http://${ip}:${PORT}`));
  console.log('   끄려면 이 창에서 Ctrl + C 를 누르세요.');
  console.log('  ──────────────────────────────────────────\n');
});
