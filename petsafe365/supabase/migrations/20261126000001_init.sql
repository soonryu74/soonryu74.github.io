-- 펫안심365 초기 스키마, 인덱스, Row Level Security.
-- 원칙: 보호자는 자기 데이터만, 공개 정보는 승인된 것만, 관리자 변경은 감사로그.

-- ---------- 공통 함수 ----------
create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------- 사용자 ----------
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text,
  locale text not null default 'ko',
  role text not null default 'guardian' check (role in ('guardian','partner','reviewer','admin')),
  marketing_consent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where user_id = auth.uid() and role = 'admin')
$$;

create or replace function public.is_reviewer() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where user_id = auth.uid() and role in ('reviewer','admin'))
$$;

-- 가입하면 프로필을 만든다. ADMIN_BOOTSTRAP_EMAIL 은 scripts/seed.ts 가 따로 승격한다.
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- 본인이 자기 역할을 바꾸지 못하게 한다.
create or replace function public.protect_profile_role() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role and auth.uid() is not null and not public.is_admin() then
    raise exception 'role change not allowed' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger profiles_protect_role before update on public.profiles for each row execute function public.protect_profile_role();

-- ---------- 반려동물 ----------
create table public.pets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  species text not null check (species in ('dog','cat')),
  name text not null check (char_length(name) between 1 and 30),
  birth_date date,
  estimated_birth boolean not null default false,
  sex text not null default 'unknown' check (sex in ('male','female','unknown')),
  neutered boolean,
  weight_kg numeric(5,2) check (weight_kg is null or (weight_kg > 0 and weight_kg <= 120)),
  registration_status text not null default 'unknown' check (registration_status in ('registered','unregistered','unknown')),
  insurance_status text not null default 'unknown' check (insurance_status in ('insured','uninsured','unknown')),
  indoor boolean,
  vet_phone text check (vet_phone is null or vet_phone ~ '^[0-9+\-() ]{7,20}$'),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index pets_owner_idx on public.pets(owner_id);

create table public.pet_guardians (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  guardian_role text not null default 'family',
  permission text not null default 'write' check (permission in ('read','write')),
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (pet_id, user_id)
);

create or replace function public.owns_pet(target uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.pets p where p.id = target and p.owner_id = auth.uid())
      or exists (select 1 from public.pet_guardians g where g.pet_id = target and g.user_id = auth.uid() and g.accepted_at is not null)
$$;

create table public.pet_conditions (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets(id) on delete cascade,
  type text not null check (type in ('condition','allergy')),
  name text not null,
  note text,
  active boolean not null default true,
  source text not null default 'guardian' check (source in ('guardian','vet')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index pet_conditions_pet_idx on public.pet_conditions(pet_id);

-- ---------- 일정·기록·문서 ----------
create table public.care_task_templates (
  id uuid primary key default gen_random_uuid(),
  species text not null check (species in ('dog','cat','all')),
  life_stage text not null default 'all' check (life_stage in ('all','young','adult','senior')),
  category text not null,
  title text not null,
  priority_class text not null check (priority_class in ('guardian','legal','safety','lifecycle','life')),
  rule_json jsonb not null default '{}',
  repeat_rule text not null default 'none' check (repeat_rule in ('none','daily','weekly','monthly')),
  version int not null default 1,
  source_name text,
  source_url text,
  reviewed_at timestamptz,
  status text not null default 'draft' check (status in ('draft','approved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.care_tasks (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets(id) on delete cascade,
  template_id uuid references public.care_task_templates(id) on delete set null,
  title text not null check (char_length(title) between 1 and 100),
  due_at timestamptz not null,
  repeat_rule text not null default 'none' check (repeat_rule in ('none','daily','weekly','monthly')),
  priority int not null default 0,
  status text not null default 'open' check (status in ('open','done','snoozed')),
  completed_at timestamptz,
  note text,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index care_tasks_pet_due_idx on public.care_tasks(pet_id, due_at);

create table public.health_events (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets(id) on delete cascade,
  event_type text not null check (event_type in ('task_done','weight','medication_note','test','visit','cost','note')),
  occurred_at timestamptz not null,
  value_json jsonb not null default '{}',
  note text,
  visibility text not null default 'private' check (visibility = 'private'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index health_events_pet_time_idx on public.health_events(pet_id, occurred_at desc);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  document_type text not null check (document_type in ('medical','insurance','receipt','other')),
  storage_path text not null unique,
  original_name text not null,
  mime_type text not null check (mime_type in ('application/pdf','image/jpeg','image/png','image/webp')),
  size bigint not null check (size > 0 and size <= 10485760),
  retention_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index documents_pet_idx on public.documents(pet_id);

-- ---------- 보험 (추천·모집 없음, 약관 이해 도구) ----------
create table public.insurance_policies (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets(id) on delete cascade,
  insurer text not null,
  product_name text not null,
  terms_version text,
  joined_at date,
  renewal_at date,
  coverage_json jsonb not null default '{}',
  deductible_json jsonb not null default '{}',
  user_confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index insurance_policies_pet_idx on public.insurance_policies(pet_id);

create or replace function public.owns_policy(target uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.insurance_policies ip where ip.id = target and public.owns_pet(ip.pet_id))
$$;

create table public.insurance_terms (
  id uuid primary key default gen_random_uuid(),
  policy_id uuid not null references public.insurance_policies(id) on delete cascade,
  category text not null,
  clause_text text not null,
  clause_reference text,
  classification text not null check (classification in ('covered','check','excluded')),
  source_document_id uuid references public.documents(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index insurance_terms_policy_idx on public.insurance_terms(policy_id);

create table public.insurance_checks (
  id uuid primary key default gen_random_uuid(),
  policy_id uuid not null references public.insurance_policies(id) on delete cascade,
  input_json jsonb not null,
  result text not null check (result in ('likely_covered','check_terms','generally_excluded')),
  evidence_json jsonb not null,
  checked_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index insurance_checks_policy_idx on public.insurance_checks(policy_id, checked_at desc);

-- ---------- 지도·파트너 ----------
-- 공공데이터 원본과 서비스용 정규화 레코드를 분리한다.
create table public.facilities_raw (
  id uuid primary key default gen_random_uuid(),
  source_system text not null,
  source_id text not null,
  payload jsonb not null,
  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_system, source_id)
);

create table public.facilities (
  id uuid primary key default gen_random_uuid(),
  facility_type text not null,
  name text not null,
  address text not null,
  lat double precision,
  lng double precision,
  phone text,
  business_status text not null default 'unknown' check (business_status in ('open','closed','suspended','unknown')),
  hours_status text not null default 'unverified' check (hours_status in ('verified','unverified')),
  emergency_status text not null default 'unverified' check (emergency_status in ('verified','unverified')),
  pet_access_json jsonb not null default '{}',
  source_system text not null,
  source_id text not null,
  source_updated_at timestamptz,
  is_example boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_system, source_id)
);
create index facilities_type_idx on public.facilities(facility_type);

create table public.facility_verifications (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities(id) on delete cascade,
  verification_type text not null,
  verified_by uuid references auth.users(id) on delete set null,
  verified_at timestamptz not null default now(),
  expires_at timestamptz,
  evidence text,
  status text not null default 'valid',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.facility_reports (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  report_type text not null check (report_type in ('closed','wrong_phone','wrong_hours','other')),
  details text not null,
  status text not null default 'open' check (status in ('open','resolved')),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.partners (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid references public.facilities(id) on delete set null,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  plan text not null default 'basic' check (plan in ('basic','pro','growth')),
  business_number_masked text,
  verification_status text not null default 'pending' check (verification_status in ('pending','verified','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.partner_inquiries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  business_name text not null,
  category text not null,
  contact text not null,
  message text not null,
  status text not null default 'new' check (status in ('new','contacted','closed')),
  consent_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- 콘텐츠·연락처·신고·법무 ----------
create table public.content_cards (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  content_type text not null check (content_type in ('zoonosis','health')),
  species text not null default 'all' check (species in ('dog','cat','all')),
  current_version_id uuid,
  status text not null default 'draft' check (status in ('draft','in_review','approved','published','expired','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.content_versions (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.content_cards(id) on delete cascade,
  version int not null,
  body_json jsonb not null,
  source_json jsonb not null default '[]',
  author_id uuid references auth.users(id) on delete set null,
  reviewer_id uuid references auth.users(id) on delete set null,
  reviewer_credential text,
  reviewed_at timestamptz,
  expires_at timestamptz,
  change_reason text,
  status text not null default 'draft' check (status in ('draft','in_review','approved','published','expired','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (content_id, version),
  -- 승인·게시 상태는 검수자와 검토일 없이는 될 수 없다.
  check (status not in ('approved','published') or (reviewed_at is not null and reviewer_id is not null))
);

create table public.official_contacts (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('lost_found','lost_mine','abuse','illegal_practice','consumer')),
  organization text not null,
  phone text,
  url text,
  coverage_area text not null default '전국',
  available_hours text,
  verified_at timestamptz,
  valid_from timestamptz,
  valid_to timestamptz,
  source_url text,
  status text not null default 'pending' check (status in ('active','pending','retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.incident_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  incident_type text not null check (incident_type in ('lost_found','lost_mine','abuse','illegal_practice','consumer')),
  occurred_at timestamptz,
  -- 정밀 좌표는 저장하지 않는다. 행정동 수준의 글자만 허용한다.
  location_precision text not null default 'none' check (location_precision in ('none','district')),
  details_json jsonb not null default '{}',
  retention_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.legal_documents (
  id uuid primary key default gen_random_uuid(),
  document_type text not null check (document_type in ('terms','privacy','location','copyright','refund','ads')),
  version text not null,
  effective_at timestamptz not null,
  body text not null,
  status text not null default 'draft' check (status in ('draft','published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (document_type, version)
);

create table public.user_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_type text not null,
  document_version text not null,
  consented_at timestamptz not null default now(),
  ip_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index user_consents_user_idx on public.user_consents(user_id);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata_json jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index audit_logs_time_idx on public.audit_logs(created_at desc);

-- 법적 위험이 있는 기능은 기본으로 꺼 둔다. 켜려면 관리자 승인과 감사로그가 필요하다.
create table public.feature_flags (
  id uuid primary key default gen_random_uuid(),
  key text not null unique check (key in ('paymentsEnabled','partnerSubscriptionsEnabled','insuranceReferralEnabled','preciseLocationStorageEnabled','publicReviewsEnabled','adsEnabled')),
  enabled boolean not null default false,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (enabled = false or (approved_by is not null and approved_at is not null))
);
insert into public.feature_flags (key) values
  ('paymentsEnabled'),('partnerSubscriptionsEnabled'),('insuranceReferralEnabled'),
  ('preciseLocationStorageEnabled'),('publicReviewsEnabled'),('adsEnabled');

-- ---------- 용품 ----------
create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  material text not null check (material in ('leather','wool_felt','set')),
  summary text not null,
  description text not null,
  price_krw int not null check (price_krw >= 0),
  shipping_included boolean not null default false,
  size_cm text,
  min_mouth text not null default 'small' check (min_mouth in ('small','medium','large')),
  not_for jsonb not null default '[]',
  origin_country text not null,
  importer text,
  external_url text,
  status text not null default 'draft' check (status in ('draft','on_sale','sold_out')),
  is_example boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_lots (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  lot_code text not null,
  tested_at timestamptz,
  lab_name text,
  results_json jsonb not null default '[]',
  report_document_url text,
  status text not null default 'pending' check (status in ('pending','passed','failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, lot_code),
  -- 시험 통과 표시는 시험일과 기관 없이는 할 수 없다.
  check (status <> 'passed' or (tested_at is not null and lab_name is not null))
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'pending' check (status in ('pending','paid','cancelled','refunded')),
  total_krw int not null check (total_krw >= 0),
  items_json jsonb not null,
  payment_provider text,
  payment_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_user_idx on public.orders(user_id);

-- 결제 완료 상태는 서버(서비스 역할)만 바꿀 수 있다.
create or replace function public.protect_order_status() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and (tg_op = 'INSERT' and new.status <> 'pending' or tg_op = 'UPDATE' and new.status is distinct from old.status and new.status <> 'cancelled') then
    raise exception 'order status change not allowed' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger orders_protect_status before insert or update on public.orders for each row execute function public.protect_order_status();

-- 결제 기능이 꺼져 있으면 주문을 만들 수 없다.
create or replace function public.require_payments_enabled() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.feature_flags where key = 'paymentsEnabled' and enabled) then
    raise exception 'payments are disabled' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger orders_require_flag before insert on public.orders for each row execute function public.require_payments_enabled();

-- ---------- updated_at 트리거 ----------
do $$
declare t text;
begin
  for t in select unnest(array[
    'profiles','pets','pet_guardians','pet_conditions','care_task_templates','care_tasks','health_events','documents',
    'insurance_policies','insurance_terms','insurance_checks','facilities_raw','facilities','facility_verifications',
    'facility_reports','partners','partner_inquiries','content_cards','content_versions','official_contacts',
    'incident_drafts','legal_documents','user_consents','feature_flags','products','product_lots','orders'])
  loop
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()', t || '_set_updated_at', t);
  end loop;
end $$;

-- ---------- 권한 부여 ----------
grant usage on schema public to anon, authenticated;
grant select on public.care_task_templates, public.content_cards, public.content_versions, public.official_contacts,
  public.legal_documents, public.feature_flags, public.products, public.product_lots, public.facilities to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
revoke update, delete on public.audit_logs, public.user_consents from authenticated;
revoke all on public.facilities_raw from authenticated;

-- ---------- Row Level Security ----------
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- 프로필: 본인만 읽고 고친다. 관리자는 모두 읽고 역할을 바꾼다.
create policy profiles_select on public.profiles for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy profiles_update on public.profiles for update to authenticated using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());

-- 반려동물: 주인과 수락한 공동 보호자만.
-- 방금 넣은 행은 함수 안에서 아직 보이지 않으므로 주인 여부는 컬럼으로 직접 비교한다.
create policy pets_select on public.pets for select to authenticated using (owner_id = auth.uid() or public.owns_pet(id));
create policy pets_insert on public.pets for insert to authenticated with check (owner_id = auth.uid());
create policy pets_update on public.pets for update to authenticated using (owner_id = auth.uid() or public.owns_pet(id)) with check (owner_id = auth.uid() or public.owns_pet(id));
create policy pets_delete on public.pets for delete to authenticated using (owner_id = auth.uid());

create policy pet_guardians_select on public.pet_guardians for select to authenticated using (user_id = auth.uid() or exists (select 1 from public.pets p where p.id = pet_id and p.owner_id = auth.uid()));
create policy pet_guardians_owner_write on public.pet_guardians for all to authenticated
  using (exists (select 1 from public.pets p where p.id = pet_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from public.pets p where p.id = pet_id and p.owner_id = auth.uid()));

-- pet_id 로 묶인 개인 데이터
do $$
declare t text;
begin
  for t in select unnest(array['pet_conditions','care_tasks','health_events','insurance_policies'])
  loop
    execute format('create policy %I on public.%I for all to authenticated using (public.owns_pet(pet_id)) with check (public.owns_pet(pet_id))', t || '_owner', t);
  end loop;
end $$;

create policy documents_owner on public.documents for all to authenticated
  using (owner_id = auth.uid() and public.owns_pet(pet_id)) with check (owner_id = auth.uid() and public.owns_pet(pet_id));

create policy insurance_terms_owner on public.insurance_terms for all to authenticated using (public.owns_policy(policy_id)) with check (public.owns_policy(policy_id));
create policy insurance_checks_owner on public.insurance_checks for all to authenticated using (public.owns_policy(policy_id)) with check (public.owns_policy(policy_id));

create policy incident_drafts_owner on public.incident_drafts for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy user_consents_select on public.user_consents for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy user_consents_insert on public.user_consents for insert to authenticated with check (user_id = auth.uid());

-- 공개 정보: 누구나 읽고 관리자만 바꾼다.
do $$
declare t text;
begin
  for t in select unnest(array['official_contacts','feature_flags','product_lots','facilities'])
  loop
    execute format('create policy %I on public.%I for select to anon, authenticated using (true)', t || '_read', t);
    execute format('create policy %I on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t || '_admin', t);
  end loop;
end $$;

create policy care_task_templates_read on public.care_task_templates for select to anon, authenticated using (status = 'approved' or public.is_admin());
create policy care_task_templates_admin on public.care_task_templates for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy products_read on public.products for select to anon, authenticated using (status <> 'draft' or public.is_admin());
create policy products_admin on public.products for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy legal_documents_read on public.legal_documents for select to anon, authenticated using (status = 'published' or public.is_admin());
create policy legal_documents_admin on public.legal_documents for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- 콘텐츠: 카드는 목록용으로 초안·보관만 숨긴다. 본문(버전)은 승인되고 기한이 남은 것만 공개한다.
create policy content_cards_read on public.content_cards for select to anon, authenticated using (status not in ('draft','archived') or public.is_reviewer());
create policy content_cards_admin on public.content_cards for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy content_cards_reviewer_update on public.content_cards for update to authenticated using (public.is_reviewer()) with check (public.is_reviewer() and (status <> 'published' or public.is_admin()));

create policy content_versions_read on public.content_versions for select to anon, authenticated
  using ((status in ('approved','published') and reviewed_at is not null and (expires_at is null or expires_at > now())) or public.is_reviewer());
create policy content_versions_admin on public.content_versions for all to authenticated using (public.is_admin()) with check (public.is_admin());
-- 검수자는 승인·반려까지만. 게시는 관리자만.
create policy content_versions_reviewer_update on public.content_versions for update to authenticated using (public.is_reviewer()) with check (public.is_reviewer() and (status <> 'published' or public.is_admin()));

-- 시설 오류 신고·파트너 문의: 본인이 쓰고 읽고, 관리자가 처리한다.
create policy facility_reports_insert on public.facility_reports for insert to authenticated with check (reporter_id = auth.uid());
create policy facility_reports_select on public.facility_reports for select to authenticated using (reporter_id = auth.uid() or public.is_admin());
create policy facility_reports_admin_update on public.facility_reports for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy facility_verifications_read on public.facility_verifications for select to authenticated using (true);
create policy facility_verifications_admin on public.facility_verifications for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy partners_owner on public.partners for select to authenticated using (owner_user_id = auth.uid() or public.is_admin());
create policy partners_admin on public.partners for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy partner_inquiries_insert on public.partner_inquiries for insert to authenticated with check (user_id = auth.uid());
create policy partner_inquiries_select on public.partner_inquiries for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy partner_inquiries_admin_update on public.partner_inquiries for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- 감사로그: 본인 이름으로만 남기고, 관리자만 읽는다. 수정·삭제는 권한 자체가 없다.
create policy audit_logs_insert on public.audit_logs for insert to authenticated with check (actor_id = auth.uid());
create policy audit_logs_select on public.audit_logs for select to authenticated using (public.is_admin());

-- 주문: 본인 것만.
create policy orders_insert on public.orders for insert to authenticated with check (user_id = auth.uid());
create policy orders_select on public.orders for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy orders_update on public.orders for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
