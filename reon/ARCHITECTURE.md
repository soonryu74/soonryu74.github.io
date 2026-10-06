# ARCHITECTURE — 다시ON AI

## 1. 한 장 요약
```
[브라우저 — 정적 파일(GitHub Pages)]
 index.html ─ js/app.js (해시 라우터, 세션 상태)
    │
    ├─ views/  home → input → analyzing → skills → jobs → gap/:id → training/:id → openings/:id → report, evidence
    │
    ├─ engine/ careerAnalyzer ─┬─ adapters/ai.js ──(AI_ENDPOINT 있을 때만)──▶ 본인 서버(키 보관) ──▶ LLM
    │                          │        └─ 없거나 실패 ▶ skillExtractor(규칙, DEMO 표기)
    │                          ├─ jobMatcher (Career Transition Score)
    │                          ├─ gapAnalyzer
    │                          └─ explanationGenerator (이유 문장 + Evidence)
    │
    ├─ adapters/work24.js ──▶ data/cache/*.json (있으면 "고용24 수집 데이터") ── 없으면 ▶ data/training.js, openings.js (DEMO)
    │
    └─ state.js ──▶ sessionStorage (서버 저장 없음)

[서버측(선택) — GitHub Actions]
 scripts/fetch_work24.py + WORK24_API_KEY(Secret) ──▶ 고용24 OPEN-API ──▶ data/cache/{training,openings}.json 커밋
```

## 2. 왜 이 구조인가
- 저장소가 GitHub Pages 정적 호스팅이라 서버 코드가 없다. 인증키가 필요한 공공 API는 브라우저에서 직접 부르면 키가 노출되므로, **수집 스크립트 → 캐시 JSON → 화면** 구조로 분리했다.
- 빌드 단계 없이(바닐라 JS, ES 모듈) 동작해 심사·수정·배포가 단순하다. 저장소의 다른 하위 사이트와 같은 방식이다.
- AI 분석기와 규칙 분석기는 **같은 출력 형식**(`{mode, skills:[{id, evidence, from}]}`)을 내므로 UI는 동일하고, 화면에 mode 배지만 바뀐다.

## 3. 모듈
| 파일 | 역할 | 입력 → 출력 |
|---|---|---|
| `engine/careerAnalyzer.js` | 파이프라인 진입점 | input → analysis / profile → ranked jobs / gap |
| `engine/skillExtractor.js` | 규칙 기반 역량 추출(DEMO) | text, quals → `[{id, hits, evidence[], from}]` |
| `engine/jobMatcher.js` | Career Transition Score | profile → `[{jobId, score, parts{transfer,prefs,barrier,outlook,access}}]` |
| `engine/gapAnalyzer.js` | 갖춤/보완/자격(필수·권장) | job, profile → `{have, improve, requiredQuals, recommendedQuals, blocked}` |
| `engine/explanationGenerator.js` | 이유 문장·Evidence | job, match → `{why, strengths, improve}` / session → evidence |
| `adapters/ai.js` | 원격 AI ↔ 규칙 분석기 | text → `{mode:'ai'|'demo', skills, error}` |
| `adapters/work24.js` | 고용24 캐시 ↔ DEMO | → `{source:{mode:'live'|'demo', …}, items}` |
| `state.js` | 세션 상태 | sessionStorage `reon.session.v1` |

## 4. 점수(Career Transition Score)
| 요소 | 가중치 | 현재 데모 | 계산 |
|---|---|---|---|
| 전이역량 유사도 | 40% | 반영 | 일치 핵심역량 가중합 / 직무 핵심역량 가중합 + 보조역량 보너스(최대 0.15) |
| 희망조건 적합도 | 20% | 반영 | 근무시간·근무형태 선호 ↔ 직무 일반 근무 패턴(수기 정리). 희망임금 미반영 |
| 진입장벽 | 15% | 반영 | 필수 자격 보유 여부 × 교육 의향 × 직무 진입장벽 수준 |
| 직업전망·노동시장 | 15% | **미반영** | 고용24 직업정보 상세 연결 예정 |
| 지역·근무형태 접근성 | 10% | **미반영** | 지역별 채용 밀도 데이터 없음 |
미반영 요소는 적용 가중치 합(75%)으로 재정규화. 화면의 "점수는 어떻게 계산했나요?" 와 Evidence 페이지에 그대로 표시.

## 5. 데이터 파일
| 파일 | 건수 | 성격 |
|---|---|---|
| `data/skills.js` | 역량 40 · 자격 12 | 수기 정리 사전(키워드 규칙 포함) |
| `data/jobs.js` | 직무 18 | 수기 정리. 핵심·보조 역량, 필수·권장 자격(공식 링크), 근무 패턴, 진입장벽 |
| `data/training.js` | 16 | DEMO(고용24 훈련과정 API 항목에 맞춘 구조) |
| `data/openings.js` | 25 | DEMO(고용24 채용정보 API 항목에 맞춘 구조, 원문 없음) |
| `data/personas.js` | 5 | 가상 사례 |
| `data/regions.js` | 17 시도 | `dolbom/assets/regions.js` 복사 |
| `data/cache/*.json` | 0 | 수집 전 빈 캐시 |

## 6. 라우팅·상태 보호
- 해시 라우트. 분석 전에 `#/jobs` 등으로 들어오면 `#/input` 으로 안내(막히는 화면 없음).
- 새로고침해도 sessionStorage 로 복원. "내 기록 지우기"로 전부 삭제.

## 7. 접근성
기본 글자 18px(가+/가++ 전환, localStorage), 버튼 최소 44~50px, 포커스 링, `aria-live` 로딩 안내, `aria-current` 단계 표시, 키보드로 전 과정 진행 가능, 390px 가로 스크롤 0px(QA 확인), 인쇄용 CSS.
