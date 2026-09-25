-- 펫안심365 마이그레이션 0002: 콘텐츠 CMS·공식 연락처·신고 준비·법무·감사로그·기능 플래그

-- ── 콘텐츠 CMS (건강·인수공통감염병) ──────────────────────
create table public.content_cards (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  content_type text not null,                -- zoonosis / health_rule / emergency_guide
  species text[] not null default '{}',      -- dog, cat, human
  current_version_id uuid,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger content_cards_updated before update on public.content_cards for each row execute function public.set_updated_at();

create table public.content_versions (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.content_cards(id) on delete cascade,
  version integer not null,
  title text not null,
  summary text not null,
  body_json jsonb not null default '{}'::jsonb,   -- animal_signs, human_signs, transmission, prevention, ...
  source_json jsonb not null default '[]'::jsonb, -- [{organization, url, checked_at}]
  author_id uuid references auth.users(id) on delete set null,
  author_name text,
  reviewer_id uuid references auth.users(id) on delete set null,
  reviewer_name text,
  reviewer_credential text,
  reviewed_at date,
  next_review_at date,
  expires_at date,
  status public.content_status not null default 'draft',
  change_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (content_id, version)
);
create index content_versions_content_idx on public.content_versions(content_id, version desc);
create trigger content_versions_updated before update on public.content_versions for each row execute function public.set_updated_at();
alter table public.content_cards add constraint content_cards_current_fk
  foreign key (current_version_id) references public.content_versions(id) on delete set null;

-- 공개 규칙: 카드가 published이고 현재 버전이 approved/published이며 만료 전인 것만 비회원에게 보인다.
create or replace function public.content_is_public(p_card_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.content_cards c
    join public.content_versions v on v.id = c.current_version_id
    where c.id = p_card_id and c.status = 'published'
      and v.status in ('approved', 'published')
      and (v.expires_at is null or v.expires_at >= current_date)
      and v.reviewer_name is not null and v.reviewed_at is not null
  )
$$;

alter table public.content_cards enable row level security;
create policy "content: public read" on public.content_cards for select
  using (public.content_is_public(id) or public.is_reviewer_or_admin());
create policy "content: reviewer write" on public.content_cards for all
  using (public.is_reviewer_or_admin()) with check (public.is_reviewer_or_admin());

alter table public.content_versions enable row level security;
create policy "versions: public read current" on public.content_versions for select
  using (public.is_reviewer_or_admin() or (
    public.content_is_public(content_id)
    and id = (select current_version_id from public.content_cards where id = content_id)
  ));
create policy "versions: reviewer write" on public.content_versions for all
  using (public.is_reviewer_or_admin()) with check (public.is_reviewer_or_admin());

-- ── 공식 연락처 ───────────────────────────────────────────
create table public.official_contacts (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  category text not null,                    -- lost_found / abuse / illegal_practice / dispute / registration / emergency
  organization text not null,
  phone text,
  url text,
  coverage_area text not null default '전국',
  available_hours text,
  description text,
  verified_at date,
  valid_from date,
  valid_to date,
  source_url text,
  status text not null default 'pending_verification',  -- active / pending_verification / retired
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger official_contacts_updated before update on public.official_contacts for each row execute function public.set_updated_at();
alter table public.official_contacts enable row level security;
create policy "contacts: public read" on public.official_contacts for select
  using (status in ('active', 'pending_verification') and (valid_to is null or valid_to >= current_date) or public.is_admin());
create policy "contacts: admin write" on public.official_contacts for all using (public.is_admin()) with check (public.is_admin());

-- ── 신고 준비 초안 (사용자가 원할 때만 계정에 저장) ───────
create table public.incident_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pet_id uuid references public.pets(id) on delete set null,
  incident_type text not null,               -- lost / found / abandoned / abuse / illegal_practice / dispute
  occurred_at timestamptz,
  location_precision text not null default 'coarse' check (location_precision in ('none', 'coarse')),
  location_text text,                        -- 행정동·지하철역 수준. 정밀 좌표 저장 금지(기능 플래그)
  details_json jsonb not null default '{}'::jsonb,
  retention_until date not null default (current_date + interval '90 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index incident_drafts_user_idx on public.incident_drafts(user_id);
create trigger incident_drafts_updated before update on public.incident_drafts for each row execute function public.set_updated_at();
alter table public.incident_drafts enable row level security;
create policy "incidents: own" on public.incident_drafts for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── 법무 문서·동의 ────────────────────────────────────────
create table public.legal_documents (
  id uuid primary key default gen_random_uuid(),
  document_type text not null,               -- terms / privacy / location / copyright / refund / ads
  version text not null,
  title text not null,
  effective_at date not null,
  body text not null,
  required boolean not null default true,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (document_type, version)
);
create trigger legal_documents_updated before update on public.legal_documents for each row execute function public.set_updated_at();
alter table public.legal_documents enable row level security;
create policy "legal: public read published" on public.legal_documents for select using (status = 'published' or public.is_admin());
create policy "legal: admin write" on public.legal_documents for all using (public.is_admin()) with check (public.is_admin());

create table public.user_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_type text not null,
  document_version text not null,
  consented_at timestamptz not null default now(),
  withdrawn_at timestamptz,
  ip_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index user_consents_user_idx on public.user_consents(user_id, document_type);
create trigger user_consents_updated before update on public.user_consents for each row execute function public.set_updated_at();
alter table public.user_consents enable row level security;
create policy "consents: own read" on public.user_consents for select using (user_id = auth.uid() or public.is_admin());
create policy "consents: own insert" on public.user_consents for insert with check (user_id = auth.uid());
create policy "consents: own withdraw" on public.user_consents for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── 감사로그 (추가만 가능, 관리자만 열람) ─────────────────
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  actor_role text,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_created_idx on public.audit_logs(created_at desc);
alter table public.audit_logs enable row level security;
create policy "audit: admin read" on public.audit_logs for select using (public.is_admin());
create policy "audit: authenticated insert own" on public.audit_logs for insert
  with check (actor_id = auth.uid());
-- update/delete 정책 없음 = 불변

-- ── 법무 기능 플래그 (기본 false, 관리자 승인·감사로그 필요) ─
create table public.feature_flags (
  key text primary key,
  enabled boolean not null default false,
  reason text,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger feature_flags_updated before update on public.feature_flags for each row execute function public.set_updated_at();
insert into public.feature_flags (key, enabled) values
  ('paymentsEnabled', false),
  ('partnerSubscriptionsEnabled', false),
  ('insuranceReferralEnabled', false),
  ('preciseLocationStorageEnabled', false),
  ('publicReviewsEnabled', false);
-- 플래그를 켤 때는 승인자·사유가 필수
create or replace function public.guard_feature_flag()
returns trigger language plpgsql as $$
begin
  if new.enabled and (new.approved_by is null or coalesce(new.reason, '') = '') then
    raise exception 'feature flag requires approved_by and reason' using errcode = '23514';
  end if;
  if new.enabled and not old.enabled then
    new.approved_at = now();
  end if;
  return new;
end $$;
create trigger feature_flags_guard before update on public.feature_flags for each row execute function public.guard_feature_flag();
alter table public.feature_flags enable row level security;
create policy "flags: public read" on public.feature_flags for select using (true);
create policy "flags: admin update" on public.feature_flags for update using (public.is_admin()) with check (public.is_admin());
