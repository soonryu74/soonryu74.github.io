// 초기 데이터(시드). 예시 모드 저장소와 supabase/seed.sql 생성기가 함께 쓴다.
import { createHash } from "node:crypto";
import { CARE_TASK_TEMPLATES } from "@/content/care-task-templates";
import { ZOONOSES } from "@/content/zoonoses";
import { OFFICIAL_CONTACTS } from "@/content/official-contacts";
import { LEGAL_DOCUMENTS } from "@/content/legal-documents";
import { DEMO_FACILITIES } from "@/content/demo-facilities";
import type { ContentCard, ContentVersion, Facility, LegalDocumentRow, OfficialContactRow } from "@/lib/types";

/** 키 문자열에서 결정적 UUID 생성 (시드 재실행 시 같은 id) */
export function stableUuid(key: string): string {
  const h = createHash("sha1").update(`petsafe365:${key}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${((parseInt(h.slice(16, 18), 16) & 0x3f) | 0x80).toString(16)}${h.slice(18, 20)}-${h.slice(20, 32)}`;
}

const SEED_AT = "2026-09-24T00:00:00.000Z";

export function seedTemplates() {
  return CARE_TASK_TEMPLATES.map((t) => ({
    id: stableUuid(`template:${t.key}`),
    key: t.key,
    species: t.species,
    life_stage: t.lifeStage,
    category: t.category,
    title: t.title,
    description: t.description,
    rule_json: t.rule,
    priority: t.priority,
    version: t.version,
    source_id: t.sourceId,
    source_url: t.sourceUrl,
    reviewed_at: t.reviewedAt,
    status: "published" as const,
  }));
}

export function seedContent(): { cards: ContentCard[]; versions: ContentVersion[] } {
  const cards: ContentCard[] = [];
  const versions: ContentVersion[] = [];
  for (const z of ZOONOSES) {
    const cardId = stableUuid(`content:${z.slug}`);
    const versionId = stableUuid(`content:${z.slug}:v${z.version}`);
    versions.push({
      id: versionId,
      content_id: cardId,
      version: z.version,
      title: z.title,
      summary: z.summary,
      body_json: z.body as unknown as Record<string, string[]>,
      source_json: z.sources,
      author_name: z.authorName,
      reviewer_name: null,
      reviewer_credential: null,
      reviewed_at: null,
      next_review_at: null,
      expires_at: null,
      status: "in_review",     // 검수 전에는 공개되지 않는다
      change_reason: z.changeReason,
      created_at: SEED_AT,
    });
    cards.push({
      id: cardId,
      slug: z.slug,
      content_type: "zoonosis",
      species: z.species,
      current_version_id: versionId,
      status: "in_review",
      updated_at: SEED_AT,
    });
  }
  return { cards, versions };
}

export function seedContacts(): OfficialContactRow[] {
  return OFFICIAL_CONTACTS.map((c) => ({
    id: stableUuid(`contact:${c.key}`),
    key: c.key,
    category: c.category,
    organization: c.organization,
    phone: c.phone,
    url: c.url,
    coverage_area: c.coverageArea,
    available_hours: c.availableHours,
    description: c.description,
    verified_at: c.verifiedAt,
    valid_from: null,
    valid_to: null,
    source_url: c.sourceUrl,
    status: c.status,
    sort_order: c.sortOrder,
  }));
}

export function seedLegalDocuments(): LegalDocumentRow[] {
  return LEGAL_DOCUMENTS.map((d) => ({
    id: stableUuid(`legal:${d.type}:${d.version}`),
    document_type: d.type,
    version: d.version,
    title: d.title,
    effective_at: d.effectiveAt,
    body: d.body,
    required: d.required,
    status: "published",
  }));
}

export function seedFacilities(): Facility[] {
  return DEMO_FACILITIES.map((f) => ({
    id: stableUuid(`facility:demo_fixture:${f.sourceId}`),
    facility_type: f.facilityType as Facility["facility_type"],
    name: f.name,
    address: f.address,
    lat: f.lat,
    lng: f.lng,
    phone: f.phone,
    business_status: f.businessStatus,
    source_system: "demo_fixture",
    source_id: f.sourceId,
    source_updated_at: SEED_AT,
    last_synced_at: SEED_AT,
    license: "예시 데이터 (실제 업체 아님)",
    is_example: true,
    details: {
      hours_json: f.hours,
      pet_access_json: f.petAccess,
      emergency_status: f.emergencyStatus,
      specialty_status: "unverified",
      hours_status: f.hoursStatus,
    },
  }));
}
