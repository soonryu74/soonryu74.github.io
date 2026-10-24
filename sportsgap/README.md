# SportsGap AI (가칭)

2026 경기스포츠산업 공모전 · 친환경·편의 기술(장애인·고령자 편의 서비스) 출품용 웹 MVP.

- 시민용 **운동할 곳 찾기**: 상황을 말로 적으면(규칙 기반) 무장애·실내·어르신/장애인 프로그램 조건을 뽑아 시설을 추천
- 행정용 **격차 지도**: 65세 이상 + 등록장애인 1만 명당 공공체육시설 점수를 경기도 평균(=100)과 비교, 투자 시뮬레이션

지금 들어 있는 시설·인구는 **예시(DEMO) 데이터**이며 화면에 그대로 표시된다. 공공데이터를 받으면 `app/src/data/dataset.json`을 교체한다.

## 격차 지도 아래 · 예산 배분 실시간 시뮬레이터
`#/map` 화면 아래에 붙는 빌드 없는 섹션. 총 예산·시설 1곳 비용·배분 방식(최하위 우선 / 인구 비례 / 균등)·대상 집단 가중치를 슬라이더로 바꾸면 **웹 워커**가 시설을 한 곳씩 투입하며 31개 시군 지수를 다시 계산하고, SVG 지도 재착색 + 캔버스 그래프 + 기록 재생(되감기)으로 보여 준다. 인구를 ±N% 흔들어 여러 번 재계산한 범위 띠로 결론의 안정성도 표시.
- `assets/sim-data.js` 번들에서 추출한 시군 인구·시설 공급 점수·경계 경로 (번들 데이터를 바꾸면 같이 갱신)
- `assets/sim.js` 워커 + 지도 + 그래프 · `assets/sim.css`
- 지수 정의는 `engine/score.ts`와 동일 (대상 1만 명당 공급 점수 ÷ 경기도 평균 × 100)

## 구조
- `app/` React + TypeScript + Vite. `npm run build` → `sportsgap/index.html`, `sportsgap/assets/`
- `app/src/engine/score.ts` 접근성 지수 · `match.ts` 말로 찾기/추천 · `engine.test.ts`
- `tools/geo.py` 시군 경계(southkorea-maps, KOSTAT 2013 단순화본) → SVG 경로
- `tools/demo.py` 예시 데이터 생성

## 실행
```
cd sportsgap/app
npm install
npm test
npm run dev
```
