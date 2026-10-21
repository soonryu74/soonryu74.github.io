# SportsGap AI — 경기도 공공체육시설 접근 격차 진단 · 정책 시뮬레이터

2026 경기스포츠산업 공모전 출품용 MVP. 공개 통계만으로 경기도 31개 시군의 **시설 공급량·추정 접근거리·취약인구·대중교통 밀도**를 같은 잣대로 비교하고, 예산·대상 집단을 바꿔 우선 검토 지역을 찾는다. 서버·로그인·개인정보·API 키 없음. 제안은 규칙 기반(LLM 미사용).

- 실행 주소(main 병합 후): `https://soonryu74.github.io/sportsgap/`
- 데이터·방법론·개인정보: `about.html`
- 문서: `docs/`(실사·계획·데이터 카탈로그·방법론·검증) · 제출물: `submission/` · 증빙: `evidence/`

## 실행 방법 (빌드 없음)
| 하는 일 | 맥(macOS 터미널) | 윈도우(PowerShell) |
|---|---|---|
| 로컬 서버 | 저장소 루트에서 `python3 -m http.server 4180` → `http://127.0.0.1:4180/sportsgap/` | `py -m http.server 4180` → 동일 |
| 데이터 재생성 | `pip3 install openpyxl` 후 `python3 sportsgap/scripts/build_sportsgap.py` | `py -m pip install openpyxl` 후 `py sportsgap\scripts\build_sportsgap.py` |
| 단위 테스트 | `node --test sportsgap/tests/score.test.mjs` | 동일 |
| E2E(390·1440px) | `cd sportsgap && npm install && npx playwright install chromium && npx playwright test` | `cd sportsgap; npm install; npx playwright install chromium; npx playwright test` |

## 데이터 (전부 실제 공개 데이터, DEMO 데이터 없음)
| 자료 | 기준 | 라이선스 |
|---|---|---|
| 문화체육관광부 전국 공공체육시설 현황(경기 2,463개소) | 2024-12-31 | 공공누리 2유형(출처표시·상업적 이용금지) |
| 행정안전부 주민등록 인구 연령별(5세) | 2026-09 | 공공누리 1유형 |
| 국토교통부 전국 버스정류장 위치정보(경기 38,089개) | 2025-10-31 | 제한 없음 |
| 통계청 센서스 행정구역경계(southkorea-maps 단순화본) | 2018 | 통계청 공공데이터 |
자세한 URL·검증·한계: `docs/DATA_CATALOG.csv`. 미확보(평가불가): 시군별 등록장애인·무장애 시설, 시설 좌표·경로 거리.

## 구조
```
index.html / about.html   화면            js/score.js  점수 엔진(순수 함수)   js/app.js  화면 로직
data/regions.json         31개 시군 원값  data/gg-sigun.geojson 경계          data/facilities_gg.csv 시설 목록
raw/                      원자료          scripts/build_sportsgap.py raw→data  tests/  단위·E2E
```
