// 시드 데이터를 SQL 로 출력한다 (서비스 키 없이 SQL 편집기에 붙여 넣을 때 사용). npx tsx scripts/seed-sql.ts
import { seedTables } from "../src/lib/seed";

const q = (v: unknown) => `'${JSON.stringify(v).replace(/'/g, "''")}'`;
const ORDER = ["care_task_templates", "official_contacts", "legal_documents", "products", "product_lots", "facilities", "content_cards", "content_versions"] as const;
for (const table of ORDER) {
  const rows = table === "content_cards" ? seedTables.content_cards.map((c) => ({ ...c, current_version_id: null })) : seedTables[table];
  console.log(`insert into public.${table} select * from jsonb_populate_recordset(null::public.${table}, ${q(rows)}::jsonb) on conflict (id) do nothing;`);
}
for (const c of seedTables.content_cards) console.log(`update public.content_cards set current_version_id = '${c.current_version_id}' where id = '${c.id}' and current_version_id is null;`);
