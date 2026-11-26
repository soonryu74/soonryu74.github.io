// 말씀 알림 — Supabase Edge Function: mal-notify (verify_jwt=false)
// 로그인 대신 연결 코드(key)로 사람을 찾는다. 코드는 해시만 저장한다.
//  · key         : 화면이 구독할 때 쓰는 VAPID 공개키 (mal_secret — 없으면 처음 한 번 만든다)
//  · load        : 내 목록·설정 읽기 (없으면 null)
//  · save        : 내 목록·설정 저장 (처음이면 새로 만든다)
//  · subscribe   : 이 기기를 알림 받을 기기로 등록
//  · unsubscribe : 이 기기 알림 끄기
//  · test        : 지금 이 기기로 다음 순서 글을 한 번 보내 본다 (순번은 넘기지 않는다)
//  · tick        : 5분마다 pg_cron 이 부른다. 보낼 때가 된 사람에게 다음 글을 보낸다
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' } })

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

const VAPID = { subject: 'https://soonryu74.github.io/malsseum/', publicKey: '', privateKey: '' }
async function readVapid() {
  const { data } = await admin.from('mal_secret').select('name, value').in('name', ['VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY'])
  for (const r of data ?? []) {
    if (r.name === 'VAPID_PUBLIC_KEY') VAPID.publicKey = r.value
    if (r.name === 'VAPID_PRIVATE_KEY') VAPID.privateKey = r.value
  }
}
async function loadVapid() {
  if (VAPID.publicKey && VAPID.privateKey) return
  await readVapid()
  if (VAPID.publicKey && VAPID.privateKey) return
  const k = webpush.generateVAPIDKeys()
  await admin.from('mal_secret').upsert([
    { name: 'VAPID_PUBLIC_KEY', value: k.publicKey },
    { name: 'VAPID_PRIVATE_KEY', value: k.privateKey },
  ], { onConflict: 'name', ignoreDuplicates: true })
  VAPID.publicKey = ''; VAPID.privateKey = ''
  await readVapid()
}

const KINDS = ['verse', 'quote', 'prayer']
const KIND_LABEL: Record<string, string> = { verse: '오늘의 말씀', quote: '좋은 글귀', prayer: '기도제목' }
const INTERVALS = [30, 60, 120, 180]
const MAX_ITEMS = 500
const MAX_USERS = 500

type Item = { id: string; kind: string; ref: string; text: string }
type User = {
  id: string; items: Item[]; kinds: string[]; interval_min: number; quiet_start: number; quiet_end: number
  tz: string; enabled: boolean; cursor: number; next_at: string | null
}
const COLS = 'id, items, kinds, interval_min, quiet_start, quiet_end, tz, enabled, cursor, next_at'

async function keyHash(key: string) {
  const norm = String(key ?? '').replace(/[^A-Za-z0-9]/g, '').toUpperCase()
  if (norm.length < 12) return ''
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('mal:' + norm))
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('')
}
async function findUser(hash: string) {
  const { data } = await admin.from('mal_user').select(COLS).eq('key_hash', hash).maybeSingle()
  return (data as User | null) ?? null
}

// ── 시간 계산 ───────────────────────────────────────────────
function validTz(tz: string) { try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return true } catch { return false } }
// 그 시각에 이 시간대가 UTC보다 몇 분 앞서는가
function tzOffsetMin(tz: string, at: Date) {
  const p = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric',
  }).formatToParts(at)
  const v: Record<string, number> = {}
  for (const x of p) if (x.type !== 'literal') v[x.type] = Number(x.value)
  const asUtc = Date.UTC(v.year, v.month - 1, v.day, v.hour, v.minute, v.second)
  return Math.round((asUtc - Math.floor(at.getTime() / 1000) * 1000) / 60000)
}
const inQuiet = (hour: number, qs: number, qe: number) => qs === qe ? false : qs < qe ? (hour >= qs && hour < qe) : (hour >= qs || hour < qe)
// after 다음의 발송 시각: 그 사람 시계로 간격 눈금(정시 기준)에 맞추고, 조용한 시간이면 끝나는 시각으로 미룬다
export function nextSlot(after: Date, u: { interval_min: number; quiet_start: number; quiet_end: number; tz: string }) {
  const step = u.interval_min * 60000
  let t = after.getTime()
  for (let i = 0; i < 4; i++) {
    const off = tzOffsetMin(u.tz, new Date(t)) * 60000
    const local = (Math.floor((t + off) / step) + 1) * step          // 그 사람 시계 기준 다음 눈금
    const hour = Math.floor((((local % 864e5) + 864e5) % 864e5) / 36e5)
    if (!inQuiet(hour, u.quiet_start, u.quiet_end)) return new Date(local - off)
    // 조용한 시간 끝(그 사람 시계)으로 건너뛴다
    const day = Math.floor(local / 864e5) * 864e5
    let end = day + u.quiet_end * 36e5
    if (end <= local) end += 864e5
    const cand = end - off
    const off2 = tzOffsetMin(u.tz, new Date(cand)) * 60000
    if (off2 === off) return new Date(cand)
    t = end - off2 - 1                                                // 서머타임이 바뀌는 날: 다시 맞춘다
  }
  return new Date(t + step)
}

// ── 보내기 ─────────────────────────────────────────────────
const active = (u: User) => (u.items ?? []).filter((it) => u.kinds.includes(it.kind))
function payloadFor(it: Item) {
  return { title: it.ref || KIND_LABEL[it.kind] || '말씀 알림', body: it.text, kind: it.kind, id: it.id }
}
type Sub = { id: string; endpoint: string; p256dh: string; auth: string }
async function push(sub: Sub, payload: unknown) {
  const req = webpush.generateRequestDetails(
    { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
    JSON.stringify(payload),
    { vapidDetails: VAPID, TTL: 60 * 60, urgency: 'high' },   // 휴대폰이 절전 중이어도 제시간에 깨워 보여 준다
  )
  const res = await fetch(req.endpoint, { method: req.method, headers: req.headers, body: req.body })
  if (res.status < 200 || res.status >= 300) console.error('push status', res.status, new URL(sub.endpoint).host, (await res.text()).slice(0, 200))
  if (res.status === 404 || res.status === 410) await admin.from('mal_push').delete().eq('id', sub.id)   // 구독을 끊은 기기
  return res.status
}
async function sendTo(userId: string, payload: unknown, endpoint = '') {
  let q = admin.from('mal_push').select('id, endpoint, p256dh, auth').eq('user_id', userId)
  if (endpoint) q = q.eq('endpoint', endpoint)
  const { data: subs } = await q
  const results = await Promise.allSettled((subs ?? []).map((s) => push(s as Sub, payload)))
  results.forEach((r) => { if (r.status === 'rejected') console.error('push', String(r.reason).slice(0, 200)) })
  return { devices: subs?.length ?? 0, sent: results.filter((r) => r.status === 'fulfilled' && r.value >= 200 && r.value < 300).length }
}

async function tick() {
  const now = new Date()
  const { data } = await admin.from('mal_user').select(COLS).eq('enabled', true).lte('next_at', now.toISOString()).limit(200)
  let sent = 0
  for (const u of (data ?? []) as User[]) {
    const list = active(u)
    const next = nextSlot(now, u).toISOString()
    // 같은 next_at 을 본 요청 가운데 하나만 통과한다 (겹쳐 불려도 한 번만 보낸다)
    const { data: won } = await admin.from('mal_user')
      .update({ next_at: next, cursor: list.length ? (u.cursor + 1) % list.length : 0, last_sent_at: now.toISOString() })
      .eq('id', u.id).eq('next_at', u.next_at).select('id')
    if (!won?.length || !list.length) continue
    // 예정 시각보다 20분 넘게 늦었으면(서버가 쉬었던 경우) 건너뛴다
    if (u.next_at && now.getTime() - new Date(u.next_at).getTime() > 20 * 60000) continue
    const r = await sendTo(u.id, payloadFor(list[u.cursor % list.length]))
    sent += r.sent
  }
  if (data?.length) console.log('tick', JSON.stringify({ due: data.length, sent }))
  return { due: data?.length ?? 0, sent }
}

// ── 입력 다듬기 ────────────────────────────────────────────
const clean = (s: unknown, n: number) => String(s ?? '').replace(/\r/g, '').trim().slice(0, n)
function cleanItems(raw: unknown): Item[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const out: Item[] = []
  for (const x of raw.slice(0, MAX_ITEMS)) {
    const text = clean(x?.text, 600)
    if (!text) continue
    let id = clean(x?.id, 24).replace(/[^A-Za-z0-9]/g, '')
    if (!id || seen.has(id)) id = crypto.randomUUID().replace(/-/g, '').slice(0, 12)
    seen.add(id)
    out.push({ id, kind: KINDS.includes(x?.kind) ? x.kind : 'verse', ref: clean(x?.ref, 60), text })
  }
  return out
}
const view = (u: User) => ({
  items: u.items, kinds: u.kinds, interval_min: u.interval_min, quiet_start: u.quiet_start, quiet_end: u.quiet_end,
  tz: u.tz, enabled: u.enabled, cursor: u.cursor, next_at: u.next_at,
})

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'POST만 받습니다' }, 405)
  let body: Record<string, unknown>
  try { body = await req.json() } catch { return json({ error: '요청을 읽지 못했습니다' }, 400) }

  try {
    await loadVapid()
    if (!VAPID.publicKey || !VAPID.privateKey) return json({ error: '알림 키가 설정되지 않았습니다' }, 500)
    if (body.action === 'key') return json({ publicKey: VAPID.publicKey })
    if (body.action === 'tick') return json({ ok: true, ...(await tick()) })

    const hash = await keyHash(String(body.key ?? ''))
    if (!hash) return json({ error: '연결 코드가 맞지 않습니다' }, 401)
    let me = await findUser(hash)

    if (body.action === 'load') return json({ ok: true, user: me ? view(me) : null })

    if (body.action === 'save') {
      const s = (body.settings ?? {}) as Record<string, unknown>
      const tz = validTz(String(s.tz ?? '')) ? String(s.tz) : (me?.tz ?? 'Asia/Seoul')
      const hourOf = (v: unknown, d: number) => { const n = Number(v); return Number.isInteger(n) && n >= 0 && n <= 23 ? n : d }
      const kinds = Array.isArray(s.kinds) ? KINDS.filter((k) => (s.kinds as unknown[]).includes(k)) : (me?.kinds ?? KINDS)
      const row = {
        items: cleanItems(body.items),
        kinds: kinds.length ? kinds : KINDS,
        interval_min: INTERVALS.includes(Number(s.interval_min)) ? Number(s.interval_min) : (me?.interval_min ?? 60),
        quiet_start: hourOf(s.quiet_start, me?.quiet_start ?? 22),
        quiet_end: hourOf(s.quiet_end, me?.quiet_end ?? 7),
        tz,
        enabled: s.enabled === undefined ? (me?.enabled ?? true) : !!s.enabled,
        updated_at: new Date().toISOString(),
      }
      const n = row.items.filter((it) => row.kinds.includes(it.kind)).length
      const cursor = n ? (me?.cursor ?? 0) % n : 0
      const next_at = nextSlot(new Date(), row).toISOString()
      if (me) {
        await admin.from('mal_user').update({ ...row, cursor, next_at }).eq('id', me.id)
      } else {
        const { count } = await admin.from('mal_user').select('id', { count: 'exact', head: true })
        if ((count ?? 0) >= MAX_USERS) return json({ error: '지금은 새로 등록할 수 없습니다' }, 403)
        const { error } = await admin.from('mal_user').insert({ ...row, key_hash: hash, cursor, next_at })
        if (error) throw error
      }
      me = await findUser(hash)
      return json({ ok: true, user: me ? view(me) : null })
    }

    if (!me) return json({ error: '먼저 목록을 저장해 주세요' }, 404)

    if (body.action === 'subscribe') {
      const sub = (body.subscription ?? {}) as { endpoint?: string; keys?: { p256dh?: string; auth?: string } }
      if (!sub.endpoint || !/^https:\/\//.test(sub.endpoint) || !sub.keys?.p256dh || !sub.keys?.auth) return json({ error: '구독 정보가 올바르지 않습니다' }, 400)
      const { error } = await admin.from('mal_push').upsert(
        { user_id: me.id, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth }, { onConflict: 'endpoint' })
      if (error) throw error
      return json({ ok: true })
    }
    if (body.action === 'unsubscribe') {
      await admin.from('mal_push').delete().eq('user_id', me.id).eq('endpoint', String(body.endpoint ?? ''))
      return json({ ok: true })
    }
    if (body.action === 'test') {
      const list = active(me)
      const payload = list.length ? payloadFor(list[me.cursor % list.length])
        : { title: '말씀 알림', body: '알림이 잘 옵니다. 목록에 글을 넣으면 정한 간격으로 이렇게 보내 드립니다.', kind: 'verse', id: '' }
      return json({ ok: true, ...(await sendTo(me.id, payload, String(body.endpoint ?? ''))) })
    }
    return json({ error: '알 수 없는 요청입니다' }, 400)
  } catch (e) {
    console.error('mal-notify', e)
    return json({ error: '처리하지 못했습니다' }, 500)
  }
})
