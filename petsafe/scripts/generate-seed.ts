// src/content/* → supabase/seed.sql 생성. 실행: npm run seed:generate
import { writeFileSync } from "node:fs";
import path from "node:path";
import { seedContacts, seedContent, seedFacilities, seedLegalDocuments, seedTemplates } from "../src/lib/seed";

const q = (v: unknown): string => {
  if (v === null || v === undefined) return "null";
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "number") return String(v);
  if (Array.isArray(v) && v.every((x) => typeof x === "string")) return `array[${v.map(q).join(",")}]::text[]`;
  if (typeof v === "object") return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
  return `'${String(v).replace(/'/g, "''")}'`;
};

const lines: string[] = [
  "-- 자동 생성 파일: npm run seed:generate (src/content/* 기준). 직접 수정하지 말 것.",
  "-- 감염병 콘텐츠는 in_review 상태로 들어가며, 관리자 CMS에서 검수자·검토일을 기록해 승인·게시해야 공개된다.",
  "-- 시설은 모두 예시 데이터(is_example=true)다.",
  "begin;",
];

for (const t of seedTemplates()) {
  lines.push(`insert into public.care_task_templates (id, key, species, life_stage, category, title, description, rule_json, priority, version, source_id, source_url, reviewed_at, status) values (${[t.id, t.key, t.species, t.life_stage, t.category, t.title, t.description, t.rule_json, t.priority, t.version, t.source_id, t.source_url, t.reviewed_at, t.status].map(q).join(", ")}) on conflict (key) do update set title = excluded.title, description = excluded.description, rule_json = excluded.rule_json, priority = excluded.priority, version = excluded.version, reviewed_at = excluded.reviewed_at;`);
}

const { cards, versions } = seedContent();
for (const c of cards) {
  lines.push(`insert into public.content_cards (id, slug, content_type, species, status) values (${[c.id, c.slug, c.content_type, c.species, c.status].map(q).join(", ")}) on conflict (slug) do nothing;`);
}
for (const v of versions) {
  lines.push(`insert into public.content_versions (id, content_id, version, title, summary, body_json, source_json, author_name, status, change_reason) values (${[v.id, v.content_id, v.version, v.title, v.summary, v.body_json, v.source_json, v.author_name, v.status, v.change_reason].map(q).join(", ")}) on conflict (content_id, version) do nothing;`);
}
for (const c of cards) {
  lines.push(`update public.content_cards set current_version_id = ${q(c.current_version_id)} where id = ${q(c.id)} and current_version_id is null;`);
}

for (const c of seedContacts()) {
  lines.push(`insert into public.official_contacts (id, key, category, organization, phone, url, coverage_area, available_hours, description, verified_at, source_url, status, sort_order) values (${[c.id, c.key, c.category, c.organization, c.phone, c.url, c.coverage_area, c.available_hours, c.description, c.verified_at, c.source_url, c.status, c.sort_order].map(q).join(", ")}) on conflict (key) do nothing;`);
}

for (const d of seedLegalDocuments()) {
  lines.push(`insert into public.legal_documents (id, document_type, version, title, effective_at, body, required, status) values (${[d.id, d.document_type, d.version, d.title, d.effective_at, d.body, d.required, d.status].map(q).join(", ")}) on conflict (document_type, version) do nothing;`);
}

for (const f of seedFacilities()) {
  lines.push(`insert into public.facilities (id, facility_type, name, address, lat, lng, coord_source, phone, business_status, source_system, source_id, source_updated_at, license, is_example, last_synced_at) values (${[f.id, f.facility_type, f.name, f.address, f.lat, f.lng, "wgs84", f.phone, f.business_status, f.source_system, f.source_id, f.source_updated_at, f.license, f.is_example, f.last_synced_at].map(q).join(", ")}) on conflict (source_system, source_id) do nothing;`);
  const d = f.details!;
  lines.push(`insert into public.facility_details (facility_id, hours_json, pet_access_json, emergency_status, specialty_status, hours_status) values (${[f.id, d.hours_json, d.pet_access_json, d.emergency_status, d.specialty_status, d.hours_status].map(q).join(", ")}) on conflict (facility_id) do nothing;`);
}

lines.push("commit;");
const out = path.resolve(__dirname, "../supabase/seed.sql");
writeFileSync(out, lines.join("\n") + "\n");
console.log(`wrote ${out} (${lines.length} lines)`);
