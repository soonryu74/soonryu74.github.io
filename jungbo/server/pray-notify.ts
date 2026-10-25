// 중보기도 나눔터 — 휴대전화 알림 (Supabase Edge Function: pray-notify, verify_jwt=false)
// 로그인(JWT) 대신 열쇠 코드(token)로 사람을 찾는다. 열쇠 코드는 해시만 저장되어 있다 (schema.sql의 pray__hash와 같은 방식).
//  · key       : 화면이 구독할 때 쓰는 VAPID 공개키 (pray_secret 표 — 없으면 처음 한 번 서버에서 만들어 둔다)
//  · posted    : 기도제목을 올리면 같은 모임의 다른 분들에게 — 긴급이면 '🚨 긴급기도가 올라왔습니다', urgency high
//  · commented : 댓글을 남기면 글쓴이와 앞서 댓글 단 분들에게 (남긴 사람 제외)
//  · prayed    : [기도했어요]를 누르면 글쓴이에게 (같은 글은 알림 하나로 겹친다)
//  · answered  : '응답받았어요'로 바꾸면 모임 모두에게
//  · test      : 지금 이 기기로 시험 알림
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

const VAPID = {
  subject: Deno.env.get('VAPID_SUBJECT') ?? 'https://mokjang.app/',
  publicKey: Deno.env.get('VAPID_PUBLIC_KEY') ?? '',
  privateKey: Deno.env.get('VAPID_PRIVATE_KEY') ?? '',
}
async function readVapid() {
  const { data } = await admin.from('pray_secret').select('name, value').in('name', ['VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY'])
  for (const r of data ?? []) {
    if (r.name === 'VAPID_PUBLIC_KEY') VAPID.publicKey = r.value
    if (r.name === 'VAPID_PRIVATE_KEY') VAPID.privateKey = r.value
  }
}
async function loadVapid() {
  if (VAPID.publicKey && VAPID.privateKey) return
  await readVapid()
  if (VAPID.publicKey && VAPID.privateKey) return
  // 처음 한 번: 키를 만들어 둔다 (동시에 두 번 만들어도 먼저 들어간 짝만 남는다). 비밀키는 서버 밖으로 나가지 않는다
  const k = webpush.generateVAPIDKeys()
  await admin.from('pray_secret').upsert([
    { name: 'VAPID_PUBLIC_KEY', value: k.publicKey },
    { name: 'VAPID_PRIVATE_KEY', value: k.privateKey },
  ], { onConflict: 'name', ignoreDuplicates: true })
  VAPID.publicKey = ''; VAPID.privateKey = ''
  await readVapid()
}

// 열쇠 코드 → 해시 (대문자, 영문·숫자만 남기고 'pray:'를 앞에 붙여 SHA-256)
async function tokenHash(token: string) {
  const norm = String(token ?? '').replace(/[^A-Za-z0-9]/g, '').toUpperCase()
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('pray:' + norm))
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('')
}
type Me = { id: string; group_id: string; name: string; role: string }
async function whoami(token: string): Promise<Me | null> {
  if (!token) return null
  const { data } = await admin.from('pray_member').select('id, group_id, name, role')
    .eq('token_hash', await tokenHash(token)).eq('active', true).maybeSingle()
  return (data as Me | null) ?? null
}

type Payload = { title: string; body: string; url: string; tag?: string; urgent?: boolean }
type Sub = { id: string; endpoint: string; p256dh: string; auth: string }

async function push(sub: Sub, payload: Payload) {
  const req = webpush.generateRequestDetails(
    { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
    JSON.stringify(payload),
    { vapidDetails: VAPID, TTL: 60 * 60 * 24, urgency: payload.urgent ? 'high' : 'normal' },
  )
  const res = await fetch(req.endpoint, { method: req.method, headers: req.headers, body: req.body })
  if (res.status === 404 || res.status === 410) await admin.from('pray_push').delete().eq('id', sub.id)   // 구독을 끊은 기기
  return res.status
}
async function sendTo(memberIds: string[], payload: Payload, endpoint = '') {
  const ids = [...new Set(memberIds)].filter(Boolean)
  if (!ids.length) return { sent: 0, devices: 0, people: 0, codes: [] as number[] }
  let q = admin.from('pray_push').select('id, endpoint, p256dh, auth, member_id').in('member_id', ids)
  if (endpoint) q = q.eq('endpoint', endpoint)
  const { data: subs } = await q
  const results = await Promise.allSettled((subs ?? []).map((s) => push(s as Sub, payload)))
  const sent = results.filter((r) => r.status === 'fulfilled' && r.value >= 200 && r.value < 300).length
  results.forEach((r) => { if (r.status === 'rejected') console.error('push', String(r.reason).slice(0, 200)) })
  const codes = results.map((r) => r.status === 'fulfilled' ? r.value : 0)
  const people = new Set((subs ?? []).map((s) => (s as { member_id: string }).member_id)).size
  return { sent, devices: subs?.length ?? 0, people, codes }
}

// 모임의 다른 분들 (나 빼고)
async function others(groupId: string, exceptId: string) {
  const { data } = await admin.from('pray_member').select('id').eq('group_id', groupId).eq('active', true).neq('id', exceptId)
  return (data ?? []).map((m) => m.id as string)
}
// 이 글을 받아 볼 사람들: 공통(room_id 없음)이면 모임 전체, 방 글이면 그 방 식구. '인도자만'이면 전체 인도자 + 방 인도자. '나만'이면 아무도
async function audience(p: Post, exceptId: string) {
  if (p.visibility === 'private') return [] as string[]
  const { data: leaders } = await admin.from('pray_member').select('id').eq('group_id', p.group_id).eq('active', true).eq('role', 'leader')
  const leaderIds = (leaders ?? []).map((m) => m.id as string)
  let ids: string[]
  if (!p.room_id) ids = p.visibility === 'leaders' ? leaderIds : await others(p.group_id, '')
  else {
    const q = admin.from('pray_room_member').select('member_id, role').eq('room_id', p.room_id)
    const { data: rm } = p.visibility === 'leaders' ? await q.eq('role', 'leader') : await q
    const { data: active } = await admin.from('pray_member').select('id').eq('group_id', p.group_id).eq('active', true)
    const ok = new Set((active ?? []).map((m) => m.id as string))
    ids = (rm ?? []).map((x) => x.member_id as string).filter((id) => ok.has(id))
    if (p.visibility === 'leaders') ids = ids.concat(leaderIds)
  }
  return [...new Set(ids)].filter((id) => id !== exceptId)
}
// 알림마다 짧은 말씀 한 절 (날마다 바뀐다)
const VERSES = [
  '너희 짐을 서로 지라 (갈 6:2)', '쉬지 말고 기도하라 (살전 5:17)', '아무 것도 염려하지 말고 기도와 간구로 아뢰라 (빌 4:6)',
  '두세 사람이 내 이름으로 모인 곳에는 나도 그들 중에 있느니라 (마 18:20)', '내가 너희를 쉬게 하리라 (마 11:28)',
  '여호와는 마음이 상한 자를 가까이 하시고 (시 34:18)', '너희 염려를 다 주께 맡기라 (벧전 5:7)', '주의 말씀은 내 발에 등이요 (시 119:105)',
  '의인의 간구는 역사하는 힘이 큼이니라 (약 5:16)', '우는 자들과 함께 울라 (롬 12:15)', '나의 평안을 너희에게 주노라 (요 14:27)',
  '나의 도움은 천지를 지으신 여호와에게서로다 (시 121:2)', '그 중의 제일은 사랑이라 (고전 13:13)', '강하고 담대하라 (수 1:9)',
  '내게 부르짖으라 내가 네게 응답하겠고 (렘 33:3)', '여호와는 나의 목자시니 (시 23:1)',
]
function verse() { const d = new Date(); const n = Math.floor((d.getTime() - Date.UTC(d.getUTCFullYear(), 0, 0)) / 864e5); return VERSES[n % VERSES.length] }
const withVerse = (s: string) => `${s}\n✦ ${verse()}`
const short = (s: string, n = 90) => { const t = String(s ?? '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n) + '…' : t }

type Post = { id: string; group_id: string; author_id: string; author_name: string; kind: string; for_whom: string; body: string; status: string; answer_note: string; notified_at: string | null; room_id: string | null; visibility: string }
async function loadPost(id: string, groupId: string) {
  const { data } = await admin.from('pray_post').select('id, group_id, author_id, author_name, kind, for_whom, body, status, answer_note, notified_at, room_id, visibility')
    .eq('id', id).eq('group_id', groupId).maybeSingle()
  return (data as Post | null) ?? null
}
async function roomName(roomId: string | null) {
  if (!roomId) return ''
  const { data } = await admin.from('pray_room').select('name').eq('id', roomId).maybeSingle()
  return data?.name ?? ''
}
async function groupCode(groupId: string) {
  const { data } = await admin.from('pray_group').select('invite_code').eq('id', groupId).maybeSingle()
  return data?.invite_code ?? ''
}
// 알림을 누르면 열 주소: 모임 코드가 붙어 있어 새 기기에서도 그 모임으로 들어온다
const postUrl = (code: string, id: string) => `index.html?g=${encodeURIComponent(code)}#p=${id}`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'POST만 받습니다' }, 405)
  await loadVapid()
  if (!VAPID.publicKey || !VAPID.privateKey) return json({ error: '알림 키가 설정되지 않았습니다' }, 500)

  let body: Record<string, string>
  try { body = await req.json() } catch { return json({ error: '요청을 읽지 못했습니다' }, 400) }
  if (body.action === 'key') return json({ publicKey: VAPID.publicKey })

  const me = await whoami(String(body.token ?? ''))
  if (!me) return json({ error: '열쇠 코드가 맞지 않습니다' }, 401)

  try {
    if (body.action === 'test') {
      const r = await sendTo([me.id], { title: '중보기도 나눔터', body: withVerse('알림이 잘 옵니다. 긴급기도가 올라오면 이렇게 바로 알려 드립니다.'), url: 'index.html', tag: 'test' },
        String(body.endpoint ?? ''))
      return json({ ok: true, ...r })
    }

    if (body.action === 'posted') {
      const p = await loadPost(String(body.post_id ?? ''), me.group_id)
      if (!p) return json({ error: '글을 찾지 못했습니다' }, 404)
      if (p.author_id !== me.id && me.role !== 'leader') return json({ error: '내가 올린 글이 아닙니다' }, 403)
      // 같은 글은 10분 안에 한 번만 (다시 알리기는 10분 뒤부터)
      if (p.notified_at && Date.now() - new Date(p.notified_at).getTime() < 10 * 60000) return json({ ok: true, skipped: 'recent', sent: 0, people: 0 })
      await admin.from('pray_post').update({ notified_at: new Date().toISOString() }).eq('id', p.id)
      const urgent = p.kind === 'urgent'
      const code = await groupCode(p.group_id)
      const head = p.for_whom ? `${p.for_whom} · ` : ''
      const r = await sendTo(await audience(p, p.author_id), {
        title: (urgent ? '🚨 긴급기도가 올라왔습니다' : `${p.author_name}님의 기도제목`) + (p.room_id ? ` · ${await roomName(p.room_id)}` : ''),
        body: withVerse(urgent ? `${head}${short(p.body, 70)} — 지금 함께 기도해 주세요` : `${head}${short(p.body, 70)}`),
        url: postUrl(code, p.id), tag: `p-${p.id}`, urgent,
      })
      return json({ ok: true, ...r })
    }

    if (body.action === 'answered') {
      const p = await loadPost(String(body.post_id ?? ''), me.group_id)
      if (!p) return json({ error: '글을 찾지 못했습니다' }, 404)
      if (p.author_id !== me.id && me.role !== 'leader') return json({ error: '내가 올린 글이 아닙니다' }, 403)
      if (p.status !== 'answered') return json({ ok: true, skipped: 'not-answered', sent: 0 })
      const code = await groupCode(p.group_id)
      const r = await sendTo(await audience(p, me.id), {
        title: `🙌 기도 응답 — ${p.author_name}님`,
        body: withVerse(short(p.answer_note || p.body, 70)),
        url: postUrl(code, p.id), tag: `a-${p.id}`,
      })
      return json({ ok: true, ...r })
    }

    if (body.action === 'prayed') {
      const p = await loadPost(String(body.post_id ?? ''), me.group_id)
      if (!p) return json({ error: '글을 찾지 못했습니다' }, 404)
      if (p.author_id === me.id) return json({ ok: true, skipped: 'self', sent: 0 })
      const { data: pp } = await admin.from('pray_prayed').select('count').eq('post_id', p.id).eq('member_id', me.id).maybeSingle()
      if ((pp?.count ?? 1) > 1) return json({ ok: true, skipped: 'again', sent: 0 })   // 같은 사람이 또 눌러도 처음 한 번만 알린다
      const code = await groupCode(p.group_id)
      const r = await sendTo([p.author_id], {
        title: `${me.name}님이 기도했어요 🙏`,
        body: withVerse(short(p.for_whom ? `${p.for_whom} · ${p.body}` : p.body, 60)),
        url: postUrl(code, p.id), tag: `pr-${p.id}`,
      })
      return json({ ok: true, ...r })
    }

    if (body.action === 'commented') {
      const { data: c } = await admin.from('pray_comment').select('id, post_id, author_id, author_name, body').eq('id', String(body.comment_id ?? '')).maybeSingle()
      if (!c || c.author_id !== me.id) return json({ error: '내가 남긴 댓글이 아닙니다' }, 403)
      const p = await loadPost(c.post_id, me.group_id)
      if (!p) return json({ error: '글을 찾지 못했습니다' }, 404)
      const { data: cs } = await admin.from('pray_comment').select('author_id').eq('post_id', p.id)
      const aud = new Set([...(await audience(p, '')), p.author_id])
      const ids = [p.author_id, ...(cs ?? []).map((x) => x.author_id as string)].filter((id) => id !== me.id && aud.has(id))
      const code = await groupCode(p.group_id)
      const r = await sendTo(ids, {
        title: `${me.name}님의 댓글`,
        body: withVerse(`${p.for_whom ? p.for_whom + ' · ' : ''}${short(c.body, 70)}`),
        url: postUrl(code, p.id), tag: `c-${p.id}`,
      })
      return json({ ok: true, ...r })
    }

    return json({ error: '알 수 없는 요청입니다' }, 400)
  } catch (e) {
    console.error('pray-notify', e)
    return json({ error: '알림을 보내지 못했습니다' }, 500)
  }
})
