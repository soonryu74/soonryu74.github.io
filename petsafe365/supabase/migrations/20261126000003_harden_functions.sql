-- 보안 점검 결과 반영: 트리거 함수는 API 로 직접 부를 수 없게 하고, 권한 확인 함수는 필요한 역할만 실행한다.
alter function public.set_updated_at() set search_path = public;

revoke execute on function public.handle_new_user(), public.protect_profile_role(), public.protect_order_status(),
  public.require_payments_enabled(), public.set_updated_at() from public, anon, authenticated;

revoke execute on function public.owns_pet(uuid), public.owns_policy(uuid) from public, anon;
grant execute on function public.owns_pet(uuid), public.owns_policy(uuid) to authenticated;

-- is_admin, is_reviewer 는 공개 테이블의 읽기 정책에서 쓰이므로 비로그인 역할도 실행할 수 있어야 한다 (결과는 항상 false).
