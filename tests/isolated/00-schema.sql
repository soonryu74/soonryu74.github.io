-- 격리 테스트 환경 스키마
-- 운영 Supabase 프로젝트의 역할 체계와 공개 스키마를 재현한다.
-- 실제 운영 데이터는 옮기지 않는다. 모든 행은 식별 가능한 fixture 다.
--
-- 재현 범위의 한계 (보고서에 그대로 적을 것):
--  · PostgREST 는 포함하지 않는다. HTTP 계층(409/204 응답, 자동 갱신 가능 뷰의
--    DELETE 전달)은 재현되지 않으며, SQL 계층 동작만 검증한다.
--  · Supabase 의 기본 권한(ALTER DEFAULT PRIVILEGES) 설정은 운영과 같게 만들어,
--    '새 객체에 익명 전권이 붙는' 현상 자체를 재현한다.

create role anon            nologin;
create role authenticated   nologin;
create role service_role    nologin bypassrls;
grant usage on schema public to anon, authenticated, service_role;

-- 운영 프로젝트와 동일한 기본 권한 설정 (사고 원인 (2) 재현)
alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;

create table public.caregivers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  owner_id uuid,                                  -- 본인/타인 구분용 (운영에는 아직 없음)
  name text, role text, exp text, area text,
  types text[], skills text[], "time" text,
  contact text, contact_public boolean not null default false,
  consent_version text, client_token uuid,
  intro text,
  premium boolean not null default false,
  verified boolean not null default false,
  status text not null default 'active'
);
create unique index caregivers_client_token_uniq
  on public.caregivers (client_token) where client_token is not null;

create table public.waitlist (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  role text not null, job text, name text, area text,
  contact text not null, msg text,
  source text default 'gyeotae',
  status text not null default 'new',
  client_token uuid, consent_version text
);
create unique index waitlist_client_token_uniq
  on public.waitlist (client_token) where client_token is not null;
create unique index waitlist_contact_uniq
  on public.waitlist (lower(regexp_replace(contact, '[^0-9a-zA-Z@.]', '', 'g')), source);

alter table public.caregivers enable row level security;
alter table public.waitlist   enable row level security;

-- 운영과 동일한 정책
create policy "public read active" on public.caregivers
  for select using (status = 'active');
create policy "public insert safe" on public.caregivers
  for insert with check (
    premium = false and verified = false and status = 'active'
    and array_length(types, 1) is distinct from 0
  );
create policy "insert guard" on public.caregivers
  as restrictive for insert to anon, authenticated
  with check (
    coalesce(array_length(types, 1), 0) > 0
    and length(btrim(coalesce(name, ''))) between 1 and 40
    and length(coalesce(intro, '')) <= 500
    and length(coalesce(contact, '')) <= 200
    and (contact_public = false or length(btrim(coalesce(contact, ''))) > 0)
  );
create policy "anon can insert waitlist" on public.waitlist
  for insert to anon, authenticated with check (true);

-- 운영과 동일한 공개 뷰 (교정된 형태)
create view public.caregivers_public as
select id, created_at, name, role, exp, area, types, skills, "time",
       case when contact_public then contact else null end as contact,
       contact_public, intro, premium, verified, status
from public.caregivers where status = 'active';
alter view public.caregivers_public set (security_invoker = true);
revoke insert, update, delete, truncate, references, trigger
  on public.caregivers_public from anon, authenticated;
revoke update, delete, truncate, references, trigger on public.caregivers from anon, authenticated;
revoke update, delete, truncate, references, trigger on public.waitlist   from anon, authenticated;
