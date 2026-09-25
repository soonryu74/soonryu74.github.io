import type { Metadata } from "next";
import { getStore } from "@/lib/session";
import { PageHeader, ErrorNote } from "@/components/ui";
import { FACILITY_LABELS, isFacilityType } from "@/lib/facility-labels";
import { publicEnv, serverEnv } from "@/lib/env";
import type { Facility, FacilityType } from "@/lib/types";
import { MapClient } from "./map-client";

export const metadata: Metadata = { title: "주변 시설" };

export default async function MapPage({ searchParams }: { searchParams: Promise<{ type?: string | string[]; q?: string; closed?: string; from?: string }> }) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.type) ? sp.type : sp.type ? [sp.type] : [];
  const types = raw.filter(isFacilityType) as FacilityType[];
  const q = (sp.q ?? "").trim().slice(0, 60);
  const store = await getStore();
  let facilities: Facility[] = [];
  let error: string | null = null;
  try {
    facilities = await store.listFacilities({ types, q: q || undefined, includeClosed: sp.closed === "1" });
  } catch {
    error = "시설 정보를 불러오지 못했어요. 잠시 후 다시 시도하거나, 급하면 카카오맵에서 직접 검색하세요.";
  }
  const lastSynced = facilities.map((f) => f.last_synced_at).filter(Boolean).sort().at(-1) ?? null;
  const hasExample = facilities.some((f) => f.is_example);
  return (
    <div className="space-y-4">
      <PageHeader title="주변 시설" lead="동물병원·약국·보호센터·동반 장소. 공공데이터 기반이며 출처와 동기화일을 함께 보여줘요." />
      <form method="get" className="card space-y-3" role="search" aria-label="시설 검색">
        <fieldset>
          <legend className="label mb-1">시설 종류</legend>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(FACILITY_LABELS) as FacilityType[]).map((t) => (
              <label key={t} className="btn btn-outline btn-sm has-[:checked]:border-primary has-[:checked]:bg-[#E6F4F1]">
                <input type="checkbox" name="type" value={t} defaultChecked={types.includes(t)} className="accent-[#0F766E]" /> {FACILITY_LABELS[t]}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="grid sm:grid-cols-[1fr_auto] gap-2 items-end">
          <div className="field">
            <label htmlFor="map-q" className="label">주소·동네·시설 이름</label>
            <input id="map-q" name="q" defaultValue={q} className="input" placeholder="예: 중구, 종로구 예시길" />
          </div>
          <label className="flex items-center gap-2 text-sm min-h-[48px]"><input type="checkbox" name="closed" value="1" defaultChecked={sp.closed === "1"} className="size-4 accent-[#0F766E]" /> 폐업·휴업 포함</label>
        </div>
        <button type="submit" className="btn btn-primary w-full sm:w-auto">검색</button>
      </form>
      {error ? <ErrorNote message={error} /> : (
        <MapClient
          facilities={facilities}
          kakaoMapKey={publicEnv().kakaoMapKey}
          geocodeAvailable={!!serverEnv().kakaoRestKey}
          query={q}
          lastSynced={lastSynced}
          hasExample={hasExample}
          fromEmergency={sp.from === "emergency"}
        />
      )}
    </div>
  );
}
