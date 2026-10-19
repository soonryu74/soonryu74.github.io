// 목장 나눔터 — 목사님 휴대전화 알림 (Supabase Edge Function: church-notify, verify_jwt=false)
//  · submitted : 목자가 일기를 제출하면 같은 교회 목사들의 기기로 웹 푸시를 보낸다
//  · commented : 목사가 일기에 말씀을 남기면 그 목장 목자의 기기로 웹 푸시를 보낸다
//  · test      : 지금 로그인한 사람의 기기로 시험 알림을 보낸다
// 비밀값: VAPID_PRIVATE_KEY, VAPID_PUBLIC_KEY (선택: VAPID_SUBJECT)
//   함수 비밀값이 없으면 church_secret 표(서버 전용, RLS 정책 없음)에서 읽고,
//   거기도 없으면 처음 한 번 서버에서 만들어 둔다 (비밀키는 서버 밖으로 나가지 않는다)
//  · key       : 화면이 구독할 때 쓰는 공개키를 돌려준다
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' },
  })

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

const VAPID = {
  subject: Deno.env.get('VAPID_SUBJECT') ?? 'https://mokjang.github.io/',
  publicKey: Deno.env.get('VAPID_PUBLIC_KEY') ?? '',
  privateKey: Deno.env.get('VAPID_PRIVATE_KEY') ?? '',
}
async function loadVapid() {
  if (VAPID.publicKey && VAPID.privateKey) return
  const { data } = await admin.from('church_secret').select('name, value')
    .in('name', ['VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY'])
  for (const r of data ?? []) {
    if (r.name === 'VAPID_PUBLIC_KEY') VAPID.publicKey = r.value
    if (r.name === 'VAPID_PRIVATE_KEY') VAPID.privateKey = r.value
  }
  if (VAPID.publicKey && VAPID.privateKey) return
  const k = webpush.generateVAPIDKeys()
  // 동시에 두 번 만들어도 먼저 들어간 짝만 남도록 한 번에 넣고 다시 읽는다
  await admin.from('church_secret').upsert([
    { name: 'VAPID_PUBLIC_KEY', value: k.publicKey },
    { name: 'VAPID_PRIVATE_KEY', value: k.privateKey },
  ], { onConflict: 'name', ignoreDuplicates: true })
  VAPID.publicKey = ''; VAPID.privateKey = ''
  const { data: again } = await admin.from('church_secret').select('name, value')
    .in('name', ['VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY'])
  for (const r of again ?? []) {
    if (r.name === 'VAPID_PUBLIC_KEY') VAPID.publicKey = r.value
    if (r.name === 'VAPID_PRIVATE_KEY') VAPID.privateKey = r.value
  }
}
const RESEND_AFTER_MIN = 60 // 같은 일기를 다시 제출해도 이 시간 안에는 한 번만 알린다

type Payload = { title: string; body: string; url: string; tag?: string }
type Sub = { id: string; endpoint: string; p256dh: string; auth: string }

// 암호화·서명은 라이브러리에 맡기고, 보내기는 fetch로 직접 한다
async function push(sub: Sub, payload: Payload) {
  const req = webpush.generateRequestDetails(
    { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
    JSON.stringify(payload),
    { vapidDetails: VAPID, TTL: 60 * 60 * 24, urgency: 'normal' },
  )
  const res = await fetch(req.endpoint, { method: req.method, headers: req.headers, body: req.body })
  // 404·410 = 그 기기는 구독을 끊었다 → 지운다
  if (res.status === 404 || res.status === 410) await admin.from('church_push').delete().eq('id', sub.id)
  return res.status
}

// 기기마다 고른 화면 언어로 보낸다 (payload: 언어 → 알림 글)
async function sendTo(userIds: string[], payload: (lang: string) => Payload) {
  if (!userIds.length) return { sent: 0, devices: 0 }
  const { data: subs } = await admin.from('church_push')
    .select('id, endpoint, p256dh, auth, lang').in('user_id', userIds)
  const results = await Promise.allSettled((subs ?? []).map((s) => push(s as Sub, payload((s as { lang?: string }).lang ?? 'ko'))))
  const sent = results.filter((r) => r.status === 'fulfilled' && r.value >= 200 && r.value < 300).length
  results.forEach((r) => { if (r.status === 'rejected') console.error('push', String(r.reason).slice(0, 200)) })
  return { sent, devices: subs?.length ?? 0 }
}

// 교회마다 부르는 말 (목장·목자 → 다락방·순장 …)
async function churchTerms(churchId: string) {
  const { data } = await admin.from('church_church').select('terms').eq('id', churchId).maybeSingle()
  const t = (data?.terms ?? {}) as Record<string, string>
  const ok = (v: unknown, d: string) => typeof v === 'string' && /^[가-힣A-Za-z0-9 ]{1,8}$/.test(v.trim()) ? v.trim() : d
  return { unit: ok(t.unit, '목장'), leader: ok(t.leader, '목자') }
}

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
function weekLabel(weekStart: string, lang = 'ko') {
  const d = new Date(weekStart + 'T00:00:00Z')
  if (lang === 'en') return `Week of ${MON[d.getUTCMonth()]} ${d.getUTCDate()}`
  return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일 주`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'POST만 받습니다' }, 405)
  await loadVapid()
  if (!VAPID.publicKey || !VAPID.privateKey) return json({ error: '알림 키가 설정되지 않았습니다' }, 500)

  let body: Record<string, string>
  try { body = await req.json() } catch { return json({ error: '요청을 읽지 못했습니다' }, 400) }
  if (body.action === 'key') return json({ publicKey: VAPID.publicKey })

  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  const { data: u } = token ? await admin.auth.getUser(token) : { data: null }
  if (!u?.user) return json({ error: '로그인이 필요합니다' }, 401)
  const uid = u.user.id

  try {
    if (body.action === 'test') {
      const { data: pf } = await admin.from('church_profile').select('church_id, role').eq('id', uid).maybeSingle()
      const tm = pf?.church_id ? await churchTerms(pf.church_id) : { unit: '목장', leader: '목자' }
      const pastor = pf?.role === 'pastor'
      const r = await sendTo([uid], (lang) => lang === 'en'
        ? { title: 'Mokjang Sharing', body: pastor ? "Alerts are working. You'll be notified like this when a leader submits a journal."
            : "Alerts are working. You'll be notified like this when your pastor leaves a note.", url: pastor ? 'moksa.html' : 'mokjang.html', tag: 'test' }
        : { title: `${tm.unit} 나눔터`, body: pastor ? `알림이 잘 옵니다. ${tm.leader}님이 일기를 올리면 이렇게 알려 드립니다.`
            : '알림이 잘 옵니다. 목사님이 말씀을 남기시면 이렇게 알려 드립니다.', url: pastor ? 'moksa.html' : 'mokjang.html', tag: 'test' })
      return json({ ok: true, ...r })
    }

    if (body.action === 'submitted') {
      const { data: j } = await admin.from('church_journal')
        .select('id, mokjang_id, week_start, status, notified_at').eq('id', String(body.journal_id ?? '')).maybeSingle()
      if (!j) return json({ error: '일기를 찾지 못했습니다' }, 404)
      const { data: mj } = await admin.from('church_mokjang')
        .select('id, name, mokja_id, mokja_name, church_id').eq('id', j.mokjang_id).maybeSingle()
      // 그 목장 목자 본인만 알림을 보낼 수 있다
      if (!mj || mj.mokja_id !== uid) return json({ error: '내 목장 일기가 아닙니다' }, 403)
      if (j.status !== 'submitted') return json({ ok: true, skipped: 'not-submitted' })
      if (j.notified_at && Date.now() - new Date(j.notified_at).getTime() < RESEND_AFTER_MIN * 60000) {
        return json({ ok: true, skipped: 'recent' })
      }
      await admin.from('church_journal').update({ notified_at: new Date().toISOString() }).eq('id', j.id)

      const { data: pastors } = await admin.from('church_profile')
        .select('id').eq('church_id', mj.church_id).eq('role', 'pastor')
      const tm = await churchTerms(mj.church_id)
      const r = await sendTo((pastors ?? []).map((p) => p.id), (lang) => ({
        title: lang === 'en' ? `New journal: ${mj.name}` : `${mj.name} 일기가 올라왔습니다`,
        body: lang === 'en' ? `${mj.mokja_name} · ${weekLabel(j.week_start, 'en')}` : `${mj.mokja_name} ${tm.leader} · ${weekLabel(j.week_start)}`,
        url: `moksa.html#j=${j.id}`,
        tag: `j-${j.id}`,
      }))
      return json({ ok: true, ...r })
    }

    if (body.action === 'commented') {
      const { data: c } = await admin.from('church_comment')
        .select('id, journal_id, author_id, author_name, body').eq('id', String(body.comment_id ?? '')).maybeSingle()
      if (!c) return json({ error: '말씀을 찾지 못했습니다' }, 404)
      if (c.author_id !== uid) return json({ error: '내가 남긴 말씀이 아닙니다' }, 403)   // 남긴 사람만 알림을 보낼 수 있다
      const { data: j } = await admin.from('church_journal').select('id, mokjang_id, week_start').eq('id', c.journal_id).maybeSingle()
      const { data: mj } = j ? await admin.from('church_mokjang').select('id, name, mokja_id, church_id').eq('id', j.mokjang_id).maybeSingle() : { data: null }
      const { data: me } = await admin.from('church_profile').select('church_id, role').eq('id', uid).maybeSingle()
      if (!j || !mj || !me || me.role !== 'pastor' || me.church_id !== mj.church_id) return json({ error: '우리 교회 일기가 아닙니다' }, 403)
      if (!mj.mokja_id) return json({ ok: true, sent: 0, devices: 0 })
      const text = String(c.body ?? '').replace(/\s+/g, ' ').trim()
      const short = text.length > 60 ? text.slice(0, 60) + '…' : text
      const r = await sendTo([mj.mokja_id], (lang) => ({
        title: lang === 'en' ? `A note from ${c.author_name}` : `${c.author_name}님이 말씀을 남기셨습니다`,
        body: lang === 'en' ? `${weekLabel(j.week_start, 'en')} · ${short}` : `${weekLabel(j.week_start)} · ${short}`,
        url: `mokjang.html#j=${j.id}`,
        tag: `c-${c.id}`,
      }))
      return json({ ok: true, ...r })
    }

    return json({ error: '알 수 없는 요청입니다' }, 400)
  } catch (e) {
    console.error('notify', e)
    return json({ error: '알림을 보내지 못했습니다' }, 500)
  }
})
