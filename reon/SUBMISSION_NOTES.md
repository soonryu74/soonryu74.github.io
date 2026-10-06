# SUBMISSION_NOTES — 제출 메모 (다시ON AI)

## 제출물 위치
| 항목 | 위치 |
|---|---|
| 서비스 | https://soonryu74.github.io/reon/ (main 병합 후 자동 배포) |
| 심사위원 모드 | https://soonryu74.github.io/reon/demo.html |
| 소스 | `reon/` (빌드 없음, 바닐라 JS ES 모듈) |
| 스크린샷 10장 | `reon/evidence/screenshots/01_home.png … 10_mobile.png` (`node reon/scripts/screenshots.mjs` 로 재생성) |
| 문서 | README · REON_AUDIT · IMPLEMENTATION_PLAN · ARCHITECTURE · DATA_SOURCES · QA_REPORT · DEMO_SCRIPT (모두 `reon/`) |

## 심사기준 대응
| 평가항목 | 증거 |
|---|---|
| 정의·대상 적합성 | 홈 첫 화면 메시지, Persona A/B/C 원클릭 체험, "직업 이름을 몰라도 됩니다" |
| AI·데이터 타당성 | 역량 추출 → 매칭 → Gap → 설명 모듈 분리(`js/engine/`), Career Transition Score 가중치 공개, 미반영 요소 명시, DATA_SOURCES.md |
| 실행계획 | 고용24 OPEN-API 어댑터·수집 스크립트·캐시 전환 구조, `.env.example`, IMPLEMENTATION_PLAN.md |
| 독창성·차별성 | 검색이 아닌 "경력 번역 → 전환 경로", 설명 가능한 추천(Evidence 페이지), 사람이 역량을 최종 수정 |
| 기대효과 | 직무→Gap→훈련→채용을 고용24 한 여정으로 연결, 리포트의 "다음 행동 3가지" |

## 정직성 체크(금지사항 준수)
- 존재하지 않는 API 를 만들어 쓰지 않음(미확인 항목은 DATA_SOURCES.md 에 "미확인" 표기).
- 훈련·채용 DEMO 는 배지·문구·원문 없음으로 실제와 구분. 가짜 통계·전망 수치 없음.
- 로그인·회원가입 없음. Coming Soon 없음. 모든 버튼이 동작(QA 통과).
- 기존 저장소 파일·Supabase 데이터 변경 없음(루트 README 에 링크 1줄, .gitignore 에 .env 추가만).
- API 키 커밋 없음.

## 알려진 한계
1. 역량 추출이 키워드 규칙이라 표현이 다른 문장(예: "손님들 불만을 잘 풀었다")은 놓칠 수 있음 → AI_ENDPOINT 연결 또는 동의어 확장으로 개선.
2. 직무 사전 18개는 중장년 전환 수요가 큰 직무 위주 수기 정리. 고용24 직업정보 연결로 확장 필요.
3. 직업전망·임금·지역 접근성 미반영(가중치 25%는 재정규화).
4. 고용24 OPEN-API 는 기업회원 전용이라는 2차 출처가 있어 개인 참가자의 키 발급 가능 여부를 먼저 확인해야 함.

## 다음 단계(2차 기능심사 대비)
1. 고용24 OPEN-API 키 발급 → `fetch_work24.py` 응답 항목 대조 → GitHub Actions 주기 수집(`.github/workflows/`에 추가) → 캐시 전환 확인.
2. 직업정보 상세(능력·지식·전망·임금) 연결 → 점수 요소 2개 반영.
3. 서버리스 함수(AI_ENDPOINT)로 LLM 기반 역량 추출 연결, 규칙 분석기는 fallback 유지.
4. 실무자(고용센터 상담사) 3명 테스트: TOP3 중 "검토할 가치 있는 직무" 1개 이상 발견 비율, 이유 문장 이해도 5점 척도.
