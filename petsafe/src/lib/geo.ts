// 좌표 유틸: 거리 계산, EPSG:5174(중부원점 Bessel, 구 지적좌표) → WGS84 변환
import proj4 from "proj4";

// EPSG:5174 — Korean 1985 / Modified Central Belt (towgs84는 국토지리정보원 공시값)
proj4.defs(
  "EPSG:5174",
  "+proj=tmerc +lat_0=38 +lon_0=127.0028902777778 +k=1 +x_0=200000 +y_0=500000 +ellps=bessel +units=m +no_defs +towgs84=-115.80,474.99,674.11,1.16,-2.31,-1.63,6.43",
);

export function epsg5174ToWgs84(x: number, y: number): { lat: number; lng: number } | null {
  if (!Number.isFinite(x) || !Number.isFinite(y) || x === 0 || y === 0) return null;
  const [lng, lat] = proj4("EPSG:5174", "WGS84", [x, y]);
  // 대한민국 범위 밖이면 변환 실패로 본다
  if (lat < 32 || lat > 39.5 || lng < 124 || lng > 132) return null;
  return { lat: Math.round(lat * 1e7) / 1e7, lng: Math.round(lng * 1e7) / 1e7 };
}

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function kakaoDirectionsUrl(name: string, lat: number, lng: number): string {
  return `https://map.kakao.com/link/to/${encodeURIComponent(name)},${lat},${lng}`;
}

export function kakaoSearchUrl(query: string): string {
  return `https://map.kakao.com/link/search/${encodeURIComponent(query)}`;
}
