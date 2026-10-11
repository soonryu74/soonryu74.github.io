# 지역 건강프로파일 대시보드

질병관리청 지역사회건강조사 지표를 KOSIS openAPI로 수집해 시도·시군구 단위로 분석하는
반응형 웹 대시보드입니다 (CIAT 구조 참조, React + 정적 데이터). 전체 맥락은 `CLAUDE.md`.

## 폴더

- `app/` — React(Vite) 소스. 빌드하면 단일 `index.html` 하나로 합쳐집니다.
- `index.html` — 빌드 결과물(그대로 열거나 어디든 배포).
- `data/` — 수집·검증 산출물. `dataset.json`(앱 내장), `validation_*.md/csv`(검증 리포트), `geo/`(지도 경계).
  `data/raw/`는 KOSIS 원본(용량이 커서 커밋 제외).
- `scripts/` — 파이프라인 (아래 순서).
- `prototype/` — 디자인 원본(샘플 데이터).
- `docs/` — 랭킹 기획안 등.

## 데이터 갱신 (연 1회)

```
# 0) 준비: .env 에 KOSIS_API_KEY=... (커밋 금지), pip install requests, cd app && npm install
python scripts/kosis_inventory.py     # 통계표 인벤토리 + 표본 검증
python scripts/kosis_validate_all.py  # 전 표 커버리지 검증 → validation_full_report.md
python scripts/kosis_fetch_all.py     # 시군구 표 원본 수집 → data/raw/ (재개 가능)
python scripts/build_dataset.py       # → data/dataset.json
python scripts/build_dashboard.py     # → index.html
```

KOSIS는 연속 호출을 몇 분간 차단하므로 스크립트에 호출 간격·재시도가 내장되어 있습니다.
중간에 끊겨도 다시 실행하면 이어서 진행합니다.

## 클로드 코드로 이어서 작업하기

폴더에서 `claude` 실행 후 "CLAUDE.md 읽고 현재 상태 요약해줘"로 시작하면 됩니다.

## 건강수명·DB 보조 지표 (2026-09)
1. `python scripts/kosis_fetch_hle.py data` → `python scripts/build_hle.py` → data/hle.json (검증: `python scripts/validate_hle.py`)
2. `KDH_XLSX=<엑셀 경로> python scripts/kdh_extract.py` → `python scripts/build_kdh_dataset.py` → data/kdh_dataset.json
3. `python scripts/build_dashboard.py`

## 숫자 검증·국제 심사 자료 (2026-10)
- `node scripts/qa/data_validation.mjs` → `docs/DATA_VALIDATION.md` · `docs/indicator_metadata.csv` · `data/validation_summary.json` (빌드 때 자동 실행)
- 숫자의 뜻: 지표 171개 = 지역사회건강조사 41개(조사 단위 258곳) + 시군구 단위 130개(시군구 229곳) · 시도 17 · 2008–2025. 단위가 다른 숫자를 곱하거나 더하지 않는다.
- 영문 랜딩 `/solve`: `scripts/build_solve.py`(solve/template.html + validation_summary.json), 화면 캡처 `scripts/qa/solve_shots.mjs`
- 점검: `scripts/qa/equity_e2e.mjs` · `scripts/qa/solve_readiness_e2e.mjs`(390·430·768·1440) · 보고서 `docs/MIT_SOLVE_READINESS.md` · 성능안 `docs/PERFORMANCE_PLAN.md`
