// Supabase 에 초기 데이터를 넣는다. 여러 번 실행해도 같은 결과가 되도록 id 기준 upsert 한다.
//   npm run seed            실제로 넣기 (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 필요)
//   npm run seed -- --dry   넣을 건수만 출력
import { createClient } from "@supabase/supabase-js";
import { seedTables } from "../src/lib/seed";

const dry = process.argv.includes("--dry");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

// content_versions 가 content_cards 를 참조하므로 카드의 current_version_id 는 나중에 채운다.
const ORDER = ["care_task_templates", "official_contacts", "legal_documents", "products", "product_lots", "facilities", "content_cards", "content_versions"] as const;

async function main() {
  for (const table of ORDER) console.log(`${table}: ${seedTables[table].length}건`);
  console.log("feature_flags: 마이그레이션이 꺼진 상태로 만든다 (시드하지 않음)");
  if (dry) return console.log("dry-run: 아무것도 쓰지 않았습니다.");
  if (!url || !key) {
    console.error("NEXT_PUBLIC_SUPABASE_URL 과 SUPABASE_SERVICE_ROLE_KEY 가 필요합니다. .env.local 을 확인하세요.");
    process.exit(1);
  }
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  for (const table of ORDER) {
    const rows = table === "content_cards" ? seedTables.content_cards.map((c) => ({ ...c, current_version_id: null })) : seedTables[table];
    const { error } = await db.from(table).upsert(rows as never[], { onConflict: "id", ignoreDuplicates: true });
    if (error) throw new Error(`${table}: ${error.message}`);
  }
  for (const card of seedTables.content_cards) {
    const { error } = await db.from("content_cards").update({ current_version_id: card.current_version_id }).eq("id", card.id).is("current_version_id", null);
    if (error) throw new Error(`content_cards: ${error.message}`);
  }
  const adminEmail = process.env.ADMIN_BOOTSTRAP_EMAIL;
  if (adminEmail) {
    const { data, error } = await db.auth.admin.listUsers();
    if (error) throw new Error(error.message);
    const user = data.users.find((u) => u.email?.toLowerCase() === adminEmail.toLowerCase());
    if (!user) console.warn(`관리자 승격 건너뜀: ${adminEmail} 계정이 아직 없습니다. 먼저 한 번 로그인한 뒤 다시 실행하세요.`);
    else {
      const { error: e } = await db.from("profiles").update({ role: "admin" }).eq("user_id", user.id);
      if (e) throw new Error(e.message);
      console.log("관리자 승격 완료");
    }
  }
  console.log("시드 완료");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
