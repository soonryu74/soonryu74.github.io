# IMPLEMENTATION_PLAN — MoveSafe AI (2026-10-21)

## 왜 주제를 바꿨나
2026 경기스포츠산업 공모전은 "앱/웹 서비스, 스포츠 용품 등 혁신 스포츠산업 **기술·제품**"을 모집하며 5개 분야(경기력 향상 / 대회 운영 / 관람·중계·콘텐츠 / 안전·시설 관리 / 친환경·편의)를 둔다. 먼저 만든 SportsGap AI(지자체용 체육시설 격차 분석)는 정책 분석 도구라 분야 적합성이 약했다(`sportsgap/README.md` 참고). MoveSafe AI 는 **경기력 향상 기술 — 스마트 트레이닝·부상 예방·재활·뉴트리션**에 직접 해당하는 이용자용 제품이다.

## 제품 정의
| 항목 | 내용 |
|---|---|
| 한 줄 | 웹캠으로 스쿼트·런지·점프 착지 자세를 브라우저 안에서 분석해 부상 위험 동작을 즉시 알려주고 예방 루틴을 주는 폼 코치 + 스포츠 영양 가이드 |
| 사용자 | 생활체육인, 학생 선수, 동호회·학교 지도자, 재활 후 복귀자 |
| 핵심 가치 | 코치가 옆에 없어도 "무릎 모임·딱딱한 착지·비대칭"을 스스로 확인. 영상이 기기를 떠나지 않음. 근거(FIFA 11+, ACSM/AND/DC, AIS/IOC, WADA)가 화면 안에 있음 |
| 기술 | MediaPipe Pose Landmarker(브라우저 WASM/GPU) + 순수 JS 규칙 엔진. 서버·계정·API 키 없음. 정적 호스팅 |
| 수익 모델(가설) | 무료 기본 + 지도자·클럽용 리포트/다인 관리, 재활 기관 화이트라벨. 공모전 단계에서는 검증 전 가설로만 기술 |

## 범위 결정
- 운동 3종(스쿼트·런지·착지, 모두 정면)만 지원. 측면 분석·다른 운동은 다음 단계.
- 지표는 2D 정면 + 3D world 좌표로 계산 가능한 것만: 무릎각, KASR·안쪽 변위, 몸통 기울기, 좌우차, 착지 최소 무릎각, 속도.
- 임계값은 문헌 참고 **선별용**이며 임상 기준이 아님을 모든 화면에 명시.
- 샘플(DEMO) 동작은 합성 골격으로, 사람 데이터가 아님을 배지로 표시. 실제 사용자 검증·도입 실적은 없음(허위 기재 금지).
- 영양: 공동 성명(2016)·ACSM(2007) 범위 계산, AIS A군 보충제 5종 + 단백질, WADA 2026 분류 기반 도핑 주의 성분 23개(최종 확인은 KADA).

## 체크리스트
- [x] 엔진: `js/pose-metrics.js`, `js/exercise-rules.js`, `js/nutrition.js`, 합성 샘플 `js/demo-motion.js`
- [x] 데이터: `data/routines.json`(FIFA 11+·JOSPT·PEP), `data/supplements.json`, `data/doping-watch.json`
- [x] 화면: `index.html`(카메라/영상 파일/샘플, 오버레이, HUD, 실시간 단서, 세션 리포트, 루틴, 인쇄), `nutrition.html`, `about.html`
- [x] 상태 처리: 카메라 거부/없음, 모델 로드 실패, 사람 미검출, 관절 가림, 루틴 데이터 실패
- [x] 접근성·반응형: 키보드 조작(버튼·셀렉트), 390/1440px, 가로 스크롤 없음, 건너뛰기 링크
- [x] 테스트: 단위 14건, E2E 18건(390·1440), 가짜 카메라 스모크(모델 로드·루프)
- [ ] OPEN 실제 사용자(동호회·학생 선수) 5~10명 촬영 테스트로 임계값 보정
- [ ] OPEN 측면 뷰(무릎 전방 이동·허리 굴곡) 지표
- [ ] BLOCKED 배포 URL: `main` 병합 승인 후 `https://soonryu74.github.io/movesafe/`

## 파일 구조
```
movesafe/
├─ index.html · nutrition.html · about.html
├─ css/app.css
├─ js/pose-metrics.js      랜드마크 → 각도·KASR·기울기 (순수 함수)
├─ js/exercise-rules.js    반복·착지 감지, 평가, 세션 요약, 루틴 선택
├─ js/demo-motion.js       합성 샘플 동작(DEMO)
├─ js/nutrition.js         영양·수분·보충제·도핑 (순수 함수)
├─ js/app.js · js/nutrition-app.js   화면 로직 (MediaPipe 지연 로드)
├─ data/routines.json · supplements.json · doping-watch.json
├─ tests/engine.test.mjs · e2e.spec.mjs · camera-smoke.mjs
├─ evidence/ · docs/ · submission/
└─ package.json · playwright.config.mjs
```
