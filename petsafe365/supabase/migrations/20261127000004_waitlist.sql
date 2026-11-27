-- 출시 알림 신청. 누구나 남기고, 운영자만 읽는다. 같은 이메일은 한 번만 받는다.
create table public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 200),
  dog_size text not null default 'unknown' check (dog_size in ('small','medium','large','unknown')),
  consent_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.waitlist enable row level security;
revoke all on public.waitlist from anon, authenticated;
grant insert on public.waitlist to anon, authenticated;
grant select, delete on public.waitlist to authenticated;
create policy waitlist_insert on public.waitlist for insert to anon, authenticated with check (true);
create policy waitlist_admin_read on public.waitlist for select to authenticated using (public.is_admin());
create policy waitlist_admin_delete on public.waitlist for delete to authenticated using (public.is_admin());
