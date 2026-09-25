"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Facility } from "@/lib/types";
import { FACILITY_ICONS, FACILITY_LABELS, BUSINESS_STATUS_LABELS } from "@/lib/facility-labels";
import { haversineKm, kakaoDirectionsUrl, kakaoSearchUrl } from "@/lib/geo";
import { telHref } from "@/lib/contacts";
import { formatKst } from "@/lib/dates";

type Center = { lat: number; lng: number; label: string };
type GeoState = "idle" | "asking" | "denied" | "unavailable" | "ok";

declare global { interface Window { kakao?: { maps: { load: (cb: () => void) => void; LatLng: new (a: number, b: number) => unknown; Map: new (el: HTMLElement, o: unknown) => { setCenter: (c: unknown) => void }; Marker: new (o: unknown) => unknown } } } }

export function MapClient({ facilities, kakaoMapKey, geocodeAvailable, query, lastSynced, hasExample, fromEmergency }: {
  facilities: Facility[]; kakaoMapKey: string; geocodeAvailable: boolean; query: string; lastSynced: string | null; hasExample: boolean; fromEmergency: boolean;
}) {
  const [center, setCenter] = useState<Center | null>(null);
  const [geo, setGeo] = useState<GeoState>("idle");
  const [geoMsg, setGeoMsg] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  // 주소 검색어가 있고 서버 지오코딩(카카오 REST 키)이 가능하면 중심 좌표를 얻는다. 좌표는 저장하지 않는다.
  useEffect(() => {
    if (!query || !geocodeAvailable) return;
    let alive = true;
    fetch(`/api/geocode?q=${encodeURIComponent(query)}`).then((r) => r.ok ? r.json() : null).then((j) => {
      if (alive && j?.lat) setCenter({ lat: j.lat, lng: j.lng, label: j.label ?? query });
    }).catch(() => undefined);
    return () => { alive = false; };
  }, [query, geocodeAvailable]);

  // 위치 권한은 버튼을 눌렀을 때만 요청. 좌표는 이 화면(브라우저 메모리)에서만 쓰고 서버에 보내지 않는다.
  function findNearMe() {
    if (!("geolocation" in navigator)) { setGeo("unavailable"); setGeoMsg("이 브라우저는 위치 기능을 지원하지 않아요. 주소로 검색해 주세요."); return; }
    setGeo("asking"); setGeoMsg("위치 권한을 요청하고 있어요…");
    navigator.geolocation.getCurrentPosition(
      (pos) => { setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude, label: "현재 위치" }); setGeo("ok"); setGeoMsg("현재 위치 기준 가까운 순으로 정렬했어요. 위치는 저장되지 않아요."); },
      (err) => {
        setGeo(err.code === err.PERMISSION_DENIED ? "denied" : "unavailable");
        setGeoMsg(err.code === err.PERMISSION_DENIED ? "위치 권한이 거부됐어요. 위의 주소·동네 검색으로도 찾을 수 있어요." : "현재 위치를 확인하지 못했어요. 주소·동네로 검색해 주세요.");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  }

  const list = useMemo(() => {
    const withDist = facilities.map((f) => ({ f, km: center && f.lat != null && f.lng != null ? haversineKm(center, { lat: f.lat, lng: f.lng }) : null }));
    if (center) withDist.sort((a, b) => (a.km ?? 1e9) - (b.km ?? 1e9));
    return withDist;
  }, [facilities, center]);

  // 카카오 지도 (키가 있을 때만)
  useEffect(() => {
    if (!kakaoMapKey || !mapRef.current) return;
    const el = mapRef.current;
    const draw = () => window.kakao!.maps.load(() => {
      const k = window.kakao!.maps;
      const first = list.find((x) => x.f.lat != null);
      const c = center ?? (first ? { lat: first.f.lat!, lng: first.f.lng! } : { lat: 37.5665, lng: 126.978 });
      const map = new k.Map(el, { center: new k.LatLng(c.lat, c.lng), level: 5 });
      for (const { f } of list) if (f.lat != null && f.lng != null) new k.Marker({ map, position: new k.LatLng(f.lat, f.lng), title: f.name });
    });
    if (window.kakao?.maps) { draw(); return; }
    const s = document.createElement("script");
    s.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(kakaoMapKey)}&autoload=false`;
    s.async = true;
    s.onload = draw;
    document.head.appendChild(s);
  }, [kakaoMapKey, list, center]);

  return (
    <div className="space-y-3">
      {fromEmergency && <p className="card border-danger border-2 font-bold">위급하면 목록에서 전화 버튼을 눌러 진료 가능 여부부터 확인하세요.</p>}
      <div className="card flex flex-wrap items-center gap-2">
        <button type="button" onClick={findNearMe} className="btn btn-primary" disabled={geo === "asking"}>📍 내 주변 찾기</button>
        <p className="text-sm text-muted flex-1 min-w-[12rem]" role="status" aria-live="polite">{geoMsg ?? "버튼을 누를 때만 위치 권한을 요청해요. 위치는 저장하지 않아요."}</p>
      </div>
      {center && center.label !== "현재 위치" && <p className="text-sm">‘{center.label}’ 기준 가까운 순</p>}
      {!geocodeAvailable && query && <p className="text-sm text-muted">주소를 좌표로 바꾸는 기능은 카카오 키 설정 후 켜져요. 지금은 주소·이름에 &lsquo;{query}&rsquo;가 들어간 시설을 보여줘요.</p>}

      {kakaoMapKey ? (
        <div ref={mapRef} className="w-full h-72 rounded-2xl border border-line bg-slate-100" role="img" aria-label="시설 위치 지도. 같은 내용이 아래 목록에 있어요." />
      ) : (
        <p className="card text-sm text-muted">지도 표시는 준비 중이에요(카카오 지도 키 설정 필요). 아래 목록과 길찾기 링크로 이용할 수 있어요.</p>
      )}

      <div className="text-xs text-muted flex flex-wrap gap-x-3">
        <span>결과 {list.length}곳</span>
        {lastSynced && <span>최근 동기화 {formatKst(lastSynced)}</span>}
        {hasExample && <span className="badge badge-warn">예시 데이터 포함 — 실제 업체가 아니에요</span>}
      </div>

      {list.length === 0 ? (
        <div className="card text-center py-8">
          <p className="h3">조건에 맞는 시설이 없어요</p>
          <p className="text-muted mt-1">종류나 검색어를 바꿔 보세요. 공공데이터가 아직 연결되지 않았다면 카카오맵에서 직접 찾을 수 있어요.</p>
          <a className="btn btn-outline mt-3" href={kakaoSearchUrl(query || "동물병원")} target="_blank" rel="noopener noreferrer">카카오맵에서 &lsquo;{query || "동물병원"}&rsquo; 검색<span className="sr-only"> (새 창)</span></a>
        </div>
      ) : (
        <ul className="space-y-2">
          {list.map(({ f, km }) => (
            <li key={f.id} className="card">
              <div className="flex items-start gap-2">
                <span aria-hidden="true" className="text-2xl">{FACILITY_ICONS[f.facility_type]}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <span className="badge badge-muted">{FACILITY_LABELS[f.facility_type]}</span>
                    <span className={`badge ${f.business_status === "open" ? "badge-ok" : f.business_status === "closed" ? "badge-danger" : "badge-muted"}`}>{BUSINESS_STATUS_LABELS[f.business_status]}</span>
                    {f.facility_type === "animal_hospital" && <span className={`badge ${f.details?.emergency_status === "verified" ? "badge-ok" : "badge-muted"}`}>{f.details?.emergency_status === "verified" ? "응급 진료 확인됨" : "24시간·응급 미확인"}</span>}
                    {f.is_example && <span className="badge badge-warn">예시 데이터</span>}
                  </div>
                  <h3 className="h3 mt-1 break-words"><Link href={`/facilities/${f.id}`} className="hover:underline">{f.name}</Link></h3>
                  <p className="text-sm text-muted break-words">{f.address}{km != null ? ` · 약 ${km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`}` : ""}</p>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {f.phone ? <a href={telHref(f.phone)} className="btn btn-primary btn-sm">📞 전화</a> : <span className="btn btn-outline btn-sm" aria-disabled="true">전화번호 없음</span>}
                {f.lat != null && f.lng != null && <a href={kakaoDirectionsUrl(f.name, f.lat, f.lng)} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">길찾기<span className="sr-only"> (카카오맵 새 창)</span></a>}
                <Link href={`/facilities/${f.id}`} className="btn btn-outline btn-sm">상세·출처</Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
