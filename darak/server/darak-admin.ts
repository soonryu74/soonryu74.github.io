// 다락방 나눔터 — 순장 스스로 가입 (Supabase Edge Function: darak-admin, verify_jwt=false)
// 목장 나눔터(church-admin)와 따로 둔 함수. 같은 데이터베이스(교회·계정·다락방)를 쓴다.
//  · join_mokja    : (로그인 전) 교회 가입 코드로 순장이 스스로 계정 + 다락방을 만든다
//  · join_code_get / join_code_new / join_code_off : 목사가 가입 코드를 보기 / 새로 만들기 / 끄기
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
const ID_RE = /^[a-z0-9_]{3,30}$/
const emailOf = (id: string) => `${id}@${DOMAIN}`

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

type Me = { id: string; role: string; church_id: string }

async function callerProfile(req: Request): Promise<Me | null> {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!token) return null
  const { data, error } = await admin.auth.getUser(token)
  if (error || !data?.user) return null
  const { data: profile } = await admin
    .from('church_profile').select('id, role, church_id').eq('id', data.user.id).maybeSingle()
  return (profile as Me) ?? null
}

function checkAccount(login_id: string, password: string, name: string): string | null {
  if (!ID_RE.test(login_id)) return '아이디는 영문 소문자·숫자 3~30자입니다'
  if (password.length < 8) return '비밀번호는 8자 이상으로 정해 주세요'
  if (!name) return '이름을 적어 주세요'
  return null
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
  const login_id = String(body.login_id ?? '').trim().toLowerCase()
  const password = String(body.password ?? '')
  const name = String(body.name ?? '').trim()

  try {
    // ── 순장 스스로 가입 (로그인 전) — 목사님이 알려 준 가입 코드가 있어야 한다 ──
    if (action === 'join_mokja') {
      const bad = checkAccount(login_id, password, name)
      if (bad) return json({ error: bad }, 400)
      const raw = normCode(String(body.join_code ?? ''))
      const { data: jc } = raw.length === 8
        ? await admin.from('church_join').select('church_id').eq('code', raw).maybeSingle() : { data: null }
      if (!jc) return json({ error: '가입 코드가 맞지 않습니다. 목사님께 다시 물어봐 주세요' }, 403)

      const { data: u, error: ue } = await admin.auth.admin.createUser({
        email: emailOf(login_id), password, email_confirm: true, user_metadata: { login_id, name },
      })
      if (ue) throw new Error(ue.message)
      const { error: pe } = await admin.from('church_profile')
        .insert({ id: u.user.id, login_id, name, role: 'mokja', church_id: jc.church_id })
      if (pe) { await admin.auth.admin.deleteUser(u.user.id); throw new Error(pe.message) }
      const { error: me } = await admin.from('church_mokjang').insert({
        name: String(body.mokjang_name ?? '').trim() || `${name} ${await unitOf(jc.church_id)}`,
        mokja_id: u.user.id, mokja_name: name, church_id: jc.church_id,
      })
      if (me) throw new Error(me.message)
      const { data: ch } = await admin.from('church_church').select('slug').eq('id', jc.church_id).single()
      return json({ ok: true, slug: ch?.slug })
    }

    // ── 아래부터는 로그인한 목사만 ──
    const me = await callerProfile(req)
    if (!me) return json({ error: '로그인이 필요합니다' }, 401)
    if (me.role !== 'pastor' || !me.church_id) return json({ error: '목사 계정만 쓸 수 있습니다' }, 403)

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
