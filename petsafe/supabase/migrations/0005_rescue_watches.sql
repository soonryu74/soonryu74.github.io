-- 펫안심365 마이그레이션 0005: 실종·구조동물 관심 조건(앱 내 새 공고 알림)
-- 정밀 위치는 저장하지 않는다. 시도·시군구 코드와 키워드만 저장한다.
create table public.rescue_watches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 40),
  sido_code text,
  sido_name text,
  sigungu_code text,
  sigungu_name text,
  species text check (species is null or species in ('dog', 'cat', 'other')),
  keyword text check (keyword is null or char_length(keyword) <= 60),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index rescue_watches_user_idx on public.rescue_watches(user_id);
create trigger rescue_watches_updated before update on public.rescue_watches for each row execute function public.set_updated_at();

-- 사용자당 최대 5개 (API 트래픽 보호)
create or replace function public.limit_rescue_watches()
returns trigger language plpgsql as $$
begin
  if (select count(*) from public.rescue_watches where user_id = new.user_id) >= 5 then
    raise exception 'rescue watch limit reached' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger rescue_watches_limit before insert on public.rescue_watches for each row execute function public.limit_rescue_watches();

alter table public.rescue_watches enable row level security;
create policy "rescue_watches: own" on public.rescue_watches for all using (user_id = auth.uid()) with check (user_id = auth.uid());
