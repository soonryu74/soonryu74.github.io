import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getStore } from "@/lib/session";
import { StatusBadge } from "@/components/ui";
import { BUSINESS_STATUS_LABELS, FACILITY_LABELS, PET_ACCESS_LABELS } from "@/lib/facility-labels";
import { kakaoDirectionsUrl } from "@/lib/geo";
import { telHref } from "@/lib/contacts";
import { formatKst } from "@/lib/dates";
import { ReportForm } from "./report-form";

export const metadata: Metadata = { title: "시설 상세" };

const PET_TYPES = ["pet_cafe", "park", "playground", "lodging", "restaurant", "shopping"];

function show(v: string | boolean | null | undefined): string {
  if (v === true) return "예";
  if (v === false) return "아니요";
  if (v == null || v === "") return "미확인";
  return String(v);
}

export default async function FacilityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const store = await getStore();
  const f = await store.getFacility(id);
  if (!f) notFound();
  const d = f.details;
  const hours = d?.hours_json ?? {};
  return (
    <div className="space-y-4">
      <div>
        <Link href="/map" className="link text-sm">← 주변 시설</Link>
        <div className="flex flex-wrap gap-1.5 mt-2">
          <span className="badge badge-muted">{FACILITY_LABELS[f.facility_type]}</span>
          {f.is_example && <span className="badge badge-warn">예시 데이터 — 실제 업체 아님</span>}
        </div>
        <h1 className="h1 mt-1 break-words">{f.name}</h1>
        <p className="text-muted break-words">{f.address}</p>
      </div>

      <section className="card" aria-labelledby="act-h">
        <h2 id="act-h" className="sr-only">연락·길찾기</h2>
        <div className="flex flex-wrap gap-2">
          {f.phone ? <a className="btn btn-primary" href={telHref(f.phone)}>📞 {f.phone}</a> : <span className="btn btn-outline" aria-disabled="true">전화번호 정보 없음</span>}
          {f.lat != null && f.lng != null && <a className="btn btn-outline" href={kakaoDirectionsUrl(f.name, f.lat, f.lng)} target="_blank" rel="noopener noreferrer">길찾기<span className="sr-only"> (카카오맵 새 창)</span></a>}
        </div>
        <p className="hint mt-2">방문 전에 전화로 진료·영업 여부를 확인하세요.</p>
      </section>

      <section className="card" aria-labelledby="status-h">
        <h2 id="status-h" className="h2 mb-2">상태 (서로 다른 정보예요)</h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
          <dt className="font-bold">허가상 영업</dt>
          <dd><span className={`badge ${f.business_status === "open" ? "badge-ok" : f.business_status === "closed" ? "badge-danger" : "badge-muted"}`}>{BUSINESS_STATUS_LABELS[f.business_status]}</span> <span className="text-xs text-muted">인허가 데이터 기준</span></dd>
          <dt className="font-bold">운영시간 확인</dt>
          <dd><StatusBadge state={d?.hours_status ?? "unverified"} labels={["확인됨", "미확인", "정보 불일치 신고됨"]} />
            {Object.keys(hours).length > 0 && <span className="block text-sm">{Object.entries(hours).map(([k, v]) => `${k === "weekday" ? "평일" : k === "daily" ? "매일" : k === "note" ? "" : k} ${v}`.trim()).join(" · ")}</span>}</dd>
          <dt className="font-bold">실제 영업 중</dt>
          <dd><span className="badge badge-muted">? 실시간 정보 없음</span> <span className="text-xs text-muted">전화로 확인하세요</span></dd>
          {f.facility_type === "animal_hospital" && (<>
            <dt className="font-bold">24시간·응급</dt>
            <dd><StatusBadge state={d?.emergency_status ?? "unverified"} labels={["사업자 확인됨", "미확인", "정보 불일치"]} /></dd>
            <dt className="font-bold">전문 진료</dt>
            <dd><StatusBadge state={d?.specialty_status ?? "unverified"} labels={["사업자 확인됨", "미확인", "정보 불일치"]} /></dd>
          </>)}
        </dl>
      </section>

      {PET_TYPES.includes(f.facility_type) && (
        <section className="card" aria-labelledby="pet-h">
          <h2 id="pet-h" className="h2 mb-2">반려동물 동반 조건</h2>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
            {Object.keys(PET_ACCESS_LABELS).map((k) => (
              <div key={k} className="contents"><dt className="font-bold">{PET_ACCESS_LABELS[k]}</dt><dd>{show(d?.pet_access_json?.[k])}</dd></div>
            ))}
          </dl>
          <p className="hint mt-2">동반 가능 여부는 바뀔 수 있어요. 방문 전 전화로 확인하는 것을 기본으로 해 주세요.</p>
        </section>
      )}

      <section className="card" aria-labelledby="src-h">
        <h2 id="src-h" className="h2 mb-2">출처</h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="font-bold">데이터 출처</dt><dd>{f.source_system === "demo_fixture" ? "예시 데이터(개발용)" : f.source_system}</dd>
          <dt className="font-bold">라이선스</dt><dd>{f.license ?? "미기록"}</dd>
          <dt className="font-bold">원본 갱신</dt><dd>{f.source_updated_at ? formatKst(f.source_updated_at) : "미기록"}</dd>
          <dt className="font-bold">최근 동기화</dt><dd>{f.last_synced_at ? formatKst(f.last_synced_at) : "미기록"}</dd>
        </dl>
        <p className="hint mt-2">광고·유료 노출은 없어요. 파트너 광고가 생기면 &lsquo;광고&rsquo; 표시와 함께 자연 검색과 분리돼요.</p>
      </section>

      <section className="card" aria-labelledby="rep-h">
        <h2 id="rep-h" className="h2 mb-2">정보가 달라요</h2>
        {store.user ? <ReportForm facilityId={f.id} /> : <p className="text-muted"><Link className="link" href={`/login?next=/facilities/${f.id}`}>로그인</Link>하면 오류를 신고할 수 있어요.</p>}
      </section>
    </div>
  );
}
