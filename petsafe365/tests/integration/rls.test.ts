// 실제 PostgreSQL 엔진(PGlite)에 마이그레이션을 그대로 적용해 Row Level Security 를 검증한다.
// Supabase 가 제공하는 auth·storage 스키마만 최소한으로 흉내 낸다.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const ADMIN = "33333333-3333-4333-8333-333333333333";
const REVIEWER = "44444444-4444-4444-8444-444444444444";

let db: PGlite;
let petA: string;

const STUB = `
  create role anon nologin; create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated;
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
  grant usage on schema storage to authenticated;
  grant select, insert, delete on storage.objects to authenticated;
`;

type Q = { query: (sql: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[]; affectedRows?: number }> };

/** 지정한 사용자(또는 비로그인)로 한 트랜잭션을 실행한다. 실패하면 오류를 던진다. */
async function as<T>(userId: string | null, fn: (q: Q) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [userId ?? ""]);
    await tx.exec(`set local role ${userId ? "authenticated" : "anon"}`);
    return fn(tx as unknown as Q);
  }) as Promise<T>;
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(STUB);
  const dir = path.resolve(__dirname, "../../supabase/migrations");
  for (const file of readdirSync(dir).sort()) await db.exec(readFileSync(path.join(dir, file), "utf8"));
  for (const [id, email] of [[A, "a@example.com"], [B, "b@example.com"], [ADMIN, "admin@example.com"], [REVIEWER, "rev@example.com"]]) {
    await db.query(`insert into auth.users (id, email) values ($1, $2)`, [id, email]);
  }
  await db.query(`update public.profiles set role = 'admin' where user_id = $1`, [ADMIN]);
  await db.query(`update public.profiles set role = 'reviewer' where user_id = $1`, [REVIEWER]);
  petA = await as(A, async (q) => {
    const r = await q.query(`insert into public.pets (owner_id, species, name) values ($1, 'dog', '콩이') returning id`, [A]);
    return r.rows[0].id as string;
  });
  await as(A, (q) => q.query(`insert into public.care_tasks (pet_id, title, due_at, created_by) values ($1, '산책', now(), $2)`, [petA, A]));
  await as(A, (q) => q.query(`insert into public.health_events (pet_id, event_type, occurred_at) values ($1, 'note', now())`, [petA]));
});

describe("가입", () => {
  it("가입하면 guardian 프로필이 생긴다", async () => {
    const r = await db.query<{ role: string }>(`select role from public.profiles where user_id = $1`, [A]);
    expect(r.rows[0].role).toBe("guardian");
  });
  it("본인이 자기 역할을 admin 으로 바꿀 수 없다", async () => {
    await expect(as(A, (q) => q.query(`update public.profiles set role = 'admin' where user_id = $1`, [A]))).rejects.toThrow();
  });
});

describe("다른 사용자의 반려동물 데이터 접근 차단", () => {
  it("주인은 자기 반려동물을 읽는다", async () => {
    const r = await as(A, (q) => q.query(`select id from public.pets where id = $1`, [petA]));
    expect(r.rows).toHaveLength(1);
  });
  it("다른 사용자는 pet_id 를 알아도 읽지 못한다", async () => {
    const r = await as(B, (q) => q.query(`select id from public.pets where id = $1`, [petA]));
    expect(r.rows).toHaveLength(0);
  });
  it("다른 사용자는 할 일·건강 기록을 읽지 못한다", async () => {
    const tasks = await as(B, (q) => q.query(`select id from public.care_tasks where pet_id = $1`, [petA]));
    const events = await as(B, (q) => q.query(`select id from public.health_events where pet_id = $1`, [petA]));
    expect(tasks.rows).toHaveLength(0);
    expect(events.rows).toHaveLength(0);
  });
  it("다른 사용자는 수정·삭제하지 못한다", async () => {
    const updated = await as(B, (q) => q.query(`update public.pets set name = '탈취' where id = $1 returning id`, [petA]));
    const deleted = await as(B, (q) => q.query(`delete from public.pets where id = $1 returning id`, [petA]));
    expect(updated.rows).toHaveLength(0);
    expect(deleted.rows).toHaveLength(0);
    const still = await db.query<{ name: string }>(`select name from public.pets where id = $1`, [petA]);
    expect(still.rows[0].name).toBe("콩이");
  });
  it("다른 사용자는 남의 반려동물에 할 일·문서·보험을 끼워 넣지 못한다", async () => {
    await expect(as(B, (q) => q.query(`insert into public.care_tasks (pet_id, title, due_at, created_by) values ($1, '침입', now(), $2)`, [petA, B]))).rejects.toThrow();
    await expect(as(B, (q) => q.query(`insert into public.documents (pet_id, owner_id, document_type, storage_path, original_name, mime_type, size) values ($1, $2, 'other', 'x/y', 'a.pdf', 'application/pdf', 10)`, [petA, B]))).rejects.toThrow();
    await expect(as(B, (q) => q.query(`insert into public.insurance_policies (pet_id, insurer, product_name) values ($1, 'x', 'y')`, [petA]))).rejects.toThrow();
  });
  it("남의 이름으로 반려동물을 등록하지 못한다", async () => {
    await expect(as(B, (q) => q.query(`insert into public.pets (owner_id, species, name) values ($1, 'cat', '위장')`, [A]))).rejects.toThrow();
  });
  it("비로그인 사용자는 개인 데이터를 읽지 못한다", async () => {
    await expect(as(null, (q) => q.query(`select id from public.pets`))).rejects.toThrow();
  });
  it("보험 약관 조항도 주인만 읽는다", async () => {
    const policy = await as(A, async (q) => (await q.query(`insert into public.insurance_policies (pet_id, insurer, product_name) values ($1, '예시보험', '예시상품') returning id`, [petA])).rows[0].id as string);
    await as(A, (q) => q.query(`insert into public.insurance_terms (policy_id, category, clause_text, classification) values ($1, '수술', '조항', 'covered')`, [policy]));
    const r = await as(B, (q) => q.query(`select id from public.insurance_terms where policy_id = $1`, [policy]));
    expect(r.rows).toHaveLength(0);
    await expect(as(B, (q) => q.query(`insert into public.insurance_checks (policy_id, input_json, result, evidence_json) values ($1, '{}', 'check_terms', '{}')`, [policy]))).rejects.toThrow();
  });
  it("문서 저장소는 자기 폴더에만 올릴 수 있다", async () => {
    await as(A, (q) => q.query(`insert into storage.objects (bucket_id, name) values ('pet-documents', $1)`, [`${A}/${petA}/f.pdf`]));
    await expect(as(B, (q) => q.query(`insert into storage.objects (bucket_id, name) values ('pet-documents', $1)`, [`${A}/${petA}/evil.pdf`]))).rejects.toThrow();
    const r = await as(B, (q) => q.query(`select id from storage.objects`));
    expect(r.rows).toHaveLength(0);
  });
  it("반려동물을 지우면 연관 데이터가 함께 지워진다", async () => {
    const pet = await as(B, async (q) => (await q.query(`insert into public.pets (owner_id, species, name) values ($1, 'cat', '나비') returning id`, [B])).rows[0].id as string);
    await as(B, (q) => q.query(`insert into public.care_tasks (pet_id, title, due_at, created_by) values ($1, '화장실', now(), $2)`, [pet, B]));
    await as(B, (q) => q.query(`delete from public.pets where id = $1`, [pet]));
    const r = await db.query(`select id from public.care_tasks where pet_id = $1`, [pet]);
    expect(r.rows).toHaveLength(0);
  });
});

describe("콘텐츠 공개 조건", () => {
  let card: string;
  let version: string;
  beforeAll(async () => {
    card = (await db.query<{ id: string }>(`insert into public.content_cards (slug, content_type, status) values ('test', 'zoonosis', 'in_review') returning id`)).rows[0].id;
    version = (await db.query<{ id: string }>(`insert into public.content_versions (content_id, version, body_json, status) values ($1, 1, '{"title":"t"}', 'in_review') returning id`, [card])).rows[0].id;
  });
  it("검수 전 본문은 비로그인·일반 사용자에게 보이지 않는다", async () => {
    expect((await as(null, (q) => q.query(`select id from public.content_versions where id = $1`, [version]))).rows).toHaveLength(0);
    expect((await as(A, (q) => q.query(`select id from public.content_versions where id = $1`, [version]))).rows).toHaveLength(0);
  });
  it("검수자·검토일 없이는 승인 상태가 될 수 없다", async () => {
    await expect(db.query(`update public.content_versions set status = 'approved' where id = $1`, [version])).rejects.toThrow();
  });
  it("일반 사용자는 승인하지 못하고, 검수자는 승인하되 게시는 못 한다", async () => {
    const byUser = await as(A, (q) => q.query(`update public.content_versions set status = 'approved', reviewer_id = $2, reviewed_at = now() where id = $1 returning id`, [version, A]));
    expect(byUser.rows).toHaveLength(0);
    const byReviewer = await as(REVIEWER, (q) => q.query(`update public.content_versions set status = 'approved', reviewer_id = $2, reviewed_at = now(), expires_at = now() + interval '180 days' where id = $1 returning id`, [version, REVIEWER]));
    expect(byReviewer.rows).toHaveLength(1);
    await expect(as(REVIEWER, (q) => q.query(`update public.content_versions set status = 'published' where id = $1`, [version]))).rejects.toThrow();
  });
  it("승인된 본문은 공개되고, 기한이 지나면 다시 숨는다", async () => {
    expect((await as(null, (q) => q.query(`select id from public.content_versions where id = $1`, [version]))).rows).toHaveLength(1);
    await db.query(`update public.content_versions set expires_at = now() - interval '1 day' where id = $1`, [version]);
    expect((await as(null, (q) => q.query(`select id from public.content_versions where id = $1`, [version]))).rows).toHaveLength(0);
  });
});

describe("기능 플래그·감사로그·주문", () => {
  it("법적 기능 플래그는 모두 꺼진 상태로 시작한다", async () => {
    const r = await as(null, (q) => q.query(`select key, enabled from public.feature_flags`));
    expect(r.rows).toHaveLength(6);
    expect(r.rows.every((row) => row.enabled === false)).toBe(true);
  });
  it("일반 사용자는 플래그를 켤 수 없다", async () => {
    const r = await as(A, (q) => q.query(`update public.feature_flags set enabled = true, approved_by = $1, approved_at = now() where key = 'paymentsEnabled' returning id`, [A]));
    expect(r.rows).toHaveLength(0);
  });
  it("결제가 꺼져 있으면 주문을 만들 수 없다", async () => {
    await expect(as(A, (q) => q.query(`insert into public.orders (user_id, total_krw, items_json) values ($1, 1000, '[]')`, [A]))).rejects.toThrow();
  });
  it("관리자도 승인자 기록 없이는 켤 수 없고, 기록하면 켤 수 있다", async () => {
    await expect(as(ADMIN, (q) => q.query(`update public.feature_flags set enabled = true where key = 'paymentsEnabled'`))).rejects.toThrow();
    const r = await as(ADMIN, (q) => q.query(`update public.feature_flags set enabled = true, approved_by = $1, approved_at = now() where key = 'paymentsEnabled' returning id`, [ADMIN]));
    expect(r.rows).toHaveLength(1);
  });
  it("결제가 켜져도 사용자는 주문을 '결제 완료'로 만들 수 없다", async () => {
    await expect(as(A, (q) => q.query(`insert into public.orders (user_id, total_krw, items_json, status) values ($1, 1000, '[]', 'paid')`, [A]))).rejects.toThrow();
    const order = await as(A, async (q) => (await q.query(`insert into public.orders (user_id, total_krw, items_json) values ($1, 1000, '[]') returning id`, [A])).rows[0].id as string);
    await expect(as(A, (q) => q.query(`update public.orders set status = 'paid' where id = $1`, [order]))).rejects.toThrow();
    expect((await as(B, (q) => q.query(`select id from public.orders where id = $1`, [order]))).rows).toHaveLength(0);
  });
  it("감사로그는 자기 이름으로만 남기고 관리자만 읽으며 고칠 수 없다", async () => {
    await as(A, (q) => q.query(`insert into public.audit_logs (actor_id, action, entity_type) values ($1, 'test', 'pets')`, [A]));
    await expect(as(A, (q) => q.query(`insert into public.audit_logs (actor_id, action, entity_type) values ($1, 'forged', 'pets')`, [B]))).rejects.toThrow();
    expect((await as(A, (q) => q.query(`select id from public.audit_logs`))).rows).toHaveLength(0);
    expect((await as(ADMIN, (q) => q.query(`select id from public.audit_logs`))).rows.length).toBeGreaterThan(0);
    await expect(as(ADMIN, (q) => q.query(`delete from public.audit_logs`))).rejects.toThrow();
  });
  it("공식 연락처는 누구나 읽고 관리자만 바꾼다", async () => {
    await db.query(`insert into public.official_contacts (category, organization, phone, status) values ('consumer', '테스트 기관', '0000', 'active')`);
    expect((await as(null, (q) => q.query(`select id from public.official_contacts`))).rows).toHaveLength(1);
    expect((await as(A, (q) => q.query(`update public.official_contacts set phone = '9999' returning id`))).rows).toHaveLength(0);
    expect((await as(ADMIN, (q) => q.query(`update public.official_contacts set verified_at = now() returning id`))).rows).toHaveLength(1);
  });
  it("시험 통과 표시는 시험일·기관 없이는 할 수 없다", async () => {
    const product = (await db.query<{ id: string }>(`insert into public.products (slug, name, material, summary, description, price_krw, origin_country) values ('p', 'p', 'leather', 's', 'd', 1000, '인도') returning id`)).rows[0].id;
    await expect(db.query(`insert into public.product_lots (product_id, lot_code, status) values ($1, 'L1', 'passed')`, [product])).rejects.toThrow();
  });
});
