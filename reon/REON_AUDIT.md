# REON_AUDIT — 저장소 분석 (다시ON AI 구축 전 감사)

- 작성일: 2026-10-06
- 대상: `soonryu74/soonryu74.github.io` (브랜치 `claude/reon-ai-career-navigator-mvp-iv5a7r`)
- 목적: 「다시ON AI — 경력을 다시 켜는 AI 전환취업 내비게이터」 MVP를 어디에, 무엇을 재사용해, 어떤 방식으로 올릴지 결정

## 1. 현재 기술스택

| 항목 | 현황 |
|---|---|
| 호스팅 | GitHub Pages. `main` push → `.github/workflows/jekyll.yml`이 Jekyll 빌드 후 `gh-pages` 브랜치로 배포 |
| 빌드 | Jekyll(github-pages gem). `_config.yml`은 거의 비어 있고 `caregap/app`, `nunchi/test`만 제외. 프런트매터 없는 HTML/JS/JSON은 **그대로 복사**됨 |
| 언어 | 대부분 **순수 HTML + CSS + 바닐라 JS**(빌드 없음). 예외: `caregap/app`(React 19 + TypeScript + Vite 7, 빌드 결과물 `caregap/index.html`·`caregap/assets/`를 커밋) |
| 백엔드 | 없음. 일부 하위 사이트가 Supabase(브라우저에서 anon key로 직접 접속)를 사용 |
| 데이터 갱신 | Python 스크립트 + GitHub Actions(실거래가·뉴스·국정감사·KESS 등) |
| 테스트 | `caregap/app/tests/e2e.spec.ts`(Playwright, 390/768/1280px), `nunchi/test` |
| 런타임(컨테이너) | Node 22.22, Python 3.13, Chromium(Playwright 1194) 설치됨. `caregap/app/node_modules` 없음 |

## 2. 디렉터리 구조 (관련 부분만)

```
/                     부동산 종합정보(루트 사이트, index.html 등 60여 HTML)
/dolbom/              "모심" 돌봄 종합포털 — 순수 HTML/CSS/JS, Supabase 구직 프로필
/caregap/             "CareGap AI" — React/Vite 소스(app/) + 빌드 결과 + 공공데이터(장기요양기관 평가)
/gyeotae/             "곁애" 간호·간병 매칭 사전등록(Supabase)
/dasibom/             사람 기억 노트(PWA, 로컬 전용)
/gajeong/, /ipsi/, /yeongyangje/, /nunchi/, /health-dashboard/ … 기타 독립 하위 사이트
/data/, /scripts/     루트 사이트용 데이터·수집 스크립트
/docs/                기획 문서
/.claude/skills/      ebook-maker 스킬
```

각 하위 사이트는 서로 독립적(공유 레이아웃 없음). 새 서비스는 **`/reon/` 하위 폴더**로 추가하면 기존 사이트에 영향이 없다.

## 3. 기존 돌봄 서비스 기능과 재사용 가능 자산

| 자산 | 위치 | 재사용 판단 |
|---|---|---|
| 전국 17개 시도·시군구 목록 | `dolbom/assets/regions.js` (`window.REGIONS`) | **재사용** — 희망지역 선택에 복사해 사용(ES 모듈로 변환) |
| 접근성 바(글자 크기·고대비, localStorage) | `dolbom/assets/app.js` | 패턴 재사용(글자 크기 토글) |
| 구직자 프로필 폼(직종·자격·지역·가능시간) | `dolbom/gujik.html` | 입력 항목 설계 참고. **Supabase 저장 로직은 사용하지 않음**(다시ON은 서버 저장 없음) |
| 장기요양기관 평가 데이터 27,946건 | `dolbom/data/eval/`, `caregap/data/ltc/` | 돌봄 직무 선택 시 "기관 찾기" 공식 링크 안내에만 참고. MVP 화면에는 직접 쓰지 않음 |
| 돌봄 직무·자격 체계(요양보호사·사회복지사 등) | `dolbom/*.html` 설명 | 직무 사전의 돌봄 분야 항목에 반영 |
| "실제/미연결/DEMO" 데이터 구분 원칙, `.env.example`, 키 미노출 원칙 | `caregap/README.md`, `caregap/app/src/adapters/*` | **원칙 그대로 계승** |
| 자연어 → 후보 추출 + 사용자 확인 패턴 | `caregap/app/src/engine/nlp.ts`, `adapters/ai.ts` | 설계 패턴 계승(키워드 규칙 fallback + 선택적 원격 AI, 결과는 '후보') |
| Playwright E2E 구성(3개 뷰포트, 스크린샷) | `caregap/app/playwright.config.ts` | 스크린샷·QA 스크립트 패턴 재사용 |
| 따뜻한 톤 디자인 토큰(세이지그린·웜골드·크림) | `dolbom/assets/style.css` | 색 체계 참고. 다시ON은 독자 팔레트(따뜻한 오렌지·딥틸)로 분리 |

## 4. 현재 문제점 (다시ON 관점)

1. 저장소는 다목적 포털이라 **첫 화면(루트)이 부동산 사이트**다. 심사위원 체험용으로는 `/reon/` 자체가 독립된 첫 화면이 되어야 한다.
2. `caregap`은 React/Vite 빌드가 필요하고 `node_modules`가 없다. 동일 스택을 쓰면 심사·수정 시 빌드 단계가 늘어난다. 저장소 주류(빌드 없는 정적 HTML)와 맞추는 편이 유지보수에 유리하다.
3. `dolbom/gujik.html`은 공개 디렉터리에 프로필을 **Supabase에 저장**한다. 다시ON은 개인정보 서버 저장 없음이 원칙이므로 이 구조를 가져오지 않는다.
4. 돌봄 포털이 "요양보호사 구인구직"으로 보이는 문제 → 다시ON에서는 돌봄을 여러 전환 분야 중 하나로 위치시킨다.
5. 공공 API: 이 컨테이너에서는 `work24.go.kr`, `data.go.kr`, `hrd.go.kr` 접속이 프록시 정책으로 차단(CONNECT 403). 실제 호출 검증은 불가 → 어댑터 구조 + DEMO 데이터 + 공식 링크로 구현하고, 키 발급 후 연결하도록 설계.

## 5. API·환경변수·배포 현황

- 환경변수: `caregap/app/.env.example`(VITE_AI_ENDPOINT, DATA_GO_KR_KEY). 루트 `.env.example` 없음 → 다시ON용 `reon/.env.example` 신설.
- API 키가 소스에 들어간 곳: Supabase anon key(공개 키, 설계상 허용)만 존재. 서버 비밀키 없음.
- 배포: `main` 병합 시 자동. GitHub Pages는 **정적 파일만** 제공 → 서버사이드 프록시 불가. 따라서 고용24 OPEN API(인증키 필요, CORS 미보장)는 (a) GitHub Actions로 주기 수집해 JSON 캐시 커밋 또는 (b) 별도 서버리스 프록시로 연결해야 한다. MVP는 (a) 구조를 만들고, 키가 없는 동안은 DEMO 데이터로 동작한다.
- 하위 경로: `https://soonryu74.github.io/reon/` 로 바로 제공 가능. SPA 라우팅은 해시(`#/step`)로 처리(404 트릭 불필요).

## 6. 모바일·접근성·개인정보

- 기존 사이트들은 `viewport` 메타, 반응형 CSS, 일부 접근성 바(글자 크기)를 갖춤. 다시ON도 동일 수준 이상(큰 글자 기본 18px, 44px 이상 버튼, 키보드 포커스 표시, aria-live 로딩 안내)으로 구현.
- 개인정보: `dolbom/gujik`·`gajeong`·`gyeotae`는 Supabase 저장. 다시ON은 **sessionStorage/localStorage만** 사용, 민감정보 입력 금지 안내 표시, "내 기록 지우기" 버튼 제공.

## 7. 결정 사항

| 결정 | 내용 |
|---|---|
| 위치 | `/reon/` 신규 하위 사이트. 기존 파일은 삭제·수정하지 않음(루트 README에 링크 한 줄만 추가) |
| 스택 | 순수 HTML + CSS + 바닐라 JS(ES 모듈). 빌드 없음, 의존성 없음 → GitHub Pages에 그대로 배포 |
| 라우팅 | 단일 `index.html` + 해시 라우터(`#/input`, `#/skills`, `#/jobs`, `#/gap/:id`, `#/training`, `#/openings`, `#/report`) |
| AI 모듈 | `reon/js/engine/`에 `careerAnalyzer`·`skillExtractor`·`jobMatcher`·`gapAnalyzer`·`explanationGenerator` 분리. 결정론적 DEMO 분석기 기본, `AI_ENDPOINT` 설정 시 원격 AI 사용. 화면에 분석 모드 표시 |
| 데이터 | `reon/data/`에 직무 사전(역량 태그·필수/권장 자격·출처 링크), 훈련(DEMO), 채용(공식 검색 링크 + DEMO 표기), 지역 코드 |
| 심사 모드 | `/reon/demo.html` 및 `/reon/?demo=judge` → Persona B 자동 입력 → 90초 데모 |
| 증거 | `reon/scripts/screenshots.mjs`(Playwright)로 `reon/evidence/screenshots/01~10` 생성 |
| 보호 | API 키 커밋 금지, `.env.example`만 커밋. 서버 저장 없음. 기존 Supabase·데이터 무변경 |
