// 공식 링크 점검: services.json + emergency.json 의 https 주소에 접속해 상태코드를 기록한다.
// 사용: node scripts/check-links.mjs   (저장소 밖 네트워크가 막힌 환경에서는 '접속 불가'로 표시됨)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const services = JSON.parse(fs.readFileSync(path.join(root, 'src/data/services.json'), 'utf8'));
const emergency = JSON.parse(fs.readFileSync(path.join(root, 'src/data/emergency.json'), 'utf8'));

const urls = new Map();
for (const s of services) {
  if (s.official_url) urls.set(s.official_url, `${s.id} official_url`);
  if (s.apply?.online_url) urls.set(s.apply.online_url, `${s.id} online_url`);
  for (const l of s.official_links ?? []) urls.set(l.url, `${s.id} ${l.label}`);
}
for (const c of emergency) if (c.url) urls.set(c.url, `emergency ${c.label}`);

const UA = 'Mozilla/5.0 (link-check; modu-bokji-ai)';

async function fetchCheck(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15000);
  try {
    let res = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: ctrl.signal, headers: { 'User-Agent': UA } });
    if (res.status === 405 || res.status === 403 || res.status === 404 || res.status >= 500) {
      res = await fetch(url, { method: 'GET', redirect: 'follow', signal: ctrl.signal, headers: { 'User-Agent': UA } });
    }
    // 실행 환경의 네트워크 정책(프록시)이 막은 경우는 링크 오류가 아니라 '접속 불가'로 분류
    if (res.headers.get('x-deny-reason')) return { ok: false, status: 0, error: `proxy:${res.headers.get('x-deny-reason')}` };
    return { ok: res.ok, status: res.status };
  } catch (e) {
    return { ok: false, status: 0, error: String(e?.cause?.code ?? e?.name ?? e) };
  } finally {
    clearTimeout(t);
  }
}

// Node 의 fetch 는 HTTPS_PROXY 를 쓰지 않는다. 직접 연결이 막힌 환경(클라우드 세션 등)에서는 503/연결 끊김으로
// 잘못 NG 가 되므로, 그런 경우 프록시를 지원하는 curl(Windows 10+/macOS 기본 탑재)로 GET 하여 다시 확인한다.
function curlCheck(url) {
  const r = spawnSync('curl', ['-sS', '-L', '-m', '20', '-A', UA, '-o', os.devNull, '-w', '%{http_code}', url], { encoding: 'utf8' });
  if (r.error || r.status !== 0) return { ok: false, status: 0, error: `curl:${r.error?.code ?? r.stderr?.trim() ?? r.status}` };
  const status = Number(r.stdout.trim());
  return { ok: status >= 200 && status < 400, status, via: 'curl' };
}

async function check(url) {
  let r = await fetchCheck(url);
  // 연결 실패(0)나 5xx 는 일시적일 수 있으니 curl 로 최대 2회 재확인
  for (let i = 0; i < 2 && (r.status === 0 || r.status >= 500); i++) {
    await new Promise((res) => setTimeout(res, 1500 * (i + 1)));
    const c = curlCheck(url);
    if (c.ok || (c.status !== 0 && c.status < 500)) return c;
    r = c.status === 0 && r.status !== 0 ? r : c;
  }
  return r;
}

const rows = [];
for (const [url, where] of urls) {
  const r = await check(url);
  rows.push({ where, url, ...r });
  console.log(`${r.ok ? 'OK ' : r.status === 0 ? '-- ' : 'NG '} ${String(r.status).padStart(3)}  ${where}  ${url}${r.via ? `  [${r.via}]` : ''}${r.error ? `  (${r.error})` : ''}`);
}
const bad = rows.filter((r) => !r.ok && r.status !== 0);
const unreachable = rows.filter((r) => r.status === 0);
console.log(`\n총 ${rows.length}개 · 정상 ${rows.length - bad.length - unreachable.length} · 오류 ${bad.length} · 접속 불가(네트워크) ${unreachable.length}`);
fs.mkdirSync(path.join(root, 'test-results'), { recursive: true });
fs.writeFileSync(path.join(root, 'test-results/link-check.json'), JSON.stringify({ checked_at: new Date().toISOString(), rows }, null, 2));
process.exit(bad.length ? 1 : 0);
