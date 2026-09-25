-- RLS 통합 테스트: 다른 사용자의 pet_id로 접근이 차단되는지, 역할 상승이 막히는지 검증.
-- 실패하면 RAISE EXCEPTION 으로 스크립트가 중단된다.
\set ON_ERROR_STOP on

-- 테스트 사용자 3명 (auth.users insert → profiles 트리거)
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'alice@example.test'),
  ('00000000-0000-0000-0000-00000000000b', 'bob@example.test'),
  ('00000000-0000-0000-0000-00000000000c', 'carol-admin@example.test');
update public.profiles set role = 'admin' where user_id = '00000000-0000-0000-0000-00000000000c';

-- 헬퍼: 특정 사용자로 전환
create or replace function test_as(uid text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', uid, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('role', 'authenticated', true);
end $$;
create or replace function test_reset() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claim.role', '', true);
  perform set_config('role', 'postgres', true);
end $$;

-- 1. alice가 반려동물 등록
begin;
select test_as('00000000-0000-0000-0000-00000000000a');
insert into public.pets (id, owner_id, species, name) values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'dog', '예시-초코');
insert into public.care_tasks (pet_id, title, due_at) values ('10000000-0000-0000-0000-000000000001', '예시 할 일', now());
insert into public.health_events (pet_id, event_type) values ('10000000-0000-0000-0000-000000000001', 'weight');
insert into public.documents (pet_id, owner_id, document_type, storage_path, original_name, mime_type, size)
  values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'receipt', '00000000-0000-0000-0000-00000000000a/x/doc1.pdf', 'r.pdf', 'application/pdf', 100);
insert into public.insurance_policies (id, pet_id, insurer, product_name) values ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '예시보험', '예시상품');
insert into public.incident_drafts (user_id, incident_type) values ('00000000-0000-0000-0000-00000000000a', 'lost');
do $$ begin
  if (select count(*) from public.pets) <> 1 then raise exception 'FAIL 1: alice should see her pet'; end if;
end $$;
commit;

-- 2. bob은 alice의 pet_id로 아무것도 읽을 수 없다
begin;
select test_as('00000000-0000-0000-0000-00000000000b');
do $$ begin
  if (select count(*) from public.pets where id = '10000000-0000-0000-0000-000000000001') <> 0 then raise exception 'FAIL 2a: bob can read alice pet'; end if;
  if (select count(*) from public.care_tasks where pet_id = '10000000-0000-0000-0000-000000000001') <> 0 then raise exception 'FAIL 2b: bob can read alice tasks'; end if;
  if (select count(*) from public.health_events where pet_id = '10000000-0000-0000-0000-000000000001') <> 0 then raise exception 'FAIL 2c: bob can read alice events'; end if;
  if (select count(*) from public.documents where pet_id = '10000000-0000-0000-0000-000000000001') <> 0 then raise exception 'FAIL 2d: bob can read alice documents'; end if;
  if (select count(*) from public.insurance_policies where pet_id = '10000000-0000-0000-0000-000000000001') <> 0 then raise exception 'FAIL 2e: bob can read alice policy'; end if;
  if (select count(*) from public.incident_drafts) <> 0 then raise exception 'FAIL 2f: bob can read alice incident draft'; end if;
  if (select count(*) from public.profiles) <> 1 then raise exception 'FAIL 2g: bob can read other profiles'; end if;
end $$;
-- bob이 alice의 pet에 할 일을 넣으려 하면 실패해야 한다
do $$ begin
  begin
    insert into public.care_tasks (pet_id, title, due_at) values ('10000000-0000-0000-0000-000000000001', '침입', now());
    raise exception 'FAIL 2h: bob inserted task into alice pet';
  exception when insufficient_privilege or check_violation then null;
  end;
end $$;
-- bob이 alice의 pet을 수정/삭제하려 하면 0건이어야 한다
update public.pets set name = 'hacked' where id = '10000000-0000-0000-0000-000000000001';
do $$ begin
  if (select count(*) from public.pets where name = 'hacked') <> 0 then raise exception 'FAIL 2i: bob updated alice pet'; end if;
end $$;
delete from public.pets where id = '10000000-0000-0000-0000-000000000001';
-- bob이 다른 사람 owner_id로 pet을 만들 수 없다
do $$ begin
  begin
    insert into public.pets (owner_id, species, name) values ('00000000-0000-0000-0000-00000000000a', 'cat', '위장');
    raise exception 'FAIL 2j: bob inserted pet as alice';
  exception when insufficient_privilege or check_violation then null;
  end;
end $$;
-- bob이 스스로 admin이 될 수 없다
do $$ begin
  begin
    update public.profiles set role = 'admin' where user_id = '00000000-0000-0000-0000-00000000000b';
    raise exception 'FAIL 2k: bob escalated to admin';
  exception when insufficient_privilege then null;
  end;
end $$;
-- bob은 감사로그를 읽을 수 없다
do $$ begin
  if (select count(*) from public.audit_logs) <> 0 then raise exception 'FAIL 2l: bob can read audit logs'; end if;
end $$;
rollback;

-- 3. alice의 pet은 여전히 존재 (bob의 delete가 0건이었어야 함)
begin;
select test_as('00000000-0000-0000-0000-00000000000a');
do $$ begin
  if (select count(*) from public.pets where id = '10000000-0000-0000-0000-000000000001') <> 1 then raise exception 'FAIL 3: alice pet was deleted by bob'; end if;
end $$;
-- alice가 bob을 읽기 공동보호자로 초대·수락
insert into public.pet_guardians (pet_id, user_id, permission, accepted_at) values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b', 'read', now());
commit;

-- 4. 읽기 공동보호자 bob은 읽을 수 있지만 쓸 수 없다
begin;
select test_as('00000000-0000-0000-0000-00000000000b');
do $$ begin
  if (select count(*) from public.pets where id = '10000000-0000-0000-0000-000000000001') <> 1 then raise exception 'FAIL 4a: guardian cannot read shared pet'; end if;
  if (select count(*) from public.care_tasks where pet_id = '10000000-0000-0000-0000-000000000001') <> 1 then raise exception 'FAIL 4b: guardian cannot read shared tasks'; end if;
  begin
    insert into public.care_tasks (pet_id, title, due_at) values ('10000000-0000-0000-0000-000000000001', '읽기권한 침입', now());
    raise exception 'FAIL 4c: read-only guardian inserted task';
  exception when insufficient_privilege or check_violation then null;
  end;
end $$;
rollback;

-- 5. 비회원(anon)은 콘텐츠 공개 규칙을 따른다
begin;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', 'anon', true);
select set_config('role', 'anon', true);
do $$ begin
  if (select count(*) from public.pets) <> 0 then raise exception 'FAIL 5a: anon can read pets'; end if;
  -- 검수자 없는 콘텐츠는 공개되지 않는다
  if (select count(*) from public.content_cards c join public.content_versions v on v.id = c.current_version_id where v.reviewer_name is null) <> 0
    then raise exception 'FAIL 5b: unreviewed content is public'; end if;
  if (select count(*) from public.feature_flags where enabled) <> 0 then raise exception 'FAIL 5c: a feature flag is enabled by default'; end if;
end $$;
rollback;

-- 6. 관리자는 승인·사유 없이 플래그를 켤 수 없다
begin;
select test_as('00000000-0000-0000-0000-00000000000c');
do $$ begin
  begin
    update public.feature_flags set enabled = true where key = 'paymentsEnabled';
    raise exception 'FAIL 6a: flag enabled without approver/reason';
  exception when check_violation then null;
  end;
end $$;
update public.feature_flags set enabled = true, approved_by = '00000000-0000-0000-0000-00000000000c', reason = '테스트 승인' where key = 'publicReviewsEnabled';
do $$ begin
  if (select approved_at from public.feature_flags where key = 'publicReviewsEnabled') is null then raise exception 'FAIL 6b: approved_at not set'; end if;
end $$;
rollback;

-- 7. 감사로그는 본인 actor_id로만 추가 가능, 수정 불가
begin;
select test_as('00000000-0000-0000-0000-00000000000a');
insert into public.audit_logs (actor_id, action, entity_type) values ('00000000-0000-0000-0000-00000000000a', 'test', 'pet');
do $$ begin
  begin
    insert into public.audit_logs (actor_id, action, entity_type) values ('00000000-0000-0000-0000-00000000000b', 'spoof', 'pet');
    raise exception 'FAIL 7a: audit log inserted with spoofed actor';
  exception when insufficient_privilege or check_violation then null;
  end;
end $$;
rollback;

select test_reset();
\echo 'RLS TESTS PASSED'
