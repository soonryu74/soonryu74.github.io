-- 한뼘(HANDSPAN) — Postgres 스키마 초안 (Supabase)
-- 상태: 시안. 아직 어떤 프로젝트에도 적용하지 않았다.
-- 원칙: 기획안의 숫자(190mm, 12%/15%, 15% 할인 상한, 3권 무료배송)는 전부 설정값으로 둔다.
--       법이 바뀌면 platform_settings 한 줄만 고친다.

create extension if not exists "pgcrypto";

-- ───────────────────────────────────────────────────────────
-- 열거형
-- ───────────────────────────────────────────────────────────
create type track_kind       as enum ('A', 'B');                 -- A: ISBN 도서, B: 핸드메이드/굿즈(기본)
create type book_method      as enum ('수제', '소량 인쇄', 'POD', '디지털');
create type book_status      as enum ('draft', 'published', 'paused', 'soldout', 'removed');
create type order_status     as enum ('pending', 'paid', 'shipped', 'delivered', 'confirmed', 'cancelled', 'refunded');
create type shipment_method  as enum ('jundeunggi', 'cu', 'gs25', 'deunggi', 'kpacket', 'ems', 'digital', 'artist_direct');
create type payout_status    as enum ('scheduled', 'held', 'paid', 'failed');
create type tax_kind         as enum ('exempt', 'taxable');       -- 면세(도서) / 과세(굿즈·수수료)
create type box_kind         as enum ('pick3', 'fukubukuro');

-- ───────────────────────────────────────────────────────────
-- 플랫폼 설정 (숫자는 여기만 고친다)
-- ───────────────────────────────────────────────────────────
create table platform_settings (
  key         text primary key,
  value       jsonb not null,
  note        text,
  updated_at  timestamptz not null default now()
);
insert into platform_settings (key, value, note) values
  ('max_long_edge_mm',      '190',   '한 뼘. 장변이 이 값을 넘으면 입점 불가'),
  ('tier_kong_max_mm',      '76',    '콩(S) ≤ 76mm — 豆本協会·MBS 규격'),
  ('tier_son_max_mm',       '148',   '손(M) ≤ 148mm'),
  ('fee_track_b',           '0.12',  '트랙 B 판매수수료 (결제수수료 포함)'),
  ('fee_track_a',           '0.15',  '트랙 A 판매수수료 (ISBN·납본·정가제 관리 포함)'),
  ('track_a_discount_cap',  '0.15',  '도서정가제 할인 상한 (가격 10% + 혜택 5%). 2026 재검토 결론 나면 수정'),
  ('free_ship_qty_same_artist', '3', '같은 작가 책 3권부터 무료배송 (작가 직배 단계)'),
  ('payout_days_after_confirm', '7', '구매확정 후 7일 내 지급'),
  ('payout_days_of_month',  '[1,16]','월 2회 지급일'),
  ('small_book_day',        '"first_friday"', '작은 책의 날: 매월 첫째 금요일 수수료 0%');

-- ───────────────────────────────────────────────────────────
-- 작가
-- ───────────────────────────────────────────────────────────
create table artists (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid unique references auth.users (id) on delete set null,  -- 로그인 계정. 초대 전에는 null
  slug          text unique not null,                       -- 공개 URL용 (artist.html?id=…)
  name          text not null,
  country       char(2) not null,                           -- ISO 3166-1 alpha-2
  city          text,
  bio           text,
  instagram     text,
  ships_from    char(2) not null default 'KR',              -- 발송지. 한국 허브 위탁이면 'KR'
  sell_model    text not null default 'direct' check (sell_model in ('digital', 'hub', 'direct')),  -- 해외 작가 세 모델
  payout_method text check (payout_method in ('bank_kr', 'paypal', 'wise')),
  payout_currency char(3) not null default 'KRW',
  -- 통신판매중개자 고지용 신원 정보 (결제 전 화면에 표시, 2026.7.21 개정)
  legal_name    text,
  business_no   text,                                        -- 사업자등록번호. 연 50회 미만·간이과세자는 면제
  contact       text,
  fair_history  jsonb not null default '[]',                 -- [{year, event, city}]
  status        text not null default 'active' check (status in ('invited', 'active', 'paused')),
  created_at    timestamptz not null default now()
);

-- ───────────────────────────────────────────────────────────
-- 책
-- ───────────────────────────────────────────────────────────
create table books (
  id            uuid primary key default gen_random_uuid(),
  artist_id     uuid not null references artists (id) on delete cascade,
  slug          text unique not null,
  title         text not null,
  title_original text,                                       -- 작가 언어 원제
  width_mm      integer not null check (width_mm > 0),
  height_mm     integer not null check (height_mm > 0),
  -- 규칙의 핵심: 장변 190mm. A5(148×210)는 들어올 수 없다. 예외 없음.
  constraint books_fits_in_a_hand check (greatest(width_mm, height_mm) <= 190),
  pages         integer check (pages >= 4),
  binding       text,
  edition       text,                                        -- "7/30" 또는 null
  edition_total integer,
  track         track_kind not null default 'B',
  isbn          text,                                        -- 트랙 A에만. 한뼘 발행자번호로 부여
  constraint books_isbn_only_track_a check (track = 'A' or isbn is null),
  list_price    numeric(12,2) not null check (list_price >= 0), -- 트랙 A는 정가, B는 판매가
  currency      char(3) not null default 'KRW',
  krw_equiv     numeric(12,0),                               -- 외화 상품의 원화 환산(표시용, 결제일 환율로 재계산)
  genre         text not null,
  method        book_method not null,
  tax           tax_kind not null default 'exempt',          -- 책 실질이면 면세, 노트·키링은 과세. 세트는 두 상품으로
  digital       boolean not null default false,
  digital_path  text,                                        -- Supabase Storage 경로 (서명 URL, 다운로드 횟수 제한)
  stock         integer not null default 0 check (stock >= 0),
  cover_color   text,
  first_line    text,                                        -- 福袋에 쓰인다
  description   text,
  description_translated jsonb,                              -- {en:…, ja:…} 자동 번역 병기, 원문 우선
  tags          text[] not null default '{}',
  status        book_status not null default 'draft',
  published_at  timestamptz,
  created_at    timestamptz not null default now()
);
create index books_artist_idx on books (artist_id);
create index books_published_idx on books (status, published_at desc) where status = 'published';

-- 등급은 저장하지 않고 계산한다 (숫자가 바뀌면 자동 반영)
create or replace function book_tier(w integer, h integer) returns text language sql immutable as $$
  select case
    when greatest(w, h) <= 76  then '콩'
    when greatest(w, h) <= 148 then '손'
    when greatest(w, h) <= 190 then '뼘'
    else null end
$$;

-- 책 옵션 (커버 종류, 책갈피, 손글씨 카드 등 작가가 켜고 끄는 것)
create table book_options (
  id          uuid primary key default gen_random_uuid(),
  book_id     uuid not null references books (id) on delete cascade,
  kind        text not null check (kind in ('cover', 'bookmark', 'card', 'extra_copy')),
  label       text not null,                                 -- "크라프트 커버", "계절 책갈피"
  price       numeric(12,2) not null default 0,              -- 책갈피 0, 손글씨 카드 1000, 한 권 더 = 책값
  enabled     boolean not null default true,
  sort_order  integer not null default 0
);

-- ───────────────────────────────────────────────────────────
-- 분배 지급 (공동작업자 비율). 책 하나의 비율 합은 100이어야 한다.
-- ───────────────────────────────────────────────────────────
create table revenue_splits (
  id          uuid primary key default gen_random_uuid(),
  book_id     uuid not null references books (id) on delete cascade,
  artist_id   uuid not null references artists (id),         -- 받는 사람 (한뼘 계정이 있어야 지급 가능)
  share_pct   numeric(5,2) not null check (share_pct > 0 and share_pct <= 100),
  unique (book_id, artist_id)
);
-- 합계 100 검사: 행 단위 트리거는 중간 상태에서 실패하므로 constraint trigger(deferrable)로 거래 끝에 검사한다.
create or replace function check_split_sum() returns trigger language plpgsql as $$
declare s numeric; bid uuid;
begin
  bid := coalesce(new.book_id, old.book_id);
  select coalesce(sum(share_pct), 0) into s from revenue_splits where book_id = bid;
  if s <> 0 and s <> 100 then
    raise exception '분배 비율 합이 100%%가 아닙니다 (지금 %%%)', s;
  end if;
  return null;
end $$;
create constraint trigger revenue_splits_sum
  after insert or update or delete on revenue_splits
  deferrable initially deferred
  for each row execute function check_split_sum();

-- ───────────────────────────────────────────────────────────
-- 주문
-- ───────────────────────────────────────────────────────────
create table orders (
  id            uuid primary key default gen_random_uuid(),
  order_no      text unique not null,                        -- "HS-2610-0412"
  buyer_id      uuid references auth.users (id),
  buyer_email   text not null,
  ship_name     text,
  ship_address  jsonb,                                       -- 해외는 국가별 형식이 달라 jsonb
  ship_country  char(2) not null default 'KR',
  status        order_status not null default 'pending',
  goods_total   numeric(12,0) not null default 0,
  options_total numeric(12,0) not null default 0,
  shipping_total numeric(12,0) not null default 0,
  grand_total   numeric(12,0) not null default 0,
  currency      char(3) not null default 'KRW',
  pg_provider   text,                                        -- 'toss' | 'portone' (지급대행)
  pg_payment_key text,                                       -- PG 결제 키. 플랫폼은 대금을 직접 쥐지 않는다
  small_book_day boolean not null default false,             -- 결제일이 첫째 금요일이면 수수료 0%
  confirmed_at  timestamptz,                                 -- 구매확정(배송완료 + 7일 자동)
  created_at    timestamptz not null default now()
);

create table order_lines (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references orders (id) on delete cascade,
  book_id       uuid not null references books (id),
  artist_id     uuid not null references artists (id),       -- 작가별 묶음·배송·정산의 기준
  qty           integer not null check (qty > 0),
  unit_price    numeric(12,0) not null,                      -- 결제 시점 원화 가격 (트랙 A는 할인 적용 후)
  list_price    numeric(12,0),                               -- 트랙 A 정가 (상한 검증용)
  options       jsonb not null default '{}',                 -- {cover:'kraft', bookmark:true, card:true, card_text:'…'}
  options_price numeric(12,0) not null default 0,
  extra_copy    boolean not null default false,              -- 한 권 더 보내기
  fee_rate      numeric(5,4) not null,                       -- 결제 시점 수수료율 (0.12 / 0.15 / 0 작은 책의 날)
  tax           tax_kind not null,
  constraint track_a_discount_cap check (
    list_price is null or unit_price >= list_price * (1 - 0.15)   -- 상한 15%. platform_settings 값과 맞춘다
  )
);
create index order_lines_artist_idx on order_lines (artist_id);

-- 배송 (작가별로 한 건. 1단계는 작가가 운송장을 직접 적는다)
create table shipments (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references orders (id) on delete cascade,
  artist_id     uuid not null references artists (id),
  method        shipment_method not null,
  fee           numeric(12,0) not null default 0,            -- 같은 작가 3권부터 0
  free_reason   text,                                        -- 'same_artist_3', 'digital'
  tracking_no   text,
  shipped_at    timestamptz,
  delivered_at  timestamptz,
  anonymous     boolean not null default false,              -- BOOTH식 익명 발송
  created_at    timestamptz not null default now()
);

-- 한 권 더 보내기 (기부)
create table donations (
  id            uuid primary key default gen_random_uuid(),
  order_line_id uuid not null references order_lines (id) on delete cascade,
  recipient     text,                                        -- 작은도서관·병원 어린이실 이름 (배정 후)
  recipient_type text check (recipient_type in ('library', 'hospital', 'school', 'other')),
  assigned_at   timestamptz,
  shipped_at    timestamptz,
  notified_at   timestamptz                                  -- 작가·주문자에게 수신처 알림
);

-- ───────────────────────────────────────────────────────────
-- 지급. 구매확정 후 7일 내, 월 2회. 보류는 사유와 해제일을 반드시 적는다.
-- ───────────────────────────────────────────────────────────
create table payouts (
  id            uuid primary key default gen_random_uuid(),
  artist_id     uuid not null references artists (id),
  period_start  date not null,
  period_end    date not null,
  scheduled_for date not null,                               -- 1일 또는 16일
  amount        numeric(12,0) not null,
  currency      char(3) not null default 'KRW',
  exempt_amount numeric(12,0) not null default 0,            -- 면세 라인 합
  taxable_amount numeric(12,0) not null default 0,           -- 과세 라인 합
  fee_amount    numeric(12,0) not null default 0,
  status        payout_status not null default 'scheduled',
  hold_reason   text,                                        -- 보류 사유. status='held'면 필수
  release_date  date,                                        -- 보류 해제 예정일. status='held'면 필수
  constraint payouts_hold_explained check (status <> 'held' or (hold_reason is not null and release_date is not null)),
  paid_at       timestamptz,
  pg_transfer_id text,                                       -- 지급대행 이체 ID
  statement_url text,                                        -- 월 정산서 PDF (면세/과세 분리)
  created_at    timestamptz not null default now()
);
create index payouts_artist_idx on payouts (artist_id, scheduled_for desc);

-- 지급 상세: 어떤 주문 라인이 어느 지급에 들어갔는지 (분배 비율 적용 후)
create table payout_lines (
  payout_id     uuid not null references payouts (id) on delete cascade,
  order_line_id uuid not null references order_lines (id),
  share_pct     numeric(5,2) not null default 100,
  amount        numeric(12,0) not null,
  primary key (payout_id, order_line_id)
);

-- ───────────────────────────────────────────────────────────
-- 큐레이션
-- ───────────────────────────────────────────────────────────
create table curation_weekly (
  week_start    date primary key,                            -- 월요일
  book_id       uuid not null references books (id),
  headline      text,
  intro         text,
  interview     jsonb not null default '[]',                 -- [{q, a}]
  making_of     jsonb not null default '[]',                 -- [{caption, image_path}]
  goods         text,                                        -- 한정 굿즈 안내
  published     boolean not null default false
);

create table box_requests (
  id            uuid primary key default gen_random_uuid(),
  kind          box_kind not null,
  buyer_id      uuid references auth.users (id),
  email         text not null,
  recipient     text,                                        -- 받는 사람 (pick3)
  theme         text,                                        -- 테마/취향 (pick3)
  avoid         text,                                        -- 피하고 싶은 것 (pick3)
  budget        numeric(12,0),                               -- 29000 / 49000 / 79000
  gift          boolean not null default false,
  tier          text check (tier in ('콩', '손', '뼘')),       -- 福袋 크기
  picked_book_id uuid references books (id),                 -- 福袋에서 고른 첫 문장의 책
  shown_book_ids uuid[],
  curated_book_ids uuid[],                                   -- 큐레이터가 고른 결과
  order_id      uuid references orders (id),
  status        text not null default 'requested' check (status in ('requested', 'curated', 'approved', 'ordered', 'cancelled')),
  created_at    timestamptz not null default now()
);

-- 트랙 A ISBN 신청 (납본 체크리스트 포함)
create table isbn_requests (
  id            uuid primary key default gen_random_uuid(),
  book_id       uuid not null references books (id),
  artist_id     uuid not null references artists (id),
  list_price    numeric(12,0) not null,
  agreed_obligations boolean not null default false,         -- 납본 2부 대행·할인 15% 상한·정가 표시·비독점 이용허락
  isbn          text,
  deposit_sent_at timestamptz,                               -- 납본 발송일 (발행 30일 내)
  status        text not null default 'requested' check (status in ('requested', 'issued', 'deposited', 'rejected')),
  created_at    timestamptz not null default now()
);

-- ───────────────────────────────────────────────────────────
-- RLS 초안. 공개 읽기는 published 책만, 작가는 자기 행만.
-- 지급·주문 쓰기는 서비스 롤(Edge Function)만 한다.
-- ───────────────────────────────────────────────────────────
alter table artists        enable row level security;
alter table books          enable row level security;
alter table book_options   enable row level security;
alter table revenue_splits enable row level security;
alter table orders         enable row level security;
alter table order_lines    enable row level security;
alter table shipments      enable row level security;
alter table donations      enable row level security;
alter table payouts        enable row level security;
alter table payout_lines   enable row level security;
alter table curation_weekly enable row level security;
alter table box_requests   enable row level security;
alter table isbn_requests  enable row level security;
alter table platform_settings enable row level security;

-- 내 artist id
create or replace function my_artist_id() returns uuid language sql stable security definer as $$
  select id from artists where user_id = auth.uid()
$$;

-- 누구나: 공개된 책·작가·이번 주 한 권·설정값
create policy "public reads published books" on books for select using (status = 'published');
create policy "public reads active artists" on artists for select using (status = 'active');
create policy "public reads options of published books" on book_options for select
  using (exists (select 1 from books b where b.id = book_id and b.status = 'published'));
create policy "public reads weekly" on curation_weekly for select using (published);
create policy "public reads settings" on platform_settings for select using (true);

-- 작가: 자기 행
create policy "artist sees own profile" on artists for select using (user_id = auth.uid());
create policy "artist edits own profile" on artists for update using (user_id = auth.uid());
create policy "artist sees own books" on books for select using (artist_id = my_artist_id());
create policy "artist writes own books" on books for insert with check (artist_id = my_artist_id());
create policy "artist edits own books" on books for update using (artist_id = my_artist_id());
create policy "artist manages own options" on book_options for all
  using (exists (select 1 from books b where b.id = book_id and b.artist_id = my_artist_id()));
create policy "artist manages own splits" on revenue_splits for all
  using (exists (select 1 from books b where b.id = book_id and b.artist_id = my_artist_id()));
create policy "artist sees own order lines" on order_lines for select using (artist_id = my_artist_id());
create policy "artist sees orders with own lines" on orders for select
  using (exists (select 1 from order_lines l where l.order_id = id and l.artist_id = my_artist_id()));
create policy "artist sees own shipments" on shipments for select using (artist_id = my_artist_id());
create policy "artist enters tracking" on shipments for update using (artist_id = my_artist_id());
create policy "artist sees own payouts" on payouts for select using (artist_id = my_artist_id());
create policy "artist sees own payout lines" on payout_lines for select
  using (exists (select 1 from payouts p where p.id = payout_id and p.artist_id = my_artist_id()));
create policy "artist files isbn request" on isbn_requests for insert with check (artist_id = my_artist_id());
create policy "artist sees own isbn requests" on isbn_requests for select using (artist_id = my_artist_id());

-- 구매자: 자기 주문
create policy "buyer sees own orders" on orders for select using (buyer_id = auth.uid());
create policy "buyer sees own order lines" on order_lines for select
  using (exists (select 1 from orders o where o.id = order_id and o.buyer_id = auth.uid()));
create policy "buyer sees own box requests" on box_requests for select using (buyer_id = auth.uid());
create policy "anyone files box request" on box_requests for insert with check (true);

-- 주문 생성·지급 실행·납본 처리는 Edge Function(service role)에서만. 여기엔 insert/update 정책을 두지 않는다.
