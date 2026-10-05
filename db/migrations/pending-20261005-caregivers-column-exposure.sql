-- 상태: 미적용. 운영 승인 대기. **배포와 함께 실행해야 한다.**
-- 격리 환경 검증: tests/isolated/72-caregivers-column-fix.sql
--
-- ── 무엇이 문제인가 ───────────────────────────────────────────────────────
-- `caregivers_public` 뷰는 연락처를 `contact_public` 이 참일 때만 내보낸다.
-- 그런데 익명 역할이 기반 테이블 `public.caregivers` 에 **테이블 단위 SELECT**
-- 권한을 갖고 있어, 뷰를 거치지 않고 직접 읽으면 연락처가 그대로 보인다.
-- RLS 는 '행'을 거를 뿐 '열'을 가리지 않는다. 즉 **가림이 사실상 무효**다.
--
-- 운영에서 읽기 전용으로 확인한 결과(2026-10-05):
--   GET /rest/v1/caregivers?select=contact          → 값이 그대로 반환됨
--   GET /rest/v1/caregivers?select=client_token     → 반환됨
--   GET /rest/v1/caregivers?select=consent_version  → 반환됨
--
-- 현재 테이블에는 시험 행 1건뿐이라 실제 개인정보 노출은 없다.
-- 그러나 **새 구직 화면이 배포되어 실제 등록이 시작되기 전에 반드시 막아야 한다.**
--
-- ── 왜 이렇게 고치는가 ───────────────────────────────────────────────────
-- (A) 열 단위 grant 로 contact 를 빼는 방법은 쓸 수 없다. 뷰가 security_invoker 라
--     뷰 자신도 contact 를 못 읽게 되어 가림 자체가 불가능해진다.
-- (B) 공개 뷰를 **소유자 권한**으로 두고 기반 테이블 읽기를 익명에게서 회수한다.
--     뷰가 유일한 읽기 경로가 되고, 가림이 뷰 안에서 끝난다. → 채택
--
-- 2026-10-04 사고와 혼동하지 말 것. 그 사고의 원인은 소유자 권한 자체가 아니라
-- **뷰에 INSERT/UPDATE/DELETE 권한이 자동으로 붙어 있던 것**이었다.
-- 이 마이그레이션은 쓰기 권한을 명시적으로 회수하고, 적용 후 시험으로 확인한다.

begin;

-- 1) 공개 뷰를 소유자 권한으로 (기반 테이블 RLS 대신 뷰의 WHERE 가 거른다)
alter view public.caregivers_public reset (security_invoker);

-- 2) 기반 테이블 읽기 차단. 등록(INSERT)은 유지한다.
--    INSERT 권한은 열 값을 드러내지 않으며, RLS 정책과 insert guard 가 계속 검사한다.
revoke select on public.caregivers from anon, authenticated;
grant insert on public.caregivers to anon, authenticated;

-- 3) 뷰는 읽기 전용. 기본 권한이 쓰기까지 붙이므로 반드시 명시적으로 회수한다.
revoke all on public.caregivers_public from anon, authenticated;
grant select on public.caregivers_public to anon, authenticated;

-- 4) 기반 테이블의 공개 읽기 정책은 더 이상 쓰이지 않는다.
--    남겨 두어도 권한이 없어 무해하지만, 오해를 줄이기 위해 지운다.
drop policy if exists "public read active" on public.caregivers;

commit;

-- ── 적용 직후 확인할 것 (익명 키로) ──────────────────────────────────────
--   GET /rest/v1/caregivers_public?select=name,contact,contact_public  → 200, 비공개는 null
--   GET /rest/v1/caregivers?select=contact                             → 401 42501
--   GET /rest/v1/caregivers?select=*                                   → 401 42501
--   PATCH/DELETE /rest/v1/caregivers_public                            → 401 42501
--   POST /rest/v1/caregivers (정상 등록)                                → 201
--   POST /rest/v1/caregivers (verified=true)                           → 401 RLS 위반

-- ── 되돌리기 ────────────────────────────────────────────────────────────
-- begin;
--   alter view public.caregivers_public set (security_invoker = true);
--   grant select on public.caregivers to anon, authenticated;
--   create policy "public read active" on public.caregivers
--     for select using (status = 'active');
-- commit;

-- ── 배포 순서 ────────────────────────────────────────────────────────────
-- 1. dolbom/gujik.html 새 버전을 gh-pages 에 배포한다.
--    (새 버전은 caregivers_public 만 읽는다. 기반 테이블을 직접 읽지 않는다)
-- 2. 배포를 눈으로 확인한 뒤 이 마이그레이션을 적용한다.
-- 순서를 바꾸면 라이브 구직 디렉토리가 비어 보인다.
