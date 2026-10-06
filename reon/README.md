# 다시ON AI (Re:ON AI) — 경력을 다시 켜는 AI 전환취업 내비게이터

> 구직자가 직업 이름을 몰라도 됩니다. 다시ON AI가 지금까지의 삶과 경력을 다음 일자리의 언어로 번역합니다.

2026 고용24 국민참여 AI 고용서비스 발굴 온라인 해커톤 출품용 **실제 작동 웹 MVP**입니다.
심사위원이 회원가입 없이 약 3분 동안 **경력 입력 → AI 경력 번역 → 전환직무 TOP3 → 역량 Gap → 교육훈련 → 채용정보 → 전환 리포트**를 끝까지 체험할 수 있습니다.

- 서비스: `https://soonryu74.github.io/reon/`
- 심사위원 모드(90초 데모): `https://soonryu74.github.io/reon/demo.html` (= `/reon/?demo=judge`)

## 무엇이 다른가
| 일반 취업검색 | 다시ON AI |
|---|---|
| 직업명·검색어에서 시작 | **"내가 해온 일"**에서 시작 |
| 공고 목록 | 직무 → 부족한 역량 → 훈련 → 실제 일자리로 이어지는 **전환 경로** |
| 점수만 제시 | **왜 추천했는지** 문장으로 설명 + 근거(Evidence) 공개 |
| AI가 결정 | AI는 제안, **사람이 역량을 수정·삭제·추가**해 최종 결정 |

## 흐름 (7단계)
1. **경력 입력** — 자연어 + 선택 조건(희망지역·근무형태·근무시간·희망임금·자격·교육 의향). 민감정보 요구 없음.
2. **AI 경력 번역** — 역량 40종 사전으로 추출. 각 역량에 근거 문장 표시. 수정·삭제·추가 가능.
3. **전환직무 TOP3** — 직무 18종 사전과 비교. 적합도 + "왜 잘 맞나요?" + 강점/보완 + 점수 구성표(미반영 요소 명시).
4. **역량 Gap** — 이미 갖춘 것 / 보완하면 좋은 것 / 필요한 자격·교육(● 필수 ○ 권장 구분, 공식 링크).
5. **교육훈련** — 고용24 훈련과정 API 구조에 맞춘 카드. 현재 DEMO 표기 + 공식 검색 링크.
6. **채용정보** — 고용24 채용정보 API 구조에 맞춘 카드. 현재 DEMO(실제 공고 아님 명시) + 공식 검색 링크.
7. **전환 리포트** — 핵심역량·TOP3·이유·Gap·훈련·채용 검색어·다음 행동 3가지. 인쇄/PDF 저장.
   하단 **"이 추천은 무엇을 근거로 했나요?"** 에서 입력·추출·비교·조건·출처를 공개합니다.

## 실행 방법
빌드 없음. 정적 파일이므로 저장소 루트에서 정적 서버만 띄우면 됩니다.

| 하는 일 | 맥(macOS 터미널) | 윈도우(PowerShell) |
|---|---|---|
| 저장소 루트로 이동 | `cd soonryu74.github.io` | `cd soonryu74.github.io` |
| 정적 서버 실행 | `python3 -m http.server 8000` | `py -m http.server 8000` |
| 접속 | http://localhost:8000/reon/ | 동일 |
| 심사위원 모드 | http://localhost:8000/reon/demo.html | 동일 |
| 엔진 단독 검증 | `node reon/scripts/engine_check.mjs` | `node reon\scripts\engine_check.mjs` |
| Persona 5종 E2E QA | `npm i playwright@1.56.1` 후 `node reon/scripts/qa.mjs` | 동일(`npx playwright install chromium` 필요할 수 있음) |
| 심사위원 모드 E2E | `node reon/scripts/qa_judge.mjs` | 동일 |
| 증거 스크린샷 10장 | `node reon/scripts/screenshots.mjs` | 동일 |

`file://` 로 직접 열면 ES 모듈 정책 때문에 동작하지 않습니다. 반드시 서버로 여세요.

## 환경변수·API
- 키는 소스에 넣지 않습니다. `reon/.env.example` 참고.
- `WORK24_API_KEY`: 고용24 OPEN-API 인증키(서버·GitHub Actions 전용). `reon/scripts/fetch_work24.py` 가 채용·훈련을 수집해 `reon/data/cache/*.json` 에 저장하면 화면이 자동으로 "고용24 수집 데이터"로 전환됩니다. 비어 있으면 DEMO 표시.
- `AI_ENDPOINT`(`js/config.js`): 경력 서술을 구조화하는 본인 서버 주소(선택). 비우면 브라우저 안 규칙 분석기(DEMO 표시).

## 데이터 구분 (화면 표시 원칙)
| 표시 | 의미 |
|---|---|
| `DEMO 분석 · 규칙 기반` | AI 서버 미연결. 브라우저 안 키워드 규칙으로 역량 추출 |
| `AI 분석(원격)` | AI_ENDPOINT 로 분석한 결과 |
| `DEMO · 실제 데이터 아님` | 훈련·채용 예시. 실제 과정·공고 아님, 원문 링크 없음 |
| `미반영` | 직업전망·접근성 등 데이터가 없는 점수 요소. 가짜 수치로 채우지 않음 |

## 개인정보
서버 저장 없음. 입력은 브라우저 `sessionStorage` 에만 있고 탭을 닫으면 사라집니다. "내 기록 지우기" 버튼으로 즉시 삭제. 민감정보 입력 금지 안내를 입력 화면에 표시합니다.

## 문서
| 문서 | 내용 |
|---|---|
| `REON_AUDIT.md` | 저장소 분석·재사용 자산·결정 |
| `IMPLEMENTATION_PLAN.md` | 구현 계획·우선순위·점수 설계 |
| `ARCHITECTURE.md` | 구조·모듈·데이터 흐름 |
| `DATA_SOURCES.md` | 공공데이터·API 조사(실제 연결 여부 명시) |
| `QA_REPORT.md` | Persona 5종 E2E 결과 |
| `DEMO_SCRIPT.md` | 90초 심사용 데모 스크립트 |
| `SUBMISSION_NOTES.md` | 제출 메모·한계·다음 단계 |

## 폴더
```
reon/
├─ index.html, demo.html       단일 페이지 앱(해시 라우터) / 심사위원 진입
├─ css/reon.css                디자인 시스템
├─ js/app.js, state.js, ui.js  라우터·세션 상태·도우미
├─ js/engine/                  careerAnalyzer · skillExtractor · jobMatcher · gapAnalyzer · explanationGenerator
├─ js/adapters/                ai.js(원격 AI↔규칙) · work24.js(캐시↔DEMO)
├─ js/views/                   화면 9개
├─ data/                       skills · jobs · training(DEMO) · openings(DEMO) · personas · regions · cache/
├─ scripts/                    engine_check · qa · qa_judge · screenshots · fetch_work24.py
└─ evidence/screenshots/       01_home … 10_mobile
```
