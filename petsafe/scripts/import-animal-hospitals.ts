// 전국 동물병원 인허가 데이터 수집기.
//   npm run import:hospitals -- --dry-run --fixture tests/fixtures/animal-hospitals.sample.json
//   npm run import:hospitals -- --dry-run            (PUBLIC_DATA_SERVICE_KEY 필요, DB 쓰기 없음)
//   npm run import:hospitals                         (+ SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL)
// 원본(facility_source_records)과 정규화(facilities)를 분리 저장하고, 폐업은 삭제하지 않고 상태 이력을 남긴다.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { normalizeHospital, planUpsert, mergeCandidates, SOURCE_SYSTEM, type NormalizedFacility } from "../src/lib/importers/animal-hospital";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const fixtureIdx = args.indexOf("--fixture");
const fixture = fixtureIdx >= 0 ? args[fixtureIdx + 1] : null;
// ⚠ 엔드포인트는 data.go.kr 15154952 상세 페이지에서 키 발급 후 확인해 PUBLIC_DATA_HOSPITAL_URL 로 지정한다.
const ENDPOINT = process.env.PUBLIC_DATA_HOSPITAL_URL || "";

async function fetchAll(): Promise<Record<string, unknown>[]> {
  if (fixture) return (JSON.parse(readFileSync(fixture, "utf8")).items ?? []) as Record<string, unknown>[];
  const key = process.env.PUBLIC_DATA_SERVICE_KEY;
  if (!key || !ENDPOINT) throw new Error("PUBLIC_DATA_SERVICE_KEY 와 PUBLIC_DATA_HOSPITAL_URL 이 필요합니다. (--fixture 로 예시 실행 가능)");
  const out: Record<string, unknown>[] = [];
  for (let page = 1; page <= 500; page++) {
    const url = `${ENDPOINT}?serviceKey=${encodeURIComponent(key)}&pageNo=${page}&numOfRows=1000&type=json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} (page ${page})`);
    const j = await res.json();
    const items = j?.response?.body?.items?.item ?? j?.items ?? [];
    const arr = Array.isArray(items) ? items : [items];
    out.push(...arr);
    if (arr.length < 1000) break;
    await new Promise((r) => setTimeout(r, 300));
  }
  return out;
}

async function main() {
  const started = new Date().toISOString();
  const raw = await fetchAll();
  const rows: NormalizedFacility[] = [];
  const errors: string[] = [];
  const conversions: string[] = [];
  const rawById = new Map<string, Record<string, unknown>>();
  for (const r of raw) {
    const n = normalizeHospital(r, { isExample: !!fixture });
    if (!n.ok) { errors.push(n.reason); continue; }
    rows.push(n.row);
    rawById.set(n.row.source_id, r);
    if (n.conversion) conversions.push(`${n.row.source_id}: ${n.conversion}`);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const sb = !dryRun && url && service ? createClient(url, service, { auth: { persistSession: false } }) : null;
  if (!dryRun && !sb) throw new Error("DB 쓰기에는 NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 가 필요합니다. --dry-run 으로 먼저 확인하세요.");

  const sourceSystem = rows[0]?.source_system ?? SOURCE_SYSTEM;
  const existing = sb ? ((await sb.from("facilities").select("id, source_system, source_id, business_status, source_updated_at").eq("source_system", sourceSystem)).data ?? []) : [];
  const plan = planUpsert(rows, existing);
  const merges = mergeCandidates(rows);

  console.log(JSON.stringify({
    mode: dryRun ? "dry-run" : "write", source: fixture ?? ENDPOINT, fetched: raw.length, normalized: rows.length,
    insert: plan.insert.length, update: plan.update.length, statusChanges: plan.statusChanges, skipped: plan.skipped.length,
    errors, mergeCandidates: merges, conversionSamples: conversions.slice(0, 3),
  }, null, 2));

  if (!sb) return;
  // 원본 보관
  for (const [id, r] of rawById) await sb.from("facility_source_records").upsert({ source_system: sourceSystem, source_id: id, raw_json: r, fetched_at: started }, { onConflict: "source_system,source_id" });
  // 정규화 upsert
  const now = new Date().toISOString();
  const upserts = [...plan.insert, ...plan.update].map((r) => ({ ...r, last_synced_at: now, business_status_changed_at: plan.statusChanges.some((c) => c.source_id === r.source_id) ? now.slice(0, 10) : undefined }));
  for (let i = 0; i < upserts.length; i += 500) {
    const { error } = await sb.from("facilities").upsert(upserts.slice(i, i + 500), { onConflict: "source_system,source_id" });
    if (error) errors.push(error.message);
  }
  // 상태 이력
  if (plan.statusChanges.length) {
    const ids = (await sb.from("facilities").select("id, source_id").eq("source_system", sourceSystem).in("source_id", plan.statusChanges.map((c) => c.source_id))).data ?? [];
    await sb.from("facility_status_history").insert(plan.statusChanges.map((c) => ({ facility_id: ids.find((x) => x.source_id === c.source_id)?.id, from_status: c.from, to_status: c.to, source: sourceSystem })).filter((x) => x.facility_id));
  }
  await sb.from("facility_sync_logs").insert({ source_system: sourceSystem, started_at: started, finished_at: new Date().toISOString(), fetched: raw.length, inserted: plan.insert.length, updated: plan.update.length, skipped: plan.skipped.length, errors_json: errors, dry_run: false });
}

main().catch((e) => { console.error(e.message); process.exit(1); });
