// 앱 공용 상태: 내 위치, 선택 지역, 혼잡도 캐시
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Congestion, Region } from '../types'
import { SPOTS } from '../data/spots'
import { fetchCongestion, isLive } from './api'

interface Geo { lat: number; lng: number }

interface AppState {
  me: Geo | null
  locating: boolean
  locateError: string | null
  /** focus=true 면 focusNonce를 올려 지도가 내 위치로 이동하게 한다 */
  locate: (focus?: boolean) => void
  focusNonce: number
  region: Region | 'all'
  setRegion: (r: Region | 'all') => void
  congestion: Record<string, Congestion>
  refreshedAt: number
  live: boolean
}

const Ctx = createContext<AppState | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Geo | null>(null)
  const [locating, setLocating] = useState(false)
  const [locateError, setLocateError] = useState<string | null>(null)
  const [focusNonce, setFocusNonce] = useState(0)
  const [region, setRegion] = useState<Region | 'all'>('seoul')
  const [congestion, setCongestion] = useState<Record<string, Congestion>>({})
  const [refreshedAt, setRefreshedAt] = useState(0)

  const locate = useCallback((focus = false) => {
    if (!('geolocation' in navigator)) {
      setLocateError("This browser can't share a location.")
      return
    }
    setLocating(true)
    setLocateError(null)
    // 브라우저가 권한 창을 띄운 채 응답하지 않는 경우가 있어 직접 마감 시간을 둔다
    let settled = false
    const giveUp = setTimeout(() => {
      if (settled) return
      settled = true
      setLocating(false)
      setLocateError('Location is taking too long. Check that location is on, then tap again.')
    }, 12000)
    const done = () => {
      settled = true
      clearTimeout(giveUp)
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        if (settled) return
        done()
        setMe({ lat: p.coords.latitude, lng: p.coords.longitude })
        setLocating(false)
        // 버튼으로 부른 경우에만 지도를 옮긴다 (앱 시작 시 자동 호출은 조용히 좌표만 받는다)
        if (focus) setFocusNonce((n) => n + 1)
      },
      (err) => {
        if (settled) return
        done()
        setLocating(false)
        setLocateError(
          err.code === err.PERMISSION_DENIED
            ? 'Location is blocked. Allow it in your browser settings, then tap again.'
            : err.code === err.TIMEOUT
              ? 'Location timed out. Try again outdoors or with Wi-Fi on.'
              : "Couldn't find your location right now.",
        )
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 },
    )
  }, [])

  // 처음 열 때 한 번 위치 요청 + 혼잡도 로드, 이후 5분마다 갱신
  useEffect(() => {
    locate()
    let alive = true
    const load = async () => {
      const c = await fetchCongestion(SPOTS)
      if (alive) {
        setCongestion(c)
        setRefreshedAt(Date.now())
      }
    }
    load()
    const t = setInterval(load, 5 * 60 * 1000)
    return () => {
      alive = false
      clearInterval(t)
    }
  }, [locate])

  const value = useMemo<AppState>(
    () => ({ me, locating, locateError, locate, focusNonce, region, setRegion, congestion, refreshedAt, live: isLive }),
    [me, locating, locateError, locate, focusNonce, region, congestion, refreshedAt],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useApp(): AppState {
  const v = useContext(Ctx)
  if (!v) throw new Error('useApp must be used inside AppProvider')
  return v
}
