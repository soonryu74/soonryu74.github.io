// 눈치(Nunchi) — 한국어 학습 LLM 프록시
// 브라우저가 API 키를 들고 있지 않도록 서버에서 대신 호출하고, 학습자 오류를 로그로 남긴다.
// 시크릿: GEMINI_API_KEY (Edge Function Secrets 또는 app_secrets 테이블)
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders, json } from '../_shared/cors.ts'
import { getSecret } from '../_shared/secret.ts'

const MODEL = Deno.env.get('NUNCHI_MODEL') ?? 'gemini-2.5-flash'
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
  if (!key) return json({ error: 'GEMINI_API_KEY not set' }, 500)

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
        generationConfig: body.schema
          ? { responseMimeType: 'application/json', responseSchema: body.schema, temperature: 0.4 }
          : { temperature: 0.8, maxOutputTokens: 220 },
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
