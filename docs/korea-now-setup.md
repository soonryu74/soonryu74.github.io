# Korea Now — 셋업 가이드 (왕초보용)

> 앱 위치: `korea-now/` · 배포 주소: https://soonryu74.github.io/korea-now/
> 서버(Supabase)와 공공 API 키가 **없어도** 화면은 뜹니다(데모 곡선). 키를 넣으면 서울 실시간 혼잡도로 바뀝니다.

## 1. 내 컴퓨터에서 실행해 보기

Node.js 22 이상이 필요합니다. (https://nodejs.org 에서 LTS 설치)

| 단계 | Windows (PowerShell) | macOS (터미널) |
| --- | --- | --- |
| 저장소 받기 | `git clone https://github.com/soonryu74/soonryu74.github.io.git` | 동일 |
| 앱 폴더로 이동 | `cd soonryu74.github.io\korea-now` | `cd soonryu74.github.io/korea-now` |
| 필요한 부품 설치 | `npm install` | `npm install` |
| 개발 서버 켜기 | `npm run dev` | `npm run dev` |
| 브라우저에서 열기 | http://localhost:5173/korea-now/ | 동일 |
| 배포용 빌드 | `npm run build` | `npm run build` |
| 환경변수 파일 만들기 | `Copy-Item .env.example .env` | `cp .env.example .env` |

> 비유: `npm install`은 "레고 부품 상자 받기", `npm run dev`는 "조립한 걸 내 방에서 켜 보기"입니다.

`.env` 파일에 아래 두 줄을 채우면 실시간 모드가 됩니다(3번에서 얻는 값).

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
```

## 2. 공공 API 키 발급 (무료)

### 2-1. 서울시 실시간 도시데이터 (혼잡도) — 서울 열린데이터광장
1. https://data.seoul.go.kr 회원가입 → 로그인
2. 상단 메뉴 **[인증키 신청]** → 사용 URL에 `https://soonryu74.github.io` 입력 → 신청
3. 발급된 인증키(영문+숫자 32자)를 복사해 둡니다. 즉시 사용 가능.
4. 이 키는 **브라우저에 넣지 않습니다.** Supabase 시크릿 `SEOUL_API_KEY`에만 넣습니다(3-3 참고).

### 2-2. 한국관광공사 TourAPI (영문 관광정보) — 공공데이터포털
1. https://www.data.go.kr 회원가입 → 로그인
2. 검색창에 **"한국관광공사_영문 관광정보 서비스"** 검색 → 활용신청
3. 승인되면 마이페이지 → 인증키 **Decoding(디코딩) 값**을 복사
4. Supabase 시크릿 `TOUR_API_KEY`에 넣습니다.
5. 기본 트래픽: 개발계정 하루 1,000건. 앱은 응답을 24시간 캐시하므로 충분합니다.
6. 같은 계정으로 **"한국관광공사_관광지 집중률 방문자 추이 예측 정보"**(전국 30일 붐빔 예측)도 활용신청해 두면 `tour-congestion` 함수가 같은 키로 동작합니다.

### 2-3. 한국수출입은행 환율 — 선택
1. https://www.koreaexim.go.kr/ir/HPHKIR019M01 에서 인증키 발급(회원가입 필요)
2. Supabase 시크릿 `KOREAEXIM_API_KEY`에 넣습니다. 하루 1,000건 제한, 앱은 하루 1회만 호출.

## 3. Supabase 연결

### 3-1. 프로젝트 만들기
- https://supabase.com/dashboard → **New project** → 이름 `korea-now`, Region **Northeast Asia (Seoul)**
- 무료 플랜은 **활성 프로젝트 2개까지**입니다. 이미 2개가 켜져 있으면 안 쓰는 프로젝트를 **Pause** 하거나 유료 플랜이 필요합니다.

### 3-2. 스키마 넣기
- Dashboard → **SQL Editor** → `supabase/migrations/0001_init.sql` 내용을 붙여넣고 **Run**

### 3-3. 시크릿(비밀 키) 등록
- Dashboard → **Edge Functions → Secrets** 에 아래 3개 추가

| 이름 | 값 |
| --- | --- |
| `SEOUL_API_KEY` | 2-1에서 받은 키 |
| `TOUR_API_KEY` | 2-2 디코딩 키 |
| `KOREAEXIM_API_KEY` | 2-3 키 (선택) |

### 3-4. Edge Function 배포 (Supabase CLI)

| 단계 | Windows (PowerShell) | macOS (터미널) |
| --- | --- | --- |
| CLI 설치 | `scoop install supabase` (scoop 없으면 https://scoop.sh 먼저) | `brew install supabase/tap/supabase` |
| 로그인 | `supabase login` | `supabase login` |
| 프로젝트 연결 | `supabase link --project-ref <프로젝트ref>` | 동일 |
| 함수 4개 배포 | `supabase functions deploy seoul-congestion --no-verify-jwt`<br>`supabase functions deploy fx-rate --no-verify-jwt`<br>`supabase functions deploy tour-search --no-verify-jwt`<br>`supabase functions deploy tour-congestion --no-verify-jwt` | 동일 |

> 프로젝트 ref는 Dashboard 주소 `https://supabase.com/dashboard/project/<여기>` 부분입니다.
> 저장소 루트(`soonryu74.github.io/`)에서 실행합니다. `supabase/` 폴더를 자동으로 찾습니다.

### 3-5. 앱에 URL과 공개 키 넣기
- Dashboard → **Project Settings → API** 에서 `Project URL`, `Publishable key(sb_publishable_…)` 복사
- 로컬: `korea-now/.env`에 입력
- 배포: GitHub 저장소 → **Settings → Secrets and variables → Actions** 에 아래 2개 등록

| Secret 이름 | 값 |
| --- | --- |
| `KOREA_NOW_SUPABASE_URL` | Project URL |
| `KOREA_NOW_SUPABASE_ANON_KEY` | Publishable key |

이후 `main` 브랜치에 push 하면 `jekyll.yml` 워크플로가 앱을 빌드해 `/korea-now/`에 올립니다.

## 4. 동작 확인
- 앱 상단 배지가 **● LIVE**면 실시간 모드, **◐ DEMO**면 키 없이 동작 중
- 서울 스팟 상세 화면 하단에 "Live from Seoul city data, HH:MM KST"가 보이면 성공
- 실패 시 브라우저 개발자도구(F12) Console에 `[korea-now] live congestion unavailable` 메시지와 원인이 찍힙니다

## 5. 데이터 관리
- 관광지 목록·입장료: `korea-now/src/data/spots.ts` (분기마다 `feeCheckedAt` 갱신)
- 한국어 한마디·매너 팁: `korea-now/src/data/phrases.ts`
- 서울 실시간 지역명(`seoulArea`)은 서울시 API의 AREA_NM과 **글자까지 똑같아야** 합니다. 목록은 `docs/korea-now-api.md` 참고.
