# 모두의 복지 AI (Modu Bokji AI)

> 말하면 찾아주고, 순서대로 알려주는 복지 길잡이 — *취약계층의 복지정보를 ‘신청 행동’으로 연결하는 공공 AI 길잡이*

내 상황을 말하면(음성·글) **먼저 확인할 지원 3가지 → 왜 확인해야 하는지 → 어디에 전화할지 → 무엇을 준비할지 → 오늘 할 일 1·2·3 → 공식 사이트로 이동 → 가족에게 보내기**까지 한 흐름으로 안내합니다.
복지로 맞춤형급여안내(복지멤버십)·정부24 혜택알리미처럼 “찾아주는” 서비스가 아니라, 이해하고 신청까지 움직이게 하는 **행동지원(last mile) 서비스**입니다.

- 배포 경로: `https://soonryu74.github.io/bokji/` (main 병합 후 GitHub Pages)
- 기획서·지시서: [docs/PLAN_AND_PROMPT.md](docs/PLAN_AND_PROMPT.md) · 완료 보고: [docs/COMPLETION_REPORT.md](docs/COMPLETION_REPORT.md)
- 문서: [docs/](docs/) — PRODUCT_BRIEF · DATA_SOURCES · PRIVACY · LIMITATIONS · PITCH

## 안전 원칙
- **수급자격을 확정하지 않습니다.** “먼저 확인해 보세요 / 조건 확인이 필요합니다 / 현재 정보만으로 판단하기 어렵습니다” 세 가지로만 말합니다. (“받을 수 있습니다” 금지 — 단위·E2E 테스트가 검사)
- 서비스는 `app/src/data/services.json` **화이트리스트**에서만 고릅니다. AI(또는 규칙)는 설명과 순서만 다룹니다.
- 공식 URL이 확인되지 않은 항목은 `official_url: null` → 화면에 “공식 링크 확인 중”.
- 이름·주민번호·연락처·소득액·재산은 묻지 않고, 입력은 브라우저 안(sessionStorage)에만 잠시 머물며 서버로 보내지 않습니다.

## 폴더
```
bokji/
├─ index.html, assets/        ← 빌드 결과(배포되는 파일)
├─ docs/                      ← 기획서·출처·한계·개인정보·완료 보고
└─ app/                       ← 소스 (React 19 + TypeScript + Vite 7)
   ├─ src/data/services.json      ← 공식 서비스 화이트리스트(21종: 출처·공식 링크·확인일·대상 요약)
   ├─ src/data/demoCases.json     ← 데모 시나리오 3개(독거노인·장애인 보호자·경제 위기)
   ├─ src/data/emergency.json     ← 긴급 연락처(119·129·109·1577-1389·1899-9988·112)
   ├─ src/engine/nlp.ts           ← 자연어 → 상황 태그(브라우저 안 키워드 규칙, 결정적)
   ├─ src/engine/facts.ts         ← 답변 + 태그 → 최종 태그, 질문 미리 채우기
   ├─ src/engine/recommend.ts     ← 규칙 기반 추천(필터 → 점수 → 상태)
   ├─ src/engine/plan.ts          ← 오늘 할 일 1·2·3(전화번호별 묶기)
   ├─ src/engine/share.ts         ← 가족에게 보내기 글(개인정보 없음)·읽어주기 문장
   ├─ src/engine/speech.ts        ← 브라우저 TTS·STT
   ├─ src/adapters/ai.ts          ← interpretSituation(text): AI 엔드포인트(선택) + 결정적 fallback
   ├─ src/components/             ← Home · Questions · Results · ServiceDetail · TodayPlan · Settings · About · Emergency
   ├─ scripts/check-links.mjs     ← 공식 링크 깨짐 점검
   └─ tests/e2e.spec.ts           ← Playwright E2E (390×844 · 430×932 · 1440×900)
```

## 실행 방법
Node.js 20 이상 필요. 터미널(맥: 터미널 앱 / 윈도우: PowerShell)에서:

| 하는 일 | 맥(macOS) | 윈도우(PowerShell) |
|---|---|---|
| 폴더 이동 | `cd bokji/app` | `cd bokji\app` |
| 설치(처음 1회) | `npm install` | `npm install` |
| 개발 서버 | `npm run dev` → 브라우저 http://localhost:5173 | 동일 |
| 빌드(배포 파일 생성) | `npm run build` | 동일 |
| 단위 테스트(규칙 엔진·데이터) | `npm test` | 동일 |
| E2E 테스트 | `npx playwright install chromium` 후 `npm run test:e2e` | 동일 |
| 공식 링크 점검 | `npm run check:links` | 동일 |
| AI 엔드포인트 연결(선택) | `cp .env.example .env` 후 `VITE_AI_ENDPOINT=` 채우기 | `Copy-Item .env.example .env` 후 동일 |

빌드 결과는 `bokji/index.html`·`bokji/assets/`에 생성되며, main 브랜치에 병합되면 GitHub Pages가 `/bokji/`로 제공합니다. (`_config.yml`에서 `bokji/app`은 제외)

## AI 연동(adapter)
`src/adapters/ai.ts`의 `interpretSituation(text)`가 유일한 접점입니다.
- `VITE_AI_ENDPOINT`가 비어 있으면 `src/engine/nlp.ts`의 키워드 규칙만 사용(외부 전송 없음).
- 설정돼 있으면 `POST { text }` → `{ tags, who, ageBand }`를 받되, `src/types.ts`의 `Tag` 목록 밖의 값은 버립니다. 실패·시간 초과 시 자동으로 규칙으로 돌아갑니다.
- API 키는 프론트엔드에 두지 않습니다(서버·서버리스 프록시에 둠).
