-- 눈치(Nunchi) 한국어 학습 로그
-- 이 테이블들이 쌓이면 곧 우리만의 학습자 말뭉치가 된다. 브라우저에서 직접 읽고 쓰지 못하게 막고,
-- Edge Function(서비스 롤)만 접근한다.

create table if not exists public.nunchi_turns (
  id          bigserial primary key,
  created_at  timestamptz not null default now(),
  device      text        not null,
  mode        text        not null check (mode in ('dial','chat','review')),
  scene       text,
  level       text,
  prompt      text        not null,
  output      text        not null,
  ms          integer
);
create index if not exists nunchi_turns_device_idx on public.nunchi_turns (device, created_at desc);
create index if not exists nunchi_turns_mode_idx   on public.nunchi_turns (mode, created_at desc);

create table if not exists public.nunchi_quota (
  device text not null,
  day    date not null,
  calls  integer not null default 0,
  primary key (device, day)
);

-- 호출 수를 원자적으로 올린다(동시 요청에서도 상한이 새지 않도록)
create or replace function public.nunchi_bump_quota(p_device text, p_day date)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.nunchi_quota (device, day, calls)
  values (p_device, p_day, 1)
  on conflict (device, day) do update set calls = public.nunchi_quota.calls + 1;
$$;

alter table public.nunchi_turns enable row level security;
alter table public.nunchi_quota enable row level security;
-- 정책을 하나도 만들지 않으면 anon/authenticated 는 아무것도 못 한다. 서비스 롤은 RLS를 우회한다.

revoke all on function public.nunchi_bump_quota(text, date) from public, anon, authenticated;
