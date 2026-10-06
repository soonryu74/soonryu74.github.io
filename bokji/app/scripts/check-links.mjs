// 공식 링크 점검: services.json + emergency.json 의 https 주소에 접속해 상태코드를 기록한다.
// 사용: node scripts/check-links.mjs   (저장소 밖 네트워크가 막힌 환경에서는 '접속 불가'로 표시됨)
import fs from 'node:fs';
import path from 'node:path';

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

async function check(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15000);
  try {
    let res = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: ctrl.signal, headers: { 'User-Agent': 'Mozilla/5.0 (link-check; modu-bokji-ai)' } });
    if (res.status === 405 || res.status === 403 || res.status === 404) {
      res = await fetch(url, { method: 'GET', redirect: 'follow', signal: ctrl.signal, headers: { 'User-Agent': 'Mozilla/5.0 (link-check; modu-bokji-ai)' } });
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

const rows = [];
for (const [url, where] of urls) {
  const r = await check(url);
  rows.push({ where, url, ...r });
  console.log(`${r.ok ? 'OK ' : r.status === 0 ? '-- ' : 'NG '} ${String(r.status).padStart(3)}  ${where}  ${url}${r.error ? `  (${r.error})` : ''}`);
}
const bad = rows.filter((r) => !r.ok && r.status !== 0);
const unreachable = rows.filter((r) => r.status === 0);
console.log(`\n총 ${rows.length}개 · 정상 ${rows.length - bad.length - unreachable.length} · 오류 ${bad.length} · 접속 불가(네트워크) ${unreachable.length}`);
fs.mkdirSync(path.join(root, 'test-results'), { recursive: true });
fs.writeFileSync(path.join(root, 'test-results/link-check.json'), JSON.stringify({ checked_at: new Date().toISOString(), rows }, null, 2));
process.exit(bad.length ? 1 : 0);
