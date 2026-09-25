-- 펫안심365 마이그레이션 0001: 사용자·반려동물·일정·기록·문서
-- 모든 테이블은 id/created_at/updated_at을 갖고, 소유자 데이터는 RLS로 강제한다.

create extension if not exists pgcrypto;

-- ── 공통 유틸 ─────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- 사용자 역할: guardian(보호자) / reviewer(콘텐츠 검수자) / partner / admin
create type public.user_role as enum ('guardian', 'reviewer', 'partner', 'admin');
create type public.pet_species as enum ('dog', 'cat');
create type public.pet_sex as enum ('male', 'female', 'unknown');
create type public.registration_status as enum ('registered', 'not_registered', 'unknown', 'not_applicable');
create type public.insurance_status as enum ('insured', 'not_insured', 'unknown');
create type public.task_status as enum ('pending', 'done', 'snoozed', 'skipped');
create type public.task_priority as enum ('legal', 'safety', 'health', 'general', 'lifestyle');
create type public.condition_type as enum ('disease', 'allergy', 'medication', 'other');
create type public.guardian_permission as enum ('read', 'write');
create type public.content_status as enum ('draft', 'in_review', 'approved', 'published', 'expired', 'archived');

-- ── profiles ──────────────────────────────────────────────
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  locale text not null default 'ko-KR',
  role public.user_role not null default 'guardian',
  marketing_consent_at timestamptz,
  deletion_requested_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- auth.users 생성 시 프로필 자동 생성
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id, display_name)
  values (new.id, split_part(coalesce(new.email, ''), '@', 1))
  on conflict (user_id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- 현재 사용자의 역할 (RLS에서 사용). security definer로 profiles RLS를 우회해 읽는다.
create or replace function public.app_role()
returns public.user_role language sql stable security definer set search_path = public as $$
  select coalesce((select role from public.profiles where user_id = auth.uid()), 'guardian'::public.user_role)
$$;
create or replace function public.is_admin()
returns boolean language sql stable as $$ select public.app_role() = 'admin' $$;
create or replace function public.is_reviewer_or_admin()
returns boolean language sql stable as $$ select public.app_role() in ('reviewer', 'admin') $$;

-- 사용자가 자기 역할을 스스로 올리지 못하게 막는다 (admin만 role 변경 가능)
create or replace function public.guard_profile_role()
returns trigger language plpgsql as $$
begin
  -- JWT 없는 직접 접속(대시보드 SQL·서비스 롤)은 허용, 일반 사용자는 admin만 변경 가능
  if new.role is distinct from old.role and auth.uid() is not null
     and not public.is_admin() and auth.role() <> 'service_role' then
    raise exception 'role change not allowed' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger profiles_guard_role before update on public.profiles
  for each row execute function public.guard_profile_role();

alter table public.profiles enable row level security;
create policy "profiles: self read" on public.profiles for select using (auth.uid() = user_id or public.is_admin());
create policy "profiles: self update" on public.profiles for update using (auth.uid() = user_id or public.is_admin());

-- ── pets ──────────────────────────────────────────────────
create table public.pets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  species public.pet_species not null,
  name text not null check (char_length(name) between 1 and 40),
  birth_date date,
  estimated_birth boolean not null default false,
  sex public.pet_sex not null default 'unknown',
  neutered boolean,
  weight_kg numeric(5,2) check (weight_kg is null or (weight_kg > 0 and weight_kg < 200)),
  indoor boolean,
  multi_pet boolean,
  registration_status public.registration_status not null default 'unknown',
  insurance_status public.insurance_status not null default 'unknown',
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index pets_owner_idx on public.pets(owner_id) where deleted_at is null;
create trigger pets_updated before update on public.pets for each row execute function public.set_updated_at();

create table public.pet_guardians (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  guardian_role text not null default 'family',
  permission public.guardian_permission not null default 'read',
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (pet_id, user_id)
);
create index pet_guardians_user_idx on public.pet_guardians(user_id);
create trigger pet_guardians_updated before update on public.pet_guardians for each row execute function public.set_updated_at();

-- 반려동물 접근 권한: 소유자이거나 수락된 공동보호자
create or replace function public.can_read_pet(p_pet_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.pets p where p.id = p_pet_id and p.owner_id = auth.uid() and p.deleted_at is null
  ) or exists (
    select 1 from public.pet_guardians g where g.pet_id = p_pet_id and g.user_id = auth.uid() and g.accepted_at is not null
  )
$$;
create or replace function public.can_write_pet(p_pet_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.pets p where p.id = p_pet_id and p.owner_id = auth.uid() and p.deleted_at is null
  ) or exists (
    select 1 from public.pet_guardians g where g.pet_id = p_pet_id and g.user_id = auth.uid()
      and g.accepted_at is not null and g.permission = 'write'
  )
$$;

alter table public.pets enable row level security;
create policy "pets: read own or shared" on public.pets for select
  using (deleted_at is null and (owner_id = auth.uid() or public.can_read_pet(id)));
create policy "pets: insert own" on public.pets for insert with check (owner_id = auth.uid());
create policy "pets: update own" on public.pets for update using (owner_id = auth.uid());
create policy "pets: delete own" on public.pets for delete using (owner_id = auth.uid());

alter table public.pet_guardians enable row level security;
create policy "guardians: read" on public.pet_guardians for select
  using (user_id = auth.uid() or exists (select 1 from public.pets p where p.id = pet_id and p.owner_id = auth.uid()));
create policy "guardians: owner manages" on public.pet_guardians for all
  using (exists (select 1 from public.pets p where p.id = pet_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from public.pets p where p.id = pet_id and p.owner_id = auth.uid()));
create policy "guardians: accept own invite" on public.pet_guardians for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.pet_conditions (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets(id) on delete cascade,
  type public.condition_type not null,
  name text not null check (char_length(name) between 1 and 80),
  note text,
  active boolean not null default true,
  source text not null default 'owner',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index pet_conditions_pet_idx on public.pet_conditions(pet_id);
create trigger pet_conditions_updated before update on public.pet_conditions for each row execute function public.set_updated_at();
alter table public.pet_conditions enable row level security;
create policy "conditions: read" on public.pet_conditions for select using (public.can_read_pet(pet_id));
create policy "conditions: write" on public.pet_conditions for all
  using (public.can_write_pet(pet_id)) with check (public.can_write_pet(pet_id));

-- ── 오늘 할 일 ────────────────────────────────────────────
create table public.care_task_templates (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  species public.pet_species,                -- null = 공통
  life_stage text,                           -- puppy/kitten, adult, senior, null=공통
  category text not null,                    -- legal/health/poison/outdoor/behavior/cat_env
  title text not null,
  description text,
  rule_json jsonb not null default '{}'::jsonb,
  priority public.task_priority not null default 'general',
  version integer not null default 1,
  source_id text,
  source_url text,
  reviewed_at date,
  status public.content_status not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger care_task_templates_updated before update on public.care_task_templates for each row execute function public.set_updated_at();
alter table public.care_task_templates enable row level security;
create policy "templates: public read published" on public.care_task_templates for select using (status = 'published' or public.is_reviewer_or_admin());
create policy "templates: admin write" on public.care_task_templates for all using (public.is_admin()) with check (public.is_admin());

create table public.care_tasks (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets(id) on delete cascade,
  template_id uuid references public.care_task_templates(id) on delete set null,
  title text not null check (char_length(title) between 1 and 120),
  description text,
  due_at timestamptz not null,
  repeat_rule text,                          -- 'daily' | 'weekly' | 'monthly' | null
  priority public.task_priority not null default 'general',
  status public.task_status not null default 'pending',
  completed_at timestamptz,
  snoozed_until timestamptz,
  note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index care_tasks_pet_due_idx on public.care_tasks(pet_id, due_at);
create trigger care_tasks_updated before update on public.care_tasks for each row execute function public.set_updated_at();
alter table public.care_tasks enable row level security;
create policy "tasks: read" on public.care_tasks for select using (public.can_read_pet(pet_id));
create policy "tasks: write" on public.care_tasks for all
  using (public.can_write_pet(pet_id)) with check (public.can_write_pet(pet_id));

-- ── 건강 기록 ─────────────────────────────────────────────
create table public.health_events (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets(id) on delete cascade,
  event_type text not null,                  -- weight/medication_note/exam/visit/cost/task_done/observation/document
  occurred_at timestamptz not null default now(),
  value_json jsonb not null default '{}'::jsonb,
  note text,
  visibility text not null default 'private',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index health_events_pet_idx on public.health_events(pet_id, occurred_at desc);
create trigger health_events_updated before update on public.health_events for each row execute function public.set_updated_at();
alter table public.health_events enable row level security;
create policy "events: read" on public.health_events for select using (public.can_read_pet(pet_id));
create policy "events: write" on public.health_events for all
  using (public.can_write_pet(pet_id)) with check (public.can_write_pet(pet_id));

-- ── 비공개 문서 ───────────────────────────────────────────
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  document_type text not null,               -- receipt/lab/vaccination/insurance/registration/other
  storage_path text not null unique,
  original_name text not null,
  mime_type text not null,
  size integer not null check (size > 0 and size <= 10485760),
  scan_status text not null default 'not_scanned',   -- 악성파일 검사 연결 지점
  retention_until date,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index documents_pet_idx on public.documents(pet_id) where deleted_at is null;
create trigger documents_updated before update on public.documents for each row execute function public.set_updated_at();
alter table public.documents enable row level security;
create policy "documents: read" on public.documents for select using (deleted_at is null and public.can_read_pet(pet_id));
create policy "documents: insert" on public.documents for insert with check (owner_id = auth.uid() and public.can_write_pet(pet_id));
create policy "documents: update" on public.documents for update using (owner_id = auth.uid());
create policy "documents: delete" on public.documents for delete using (owner_id = auth.uid());
