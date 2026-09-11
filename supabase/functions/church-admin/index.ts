// 가정교회 나눔터 — 계정 관리 (목사만 사용)
// verify_jwt = false 로 두고, 함수 안에서 직접 권한을 확인한다.
//  · bootstrap      : 설치 코드로 최초 목사 계정 1개를 만든다 (한 번만)
//  · create_mokja   : 목자 계정 + 목장을 한 번에 만든다
//  · reset_password : 목자가 비밀번호를 잊었을 때 목사가 새로 정해 준다
//  · delete_user    : 계정 삭제 (목장 기록은 남고 담당자만 비워진다)
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

// 아이디는 메일 주소 앞부분으로 쓰이므로 영문 소문자·숫자·밑줄만 받는다
const DOMAIN = 'gajeong.local'
const ID_RE = /^[a-z0-9_]{3,30}$/
const emailOf = (id: string) => `${id}@${DOMAIN}`

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

async function callerProfile(req: Request) {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!token) return null
  const { data, error } = await admin.auth.getUser(token)
  if (error || !data?.user) return null
  const { data: profile } = await admin
    .from('church_profile').select('id, role, name').eq('id', data.user.id).maybeSingle()
  return profile ?? null
}

async function createAccount(login_id: string, password: string, name: string) {
  const { data, error } = await admin.auth.admin.createUser({
    email: emailOf(login_id),
    password,
    email_confirm: true,
    user_metadata: { login_id, name },
  })
  if (error) throw new Error(error.message)
  return data.user
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
    // ── 1) 최초 목사 계정 ─────────────────────────────────────────
    if (action === 'bootstrap') {
      if (!ID_RE.test(login_id)) return json({ error: '아이디는 영문 소문자·숫자 3~30자입니다' }, 400)
      if (password.length < 8) return json({ error: '비밀번호는 8자 이상으로 정해 주세요' }, 400)
      if (!name) return json({ error: '이름을 적어 주세요' }, 400)

      const { data: setup } = await admin
        .from('church_setup').select('setup_code, used').eq('id', 1).maybeSingle()
      if (!setup) return json({ error: '설치 정보가 없습니다' }, 500)
      if (setup.used) return json({ error: '이미 목사 계정이 만들어졌습니다' }, 403)
      if (String(body.setup_code ?? '').trim().toUpperCase() !== setup.setup_code) {
        return json({ error: '설치 코드가 맞지 않습니다' }, 403)
      }
      const { count } = await admin
        .from('church_profile').select('id', { count: 'exact', head: true }).eq('role', 'pastor')
      if ((count ?? 0) > 0) return json({ error: '이미 목사 계정이 있습니다' }, 403)

      const user = await createAccount(login_id, password, name)
      const { error: pe } = await admin.from('church_profile')
        .insert({ id: user.id, login_id, name, role: 'pastor' })
      if (pe) throw new Error(pe.message)
      await admin.from('church_setup').update({ used: true }).eq('id', 1)
      return json({ ok: true, user_id: user.id })
    }

    // ── 아래부터는 목사만 ────────────────────────────────────────
    const me = await callerProfile(req)
    if (!me) return json({ error: '로그인이 필요합니다' }, 401)
    if (me.role !== 'pastor') return json({ error: '목사 계정만 쓸 수 있습니다' }, 403)

    // ── 2) 목자 계정 + 목장 만들기 ───────────────────────────────
    if (action === 'create_mokja') {
      if (!ID_RE.test(login_id)) return json({ error: '아이디는 영문 소문자·숫자 3~30자입니다' }, 400)
      if (password.length < 8) return json({ error: '비밀번호는 8자 이상으로 정해 주세요' }, 400)
      if (!name) return json({ error: '목자 이름을 적어 주세요' }, 400)

      const user = await createAccount(login_id, password, name)
      const { error: pe } = await admin.from('church_profile')
        .insert({ id: user.id, login_id, name, role: 'mokja' })
      if (pe) { await admin.auth.admin.deleteUser(user.id); throw new Error(pe.message) }

      const mokjangName = String(body.mokjang_name ?? '').trim() || `${name} 목장`
      const { data: mj, error: me2 } = await admin.from('church_mokjang')
        .insert({
          name: mokjangName,
          mokja_id: user.id,
          mokja_name: name,
          meet_day: String(body.meet_day ?? '').trim(),
        }).select('id').single()
      if (me2) throw new Error(me2.message)
      return json({ ok: true, user_id: user.id, mokjang_id: mj.id })
    }

    // ── 3) 비밀번호 다시 정하기 ──────────────────────────────────
    if (action === 'reset_password') {
      const uid = String(body.user_id ?? '')
      if (!uid) return json({ error: '대상 계정이 없습니다' }, 400)
      if (password.length < 8) return json({ error: '비밀번호는 8자 이상으로 정해 주세요' }, 400)
      const { error } = await admin.auth.admin.updateUserById(uid, { password })
      if (error) throw new Error(error.message)
      return json({ ok: true })
    }

    // ── 4) 계정 삭제 ─────────────────────────────────────────────
    if (action === 'delete_user') {
      const uid = String(body.user_id ?? '')
      if (!uid) return json({ error: '대상 계정이 없습니다' }, 400)
      if (uid === me.id) return json({ error: '자기 계정은 지울 수 없습니다' }, 400)
      const { error } = await admin.auth.admin.deleteUser(uid)
      if (error) throw new Error(error.message)
      return json({ ok: true })
    }

    return json({ error: '알 수 없는 요청입니다' }, 400)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    const dup = /already|duplicate|registered|exists/i.test(msg)
    return json({ error: dup ? '이미 쓰고 있는 아이디입니다' : msg }, dup ? 409 : 500)
  }
})
