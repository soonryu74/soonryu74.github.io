-- 가정교회 목장 일기·기도제목 나눔터
-- 목자는 자기 목장만, 목사는 모든 목장을 본다. 접근 통제는 전부 RLS로 건다.
-- (Supabase 무료 프로젝트 2개 제한 때문에 korea-now 프로젝트에 church_ 접두어로 함께 둔다)

create extension if not exists pgcrypto;

-- 1) 계정 프로필 : auth.users 1:1
create table if not exists public.church_profile (
  id uuid primary key references auth.users(id) on delete cascade,
  login_id text unique,
  name text not null default '',
  role text not null default 'mokja' check (role in ('pastor', 'mokja')),
  created_at timestamptz not null default now()
);

-- 2) 목장
create table if not exists public.church_mokjang (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  mokja_id uuid references auth.users(id) on delete set null,
  mokja_name text not null default '',
  meet_day text not null default '',
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists church_mokjang_mokja_idx on public.church_mokjang(mokja_id);

-- 3) 목원 명단
create table if not exists public.church_mokwon (
  id uuid primary key default gen_random_uuid(),
  mokjang_id uuid not null references public.church_mokjang(id) on delete cascade,
  name text not null,
  tag text not null default '',            -- 새가족 / VIP / 장결 등 표시
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists church_mokwon_mokjang_idx on public.church_mokwon(mokjang_id);

-- 4) 주간 목장 일기 (목장 1곳 · 한 주 1건)
create table if not exists public.church_journal (
  id uuid primary key default gen_random_uuid(),
  mokjang_id uuid not null references public.church_mokjang(id) on delete cascade,
  week_start date not null,                -- 그 주 월요일
  met_on date,                             -- 실제 모인 날
  present_count int,
  total_count int,
  body text not null default '',           -- 목장 이야기
  mokjang_prayer text not null default '', -- 목장 전체 기도제목
  status text not null default 'draft' check (status in ('draft', 'submitted')),
  submitted_at timestamptz,
  author_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (mokjang_id, week_start)
);
create index if not exists church_journal_week_idx on public.church_journal(week_start desc);

-- 5) 목원별 기도제목 (그 주 일기에 딸린다)
create table if not exists public.church_prayer (
  id uuid primary key default gen_random_uuid(),
  journal_id uuid not null references public.church_journal(id) on delete cascade,
  mokwon_id uuid references public.church_mokwon(id) on delete set null,
  name text not null default '',           -- 그 주 이름 스냅샷
  attended boolean not null default true,
  content text not null default '',
  answered boolean not null default false,
  sort_order int not null default 0
);
create index if not exists church_prayer_journal_idx on public.church_prayer(journal_id);

-- 6) 목사 코멘트
create table if not exists public.church_comment (
  id uuid primary key default gen_random_uuid(),
  journal_id uuid not null references public.church_journal(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  author_name text not null default '',
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists church_comment_journal_idx on public.church_comment(journal_id);

-- 7) 최초 목사 계정을 만들 때 한 번 쓰는 설치 코드 (RLS로 아무도 못 읽는다)
create table if not exists public.church_setup (
  id int primary key default 1,
  setup_code text not null,
  used boolean not null default false
);

-- ─────────────────────────── 권한 판단 함수 ───────────────────────────
create or replace function public.church_is_pastor()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'pastor' from public.church_profile where id = auth.uid()), false);
$$;

create or replace function public.church_owns_mokjang(mid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.church_mokjang m where m.id = mid and m.mokja_id = auth.uid());
$$;

create or replace function public.church_can_see_mokjang(mid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.church_is_pastor() or public.church_owns_mokjang(mid);
$$;

create or replace function public.church_journal_mokjang(jid uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select mokjang_id from public.church_journal where id = jid;
$$;

-- 프로필에서 스스로 역할을 올리지 못하게 막는다
create or replace function public.church_profile_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.role() = 'service_role' or public.church_is_pastor() then
    return new;
  end if;
  new.role := old.role;
  new.login_id := old.login_id;
  return new;
end $$;

drop trigger if exists church_profile_guard_trg on public.church_profile;
create trigger church_profile_guard_trg
  before update on public.church_profile
  for each row execute function public.church_profile_guard();

create or replace function public.church_touch_updated()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists church_journal_touch on public.church_journal;
create trigger church_journal_touch
  before update on public.church_journal
  for each row execute function public.church_touch_updated();

-- ─────────────────────────── RLS ───────────────────────────
alter table public.church_profile  enable row level security;
alter table public.church_mokjang  enable row level security;
alter table public.church_mokwon   enable row level security;
alter table public.church_journal  enable row level security;
alter table public.church_prayer   enable row level security;
alter table public.church_comment  enable row level security;
alter table public.church_setup    enable row level security;
-- church_setup 에는 정책을 하나도 두지 않는다 = 브라우저에서 절대 못 읽는다

drop policy if exists church_profile_sel on public.church_profile;
create policy church_profile_sel on public.church_profile for select to authenticated
  using (id = auth.uid() or public.church_is_pastor());
drop policy if exists church_profile_upd on public.church_profile;
create policy church_profile_upd on public.church_profile for update to authenticated
  using (id = auth.uid() or public.church_is_pastor())
  with check (id = auth.uid() or public.church_is_pastor());

drop policy if exists church_mokjang_sel on public.church_mokjang;
create policy church_mokjang_sel on public.church_mokjang for select to authenticated
  using (public.church_is_pastor() or mokja_id = auth.uid());
drop policy if exists church_mokjang_ins on public.church_mokjang;
create policy church_mokjang_ins on public.church_mokjang for insert to authenticated
  with check (public.church_is_pastor());
drop policy if exists church_mokjang_upd on public.church_mokjang;
create policy church_mokjang_upd on public.church_mokjang for update to authenticated
  using (public.church_is_pastor() or mokja_id = auth.uid())
  with check (public.church_is_pastor() or mokja_id = auth.uid());
drop policy if exists church_mokjang_del on public.church_mokjang;
create policy church_mokjang_del on public.church_mokjang for delete to authenticated
  using (public.church_is_pastor());

drop policy if exists church_mokwon_all on public.church_mokwon;
create policy church_mokwon_all on public.church_mokwon for all to authenticated
  using (public.church_can_see_mokjang(mokjang_id))
  with check (public.church_can_see_mokjang(mokjang_id));

drop policy if exists church_journal_all on public.church_journal;
create policy church_journal_all on public.church_journal for all to authenticated
  using (public.church_can_see_mokjang(mokjang_id))
  with check (public.church_can_see_mokjang(mokjang_id));

drop policy if exists church_prayer_all on public.church_prayer;
create policy church_prayer_all on public.church_prayer for all to authenticated
  using (public.church_can_see_mokjang(public.church_journal_mokjang(journal_id)))
  with check (public.church_can_see_mokjang(public.church_journal_mokjang(journal_id)));

drop policy if exists church_comment_sel on public.church_comment;
create policy church_comment_sel on public.church_comment for select to authenticated
  using (public.church_can_see_mokjang(public.church_journal_mokjang(journal_id)));
drop policy if exists church_comment_ins on public.church_comment;
create policy church_comment_ins on public.church_comment for insert to authenticated
  with check (author_id = auth.uid() and public.church_can_see_mokjang(public.church_journal_mokjang(journal_id)));
drop policy if exists church_comment_upd on public.church_comment;
create policy church_comment_upd on public.church_comment for update to authenticated
  using (author_id = auth.uid() or public.church_is_pastor())
  with check (author_id = auth.uid() or public.church_is_pastor());
drop policy if exists church_comment_del on public.church_comment;
create policy church_comment_del on public.church_comment for delete to authenticated
  using (author_id = auth.uid() or public.church_is_pastor());
