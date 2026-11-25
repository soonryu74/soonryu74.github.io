-- 말씀 알림 (/malsseum/) — Supabase 표. korea-now 프로젝트(dxhmprqfgigljgbstqrg)에 mal_ 접두어로 둔다.
-- 표는 RLS로 모두 잠그고(정책 없음), Edge Function mal-notify 가 service role 로만 읽고 쓴다.

create table if not exists public.mal_user (
  id          uuid primary key default gen_random_uuid(),
  key_hash    text not null unique,            -- 연결 코드의 SHA-256 (코드 자체는 저장하지 않는다)
  items       jsonb not null default '[]',     -- [{id, kind: verse|quote|prayer, ref, text}]
  kinds       text[] not null default '{verse,quote,prayer}',   -- 보낼 종류
  interval_min int not null default 60 check (interval_min in (30, 60, 120, 180)),
  quiet_start int not null default 22 check (quiet_start between 0 and 23),   -- 조용한 시간 시작(시)
  quiet_end   int not null default 7  check (quiet_end between 0 and 23),     -- 조용한 시간 끝(시)
  tz          text not null default 'Asia/Seoul',
  enabled     boolean not null default true,
  cursor      int not null default 0,          -- 다음에 보낼 순번
  next_at     timestamptz,                     -- 다음 발송 시각
  last_sent_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists mal_user_next_at on public.mal_user (next_at) where enabled;

create table if not exists public.mal_push (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.mal_user(id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);
create index if not exists mal_push_user on public.mal_push (user_id);

create table if not exists public.mal_secret (
  name  text primary key,
  value text not null
);

alter table public.mal_user   enable row level security;
alter table public.mal_push   enable row level security;
alter table public.mal_secret enable row level security;
revoke all on public.mal_user, public.mal_push, public.mal_secret from anon, authenticated;

-- 5분마다 발송 함수를 깨운다 (보낼 때가 된 사람에게만 보낸다. 여러 번 불러도 한 번만 간다)
select cron.schedule(
  'mal-notify-tick',
  '*/5 * * * *',
  $$ select net.http_post(
       url := 'https://dxhmprqfgigljgbstqrg.supabase.co/functions/v1/mal-notify',
       headers := '{"Content-Type":"application/json"}'::jsonb,
       body := '{"action":"tick"}'::jsonb
     ) $$
);
