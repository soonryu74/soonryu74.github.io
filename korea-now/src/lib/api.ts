// 서버(Supabase Edge Function) 호출 + 실패 시 데모 데이터로 자동 전환
// - 공공 API 키는 브라우저에 두지 않고 Edge Function 안에만 둔다
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Congestion, FxRate, Spot } from '../types'
import { demoCongestion, levelFromSeoul } from './congestion'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabase: SupabaseClient | null =
  SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null

export const isLive = supabase !== null

// Edge Function이 돌려주는 서울 실시간 혼잡도 형식
interface SeoulAreaResult {
  area: string
  level: string          // "여유" | "보통" | "약간 붐빔" | "붐빔"
  min: number
  max: number
  time: string           // "2026-09-05 15:05"
  forecast: { time: string; level: string; min: number; max: number }[]
}

const cache = new Map<string, { at: number; data: Congestion }>()
const TTL = 5 * 60 * 1000   // 5분

// 여러 스팟의 혼잡도를 한 번에 가져온다. 서울 실시간 가능 지역만 서버 호출, 나머지는 데모.
export async function fetchCongestion(spots: Spot[]): Promise<Record<string, Congestion>> {
  const out: Record<string, Congestion> = {}
  const need: string[] = []
  const now = Date.now()

  for (const s of spots) {
    if (!s.seoulArea || !supabase) {
      out[s.id] = demoCongestion(s)
      continue
    }
    const hit = cache.get(s.seoulArea)
    if (hit && now - hit.at < TTL) out[s.id] = hit.data
    else if (!need.includes(s.seoulArea)) need.push(s.seoulArea)
  }

  if (need.length && supabase) {
    try {
      const { data, error } = await supabase.functions.invoke<{ results: SeoulAreaResult[] }>('seoul-congestion', {
        body: { areas: need },
      })
      if (error) throw error
      for (const r of data?.results ?? []) {
        const c = normalizeSeoul(r)
        cache.set(r.area, { at: now, data: c })
      }
    } catch (e) {
      console.warn('[korea-now] live congestion unavailable, using demo curve', e)
    }
  }

  for (const s of spots) {
    if (out[s.id]) continue
    const hit = s.seoulArea ? cache.get(s.seoulArea) : undefined
    out[s.id] = hit ? hit.data : demoCongestion(s)
  }
  return out
}

function normalizeSeoul(r: SeoulAreaResult): Congestion {
  return {
    level: levelFromSeoul(r.level),
    min: r.min,
    max: r.max,
    updatedAt: seoulToIso(r.time),
    forecast: r.forecast.map((f) => ({
      time: seoulToIso(f.time),
      level: levelFromSeoul(f.level),
      min: f.min,
      max: f.max,
    })),
    source: 'seoul-live',
  }
}

// "2026-09-05 15:00" (KST) → ISO
function seoulToIso(s: string): string {
  return new Date(s.replace(' ', 'T') + ':00+09:00').toISOString()
}

// 환율 — 실패 시 데모값(표시에 "demo" 라벨)
const DEMO_FX: FxRate = { usdKrw: 1380, jpyKrw: 920, cnyKrw: 190, eurKrw: 1500, date: 'demo', source: 'demo' }

export async function fetchFx(): Promise<FxRate> {
  if (!supabase) return DEMO_FX
  try {
    const { data, error } = await supabase.functions.invoke<FxRate>('fx-rate')
    if (error || !data) throw error
    return data
  } catch (e) {
    console.warn('[korea-now] fx unavailable, using demo', e)
    return DEMO_FX
  }
}

// ── 주변 검색 (한국관광공사 TourAPI, Edge Function 경유) ──
export interface NearbyItem {
  contentId: string
  contentTypeId: string   // 76 관광지 · 78 문화시설 · 79 쇼핑 · 82 음식점 · 85 축제
  title: string
  addr: string
  lat: number
  lng: number
  dist: number            // m
  image: string | null
  tel: string | null
}

export const NEARBY_TYPES: { id: string; label: string; icon: string }[] = [
  { id: '', label: 'All', icon: '✨' },
  { id: '76', label: 'Sights', icon: '📍' },
  { id: '82', label: 'Food', icon: '🍜' },
  { id: '78', label: 'Culture', icon: '🏛️' },
  { id: '79', label: 'Shopping', icon: '🛍️' },
  { id: '85', label: 'Festivals', icon: '🎉' },
]

export async function fetchNearby(lat: number, lng: number, contentTypeId = '', radius = 2000): Promise<NearbyItem[]> {
  if (!supabase) throw new Error('offline')
  const { data, error } = await supabase.functions.invoke<{ items: NearbyItem[] }>('tour-search', {
    body: { lat, lng, radius, contentTypeId },
  })
  if (error) throw error
  return data?.items ?? []
}
