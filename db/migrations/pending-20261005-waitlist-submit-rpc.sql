-- 상태: 미적용. 운영 승인 대기.
-- 격리 환경(PostgreSQL 16, tests/isolated/)에서 전부 검증한 뒤 작성했다.
-- 검증 결과: docs/care-platform/isolated-verification-20261005.md
--
-- 고치는 문제 3가지
--  (1) 연락처 전역 unique 가 가족 공동 연락처·다른 목적 등록까지 막는다.
--      격리 환경 재현: 같은 번호로 '전문가' 접수 후 '가정·기관' 접수가 23505 로 거부됐다.
--      → (정규화 연락처, 경로, 역할) 단위로 좁힌다.
--  (2) 중복이면 409 가 돌아와 **그 연락처가 이미 등록되어 있는지 외부에서 알아낼 수 있다**.
--      공개 키만 있으면 누구나 시도할 수 있으므로 화면 문구만 바꿔서는 막히지 않는다.
--      → 접수를 함수로만 받고, 새로 넣었든 중복이든 항상 같은 응답을 준다.
--  (3) 같은 토큰을 다른 내용으로 재사용한 경우와 단순 재시도가 구분되지 않는다.
--      → 요청 지문을 저장해 재시도는 수렴시키고 내용이 다르면 거부한다.
--
-- 되돌리기는 파일 끝에 있다.

begin;

-- ── 1. 연락처 유니크 범위 축소 ──────────────────────────────────────────
-- 주의: 기존 인덱스를 지운다. 적용 전 아래로 영향 행을 확인할 것.
--   select lower(regexp_replace(contact,'[^0-9a-zA-Z@.]','','g')) c, source, count(*)
--     from public.waitlist group by 1,2 having count(*) > 1;
--   (현재 waitlist 는 0행이므로 영향이 없다)
drop index if exists public.waitlist_contact_uniq;
create unique index if not exists waitlist_contact_role_uniq
  on public.waitlist (lower(regexp_replace(contact, '[^0-9a-zA-Z@.]', '', 'g')), source, role);

-- ── 2. 요청 지문 열 추가 (추가 방식) ────────────────────────────────────
alter table public.waitlist add column if not exists req_digest text;

-- ── 3. 접수 함수 ────────────────────────────────────────────────────────
-- SECURITY DEFINER 를 쓰되, 앞서 제거한 import_eval_chunk 의 실수를 되풀이하지 않는다.
--   · search_path 를 '' 로 고정한다 (모든 식별자를 스키마까지 적는다)
--   · 동적 SQL 이 없다. 대상 테이블이 고정되어 있다
--   · 호출자가 준 URL 로 외부 요청을 하지 않는다
--   · 어떤 행 데이터도 반환하지 않는다. 반환값은 'accepted' 뿐이다
--   · 입력 길이·허용값을 서버에서 검사한다
create or replace function public.submit_waitlist(
  p_role text, p_job text, p_name text, p_area text,
  p_contact text, p_msg text, p_source text,
  p_client_token uuid, p_consent_version text
) returns text
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_digest text;
  v_existing text;
begin
  if p_contact is null or btrim(p_contact) = '' then
    raise exception '연락처가 필요합니다' using errcode = '22023';
  end if;
  if p_role is null or p_role not in ('전문가', '가정·기관') then
    raise exception '구분 값이 올바르지 않습니다' using errcode = '22023';
  end if;
  if length(p_contact) > 200 or length(coalesce(p_msg,'')) > 1000
     or length(coalesce(p_name,'')) > 80 or length(coalesce(p_area,'')) > 80
     or length(coalesce(p_job,'')) > 120 then
    raise exception '입력이 너무 깁니다' using errcode = '22023';
  end if;

  v_digest := encode(extensions.digest(
      concat_ws(e'\x1f', p_role, p_job, p_name, p_area, p_contact, p_msg, p_source), 'sha256'), 'hex');

  if p_client_token is not null then
    select req_digest into v_existing
      from public.waitlist where client_token = p_client_token;
    if found then
      if v_existing is distinct from v_digest then
        raise exception '같은 요청번호로 다른 내용을 보낼 수 없습니다' using errcode = '23505';
      end if;
      return 'accepted';          -- 응답을 못 받고 다시 보낸 경우: 같은 결과로 수렴
    end if;
  end if;

  insert into public.waitlist (role, job, name, area, contact, msg, source,
                               client_token, consent_version, req_digest)
  values (p_role, p_job, p_name, p_area, p_contact, p_msg,
          coalesce(p_source, 'gyeotae'), p_client_token, p_consent_version, v_digest)
  on conflict do nothing;

  return 'accepted';              -- 새로 넣었든 중복이든 같은 응답 (열거 차단)
end
$fn$;

revoke all on function public.submit_waitlist(text,text,text,text,text,text,text,uuid,text) from public;
grant execute on function public.submit_waitlist(text,text,text,text,text,text,text,uuid,text)
  to anon, authenticated;

-- ── 4. 테이블 직접 INSERT 경로 차단 ─────────────────────────────────────
-- 함수로만 접수하므로 더 이상 열어 둘 이유가 없다.
-- **곁애 랜딩의 새 버전을 배포한 뒤에 실행할 것.** 지금 실행하면 옛 화면의 접수가 깨진다.
--   (현재 곁애 랜딩은 배포 전이므로 깨질 라이브 화면은 없다)
revoke insert on public.waitlist from anon, authenticated;
drop policy if exists "anon can insert waitlist" on public.waitlist;

commit;

-- ── 되돌리기 ────────────────────────────────────────────────────────────
-- begin;
--   create policy "anon can insert waitlist" on public.waitlist
--     for insert to anon, authenticated with check (true);
--   grant insert on public.waitlist to anon, authenticated;
--   drop function if exists public.submit_waitlist(text,text,text,text,text,text,text,uuid,text);
--   drop index if exists public.waitlist_contact_role_uniq;
--   create unique index waitlist_contact_uniq
--     on public.waitlist (lower(regexp_replace(contact,'[^0-9a-zA-Z@.]','','g')), source);
--   alter table public.waitlist drop column if exists req_digest;
-- commit;
