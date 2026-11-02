# 먼저 찾아오는 복지 비서

2026 사회보장 데이터 활용 AI 혁신 아이디어 경진대회(한국사회보장정보원·대구가톨릭대, 복지부 후원) 출품 준비 폴더.
복지로 공개 API(중앙부처·지자체 복지서비스)를 매일 읽어 AI가 지원 조건을 구조화하고, 사용자 프로필과 대조해 새로 생긴·바뀐·마감 임박 서비스를 먼저 알리고 쉬운말 요약·서류 체크리스트까지 만들어 주는 서비스 제안.

## 데모 (실제 작동)
- 서비스: `https://soonryu74.github.io/bokji-biseo/` (main 병합 후 GitHub Pages)
- 심사위원 모드: `bokji-biseo/demo.html?persona=tb` (결핵 사례 자동 입력) · `?persona=shop` (소상공인) · `?persona=baby` (출산)
- 빌드 없음. 로컬 실행: 저장소 루트에서 `python3 -m http.server 8000` (윈도우 `py -m http.server 8000`) → http://localhost:8000/bokji-biseo/
- 구조: `index.html` + `js/app.js`(화면) + `js/engine.js`(규칙 엔진, 판정은 여기서만) + `js/personas.js` + `data/services.json`
- 판정 3단계: **지금 해당 가능**(사람 승인 규칙, 모든 조건 충족) / **확인 필요**(조건 일부 모름) / **AI 초안 후보**(미검수). 카드마다 ✅❌❔ 조건과 원문 인용을 보여 준다.
- 데이터 파이프라인: `fetch_bokjiro.py`(API 수집) → `structure_trial.py`(AI 조건 초안) → `data/rules_approved.json`(사람 승인 28건) → `build_app_data.py` → `data/services.json`

## 정직성 체크
- 승인 규칙 28건 중 API 상세 원문을 확보한 것은 7건. 나머지 21건은 복지로 요약문 기준이며 카드에 "상세 원문 수집 전" 문구를 표시한다. 개발계정 일일 호출 제한(약 100건) 해제 후 `fetch_bokjiro.py --skip-list --detail 461 --sleep 1`로 이어받기 수집 → 재검수 예정.
- 쉬운말 카드의 금액·비율은 제도 일반 지식으로 작성했으므로 제출 전 2026년 기준으로 재확인 필요.
- 로그인·서버 없음. 입력은 localStorage에만 저장. API 키는 커밋하지 않음.

| 파일 | 내용 |
|---|---|
| `docs/제안서_먼저찾아오는복지비서.docx` | **제출용 제안서** (서식 4 구조, 4쪽). 한글에서 열어 `.hwp`로 저장 후 제출 |
| `docs/제안서_먼저찾아오는복지비서_미리보기.pdf` | 위 문서 미리보기 |
| `docs/PROPOSAL.md` | 제안서 원고(초안, 마크다운) |
| `docs/OFFICIAL_NOTICE.md` | 공고문·서식 원문 텍스트 |
| `docs/STRUCTURING_TRIAL.md` | 상세 40건 AI 구조화 시험 결과 |
| `docs/CONTEST_STRATEGY.md` | 대회 정보·평가항목 대응·예상 질문·제출 체크리스트 |
| `scripts/fetch_bokjiro.py` | 중앙부처복지서비스 API 수집 (`DATA_GO_KR_KEY` 환경변수). 2026-11-01 461건 목록·40건 상세 수집 확인 |
| `scripts/structure_trial.py` | 상세 문장 → 조건 JSON 구조화 시험 (Gemini API, 모델 교체 가능) |
| `scripts/make_proposal.js` | 제안서 DOCX 생성 (`node make_proposal.js out.docx`) |
| `scripts/build_app_data.py` | 앱 데이터 빌드 |
| `data/services.json`, `data/rules_approved.json` | 앱 데이터(커밋), `data/raw/`는 원자료(git 제외) |

접수 마감 2026-11-20. 본선 발표 12-03.
