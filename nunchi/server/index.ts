// 눈치(Nunchi) — 한국어 학습 LLM 프록시
// 브라우저가 API 키를 들고 있지 않도록 서버에서 대신 호출하고, 학습자 오류를 로그로 남긴다.
// 시크릿: GEMINI_API_KEY (Edge Function Secrets 또는 app_secrets 테이블) — 둘 중 하나만 있으면 된다
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2'

// 이 파일은 supabase 프로젝트의 supabase/functions/nunchi/index.ts 로 복사해 배포한다.
// 다른 저장소로 옮겨 붙여도 되도록 의존성 없이 혼자 돌아가게 써 둔다.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
// 키는 Edge Function 시크릿(GEMINI_API_KEY)이 먼저, 없으면 app_secrets 테이블(name='GEMINI_API_KEY')을 본다.
// 같은 프로젝트의 다른 함수들과 같은 방식이라 대시보드 SQL 한 줄로도 키를 넣을 수 있다.
async function getSecret(db: SupabaseClient, name: string): Promise<string> {
  const env = Deno.env.get(name)
  if (env) return env
  const { data } = await db.from('app_secrets').select('value').eq('name', name).maybeSingle()
  return data?.value ?? ''
}
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
  })
}

// 눈치는 글·대화 앱이라 글 모델이 필요하다(ai.google.dev/gemini-api/docs/models).
// - 2.5 Flash는 기존 사용자만 접근 가능해 새 키는 404가 난다.
// - gemini-omni-flash-preview는 2026-10-22 종료. 구글이 대체로 적은 gemini-omni-1.1-flash는 영상 생성 모델이라 대화·JSON 요청에 못 쓴다.
// NUNCHI_MODEL에 이 이름들이 남아 있어도 현재 정식 글 모델로 보낸다.
const DEFAULT_MODEL = 'gemini-3.8-flash'
const NOT_FOR_TEXT = new Set(['gemini-2.5-flash', 'gemini-omni-flash-preview', 'gemini-omni-1.1-flash'])
const MODEL_RAW = Deno.env.get('NUNCHI_MODEL') ?? DEFAULT_MODEL
const MODEL = NOT_FOR_TEXT.has(MODEL_RAW) ? DEFAULT_MODEL : MODEL_RAW
// 3.x는 기본으로 사고(thinking)하며 사고 토큰이 maxOutputTokens에 포함된다. 220이면 답이 비어 올 수 있어
// 사고 수준을 low로 낮추고 한도에 여유를 둔다. thinkingLevel은 3 이전 모델에서 오류이므로 그때는 기존 설정을 쓴다.
const G3 = /^gemini-3/.test(MODEL)
const DAILY_LIMIT = Number(Deno.env.get('NUNCHI_DAILY_LIMIT') ?? '120') // 기기 하나당 하루 호출 수

type Mode = 'dial' | 'chat' | 'review'

interface Body {
  mode: Mode
  system: string
  prompt: string
  schema?: Record<string, unknown>
  /** 브라우저가 만든 익명 기기 식별자(uuid). 계정 없이 세션을 잇기 위한 값. */
  device?: string
  /** 상황 롤플레이 장면 id, TOPIK 급수 — 로그 분석용 */
  scene?: string
  level?: string
}

function kstDay(): string {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)

  let body: Body
  try {
    body = await req.json()
  } catch {
    return json({ error: '요청 형식이 올바르지 않습니다.' }, 400)
  }
  if (!body?.mode || !body?.system || !body?.prompt) return json({ error: 'mode/system/prompt required' }, 400)
  if (body.prompt.length > 6000) return json({ error: '대화가 너무 깁니다. 대화를 끝내고 복기 카드를 받아 보세요.' }, 413)

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const key = await getSecret(db, 'GEMINI_API_KEY')
  if (!key) return json({ error: '서버에 모델 키가 아직 없어요. 운영자가 GEMINI_API_KEY를 넣으면 바로 됩니다.' }, 503)

  // 기기당 하루 호출 상한 — 키가 서버로 옮겨온 순간부터 비용이 우리 것이 되므로 반드시 건다
  const device = (body.device ?? '').slice(0, 64) || 'anon'
  const day = kstDay()
  const { data: quota } = await db
    .from('nunchi_quota')
    .select('calls')
    .eq('device', device)
    .eq('day', day)
    .maybeSingle()
  if ((quota?.calls ?? 0) >= DAILY_LIMIT) {
    return json({ error: '오늘 사용량을 다 쓰셨어요. 내일 다시 만나요.' }, 429)
  }

  const started = Date.now()
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: body.system }] },
        contents: [{ role: 'user', parts: [{ text: body.prompt }] }],
        // 3.x는 temperature가 지원 종료(구글 이전 안내: temperature·top_p·top_k 제거,
        // 1.0 아래로 내리면 반복·품질 저하). 그래서 3.x에는 보내지 않는다.
        generationConfig: {
          ...(body.schema
            ? { responseMimeType: 'application/json', responseSchema: body.schema, ...(G3 ? {} : { temperature: 0.4 }) }
            : { maxOutputTokens: G3 ? 1024 : 220, ...(G3 ? {} : { temperature: 0.8 }) }),
          ...(G3 ? { thinkingConfig: { thinkingLevel: 'low' } } : {}),
        },
      }),
    },
  )
  if (!res.ok) {
    const detail = await res.text()
    console.error('gemini', res.status, detail.slice(0, 300))
    return json({ error: '지금은 응답을 받지 못했어요. 잠시 후 다시 시도해 주세요.' }, 502)
  }
  const data = await res.json()
  const text: string =
    data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text).filter(Boolean).join('') ?? ''
  if (!text) return json({ error: '지금은 응답을 받지 못했어요. 잠시 후 다시 시도해 주세요.' }, 502)

  await db.rpc('nunchi_bump_quota', { p_device: device, p_day: day })

  // 로그는 실패해도 학습을 막지 않는다
  db.from('nunchi_turns')
    .insert({
      device,
      mode: body.mode,
      scene: body.scene ?? null,
      level: body.level ?? null,
      prompt: body.prompt,
      output: text,
      ms: Date.now() - started,
    })
    .then(({ error }) => { if (error) console.error('log', error.message) })

  return json({ text })
})
