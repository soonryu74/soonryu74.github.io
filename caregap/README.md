# CareGap AI (케어갭 AI)

> 부모님의 돌봄에서 비어 있는 시간을 찾아드립니다. — *Find the gaps in your parent's care.*

고령 부모의 현재 돌봄 일정과 가족의 걱정을 입력하면 **7일×24시간 Care Map**을 그리고, 공개된 **규칙 엔진(11개 영역·27개 규칙)** 으로
확인이 필요한 돌봄 영역과 관련 공공·지역 서비스를 정리합니다. 진단·등급 판정·질병 예측을 하지 않습니다.

- 배포 경로: `https://soonryu74.github.io/caregap/` (main 병합 후 GitHub Pages)
- 문서: [docs/](docs/) — PRODUCT_BRIEF · COMPETITOR_RESEARCH · DATA_SOURCES · CARE_GAP_METHOD · PUBLIC_DATA_USAGE · PRIVACY · LIMITATIONS · CONTEST_STRATEGY

## 폴더
```
caregap/
├─ index.html, assets/        ← 빌드 결과(배포되는 파일)
├─ data/                      ← 공공데이터 정적 JSON (장기요양기관 평가결과 등)
├─ scripts/                   ← 데이터 정리 스크립트(파이썬)
├─ docs/                      ← 문서
└─ app/                       ← 소스 (React + TypeScript + Vite)
   ├─ src/data/care_gap_rules.json   ← 규칙 엔진 정의(여기만 고치면 규칙 변경)
   ├─ src/data/service_types.json    ← 일정 종류별 '곁에 있음'·돌봄 기능
   ├─ src/data/services_catalog.json ← 공공·지역 서비스 안내(공식 링크, 확인일)
   ├─ src/engine/                    ← 시간 계산·사실 계산·규칙 평가·자연어 후보 추출
   ├─ src/adapters/                  ← 공공데이터·AI 어댑터(실제/미연결 구분)
   ├─ src/components/                ← 화면
   └─ tests/                         ← Playwright E2E (390·768·1280px)
```

## 실행 방법
Node.js 20 이상 필요. 터미널(맥: 터미널 앱 / 윈도우: PowerShell)에서:

| 하는 일 | 맥(macOS) | 윈도우(PowerShell) |
|---|---|---|
| 폴더 이동 | `cd caregap/app` | `cd caregap\app` |
| 설치(처음 1회) | `npm install` | `npm install` |
| 개발 서버 | `npm run dev` → 브라우저 http://localhost:5173 | 동일 |
| 빌드(배포 파일 생성) | `npm run build` | 동일 |
| 단위 테스트(규칙 엔진) | `npm test` | 동일 |
| E2E 테스트 | `npx playwright install chromium` 후 `npm run test:e2e` | 동일 |
| 장기요양기관 데이터 재생성 | `python3 caregap/scripts/build_ltc.py` (저장소 루트에서) | `py caregap\scripts\build_ltc.py` |
| 치매안심센터 CSV 연결 | `python3 caregap/scripts/import_institutions_csv.py dementia ~/Downloads/파일.csv` | `py caregap\scripts\import_institutions_csv.py dementia $HOME\Downloads\파일.csv` |

빌드 결과는 `caregap/index.html`, `caregap/assets/`에 생성되며 함께 커밋합니다(GitHub Pages는 빌드 단계 없이 그대로 제공).

## 환경변수
`.env.example` 참고. API 키를 프론트엔드에 넣지 않습니다.
- `VITE_AI_ENDPOINT` (선택): 자연어 구조화 서버 주소. 비우면 브라우저 안 키워드 규칙만 사용.
- `DATA_GO_KR_KEY`: 공공데이터포털 키 — 빌드 스크립트/GitHub Actions Secret 전용. `VITE_` 접두사 금지.

## 민감정보 처리 (요약 — 자세히는 docs/PRIVACY.md)
- 받지 않음: 이름, 주민등록번호, 생년월일, 건강보험번호, 장기요양인정번호, 진료기록, 질병명.
- 받음: 연령(숫자), 성별(선택), 시군구, 독거 여부, 걱정 체크, 일정.
- **모두 브라우저 localStorage에만 저장, 서버 저장·전송 없음.** 화면에서 즉시 삭제 가능.

## 데이터 구분
| 표시 | 의미 |
|---|---|
| 공공데이터 · 실제 데이터 | 국민건강보험공단 장기요양기관 평가결과(data.go.kr 15104801) |
| 서비스 정보 출처 확인 중 | 치매안심센터·보건소 — 아직 미연결, 0건·가짜로 채우지 않음 |
| 안내 정보(수기 정리) | 공공·지역 서비스 설명과 공식 링크(확인일 표기) |
| DEMO DATA | 예시 체험용 가상 사례 |
