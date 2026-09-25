-- 펫안심365 마이그레이션 0006: 추모(함께한 날들)
-- 떠나보낸 날과 기일 알림 여부, 보호자가 남기는 비공개 편지.
alter table public.pets add column if not exists passed_at date;
alter table public.pets add column if not exists memorial_reminders boolean not null default true;

create table public.memorial_letters (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index memorial_letters_pet_idx on public.memorial_letters(pet_id, created_at desc);
create trigger memorial_letters_updated before update on public.memorial_letters for each row execute function public.set_updated_at();
alter table public.memorial_letters enable row level security;
create policy "letters: read" on public.memorial_letters for select using (public.can_read_pet(pet_id));
create policy "letters: write own" on public.memorial_letters for insert with check (author_id = auth.uid() and public.can_write_pet(pet_id));
create policy "letters: delete own" on public.memorial_letters for delete using (author_id = auth.uid());
