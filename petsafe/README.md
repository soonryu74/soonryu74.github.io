# 펫안심365 (PETSAFE 365)

> 오늘 할 일부터, 위급한 순간까지 — 반려견·반려묘 보호자를 위한 모바일 우선 안전 플랫폼

기준 문서: 저장소 밖에서 전달된 `PETSAFE365_CLAUDE_HANDOFF.md` (v1.0, 2026-08-31). 설계 결정은 `docs/decisions.md`.

## 무엇이 되나 (Phase 1)

| 화면 | 경로 | 상태 |
|---|---|---|
| 홈 | `/` | 긴급 → 오늘 할 일 3개 → 가까운 곳 → 보험 → 신고 → 감염병 순 |
| 로그인·가입 | `/login`, `/auth/callback` | 이메일 매직링크(Supabase). 키가 없으면 예시 모드 로그인 |
| 약관 동의 | `/consent` | 필수 4종·선택 1종, 문서 버전 기록, 새 버전 게시 시 재동의 |
| 시작하기 | `/onboarding` | 4단계, 필수는 종·이름만, 중단 후 재개(기기 초안) |
| 오늘 할 일 | `/today` | 생성·완료·미루기·메모, 반복, 완료 시 타임라인 기록 |
| 우리 아이 | `/pets`, `/pets/[petId]` | 여러 마리 CRUD·전환, 질환·알레르기, 삭제 전 이름 재입력 |
| 기록 | `/records` | 체중·관찰·투약 메모·검사·진료·비용, 비공개 문서 업로드 |
| 긴급 도움 | `/emergency` | 관찰 신호 → 할 것/하지 말 것, 다니는 병원 원탭 전화, 병원 찾기, 병원 전달 메모 |
| 주변 시설 | `/map`, `/facilities/[id]` | 13개 유형 필터, 내 주변(버튼 클릭 시만), 주소 검색, 상태 배지 분리, 오류 신고 |
| 건강·예방 | `/health` | 해야 할 것·하지 말 것, 출처·검토일 |
| 인수공통감염병 | `/health/zoonoses[/slug]` | SFTS·공수병·개 브루셀라증·톡소포자충증. **검수 전 비공개** |
| 보험·비용 | `/insurance` | 약관 메타정보·조항 입력·3단계 확인·청구 서류 체크. 추천·가입 없음 |
| 실종·구조동물 찾기 | `/lost` | 전국 보호소 구조 공고를 시도·시군구·종류·색/특징으로 모아 보기, 공고 남은 날, 보호소 원탭 전화, 새 공고 표시(비회원: 기기 기준 / 회원: 관심 조건 최대 5개 → 홈 알림) |
| 장례 도움 | `/funeral` | 합법 처리 방법·등록 말소 안내, 업체 이름으로 허가 목록 확인, 시도·시설별 허가 업체(전화·지도·홈페이지), 전화 체크리스트, 마음 돌보기(위기상담 연결) |
| 신고 | `/reports` | 상황별 공식 연락처(확인일), 증거 체크, 신고 준비 메모(기기/계정 90일) |
| 법무·신뢰센터 | `/legal`, `/legal/[type]` | 이용약관·개인정보·위치·저작권, 기능 플래그 상태 공개 |
| 내 계정 | `/account` | 동의 이력, 데이터 내려받기(JSON), 로그아웃, 탈퇴 |
| 파트너 | `/partner` | 요금 안내만. 신청은 "준비 중"(비활성) |
| 운영 | `/admin`, `/admin/content`, `/admin/facilities`, `/admin/legal`, `/admin/audit` | 대시보드, 콘텐츠 검수 CMS, 오류신고 처리, 문서 버전·연락처 검증, 감사로그 |

모든 화면에 로딩·빈 상태·오류·권한 거부 상태가 있다. 미구현 기능은 버튼을 비활성화하고 "준비 중"으로 표시한다.

## 두 가지 실행 모드

| 모드 | 조건 | 저장 위치 | 표시 |
|---|---|---|---|
| 운영 | `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` 설정 | Supabase (RLS로 권한 강제) | 없음 |
| 예시 | 위 두 값이 비어 있음 | 서버의 `.demo-data/` JSON 파일 | 모든 화면 상단 "예시 모드" 배너, 로그인 시 이메일 미발송 안내 |

예시 모드는 개발·시연·E2E용이다. 서버리스 호스팅(Vercel 등)은 파일 쓰기가 유지되지 않으므로 **배포 시에는 반드시 Supabase 키를 넣는다.**

## 설치와 실행

Node.js 20 이상이 필요하다(개발 확인: v22).

macOS (터미널)
```bash
cd petsafe
npm install
cp .env.example .env.local     # 값 채우기 (비워 두면 예시 모드)
npm run dev                    # http://localhost:3000
```

Windows (PowerShell)
```powershell
cd petsafe
npm install
Copy-Item .env.example .env.local
npm run dev
```

## 테스트

| 명령 | 내용 |
|---|---|
| `npm run lint` | ESLint (next/core-web-vitals + typescript) |
| `npm run typecheck` | TypeScript |
| `npm test` | 단위·통합 (Vitest): 규칙 엔진, 보험 3단계, 좌표변환, 연락처 유효기간, 콘텐츠 공개 규칙, 업로드 검증, 플래그 기본값, 수집기 upsert, 예시 저장소 사용자 격리 |
| `npm run db:test` | 로컬 PostgreSQL에 마이그레이션+시드 적용 후 RLS 교차 사용자 차단 테스트 (`psql` 필요) |
| `npm run build` | production build |
| `npm run test:e2e` | Playwright (먼저 `npm run build`): 가입→등록→완료→재로그인 유지, 다른 사용자 pet_id·문서 차단, 긴급 전화 링크, 위치 거부 시 주소 검색, 감염병 검수→게시, 보험, 신고, 탈퇴, 360px·데스크톱 axe 접근성, 키보드 |

`db:test`는 Supabase의 `auth.uid()`를 흉내 내는 심(`supabase/test/local_auth_shim.sql`)을 쓴다. macOS는 `brew install postgresql@16`, Windows는 PostgreSQL 설치 관리자로 설치한 뒤 `PGUSER=postgres npm run db:test`(Windows PowerShell: `$env:PGUSER="postgres"; npm run db:test`).

## Supabase 설정 (운영 모드)

1. 전용 프로젝트를 만든다(무료 요금제는 활성 프로젝트 수 제한이 있으니 대시보드에서 확인).
2. SQL Editor에서 순서대로 실행: `supabase/migrations/0001_core.sql` → `0002_content_legal.sql` → `0003_insurance_facilities.sql` → `0004_storage.sql` → `supabase/seed.sql`
   - Supabase CLI를 쓰면: `supabase link --project-ref <ref>` 후 `supabase db push`, 시드는 `psql "$DB_URL" -f supabase/seed.sql`
3. Authentication → URL Configuration: Site URL과 Redirect URL에 `https://<도메인>/auth/callback` 추가.
4. Authentication → Email: 매직링크 템플릿이 `{{ .ConfirmationURL }}`을 쓰는지 확인(PKCE 코드가 `/auth/callback?code=`로 온다).
5. `.env.local`(또는 호스팅 환경변수)에 키 입력. 콘텐츠를 바꾸면 `npm run seed:generate`로 `seed.sql`을 다시 만든다.
6. 첫 관리자: `ADMIN_BOOTSTRAP_EMAIL`과 `SUPABASE_SERVICE_ROLE_KEY`를 넣고 그 이메일로 로그인하면 관리자 역할이 부여된다. 서비스 키 없이 하려면 SQL: `update public.profiles set role = 'admin' where user_id = (select id from auth.users where email = '...');`

## 환경변수

| 이름 | 공개 | 필요 시점 | 발급처 |
|---|---|---|---|
| `NEXT_PUBLIC_APP_URL` | 예 | 운영 | 배포 도메인 (매직링크 리다이렉트) |
| `NEXT_PUBLIC_SUPABASE_URL` | 예 | 운영 필수 | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 예 | 운영 필수 | 같은 곳 (anon/publishable) |
| `SUPABASE_SERVICE_ROLE_KEY` | **서버 전용** | 탈퇴 시 계정 완전 삭제, 관리자 부트스트랩, 수집기 쓰기 | 같은 곳 (service_role) |
| `NEXT_PUBLIC_KAKAO_MAP_APP_KEY` | 예 | 지도 표시 | developers.kakao.com → 내 애플리케이션 → JavaScript 키 (+ 플랫폼에 도메인 등록) |
| `KAKAO_REST_API_KEY` | **서버 전용** | 주소→좌표 | 같은 앱의 REST API 키 |
| `PUBLIC_DATA_SERVICE_KEY` | **서버 전용** | 실종·구조동물 찾기, 동물병원 수집기 | data.go.kr에서 **15098931(구조동물 조회)**과 15154952(동물병원)를 각각 활용신청. 포털의 '일반 인증키(Decoding)'를 넣는다 |
| `PUBLIC_DATA_HOSPITAL_URL` | 서버 | 동물병원 수집기 | 위 API 상세 페이지의 요청 주소 |
| `TOUR_API_SERVICE_KEY` | **서버 전용** | Phase 2 동반여행 | api.visitkorea.or.kr |
| `CRON_SECRET` | 서버 | Phase 2 배치 엔드포인트 | 임의 문자열 |
| `ADMIN_BOOTSTRAP_EMAIL` | 서버 | 첫 관리자 | 운영자 이메일 |
| `SENTRY_DSN` | 서버 | 선택 | sentry.io (현재 미연결) |
| `PETSAFE_DEMO_DIR` | 서버 | 선택 | 예시 모드 저장 폴더 |

## 공공데이터 수집기

```bash
npm run import:hospitals -- --dry-run --fixture tests/fixtures/animal-hospitals.sample.json   # 키 없이 구조 확인
npm run import:hospitals -- --dry-run      # 키 입력 후 실제 API, DB 쓰기 없음
npm run import:hospitals                   # DB 반영 (서비스 키 필요)
```

EPSG:5174 → WGS84 변환, `source_system + source_id` upsert, 폐업은 삭제 대신 상태 이력, 중복 병합 후보 출력, 실행 기록(`facility_sync_logs`). 자세한 내용은 `docs/data-sources.md`.

## 동물장묘업 목록 갱신

```bash
npm run import:funeral   # 국가동물보호정보시스템 동물장묘업 목록 → src/content/funeral-businesses.json
```

키가 필요 없다. 원문 전체 건수와 수집 건수가 다르면 경고를 낸다. 월 1회 정도 실행해 커밋한다.

## 배포

- 이 폴더는 GitHub Pages(정적)에서 동작하지 않는다. Vercel 등 Node 호스팅에서 **Root Directory = `petsafe`** 로 배포한다.
- 저장소 루트의 Jekyll 빌드는 이 폴더도 정적 파일로 복사한다. 원하지 않으면 루트 `_config.yml`의 `exclude`에 `petsafe`를 추가한다(기존 사이트 설정이라 이번 작업에서는 바꾸지 않았다).

## 문서

- `docs/decisions.md` — 조사 결과, 설계 결정, 기술부채
- `docs/data-sources.md` — 데이터셋·라이선스·필드·갱신주기·확인 상태
- `docs/legal-readiness.md` — 기능 플래그와 출시 전 확인사항
- `docs/content-review.md` — 건강·감염병 콘텐츠 검수 흐름

## 폴더 구조

```
petsafe/
  src/app/            화면(App Router)과 서버 액션(actions/), API 라우트(api/)
  src/components/     공통 UI
  src/content/        버전 관리되는 콘텐츠(할 일 템플릿·긴급·감염병·연락처·법무·예시 시설)
  src/lib/            규칙 엔진·보험 분류·좌표·검증·세션·저장소(store/supabase.ts, store/demo.ts)
  supabase/           migrations, seed.sql, test(RLS)
  scripts/            seed 생성기, 공공데이터 수집기
  tests/              unit, integration, e2e, fixtures
```
