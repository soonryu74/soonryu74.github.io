// 전국 동물병원 인허가 데이터 → facilities 정규화.
// 원본 필드명은 LOCALDATA(지방행정 인허가) 표준 필드를 기준으로 했다.
// ⚠ 행정안전부 '동물_동물병원 조회서비스'(data.go.kr 15154952)의 실제 응답 필드명은 키 발급 후
//   docs/data-sources.md 절차대로 확인하고 FIELD_MAP만 고치면 된다.
import { epsg5174ToWgs84 } from "@/lib/geo";

export const SOURCE_SYSTEM = "data_go_kr_animal_hospital";

export const FIELD_MAP = {
  id: ["MNG_NO", "mgtNo", "관리번호"],
  name: ["BPLC_NM", "bplcNm", "사업장명"],
  roadAddress: ["ROAD_NM_ADDR", "rdnWhlAddr", "도로명전체주소"],
  address: ["LOTNO_ADDR", "siteWhlAddr", "소재지전체주소"],
  phone: ["TELNO", "siteTel", "소재지전화"],
  x: ["CRD_INFO_X", "x", "좌표정보x(epsg5174)"],
  y: ["CRD_INFO_Y", "y", "좌표정보y(epsg5174)"],
  status: ["SALS_STTS_NM", "trdStateNm", "영업상태명"],
  detailStatus: ["DTL_SALS_STTS_NM", "dtlStateNm", "상세영업상태명"],
  updatedAt: ["LAST_MDFCN_PNT", "lastModTs", "최종수정시점"],
} as const;

type Raw = Record<string, unknown>;

function pick(r: Raw, keys: readonly string[]): string | null {
  for (const k of keys) {
    const v = r[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
  }
  return null;
}

export type NormalizedFacility = {
  facility_type: "animal_hospital";
  name: string;
  address: string | null;
  road_address: string | null;
  lat: number | null;
  lng: number | null;
  coord_source: "epsg5174_converted" | null;
  phone: string | null;
  business_status: "open" | "closed" | "suspended" | "unknown";
  source_system: string;
  source_id: string;
  source_updated_at: string | null;
  license: string;
  is_example: boolean;
};

export function mapStatus(status: string | null, detail: string | null): NormalizedFacility["business_status"] {
  const s = `${status ?? ""} ${detail ?? ""}`;
  if (/폐업|취소|말소/.test(s)) return "closed";
  if (/휴업/.test(s)) return "suspended";
  if (/영업|정상/.test(s)) return "open";
  return "unknown";
}

function toIso(v: string | null): string | null {
  if (!v) return null;
  const m = v.match(/^(\d{4})-?(\d{2})-?(\d{2})(?:[ T]?(\d{2}):?(\d{2}):?(\d{2}))?/);
  if (!m) return null;
  return new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4] ?? "00"}:${m[5] ?? "00"}:${m[6] ?? "00"}+09:00`).toISOString();
}

export type NormalizeResult = { ok: true; row: NormalizedFacility; conversion: string | null } | { ok: false; reason: string };

export function normalizeHospital(r: Raw, opts: { isExample?: boolean } = {}): NormalizeResult {
  const id = pick(r, FIELD_MAP.id);
  const name = pick(r, FIELD_MAP.name);
  if (!id) return { ok: false, reason: "missing source id" };
  if (!name) return { ok: false, reason: `missing name (${id})` };
  const x = Number(pick(r, FIELD_MAP.x));
  const y = Number(pick(r, FIELD_MAP.y));
  const coord = epsg5174ToWgs84(x, y);
  const phone = pick(r, FIELD_MAP.phone);
  return {
    ok: true,
    conversion: coord ? `EPSG:5174(${x},${y}) → WGS84(${coord.lat},${coord.lng})` : null,
    row: {
      facility_type: "animal_hospital",
      name,
      address: pick(r, FIELD_MAP.address),
      road_address: pick(r, FIELD_MAP.roadAddress),
      lat: coord?.lat ?? null,
      lng: coord?.lng ?? null,
      coord_source: coord ? "epsg5174_converted" : null,
      phone: phone && /^[0-9+\-() ]{3,20}$/.test(phone) ? phone : null,
      business_status: mapStatus(pick(r, FIELD_MAP.status), pick(r, FIELD_MAP.detailStatus)),
      source_system: opts.isExample ? "demo_fixture_import" : SOURCE_SYSTEM,
      source_id: id,
      source_updated_at: toIso(pick(r, FIELD_MAP.updatedAt)),
      license: opts.isExample ? "예시 데이터 (실제 업체 아님)" : "공공데이터포털 이용허락 (출처표시)",
      is_example: opts.isExample ?? false,
    },
  };
}

export type UpsertPlan = { insert: NormalizedFacility[]; update: NormalizedFacility[]; statusChanges: { source_id: string; from: string; to: string }[]; skipped: string[] };

/** source_system + source_id 기준 upsert 계획. 폐업은 삭제하지 않고 상태만 바꾼다. */
export function planUpsert(incoming: NormalizedFacility[], existing: Pick<NormalizedFacility, "source_system" | "source_id" | "business_status" | "source_updated_at">[]): UpsertPlan {
  const byKey = new Map(existing.map((e) => [`${e.source_system}|${e.source_id}`, e]));
  const seen = new Set<string>();
  const plan: UpsertPlan = { insert: [], update: [], statusChanges: [], skipped: [] };
  for (const row of incoming) {
    const key = `${row.source_system}|${row.source_id}`;
    if (seen.has(key)) { plan.skipped.push(`duplicate in batch: ${row.source_id}`); continue; }
    seen.add(key);
    const prev = byKey.get(key);
    if (!prev) { plan.insert.push(row); continue; }
    if (prev.source_updated_at && row.source_updated_at && prev.source_updated_at >= row.source_updated_at && prev.business_status === row.business_status) {
      plan.skipped.push(`unchanged: ${row.source_id}`);
      continue;
    }
    if (prev.business_status !== row.business_status) plan.statusChanges.push({ source_id: row.source_id, from: prev.business_status, to: row.business_status });
    plan.update.push(row);
  }
  return plan;
}

/** 이름·주소가 거의 같은 시설 = 중복 병합 후보 (자동 병합하지 않고 관리자 검토) */
export function mergeCandidates(rows: Pick<NormalizedFacility, "source_id" | "name" | "road_address" | "address">[]): [string, string][] {
  const norm = (s: string | null) => (s ?? "").replace(/\s|\(.*?\)|동물병원|동물의료센터/g, "");
  const out: [string, string][] = [];
  for (let i = 0; i < rows.length; i++) for (let j = i + 1; j < rows.length; j++) {
    const a = rows[i], b = rows[j];
    if (norm(a.name) === norm(b.name) && norm(a.road_address ?? a.address) === norm(b.road_address ?? b.address)) out.push([a.source_id, b.source_id]);
  }
  return out;
}
