\set ON_ERROR_STOP off
\pset format unaligned
\pset tuples_only on

-- fixture (관리자 권한으로 생성. 운영에는 넣지 않는다)
set role service_role;
insert into public.orgs (id, name, ltc_sym, sido, sigungu, contact, verified_at, verified_by, status)
values ('a0000000-0000-0000-0000-000000000001','FIXTURE 확인된기관','1-11560-00018','서울특별시','노원구','02-000-0000', now(), 'FIXTURE 검토자','active'),
       ('a0000000-0000-0000-0000-000000000002','FIXTURE 미확인기관', null,'경기도','구리시', null, null, null, 'active'),
       ('a0000000-0000-0000-0000-000000000003','FIXTURE 정지기관',   null,'부산광역시','해운대구', null, now(), 'x','suspended');

insert into public.jobs (id, org_id, title, job_role, sido, sigungu, employment, shift,
                         pay_type, pay_min, pay_max, description, apply_method, apply_url,
                         closes_at, review_status)
values ('b0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001',
        'FIXTURE 승인·공개','요양보호사','서울특별시','노원구','시간제','주간','hour',12000,14000,
        '검토를 통과한 공고','external','https://www.work24.go.kr/', current_date + 30,'approved'),
       ('b0000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000001',
        'FIXTURE 검토대기','요양보호사','서울특별시','노원구','시간제','주간','hour',12000,null,
        '아직 검토 전','direct',null, current_date + 30,'submitted'),
       ('b0000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000001',
        'FIXTURE 반려','간병인','서울특별시','노원구',null,null,'negotiable',null,null,
        '반려된 공고','direct',null,null,'rejected'),
       ('b0000000-0000-0000-0000-000000000004','a0000000-0000-0000-0000-000000000001',
        'FIXTURE 마감일지남','요양보호사','서울특별시','노원구',null,null,'negotiable',null,null,
        '마감일이 지난 공고','direct',null, current_date - 1,'approved'),
       ('b0000000-0000-0000-0000-000000000005','a0000000-0000-0000-0000-000000000003',
        'FIXTURE 정지기관공고','요양보호사','부산광역시','해운대구',null,null,'negotiable',null,null,
        '정지된 기관의 공고','direct',null,null,'approved');
reset role;

\echo '=== 익명이 공개 목록에서 보는 공고 (FIXTURE 승인·공개 1건만 나와야 함) ==='
set role anon;
select title || ' | ' || org_name || ' | 기관확인=' || org_verified from public.jobs_public order by title;
\echo -n '공개 목록 건수: '
select count(*) from public.jobs_public;

\echo ''
\echo '=== 공개 목록에 내부 검토 열이 없는가 ==='
select case when exists (
  select 1 from information_schema.columns
   where table_schema='public' and table_name='jobs_public'
     and column_name in ('review_status','reviewed_by','reject_reason','closed')
) then 'FAIL — 내부 열 노출' else 'OK — 내부 열 없음' end;

\echo ''
\echo '=== 조건 검색 ==='
\echo -n '지역 서울 노원구: '
select count(*) from public.jobs_public where sido='서울특별시' and sigungu='노원구';
\echo -n '직종 간병인: '
select count(*) from public.jobs_public where job_role='간병인';
\echo -n '시급 13000 이상 가능: '
select count(*) from public.jobs_public where pay_type='hour' and coalesce(pay_max,pay_min) >= 13000;

\echo ''
\echo '=== 익명 쓰기 시도 (전부 거부되어야 함) ==='
\echo 'J1 공고 직접 등록:'
insert into public.jobs (org_id,title,job_role,apply_method) values ('a0000000-0000-0000-0000-000000000001','해킹','요양보호사','direct');
\echo 'J2 공고 승인 상태 변경:'
update public.jobs set review_status='approved' where title='FIXTURE 검토대기';
\echo 'J3 공고 삭제:'
delete from public.jobs;
\echo 'J4 기관 등록:'
insert into public.orgs (name) values ('해킹기관');
\echo 'J5 기관 확인 배지 자가 부여:'
update public.orgs set verified_at=now() where name='FIXTURE 미확인기관';
\echo 'J6 지원 내역 열람:'
select count(*) from public.applications;
\echo 'J7 공개 뷰로 UPDATE:'
update public.jobs_public set title='x';
\echo 'J8 검토 대기 공고 직접 조회(0 이어야 함):'
select count(*) from public.jobs where review_status='submitted';
reset role;

\echo ''
\echo '=== 무결성 제약 ==='
set role service_role;
\echo 'C1 external 인데 지원 URL 없음:'
insert into public.jobs (org_id,title,job_role,apply_method,apply_url)
values ('a0000000-0000-0000-0000-000000000001','C1','요양보호사','external',null);
\echo 'C2 같은 공고에 같은 사람이 두 번 지원:'
insert into public.applications (job_id, applicant_id) values ('b0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-00000000000c');
insert into public.applications (job_id, applicant_id) values ('b0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-00000000000c');
\echo 'C3 허용되지 않은 검토 상태:'
insert into public.jobs (org_id,title,job_role,apply_method,review_status)
values ('a0000000-0000-0000-0000-000000000001','C3','요양보호사','direct','자동승인');
reset role;
