import { useEffect } from 'react'
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import { useNavigate } from 'react-router-dom'
import type { Congestion, Spot } from '../types'
import { CATEGORY_ICON } from '../data/spots'
import { LEVEL_META } from '../lib/congestion'

const TILE_URL = (import.meta.env.VITE_TILE_URL as string | undefined) || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'

interface Props {
  spots: Spot[]
  congestion: Record<string, Congestion>
  me: { lat: number; lng: number } | null
  // nonce: 같은 좌표를 다시 눌러도 지도가 다시 움직이도록 하는 일련번호
  center: { lat: number; lng: number; zoom: number; nonce: number }
  onLocate: () => void
  locating: boolean
  locateError: string | null
}

// 지역 선택이 바뀌거나 위치 버튼을 누르면 지도를 그쪽으로 이동
function FlyTo({ center }: { center: Props['center'] }) {
  const map = useMap()
  useEffect(() => {
    map.flyTo([center.lat, center.lng], center.zoom, { duration: 0.8 })
  }, [map, center.lat, center.lng, center.zoom, center.nonce])
  return null
}

function spotIcon(spot: Spot, c?: Congestion) {
  const color = c ? LEVEL_META[c.level].color : '#9ca3af'
  return L.divIcon({
    className: '',
    html: `<div class="marker" style="background:${color}">${CATEGORY_ICON[spot.category]}</div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  })
}

// 내 위치: 파란 점 + 퍼지는 링 (지도에서 눈에 띄도록)
const meIcon = L.divIcon({ className: '', html: '<div class="marker-me"><i></i></div>', iconSize: [20, 20], iconAnchor: [10, 10] })

export default function MapView({ spots, congestion, me, center, onLocate, locating, locateError }: Props) {
  const nav = useNavigate()
  return (
    <div className="map-wrap">
      <MapContainer center={[center.lat, center.lng]} zoom={center.zoom} zoomControl={false} attributionControl>
        <TileLayer url={TILE_URL} attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />
        <FlyTo center={center} />
        {spots.map((s) => (
          <Marker
            key={s.id}
            position={[s.lat, s.lng]}
            icon={spotIcon(s, congestion[s.id])}
            eventHandlers={{ click: () => nav(`/spot/${s.id}`) }}
          />
        ))}
        {me && <Marker position={[me.lat, me.lng]} icon={meIcon} interactive={false} />}
      </MapContainer>
      <div className="map-hint">
        <div className="legend">
          {(['relaxed', 'normal', 'busy', 'crowded'] as const).map((l) => (
            <span key={l}><i style={{ background: LEVEL_META[l].color }} />{LEVEL_META[l].label}</span>
          ))}
        </div>
      </div>
      <button
        className={'locate-btn' + (locating ? ' busy' : '') + (me ? ' has-fix' : '')}
        onClick={onLocate}
        aria-label="Show my location on the map"
        title="Show my location on the map"
      >
        {locating ? <span className="spin">◌</span> : '📍'}
      </button>
      {locateError && <div className="locate-error">{locateError}</div>}
    </div>
  )
}
