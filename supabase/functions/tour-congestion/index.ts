// 한국관광공사 "관광지 집중률 방문자 추이 예측" 프록시 — 서울 외 지역용 30일 예측 붐빔 지수
// (실시간이 아니라 일 단위 예측. KT 통신 데이터 기반, 가장 붐비는 날 = 100)
// 시크릿: TOUR_API_KEY (data.go.kr — 이 데이터셋(15128555)도 활용신청 필요)
// 요청: POST { areaCd: "11", signguCd: "11110", name?: "경복궁" }
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders, json } from '../_shared/cors.ts'

const TTL_MS = 24 * 3600 * 1000
const BASE = 'https://apis.data.go.kr/B551011/TatsCnctrRateService/tatsCnctrRatedList'

interface Item { baseYmd: string; areaCd: string; areaNm: string; signguCd: string; signguNm: string; tAtsNm: string; cnctrRate: string }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const key = Deno.env.get('TOUR_API_KEY')
  if (!key) return json({ error: 'TOUR_API_KEY not set' }, 500)

  let areaCd = '', signguCd = '', name = ''
  try {
    const b = await req.json()
    areaCd = String(b.areaCd ?? ''); signguCd = String(b.signguCd ?? ''); name = String(b.name ?? '')
  } catch { /* 무시 */ }
  if (!areaCd || !signguCd) return json({ error: 'areaCd/signguCd required' }, 400)

  const cacheKey = `cnctr:${areaCd}:${signguCd}:${name}`
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: hit } = await db.from('tour_cache').select('payload, fetched_at').eq('key', cacheKey).maybeSingle()
  if (hit && Date.now() - new Date(hit.fetched_at).getTime() < TTL_MS) return json(hit.payload)

  const params = new URLSearchParams({
    serviceKey: key, MobileOS: 'ETC', MobileApp: 'KoreaNow', _type: 'json',
    numOfRows: '500', pageNo: '1', areaCd, signguCd,
  })
  if (name) params.set('tAtsNm', name)

  try {
    const r = await fetch(`${BASE}?${params}`)
    const j = await r.json()
    const raw = j?.response?.body?.items?.item ?? []
    const items: Item[] = Array.isArray(raw) ? raw : [raw]
    // 관광지명 → 날짜별 집중률 배열로 정리
    const bySpot: Record<string, { date: string; rate: number }[]> = {}
    for (const it of items) {
      ;(bySpot[it.tAtsNm] ??= []).push({ date: it.baseYmd, rate: Number(it.cnctrRate) })
    }
    for (const list of Object.values(bySpot)) list.sort((a, b) => a.date.localeCompare(b.date))
    const payload = { areaCd, signguCd, spots: bySpot, fetchedAt: new Date().toISOString() }
    await db.from('tour_cache').upsert({ key: cacheKey, payload, fetched_at: new Date().toISOString() })
    return json(payload)
  } catch (e) {
    console.error('cnctr fetch failed', e)
    return json({ error: 'congestion forecast api failed' }, 502)
  }
})
