# IMPLEMENTATION_PLAN — SportsGap AI MVP (2026-10-20)

목표: 2026 경기스포츠산업 공모전(접수 2026-10-30 18:00) 출품용, **실제 공공데이터로 동작하는** 경기도 공공체육시설 접근 격차 진단·시나리오 도구. 공모 분야는 "친환경·편의 기술 — 장애인 및 고령자 편의 서비스" 또는 "안전·시설 관리 기술 — 시설 모니터링"에 해당.

## 범위 결정
| 결정 | 이유 |
|---|---|
| 지역 해상도 = 경기도 31개 시군 | 확보한 시설 데이터(문체부 현황)가 시군구 단위이고 좌표가 없음. 읍면동 해상도는 근거 없이 만들 수 없음. |
| 거리 = 면적 기반 추정 직선거리 | 시설 좌표·경로 데이터 미확보. 균등분포 가정 평균 최근접거리 0.5√(A/n) 를 "추정"으로 명시. |
| 취약집단 = 고령자(65+), 아동(0~14) | 주민등록 연령별 통계로 가능. 장애인은 시군별 등록 현황·무장애 시설 데이터 미확보 → **평가불가** 로 표시(가짜 지원 금지). |
| 대중교통 = 버스정류장 밀도 | 국토부 전국 정류장 파일에 경기 31개 시군 전부 존재. 운행 빈도는 없음 → 대리지표로 명시. |
| LLM 미사용 | 제안은 지표 템플릿 규칙. 화면·문서에 "규칙 기반(LLM 미사용)" 표기. |
| 정적 사이트 | 기존 저장소 배포 방식 그대로. API 키·서버 없음. |

## 체크리스트 (상태: DONE / BLOCKED / OPEN)
### 실사·데이터
- [x] DONE 저장소 실사 → `docs/BASELINE_AUDIT.md`
- [x] DONE 공식 요강 원문 확인(ggsports.spectory.net) → 분야·일정·제출물 반영
- [x] DONE 시설 원자료 확보·검증(문체부 2024.12.31, 시군별 2,463개소, 시트 소계와 100% 일치)
- [x] DONE 인구 원자료 확보(행안부 2026.09, 5세 구간, 31개 시군)
- [x] DONE 경계 확보(통계청 2018, 42개 폴리곤 → 31개 시군 합산, 면적 합계 오차 +0.8%)
- [x] DONE 정류장 확보(국토부 2025.10.31, 경기 38,089개)
- [x] DONE `docs/DATA_CATALOG.csv`
- [ ] BLOCKED 경기데이터드림·브이월드(세션 네트워크 차단) → 시설 좌표·경로 기반 거리 미구현
- [ ] OPEN 시군별 등록장애인·무장애 시설 데이터 → 장애인 접근성 평가

### MVP 기능 (요구 A~H)
- [x] A 지역 선택 + 지도(Leaflet) + 지도 불가 시 표 대체
- [x] B 3개 지표(공급량·추정거리·취약인구) + 대중교통 밀도
- [x] C 취약집단: 고령자·아동 지원, 장애인 평가불가 표시
- [x] D 우선순위 + 근거 있는 제안 3건 이상(점수 산식·가중치·기준일 표시)
- [x] E 시나리오 모드(예산·시설 유형·대상 집단 → 순위 변화, 탐욕 배분)
- [x] F 출처·한계·방법론·개인정보 페이지(`about.html`)
- [x] G 반응형(390/1440), 키보드 조작(표 행 Enter/Space), 로딩/오류/평가불가/지도 불가 상태
- [ ] H 배포 주소 — BLOCKED: `main` 병합은 사용자 승인 필요. 병합 후 `https://soonryu74.github.io/sportsgap/`

### 품질 게이트
- [x] `node --check` 전 JS, `py_compile` 스크립트
- [x] 단위 테스트 10건 통과(`node --test`)
- [x] E2E 16건 통과(390px·1440px, Playwright) + 스크린샷 10장 `evidence/`
- [x] 링크·버튼·출처 페이지 확인(E2E 에 포함)
- [ ] OPEN GitHub Pages 실제 빌드 확인(병합 후)

### 산출물
- [x] `docs/METHODOLOGY.md`, `docs/VALIDATION_REPORT.md`
- [x] `submission/7MIN_PITCH.md`, `DEMO_SCRIPT.md`, `ONE_PAGE_SUMMARY.md`, `ELIGIBILITY_CHECK.md`, `FINAL_SUBMISSION_CHECKLIST.md`
- [ ] OPEN 데모 영상 녹화(사용자), 발표 슬라이드 파일화(사용자)

## 파일 구조
```
sportsgap/
├─ index.html, about.html        화면
├─ css/app.css · js/app.js       화면 로직 (Leaflet 지도·표·비교·시나리오)
├─ js/score.js                   점수 엔진 (순수 함수, Node 테스트 공용)
├─ data/regions.json             31개 시군 원값 + 메타(출처·기준일)
├─ data/gg-sigun.geojson         경계
├─ data/facilities_gg.csv        시설 2,463건 목록(검증용)
├─ raw/                          원자료 그대로 (xlsx, csv, topojson)
├─ scripts/build_sportsgap.py    raw → data
├─ tests/score.test.mjs          단위 테스트 · tests/e2e.spec.mjs E2E
├─ evidence/                     스크린샷
├─ docs/ · submission/           문서 · 제출물
└─ package.json, playwright.config.mjs, .env.example
```
