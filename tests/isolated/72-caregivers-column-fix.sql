-- 결함: caregivers_public 뷰가 contact 를 contact_public 일 때만 내보내지만,
--       익명이 기반 테이블 caregivers 를 직접 조회하면 contact 가 그대로 보인다.
--       RLS 는 '행'을 거를 뿐 '열'을 가리지 않는다. 가림이 사실상 무효였다.
--       (운영에서도 동일함을 읽기 전용 조회로 확인했다)
--
-- 교정 방향 비교
--   (A) 열 단위 grant 로 contact 를 빼기 → 뷰도 security_invoker 라서 contact 를
--       못 읽어 가림 자체가 불가능. 채택 불가.
--   (B) 공개 뷰를 **소유자 권한(security definer)** 으로 두고, 기반 테이블 권한을
--       익명에게서 전부 회수한다. 뷰가 유일한 읽기 경로가 되고, 가림이 뷰 안에서 끝난다.
--       10-04 사고는 definer 자체가 아니라 **뷰에 쓰기 권한이 붙어 있던 것**이 원인이었다.
--       따라서 쓰기 권한을 명시적으로 회수하고, 그 상태를 시험으로 확인한다. → 채택
--
-- 등록(INSERT)은 계속 기반 테이블로 받는다. INSERT 권한은 열을 드러내지 않는다.

alter view public.caregivers_public reset (security_invoker);   -- 소유자 권한으로 되돌림

revoke select on public.caregivers from anon, authenticated;    -- 기반 테이블 읽기 차단
-- 등록 경로는 유지 (RLS 정책 + insert guard 가 계속 검사한다)
grant insert on public.caregivers to anon, authenticated;

revoke all on public.caregivers_public from anon, authenticated;
grant select on public.caregivers_public to anon, authenticated;
