# 먼저 찾아오는 복지 비서

2026 사회보장 데이터 활용 AI 혁신 아이디어 경진대회(한국사회보장정보원·대구가톨릭대, 복지부 후원) 출품 준비 폴더.
복지로 공개 API(중앙부처·지자체 복지서비스)를 매일 읽어 AI가 지원 조건을 구조화하고, 사용자 프로필과 대조해 새로 생긴·바뀐·마감 임박 서비스를 먼저 알리고 쉬운말 요약·서류 체크리스트까지 만들어 주는 서비스 제안.

| 파일 | 내용 |
|---|---|
| `docs/제안서_먼저찾아오는복지비서.docx` | **제출용 제안서** (서식 4 구조, 4쪽). 한글에서 열어 `.hwp`로 저장 후 제출 |
| `docs/제안서_먼저찾아오는복지비서_미리보기.pdf` | 위 문서 미리보기 |
| `docs/PROPOSAL.md` | 제안서 원고(초안, 마크다운) |
| `docs/OFFICIAL_NOTICE.md` | 공고문·서식 원문 텍스트 |
| `docs/STRUCTURING_TRIAL.md` | 상세 40건 AI 구조화 시험 결과 |
| `docs/CONTEST_STRATEGY.md` | 대회 정보·평가항목 대응·예상 질문·제출 체크리스트 |
| `scripts/fetch_bokjiro.py` | 중앙부처복지서비스 API 수집 (`DATA_GO_KR_KEY` 환경변수). 2026-11-01 461건 목록·40건 상세 수집 확인 |
| `scripts/structure_trial.py` | 상세 문장 → 조건 JSON 구조화 시험 (Gemini API, 모델 교체 가능) |
| `scripts/make_proposal.js` | 제안서 DOCX 생성 (`node make_proposal.js out.docx`) |
| `data/` | 수집 결과 JSON (git 제외, `structuring_trial.json`만 포함) |

접수 마감 2026-11-20. 본선 발표 12-03.
