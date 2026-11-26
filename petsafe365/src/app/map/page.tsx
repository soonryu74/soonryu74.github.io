"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Badge, Button, Card, EmptyState, ErrorState, ExampleBadge, Field, LinkButton, Loading, Notice, PageHeader, SelectField, formatDate } from "@/components/ui";
import { useAsync } from "@/lib/hooks";
import { getRepo } from "@/lib/repo";
import type { Facility } from "@/lib/types";

// label: 화면 표시용, search: 외부 지도 검색어
const TYPES: { key: string; label: string; search: string }[] = [
  { key: "animal_hospital", label: "동물병원", search: "동물병원" },
  { key: "animal_pharmacy", label: "동물약국", search: "동물약국" },
  { key: "shelter", label: "보호센터", search: "동물보호센터" },
  { key: "grooming", label: "미용", search: "반려동물 미용" },
  { key: "boarding", label: "호텔·위탁", search: "반려동물 호텔" },
  { key: "transport", label: "운송", search: "펫택시" },
  { key: "funeral", label: "장례", search: "반려동물 장례" },
  { key: "pet_cafe", label: "동반 카페", search: "반려동물 동반 카페" },
  { key: "park", label: "공원", search: "공원" },
  { key: "playground", label: "놀이터", search: "반려견 놀이터" },
  { key: "lodging", label: "동반 숙소", search: "반려동물 동반 숙소" },
  { key: "restaurant", label: "동반 식당", search: "반려동물 동반 식당" },
  { key: "shopping", label: "용품점", search: "반려동물 용품점" },
];
const typeLabel = (key: string) => TYPES.find((t) => t.key === key)?.label ?? key;
const kakaoSearch = (query: string) => `https://map.kakao.com/link/search/${encodeURIComponent(query)}`;
const BUSINESS: Record<Facility["business_status"], string> = { open: "영업", closed: "폐업", suspended: "휴업", unknown: "미확인" };

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`min-h-12 rounded-full border px-4 text-sm font-semibold ${active ? "border-brand bg-brand text-white" : "border-line bg-card text-ink hover:bg-tint"}`}
    >
      {children}
    </button>
  );
}

type Geo = { status: "idle" } | { status: "asking" } | { status: "ok"; lat: number; lng: number } | { status: "failed"; message: string };

function MapScreen() {
  const params = useSearchParams();
  const [type, setType] = useState<string>(() => {
    const q = params.get("type");
    return q && TYPES.some((t) => t.key === q) ? q : "all";
  });
  const [keyword, setKeyword] = useState("");
  const [searchTypeChoice, setSearchTypeChoice] = useState<string | null>(null);
  const [region, setRegion] = useState("");
  const [regionError, setRegionError] = useState<string | null>(null);
  // 좌표는 이 화면의 상태로만 잠깐 갖고 있고 어디에도 저장하지 않는다.
  const [geo, setGeo] = useState<Geo>({ status: "idle" });

  const facilities = useAsync(() => getRepo().list("facilities", { order: { column: "name" } }), []);

  const searchType = TYPES.find((t) => t.key === (searchTypeChoice ?? (type === "all" ? "animal_hospital" : type))) ?? TYPES[0];

  const findNearby = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeo({ status: "failed", message: "이 기기에서는 위치를 확인할 수 없어요. 아래에서 지역 이름으로 찾아 주세요." });
      return;
    }
    setGeo({ status: "asking" });
    navigator.geolocation.getCurrentPosition(
      (pos) => setGeo({ status: "ok", lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) =>
        setGeo({
          status: "failed",
          message: err.code === err.PERMISSION_DENIED ? "위치 권한이 꺼져 있어요. 괜찮아요, 아래에서 지역 이름으로 찾을 수 있어요." : "지금은 위치를 확인하지 못했어요. 아래에서 지역 이름으로 찾아 주세요.",
        }),
      { timeout: 10000, maximumAge: 0 },
    );
  };

  const openRegionSearch = () => {
    const r = region.trim();
    if (!r) {
      setRegionError("지역이나 역 이름을 적어 주세요.");
      return;
    }
    setRegionError(null);
  };

  const kw = keyword.trim().toLowerCase();
  const rows = (facilities.data ?? []).filter((f) => (type === "all" || f.facility_type === type) && (!kw || f.name.toLowerCase().includes(kw) || f.address.toLowerCase().includes(kw)));

  return (
    <>
      <PageHeader title="주변 시설" description="동물병원, 약국, 보호센터, 동반 장소를 찾아요." />

      <Notice tone="warn">
        공공데이터 연동은 준비 중이에요. 아래 목록은 화면을 보여 주기 위한 예시 데이터이고 실제 장소가 아니에요. 실제 장소는 아래 &lsquo;카카오맵에서 찾기&rsquo;로 확인해 주세요.
      </Notice>

      <Card as="section" className="flex flex-col gap-4">
        <h2 className="text-lg font-bold">실제 장소 찾기</h2>
        <SelectField id="search-type" label="찾을 시설" value={searchType.key} onChange={(e) => setSearchTypeChoice(e.target.value)}>
          {TYPES.map((t) => (
            <option key={t.key} value={t.key}>
              {t.label}
            </option>
          ))}
        </SelectField>

        <div className="flex flex-col gap-2">
          <Button onClick={findNearby} disabled={geo.status === "asking"}>
            {geo.status === "asking" ? "위치 확인 중이에요" : "내 주변 찾기"}
          </Button>
          <p className="text-sm text-muted">버튼을 눌렀을 때만 위치 권한을 요청해요. 위치는 저장하지 않아요.</p>
          <div aria-live="polite">
            {geo.status === "ok" ? (
              <div className="flex flex-col gap-2 rounded-[14px] bg-tint p-3">
                <p>위치를 확인했어요. 카카오맵에서 &lsquo;{searchType.search}&rsquo; 검색 결과를 열 수 있어요.</p>
                <LinkButton href={kakaoSearch(searchType.search)} variant="safe" className="w-full">
                  카카오맵에서 내 주변 {searchType.label} 보기
                </LinkButton>
                <p className="text-sm text-muted">카카오맵이 열리면 &lsquo;현재 위치&rsquo; 버튼으로 내 주변에 맞춰 주세요. 펫안심365는 좌표를 카카오맵이나 서버로 보내지 않아요.</p>
              </div>
            ) : null}
            {geo.status === "failed" ? <Notice>{geo.message}</Notice> : null}
          </div>
        </div>

        <form
          className="flex flex-col gap-3 border-t border-line pt-4"
          onSubmit={(e) => {
            e.preventDefault();
            openRegionSearch();
          }}
        >
          <Field
            id="region"
            label="지역이나 역 이름"
            placeholder="예: 서초동, 강남역"
            value={region}
            onChange={(e) => {
              setRegion(e.target.value);
              setRegionError(null);
            }}
            error={regionError}
            hint="위치 권한 없이도 찾을 수 있어요. 새 창에서 카카오맵이 열려요."
          />
          {/* 새 창 열기는 환경에 따라 막힐 수 있어, 지역을 적으면 실제 링크를 보여 준다. */}
          {region.trim() ? (
            <LinkButton href={kakaoSearch(`${region.trim()} ${searchType.search}`)} variant="ghost">
              카카오맵에서 {searchType.label} 찾기
            </LinkButton>
          ) : (
            <Button type="submit" variant="ghost">
              카카오맵에서 {searchType.label} 찾기
            </Button>
          )}
        </form>
      </Card>

      <Card className="text-sm text-muted">
        <p className="font-semibold text-ink">지도 표시는 준비 중</p>
        <p className="mt-1">
          화면 안 지도는 카카오맵 키(<code className="break-all">NEXT_PUBLIC_KAKAO_MAP_APP_KEY</code>)를 등록한 뒤에 열려요. 그 전에는 목록과 카카오맵 검색으로 안내해요.
        </p>
      </Card>

      <section aria-label="시설 목록" className="flex flex-col gap-4">
        <h2 className="text-lg font-bold">시설 목록</h2>
        <div role="group" aria-label="시설 유형" className="flex flex-wrap gap-2">
          <Chip active={type === "all"} onClick={() => setType("all")}>
            전체
          </Chip>
          {TYPES.map((t) => (
            <Chip key={t.key} active={type === t.key} onClick={() => setType(t.key)}>
              {t.label}
            </Chip>
          ))}
        </div>
        <Field id="keyword" label="이름·주소로 걸러 보기" optional value={keyword} onChange={(e) => setKeyword(e.target.value)} />

        {facilities.loading ? (
          <Loading />
        ) : facilities.error ? (
          <ErrorState onRetry={facilities.reload} />
        ) : rows.length === 0 ? (
          <EmptyState
            title="조건에 맞는 시설이 없어요"
            description="유형이나 검색어를 바꿔 보세요. 공공데이터 연동 전이라 목록이 아주 적어요."
            action={
              <Button
                variant="ghost"
                onClick={() => {
                  setType("all");
                  setKeyword("");
                }}
              >
                조건 지우기
              </Button>
            }
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {rows.map((f) => (
              <Card as="li" key={f.id} className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="brand">{typeLabel(f.facility_type)}</Badge>
                  {f.is_example ? <ExampleBadge /> : null}
                </div>
                <Link href={`/facilities/${f.id}`} className="break-words text-lg font-bold underline-offset-2 hover:underline">
                  {f.name}
                </Link>
                <p className="break-words text-muted">{f.address}</p>
                <div className="flex flex-wrap gap-2">
                  <Badge>허가상 영업 상태: {BUSINESS[f.business_status]}</Badge>
                  <Badge>운영시간: {f.hours_status === "verified" ? "확인됨" : "미확인"}</Badge>
                  <Badge>24시간·응급: {f.emergency_status === "verified" ? "확인됨" : "미확인"}</Badge>
                </div>
                <p className="break-words text-sm text-muted">
                  출처: {f.source_system === "example" ? "예시 데이터" : f.source_system} · 동기화일: {f.source_updated_at ? formatDate(f.source_updated_at) : "동기화 전"}
                </p>
                <LinkButton href={`/facilities/${f.id}`} variant="ghost">
                  자세히 보기
                </LinkButton>
              </Card>
            ))}
          </ul>
        )}
        <p className="text-sm text-muted">목록 순서는 이름순이에요. 검색 순위는 판매하지 않아요.</p>
      </section>
    </>
  );
}

export default function MapPage() {
  return (
    <Suspense fallback={<Loading />}>
      <MapScreen />
    </Suspense>
  );
}
