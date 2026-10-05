-- 결함 교정: 공개 뷰가 security_invoker 이므로 기반 테이블 SELECT 권한이 필요한데,
-- 테이블 전체에 SELECT 를 주면 RLS 가 행은 걸러도 **열은 다 보인다.**
-- 익명이 evidence_ref(증빙 보관 위치)·reviewed_by·note 까지 읽을 수 있었다.
-- → 테이블 권한을 회수하고 **열 단위로** 필요한 열만 준다.
revoke select on public.verifications from anon, authenticated;
-- 주의: 열 단위 권한은 WHERE 절에서 쓰는 열에도 필요하다.
-- 뷰가 state·valid_until 로 거르므로 state 도 포함해야 뷰가 동작한다.
-- state 는 RLS 가 이미 'verified' 행만 남기므로 추가로 드러나는 정보가 없다.
grant select (subject_type, subject_id, kind, valid_until, state)
  on public.verifications to anon, authenticated;
