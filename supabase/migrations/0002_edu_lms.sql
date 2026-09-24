-- 통합돌봄사이버교육원 학습관리시스템 스키마
-- korea-now와 같은 Supabase 프로젝트를 쓴다. 테이블 이름 앞에 edu_ 를 붙여 구분한다.
-- 사양: docs/edu-lms-spec.md

-- ─────────────────────────────────────────────
-- 1) 수강생 — auth.users 와 1:1. 가입(첫 로그인) 시 트리거로 자동 생성
-- ─────────────────────────────────────────────
create table if not exists public.edu_students (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  name text,
  phone text,
  org text,                                 -- 소속 기관 (기관 수강일 때)
  role text not null default 'student' check (role in ('student', 'admin')),
  created_at timestamptz not null default now()
);

-- 관리자 판별. RLS 정책 안에서 반복해서 쓴다.
create or replace function public.edu_is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.edu_students
    where id = auth.uid() and role = 'admin'
  );
$$;

-- auth.users 에 사용자가 생기면 edu_students 에 한 줄 만든다
create or replace function public.edu_handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.edu_students (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists edu_on_auth_user_created on auth.users;
create trigger edu_on_auth_user_created
  after insert on auth.users
  for each row execute function public.edu_handle_new_user();

-- ─────────────────────────────────────────────
-- 2) 과정
-- ─────────────────────────────────────────────
create table if not exists public.edu_courses (
  id text primary key,                      -- 'basic', 'care', 'entry', 'ai-field', 'ai-public'
  title text not null,
  audience text,                            -- 대상 한 줄
  hours integer not null,                   -- 총 시간
  pass_rate numeric(4,2) not null default 0.80,   -- 수료 출석 기준 (회차 이수 비율)
  requires_task boolean not null default false,   -- 과제 제출이 수료 요건인지
  sort integer not null default 0,
  active boolean not null default true
);

-- ─────────────────────────────────────────────
-- 3) 회차
-- ─────────────────────────────────────────────
create table if not exists public.edu_lessons (
  id uuid primary key default gen_random_uuid(),
  course_id text not null references public.edu_courses(id) on delete cascade,
  seq integer not null,                     -- 회차 번호
  module text,                              -- '1모듈 · 같은 말로 일하기'
  title text not null,
  summary text,                             -- 다루는 것 / 그날 남는 것
  video_url text,                           -- 스트리밍 재생 주소 (HLS 또는 MP4). 비어 있으면 준비 중
  audio_url text,                           -- 음성만 (선택)
  handout_url text,                         -- 교재 PDF
  duration_sec integer not null default 3600,
  done_rate numeric(4,2) not null default 0.90,   -- 이 회차를 이수로 보는 시청 비율
  unique (course_id, seq)
);

-- ─────────────────────────────────────────────
-- 4) 수강 등록
-- ─────────────────────────────────────────────
create table if not exists public.edu_enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.edu_students(id) on delete cascade,
  course_id text not null references public.edu_courses(id) on delete cascade,
  started_at date not null default current_date,
  ends_at date,                             -- 수강 기간 종료일 (비어 있으면 무기한)
  paid boolean not null default false,      -- 관리자가 납부 확인 시 true
  paid_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  unique (student_id, course_id)
);

-- ─────────────────────────────────────────────
-- 5) 시청 기록 — 회차마다 한 줄. 본 구간을 [[시작초, 끝초], ...] 로 누적
-- ─────────────────────────────────────────────
create table if not exists public.edu_progress (
  enrollment_id uuid not null references public.edu_enrollments(id) on delete cascade,
  lesson_id uuid not null references public.edu_lessons(id) on delete cascade,
  segments jsonb not null default '[]'::jsonb,   -- 합쳐진 시청 구간
  watched_sec integer not null default 0,        -- 구간 합계 (초)
  coverage numeric(4,3) not null default 0,      -- watched_sec / duration_sec
  completed boolean not null default false,
  completed_at timestamptz,
  last_pos integer not null default 0,           -- 이어보기 위치
  updated_at timestamptz not null default now(),
  primary key (enrollment_id, lesson_id)
);

-- ─────────────────────────────────────────────
-- 6) 수료
-- ─────────────────────────────────────────────
create table if not exists public.edu_completions (
  enrollment_id uuid primary key references public.edu_enrollments(id) on delete cascade,
  attendance numeric(4,3) not null,         -- 이수 회차 / 전체 회차
  task_submitted boolean not null default false,
  cert_no text unique,                      -- 수료증 번호 'EDU-2026-0001'
  issued_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────
alter table public.edu_students    enable row level security;
alter table public.edu_courses     enable row level security;
alter table public.edu_lessons     enable row level security;
alter table public.edu_enrollments enable row level security;
alter table public.edu_progress    enable row level security;
alter table public.edu_completions enable row level security;

-- 수강생: 자기 것만. 관리자: 전부.
create policy "students self read"   on public.edu_students for select using (id = auth.uid() or public.edu_is_admin());
create policy "students self update" on public.edu_students for update using (id = auth.uid()) with check (id = auth.uid() and role = 'student');
create policy "students admin all"   on public.edu_students for all using (public.edu_is_admin()) with check (public.edu_is_admin());

-- 과정·회차: 로그인한 사람은 읽기, 관리자만 쓰기
create policy "courses read"      on public.edu_courses for select using (auth.role() = 'authenticated');
create policy "courses admin"     on public.edu_courses for all using (public.edu_is_admin()) with check (public.edu_is_admin());
create policy "lessons read"      on public.edu_lessons for select using (auth.role() = 'authenticated');
create policy "lessons admin"     on public.edu_lessons for all using (public.edu_is_admin()) with check (public.edu_is_admin());

-- 등록: 본인 것 읽기, 관리자 전부
create policy "enroll self read"  on public.edu_enrollments for select using (student_id = auth.uid() or public.edu_is_admin());
create policy "enroll admin"      on public.edu_enrollments for all using (public.edu_is_admin()) with check (public.edu_is_admin());

-- 시청 기록: 본인 등록 건에만 읽기·쓰기 (납부 확인된 등록만)
create policy "progress self" on public.edu_progress for all
  using (
    exists (select 1 from public.edu_enrollments e
            where e.id = enrollment_id and e.student_id = auth.uid() and e.paid)
    or public.edu_is_admin()
  )
  with check (
    exists (select 1 from public.edu_enrollments e
            where e.id = enrollment_id and e.student_id = auth.uid() and e.paid)
    or public.edu_is_admin()
  );

-- 수료: 본인 읽기, 관리자 전부
create policy "completion self read" on public.edu_completions for select
  using (exists (select 1 from public.edu_enrollments e where e.id = enrollment_id and e.student_id = auth.uid()) or public.edu_is_admin());
create policy "completion admin"     on public.edu_completions for all using (public.edu_is_admin()) with check (public.edu_is_admin());

-- ─────────────────────────────────────────────
-- 초기 데이터 — 사이트 편성(2026-09-09)과 같게
-- ─────────────────────────────────────────────
insert into public.edu_courses (id, title, audience, hours, requires_task, sort) values
  ('basic',     '통합돌봄 기본과정',   '통합돌봄을 겸직으로 맡은 담당자',             8, false, 1),
  ('care',      '통합돌봄 실무과정',   '협약병원·재택의료센터·재가센터·복지관 실무자', 30, true,  2),
  ('entry',     '통합돌봄 진입과정',   '통합돌봄에 참여하려는 기관·사업자',           20, true,  3),
  ('ai-field',  '현장 AI 활용 과정',   '의료인·돌봄 종사자',                          20, true,  4),
  ('ai-public', '공직 AI 활용 과정',   '보건직·복지직 공무원',                        16, true,  5)
on conflict (id) do nothing;

-- 기본과정 8회차 (제작 1단계, 2026-09-24 편성). 한 사례를 의뢰부터 점검까지 완주한다.
-- 영상은 비워 두고 관리자가 나중에 채운다.
insert into public.edu_lessons (course_id, seq, title, summary) values
  ('basic', 1, '의뢰가 왔다 · 접수·상담',              '첫 통화와 첫 방문에서 무엇을 묻고 적나. 인테이크 기록 한 장'),
  ('basic', 2, '이 사람의 지금을 적는다 · 포괄적 사정', '사전조사 8항목을 같은 사례에 채운다. 채워진 사정표'),
  ('basic', 3, '욕구를 문장으로 · 욕구 파악',          '원하는 삶과 막고 있는 것을 세 줄로. 측정 가능한 목표'),
  ('basic', 4, '계획서를 채운다 · 케어플랜 작성',      '별지 제2호 개인별지원계획서를 같은 사례로. 계획서 초안'),
  ('basic', 5, '회의에서 내 몫 3분 · 다직종 협력',     '통합지원회의 흐름과 우리 기관 몫 3분 발언. 발언 대본'),
  ('basic', 6, '누구에게 무엇을 의뢰하나 · 자원연계',  '의뢰처·서식·금지 조합 정리. 연계표 + 과제 내 지역 자원 지도'),
  ('basic', 7, '한 달 뒤 무엇을 보나 · 모니터링·평가', '확인할 것, 계획을 고치는 기준, 기록. 모니터링 서식'),
  ('basic', 8, '처음부터 끝까지 혼자 · 종합연습',      '새 사례를 1~7회차 서식으로 완주하고 서로 검토. 사례 파일 한 벌')
on conflict (course_id, seq) do nothing;

-- 실무과정 30회차 (2026-09-24 확정, 같은 날 D1 반영: 3부 9회차·5부 1회차). 1~11회차는 교재 1·2호 완성.
insert into public.edu_lessons (course_id, seq, title, summary) values
  ('care',  1, '1부 · 3월 27일에 무엇이 바뀌었나',        '법 7장 30조의 구조, 시범사업에서 본사업으로'),
  ('care',  2, '1부 · 누가 대상자인가',                    '65세 이상, 심한 장애인, 취약계층. 직권신청 여섯 유형'),
  ('care',  3, '1부 · 집으로 오는 의료 여섯 가지',         '방문간호·가정간호·방문건강관리·재택의료센터·방문진료·왕진'),
  ('care',  4, '1부 · ''통합''이 붙은 넷',                 '통합돌봄·통합재가·통합건강증진·간호간병통합'),
  ('care',  5, '1부 · 아직 안 된 것과 곧 될 것',           '시범사업으로 남은 것, 2027년에 열리는 것'),
  ('care',  6, '1부 · 신청서 한 장',                        '별지 제1호, 처리 기한, 행정정보 공동이용'),
  ('care',  7, '1부 · 퇴원·퇴소 통보',                      '통보 의무 기관, 동의 절차, 협약병원의 선별과 의뢰'),
  ('care',  8, '1부 · 사전조사와 통합판정',                 '세 갈래 분류, 통합판정조사표, 통합판정서 읽는 법'),
  ('care',  9, '1부 · 회의에서 내 몫 말하기',               '회의 구성, 안건 흐름, 3분 발언 구조와 금지 표현'),
  ('care', 10, '1부 · 개인별지원계획서 쓰기',               '별지 제2호 항목별 작성법, 욕구에서 목표로'),
  ('care', 11, '1부 · 점검과 종결',                          '모니터링 주기, 종결 사유와 기준일, 재신청'),
  ('care', 12, '2부 · "괜찮다"는 말 앞에서',                '상담 자세, 의사결정지원, 본인과 가족 의견이 다를 때'),
  ('care', 13, '2부 · 가족을 지원한다는 것',                '가족 지원 조항, 가족휴가제, 보호자 소통문'),
  ('care', 14, '2부 · 말해도 되는 것, 알려야 하는 것',      '비밀유지·개인정보·AI의 선, 위험 신호 보고 기준'),
  ('care', 15, '3부 · 어떤 상황에나 공통인 것 — 기본 케어',     '본인 뜻·생활 계속·가족 지원 3축, 생활 6요소, 구강·식사·연하 관찰과 보고'),
  ('care', 16, '3부 · 치매가 있는 어르신 ① 사정',          '본인 의사 확인, 사정에서 놓치기 쉬운 것'),
  ('care', 17, '3부 · 치매가 있는 어르신 ② 연계와 점검',   '치매관리·주야간보호·맞춤돌봄 의뢰, 악화 신호 보고'),
  ('care', 18, '3부 · 뇌혈관질환 후 퇴원 ① 사정과 의료 연계', '퇴원 요약을 계획 언어로, 재택의료·방문간호 의뢰'),
  ('care', 19, '3부 · 뇌혈관질환 후 퇴원 ② 요양·돌봄 조합', '장기요양 급여·월한도액, 재가의료급여, 간병 네 제도, 유사중복, 반복 입원 신호'),
  ('care', 20, '3부 · 낙상·골절 후 집으로',                 '주거 사정, 응급안전·주거 개선 연계, 재발 대비 계획'),
  ('care', 21, '3부 · 임종기 어르신',                        '본인·가족 뜻 확인, 연계 절차, 계획서에 적는 법'),
  ('care', 22, '3부 · 65세 미만 장애인',                     '장애인 서비스와 활동지원의 관계'),
  ('care', 23, '3부 · 혼자 사는 어르신, 끊긴 연결',          '안부 확인, 사각지대 연계, 긴급돌봄, 위험 보고, 자원 지도'),
  ('care', 24, '4부 · 선별',                                  '퇴원환자 선별 기준, 통보와 동의, 연계 세 제도 구별'),
  ('care', 25, '4부 · 평가',                                  '퇴원 전 평가에서 지역이 알아야 할 것, 의료 언어→계획 언어'),
  ('care', 26, '4부 · 의뢰',                                  '의뢰서 서식, 시군구·재택의료센터·방문간호 의뢰 절차'),
  ('care', 27, '4부 · 지자체 연계와 집에서 첫 주',            '사전조사로 잇기, 첫 방문, 팀 연락체계, 모니터링 시작'),
  ('care', 28, '5부 · 문서로 일하기',                         '정보시스템 현재, 판단이 드러나는 기록, 회의록·계획서 초안·보고서, 조례에서 내 기관 자리'),
  ('care', 29, '6부 · 모의 통합지원회의',                     '실시간. 가상 사례로 기관 역할을 맡아 계획 합의'),
  ('care', 30, '6부 · 수료 과제',                             '11회차부터 이어온 사례로 사전조사 정리·계획서 초안·모니터링 기록 3종')
on conflict (course_id, seq) do nothing;
