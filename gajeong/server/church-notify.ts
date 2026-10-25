// 목장 나눔터 — 목사님 휴대전화 알림 (Supabase Edge Function: church-notify, verify_jwt=false)
//  · submitted : 목자가 일기를 제출하면 같은 교회 목사들의 기기로 웹 푸시를 보낸다
//  · commented : 목사가 일기에 말씀을 남기면 그 목장 목자의 기기로 웹 푸시를 보낸다
//  · test      : 지금 로그인한 사람의 기기로 시험 알림을 보낸다
//  · 알림마다 보낸 사람 사진(icon)을 함께 보낸다 (7일짜리 주소)
//  · notice    : 목사님 공지를 올리거나(제목·내용·기간 until) 내리고(clear), 목자들에게 알림을 보낸다
//  · remind    : 목사가 [제출 안 한 목장에 알림 보내기]를 누르면, 그 주 일기를 제출하지 않은 목자에게 보낸다
//  · encourage : 목사가 고른 목장(출석 통계 '안 모인 목장')의 목자에게 격려 글을 보낸다
//  · set_deadline : 목사가 마감 알림 요일·시각을 정한다 (features.deadline = { dow, hour } 또는 false)
//  · deadline_tick: (로그인 없이, GitHub Actions가 30분마다) 교회마다 마감 시각이 지났으면 제출 안 한 목자에게 한 번 보낸다
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
  subject: Deno.env.get('VAPID_SUBJECT') ?? 'https://mokjang.app/',
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

type Payload = { title: string; body: string; url: string; tag?: string; icon?: string }
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
// endpoint를 주면 그 기기 하나에만 (시험 알림이 '지금 이 휴대폰'으로 가는지 확인할 때)
async function sendTo(userIds: string[], payload: (lang: string) => Payload, endpoint = '') {
  if (!userIds.length) return { sent: 0, devices: 0 }
  let q = admin.from('church_push').select('id, endpoint, p256dh, auth, lang').in('user_id', userIds)
  if (endpoint) q = q.eq('endpoint', endpoint)
  const { data: subs } = await q
  const results = await Promise.allSettled((subs ?? []).map((s) => push(s as Sub, payload((s as { lang?: string }).lang ?? 'ko'))))
  const sent = results.filter((r) => r.status === 'fulfilled' && r.value >= 200 && r.value < 300).length
  results.forEach((r) => { if (r.status === 'rejected') console.error('push', String(r.reason).slice(0, 200)) })
  const codes = results.map((r) => r.status === 'fulfilled' ? r.value : 0)
  return { sent, devices: subs?.length ?? 0, codes }
}

// 보낸 사람 사진 (알림 옆에 얼굴이 보이게) — 사진이 없으면 빈칸 → 화면은 앱 아이콘을 쓴다
async function photoIcon(userId: string) {
  const { data: p } = await admin.from('church_profile').select('photo_path').eq('id', userId).maybeSingle()
  if (!p?.photo_path) return ''
  const { data } = await admin.storage.from('church-member-photo').createSignedUrl(p.photo_path, 60 * 60 * 24 * 7)
  return data?.signedUrl ?? ''
}

// 교회마다 부르는 말 (목장·목자 → 다락방·순장 …)
async function churchTerms(churchId: string) {
  const { data } = await admin.from('church_church').select('terms').eq('id', churchId).maybeSingle()
  const t = (data?.terms ?? {}) as Record<string, string>
  const ok = (v: unknown, d: string) => typeof v === 'string' && /^[가-힣A-Za-z0-9 ]{1,8}$/.test(v.trim()) ? v.trim() : d
  return { unit: ok(t.unit, '목장'), leader: ok(t.leader, '목자') }
}

// ── 마감 알림 ─────────────────────────────────────────
// 기본은 토요일 저녁 8시 (교회 시간대). 일·월요일로 정하면 지난주 일기를 챙긴다(목자 화면도 그때 지난주를 먼저 연다)
const DEFAULT_DEADLINE = { dow: 6, hour: 20 }
type Deadline = { dow: number; hour: number }
const YMD_RE = /^\d{4}-\d{2}-\d{2}$/
function addDays(ymd: string, n: number) {
  const d = new Date(ymd + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10)
}
// 그 교회 시간대의 지금: 날짜·요일(0=일)·시
function localNow(tz: string) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23', weekday: 'short',
  }).formatToParts(new Date()).map((p) => [p.type, p.value]))
  const ymd = `${parts.year}-${parts.month}-${parts.day}`
  return { ymd, dow: new Date(ymd + 'T00:00:00Z').getUTCDay(), hour: Number(parts.hour) % 24 }
}
function deadlineOf(features: Record<string, unknown> | null): Deadline | null {
  const d = features?.deadline
  if (d === false) return null
  if (d && typeof d === 'object' && Number.isInteger((d as Deadline).dow) && Number.isInteger((d as Deadline).hour)) return d as Deadline
  return DEFAULT_DEADLINE
}
// 그 주(주일 시작) 일기를 제출하지 않은 목장의 목자들 — 예전(월요일 시작)에 저장된 일기도 함께 본다
async function notSubmitted(churchId: string, week: string) {
  const { data: mjs } = await admin.from('church_mokjang').select('id, name, mokja_id, mokja_name')
    .eq('church_id', churchId).eq('active', true).not('mokja_id', 'is', null)
  if (!mjs?.length) return []
  const { data: js } = await admin.from('church_journal').select('mokjang_id')
    .in('mokjang_id', mjs.map((m) => m.id)).in('week_start', [week, addDays(week, 1)]).eq('status', 'submitted')
  const done = new Set((js ?? []).map((j) => j.mokjang_id))
  return mjs.filter((m) => !done.has(m.id))
}
async function remindWeek(churchId: string, week: string, fromPastor: boolean, icon = '') {
  const left = await notSubmitted(churchId, week)
  const ids = [...new Set(left.map((m) => m.mokja_id as string))]
  if (!ids.length) return { leaders: 0, reached: 0, sent: 0, devices: 0, noDevice: [] as string[] }
  const { data: subs } = await admin.from('church_push').select('user_id').in('user_id', ids)
  const has = new Set((subs ?? []).map((s) => s.user_id))
  const tm = await churchTerms(churchId)
  const r = await sendTo(ids, (lang) => lang === 'en'
    ? { title: fromPastor ? 'Your pastor is waiting for your journal' : 'Journal reminder',
        body: `${weekLabel(week, 'en')} · Your journal hasn't been submitted yet. Please share your gathering and prayer requests.`,
        url: 'mokjang.html', tag: `remind-${week}`, icon }
    : { title: fromPastor ? `목사님이 ${tm.unit} 일기를 기다리십니다` : `${tm.unit} 일기 마감 알림`,
        body: `${weekLabel(week)} 일기를 아직 제출하지 않으셨어요. 모임 이야기와 기도제목을 올려 주세요.`,
        url: 'mokjang.html', tag: `remind-${week}`, icon })
  return { leaders: ids.length, reached: ids.filter((i) => has.has(i)).length, ...r,
    noDevice: left.filter((m) => !has.has(m.mokja_id)).map((m) => m.mokja_name || m.name) }
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

  // 마감 알림: 로그인 없이 불러도 '마감이 지났고 이번 주에 아직 안 보냈을 때'만 보낸다
  if (body.action === 'deadline_tick') {
    try {
      const { data: chs } = await admin.from('church_church').select('id, timezone, features')
      const done: Record<string, unknown>[] = []
      for (const ch of chs ?? []) {
        const f = (ch.features ?? {}) as Record<string, unknown>
        if (f.solo) continue
        const dl = deadlineOf(f); if (!dl) continue
        let now: ReturnType<typeof localNow>; try { now = localNow(ch.timezone || 'Australia/Melbourne') } catch { continue }
        if (now.dow !== dl.dow || now.hour < dl.hour) continue
        const sunday = addDays(now.ymd, -now.dow)
        const week = now.dow >= 2 ? sunday : addDays(sunday, -7)
        if (f.deadline_sent === week) continue
        await admin.from('church_church').update({ features: { ...f, deadline_sent: week } }).eq('id', ch.id)   // 먼저 적어 두어 두 번 보내지 않게
        const r = await remindWeek(ch.id, week, false)
        done.push({ church: ch.id, week, leaders: r.leaders, sent: r.sent })
      }
      return json({ ok: true, done })
    } catch (e) {
      console.error('deadline', e)
      return json({ error: '마감 알림을 보내지 못했습니다' }, 500)
    }
  }

  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  const { data: u } = token ? await admin.auth.getUser(token) : { data: null }
  if (!u?.user) return json({ error: '로그인이 필요합니다' }, 401)
  const uid = u.user.id

  try {
    if (body.action === 'test') {
      const { data: pf } = await admin.from('church_profile').select('church_id, role').eq('id', uid).maybeSingle()
      const tm = pf?.church_id ? await churchTerms(pf.church_id) : { unit: '목장', leader: '목자' }
      const pastor = pf?.role === 'pastor'
      const icon = await photoIcon(uid)
      const r = await sendTo([uid], (lang) => lang === 'en'
        ? { title: 'Mokjang Sharing', body: pastor ? "Alerts are working. You'll be notified like this when a leader submits a journal."
            : "Alerts are working. You'll be notified like this when your pastor leaves a note.", url: pastor ? 'moksa.html' : 'mokjang.html', tag: 'test', icon }
        : { title: `${tm.unit} 나눔터`, body: pastor ? `알림이 잘 옵니다. ${tm.leader}님이 일기를 올리면 이렇게 알려 드립니다.`
            : '알림이 잘 옵니다. 목사님이 말씀을 남기시면 이렇게 알려 드립니다.', url: pastor ? 'moksa.html' : 'mokjang.html', tag: 'test', icon },
        String(body.endpoint ?? ''))
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
      const icon = await photoIcon(uid)
      const r = await sendTo((pastors ?? []).map((p) => p.id), (lang) => ({
        title: lang === 'en' ? `New journal: ${mj.name}` : `${mj.name} 일기가 올라왔습니다`,
        body: lang === 'en' ? `${mj.mokja_name} · ${weekLabel(j.week_start, 'en')}` : `${mj.mokja_name} ${tm.leader} · ${weekLabel(j.week_start)}`,
        url: `moksa.html#j=${j.id}`,
        tag: `j-${j.id}`,
        icon,
      }))
      return json({ ok: true, ...r })
    }

    if (body.action === 'remind' || body.action === 'set_deadline') {
      const { data: me } = await admin.from('church_profile').select('church_id, role').eq('id', uid).maybeSingle()
      if (!me || me.role !== 'pastor' || !me.church_id) return json({ error: '목사 계정만 쓸 수 있습니다' }, 403)
      if (body.action === 'remind') {
        const week = String(body.week ?? '')
        if (!YMD_RE.test(week)) return json({ error: '주를 다시 골라 주세요' }, 400)
        return json({ ok: true, ...(await remindWeek(me.church_id, week, true, await photoIcon(uid))) })
      }
      const dow = Number(body.dow), hour = Number(body.hour)
      const { data: ch } = await admin.from('church_church').select('features').eq('id', me.church_id).maybeSingle()
      const f = (ch?.features ?? {}) as Record<string, unknown>
      const deadline = dow === -1 ? false
        : Number.isInteger(dow) && dow >= 0 && dow <= 6 && Number.isInteger(hour) && hour >= 0 && hour <= 23 ? { dow, hour } : null
      if (deadline === null) return json({ error: '요일과 시각을 다시 골라 주세요' }, 400)
      const { error } = await admin.from('church_church').update({ features: { ...f, deadline } }).eq('id', me.church_id)
      if (error) throw new Error(error.message)
      return json({ ok: true, deadline })
    }

    // 목사님 공지: 교회 features.notice 에 두고(목자가 앱을 열면 아래에서 올라온다) 목자들에게 알림도 보낸다
    if (body.action === 'notice') {
      const { data: me } = await admin.from('church_profile').select('church_id, role, name').eq('id', uid).maybeSingle()
      if (!me || me.role !== 'pastor' || !me.church_id) return json({ error: '목사 계정만 쓸 수 있습니다' }, 403)
      const { data: ch } = await admin.from('church_church').select('features').eq('id', me.church_id).maybeSingle()
      const f = (ch?.features ?? {}) as Record<string, unknown>
      if (body.clear) {
        const { error } = await admin.from('church_church').update({ features: { ...f, notice: null } }).eq('id', me.church_id)
        if (error) throw new Error(error.message)
        return json({ ok: true, notice: null })
      }
      const title = String(body.title ?? '').trim().slice(0, 60), text = String(body.body ?? '').trim().slice(0, 1000)
      if (!title || !text) return json({ error: '제목과 내용을 적어 주세요' }, 400)
      const nm = String(me.name ?? '').trim()
      // 띄우는 기간: 그날(교회 날짜)까지. 없거나 이상하면 1주일, 길어도 90일
      const day0 = new Date().toISOString().slice(0, 10), want = String(body.until ?? '')
      const until = YMD_RE.test(want) && want >= day0 ? (want > addDays(day0, 90) ? addDays(day0, 90) : want) : addDays(day0, 6)
      const notice = { id: crypto.randomUUID(), title, body: text, at: new Date().toISOString(), until, by: /목사/.test(nm) ? nm : nm ? `${nm} 목사` : '' }
      const { error } = await admin.from('church_church').update({ features: { ...f, notice } }).eq('id', me.church_id)
      if (error) throw new Error(error.message)
      const { data: leaders } = await admin.from('church_profile').select('id').eq('church_id', me.church_id).eq('role', 'mokja')
      const ids = (leaders ?? []).map((p) => p.id)
      const { data: subs } = ids.length ? await admin.from('church_push').select('user_id').in('user_id', ids) : { data: [] }
      const reached = new Set((subs ?? []).map((x) => x.user_id)).size
      const icon = await photoIcon(uid)
      const short = text.replace(/\s+/g, ' ').slice(0, 80)
      const r = await sendTo(ids, (lang) => ({ title: lang === 'en' ? `Notice: ${title}` : `공지: ${title}`, body: short, url: 'mokjang.html', tag: `notice-${notice.id}`, icon }))
      return json({ ok: true, notice, reached, ...r })
    }

    // 목사님 격려: 고른 목장의 목자에게 짧은 글을 알림으로 (출석 통계 '안 모인 목장'에서)
    if (body.action === 'encourage') {
      const { data: me } = await admin.from('church_profile').select('church_id, role, name').eq('id', uid).maybeSingle()
      if (!me || me.role !== 'pastor' || !me.church_id) return json({ error: '목사 계정만 쓸 수 있습니다' }, 403)
      const raw = (body as Record<string, unknown>).mokjang_ids
      const want = Array.isArray(raw) ? raw.map(String).slice(0, 200) : []
      const text = String(body.body ?? '').trim().slice(0, 500)
      if (!want.length || !text) return json({ error: '보낼 곳과 글을 적어 주세요' }, 400)
      const { data: mjs } = await admin.from('church_mokjang').select('id, name, mokja_id, mokja_name')
        .eq('church_id', me.church_id).in('id', want).not('mokja_id', 'is', null)
      const ids = [...new Set((mjs ?? []).map((m) => m.mokja_id as string))]
      if (!ids.length) return json({ ok: true, leaders: 0, reached: 0, sent: 0, devices: 0, noDevice: [] })
      const { data: subs } = await admin.from('church_push').select('user_id').in('user_id', ids)
      const has = new Set((subs ?? []).map((s) => s.user_id))
      const nm = String(me.name ?? '').trim(), by = /목사/.test(nm) ? nm : nm ? `${nm} 목사` : '목사'
      const icon = await photoIcon(uid)
      const short = text.replace(/\s+/g, ' ').slice(0, 120)
      const r = await sendTo(ids, (lang) => ({ title: lang === 'en' ? 'A word of encouragement from your pastor' : `${by}님의 격려`, body: short, url: 'mokjang.html', tag: `cheer-${Date.now()}`, icon }))
      return json({ ok: true, leaders: ids.length, reached: ids.filter((i) => has.has(i)).length, ...r,
        noDevice: (mjs ?? []).filter((m) => !has.has(m.mokja_id)).map((m) => m.mokja_name || m.name) })
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
      const icon = await photoIcon(uid)
      const r = await sendTo([mj.mokja_id], (lang) => ({
        title: lang === 'en' ? `A note from ${c.author_name}` : `${c.author_name}님이 말씀을 남기셨습니다`,
        body: lang === 'en' ? `${weekLabel(j.week_start, 'en')} · ${short}` : `${weekLabel(j.week_start)} · ${short}`,
        url: `mokjang.html#j=${j.id}`,
        tag: `c-${c.id}`,
        icon,
      }))
      return json({ ok: true, ...r })
    }

    return json({ error: '알 수 없는 요청입니다' }, 400)
  } catch (e) {
    console.error('notify', e)
    return json({ error: '알림을 보내지 못했습니다' }, 500)
  }
})
