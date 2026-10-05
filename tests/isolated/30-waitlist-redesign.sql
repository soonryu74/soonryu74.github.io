-- 접수 중복·열거 공격 대응 재설계 (격리 환경에서 먼저 검증)
--
-- 고친 문제
--  (1) 연락처 전역 unique 가 가족 공동 연락처·다른 목적 등록까지 막았다.
--      → (정규화 연락처, 경로, 역할) 단위로 좁힌다.
--  (2) 중복이면 409 가 돌아와, 그 연락처가 이미 등록되어 있는지 외부에서
--      알아낼 수 있었다(열거 oracle). 공개 키만 있으면 누구나 시도할 수 있다.
--      → 접수는 함수로만 받고, 새로 넣었든 중복이든 **항상 같은 응답**을 준다.
--  (3) 같은 토큰을 다른 내용으로 재사용한 경우와 단순 재시도를 구분하지 못했다.
--      → 요청 지문을 함께 저장해 재시도는 수렴시키고, 내용이 다르면 거부한다.

begin;

drop index if exists public.waitlist_contact_uniq;
create unique index waitlist_contact_role_uniq
  on public.waitlist (lower(regexp_replace(contact, '[^0-9a-zA-Z@.]', '', 'g')), source, role);

alter table public.waitlist add column if not exists req_digest text;

-- 접수 함수.
--  · SECURITY DEFINER 이지만 search_path 를 고정하고, 동적 SQL 이 없으며,
--    대상 테이블이 고정되어 있고, **어떤 데이터도 돌려주지 않는다.**
--  · 반환값은 'accepted' 또는 예외뿐이다. 중복 여부를 알려주지 않는다.
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

  -- 같은 토큰이 이미 있으면: 내용이 같으면 수렴(성공), 다르면 거부
  if p_client_token is not null then
    select req_digest into v_existing
      from public.waitlist where client_token = p_client_token;
    if found then
      if v_existing is distinct from v_digest then
        raise exception '같은 요청번호로 다른 내용을 보낼 수 없습니다' using errcode = '23505';
      end if;
      return 'accepted';
    end if;
  end if;

  insert into public.waitlist (role, job, name, area, contact, msg, source,
                               client_token, consent_version, req_digest)
  values (p_role, p_job, p_name, p_area, p_contact, p_msg,
          coalesce(p_source, 'gyeotae'), p_client_token, p_consent_version, v_digest)
  on conflict do nothing;        -- 연락처·토큰 어느 쪽이 충돌해도 조용히 넘어간다

  return 'accepted';             -- 새로 넣었든 중복이든 같은 응답
end
$fn$;

revoke all on function public.submit_waitlist(text,text,text,text,text,text,text,uuid,text) from public;
grant execute on function public.submit_waitlist(text,text,text,text,text,text,text,uuid,text)
  to anon, authenticated;

-- 함수로만 접수하므로 테이블 직접 INSERT 는 더 이상 열어두지 않는다
drop policy if exists "anon can insert waitlist" on public.waitlist;
revoke insert on public.waitlist from anon, authenticated;

commit;
