-- 중복접수·재시도 수렴 검증 (격리 환경)
\set ON_ERROR_STOP off
\pset format unaligned
\pset tuples_only on
set role anon;

\echo '=== 1) 최초 접수 ==='
insert into public.waitlist (role, contact, source, client_token, consent_version)
values ('전문가', 'a@example.test', 'gyeotae', 'aaaaaaaa-0000-0000-0000-000000000001', 'TEST');
\echo -n '행 수: '
select count(*) from public.waitlist;

\echo ''
\echo '=== 2) 같은 client_token·같은 내용 재시도 (응답 유실 후 재시도) ==='
insert into public.waitlist (role, contact, source, client_token, consent_version)
values ('전문가', 'a@example.test', 'gyeotae', 'aaaaaaaa-0000-0000-0000-000000000001', 'TEST');

\echo ''
\echo '=== 3) 같은 client_token·다른 내용 (키 충돌) ==='
insert into public.waitlist (role, contact, source, client_token, consent_version)
values ('가정·기관', 'b@example.test', 'gyeotae', 'aaaaaaaa-0000-0000-0000-000000000001', 'TEST');

\echo ''
\echo '=== 4) 새 토큰·같은 연락처 서식만 다름 (A@EXAMPLE.TEST) ==='
insert into public.waitlist (role, contact, source, client_token)
values ('전문가', 'A@EXAMPLE.TEST', 'gyeotae', 'aaaaaaaa-0000-0000-0000-000000000002');

\echo ''
\echo '=== 5) 가족 공동 연락처 — 같은 번호, 다른 역할 ==='
insert into public.waitlist (role, contact, source, client_token)
values ('전문가', '010-1111-2222', 'gyeotae', 'aaaaaaaa-0000-0000-0000-000000000003');
\echo '  5b) 같은 번호를 가정·기관 으로 등록:'
insert into public.waitlist (role, contact, source, client_token)
values ('가정·기관', '01011112222', 'gyeotae', 'aaaaaaaa-0000-0000-0000-000000000004');

\echo ''
\echo '=== 6) 다른 경로(source)에서 같은 연락처 ==='
insert into public.waitlist (role, contact, source, client_token)
values ('전문가', 'a@example.test', 'mosim', 'aaaaaaaa-0000-0000-0000-000000000005');

\echo ''
\echo -n '최종 행 수: '
select count(*) from public.waitlist;
reset role;
set role service_role;
select role || ' | ' || contact || ' | ' || source from public.waitlist order by created_at;
reset role;
