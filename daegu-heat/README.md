# 대구 더위·미세먼지 건강 비서 (데모)

2026 대구광역시 기후·환경·탄소중립 공공데이터 AI 활용대회 **부문 1(아이디어 제안)** 출품 준비 폴더. 접수 마감 2026-11-20 17:00, 이메일 smeeheo@dpi.re.kr.

기상청 특보(2026년 3단계 개편)·에어코리아·행정동 인구·무더위쉼터 공공데이터를 묶어, 개인 조건(나이·질환·하는 일·사는 동)에 맞는 폭염·미세먼지 위험 단계와 오늘 할 일을 쉬운말로 먼저 알리는 서비스 제안과 작동 데모.

- 데모: `https://soonryu74.github.io/daegu-heat/` (main 병합 후) · 심사 모드 `demo.html?persona=worker|senior|mom`
- 로컬: 저장소 루트에서 `python3 -m http.server 8000` (윈도우 `py -m http.server 8000`) → http://localhost:8000/daegu-heat/
- 구조: `index.html` + `js/app.js`(화면) + `js/engine.js`(규칙 엔진: 환경 점수 × 개인 취약 점수) + `js/personas.js` + `data/*.json`

| 파일 | 내용 |
|---|---|
| `docs/OFFICIAL_NOTICE.md` | 공고문·붙임 서식 1~6 원문 텍스트 |
| `docs/DATA_SOURCES.md` | 공공데이터 사용 내역(붙임 5 기초)과 실측 요약 |
| `docs/PROMPT_LOG.md` | AI 프롬프트 활용 기록(붙임 4 기초) |
| `data/heat_illness_summary.json` | 질병관리청 온열질환 감시 데이터 대구 집계 (2011~2025) |
| `data/dong_pop.json` | 행정안전부 행정동 연령별 인구 → 대구 152개 동 65·75세 이상 (2026.9.30) |
| `data/airkorea_stations.json` | 에어코리아 대구 측정소 20곳 |
| `data/raw/` | 원자료 (CSV·PDF, git 제외) |

## 정직성 원칙
- 특보·농도는 API 승인 전이라 사례별 **시나리오 입력**이며 화면에 그렇게 표시한다. 무더위쉼터 목록은 데이터 연결 전이라 **빈칸**으로 둔다(가짜 목록 금지).
- 위험 단계 가중치는 설계값이며, 근거(온열질환 통계·기상청 행동수칙)를 화면에 항목별로 표시한다. 진단이 아니다.
