-- 목장 나눔터 002 — 여러 교회가 함께 쓰기 + 목사 알림 + 기도제목 중복 정리
-- 기존 자료는 지우지 않는다. 지금까지의 모든 자료는 '멜번방주교회 & ALF'로 묶인다.
-- 적용 전 백업: church_bak_20261015_* 표 (RLS로 화면에서는 보이지 않음)

-- ── 1. 교회 ───────────────────────────────────────────────
create table if not exists public.church_church (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,                       -- 로그인 화면 주소용 짧은 이름 (?c=bangjoo)
  name text not null,
  timezone text not null default 'Australia/Melbourne',
  logo_url text not null default '',
  created_at timestamptz not null default now()
);
alter table public.church_church enable row level security;

insert into public.church_church (slug, name, timezone, logo_url)
values ('bangjoo', '멜번방주교회 & ALF', 'Australia/Melbourne', 'assets/logo.png')
on conflict (slug) do nothing;

-- ── 2. 계정·목장에 교회 표시 ────────────────────────────────
alter table public.church_profile add column if not exists church_id uuid references public.church_church(id) on delete cascade;
alter table public.church_mokjang add column if not exists church_id uuid references public.church_church(id) on delete cascade;
update public.church_profile set church_id = (select id from public.church_church where slug = 'bangjoo') where church_id is null;
update public.church_mokjang set church_id = (select id from public.church_church where slug = 'bangjoo') where church_id is null;
create index if not exists church_profile_church_idx on public.church_profile(church_id);
create index if not exists church_mokjang_church_idx on public.church_mokjang(church_id);

-- ── 3. 권한 판단 — 목사는 자기 교회만 ───────────────────────
create or replace function public.church_my_church()
returns uuid language sql stable security definer set search_path = public as $$
  select church_id from public.church_profile where id = auth.uid();
$$;

create or replace function public.church_can_see_mokjang(mid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.church_mokjang m
    where m.id = mid
      and (m.mokja_id = auth.uid()
           or (public.church_is_pastor() and m.church_id = public.church_my_church()))
  );
$$;

-- 교회 소속과 역할은 화면에서 바꿀 수 없다 (서버 함수만)
create or replace function public.church_profile_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.role() = 'service_role' then return new; end if;
  new.church_id := old.church_id;
  if not public.church_is_pastor() then
    new.role := old.role;
    new.login_id := old.login_id;
  end if;
  return new;
end $$;

create or replace function public.church_mokjang_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.role() = 'service_role' then return new; end if;
  new.church_id := old.church_id;
  return new;
end $$;
drop trigger if exists church_mokjang_guard_trg on public.church_mokjang;
create trigger church_mokjang_guard_trg before update on public.church_mokjang
  for each row execute function public.church_mokjang_guard();

drop policy if exists church_profile_sel on public.church_profile;
create policy church_profile_sel on public.church_profile for select to authenticated
  using (id = auth.uid() or (public.church_is_pastor() and church_id = public.church_my_church()));
drop policy if exists church_profile_upd on public.church_profile;
create policy church_profile_upd on public.church_profile for update to authenticated
  using (id = auth.uid() or (public.church_is_pastor() and church_id = public.church_my_church()))
  with check (id = auth.uid() or (public.church_is_pastor() and church_id = public.church_my_church()));

drop policy if exists church_mokjang_sel on public.church_mokjang;
create policy church_mokjang_sel on public.church_mokjang for select to authenticated
  using (mokja_id = auth.uid() or (public.church_is_pastor() and church_id = public.church_my_church()));
drop policy if exists church_mokjang_ins on public.church_mokjang;
create policy church_mokjang_ins on public.church_mokjang for insert to authenticated
  with check (public.church_is_pastor() and church_id = public.church_my_church());
drop policy if exists church_mokjang_upd on public.church_mokjang;
create policy church_mokjang_upd on public.church_mokjang for update to authenticated
  using (mokja_id = auth.uid() or (public.church_is_pastor() and church_id = public.church_my_church()))
  with check (mokja_id = auth.uid() or (public.church_is_pastor() and church_id = public.church_my_church()));
drop policy if exists church_mokjang_del on public.church_mokjang;
create policy church_mokjang_del on public.church_mokjang for delete to authenticated
  using (public.church_is_pastor() and church_id = public.church_my_church());

-- 답글 고치기·지우기도 자기 교회 안에서만
drop policy if exists church_comment_upd on public.church_comment;
create policy church_comment_upd on public.church_comment for update to authenticated
  using (author_id = auth.uid() or (public.church_is_pastor() and public.church_can_see_mokjang(public.church_journal_mokjang(journal_id))))
  with check (author_id = auth.uid() or (public.church_is_pastor() and public.church_can_see_mokjang(public.church_journal_mokjang(journal_id))));
drop policy if exists church_comment_del on public.church_comment;
create policy church_comment_del on public.church_comment for delete to authenticated
  using (author_id = auth.uid() or (public.church_is_pastor() and public.church_can_see_mokjang(public.church_journal_mokjang(journal_id))));

-- 교회 정보: 소속 교회만 읽고, 목사만 고친다
drop policy if exists church_church_sel on public.church_church;
create policy church_church_sel on public.church_church for select to authenticated
  using (id = public.church_my_church());
drop policy if exists church_church_upd on public.church_church;
create policy church_church_upd on public.church_church for update to authenticated
  using (public.church_is_pastor() and id = public.church_my_church())
  with check (public.church_is_pastor() and id = public.church_my_church());

-- 로그인 전 화면에 교회 이름·로고만 보여 주기
create or replace function public.church_public_info(p_slug text)
returns table (name text, logo_url text) language sql stable security definer set search_path = public as $$
  select c.name, c.logo_url from public.church_church c where c.slug = p_slug;
$$;
grant execute on function public.church_public_info(text) to anon, authenticated;

-- ── 4. 새 교회 초대 코드 (서버 함수만 읽음) ─────────────────
create table if not exists public.church_invite (
  code text primary key,
  note text not null default '',
  active boolean not null default true,
  max_uses int,                                   -- 비우면 횟수 제한 없음
  uses int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.church_invite enable row level security;

-- ── 5. 알림 구독 (기기 하나 = 한 줄) ────────────────────────
create table if not exists public.church_push (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists church_push_user_idx on public.church_push(user_id);
alter table public.church_push enable row level security;
drop policy if exists church_push_own on public.church_push;
create policy church_push_own on public.church_push for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 같은 기기를 다른 계정이 쓰게 되면 그 기기는 지금 계정 것으로 옮긴다
create or replace function public.church_push_save(p_endpoint text, p_p256dh text, p_auth text, p_ua text)
returns void language sql security definer set search_path = public as $$
  insert into public.church_push (user_id, endpoint, p256dh, auth, user_agent)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth, coalesce(p_ua, ''))
  on conflict (endpoint) do update
    set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth,
        user_agent = excluded.user_agent, created_at = now();
$$;
revoke all on function public.church_push_save(text, text, text, text) from public, anon;
grant execute on function public.church_push_save(text, text, text, text) to authenticated;

alter table public.church_journal add column if not exists notified_at timestamptz;

-- ── 6. 기도제목 중복 정리 ──────────────────────────────────
-- 예전 화면은 같은 일기를 여러 번 저장하면 기도제목 줄을 다시 넣었다(내용은 같음).
-- 한 일기·한 목원당 한 줄만 남기고, 순서는 목원 명단 순으로 다시 매긴다.
with ranked as (
  select id, row_number() over (partition by journal_id, mokwon_id
                                order by length(content) desc, sort_order, id) as rn
  from public.church_prayer where mokwon_id is not null
)
delete from public.church_prayer p using ranked r where p.id = r.id and r.rn > 1;

with o as (
  select p.id, row_number() over (partition by p.journal_id
           order by coalesce(w.sort_order, 9999), w.created_at, p.sort_order) - 1 as rn
  from public.church_prayer p left join public.church_mokwon w on w.id = p.mokwon_id
)
update public.church_prayer p set sort_order = o.rn from o where o.id = p.id and p.sort_order <> o.rn;

-- 앞으로는 같은 목원 줄을 또 넣으려 하면 새 줄 대신 기존 줄을 고친다 (예전 화면이 열려 있어도 안전)
create or replace function public.church_prayer_dedupe()
returns trigger language plpgsql as $$
declare existing uuid;
begin
  if new.mokwon_id is null then return new; end if;
  select id into existing from public.church_prayer
   where journal_id = new.journal_id and mokwon_id = new.mokwon_id limit 1;
  if existing is null then return new; end if;
  update public.church_prayer
     set name = new.name, attended = new.attended, content = new.content, answered = new.answered
   where id = existing;
  return null;
end $$;
drop trigger if exists church_prayer_dedupe_trg on public.church_prayer;
create trigger church_prayer_dedupe_trg before insert on public.church_prayer
  for each row execute function public.church_prayer_dedupe();

alter table public.church_prayer drop constraint if exists church_prayer_journal_mokwon_uniq;
alter table public.church_prayer add constraint church_prayer_journal_mokwon_uniq unique (journal_id, mokwon_id);
