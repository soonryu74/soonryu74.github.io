# 모심·곁애 개편 — 구현 현황

지시서: 1차 `CLAUDE_CODE_모심_곁애_개편지시서.md` · 2차 (2026-10-04) · 3차 (2026-10-04, 사고 확인 후 개발 계속)

**함께 보는 문서**
| 문서 | 내용 |
|---|---|
| `incident-20261004.md` | 🔴 `caregivers` 3행 삭제 사고 + 별건 SECURITY DEFINER 취약점 |
| `cleanup-plan-20261004.md` | 시험 흔적 정리 실행안 (정확한 기본키·복구안) |
| `data-verification-20261004.md` | 원파일 해시·파싱·행 단위 대조·숫자 정의 |
| `isolated-verification-20261005.md` | 격리 환경 권한·중복접수 검증 |
| `verification-policy.md` | 자격 확인 운영안 |
| `institution-contact-api-setup.md` | 기관 주소·전화 API 설정 안내 |
| `db/migrations/pending-*.sql` | 운영 미적용 마이그레이션 3건 |
작업 브랜치: `claude/korean-caregiving-portal-0n9kje`
최종 갱신: 2026-10-05

---

## 0. 1차 보고에서 바로잡은 것

2차 지시서의 지적 세 가지를 모두 수용해 수정했다.

| 지적 | 1차 보고 | 수정 |
|---|---|---|
| 기관명 수 ≠ 기관 수 | "기관명 기준 약 16,797곳" | **기관 수를 제공하지 않음.** "서로 다른 기관명 **값** 16,797개"로만 표기 |
| 7,905 vs 3,672 불일치 | 설명 없이 3,672만 제시 | **두 집계의 그룹 키 차이로 설명** (아래 2절) |
| 행 수 감소 = T06 통과 | 행 수만으로 완료 처리 | **사례 기반 재검증.** 그 결과 **뷰에 결함을 발견해 재설계** |

추가로 스스로 바로잡은 것 두 가지.

| 1차 보고 표현 | 실제 |
|---|---|
| "가짜 프로필 제거" | **화면 코드에서만 제거했다.** DB 행 3건은 그대로 남아 있었다 (현재는 3.1 의 사고로 삭제됨) |
| `security_invoker=true` 로 안전 | **새로 만든 `caregivers_public` 뷰에는 그 설정을 빼먹었고**, 그래서 익명 사용자가 뷰를 통해 기반 테이블 행을 삭제할 수 있었다 (3.1) |

운영 DB에 변경이 발생한 사실은 **프런트엔드 배포 여부와 분리해** 4절에 기록했다.

> **🔴 3.1 을 먼저 읽어 주세요.** 권한 시험 중 `caregivers` 3행이 실제로 삭제되었습니다. 실제 이용자 정보는 아니지만, 계획된 삭제가 아니었습니다.

## 1. 작업 환경

| 항목 | 확인 결과 |
|---|---|
| 저장소 | `github.com/soonryu74/soonryu74.github.io` |
| 배포 | GitHub Actions `jekyll.yml` → Jekyll → **`gh-pages` 브랜치** 발행 |
| 경로 | `/dolbom/`(모심), `/gyeotae/`(곁애). 정적 HTML, SPA 아님 |
| 미커밋 변경 | 작업 시작 시 0건 (사용자 변경 덮어쓴 것 없음) |

## 2. 집계 재검증 — 7,905와 3,672는 왜 다른가

> **이 절은 기관기호가 없던 시점의 분석이다.** 아래 「원자료 필드 조사」에서 **원본 파일을 확보해 기관기호를 되찾았으므로**, 이름 기준 집계·병합은 더 이상 쓰지 않는다. 기록으로 남긴다.

**동일 시점·동일 필터(`status='active'`)에서 재집계한 결과다.**

| 집계 | 그룹 키 | 값 | 원본과의 차이 |
|---|---|---|---|
| 전체 행 | — | 27,946 | — |
| 서로 다른 기관명 값 | `name` | 16,797 | — |
| 이름+서비스 | `name, type` | 20,041 | **7,905** |
| 이름+서비스+지역 (뷰 키) | `name, type, region, sigungu` | 24,274 | **3,672** |

**결론**: 두 수는 계산 오류가 아니라 **그룹 키가 다르다.**
차이 `7,905 − 3,672 = 4,233`행은 **이름·서비스는 같지만 지역이 다른 행**이다. 전국에 같은 상호를 쓰는 서로 다른 기관일 가능성이 높아, **지역을 키에 포함한 쪽(3,672)이 더 보수적**이다.

**두 수 모두 "같은 기관의 중복"이라고 부르지 않는다.** 기관기호가 없어 동일 기관 여부를 확정할 수 없기 때문이다.

### 동명 기관 문제 — 뷰 결함 발견 및 수정

뷰 키 그룹 중 **행 수 > 연도 수**인 그룹이 6개(총 15행) 있었다. 이는 연도 중복이 아니라 **같은 시·군·구의 서로 다른 기관**으로 보인다.

| 기관명 | 지역·연도 | 같은 그룹 안의 점수 |
|---|---|---|
| 사랑재가복지센터 | 인천 남동구 2024 | **미흡 45.52** / **우수 82.02** |
| 정향효마을 | 부산 사상구 2021 | 양호 79.85 / 최우수 91.20 |
| 참사랑노인복지센터 | 대구 서구 2023 | 미흡 65.55 / 양호 77.05 |
| 엘림사랑의집 | 경북 포항북구 2022 | 미흡 64.93 / 양호 73.59 |
| 북부성모요양원 | 서울 강북구 2021 | 양호 75.17 / 양호 77.42 |
| 횡성장기요양센터 | 강원 횡성군 2023 | 최우수 92.60 / 최우수 95.21 |

**초기 뷰는 `score desc`로 1건만 남겨, 낮은 등급 기관을 화면에서 지웠다.** 이용자가 "사랑재가복지센터 = 우수"로 오인할 수 있었다. 2차 지시서 §1.6이 경고한 상황이라 **뷰를 재설계**했다.

### 현재 뷰 정의 (`public.institutions_latest`)

```sql
-- 그룹 키: name, coalesce(type,''), coalesce(region,''), coalesce(sigungu,'')
-- 병합 규칙
--   grp_rows = grp_years → 연도만 다른 그룹 → 최신 eval_year 1건
--   grp_rows > grp_years → 동명 구분 불가 → 병합하지 않고 전부 노출, ambiguous=true
-- 정렬 우선순위: eval_year desc nulls last → score desc nulls last → id (동점 시 안정적)
-- NULL 정규화: type/region/sigungu → ''
-- security_invoker = true (기반 테이블 RLS 승계)
```

전체 SQL은 마이그레이션 `institutions_latest_no_unsafe_merge`에 있다.

| 지표 | 값 |
|---|---|
| 뷰 행 수 | **24,283** |
| ├ 최신 1건 선택 | 24,268 |
| └ 동명 구분 불가(전부 보존) | **15** |
| 평가연도 결측 | 0 |
| 기관명 결측 | 0 |

### 원자료 필드 조사 — **원본을 확보했고, 빠진 것은 우리 쪽이었다**

2차 지시서 §1-4("원자료에 기관기호·급여종류·평가일 필드가 있는지 공식 원천을 확인하고, 현재 DB로 가져오는 과정에서 빠졌는지 조사해. 활용 가능한 원본 확보부터 시도해")에 대한 답이다.

공공데이터포털 「[국민건강보험공단_장기요양기관 평가 결과](https://www.data.go.kr/data/15104801/fileData.do)」 **CSV 원본(파일 기준일 2026-06-25, 27,947행, CP949)** 을 직접 내려받아 대조했다.

| 원자료 컬럼 | 기존 운영 DB | 결론 |
|---|---|---|
| 연번 | 없음 | |
| **평가구분** (예: 2024년 정기평가) | **없음** | 적재 시 누락 |
| **장기요양기관기호** | **없음** | **적재 시 누락.** 27,947행 전부 값이 있고 결측 0 |
| 장기요양기관명 | `name` | |
| 급여종류 (`04.방문요양` 형태) | `type` (코드 없음) | 코드가 누락 |
| **설립주체** | **없음** | 적재 시 누락 |
| 관할시도명·관할시군구명 | `region`·`sigungu` | |
| **평가일자** (일 단위) | `eval_year` (연도만) | 일자가 누락 |
| 평가등급 (A~E) | `grade` (한글) | 한글로 변환되어 들어감 |
| 평가총점 | `score` | |
| 기관운영·환경및안전·수급자권리보장·급여제공과정·급여제공결과 | 5개 모두 존재 | |
| **기관운영(2025)·수급자존중(2025)·서비스제공(2025)·서비스결과(2025)** | **없음** | 2025년 개편 영역이 통째로 누락 |
| 주소·전화번호 | 없음 | **원자료에도 없다** (아래 참조) |

등급 분포가 원자료 A 6,172 / B 9,469 / C 6,105 / D 3,191 / E 3,008 과
기존 DB 최우수 6,172 / 우수 9,470 / 양호 6,105 / 보통 3,191 / 미흡 3,008 로 일치한다.
**기존 DB는 이 파일을 등급만 한글로 바꿔 적재한 것이고, 식별자와 날짜를 버린 것이다.**

#### 재적재 결과

| 대상 | 내용 |
|---|---|
| `public.institutions_raw` | 원자료 27,947행을 **가공 없이** 보존하는 staging 테이블. 기관기호 결측 0, 평가일자 결측 0, 평가일 2021-04-20 ~ 2025-11-28 |
| `public.institutions_eval_latest` | **기관기호 + 급여종류**마다 가장 최근 평가 1건. **24,486행 · 기관 21,216곳** |
| 적재 방법 | 일시적 쓰기 창구를 열고 PostgREST 로 적재한 뒤 **즉시 권한 회수**. 회수 후 익명 INSERT·SELECT 가 `401 42501` 로 거부되는 것을 재시험으로 확인 |
| 운영 테이블 영향 | `institutions` 는 **건드리지 않았다.** 기존 뷰 `institutions_latest` 도 그대로 둔다(라이브가 아직 사용 중) |

#### 이것으로 해결된 것

- **기관 수를 말할 수 있게 됐다.** 기관기호 기준 **21,216곳**. "기관명 값 16,797개"와 혼동할 일이 없다.
- **동명 기관 병합 위험이 사라졌다.** 이름이 아니라 기관기호로 구분하므로 서로 다른 기관이 합쳐질 수 없다.
  - 2.3절에서 찾은 사례 재확인: 인천 남동구 사랑재가복지센터는 `2-28200-00749`(우수 82.02)와 `3-28200-00653`(미흡 45.52) **두 기관**이다. 지금은 각각 표시되고 동명 경고가 붙는다.
  - 같은 시·군·구에 이름·급여종류까지 같은 다른 기관기호가 있는 경우는 **204건**이다. (이름 기준 뷰에서는 15행만 잡혔다 — 같은 해 평가끼리만 충돌을 감지했기 때문이다.)
- **평가 회차와 평가일을 구분할 수 있게 됐다.** 원자료 `평가구분`은 2021·2023·2024·2025년 정기평가 네 가지인데, **2021년 정기평가는 2021~2022년에 걸쳐 실시**되었다(2021년 1,140건 + 2022년 3,283건). 기존 화면의 "평가연도 2021~2025"는 평가일의 연도였고 회차와 달랐다. 지금은 둘 다 표시한다.
- **2025년 개편 영역을 제대로 표시한다.** 2025년 평가는 기관운영·수급자존중·서비스제공·서비스결과 4개, 그 이전은 5개다. 화면에 어느 체계인지 적고 없는 영역을 0점으로 채우지 않는다.

#### 주소·전화는 여전히 없다 — 다른 데이터셋이 필요하다 (§5-2)

평가 결과 파일에는 주소·전화번호가 **없다.** 공공데이터포털에서 확인한 대안:

| 데이터셋 | 형태 | 확인한 내용 |
|---|---|---|
| [국민건강보험공단_장기요양기관 검색 서비스](https://www.data.go.kr/data/15059029/openapi.do) | OpenAPI (REST/XML, 실시간, 무료, 이용허락범위 제한 없음) | 기관 주소·서비스 유형 제공. **응답 필드 명세는 포털 상세 페이지에 나열되어 있지 않아, 기관기호·전화번호 필드 유무를 확인하지 못했다** |
| [국민건강보험공단_장기요양기관 시설별 상세조회 서비스](https://www.data.go.kr/data/15058856/openapi.do) | OpenAPI (REST/XML, 실시간, 무료) | 시설별 상세 정보 |

**막힌 지점**: 두 OpenAPI 모두 **활용신청 후 발급받는 serviceKey** 가 있어야 호출할 수 있다. 이는 계정·키 발급이 필요한 운영 결정이므로 사용자 확인 항목이다(8절).
**지금 하지 않는 것**: 이름이 같다는 이유로 연락처를 붙이지 않는다. 기관기호로 확실히 연결된 것만 노출할 계획이다.
**현재 화면 안내**: 연락처는 노인장기요양보험에서 **기관기호로** 조회하도록 안내한다(기관기호를 카드에 표시하므로 정확히 찾을 수 있다).

## 3. 권한 — 설정이 아니라 실제 요청으로 시험

### 3.1 🔴 사고 보고 — 권한 시험 중 `caregivers` 3행이 삭제되었다

순서대로 적는다.

1. 4절의 `caregivers_public` 뷰를 만들 때 **`security_invoker` 를 지정하지 않았다.** 지정하지 않은 뷰는 PostgreSQL 기본값에 따라 **소유자(postgres) 권한으로 실행**되므로, 기반 테이블 `caregivers` 의 RLS 가 적용되지 않는다.
2. Supabase 는 `public` 스키마의 새 객체에 `anon`·`authenticated` 의 권한을 기본으로 부여한다. 내가 `grant select` 만 적었지만 **INSERT·UPDATE·DELETE 권한이 자동으로 함께 붙었다.**
3. 이 뷰는 단일 테이블·단순 컬럼 뷰라 PostgreSQL 이 **자동 갱신 가능(auto-updatable)** 으로 판정한다. 따라서 `DELETE /rest/v1/caregivers_public` 요청이 그대로 기반 테이블의 DELETE 로 내려갔다.
4. 지시서 2절("`security_invoker=true` 라는 설정만으로 '안전'이라고 판정하지 마")에 따라 **익명 UPDATE/DELETE 를 실제로 시험**하던 중, `caregivers_public` 에 대한 익명 DELETE 가 `HTTP 204` 로 성공했고 **`caregivers` 의 3행이 모두 삭제되었다.**

삭제된 행은 1차 작업에서 "가짜 프로필"로 지적한 **seed 3인**이다.

| id | 이름 | verified | premium |
|---|---|---|---|
| `02d3308e-…bceb3` | 박순자 요양보호사 | true | true |
| `57346b10-…8bf85` | 이영호 간병인 | true | false |
| `baafb2ee-…3f54a6` | 최미경 간호조무사 | false | false |

- **실제 이용자 정보 손실은 없다.** 세 행은 개발 중 넣은 예시 인물이며, 근거 없는 `verified=true` 때문에 P0-01 에서 제거 대상으로 지정한 데이터다. 운영 중 등록된 실제 구직자는 없었다(`waitlist` 0행, 사이트 미공개 홍보).
- **그러나 계획된 삭제가 아니었다.** 결함 때문에 일어난 삭제다. 1차 보고의 "가짜 프로필 제거"는 **화면 코드에서만 제거한 것**이었고 DB 행은 남아 있었다는 사실도 함께 바로잡는다.
- 백업 복구는 하지 않았다. 세 행은 어차피 제거 대상이었고, 복구하면 다시 지워야 한다.

**교정 조치** (마이그레이션 `harden_view_and_anon_grants`):

```sql
alter view public.caregivers_public set (security_invoker = true);
revoke insert, update, delete, truncate, references, trigger
  on public.caregivers_public from anon, authenticated;
revoke insert, update, delete, truncate, references, trigger
  on public.institutions_latest from anon, authenticated;
revoke update, delete, truncate, references, trigger on public.caregivers from anon, authenticated;
revoke update, delete, truncate, references, trigger on public.waitlist   from anon, authenticated;
revoke insert, update, delete, truncate, references, trigger on public.institutions from anon, authenticated;
```

**교훈**: 뷰를 만들 때 `security_invoker` 를 **명시**하고, `grant` 를 적는 것만으로는 부족하며 **불필요한 권한을 명시적으로 `revoke`** 해야 한다. 그리고 권한은 선언이 아니라 **실제 요청으로 확인해야 한다** — 이 결함은 설정을 읽어보는 방식으로는 드러나지 않았고, 실제 DELETE 를 보냈기 때문에 드러났다.

### 3.2 교정 후 권한 실측 (브라우저와 동일한 익명 REST 요청)

공개 키(publishable)만 사용했다. service role key 는 쓰지 않았다.

| 대상 | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `caregivers_public` (뷰) | 200 · 공개열만 | **401 42501** | **401 42501** | **401 42501** |
| `institutions_latest` (뷰) | 206 · 24,283행 | 400 (컬럼 없음) | **500 55000** 갱신 불가 | **500 55000** 갱신 불가 |
| `caregivers` (기반) | 200 · 0행 | 201 (정책 통과 시) | **401 42501** | **401 42501** |
| `waitlist` (기반) | **200 · 0행** (RLS 차단) | 201 | **401 42501** | **401 42501** |
| `institutions` (기반) | 206 · 27,946행 | **401 42501** | **401 42501** | **401 42501** |

- `42501` = permission denied. **RLS 로 행이 걸러진 것이 아니라 권한 자체가 없다.** 교정 전에는 같은 요청이 `204`(성공) 또는 "영향행 0"으로 통과했다.
- `institutions` 27,946행 · `institutions_latest` 24,283행 — 사고 후에도 **기관 데이터는 그대로다**.
- `waitlist` SELECT 가 `200 []` 인 것은 RLS 가 모든 행을 걸러낸 결과다. 권한 거부와 구분해 기록한다.

### 3.3 등록 입력값 검증 — 클라이언트를 신뢰하지 않는다 (T11)

기존 정책에 틈이 있었다. `array_length(types,1) IS DISTINCT FROM 0` 은 빈 배열에서 `array_length` 가 `NULL` 이므로 **참**이 되어, 돌봄 형태를 하나도 고르지 않은 행이 통과했다. 기존 정책을 지우지 않고 `RESTRICTIVE` 정책을 **추가**해 막았다(`caregivers_insert_restrictive_guard`). RESTRICTIVE 는 기존 정책과 AND 로 결합된다.

| 시험 | 요청 | 결과 |
|---|---|---|
| T11a | `verified=true` 로 등록 | **401** RLS 위반 |
| T11b | `premium=true` 로 등록 | **401** RLS 위반 |
| T11c | `status='hidden'` 으로 등록 | **401** RLS 위반 |
| G01 | 돌봄 형태 빈 배열 | **401** `insert guard` 위반 |
| G02 | 이름이 공백뿐 | **401** `insert guard` 위반 |
| G03 | 공개 체크했는데 연락처 비움 | **401** `insert guard` 위반 |
| G04 | 소개글 600자 | **401** `insert guard` 위반 |

**미검증**: 로그인 사용자·타인 계정·기관 담당자 역할. 인증 체계가 아직 없어 수행하지 못했다.

### 3.4 중복접수 방지 실측 (T10 서버 측)

운영 테이블을 건드리지 않기 위해, `waitlist` 와 **같은 모양의 유니크 인덱스**를 가진 임시 복제 테이블(`selftest_idem`)을 만들어 브라우저와 동일한 익명 REST 요청으로 시험했다.

| 시험 | 결과 |
|---|---|
| 최초 접수 | **201** |
| 같은 `client_token` 재시도 (응답 유실 후 재시도) | **409 · 23505** `…client_token_uniq` |
| 새 `client_token`·같은 연락처 (대문자) | **409 · 23505** `…contact_uniq` |
| `010-1234-5678` 접수 후 `01012345678` 접수 | **409 · 23505** — 서식이 달라도 같은 번호로 판정 |
| 다른 연락처 | **201** |

프런트엔드는 `error.code === '23505'` 를 **오류가 아니라 "이미 접수되었습니다"** 로 안내한다. 즉 새로고침·복수 탭·네트워크 지연 후 재시도에서 중복 행이 생기지 않는다.

## 4. 운영 DB 변경 — 프런트엔드 배포와 분리해 보고

> **프런트엔드는 배포하지 않았다. 그러나 DB 변경은 발생했다.**

| 항목 | 내용 |
|---|---|
| 환경 | **운영 프로젝트** (현재 라이브 사이트가 쓰는 Supabase 프로젝트와 동일) |
| 변경 시점 | 2026-10-04 |
| 생성 객체 | `public.institutions_latest` (뷰). 마이그레이션 2건: `institutions_latest_eval_view` → `institutions_latest_no_unsafe_merge` |
| 권한 | `grant select ... to anon, authenticated`, `security_invoker = true` |
| 기존 조회 영향 | **없음.** 기반 테이블 `institutions`는 변경하지 않았고 기존 쿼리는 그대로 동작한다 |
| 데이터 변경 | **없음.** DROP/TRUNCATE/UPDATE/RLS 해제 없음. 추가(뷰 생성)만 수행 |
| 롤백 | `drop view public.institutions_latest;` — 기반 테이블 영향 없음. 단, 현재 `gigwan.html`이 이 뷰를 조회하므로 **삭제 전 프런트엔드를 원복해야 한다** |
| 승인 | 기존 세션의 DB 작업 승인 범위 안에서 수행. **추가 운영 변경은 준비 후 승인받고 진행할 것** |

### 4.1 이후 적용한 마이그레이션 (모두 운영 프로젝트, 2026-10-04)

| 순서 | 마이그레이션 | 내용 | 되돌리는 방법 |
|---|---|---|---|
| 1 | `waitlist_idempotency_and_caregivers_public_view` | `waitlist.client_token` 추가 + 부분 유니크 인덱스, 정규화 연락처 유니크 인덱스, `caregivers.contact_public`·`consent_version` 추가, `caregivers_public` 뷰 생성 | `drop index …_uniq; alter table … drop column …; drop view public.caregivers_public;` |
| 2 | `waitlist_consent_version` | `waitlist.consent_version` 추가 | `alter table public.waitlist drop column consent_version;` |
| 3 | `caregivers_client_token_idempotency` | `caregivers.client_token` 추가 + 부분 유니크 인덱스 | `drop index public.caregivers_client_token_uniq; alter table public.caregivers drop column client_token;` |
| 4 | `selftest_idem_clone_create` / `…_lockdown` | 중복접수 제약 시험용 **임시 복제 테이블**. 시험 후 익명 권한 전부 회수 | `drop table public.selftest_idem;` — **승인 대기 중** |
| 5 | `harden_view_and_anon_grants` | 3.1 의 교정 조치 | 3.1 의 주석 참조 |
| 6 | `caregivers_insert_restrictive_guard` | 등록 입력값 RESTRICTIVE 정책 추가 | `drop policy "insert guard" on public.caregivers;` |
| 7 | `institutions_staging_create` | `institutions_raw` staging 테이블 생성 (원자료 보존) | `drop table public.institutions_raw cascade;` |
| 8 | `institutions_raw_open_load_window` / `…_close_load_window` | 적재용 일시 쓰기 창구 개방 → **즉시 회수**. 차단 재확인함 | 남은 정책 정리: `drop policy "load window" on public.institutions_raw;` (권한은 이미 회수되어 무해) |
| 9 | `institutions_eval_latest_by_symbol` | `institutions_eval` 뷰(security_invoker). 기관기호+급여종류별 최신 1건 | `drop view public.institutions_eval;` |
| 10 | `institutions_eval_latest_table` | `institutions_eval_latest` 테이블로 굳힘 (뷰는 질의마다 2.8만 행 재계산 → statement timeout) | `drop table public.institutions_eval_latest;` |

- **데이터 변경**: 3.1 의 의도치 않은 3행 삭제, T11d 시험으로 생긴 **테스트 행 1건**(`name='T'`), 그리고 **공공데이터 27,947행의 신규 적재**(`institutions_raw`). 적재는 공개 공공데이터이며 운영 테이블을 건드리지 않았다.
- **스키마 변경 방식**: 모두 **추가(add column / create index / create policy)** 다. 기존 열·정책을 지우지 않았다. 기존 정책의 틈은 DROP 대신 RESTRICTIVE 정책 추가로 막았다.
- **배포 시 함께 해야 할 작업**: `gujik.html` 의 새 버전이 `gh-pages` 에 올라간 뒤에야 기반 테이블의 공개 읽기를 닫을 수 있다. 지금 닫으면 라이브 페이지가 깨진다.
  ```sql
  -- gujik.html 배포 확인 후 실행
  revoke select on public.caregivers from anon;
  drop policy "public read active" on public.caregivers;
  ```

## 5. 요구사항별 상태

| 항목 | 상태 | 근거 |
|---|---|---|
| **P0-01** 예시 데이터·인증 표시 | ✅ 완료 | seed 3인 표시 경로 제거 **+ DB 행도 현재 0건**(3.1 — 계획된 삭제가 아니라 결함으로 삭제됨), 실패 시 오류·재시도·공식 대안, 근거 없는 '인증' 배지 제거, '프리미엄 · 광고' 표기, "본인 입력" 고지 |
| **P0-02** 의료·일상돌봄 분리 | ✅ 완료 | `gujik` 의료행위 칩 제거 + 면허 제공기관 안내. `gajok` 의료 선택 시 구직 링크 **전 조합(24가지) 0건** 테스트 통과 |
| **P0-03** 추천 조건·제도 안내 | 🔶 부분 | 규칙을 `care-rules.js`로 분리, '잘 모르겠어요'·'지속 예상' 추가, 6개월 오해 문구 교정, 본인부담 면제/감경/비급여 구분. **129 운영시간은 2차 출처 기반 — 공식 재확인 미완** |
| **P0-04** 기관 평가자료·건수 | ✅ 완료 | **원본 CSV 를 확보해 기관기호를 되찾았다.** 기관 21,216곳 / 최신 평가 24,486건, 동명 기관은 기관기호로 구분되고 204건에 경고 표시. 평가 회차·평가일자·설립주체 표시, 2025 개편 4개 영역 매핑 완료. **주소·전화는 여전히 미해결**(OpenAPI serviceKey 필요 — 8절) |
| **P0-05** 접수·개인정보 | ✅ 완료 | 서버 측 중복 방지 실측(3.4), 공개열 분리 뷰 + 연락처 공개 **선택제**(기본 비공개), 동의 버전 기록 필드, 권한 최소화(3.2), 등록 입력값 서버 검증(3.3), localStorage 개인정보 저장 중단. **운영 주체·보유기간·문의처가 비면 곁애 온라인 접수는 열리지 않는다** |
| **§5-1 지역 창구** | 🔶 부분 | 지자체 공식 페이지에서 **5개 지역 직접 확인**(부천·부평·원주·광산·서울 전역), 출처·확인일 저장. 나머지는 보건복지부 전담조직 연락망으로 안내. **229개 전부는 미확인** |
| **§5-2 기관 주소·전화** | 🔶 부분 | 원천 조사 완료. OpenAPI 2종의 응답 필드·엔드포인트·호출 제한·기관기호 변환(13자→11자) 확인. **serviceKey 발급이 필요해 연결 미완** (`institution-contact-api-setup.md`) |
| **§5-4 교육관** | ✅ 완료 | `gyoyuk.html` 신설. 4개 직종 × 자격취득·보수교육·훈련과정, 공식 기관 4곳 확인. **모집 일정·교육비는 싣지 않음** |
| **§6 접근성** | ✅ 완료 | 44px 터치 영역, `<label for>` 26건 연결, 도움 버튼 이름 유지, 200% 확대 가로 스크롤 7개 페이지 모두 없음 |
| **§6 가짜 후기·과장 문구** | ✅ 완료 | 지어낸 후기 5건·별점 삭제, '검증을 거친'·'인증 뱃지 판매'·'일감과 연결' 등 교정, 곁애 랜딩을 '준비 중'으로 수정 |
| **§5-3 채용 기능** | 🔶 부분 | `gyeotae/ilja.html` 신설(탐색·조건검색·빈 상태·공식 경로). 데이터·권한 구조를 격리 환경에서 검증. **운영 미적용**, 공고 공급 없음, 기관 등록·검토 화면 미구현 |
| **§5-5 확인 절차 운영안** | 🔶 부분 | `verification-policy.md` + 상태·이력·제약 구조 검증 완료. **담당자 미정이라 운영 전**, 신청·검토 화면 미구현 |
| **§7-6 키보드·오류 읽기** | ✅ 완료 | 칩 43개를 키보드 조작 가능하게 교체, alert → role="alert", aria-live 5곳, 과업 4종 키보드 완주 |
| **§6 모심 가족 홈 재배치** | 🔶 부분 | 홈 → 설문 → 지역 창구 흐름은 연결됨(설문 결과가 `jiyeok.html` 로 보내고 그곳에 실제 연락처가 있음). 홈 레이아웃 재배치는 하지 않음 |

## 6. 테스트

| ID | 내용 | 결과 |
|---|---|---|
| T01 | 65세 미만·단기 회복·노인성 질병 없음 | ✅ **통과** (자동 3건) |
| T02 | 고령·지속·등급 없음 → 등급/통합돌봄 구분 | ✅ **통과** (자동 4건) |
| T03 | 방문간호 → 제공기관 안내 | ✅ **통과** (자동 4건, 전 조합 포함) |
| T04 | 잘 모르겠어요 → 빈 결과 없음 | ✅ **통과** (자동 4건) |
| T06 | 동일 기관·서비스 복수 연도 | ✅ **통과** — 행 수가 아니라 사례로 검증. 동명 그룹 보존·낮은 등급 복원 확인 |
| T08 | 평가영역 개편·결측 | ✅ **통과** — 2025 `s_env` '자료 없음' 표시, 0점 미사용 |
| T09 | 데이터 요청 실패 | ✅ **통과** (코드 경로) — 데모 대신 오류·재시도 |
| T18 | localStorage 점검 | ✅ **통과** — 개인정보 저장 경로 제거 |
| T10 | 접수 실패·연속 클릭·재시도 | ✅ **통과** — 화면 차단 + **서버 측 유니크 제약 실측**(3.4). 같은 토큰·같은 연락처(서식 달라도) 모두 409/23505 |
| T11 | 클라이언트가 `verified`/`premium` 을 보냄 | ✅ **통과** — 3.3. 입력값 검증 4건 추가 통과 |
| T06 (재검증) | 기관 식별·동명 구분 | ✅ **통과** — 기관기호 기준으로 재구축. 인천 남동구 사랑재가복지센터 두 기관이 각각 표시되고 경고가 붙는 것을 실제 화면에서 확인 |
| T08 (재검증) | 2025 평가영역 개편 | ✅ **통과** — 2025년은 4개 영역(기관운영·수급자존중·서비스제공·서비스결과), 이전은 5개 영역으로 분리 표시. 카드에 어느 체계인지 명시 |
| 접근성 | 44px·라벨·확대 | ✅ **통과** — `tests/a11y.js`, `tests/zoom.js`. 남은 44px 미달은 모두 문장 안 링크(WCAG 2.5.8 예외) |
| 화면 통합 | 기관 검색 실제 데이터 | ✅ **통과** — `tests/gigwan-integration.js`. JS 오류 0, 24,486건 조회, 필터·동명 경고 동작 |
| T05, T07, T12~T17, T19, T20 | — | ❌ **미실행** |

- 자동 테스트
  - `tests/care-rules.test.js` — **15개 단언 전부 통과**
  - `tests/privacy-config.test.js` — **19개 단언 전부 통과** (운영 정보 미확정 시 임의 고지를 만들지 않는지 포함)
- 수정 파일 인라인 JS 문법 검증 전부 통과
- **실기기 모바일·화면낭독기 테스트는 수행하지 않았다.** 자동 점검으로 대신했다.
- 화면 캡처 16장: `docs/care-platform/screens/` (설명은 그 폴더의 README 참조)
- 헤드리스 Chromium 이 이 작업 환경의 프록시 CA 를 신뢰하지 않아 브라우저에서 HTTPS 가 끊긴다.
  **TLS 검증을 끄지 않고**, CDN 스크립트는 미리 받은 사본으로, Supabase 호출은 Node 의 fetch 로
  중계해 **실제 운영 데이터로** 화면을 검증했다.

## 7. 변경 파일

| 파일 | 변경 |
|---|---|
| `dolbom/gigwan.html` | 건수·연도 정정, 기관 수 표기 철회, 동명 경고, 2025 결측 구분, 뷰 연결, 기본 등급필터 해제, 오류 재시도 |
| `dolbom/gujik.html` | seed 제거, 실패 상태, 의료행위 칩 제거, 배지 정리, localStorage 정리, **`caregivers_public` 뷰로 전환**, **연락처 공개 선택 체크박스**, 개인정보 안내 블록, `client_token` 중복 방지 |
| `dolbom/assets/privacy-config.js` | **신규** — 운영 주체·보유기간·문의처를 운영자가 채우는 설정. 비어 있으면 '확정되지 않았습니다' 안내만 표시하고 임의 고지를 만들지 않는다 |
| `gyeotae/index.html` | `client_token` 중복 방지, `23505`→"이미 접수되었습니다", 개인정보 동의 체크박스·동의 버전, **운영 정보 미확정 시 서버 접수 비활성**(메일 접수만) |
| `tests/privacy-config.test.js` | **신규** — 운영 정보 미확정 판정·이스케이프 검증 19건 |
| `dolbom/gajok.html` | '잘 모르겠어요'·'지속 예상' 추가, 추천 로직을 규칙 모듈 호출로 교체, 허위 '인증 요양기관' 광고문구 제거 |
| `dolbom/assets/care-rules.js` | **신규** — 조건·결과·예외·출처·기준일 분리, 순수 함수 |
| `tests/care-rules.test.js` | **신규** — T01~T04 자동 검증 |
| `dolbom/gigwan.html` (2차) | `institutions_eval_latest` 로 전환, 기관기호·평가일자·평가구분·설립주체 표시, 급여종류 9종 필터, 기관 수 21,216곳 명시 |
| `dolbom/jiyeok.html` | 직접 확인한 지역 창구 블록, 미확인 지역의 공식 조회 경로, 129 운영시간 교정 |
| `dolbom/assets/region-contacts.js` | **신규** — 지자체 공식 페이지에서 확인한 창구 5곳 + 전국 공통 창구. 출처·확인일 |
| `dolbom/gyoyuk.html`, `dolbom/assets/education-paths.js` | **신규** — 교육·자격 안내. 공식 기관 4곳 |
| `dolbom/index.html`, `about.html`, `partner.html`, `jaryo.html` | 가짜 후기 삭제, 과장 문구 교정, 메뉴에 교육·자격 추가 |
| `dolbom/assets/style.css`, `app.js` | 접근성 보강(44px, 좁은 화면, 도움 버튼 이름 유지) |
| `tests/` | `privacy-config.test.js`, `a11y.js`, `zoom.js`, `shot.js`, `gigwan-integration.js` |
| `docs/care-platform/screens/` | 화면 캡처 16장 + README |
| Supabase | 마이그레이션 10건 (4.1절 참조). 공공데이터 27,947행 신규 적재 |

## 8. 사용자 확인이 필요한 운영 결정

구현으로 해결할 수 없는 항목만 남긴다. 나머지는 계속 진행한다.

1. 운영 주체의 **법적 명칭**과 공개할 **문의처**
2. 개인정보 **보유·파기 기준**
   - 위 1·2 는 **코드에서 채울 자리를 이미 만들어 두었다.** `dolbom/assets/privacy-config.js` 의 `window.PRIVACY` 네 값(`version`, `운영주체`, `보유기간`, `문의처`)과 `gyeotae/index.html` 의 `WAITLIST_POLICY` 네 값을 채우면 안내문이 자동으로 완성되고, 곁애 온라인 접수가 열린다. 비어 있는 동안에는 임의의 사업자 정보를 만들지 않고 "확정되지 않았습니다"로 표시한다.
3. 자격·기관정보 **검토 담당자**와 최종 운영 절차
4. 제휴·채용공고 **제공 기관 및 계약 권한**
4-1. **공공데이터포털 OpenAPI serviceKey 발급** — 기관 주소·전화를 붙이려면 「장기요양기관 검색 서비스」·「시설별 상세조회 서비스」 활용신청이 필요하다. 키는 **서버 측에만** 두고 공개 저장소에 넣지 않는다. (이전에 쓰던 키가 있다면 재발급을 권한다)
5. 추가 **운영 DB 변경·개인정보 이관·배포 승인**

### 승인했으나 도구가 막아 실행되지 않은 것 (2026-10-05)

사용자가 대화로 승인했으나, **도구 단계의 승인 창에서 계속 막혀** 실행되지 않았다. 우회하지 않았다.
정확한 기본키·사전확인·복구안은 `cleanup-plan-20261004.md` 에 있다.

| 작업 | 상태 |
|---|---|
| `revoke execute on function public.import_eval_chunk(text)` | ✅ **적용됨.** 익명 RPC 호출이 401 로 거부됨을 확인 |
| `drop function public.import_eval_chunk(text)` | ❌ 막힘 |
| `delete from public.caregivers where id = '73de6033-…'` | ❌ 막힘 |
| `drop table public.selftest_idem` | ❌ 막힘 |
| `delete from public.institutions_raw where id = 1 and source_file = 'probe'` | ❌ 막힘 |

위 네 가지를 사전확인 조건을 건 **하나의 트랜잭션**으로 묶어 준비해 두었다. 조건이 하나라도 어긋나면 전체가 취소된다.

### 배포 시 함께 해야 할 1건

`gujik.html` 새 버전이 `gh-pages` 에 반영된 것을 확인한 **뒤에** 실행한다. 지금 실행하면 라이브 페이지가 깨진다.

```sql
-- gujik.html 배포 확인 후
revoke select on public.caregivers from anon;
drop policy "public read active" on public.caregivers;

-- gigwan.html 배포 확인 후 (라이브가 아직 옛 뷰를 조회 중)
drop view public.institutions_latest;
-- institutions 테이블(옛 적재본)의 처리 방침은 사용자 결정 사항
```
