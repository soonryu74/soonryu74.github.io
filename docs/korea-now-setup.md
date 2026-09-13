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

> **2026-09-06 현재 상태**: 프로젝트 `korea-now`(ref `dxhmprqfgigljgbstqrg`) 생성, 스키마 적용, Edge Function 4개 배포, 앱에 URL·공개키 연결까지 완료. **남은 건 3-3 시크릿 등록뿐.**

### 3-1. 프로젝트 만들기 — 완료
- https://supabase.com/dashboard/project/dxhmprqfgigljgbstqrg
- 무료 플랜 활성 2개 한도 때문에 `artselah`를 일시정지했습니다. 다시 켜려면 그 프로젝트 → Restore.

### 3-2. 스키마 넣기 — 완료
- 새 프로젝트를 다시 만들 때만: **SQL Editor** → `supabase/migrations/0001_init.sql` 붙여넣고 **Run**

### 3-3. 시크릿(비밀 키) 등록
> **2026-09-09 현재**: `SEOUL_API_KEY`, `TOUR_API_KEY`는 `app_secrets` 테이블에 저장 완료(함수는 환경변수 → 테이블 순으로 읽음). 남은 것: `SEOUL_SUBWAY_API_KEY`(지하철), `KOREAEXIM_API_KEY`(환율, 선택). 테이블에 넣으려면 SQL Editor에서
> `insert into app_secrets(name,value) values('SEOUL_SUBWAY_API_KEY','키') on conflict(name) do update set value=excluded.value;`
> 또, 관광지 30일 예측(`tour-congestion`)은 data.go.kr에서 **「한국관광공사_관광지 집중률 방문자 추이 예측 정보」 활용신청**이 추가로 필요합니다(같은 키로 동작, 현재 "등록되지 않은 서비스키" 응답).

- Dashboard → **Edge Functions → Secrets** 에 아래 추가 (테이블 대신 여기 넣어도 됨)

| 이름 | 값 |
| --- | --- |
| `SEOUL_API_KEY` | 2-1에서 받은 키 |
| `TOUR_API_KEY` | 2-2 디코딩 키 |
| `KOREAEXIM_API_KEY` | 2-3 키 (선택) |
| `SEOUL_SUBWAY_API_KEY` | 서울 열린데이터광장 **지하철 실시간 도착정보** 인증키 (일반 인증키와 별도 발급) |

### 3-4. Edge Function 배포 (Supabase CLI) — 완료 (코드를 고쳤을 때만 다시)

| 단계 | Windows (PowerShell) | macOS (터미널) |
| --- | --- | --- |
| CLI 설치 | `scoop install supabase` (scoop 없으면 https://scoop.sh 먼저) | `brew install supabase/tap/supabase` |
| 로그인 | `supabase login` | `supabase login` |
| 프로젝트 연결 | `supabase link --project-ref <프로젝트ref>` | 동일 |
| 함수 4개 배포 | `supabase functions deploy seoul-congestion --no-verify-jwt`<br>`supabase functions deploy fx-rate --no-verify-jwt`<br>`supabase functions deploy tour-search --no-verify-jwt`<br>`supabase functions deploy tour-congestion --no-verify-jwt` | 동일 |

> 프로젝트 ref는 Dashboard 주소 `https://supabase.com/dashboard/project/<여기>` 부분입니다.
> 저장소 루트(`soonryu74.github.io/`)에서 실행합니다. `supabase/` 폴더를 자동으로 찾습니다.

### 3-5. 앱에 URL과 공개 키 넣기 — 완료
- `korea-now/.env.production`에 들어 있습니다(공개용 키라 저장소에 있어도 됨). 로컬 개발은 `.env`에 같은 값을 복사.
- 프로젝트를 바꾸면 이 파일만 고치면 됩니다. GitHub Secrets(`KOREA_NOW_SUPABASE_URL`, `KOREA_NOW_SUPABASE_ANON_KEY`)를 등록하면 그것이 우선합니다.
- `main` 브랜치에 push 하면 `jekyll.yml` 워크플로가 앱을 빌드해 `/korea-now/`에 올립니다.

## 3-6. 홈화면에 앱 설치 (PWA)
- 배포 주소를 폰 브라우저로 열면 "홈 화면에 추가"가 뜹니다(안드로이드 Chrome은 자동 배너, 아이폰 Safari는 공유 → 홈 화면에 추가).
- 한 번 열어 두면 지하철 등 오프라인에서도 목록·요금·휴관일이 뜨고, 본 적 있는 지도 타일은 30일간 남습니다.
- 코드를 바꿔 다시 배포하면 앱이 다음 실행 때 자동 갱신됩니다(`registerType: autoUpdate`).

## 4. 동작 확인
- 앱 상단 배지가 **● LIVE**면 실시간 모드, **◐ DEMO**면 키 없이 동작 중
- 서울 스팟 상세 화면 하단에 "Live from Seoul city data, HH:MM KST"가 보이면 성공
- 실패 시 브라우저 개발자도구(F12) Console에 `[korea-now] live congestion unavailable` 메시지와 원인이 찍힙니다

## 5. 데이터 관리
- 관광지 목록·입장료: `korea-now/src/data/spots.ts` (분기마다 `feeCheckedAt` 갱신)
- 한국어 한마디·매너 팁: `korea-now/src/data/phrases.ts`
- 서울 실시간 지역명(`seoulArea`)은 서울시 API의 AREA_NM과 **글자까지 똑같아야** 합니다. 목록은 `docs/korea-now-api.md` 참고.

---

# 독립 도메인으로 옮기기

지금 앱 주소는 `https://soonryu74.github.io/korea-now/` 다. 여기엔 `soonryu74` 가 들어간다.
`https://korea-now.com/` 처럼 바꾸려면 아래 순서로 한다.

## 0. 먼저 알아둘 것

- **`korea.now` 는 살 수 없다.** ICANN 규정상 국가 이름(korea, japan …)은 모든 신규 도메인에서
  등록이 막혀 있다. `korea.app`, `korea.xyz` 가 전부 비어 있는데도 아무도 못 사는 이유가 이것이다.
- 조회해 보니 `koreanow.com` 은 이미 남이 갖고 있다. 비어 있는 것은
  `korea-now.com`, `koreanow.net`, `koreanow.co`, `koreanow.kr`, `koreanow.now` 등.
- **깃허브는 저장소 하나에 도메인 하나만 붙는다.** 지금 앱은 블로그와 같은 저장소에 얹혀 있어서,
  이대로 도메인을 붙이면 블로그까지 그 주소로 딸려온다. 앱을 **별도 저장소로 옮겨야** 한다.

## 1. 주소는 한 곳에서만 정한다 (완료)

`korea-now/site.config.mjs` 가 배포 주소를 혼자 결정한다. 코드 어디에도 `/korea-now/` 를 직접 적지 않는다.

```js
export const ORIGIN = (process.env.SITE_ORIGIN ?? 'https://soonryu74.github.io')...
export const BASE   = (process.env.SITE_BASE   ?? '/korea-now')...
```

환경변수를 주면 빌드 결과 전체(에셋 경로·앱 매니페스트·서비스워커·정적 페이지 55개·사이트맵·robots.txt)가
한꺼번에 따라온다.

```
# Windows (PowerShell)
$env:SITE_ORIGIN='https://korea-now.com'; $env:SITE_BASE=''; npm run build

# macOS / Linux
SITE_ORIGIN=https://korea-now.com SITE_BASE='' npm run build
```

`SITE_BASE` 를 빈 값으로 두면 도메인 루트에 올라간다. 확인된 결과:

| 항목 | 지금 | 도메인 붙인 뒤 |
|---|---|---|
| 에셋 | `/korea-now/assets/…` | `/assets/…` |
| canonical | `…github.io/korea-now/` | `https://korea-now.com/` |
| 앱 매니페스트 start_url | `/korea-now/` | `/` |
| 사이트맵 주소 | `…github.io/korea-now/…` | `https://korea-now.com/…` |
| robots.txt 안 사이트맵 | 같이 따라감 | 같이 따라감 |

## 2. 도메인 산다

가격은 조회 시점(2026-09) 기준 연 비용.

| 후보 | 연 비용 | 메모 |
|---|---|---|
| `korea-now.com` | 약 1만 6천원 | 지금 경로 이름과 같아 혼동이 없다 |
| `koreanow.net` | 약 1만 8천원 | 붙임표 없음 |
| `koreanow.co` | 첫해 2만 2천 / 이후 4만 4천 | 갱신비가 뛴다 |
| `koreanow.kr` | 약 2만 2천원 | 외국인 대상이라 불리 |
| `koreanow.now` | 약 4만 5천원 | 아마존이 운영하는 낯선 도메인 |

## 3. 앱을 별도 저장소로 옮긴다

1. 깃허브에서 새 저장소 `korea-now` 를 만든다 (공개, README 없이)
2. 이 저장소의 `korea-now/` 폴더와 `supabase/` 폴더를 새 저장소로 옮긴다
3. 새 저장소에 배포 워크플로를 넣는다 (`.github/workflows/deploy.yml`)
4. 저장소 Settings → Pages → Source 를 `gh-pages` 브랜치로 지정
5. 도메인을 샀으면 Settings → Pages → Custom domain 에 입력 → `CNAME` 파일이 자동 생성됨
6. 도메인 등록업체에서 DNS 를 깃허브로 향하게 한다

   | 종류 | 이름 | 값 |
   |---|---|---|
   | A | `@` | `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153` |
   | CNAME | `www` | `soonryu74.github.io` |

7. Pages 설정에서 **Enforce HTTPS** 체크 (인증서 발급에 몇 분~한 시간)

## 4. 옮긴 뒤 정리

- 이 저장소(블로그)의 `.github/workflows/jekyll.yml` 에서 Korea Now 빌드 단계를 지운다
- 루트 `robots.txt` 의 사이트맵 줄을 새 도메인으로 바꾼다
- 구글 서치콘솔에 새 도메인을 등록하고 사이트맵을 다시 제출한다
- 기존 `soonryu74.github.io/korea-now/` 로 들어오던 검색 유입은 끊긴다.
  깃허브 페이지는 리다이렉트를 못 하므로, 당분간 그 경로에 새 주소로 보내는 안내 페이지를 남겨 두는 편이 낫다.
