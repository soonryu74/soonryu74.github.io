\set ON_ERROR_STOP off
\pset format unaligned
\pset tuples_only on

set role service_role;
\echo '=== V1 검토자 없이 verified 로 만들 수 있는가 (거부되어야 함) ==='
insert into public.verifications (subject_type, subject_id, kind, state)
values ('caregiver','11111111-1111-1111-1111-111111111111','요양보호사자격','verified');

\echo '=== V2 반려인데 사유 없음 (거부되어야 함) ==='
insert into public.verifications (subject_type, subject_id, kind, state)
values ('caregiver','11111111-1111-1111-1111-111111111111','요양보호사자격','rejected');

\echo '=== V3 정상 흐름: 요청 → 검토중 → 확인 ==='
insert into public.verifications (id, subject_type, subject_id, kind, evidence_ref, evidence_sha256, state)
values ('e0000000-0000-0000-0000-000000000001','caregiver','11111111-1111-1111-1111-111111111111',
        '요양보호사자격','private://evidence/2026/10/abc','0f'||repeat('a',62),'requested');
update public.verifications set state='in_review' where id='e0000000-0000-0000-0000-000000000001';
update public.verifications set state='verified', reviewed_by='운영자-FIXTURE', reviewed_at=now(),
       valid_until = current_date + 365
 where id='e0000000-0000-0000-0000-000000000001';
\echo -n '  현재 상태: '
select state || ' | 검토자=' || reviewed_by || ' | 만료 ' || valid_until
  from public.verifications where id='e0000000-0000-0000-0000-000000000001';
\echo '  이력:'
select '    ' || coalesce(from_state,'(없음)') || ' → ' || to_state || ' | ' || actor
  from public.verification_events where verification_id='e0000000-0000-0000-0000-000000000001' order by id;

\echo ''
\echo '=== V4 만료된 확인 ==='
insert into public.verifications (id, subject_type, subject_id, kind, state, reviewed_by, reviewed_at, valid_until)
values ('e0000000-0000-0000-0000-000000000002','caregiver','22222222-2222-2222-2222-222222222222',
        '간호조무사자격','verified','운영자-FIXTURE', now(), current_date - 1);

\echo '=== V5 철회된 확인 ==='
insert into public.verifications (id, subject_type, subject_id, kind, state, reviewed_by, reviewed_at, note)
values ('e0000000-0000-0000-0000-000000000003','caregiver','33333333-3333-3333-3333-333333333333',
        '간호사면허','verified','운영자-FIXTURE', now(), null);
update public.verifications set state='revoked', note='본인 요청으로 철회'
 where id='e0000000-0000-0000-0000-000000000003';
reset role;

\echo ''
\echo '=== 익명이 보는 확인 배지 (유효한 1건만 나와야 함) ==='
set role anon;
\echo -n '배지 수: '
select count(*) from public.verification_badges;
select '  ' || subject_type || ' | ' || kind || ' | 만료 ' || coalesce(valid_until::text,'없음')
  from public.verification_badges;

\echo ''
\echo '=== 익명이 증빙·검토자·사유를 볼 수 있는가 ==='
\echo -n '  배지 뷰 컬럼: '
select string_agg(column_name, ', ' order by ordinal_position)
  from information_schema.columns where table_schema='public' and table_name='verification_badges';
\echo -n '  verifications 직접 조회 행수(유효 1건만): '
select count(*) from public.verifications;
\echo -n '  증빙 참조가 보이는가: '
select coalesce(string_agg(coalesce(evidence_ref,'(null)'), ','), '(없음)') from public.verifications;
\echo '  이력 테이블 조회:'
select count(*) from public.verification_events;

\echo ''
\echo '=== 익명이 스스로 확인 배지를 만들 수 있는가 ==='
insert into public.verifications (subject_type, subject_id, kind, state, reviewed_by, reviewed_at)
values ('caregiver','11111111-1111-1111-1111-111111111111','간호사면허','verified','자칭', now());
update public.verifications set state='verified' where state='requested';
reset role;
