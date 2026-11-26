# 펫안심365 (PETSAFE 365)

오늘 할 일부터, 위급한 순간까지. 반려견·반려묘 보호자를 위한 모바일 우선 안전 플랫폼과 그 안의 용품 가게입니다.

- 기준 문서: [`PETSAFE365_CLAUDE_HANDOFF.md`](./PETSAFE365_CLAUDE_HANDOFF.md)
- 2026-11-26 확정 사항과 화면 개발 규칙: [`docs/dev-contract.md`](./docs/dev-contract.md)
- 결정 기록: [`docs/decisions.md`](./docs/decisions.md)

## 바로 실행하기 (키 없이, 예시 모드)

```bash
cd petsafe365
npm install
npm run dev
```

브라우저에서 <http://localhost:3000> 을 엽니다. 맥과 윈도우 모두 같은 명령입니다 (맥은 터미널, 윈도우는 PowerShell).

키를 넣지 않으면 **예시 모드**로 실행됩니다. 화면 맨 위에 주황색 띠가 보이고, 입력한 내용은 그 브라우저에만 저장됩니다. 예시 모드에서는 아무 이메일이나 넣으면 바로 로그인되고, 로그인 화면의 "체험용 관리자로 보기"로 관리자 화면을 볼 수 있습니다.

## 실제 서비스로 연결하기

1. [Supabase](https://supabase.com/dashboard)에서 프로젝트를 만듭니다.
2. `supabase/migrations/` 의 SQL 두 개를 파일 이름 순서대로 적용합니다 (Supabase 대시보드 SQL Editor에 붙여 넣거나 `supabase db push`).
3. `.env.example` 을 `.env.local` 로 복사하고 값을 채웁니다.

   | 운영체제 | 복사 명령 |
   |---|---|
   | 맥 (터미널) | `cp .env.example .env.local` |
   | 윈도우 (PowerShell) | `Copy-Item .env.example .env.local` |

4. Supabase 대시보드 Authentication → URL Configuration 의 Redirect URLs 에 `<앱 주소>/auth/callback` 을 추가합니다.
5. 앱에서 관리자 이메일로 한 번 로그인한 뒤, `.env.local` 의 `ADMIN_BOOTSTRAP_EMAIL` 에 그 이메일을 넣고 `npm run seed` 를 실행합니다. 초기 데이터가 들어가고 그 계정이 관리자가 됩니다.

### 필요한 키

| 환경변수 | 용도 | 발급처 | 필요 시점 |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 로그인·DB·파일 | Supabase → Project Settings → API | 실제 서비스 |
| `SUPABASE_SERVICE_ROLE_KEY` | 탈퇴 처리, 시드 (서버 전용) | 같은 곳 | 실제 서비스 |
| `ADMIN_BOOTSTRAP_EMAIL` | 첫 관리자 지정 | 직접 정함 | 시드할 때 |
| `NEXT_PUBLIC_PAYMENT_PROVIDER`, `NEXT_PUBLIC_PAYMENT_CLIENT_KEY`, `PAYMENT_SECRET_KEY` | 앱 안 결제 | 결제대행사 (토스페이먼츠, 포트원 등) 계약 후 | 결제 열 때 |
| `NEXT_PUBLIC_KAKAO_MAP_APP_KEY`, `KAKAO_REST_API_KEY` | 지도 표시·주소 검색 | [Kakao Developers](https://developers.kakao.com) | Phase 2 |
| `PUBLIC_DATA_SERVICE_KEY` | 동물병원 등 공공데이터 | [공공데이터포털](https://www.data.go.kr) | Phase 2 |
| `TOUR_API_SERVICE_KEY` | 반려동물 동반여행 데이터 | [TourAPI](https://api.visitkorea.or.kr) | Phase 2 |

`NEXT_PUBLIC_` 이 붙은 값은 브라우저에 공개됩니다. 서버 전용 키에는 절대 붙이지 않습니다.

## 명령

| 명령 | 하는 일 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm run lint` | 코드 규칙 검사 |
| `npm run typecheck` | 타입 검사 |
| `npm test` | 단위 + 통합 테스트 (권한 정책을 실제 PostgreSQL 엔진으로 검증) |
| `npm run test:e2e` | Playwright 핵심 흐름 (예시 모드) |
| `npm run build` | 운영 빌드 |
| `npm run seed` / `npm run seed -- --dry` | 초기 데이터 넣기 / 건수만 확인 |

## 구조

```
src/app/            화면 (인수인계서 5장의 경로 + /shop, /more, /login)
src/components/     공용 부품
src/lib/types.ts    DB 행 타입
src/lib/repo/       저장소: supabase.ts(실제), local.ts(예시 모드)
src/lib/rules/      규칙 엔진: 오늘 할 일, 보험 3단계, 연락처 유효기간, 콘텐츠 공개, 판매 금지 화면
src/lib/domain.ts   복합 동작 (등록+할 일 생성, 완료+기록, 삭제, 동의 기록, 감사로그)
src/lib/seed/       초기 데이터 (모두 예시 또는 검수 전)
supabase/migrations 스키마·인덱스·RLS·스토리지 정책
tests/              unit, integration(RLS), e2e
docs/               데이터 출처, 법무 준비, 콘텐츠 검수, 결정 기록
```

## 지켜야 할 원칙

- 안전·신고·법정 정보는 무료이고, 홈 화면에 상품을 진열하지 않습니다.
- 진단·약·용량·치료를 제시하지 않습니다. 보험 상품을 추천하지 않습니다.
- 판매와 광고는 `commerceAllowedOn()` 이 허용한 화면에서만 합니다 (긴급·지도·신고·건강·보험·법무·홈 제외).
- 결제·광고·공개 후기 등은 `feature_flags` 가 기본으로 꺼져 있고, 관리자가 사유를 적고 켜면 감사로그에 남습니다.
- 용품의 스마트스토어 링크는 `products.external_url` 에 넣습니다. 시험 결과는 `product_lots` 에 시험일·기관과 함께 넣어야 "통과"로 표시됩니다.

## 배포

SSR 과 서버 경로(`/api/account/delete`)가 있어 GitHub Pages 에는 올릴 수 없습니다. Vercel 등 Node 를 지원하는 곳에 `petsafe365` 폴더를 루트로 지정해 배포합니다. 이 저장소의 Jekyll 사이트에서는 `_config.yml` 로 이 폴더를 제외했습니다.
