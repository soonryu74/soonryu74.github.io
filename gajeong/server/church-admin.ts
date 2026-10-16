// 목장 나눔터 — 계정 관리 (Supabase Edge Function: church-admin, verify_jwt=false)
// 함수 안에서 직접 권한을 확인한다. 모든 계정 작업은 "같은 교회 안에서만" 된다.
//  · register_church : 초대 코드로 새 교회 + 첫 목사 계정을 만든다
//  · create_mokja    : 목자 계정 + 목장을 한 번에 만든다 (내 교회)
//  · create_pastor   : 목사 계정을 하나 더 만든다 (내 교회)
//  · reset_password  : 같은 교회 계정의 비밀번호를 새로 정한다
//  · delete_user     : 같은 교회 계정을 지운다 (마지막 목사는 못 지움)
//  · delete_me       : 내 계정 탈퇴 (목자·목사, 마지막 목사는 delete_church로)
//  · delete_church   : 교회 전체 지우기 — 교회 이름을 그대로 적어야 한다. 모든 계정·목장·일기·로고가 사라진다
//  · new_recovery_code : 목사 복구 코드를 새로 받는다 (예전 코드는 못 쓰게 된다)
//  · recover         : (로그인 전) 아이디 + 복구 코드로 새 비밀번호를 정한다. 다섯 번 틀리면 한 시간 잠근다
//  · join_mokja      : (로그인 전) 교회 가입 코드로 목자(순장)가 스스로 계정 + 목장(다락방)을 만든다
//  · join_code_get / join_code_new / join_code_off : 목사가 가입 코드를 보기 / 새로 만들기 / 끄기
//  · set_logo        : 우리 교회 로고(PNG, 화면에서 512px 이하로 줄여 보냄)를 올린다 / remove_logo : 지운다
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

// 아이디는 메일 주소 앞부분으로 쓰이므로 영문 소문자·숫자·밑줄만 받는다 (모든 교회에서 하나뿐)
const DOMAIN = 'gajeong.local'
const LOGO_BUCKET = 'church-logo'   // 공개 읽기, 쓰기는 이 함수(서버)만
const ID_RE = /^[a-z0-9_]{3,30}$/
const emailOf = (id: string) => `${id}@${DOMAIN}`

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

type Me = { id: string; role: string; name: string; church_id: string }

async function callerProfile(req: Request): Promise<Me | null> {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!token) return null
  const { data, error } = await admin.auth.getUser(token)
  if (error || !data?.user) return null
  const { data: profile } = await admin
    .from('church_profile').select('id, role, name, church_id').eq('id', data.user.id).maybeSingle()
  return (profile as Me) ?? null
}

async function createAccount(login_id: string, password: string, name: string) {
  const { data, error } = await admin.auth.admin.createUser({
    email: emailOf(login_id), password, email_confirm: true, user_metadata: { login_id, name },
  })
  if (error) throw new Error(error.message)
  return data.user
}

function checkAccount(login_id: string, password: string, name: string): string | null {
  if (!ID_RE.test(login_id)) return '아이디는 영문 소문자·숫자 3~30자입니다'
  if (password.length < 8) return '비밀번호는 8자 이상으로 정해 주세요'
  if (!name) return '이름을 적어 주세요'
  return null
}

function validTimezone(tz: string) {
  try { new Intl.DateTimeFormat('en', { timeZone: tz }); return true } catch { return false }
}

// 로그인 화면 주소용 짧은 이름 — 영문 6자, 겹치면 다시 뽑는다
function randomSlug() {
  const a = 'abcdefghjkmnpqrstuvwxyz23456789'
  let s = ''
  for (const b of crypto.getRandomValues(new Uint8Array(6))) s += a[b % a.length]
  return s
}

// 복구 코드: 헷갈리는 글자(0/O, 1/I/L)를 뺀 12자. 해시만 저장한다
async function sha(text: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('')
}
const normCode = (c: string) => c.toUpperCase().replace(/[^A-Z0-9]/g, '')
async function issueRecovery(userId: string) {
  const a = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  let raw = ''
  for (const b of crypto.getRandomValues(new Uint8Array(12))) raw += a[b % a.length]
  const code = `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8)}`
  const { error } = await admin.from('church_recovery').upsert({
    user_id: userId, code_hash: await sha(userId + ':' + raw), created_at: new Date().toISOString(), fails: 0, locked_until: null,
  })
  if (error) throw new Error(error.message)
  return code
}

// 가입 코드: 헷갈리는 글자를 뺀 8자 (XXXX-XXXX). 맞춰 볼 때는 글자만 비교한다
function newJoinCode() {
  const a = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  let raw = ''
  for (const b of crypto.getRandomValues(new Uint8Array(8))) raw += a[b % a.length]
  return raw
}
const showJoin = (raw: string) => `${raw.slice(0, 4)}-${raw.slice(4)}`

// 교회가 부르는 말 (목장/다락방…) — 새 목장 이름 기본값에 쓴다
async function unitOf(church_id: string) {
  const { data } = await admin.from('church_church').select('terms').eq('id', church_id).maybeSingle()
  const u = (data?.terms as Record<string, string> | null)?.unit
  return typeof u === 'string' && /^[가-힣A-Za-z0-9 ]{1,8}$/.test(u) ? u : '목장'
}

// 목자 계정 + 목장 하나를 함께 만든다 (목사가 만들 때·스스로 가입할 때 같이 쓴다)
async function makeMokja(church_id: string, login_id: string, password: string, name: string, mokjang_name: string, meet_day = '') {
  const user = await createAccount(login_id, password, name)
  const { error: pe } = await admin.from('church_profile')
    .insert({ id: user.id, login_id, name, role: 'mokja', church_id })
  if (pe) { await admin.auth.admin.deleteUser(user.id); throw new Error(pe.message) }
  const { data: mj, error: me2 } = await admin.from('church_mokjang').insert({
    name: mokjang_name || `${name} ${await unitOf(church_id)}`,
    mokja_id: user.id, mokja_name: name, church_id, meet_day,
  }).select('id').single()
  if (me2) throw new Error(me2.message)
  return { user_id: user.id, mokjang_id: mj.id }
}

async function targetInMyChurch(me: Me, uid: string) {
  const { data } = await admin.from('church_profile').select('id, role, church_id').eq('id', uid).maybeSingle()
  return data && data.church_id === me.church_id ? data : null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'POST만 받습니다' }, 405)

  let body: Record<string, string>
  try { body = await req.json() } catch { return json({ error: '요청을 읽지 못했습니다' }, 400) }

  const action = String(body.action ?? '')
  const login_id = String(body.login_id ?? '').trim().toLowerCase()
  const password = String(body.password ?? '')
  const name = String(body.name ?? '').trim()

  try {
    // ── 새 교회 등록 (로그인 전) ────────────────────────────────
    if (action === 'register_church') {
      const bad = checkAccount(login_id, password, name)
      if (bad) return json({ error: bad }, 400)
      const churchName = String(body.church_name ?? '').trim()
      if (!churchName) return json({ error: '교회 이름을 적어 주세요' }, 400)
      const tz = String(body.timezone ?? '').trim() || 'Australia/Melbourne'
      if (!validTimezone(tz)) return json({ error: '시간대를 다시 골라 주세요' }, 400)

      const code = String(body.invite_code ?? '').trim().toUpperCase()
      const { data: inv } = await admin.from('church_invite').select('*').eq('code', code).maybeSingle()
      if (!inv || !inv.active) return json({ error: '초대 코드가 맞지 않습니다' }, 403)
      if (inv.max_uses != null && inv.uses >= inv.max_uses) return json({ error: '이미 다 쓴 초대 코드입니다' }, 403)

      let church: { id: string; slug: string } | null = null
      for (let i = 0; i < 5 && !church; i++) {
        const { data, error } = await admin.from('church_church')
          .insert({ slug: randomSlug(), name: churchName, timezone: tz }).select('id, slug').single()
        if (!error) church = data
      }
      if (!church) throw new Error('교회를 만들지 못했습니다')

      let userId = ''
      try {
        const user = await createAccount(login_id, password, name)
        userId = user.id
        const { error: pe } = await admin.from('church_profile')
          .insert({ id: user.id, login_id, name, role: 'pastor', church_id: church.id })
        if (pe) throw new Error(pe.message)
      } catch (e) {
        if (userId) await admin.auth.admin.deleteUser(userId)
        await admin.from('church_church').delete().eq('id', church.id)
        throw e
      }
      await admin.from('church_invite').update({ uses: inv.uses + 1 }).eq('code', code)
      const recovery_code = await issueRecovery(userId)
      return json({ ok: true, slug: church.slug, recovery_code })
    }

    // ── 비밀번호 잊었을 때 (로그인 전) ──
    if (action === 'recover') {
      const raw = normCode(String(body.code ?? ''))
      if (password.length < 8) return json({ error: '비밀번호는 8자 이상으로 정해 주세요' }, 400)
      const { data: pf } = await admin.from('church_profile').select('id').eq('login_id', login_id).maybeSingle()
      const { data: rc } = pf ? await admin.from('church_recovery').select('*').eq('user_id', pf.id).maybeSingle() : { data: null }
      if (rc?.locked_until && new Date(rc.locked_until).getTime() > Date.now()) {
        return json({ error: '여러 번 틀려서 잠시 잠겼습니다. 한 시간 뒤에 다시 해 주세요' }, 429)
      }
      if (!pf || !rc || rc.code_hash !== await sha(pf.id + ':' + raw)) {
        if (rc) {
          const fails = (rc.fails ?? 0) + 1
          await admin.from('church_recovery').update({
            fails: fails >= 5 ? 0 : fails, locked_until: fails >= 5 ? new Date(Date.now() + 3600e3).toISOString() : null,
          }).eq('user_id', rc.user_id)
        }
        return json({ error: '아이디나 복구 코드가 맞지 않습니다' }, 403)
      }
      const { error } = await admin.auth.admin.updateUserById(pf.id, { password })
      if (error) throw new Error(error.message)
      await admin.from('church_recovery').update({ fails: 0, locked_until: null }).eq('user_id', pf.id)
      return json({ ok: true })
    }

    // ── 목자(순장) 스스로 가입 (로그인 전) — 목사님이 알려 준 교회 가입 코드가 있어야 한다 ──
    if (action === 'join_mokja') {
      const raw = normCode(String(body.join_code ?? ''))
      const bad = checkAccount(login_id, password, name)
      if (bad) return json({ error: bad }, 400)
      const { data: jc } = raw.length === 8 ? await admin.from('church_join').select('church_id').eq('code', raw).maybeSingle() : { data: null }
      if (!jc) return json({ error: '가입 코드가 맞지 않습니다. 목사님께 다시 물어봐 주세요' }, 403)
      const { data: ch } = await admin.from('church_church').select('slug').eq('id', jc.church_id).single()
      const made = await makeMokja(jc.church_id, login_id, password, name, String(body.mokjang_name ?? '').trim())
      return json({ ok: true, slug: ch?.slug, ...made })
    }

    // ── 아래부터는 로그인한 목사만 ──────────────────────────────
    const me = await callerProfile(req)
    if (!me) return json({ error: '로그인이 필요합니다' }, 401)

    // ── 내 계정 탈퇴 (목자도 됨) ── 쓴 일기·기도제목은 교회 기록으로 남는다
    if (action === 'delete_me') {
      if (me.role === 'pastor') {
        const { count } = await admin.from('church_profile').select('id', { count: 'exact', head: true })
          .eq('role', 'pastor').eq('church_id', me.church_id)
        if ((count ?? 0) <= 1) return json({ error: '마지막 목사 계정은 탈퇴할 수 없습니다. 교회를 그만 쓰시려면 [교회 지우기]를 눌러 주세요' }, 400)
      }
      const { error } = await admin.auth.admin.deleteUser(me.id)
      if (error) throw new Error(error.message)
      return json({ ok: true })
    }

    if (me.role !== 'pastor') return json({ error: '목사 계정만 쓸 수 있습니다' }, 403)
    if (!me.church_id) return json({ error: '교회 정보가 없는 계정입니다' }, 403)

    if (action === 'new_recovery_code') {
      return json({ ok: true, recovery_code: await issueRecovery(me.id) })
    }

    if (action === 'create_mokja') {
      const bad = checkAccount(login_id, password, name)
      if (bad) return json({ error: bad }, 400)
      const made = await makeMokja(me.church_id, login_id, password, name,
        String(body.mokjang_name ?? '').trim(), String(body.meet_day ?? '').trim())
      return json({ ok: true, ...made })
    }

    // ── 목자(순장) 스스로 가입 코드 ──
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

    if (action === 'create_pastor') {
      const bad = checkAccount(login_id, password, name)
      if (bad) return json({ error: bad }, 400)
      const user = await createAccount(login_id, password, name)
      const { error: pe } = await admin.from('church_profile')
        .insert({ id: user.id, login_id, name, role: 'pastor', church_id: me.church_id })
      if (pe) { await admin.auth.admin.deleteUser(user.id); throw new Error(pe.message) }
      return json({ ok: true, user_id: user.id })
    }

    if (action === 'reset_password') {
      const uid = String(body.user_id ?? '')
      if (password.length < 8) return json({ error: '비밀번호는 8자 이상으로 정해 주세요' }, 400)
      if (!uid || !(await targetInMyChurch(me, uid))) return json({ error: '우리 교회 계정이 아닙니다' }, 403)
      const { error } = await admin.auth.admin.updateUserById(uid, { password })
      if (error) throw new Error(error.message)
      return json({ ok: true })
    }

    if (action === 'delete_user') {
      const uid = String(body.user_id ?? '')
      if (uid === me.id) return json({ error: '자기 계정은 지울 수 없습니다' }, 400)
      const target = uid ? await targetInMyChurch(me, uid) : null
      if (!target) return json({ error: '우리 교회 계정이 아닙니다' }, 403)
      if (target.role === 'pastor') {
        const { count } = await admin.from('church_profile').select('id', { count: 'exact', head: true })
          .eq('role', 'pastor').eq('church_id', me.church_id)
        if ((count ?? 0) <= 1) return json({ error: '마지막 목사 계정은 지울 수 없습니다' }, 400)
      }
      const { error } = await admin.auth.admin.deleteUser(uid)
      if (error) throw new Error(error.message)
      return json({ ok: true })
    }

    if (action === 'set_logo') {
      // 'data:image/png;base64,....' — 화면이 캔버스로 줄여 PNG로 보낸다
      const m = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(String(body.data ?? ''))
      if (!m) return json({ error: '그림을 읽지 못했습니다. PNG·JPG 사진을 골라 주세요' }, 400)
      const bytes = Uint8Array.from(atob(m[1]), (ch) => ch.charCodeAt(0))
      if (bytes.length > 1024 * 1024) return json({ error: '그림이 너무 큽니다 (1MB 이하)' }, 400)
      const PNG = [0x89, 0x50, 0x4e, 0x47]
      if (!PNG.every((b, i) => bytes[i] === b)) return json({ error: 'PNG 그림이 아닙니다' }, 400)
      const path = `${me.church_id}.png`
      const { error: ue } = await admin.storage.from(LOGO_BUCKET)
        .upload(path, bytes, { contentType: 'image/png', upsert: true, cacheControl: '300' })
      if (ue) throw new Error(ue.message)
      const url = admin.storage.from(LOGO_BUCKET).getPublicUrl(path).data.publicUrl + '?v=' + Date.now()
      const { error: ce } = await admin.from('church_church').update({ logo_url: url }).eq('id', me.church_id)
      if (ce) throw new Error(ce.message)
      return json({ ok: true, logo_url: url })
    }

    if (action === 'remove_logo') {
      await admin.storage.from(LOGO_BUCKET).remove([`${me.church_id}.png`])
      const { error } = await admin.from('church_church').update({ logo_url: '' }).eq('id', me.church_id)
      if (error) throw new Error(error.message)
      return json({ ok: true })
    }

    if (action === 'delete_church') {
      const { data: ch } = await admin.from('church_church').select('id, name').eq('id', me.church_id).maybeSingle()
      if (!ch) return json({ error: '교회 정보가 없는 계정입니다' }, 403)
      if (String(body.confirm_name ?? '').trim() !== ch.name.trim()) return json({ error: '교회 이름이 맞지 않습니다' }, 400)
      const { data: people } = await admin.from('church_profile').select('id').eq('church_id', ch.id)
      for (const p of people ?? []) await admin.auth.admin.deleteUser(p.id)
      await admin.storage.from(LOGO_BUCKET).remove([`${ch.id}.png`])
      const { error } = await admin.from('church_church').delete().eq('id', ch.id)   // 목장·일기·기도제목·답글은 함께 지워진다
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
