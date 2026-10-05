-- 곁애 채용 기능의 데이터·권한 구조 (격리 환경에서 설계·검증)
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
