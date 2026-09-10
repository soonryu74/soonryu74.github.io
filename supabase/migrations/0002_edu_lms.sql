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

-- 기본과정 8회차 (제작 1단계). 영상은 비워 두고 관리자가 나중에 채운다.
insert into public.edu_lessons (course_id, seq, title, summary) values
  ('basic', 1, '법 구조 한 장',                 '돌봄통합지원법과 시행령·시행규칙이 각각 무엇을 정했는지'),
  ('basic', 2, '우리 시군구가 해야 하는 것',    '전담조직, 조례, 지역돌봄계획의 관계'),
  ('basic', 3, '대상자를 어떻게 찾나',          '신청·발굴·의뢰 세 경로와 사전조사 8항목'),
  ('basic', 4, '판정은 누가 어떻게 하나',       '자체조사와 통합판정조사의 차이, 통합판정위원회'),
  ('basic', 5, '통합지원회의 운영',             '누구를 부르고, 무엇을 결정하고, 무엇을 남기나'),
  ('basic', 6, '서비스 다섯 갈래',              '의료·요양·일상돌봄·주거·기타를 갈라 보기'),
  ('basic', 7, '예산과 사업안내 읽는 법',       '사업안내에서 우리 사업 근거를 찾아내는 법'),
  ('basic', 8, '현장에서 자주 나오는 질문 서른 개', '실제로 막히는 지점만 모아 답')
on conflict (course_id, seq) do nothing;
