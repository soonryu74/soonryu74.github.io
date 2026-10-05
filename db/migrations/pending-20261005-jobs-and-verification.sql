-- 상태: 미적용. 운영 승인 대기.
-- 곁애 채용 기능과 자격 확인 절차의 데이터·권한 구조.
-- 격리 환경(PostgreSQL 16)에서 설계하고 검증했다:
--   tests/isolated/50-jobs-schema.sql     · 60-jobs-verify.sql
--   tests/isolated/70-verification.sql    · 71-verification-fix.sql · 80-verification-verify.sql
-- 검증 결과 요약: docs/care-platform/isolated-verification-20261005.md
--
-- ── 적용해도 되는가 ─────────────────────────────────────────────────────
-- 이 마이그레이션은 **새 테이블·뷰만 추가**하며 기존 객체를 건드리지 않는다.
-- 적용해도 화면에 보이는 것은 달라지지 않는다. 공고가 0건이므로
-- gyeotae/ilja.html 은 지금과 같은 '준비 중' 안내를 그대로 보여준다.
-- 가짜 공고를 넣지 않으므로 공개 활성화 위험이 없다.
--
-- ── 적용 전에 반드시 확인 ───────────────────────────────────────────────
-- 이 프로젝트의 public 스키마 기본 권한이 **새 객체마다 익명에게 전권을 부여**한다.
-- (docs/care-platform/incident-20261004.md 3절)
-- 그래서 각 객체마다 revoke 를 명시했다. 적용 후 아래로 반드시 재확인할 것:
--   select c.relname,
--          has_table_privilege('anon', c.oid, 'INSERT') ins,
--          has_table_privilege('anon', c.oid, 'UPDATE') upd,
--          has_table_privilege('anon', c.oid, 'DELETE') del
--     from pg_class c join pg_namespace n on n.oid=c.relnamespace
--    where n.nspname='public'
--      and c.relname in ('orgs','org_members','jobs','applications','jobs_public',
--                        'verifications','verification_events','verification_badges');
-- 셋 다 false 여야 한다.
--
-- ── 되돌리기 ────────────────────────────────────────────────────────────
-- drop view if exists public.verification_badges;
-- drop table if exists public.verification_events;
-- drop table if exists public.verifications cascade;
-- drop view if exists public.jobs_public;
-- drop table if exists public.applications;
-- drop table if exists public.jobs;
-- drop table if exists public.org_members;
-- drop table if exists public.orgs cascade;

begin;

-- 운영에는 적용하지 않는다. 실제 공고 공급이 없으므로 공개 활성화도 하지 않는다.
--
-- 설계 원칙
--  · 공고는 기관이 등록하고, 운영자가 검토한 뒤에야 공개된다. 자동 공개하지 않는다.
--  · 지원자는 비회원도 공고를 '볼' 수 있다. 지원에는 식별 수단이 필요하다.
--  · 공개 화면에는 검토를 통과하고 마감되지 않은 공고만 나온다.
--  · 기관 담당자는 자기 기관 공고만 다룰 수 있다.

create table public.orgs (                       -- 공고를 내는 기관
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  ltc_sym text,                                  -- 장기요양기관기호 (확인된 경우에만)
  sido text, sigungu text,
  contact text,
  verified_at timestamptz,                       -- 기관 실재 확인 시각 (사람이 확인)
  verified_by text,
  status text not null default 'pending'         -- pending | active | suspended
    check (status in ('pending','active','suspended'))
);

create table public.org_members (                -- 기관 담당자
  org_id uuid not null references public.orgs(id) on delete cascade,
  user_id uuid not null,
  role text not null default 'manager' check (role in ('manager','viewer')),
  primary key (org_id, user_id)
);

create table public.jobs (                       -- 공고
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  title text not null,
  job_role text not null,                        -- 요양보호사 / 간병인 / 간호조무사 / 간호사 ...
  sido text, sigungu text,
  employment text,                               -- 정규직 / 계약직 / 시간제 / 입주
  shift text,                                    -- 주간 / 야간 / 교대 / 협의
  pay_type text check (pay_type in ('hour','day','month','negotiable')),
  pay_min integer, pay_max integer,              -- 원 단위. 비워 둘 수 있다
  description text,
  apply_method text not null                     -- 공식 외부 지원 경로 또는 기관 직접 연락
    check (apply_method in ('external','direct')),
  apply_url text,                                -- external 인 경우
  closes_at date,
  review_status text not null default 'draft'    -- draft | submitted | approved | rejected
    check (review_status in ('draft','submitted','approved','rejected')),
  reviewed_at timestamptz, reviewed_by text, reject_reason text,
  closed boolean not null default false,
  -- external 이면 지원 URL 이 반드시 있어야 한다
  constraint jobs_apply_url_required
    check (apply_method <> 'external' or (apply_url is not null and apply_url <> ''))
);
create index jobs_public_idx on public.jobs (review_status, closed, closes_at);
create index jobs_region_idx on public.jobs (sido, sigungu);
create index jobs_role_idx   on public.jobs (job_role);

create table public.applications (               -- 지원
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  applicant_id uuid not null,                    -- 지원자 식별 (로그인 필요)
  client_token uuid,
  note text,
  state text not null default 'submitted'
    check (state in ('submitted','seen','accepted','rejected','withdrawn')),
  unique (job_id, applicant_id)                  -- 같은 공고에 중복 지원 불가
);

-- 공개 목록용 뷰: 검토를 통과하고 마감되지 않은 공고만.
-- 내부 검토 열(reviewed_by, reject_reason 등)은 내보내지 않는다.
create view public.jobs_public as
select j.id, j.created_at, j.title, j.job_role, j.sido, j.sigungu,
       btrim(coalesce(j.sido,'') || ' ' || coalesce(j.sigungu,'')) as region,
       j.employment, j.shift, j.pay_type, j.pay_min, j.pay_max,
       j.description, j.apply_method, j.apply_url, j.closes_at,
       o.name as org_name, o.ltc_sym as org_ltc_sym,
       (o.verified_at is not null) as org_verified
from public.jobs j
join public.orgs o on o.id = j.org_id
where j.review_status = 'approved'
  and j.closed = false
  and (j.closes_at is null or j.closes_at >= current_date)
  and o.status = 'active';
alter view public.jobs_public set (security_invoker = true);

alter table public.orgs         enable row level security;
alter table public.org_members  enable row level security;
alter table public.jobs         enable row level security;
alter table public.applications enable row level security;

-- 기반 테이블 읽기: 공개 뷰가 security_invoker 이므로 필요한 만큼만 연다
create policy "read active orgs" on public.orgs
  for select to anon, authenticated using (status = 'active');
create policy "read approved jobs" on public.jobs
  for select to anon, authenticated
  using (review_status = 'approved' and closed = false
         and (closes_at is null or closes_at >= current_date));

-- 쓰기는 전부 닫는다. 기관 등록·검토·지원은 별도 함수로만 처리한다(아래 60번 파일).
revoke all on public.orgs, public.org_members, public.jobs, public.applications
  from anon, authenticated;
grant select on public.orgs, public.jobs to anon, authenticated;
grant select on public.jobs_public to anon, authenticated;
--
-- 원칙
--  · 사람이 원본 서류를 확인하기 전에는 어떤 확인 표시도 붙지 않는다.
--  · 증빙 파일은 공개 경로에 두지 않는다. 이 DB에는 파일 자체를 넣지 않고
--    보관 위치 참조와 해시만 둔다.
--  · 확인은 영구가 아니다. 유효기간이 지나면 자동으로 만료된다.
--  · 철회·이의제기 이력을 남긴다. 상태를 덮어쓰지 않는다.

create table public.verifications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  subject_type text not null check (subject_type in ('caregiver','org')),
  subject_id uuid not null,
  -- 무엇을 확인했는가
  kind text not null check (kind in
    ('요양보호사자격','간호조무사자격','간호사면허','기관실재','사업자등록','교육이수')),
  -- 증빙: 파일은 여기 넣지 않는다. 비공개 보관소의 참조와 해시만 둔다.
  evidence_ref text,
  evidence_sha256 text,
  -- 확인 행위
  state text not null default 'requested' check (state in
    ('requested','in_review','verified','rejected','expired','revoked')),
  reviewed_by text,                       -- 확인한 사람 (운영자 식별자)
  reviewed_at timestamptz,
  valid_until date,                       -- 유효기간. 지나면 만료로 본다
  note text,                              -- 반려·철회 사유 (내부용)
  constraint verified_needs_reviewer
    check (state <> 'verified' or (reviewed_by is not null and reviewed_at is not null)),
  constraint rejected_needs_reason
    check (state <> 'rejected' or note is not null)
);
create index verifications_subject_idx on public.verifications (subject_type, subject_id, kind);

create table public.verification_events (   -- 상태 변경 이력. 덮어쓰지 않고 쌓는다
  id bigint generated always as identity primary key,
  verification_id uuid not null references public.verifications(id) on delete cascade,
  at timestamptz not null default now(),
  from_state text, to_state text not null,
  actor text,                               -- 운영자 / 본인 / 시스템
  reason text
);

-- 공개 화면에 내보낼 수 있는 것: '유효한 확인이 있는가' 뿐.
-- 증빙 참조·해시·검토자·사유는 내보내지 않는다.
create view public.verification_badges as
select subject_type, subject_id, kind, valid_until
from public.verifications
where state = 'verified'
  and (valid_until is null or valid_until >= current_date);
alter view public.verification_badges set (security_invoker = true);

alter table public.verifications       enable row level security;
alter table public.verification_events enable row level security;

-- 공개 읽기는 '유효한 확인' 행에 한정한다
create policy "read valid verifications" on public.verifications
  for select to anon, authenticated
  using (state = 'verified' and (valid_until is null or valid_until >= current_date));

revoke all on public.verifications, public.verification_events from anon, authenticated;
grant select on public.verifications to anon, authenticated;
grant select on public.verification_badges to anon, authenticated;

-- 상태 변경은 전부 이력에 남긴다
create or replace function public.log_verification_change() returns trigger
language plpgsql as $t$
begin
  if tg_op = 'INSERT' then
    insert into public.verification_events (verification_id, from_state, to_state, actor)
    values (new.id, null, new.state, coalesce(new.reviewed_by, 'system'));
  elsif new.state is distinct from old.state then
    insert into public.verification_events (verification_id, from_state, to_state, actor, reason)
    values (new.id, old.state, new.state, coalesce(new.reviewed_by, 'system'), new.note);
  end if;
  return new;
end $t$;
create trigger verifications_audit
  after insert or update on public.verifications
  for each row execute function public.log_verification_change();
-- 결함 교정: 공개 뷰가 security_invoker 이므로 기반 테이블 SELECT 권한이 필요한데,
-- 테이블 전체에 SELECT 를 주면 RLS 가 행은 걸러도 **열은 다 보인다.**
-- 익명이 evidence_ref(증빙 보관 위치)·reviewed_by·note 까지 읽을 수 있었다.
-- → 테이블 권한을 회수하고 **열 단위로** 필요한 열만 준다.
revoke select on public.verifications from anon, authenticated;
-- 주의: 열 단위 권한은 WHERE 절에서 쓰는 열에도 필요하다.
-- 뷰가 state·valid_until 로 거르므로 state 도 포함해야 뷰가 동작한다.
-- state 는 RLS 가 이미 'verified' 행만 남기므로 추가로 드러나는 정보가 없다.
grant select (subject_type, subject_id, kind, valid_until, state)
  on public.verifications to anon, authenticated;

commit;
