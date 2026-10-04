# Performance Plan — index.html 크기 분석과 개선안

- 기준일: 2026-10-04 · 이번 작업에서는 **구조를 바꾸지 않았다**(기존 기능을 깨뜨릴 위험). 분석과 단계안만 기록한다.

## 1. 현재 상태(실측)

| 항목 | 값 |
|---|---|
| index.html 원본 | 10.5MB (10,497,127 bytes) |
| 실제 전송량(gzip, GitHub Pages 자동 압축) | **약 2.42MB** — health-profile.kr·GitHub Pages 모두 `content-encoding: gzip` |
| 다운로드 시간(이 서버에서 1회 측정) | 0.75~1.4초 — 모바일 회선에서는 더 길다 |
| JS(인라인) | 10.41MB — React 앱 + **JSON 데이터 인라인** |
| CSS(인라인) | 86KB |
| base64 이미지 | 1개(소개 영상 포스터 JPEG, 약 36KB) |
| /solve 랜딩 | HTML 18KB + 캡처 이미지 4장(지연 로딩) — 앱 데이터 없음 |

## 2. 원인 — 데이터가 HTML 안에 들어 있다

vite-plugin-singlefile 로 앱과 데이터를 한 파일에 합친다(설계 의도: 파일로 열어도 동작, 어디든 배포). 큰 데이터:

| 파일 | 크기 | 쓰는 곳 |
|---|---|---|
| data/kdh_dataset.json | 4.08MB | 시군구 단위 지표 115개(모든 화면) |
| data/dataset.json | 2.93MB | 지역사회건강조사 41개(조율·표준화율·표준오차 4행렬) |
| data/units.json | 0.79MB | 조사 단위 탭 |
| 지도 TopoJSON(시군구·시도) | 0.77MB | 지도 |
| data/chs_publications.json | 0.47MB | 자료원 탭 발간물 목록 |
| data/ncd.json | 0.37MB | 예방·관리 탭·우선 검토 카드 |
| data/khepi_kpi_1116.json | 0.33MB | 성과지표 탭 |
| 그 밖(hle·risk·cancer·mort·checkup·evidence 등) | 약 1.3MB | 여러 화면 |

중복: dataset.json 의 표준오차 행렬(cse·sse)이 값 행렬만큼 크다. 사망률은 kdh_dataset.json 과 mort_kosis.json 에 겹치는 연도가 있다(원천 우선 병합).

## 3. 개선 단계안(위험 낮은 순)

| 단계 | 내용 | 예상 효과 | 위험 |
|---|---|---|---|
| 1 | 탭 전용 데이터(units·chs_publications·khepi_kpi_1116·chronicle)를 `fetch()` 지연 로드로 분리 | 원본 −1.6MB | 파일로 열기(file://)에서 그 탭만 안 열림 → 안내 문구 필요 |
| 2 | 지도 TopoJSON 을 별도 파일로 | −0.77MB | 지도 첫 표시가 조금 늦어짐 |
| 3 | dataset·kdh 를 별도 JSON 으로 두고 첫 화면은 홈 대표 지표 4개만 먼저 | 첫 화면 전송량 대폭 감소 | 모든 화면이 비동기 로드로 바뀜 — 가장 큰 변경 |
| 4 | 표준오차 행렬을 표준화율만 남기거나 정수 압축 | −0.7MB | 조율 신뢰구간 표시 영향 |

권장: 국제 심사 전에는 **바꾸지 않는다**(지금 gzip 2.4MB, 동작 검증 완료). 심사위원 첫 화면은 가벼운 `/solve`(18KB)이고, 거기서 앱으로 들어간다. 이후 1·2단계부터 별도 브랜치에서 진행하고 equity_e2e·solve_readiness_e2e 로 회귀 확인.
