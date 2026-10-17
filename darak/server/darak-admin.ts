// 다락방 나눔터 — 순장 스스로 가입 (Supabase Edge Function: darak-admin, verify_jwt=false)
// 목장 나눔터(church-admin)와 따로 둔 함수. 같은 데이터베이스(교회·계정·다락방)를 쓴다.
//  · join_mokja    : (로그인 전) 교회 가입 코드로 순장이 스스로 계정 + 다락방을 만든다
//  · join_code_get / join_code_new / join_code_off : 목사가 가입 코드를 보기 / 새로 만들기 / 끄기
//  · start_solo    : (로그인 전) 코드 없이 순장 혼자 시작 — 목사님 없는 '나만의 다락방'(features.solo)을 만든다
//  · link_church   : 혼자 쓰던 순장이 교회 가입 코드로 그 교회에 연결 — 다락방·순원·일기를 그대로 옮긴다
//  · delete_solo   : 혼자 쓰던 순장 탈퇴 — 계정과 나만의 다락방 기록을 함께 지운다
//  순장은 아이디·비밀번호 없이 쓴다: 가입하면 그 기기에서는 계속 열리고, 다른 기기·로그아웃 뒤에는 '열쇠 코드'로 들어온다
//  · key_login     : (로그인 전) 열쇠 코드로 들어가기 — 그때마다 새 임시 비밀번호를 정해 화면이 바로 로그인한다
//  · new_key       : 순장이 자기 열쇠 코드를 새로 받는다 (예전 코드는 못 쓰게 된다)
//  · leader_new_key: 목사가 우리 교회 순장의 열쇠 코드를 새로 만들어 준다 (기기를 잃었을 때)
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

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

const DOMAIN = 'gajeong.local'
const emailOf = (id: string) => `${id}@${DOMAIN}`

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

type Me = { id: string; role: string; church_id: string; solo: boolean }

async function callerProfile(req: Request): Promise<Me | null> {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!token) return null
  const { data, error } = await admin.auth.getUser(token)
  if (error || !data?.user) return null
  const { data: profile } = await admin
    .from('church_profile').select('id, role, church_id').eq('id', data.user.id).maybeSingle()
  if (!profile) return null
  const { data: ch } = await admin.from('church_church').select('features').eq('id', profile.church_id).maybeSingle()
  return { ...(profile as Omit<Me, 'solo'>), solo: !!(ch?.features as Record<string, unknown> | null)?.solo }
}

function validTimezone(tz: string) {
  try { new Intl.DateTimeFormat('en', { timeZone: tz }); return true } catch { return false }
}
function randomSlug() {
  const a = 'abcdefghjkmnpqrstuvwxyz23456789'
  let s = ''
  for (const b of crypto.getRandomValues(new Uint8Array(6))) s += a[b % a.length]
  return s
}
async function sha(text: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('')
}
// 열쇠 코드: 12자 (XXXX-XXXX-XXXX). 해시만 저장하고, 코드만으로 사람을 찾는다 (31^12 가지라 맞혀 볼 수 없다)
async function issueKey(userId: string) {
  const a = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  for (let i = 0; i < 5; i++) {
    let raw = ''
    for (const b of crypto.getRandomValues(new Uint8Array(12))) raw += a[b % a.length]
    const { error } = await admin.from('church_key')
      .upsert({ user_id: userId, code_hash: await sha('key:' + raw), created_at: new Date().toISOString() })
    if (!error) return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8)}`
  }
  throw new Error('열쇠 코드를 만들지 못했습니다')
}
function randomText(n: number, a = 'abcdefghijkmnpqrstuvwxyz23456789') {
  let s = ''
  for (const b of crypto.getRandomValues(new Uint8Array(n))) s += a[b % a.length]
  return s
}
// 비밀번호 없는 순장 계정 — 아이디는 k_로 시작하는 임의 글자, 비밀번호도 임의 (화면이 바로 로그인하는 데만 쓴다)
async function makeKeyless(name: string) {
  for (let i = 0; i < 5; i++) {
    const login_id = 'k_' + randomText(10), password = randomText(32)
    const { data, error } = await admin.auth.admin.createUser({
      email: emailOf(login_id), password, email_confirm: true, user_metadata: { login_id, name, keyless: true },
    })
    if (!error) return { user_id: data.user.id as string, login_id, password }
    if (!/already|registered|exists/i.test(error.message)) throw new Error(error.message)
  }
  throw new Error('계정을 만들지 못했습니다')
}

async function churchByCode(code: string) {
  const raw = normCode(code)
  if (raw.length !== 8) return null
  const { data } = await admin.from('church_join').select('church_id').eq('code', raw).maybeSingle()
  return (data?.church_id as string | undefined) ?? null
}

// 가입 코드: 헷갈리는 글자(0/O, 1/I/L)를 뺀 8자 (XXXX-XXXX). 맞춰 볼 때는 글자만 비교한다
const normCode = (c: string) => c.toUpperCase().replace(/[^A-Z0-9]/g, '')
function newJoinCode() {
  const a = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  let raw = ''
  for (const b of crypto.getRandomValues(new Uint8Array(8))) raw += a[b % a.length]
  return raw
}
const showJoin = (raw: string) => `${raw.slice(0, 4)}-${raw.slice(4)}`

// 교회가 부르는 말 — 새 다락방 이름 기본값에 쓴다 (정하지 않았으면 '다락방')
async function unitOf(church_id: string) {
  const { data } = await admin.from('church_church').select('terms').eq('id', church_id).maybeSingle()
  const u = (data?.terms as Record<string, string> | null)?.unit
  return typeof u === 'string' && /^[가-힣A-Za-z0-9 ]{1,8}$/.test(u) ? u : '다락방'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'POST만 받습니다' }, 405)

  let body: Record<string, string>
  try { body = await req.json() } catch { return json({ error: '요청을 읽지 못했습니다' }, 400) }

  const action = String(body.action ?? '')
  const name = String(body.name ?? '').trim()

  try {
    // ── 순장 스스로 가입 (로그인 전) — 목사님이 알려 준 가입 코드가 있어야 한다 ──
    if (action === 'join_mokja') {
      if (!name) return json({ error: '이름을 적어 주세요' }, 400)
      const cid = await churchByCode(String(body.join_code ?? ''))
      if (!cid) return json({ error: '가입 코드가 맞지 않습니다. 목사님께 다시 물어봐 주세요' }, 403)
      const acc = await makeKeyless(name)
      try {
        const { error: pe } = await admin.from('church_profile')
          .insert({ id: acc.user_id, login_id: acc.login_id, name, role: 'mokja', church_id: cid })
        if (pe) throw new Error(pe.message)
        const { error: mje } = await admin.from('church_mokjang').insert({
          name: String(body.mokjang_name ?? '').trim() || `${name} ${await unitOf(cid)}`,
          mokja_id: acc.user_id, mokja_name: name, church_id: cid,
        })
        if (mje) throw new Error(mje.message)
      } catch (e) { await admin.auth.admin.deleteUser(acc.user_id); throw e }
      const { data: ch } = await admin.from('church_church').select('slug').eq('id', cid).single()
      return json({ ok: true, slug: ch?.slug, login_id: acc.login_id, password: acc.password, key: await issueKey(acc.user_id) })
    }

    // ── 열쇠 코드로 들어가기 (로그인 전) ──
    if (action === 'key_login') {
      const raw = normCode(String(body.key ?? ''))
      const { data: k } = raw.length === 12
        ? await admin.from('church_key').select('user_id').eq('code_hash', await sha('key:' + raw)).maybeSingle() : { data: null }
      if (!k) return json({ error: '열쇠 코드가 맞지 않습니다' }, 403)
      const { data: pf } = await admin.from('church_profile').select('login_id').eq('id', k.user_id).maybeSingle()
      if (!pf) return json({ error: '계정을 찾지 못했습니다' }, 404)
      const pw = randomText(32)
      const { error } = await admin.auth.admin.updateUserById(k.user_id, { password: pw })
      if (error) throw new Error(error.message)
      return json({ ok: true, login_id: pf.login_id, password: pw })
    }

    // ── 코드 없이 순장 혼자 시작 (로그인 전) ──
    if (action === 'start_solo') {
      if (!name) return json({ error: '이름을 적어 주세요' }, 400)
      const tz = String(body.timezone ?? '').trim() || 'Australia/Melbourne'
      const mjName = String(body.mokjang_name ?? '').trim() || `${name} 다락방`
      let church: { id: string; slug: string } | null = null
      for (let i = 0; i < 5 && !church; i++) {
        const { data, error } = await admin.from('church_church').insert({
          slug: randomSlug(), name: mjName, timezone: validTimezone(tz) ? tz : 'Australia/Melbourne',
          terms: { unit: '다락방', leader: '순장', member: '순원' }, features: { solo: true },
        }).select('id, slug').single()
        if (!error) church = data
      }
      if (!church) throw new Error('다락방을 만들지 못했습니다')
      let userId = '', acc = { user_id: '', login_id: '', password: '' }
      try {
        acc = await makeKeyless(name)
        userId = acc.user_id
        const { error: pe } = await admin.from('church_profile')
          .insert({ id: userId, login_id: acc.login_id, name, role: 'mokja', church_id: church.id })
        if (pe) throw new Error(pe.message)
        const { error: mje } = await admin.from('church_mokjang')
          .insert({ name: mjName, mokja_id: userId, mokja_name: name, church_id: church.id })
        if (mje) throw new Error(mje.message)
      } catch (e) {
        if (userId) await admin.auth.admin.deleteUser(userId)
        await admin.from('church_church').delete().eq('id', church.id)
        throw e
      }
      return json({ ok: true, slug: church.slug, login_id: acc.login_id, password: acc.password, key: await issueKey(userId) })
    }

    const me = await callerProfile(req)
    if (!me) return json({ error: '로그인이 필요합니다' }, 401)

    // ── 내 열쇠 코드 새로 받기 (비밀번호 없이 쓰는 순장) ──
    if (action === 'new_key') {
      if (me.role !== 'mokja') return json({ error: '순장 계정만 쓸 수 있습니다' }, 400)
      return json({ ok: true, key: await issueKey(me.id) })
    }

    // ── 혼자 쓰던 순장 → 교회에 연결 (다락방·순원·일기를 그대로 옮긴다) ──
    if (action === 'link_church') {
      if (me.role !== 'mokja' || !me.solo) return json({ error: '혼자 쓰는 순장 계정만 연결할 수 있습니다' }, 400)
      const target = await churchByCode(String(body.join_code ?? ''))
      if (!target) return json({ error: '가입 코드가 맞지 않습니다. 목사님께 다시 물어봐 주세요' }, 403)
      if (target === me.church_id) return json({ error: '이미 이 교회에 있습니다' }, 400)
      const { error: e1 } = await admin.from('church_mokjang').update({ church_id: target }).eq('church_id', me.church_id)
      if (e1) throw new Error(e1.message)
      const { error: e2 } = await admin.from('church_profile').update({ church_id: target }).eq('id', me.id)
      if (e2) throw new Error(e2.message)
      await admin.from('church_church').delete().eq('id', me.church_id)   // 비어 있는 나만의 다락방 자리
      const { data: ch } = await admin.from('church_church').select('slug, name').eq('id', target).single()
      return json({ ok: true, slug: ch?.slug, name: ch?.name })
    }

    // ── 혼자 쓰던 순장 탈퇴 — 계정 + 나만의 다락방 기록을 함께 지운다 ──
    if (action === 'delete_solo') {
      if (me.role !== 'mokja' || !me.solo) return json({ error: '혼자 쓰는 순장 계정이 아닙니다' }, 400)
      const { error } = await admin.auth.admin.deleteUser(me.id)
      if (error) throw new Error(error.message)
      await admin.from('church_church').delete().eq('id', me.church_id)   // 다락방·순원·일기도 함께 지워진다
      return json({ ok: true })
    }

    // ── 아래부터는 로그인한 목사만 ──
    if (me.role !== 'pastor' || !me.church_id) return json({ error: '목사 계정만 쓸 수 있습니다' }, 403)

    // ── 목사가 우리 교회 순장의 열쇠 코드를 새로 만들어 준다 ──
    if (action === 'leader_new_key') {
      const uid = String(body.user_id ?? '')
      const { data: t } = await admin.from('church_profile').select('id, role, church_id').eq('id', uid).maybeSingle()
      if (!t || t.church_id !== me.church_id || t.role !== 'mokja') return json({ error: '우리 교회 순장이 아닙니다' }, 403)
      return json({ ok: true, key: await issueKey(uid) })
    }

    if (action === 'join_code_get') {
      const { data } = await admin.from('church_join').select('code').eq('church_id', me.church_id).maybeSingle()
      return json({ ok: true, code: data ? showJoin(data.code) : null })
    }
    if (action === 'join_code_new') {
      for (let i = 0; i < 5; i++) {
        const raw = newJoinCode()
        const { error } = await admin.from('church_join')
          .upsert({ church_id: me.church_id, code: raw, created_at: new Date().toISOString() })
        if (!error) return json({ ok: true, code: showJoin(raw) })
      }
      throw new Error('가입 코드를 만들지 못했습니다')
    }
    if (action === 'join_code_off') {
      const { error } = await admin.from('church_join').delete().eq('church_id', me.church_id)
      if (error) throw new Error(error.message)
      return json({ ok: true })
    }

    return json({ error: '알 수 없는 요청입니다' }, 400)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    const dup = /already|duplicate|registered|exists/i.test(msg)
    return json({ error: dup ? '이미 쓰고 있는 아이디입니다. 다른 아이디를 골라 주세요' : msg }, dup ? 409 : 500)
  }
})
