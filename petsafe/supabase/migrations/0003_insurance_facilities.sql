-- 펫안심365 마이그레이션 0003: 보험 메타정보·시설(지도)·파트너

-- ── 보험 (추천·모집 없음. 사용자 본인 약관 정리 도구) ───────
create type public.insurance_result as enum ('likely_covered', 'check_terms', 'generally_excluded');
create type public.clause_classification as enum ('covered', 'excluded', 'conditional', 'unknown');

create table public.insurance_policies (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets(id) on delete cascade,
  insurer text not null check (char_length(insurer) between 1 and 80),
  product_name text not null check (char_length(product_name) between 1 and 120),
  terms_version text,
  joined_at date,
  renewal_at date,
  coverage_json jsonb not null default '{}'::jsonb,     -- {annual_limit, per_visit_limit, coverage_rate}
  deductible_json jsonb not null default '{}'::jsonb,   -- {per_visit, copay_rate}
  customer_center text,
  user_confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index insurance_policies_pet_idx on public.insurance_policies(pet_id);
create trigger insurance_policies_updated before update on public.insurance_policies for each row execute function public.set_updated_at();
alter table public.insurance_policies enable row level security;
create policy "policies: read" on public.insurance_policies for select using (public.can_read_pet(pet_id));
create policy "policies: write" on public.insurance_policies for all using (public.can_write_pet(pet_id)) with check (public.can_write_pet(pet_id));

create table public.insurance_terms (
  id uuid primary key default gen_random_uuid(),
  policy_id uuid not null references public.insurance_policies(id) on delete cascade,
  category text not null,                    -- treatment category key
  clause_text text not null,
  clause_reference text,
  classification public.clause_classification not null default 'unknown',
  source_document_id uuid references public.documents(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index insurance_terms_policy_idx on public.insurance_terms(policy_id);
create trigger insurance_terms_updated before update on public.insurance_terms for each row execute function public.set_updated_at();
create or replace function public.can_write_policy(p_policy_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.insurance_policies ip where ip.id = p_policy_id and public.can_write_pet(ip.pet_id))
$$;
create or replace function public.can_read_policy(p_policy_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.insurance_policies ip where ip.id = p_policy_id and public.can_read_pet(ip.pet_id))
$$;
alter table public.insurance_terms enable row level security;
create policy "terms: read" on public.insurance_terms for select using (public.can_read_policy(policy_id));
create policy "terms: write" on public.insurance_terms for all using (public.can_write_policy(policy_id)) with check (public.can_write_policy(policy_id));

create table public.insurance_checks (
  id uuid primary key default gen_random_uuid(),
  policy_id uuid not null references public.insurance_policies(id) on delete cascade,
  input_json jsonb not null,
  result public.insurance_result not null,
  evidence_json jsonb not null default '{}'::jsonb,   -- {evidence_type, evidence_text, terms_version}
  checked_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index insurance_checks_policy_idx on public.insurance_checks(policy_id, checked_at desc);
create trigger insurance_checks_updated before update on public.insurance_checks for each row execute function public.set_updated_at();
alter table public.insurance_checks enable row level security;
create policy "checks: read" on public.insurance_checks for select using (public.can_read_policy(policy_id));
create policy "checks: write" on public.insurance_checks for all using (public.can_write_policy(policy_id)) with check (public.can_write_policy(policy_id));

-- ── 시설 (공공데이터 원본과 정규화 레코드 분리) ──────────────
create type public.facility_type as enum (
  'animal_hospital', 'animal_pharmacy', 'shelter', 'grooming', 'boarding', 'funeral', 'transport',
  'pet_cafe', 'park', 'playground', 'lodging', 'restaurant', 'shopping'
);
create type public.business_status as enum ('open', 'closed', 'suspended', 'unknown');
create type public.verification_state as enum ('verified', 'unverified', 'disputed');

create table public.facility_source_records (
  id uuid primary key default gen_random_uuid(),
  source_system text not null,
  source_id text not null,
  raw_json jsonb not null,
  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_system, source_id)
);
create trigger facility_source_records_updated before update on public.facility_source_records for each row execute function public.set_updated_at();

create table public.facilities (
  id uuid primary key default gen_random_uuid(),
  facility_type public.facility_type not null,
  name text not null,
  address text,
  road_address text,
  lat double precision,
  lng double precision,
  coord_source text,                          -- 'epsg5174_converted' | 'wgs84' | 'geocoded' | null
  phone text,
  business_status public.business_status not null default 'unknown',
  business_status_changed_at date,
  source_system text not null,                -- 'demo_fixture' | 'data_go_kr_animal_hospital' | ...
  source_id text not null,
  source_updated_at timestamptz,
  license text,                               -- 데이터 라이선스 표기
  is_example boolean not null default false,  -- 예시 데이터 여부(실제 업체 아님)
  last_synced_at timestamptz,
  merged_into uuid references public.facilities(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_system, source_id)
);
create index facilities_type_idx on public.facilities(facility_type) where merged_into is null;
create index facilities_latlng_idx on public.facilities(lat, lng) where lat is not null;
create trigger facilities_updated before update on public.facilities for each row execute function public.set_updated_at();

create table public.facility_details (
  facility_id uuid primary key references public.facilities(id) on delete cascade,
  hours_json jsonb not null default '{}'::jsonb,
  services_json jsonb not null default '[]'::jsonb,
  pet_access_json jsonb not null default '{}'::jsonb,   -- indoor, outdoor, size_limit, carrier, leash, vaccination_proof, extra_fee, last_confirmed_at
  emergency_status public.verification_state not null default 'unverified',
  specialty_status public.verification_state not null default 'unverified',
  hours_status public.verification_state not null default 'unverified',
  call_before_visit boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger facility_details_updated before update on public.facility_details for each row execute function public.set_updated_at();

create table public.facility_status_history (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities(id) on delete cascade,
  from_status public.business_status,
  to_status public.business_status not null,
  changed_at timestamptz not null default now(),
  source text,
  created_at timestamptz not null default now()
);

create table public.facility_verifications (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities(id) on delete cascade,
  verification_type text not null,           -- business_license / phone_confirmed / partner_submitted
  verified_by uuid references auth.users(id) on delete set null,
  verified_at timestamptz not null default now(),
  expires_at timestamptz,
  evidence text,
  status public.verification_state not null default 'verified',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger facility_verifications_updated before update on public.facility_verifications for each row execute function public.set_updated_at();

create table public.facility_reports (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities(id) on delete cascade,
  reporter_id uuid references auth.users(id) on delete set null,
  report_type text not null,                 -- closed / wrong_phone / wrong_hours / wrong_location / other
  details text,
  status text not null default 'open',       -- open / resolved / rejected
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger facility_reports_updated before update on public.facility_reports for each row execute function public.set_updated_at();

create table public.facility_sync_logs (
  id uuid primary key default gen_random_uuid(),
  source_system text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  fetched integer not null default 0,
  inserted integer not null default 0,
  updated integer not null default 0,
  skipped integer not null default 0,
  errors_json jsonb not null default '[]'::jsonb,
  dry_run boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.facility_source_records enable row level security;
create policy "source_records: admin" on public.facility_source_records for all using (public.is_admin()) with check (public.is_admin());
alter table public.facilities enable row level security;
create policy "facilities: public read" on public.facilities for select using (merged_into is null);
create policy "facilities: admin write" on public.facilities for all using (public.is_admin()) with check (public.is_admin());
alter table public.facility_details enable row level security;
create policy "details: public read" on public.facility_details for select using (true);
create policy "details: admin write" on public.facility_details for all using (public.is_admin()) with check (public.is_admin());
alter table public.facility_status_history enable row level security;
create policy "history: public read" on public.facility_status_history for select using (true);
create policy "history: admin write" on public.facility_status_history for all using (public.is_admin()) with check (public.is_admin());
alter table public.facility_verifications enable row level security;
create policy "verifications: public read" on public.facility_verifications for select using (true);
create policy "verifications: admin write" on public.facility_verifications for all using (public.is_admin()) with check (public.is_admin());
alter table public.facility_reports enable row level security;
create policy "reports: reporter read" on public.facility_reports for select using (reporter_id = auth.uid() or public.is_admin());
create policy "reports: authenticated insert" on public.facility_reports for insert with check (reporter_id = auth.uid());
create policy "reports: admin update" on public.facility_reports for update using (public.is_admin()) with check (public.is_admin());
alter table public.facility_sync_logs enable row level security;
create policy "sync_logs: admin" on public.facility_sync_logs for all using (public.is_admin()) with check (public.is_admin());

-- ── 파트너 (Phase 3 대비 구조만. 결제·구독은 플래그로 잠금) ──
create table public.partners (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid references public.facilities(id) on delete set null,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  plan text not null default 'basic',
  business_number_masked text,
  contact_name text,
  contact_email text,
  verification_status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger partners_updated before update on public.partners for each row execute function public.set_updated_at();
alter table public.partners enable row level security;
create policy "partners: own" on public.partners for all using (owner_user_id = auth.uid() or public.is_admin()) with check (owner_user_id = auth.uid() or public.is_admin());

create table public.partner_inquiries (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  pet_id uuid references public.pets(id) on delete set null,
  category text not null,
  message text not null,
  status text not null default 'new',
  consent_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger partner_inquiries_updated before update on public.partner_inquiries for each row execute function public.set_updated_at();
alter table public.partner_inquiries enable row level security;
create policy "inquiries: user own" on public.partner_inquiries for select
  using (user_id = auth.uid() or public.is_admin() or exists (select 1 from public.partners p where p.id = partner_id and p.owner_user_id = auth.uid()));
create policy "inquiries: user insert" on public.partner_inquiries for insert with check (user_id = auth.uid());
