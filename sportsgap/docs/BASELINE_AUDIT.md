# BASELINE_AUDIT — 저장소 실사 (2026-10-20)

작업 전 `soonryu74/soonryu74.github.io` 저장소(브랜치 `claude/new-session-6e0x4m`, main 과 동일 시점)를 확인한 결과. **실제 존재하는 것 / 없는 것 / 오류**로 나눠 적는다.

## 실제 존재하는 것
| 항목 | 내용 |
|---|---|
| 저장소 성격 | GitHub Pages 정적 사이트(Jekyll 기본 설정, `_config.yml`은 exclude 목록만). 부동산 정보 사이트가 뿌리이고 하위 프로젝트가 폴더별로 공존(`caregap/`, `reon/`, `ipsi/`, `yeongyangje/`, `gajeong/` 등). |
| 배포 | `main` 브랜치 → `https://soonryu74.github.io/` 자동 배포(Jekyll 워크플로 `.github/workflows/jekyll.yml`). 빌드 단계 없이 정적 파일 그대로 제공. |
| 선례 1: `reon/` | 빌드 없는 순수 정적 앱(HTML+CSS+JS+JSON). 해커톤 MVP. 문서(`IMPLEMENTATION_PLAN.md`, `QA_REPORT.md`, `DEMO_SCRIPT.md`, `evidence/`)를 프로젝트 폴더 안에 둔 구조. |
| 선례 2: `caregap/` | Vite+React+TS 소스(`caregap/app/`)와 빌드 결과(`caregap/index.html`, `assets/`)를 함께 커밋. Playwright 1.56.1, vitest. `_config.yml`에서 소스 폴더 제외. |
| 데이터 스크립트 | `scripts/build_*.py`(Python 3, KESS·EDSS·학교알리미 등 공공데이터 변환). GitHub Actions 로 주기 갱신하는 패턴 존재. |
| 실행 환경 | Node 22.22, npm 10.9, Python 3.13, openpyxl 3.1.5, pandas 3.0.5, Playwright 용 Chromium(`/opt/pw-browsers/chromium`). |
| 라이선스 | 저장소 루트에 LICENSE 파일 없음. README 에 "공식 자료 출처" 표기와 면책만 있음. |
| Git 상태 | 작업 시작 시 워킹트리 깨끗함. 최근 커밋은 교회 앱·부동산 뉴스 자동 갱신. |

## 없는 것
- **SportsGap AI 관련 코드·데이터·문서가 전혀 없음.** `sportsgap`, `체육`, `스포츠` 로 검색해도 결과 없음. 이번 작업이 최초 구현이다.
- 루트 `package.json` 없음(하위 프로젝트별로만 존재). 루트 lint·typecheck·build 명령 없음.
- `.env.example` 없음(SportsGap 은 API 키가 필요 없어 안내용만 둠).
- 경기도 공공체육시설·인구·경계·교통 데이터 없음 → 전부 외부에서 새로 확보·검증(→ `DATA_CATALOG.csv`).

## 오류·주의
- 본 세션의 네트워크는 `data.gg.go.kr`, `openapi.gg.go.kr`, `gg.go.kr`, `localdata.go.kr`, `vworld.go.kr` 연결이 끊김(터널 종료). 경기데이터드림·지방행정인허가·브이월드 데이터는 쓸 수 없었다. `data.go.kr` 은 간헐적으로 연결이 끊겨 재시도로 확보했다.
- `caregap/app/node_modules` 는 설치돼 있지 않음(이번 작업과 무관).
- 로컬 Jekyll 빌드 도구(jekyll gem)는 설치돼 있지 않아 Pages 빌드는 GitHub Actions 에서만 확인 가능.

## 결정
- 기존 프레임워크 우선 원칙에 따라 **빌드 없는 정적 앱**(`reon/` 방식)으로 구현. Leaflet(cdnjs, SRI 해시 검증)으로 지도, ES 모듈로 점수 엔진 분리(브라우저·Node 공용 → `node --test`).
- 프로젝트 전체를 `sportsgap/` 한 폴더에 격리. 원자료(`raw/`), 변환 스크립트(`scripts/`), 산출물(`data/`), 문서(`docs/`), 제출물(`submission/`), 증빙(`evidence/`).
- 기존 파일은 `README.md`(섹션 추가)와 `_config.yml`(테스트·node_modules 제외)만 수정. 다른 하위 프로젝트는 건드리지 않음. force push 없음.
