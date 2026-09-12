import { useMemo, useState } from 'react'
import type { Category, Spot } from '../types'
import { CATEGORY_ICON, CATEGORY_LABEL, REGIONS, SPOTS } from '../data/spots'
import { useApp } from '../lib/state'
import { distanceKm } from '../lib/geo'
import { openStatus } from '../lib/hours'
import { LEVEL_ORDER } from '../lib/congestion'
import MapView from '../components/MapView'
import SpotCard from '../components/SpotCard'

type Sort = 'distance' | 'quiet' | 'popular'

export default function NowPage() {
  const { me, locate, locating, locateError, focusNonce, region, setRegion, congestion, live, refreshedAt } = useApp()
  const [freeOnly, setFreeOnly] = useState(false)
  const [openOnly, setOpenOnly] = useState(false)
  const [cat, setCat] = useState<Category | null>(null)
  const [sort, setSort] = useState<Sort>('distance')
  const [followMe, setFollowMe] = useState(false)   // 📍 버튼을 누른 뒤 지도가 내 위치를 따라가는 상태
  const [showSources, setShowSources] = useState(false)

  const regionMeta = REGIONS.find((r) => r.id === region) ?? REGIONS[0]

  // 지도 중심
  //  1) 📍 버튼을 눌렀으면 무조건 내 위치 (전국 보기에서도 이동한다)
  //  2) 아니면 선택한 지역 중심. 단 내 위치가 그 지역 안(12 km)이면 내 위치
  const center = useMemo(() => {
    if (followMe && me) return { lat: me.lat, lng: me.lng, zoom: 15, nonce: focusNonce }
    if (me && region !== 'all' && distanceKm(me.lat, me.lng, regionMeta.lat, regionMeta.lng) < 12) {
      return { lat: me.lat, lng: me.lng, zoom: 13, nonce: 0 }
    }
    return { lat: regionMeta.lat, lng: regionMeta.lng, zoom: regionMeta.zoom, nonce: 0 }
  }, [followMe, me, focusNonce, region, regionMeta])

  const onLocate = () => {
    setFollowMe(true)
    locate(true)
  }

  const pickRegion = (id: typeof region) => {
    setFollowMe(false)   // 지역을 고르면 그 지역이 보여야 한다
    setRegion(id)
  }

  // 배지·패널은 "키가 설정됐는지"가 아니라 "실제로 받은 데이터"를 기준으로 한다
  const sources = useMemo(() => {
    const vals = Object.values(congestion)
    return {
      total: vals.length,
      seoulLive: vals.filter((c) => c.source === 'seoul-live').length,
      forecast: vals.filter((c) => c.source === 'kto-forecast').length,
      demo: vals.filter((c) => c.source === 'demo').length,
    }
  }, [congestion])

  // 실제로 살아 있는 데이터가 하나라도 있으면 LIVE. 아직 로딩 중이면 키 설정값을 임시로 쓴다.
  const isLiveNow = sources.total === 0 ? live : sources.seoulLive + sources.forecast > 0

  const list = useMemo(() => {
    let arr: Spot[] = region === 'all' ? SPOTS : SPOTS.filter((s) => s.region === region)
    if (freeOnly) arr = arr.filter((s) => s.fee.adult === 0)
    if (openOnly) arr = arr.filter((s) => ['open', 'always'].includes(openStatus(s).state))
    if (cat) arr = arr.filter((s) => s.category === cat)
    const dist = (s: Spot) => (me ? distanceKm(me.lat, me.lng, s.lat, s.lng) : Infinity)
    const quiet = (s: Spot) => (congestion[s.id] ? LEVEL_ORDER.indexOf(congestion[s.id].level) : 9)
    const sorted = [...arr]
    if (sort === 'distance' && me) sorted.sort((a, b) => dist(a) - dist(b))
    else if (sort === 'quiet') sorted.sort((a, b) => quiet(a) - quiet(b) || b.popularity - a.popularity)
    else sorted.sort((a, b) => b.popularity - a.popularity)
    return sorted
  }, [region, freeOnly, openOnly, cat, sort, me, congestion])

  const cats = Object.keys(CATEGORY_LABEL) as Category[]

  return (
    <>
      <header className="topbar">
        <div className="brand">
          <div>
            <h1>Korea <span>Now</span></h1>
            <div className="sub">Go when it's quiet · fees · hours · closed days</div>
          </div>
          <button
            className={'pill ' + (isLiveNow ? 'live' : 'demo')}
            onClick={() => setShowSources((v) => !v)}
            aria-expanded={showSources}
            aria-label="What LIVE means"
            title="What LIVE means"          >
            {isLiveNow ? '● LIVE' : '◐ DEMO'} <span className="pill-caret">{showSources ? '▴' : '▾'}</span>
          </button>
        </div>

        {showSources && (
          <div className="sources">
            <div className="sources-title">Where these crowd levels come from</div>
            {sources.total === 0 ? (
              <div className="sources-note">Loading crowd levels…</div>
            ) : (
              <ul>
                {sources.seoulLive > 0 && (
                  <li><b>{sources.seoulLive}</b> Seoul spots &mdash; live sensor counts from Seoul city data, updated every 5 minutes</li>
                )}
                {sources.forecast > 0 && (
                  <li><b>{sources.forecast}</b> spots elsewhere &mdash; Korea Tourism Organization 30-day forecast from mobile-carrier data</li>
                )}
                {sources.demo > 0 && (
                  <li><b>{sources.demo}</b> spots &mdash; estimated from typical daily patterns (no live feed covers them)</li>
                )}
              </ul>
            )}
            <div className="sources-note">
              {isLiveNow
                ? 'LIVE means real crowd data came through. Each spot page names the source it used.'
                : live
                  ? "DEMO means the data server didn't answer this time, so every level is an estimate. It retries every 5 minutes."
                  : 'DEMO means the app has no data server configured, so every level is an estimate.'}
              {refreshedAt
                ? ` Last refreshed ${new Date(refreshedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}.`
                : ''}
            </div>
          </div>
        )}
        <div className="chips">
          {REGIONS.map((r) => (
            <button key={r.id} className={'chip' + (region === r.id ? ' on' : '')} onClick={() => pickRegion(r.id)}>
              {r.label}
            </button>
          ))}
        </div>
      </header>

      <MapView
        spots={list}
        congestion={congestion}
        me={me}
        center={center}
        onLocate={onLocate}
        locating={locating}
        locateError={locateError}
      />

      <div className="page">
        <div className="chips" style={{ paddingTop: 0 }}>
          <button className={'chip free' + (freeOnly ? ' on' : '')} onClick={() => setFreeOnly(!freeOnly)}>🆓 Free only</button>
          <button className={'chip' + (openOnly ? ' on' : '')} onClick={() => setOpenOnly(!openOnly)}>🕒 Open now</button>
          {cats.map((c) => (
            <button key={c} className={'chip' + (cat === c ? ' on' : '')} onClick={() => setCat(cat === c ? null : c)}>
              {CATEGORY_ICON[c]} {CATEGORY_LABEL[c]}
            </button>
          ))}
        </div>
        <div className="chips" style={{ paddingTop: 4 }}>
          <span style={{ fontSize: 12, color: 'var(--muted)', alignSelf: 'center', marginRight: 2 }}>Sort</span>
          <button className={'chip' + (sort === 'distance' ? ' on' : '')} onClick={() => { setSort('distance'); if (!me) locate() }}>Nearest</button>
          <button className={'chip' + (sort === 'quiet' ? ' on' : '')} onClick={() => setSort('quiet')}>Quietest</button>
          <button className={'chip' + (sort === 'popular' ? ' on' : '')} onClick={() => setSort('popular')}>Popular</button>
        </div>

        <div className="section-title">
          {list.length} spots{sort === 'distance' && !me ? ' · tap 📍 for distances' : ''}
        </div>
        {list.length === 0 && <div className="empty">Nothing matches. Try removing a filter.</div>}
        {list.map((s) => (
          <SpotCard
            key={s.id}
            spot={s}
            congestion={congestion[s.id]}
            distanceKm={me ? distanceKm(me.lat, me.lng, s.lat, s.lng) : undefined}
          />
        ))}
        <p className="disclaimer">
          Fees and hours are checked periodically but can change — confirm at the gate for big-ticket items.
          {refreshedAt ? ` Crowd data refreshed ${new Date(refreshedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}.` : ''}
        </p>
      </div>
    </>
  )
}
