// 목장 나눔터 — 계정 관리 (Supabase Edge Function: church-admin, verify_jwt=false)
// 함수 안에서 직접 권한을 확인한다. 모든 계정 작업은 "같은 교회 안에서만" 된다.
//  · register_church : 초대 코드로 새 교회 + 첫 목사 계정을 만든다 (slug: 목사님이 고른 교회 주소, 비우면 자동)
//  · check_slug      : (로그인 전) 교회 주소를 쓸 수 있는지 미리 본다
//  · create_mokja    : 목자 계정 + 목장을 한 번에 만든다 (내 교회)
//  · create_pastor   : 목사 계정을 하나 더 만든다 (내 교회)
//  · reset_password  : 같은 교회 계정의 비밀번호를 새로 정한다
//  · delete_user     : 같은 교회 계정을 지운다 (마지막 목사는 못 지움)
//  · delete_me       : 내 계정 탈퇴 (목자·목사, 마지막 목사는 delete_church로)
//  · delete_church   : 교회 전체 지우기 — 교회 이름을 그대로 적어야 한다. 모든 계정·목장·일기·로고가 사라진다
//  · new_recovery_code : 목사 복구 코드를 새로 받는다 (예전 코드는 못 쓰게 된다)
//  · recover         : (로그인 전) 아이디 + 복구 코드로 새 비밀번호를 정한다. 다섯 번 틀리면 한 시간 잠근다
//  · entry_links     : 목사가 목자들의 '개인 입장 링크'를 만든다 (누르면 비밀번호 없이 바로 그 목자로 들어감, 다시 만들면 예전 링크는 못 씀)
//  · key_login       : (로그인 전) 입장 링크·열쇠 코드로 들어가기 — 그때마다 새 임시 비밀번호를 정해 화면이 바로 로그인한다
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

// 목사님이 고르는 교회 주소 (mokjang.app/<주소>/) — 영어 소문자로 시작, 소문자·숫자·붙임표 2~20자
// 사이트 폴더·화면 이름과 겹치는 말은 못 쓴다
const SLUG_RE = /^[a-z][a-z0-9-]{0,18}[a-z0-9]$/
const RESERVED = new Set(['assets', 'video', 'darak', 'tools', 'admin', 'api', 'app', 'www', 'new', 'help', 'about',
  'test', 'index', 'moksa', 'mokjang', 'sw', 'static', 'login', 'church', 'gajeong', 'manifest', 'cname', 'icon', 'img'])
async function slugProblem(slug: string): Promise<string | null> {
  if (!SLUG_RE.test(slug) || slug.includes('--')) return '교회 주소는 영어 소문자와 숫자로 2~20자로 적어 주세요 (예: hanul)'
  if (RESERVED.has(slug)) return '이 주소는 쓸 수 없습니다. 다른 이름을 골라 주세요'
  const { data } = await admin.from('church_church').select('id').eq('slug', slug).maybeSingle()
  return data ? '이미 다른 교회가 쓰는 주소입니다. 다른 이름을 골라 주세요' : null
}

// 입장 링크·열쇠 코드: 12자. 해시만 저장하고 코드만으로 사람을 찾는다 (31^12 가지라 맞혀 볼 수 없다). 다락방 앱과 같은 표를 쓴다
const MOVED_AT = '2026-10-20T21:20:00Z'   // mokjang.app으로 주소를 옮긴 때 — 그 뒤로 다시 들어왔는지 보여 준다
async function issueKey(userId: string) {
  const a = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  for (let i = 0; i < 5; i++) {
    let raw = ''
    for (const b of crypto.getRandomValues(new Uint8Array(12))) raw += a[b % a.length]
    const { error } = await admin.from('church_key')
      .upsert({ user_id: userId, code_hash: await sha('key:' + raw), created_at: new Date().toISOString() })
    if (!error) return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8)}`
  }
  throw new Error('입장 링크를 만들지 못했습니다')
}
function randomText(n: number, a = 'abcdefghijkmnpqrstuvwxyz23456789') {
  let s = ''
  for (const b of crypto.getRandomValues(new Uint8Array(n))) s += a[b % a.length]
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
    // ── 교회 주소 미리 보기 (로그인 전) ──
    if (action === 'check_slug') {
      const problem = await slugProblem(String(body.slug ?? '').trim().toLowerCase())
      return json({ ok: true, available: !problem, problem })
    }

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

      const want = String(body.slug ?? '').trim().toLowerCase()
      if (want) { const problem = await slugProblem(want); if (problem) return json({ error: problem }, 409) }

      let church: { id: string; slug: string } | null = null
      for (let i = 0; i < 5 && !church; i++) {
        const { data, error } = await admin.from('church_church')
          .insert({ slug: want || randomSlug(), name: churchName, timezone: tz }).select('id, slug').single()
        if (!error) church = data
        else if (want) return json({ error: '이미 다른 교회가 쓰는 주소입니다. 다른 이름을 골라 주세요' }, 409)   // 그새 누가 먼저 썼다
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

    // ── 입장 링크·열쇠 코드로 들어가기 (로그인 전) ──
    if (action === 'key_login') {
      const raw = normCode(String(body.key ?? ''))
      const { data: k } = raw.length === 12
        ? await admin.from('church_key').select('user_id').eq('code_hash', await sha('key:' + raw)).maybeSingle() : { data: null }
      if (!k) return json({ error: '입장 링크가 맞지 않습니다. 목사님께 새 링크를 받아 주세요' }, 403)
      const { data: pf } = await admin.from('church_profile').select('login_id').eq('id', k.user_id).maybeSingle()
      if (!pf) return json({ error: '계정을 찾지 못했습니다' }, 404)
      const pw = randomText(32)
      const { error } = await admin.auth.admin.updateUserById(k.user_id, { password: pw })
      if (error) throw new Error(error.message)
      return json({ ok: true, login_id: pf.login_id, password: pw })
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

    // 목자 개인 입장 링크 — user_id를 주면 그 사람만, 없으면 우리 교회 목자 모두
    if (action === 'entry_links') {
      const only = String(body.user_id ?? '')
      const { data: people } = await admin.from('church_profile').select('id, name, login_id, role')
        .eq('church_id', me.church_id).eq('role', 'mokja')
      const list = (people ?? []).filter((p) => !only || p.id === only)
      if (only && !list.length) return json({ error: '우리 교회 계정이 아닙니다' }, 403)
      const out = []
      for (const p of list) {
        const { data: u } = await admin.auth.admin.getUserById(p.id)
        const last = u?.user?.last_sign_in_at ?? null
        out.push({ user_id: p.id, name: p.name, login_id: p.login_id, key: await issueKey(p.id),
          since_move: !!last && last >= MOVED_AT })
      }
      return json({ ok: true, links: out })
    }

    if (action === 'new_recovery_code') {
      return json({ ok: true, recovery_code: await issueRecovery(me.id) })
    }

    if (action === 'create_mokja') {
      const bad = checkAccount(login_id, password, name)
      if (bad) return json({ error: bad }, 400)
      const user = await createAccount(login_id, password, name)
      const { error: pe } = await admin.from('church_profile')
        .insert({ id: user.id, login_id, name, role: 'mokja', church_id: me.church_id })
      if (pe) { await admin.auth.admin.deleteUser(user.id); throw new Error(pe.message) }
      const { data: mj, error: me2 } = await admin.from('church_mokjang').insert({
        name: String(body.mokjang_name ?? '').trim() || `${name} 목장`,
        mokja_id: user.id, mokja_name: name, church_id: me.church_id,
        meet_day: String(body.meet_day ?? '').trim(),
      }).select('id').single()
      if (me2) throw new Error(me2.message)
      return json({ ok: true, user_id: user.id, mokjang_id: mj.id })
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
