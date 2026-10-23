# SportsGap AI (가칭)

2026 경기스포츠산업 공모전 · 친환경·편의 기술(장애인·고령자 편의 서비스) 출품용 웹 MVP.

- 시민용 **운동할 곳 찾기**: 상황을 말로 적으면(규칙 기반) 무장애·실내·어르신/장애인 프로그램 조건을 뽑아 시설을 추천
- 행정용 **격차 지도**: 65세 이상 + 등록장애인 1만 명당 공공체육시설 점수를 경기도 평균(=100)과 비교, 투자 시뮬레이션

지금 들어 있는 시설·인구는 **예시(DEMO) 데이터**이며 화면에 그대로 표시된다. 공공데이터를 받으면 `app/src/data/dataset.json`을 교체한다.

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
