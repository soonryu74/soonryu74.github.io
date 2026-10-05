-- 역할별 허용·거부 시나리오 (격리 환경)
-- 각 시나리오는 식별 가능한 fixture 로만 수행한다.
\set ON_ERROR_STOP off
\pset format unaligned
\pset tuples_only on

-- fixture: 관리자(service_role, bypassrls) 로 기본 데이터를 만든다
set role service_role;
insert into public.caregivers (id, owner_id, name, role, exp, area, types, skills, "time",
                               contact, contact_public, intro, premium, verified, status)
values ('11111111-1111-1111-1111-111111111111', '0a000000-0000-0000-0000-00000000000a',
        'FIXTURE-본인', '요양보호사', '5~10년', '서울 노원구', array['방문요양'], array['요양보호사 1급'],
        '주간(낮)', 'FIXTURE-연락처-공개', true, '본인 소유 프로필', false, false, 'active'),
       ('22222222-2222-2222-2222-222222222222', '0b000000-0000-0000-0000-00000000000b',
        'FIXTURE-타인', '간병인', '3~5년', '경기 구리시', array['병원간병'], array[]::text[],
        '야간', 'FIXTURE-연락처-비공개', false, '타인 소유 프로필', false, false, 'active'),
       ('33333333-3333-3333-3333-333333333333', null,
        'FIXTURE-숨김', '요양보호사', '1년', '부산', array['방문요양'], array[]::text[],
        '주간(낮)', null, false, null, false, false, 'hidden');
reset role;

\echo '=== [익명 anon] ==='
set role anon;
\echo -n 'A1 공개 뷰 조회 행수: '
select count(*) from public.caregivers_public;
\echo -n 'A2 비공개 연락처가 가려지는가(null 이어야 함): '
select coalesce(contact,'(null)') from public.caregivers_public where name='FIXTURE-타인';
\echo -n 'A3 공개 연락처는 보이는가: '
select coalesce(contact,'(null)') from public.caregivers_public where name='FIXTURE-본인';
\echo -n 'A4 status=hidden 행이 뷰에서 빠지는가(0 이어야 함): '
select count(*) from public.caregivers_public where name='FIXTURE-숨김';
\echo -n 'A5 기반 테이블 직접 조회 행수(RLS: active 만): '
select count(*) from public.caregivers;
\echo 'A6 공개 뷰 UPDATE:'
update public.caregivers_public set name='해킹' where name='FIXTURE-본인';
\echo 'A7 공개 뷰 DELETE:'
delete from public.caregivers_public;
\echo 'A8 기반 테이블 UPDATE:'
update public.caregivers set verified=true;
\echo 'A9 기반 테이블 DELETE:'
delete from public.caregivers;
\echo 'A10 verified=true 로 등록:'
insert into public.caregivers (name, role, exp, area, types, skills, "time", verified)
values ('A10', '요양보호사', '1년', '서울', array['방문요양'], array[]::text[], '주간(낮)', true);
\echo 'A11 돌봄형태 빈 배열로 등록:'
insert into public.caregivers (name, role, exp, area, types, skills, "time")
values ('A11', '요양보호사', '1년', '서울', array[]::text[], array[]::text[], '주간(낮)');
\echo 'A12 연락처 없이 공개 체크:'
insert into public.caregivers (name, role, exp, area, types, skills, "time", contact, contact_public)
values ('A12', '요양보호사', '1년', '서울', array['방문요양'], array[]::text[], '주간(낮)', '', true);
\echo 'A13 정상 등록:'
insert into public.caregivers (name, role, exp, area, types, skills, "time")
values ('A13-정상', '요양보호사', '1년', '서울', array['방문요양'], array[]::text[], '주간(낮)');
\echo -n 'A14 waitlist 조회(SELECT 정책 없음 → 0 이어야 함): '
select count(*) from public.waitlist;
reset role;

\echo ''
\echo '=== [로그인 authenticated] ==='
set role authenticated;
\echo -n 'U1 공개 뷰 조회 행수: '
select count(*) from public.caregivers_public;
\echo 'U2 타인 프로필 UPDATE:'
update public.caregivers set name='타인이바꿈' where name='FIXTURE-타인';
\echo 'U3 본인 프로필 UPDATE(소유권 정책이 없으므로 역시 거부되어야 함):'
update public.caregivers set intro='본인이바꿈' where owner_id='0a000000-0000-0000-0000-00000000000a';
\echo 'U4 타인 프로필 DELETE:'
delete from public.caregivers where name='FIXTURE-타인';
reset role;

\echo ''
\echo '=== [관리자 service_role — bypassrls] ==='
set role service_role;
\echo -n 'S1 전체 행 조회(hidden 포함): '
select count(*) from public.caregivers;
\echo 'S2 UPDATE:'
update public.caregivers set intro='관리자가수정' where name='FIXTURE-숨김';
\echo -n 'S3 결과: '
select intro from public.caregivers where name='FIXTURE-숨김';
reset role;

\echo ''
\echo '=== 최종 상태 ==='
set role service_role;
\echo -n '남은 행 수(fixture 3 + A13 정상등록 1 = 4 이어야 함): '
select count(*) from public.caregivers;
select name || ' | verified=' || verified || ' | status=' || status from public.caregivers order by name;
reset role;
