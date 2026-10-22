# MoveSafe AI — 부상 예방 폼 코치 · 스포츠 영양

2026 경기스포츠산업 공모전(경기력 향상 기술 — 스마트 트레이닝·부상 예방·재활·뉴트리션) 출품용 MVP. 웹캠(또는 영상 파일)에서 관절을 추정(MediaPipe Pose, 브라우저 안)해 스쿼트·런지·점프 착지의 **무릎 안쪽 쏠림·딱딱한 착지·몸통 기울기·좌우 비대칭**을 실시간으로 알려주고, 세션 리포트와 FIFA 11+ 기반 예방 루틴을 준다. 영양 페이지는 ACSM·AND·DC 2016 지침 범위, AIS A군 보충제 용량, WADA 2026 분류 도핑 주의 성분을 보여준다. 영상·입력값은 기기를 떠나지 않는다. 서버·계정·API 키 없음.

- 실행 주소(main 병합 후): `https://soonryu74.github.io/movesafe/`
- 근거·한계·개인정보: `about.html` · 문서 `docs/` · 제출물 `submission/` · 증빙 `evidence/`
- 의료 진단·치료·재활 처방이 아닌 선별·교육 도구

## 실행 (빌드 없음)
| 하는 일 | 맥(macOS 터미널) | 윈도우(PowerShell) |
|---|---|---|
| 로컬 서버 | 저장소 루트에서 `python3 -m http.server 4181` → `http://127.0.0.1:4181/movesafe/` | `py -m http.server 4181` → 동일 |
| 단위 테스트 | `node --test movesafe/tests/engine.test.mjs` | 동일 |
| E2E(390·1440) | `cd movesafe && npm install && npx playwright install chromium && npx playwright test` | `cd movesafe; npm install; npx playwright install chromium; npx playwright test` |
| 카메라 스모크(가짜 장치) | `node tests/camera-smoke.mjs` (서버 4181 필요) | 동일 |

카메라는 HTTPS 또는 localhost 에서만 켜진다. 샘플(DEMO) 모드는 합성 골격이라 카메라·네트워크 없이 동작하며, URL 해시 `#demo=squat_valgus&speed=2` 로 바로 재생할 수 있다.

## 구조
```
index.html(폼 코치) · nutrition.html(영양) · about.html(근거)
js/pose-metrics.js  랜드마크→지표      js/exercise-rules.js  반복·착지 감지·평가·루틴 선택
js/demo-motion.js   합성 샘플(DEMO)    js/nutrition.js       영양·수분·보충제·도핑
js/app.js · js/nutrition-app.js 화면   data/routines.json · supplements.json · doping-watch.json
tests/engine.test.mjs(14) · e2e.spec.mjs(18) · camera-smoke.mjs
```
