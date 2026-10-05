\set ON_ERROR_STOP off
\pset format unaligned
\pset tuples_only on
set role anon;

\echo '=== 익명이 테이블에 직접 INSERT 할 수 있는가 (거부되어야 함) ==='
insert into public.waitlist (role, contact) values ('전문가','x@example.test');

\echo ''
\echo '=== 1) 최초 접수 ==='
select public.submit_waitlist('전문가','간병사','홍길동','서울 노원구','a@example.test','안녕','gyeotae','aaaaaaaa-0000-0000-0000-000000000001','2026-10-01');
\echo '=== 2) 같은 토큰·같은 내용 재시도 → 같은 응답이어야 함 ==='
select public.submit_waitlist('전문가','간병사','홍길동','서울 노원구','a@example.test','안녕','gyeotae','aaaaaaaa-0000-0000-0000-000000000001','2026-10-01');
\echo '=== 3) 같은 토큰·다른 내용 → 거부되어야 함 ==='
select public.submit_waitlist('전문가','간병사','홍길동','부산','a@example.test','다른내용','gyeotae','aaaaaaaa-0000-0000-0000-000000000001','2026-10-01');
\echo '=== 4) 새 토큰·같은 연락처(서식만 다름) → 열거 불가, 같은 응답 ==='
select public.submit_waitlist('전문가','간병사','홍길동','서울','A@EXAMPLE.TEST',null,'gyeotae','aaaaaaaa-0000-0000-0000-000000000002',null);
\echo '=== 5) 가족 공동 연락처 — 같은 번호 다른 역할 → 둘 다 접수되어야 함 ==='
select public.submit_waitlist('전문가',null,null,null,'010-1111-2222',null,'gyeotae','aaaaaaaa-0000-0000-0000-000000000003',null);
select public.submit_waitlist('가정·기관',null,null,null,'01011112222',null,'gyeotae','aaaaaaaa-0000-0000-0000-000000000004',null);
\echo '=== 6) 입력 검증 — 빈 연락처 ==='
select public.submit_waitlist('전문가',null,null,null,'   ',null,'gyeotae',null,null);
\echo '=== 7) 입력 검증 — 허용되지 않은 역할 ==='
select public.submit_waitlist('관리자',null,null,null,'c@example.test',null,'gyeotae',null,null);
\echo '=== 8) 익명이 접수 내용을 되읽을 수 있는가 (0 이어야 함) ==='
select count(*) from public.waitlist;
reset role;

\echo ''
\echo '=== 실제 저장 상태 (관리자로 확인) ==='
set role service_role;
\echo -n '총 행 수(기대 4: a@example 1 + 010-1111-2222 전문가 1 + 가정·기관 1 ... ): '
select count(*) from public.waitlist;
select role || ' | ' || contact || ' | ' || source from public.waitlist order by created_at;
reset role;
