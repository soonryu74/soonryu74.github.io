# 국민 곁에 ON (Gov-Care Navigator)

보건복지부·질병관리청이 공개한 **2026년 지침 원문**을 읽기 전용으로 투입하고, 상담 내용과 대조해
위기 가구가 받을 수 있는 지원을 **조문 쪽수 근거와 함께** 찾아낸 뒤
검토보고(기안문)·사전기입 신청서·쉬운말/다국어 안내장 3종을 생성하는 Streamlit 앱입니다.

## 동작 방식

| 단계 | 내용 | 구현 |
| --- | --- | --- |
| 원문 투입 | 지침 PDF → 페이지 텍스트 JSON (`input_readonly/corpus/`) | `scripts/build_corpus.py` (pypdf) |
| 근거 검색 | 상담 내용 + 제도별 질의로 원문 구절 검색, 인쇄 쪽수 표시 | BM25 (한글 2-gram 토큰) |
| 1차 스크리닝 | 지원 사유 키워드 · 소득 비율(가구원 수별 월 소득 환산) · 제외 사유 · 담당자 확인 항목 | `input_readonly/rules.json` (모든 기준에 쪽수 인용) |
| 제도 간 조정 | 예: 결핵 생활보호비 ↔ 긴급복지 생계지원 중복 불가·우선순위 | `cross_rules` |
| 문서 생성 | 판정 결과 + 근거 구절만 컨텍스트로 넘겨 3종 문서 생성 | OpenAI 호환 Chat API(Upstage Solar·Ollama·EXAONE 등) / 미연결 시 내장 템플릿 |
| 감사 로그 | 엔진·모델·원본 PDF SHA-256·사용 구절·LLM 컨텍스트 전문 | ④ 탭, ZIP에 `00_생성근거_context.txt` 포함 |
| **지침 등록(전 부처 공용)** | 어느 기관이든 지침 PDF 업로드 → 지원대상·소득기준·금액·서식 쪽 선별 → LLM이 규칙 초안 추출(쪽수 인용) → 담당자 수정·승인 → 판정 즉시 반영 | `rule_extractor.py`, `registry/` (LLM 미연결 시 정규식 초안) |

## 투입 원문

| 문서 | 발행 | 출처 | PDF SHA-256 |
| --- | --- | --- | --- |
| 2026년 긴급복지지원사업 안내 (240쪽) | 보건복지부 기초생활보장과, 2026-01 | [mohw.go.kr 게시물](https://mohw.go.kr/board.es?act=view&bid=0009&list_no=1488509&mid=a10402000000) | `bf4db81bd42d61e6…` |
| 2026 국가결핵관리지침 (674쪽) | 질병관리청 결핵정책과, 2026-01-05 | [결핵ZERO 관리지침](https://tbzero.kdca.go.kr/tbzero/board/boardView.do?leftMenuId=8&paramMenuId=82&boardSeq=9206) | `e5ab1b685a816d82…` |
| 2026년 주거급여 사업안내 (369쪽) | 국토교통부 주거복지지원과 | [인천광역시 게시본](https://www.incheon.go.kr/housing/hou050300/3064961) | `255bfaec8b84c7bb…` |

원본 PDF는 용량(5MB·20MB) 때문에 저장소에 넣지 않고 추출 텍스트만 커밋합니다. 다시 만들려면:

```
python scripts/build_corpus.py "2026년 긴급복지지원사업 안내.pdf" MOHW_EMG_2026 14
python scripts/build_corpus.py "2026 국가결핵관리지침.pdf" KDCA_TB_2026 16
python scripts/build_corpus.py "2026년 주거급여 사업안내.pdf" MOLIT_HOUSING_2026 20
```

## 전 부처 확장 방식

1. 상단 **「지침 등록」** 탭에서 소관 기관·제목을 적고 PDF 업로드
2. **규칙 초안 추출**: 지원대상·소득기준·지원금액·서식이 적힌 쪽을 자동 선별해 LLM에 전달, `rules.json`과 같은 스키마의 초안을 쪽수 인용과 함께 생성 (LLM 미연결 시 정규식 초안)
3. **담당자 검토**: 오른쪽 원문 쪽과 대조하며 키워드·소득 %·금액표·제외 사유·서식을 수정. 승인자 기재 후 등록
4. 등록 즉시 **상담 판정 표에 해당 기관 행이 추가**되고, 원문 구절 검색·문서 생성에도 포함
5. 등록 규칙은 `registry/rules/*.json`에 저장되며, 다운로드해 저장소에 커밋하면 영구 보존 (Streamlit Cloud는 재배포 시 초기화)

## 폴더 구성

```
gov-care-on/
├─ app.py                     # 앱 본체
├─ requirements.txt
├─ .streamlit/config.toml     # 테마
├─ input_readonly/
│   ├─ rules.json             # 제도별 판정 규칙 (쪽수 인용)
│   └─ corpus/*.json          # 지침 원문 페이지 텍스트
├─ rule_extractor.py          # 지침 → 규칙 초안 추출(LLM/정규식)
├─ registry/                  # 등록·승인된 타 기관 지침(규칙+원문, git 제외)
├─ scripts/build_corpus.py    # PDF → 코퍼스 변환
├─ output_generated/          # 생성 산출물 (git 제외)
├─ run_windows.bat / run_mac.sh
```

## 로컬 실행

| 윈도우 | 맥 |
| --- | --- |
| `run_windows.bat` 더블클릭 | 터미널에서 `./run_mac.sh` |

직접 실행:

| 단계 | 윈도우 (PowerShell) | 맥 (터미널) |
| --- | --- | --- |
| 폴더 이동 | `cd gov-care-on` | `cd gov-care-on` |
| 가상환경 생성 | `python -m venv .venv` | `python3 -m venv .venv` |
| 가상환경 활성화 | `.venv\Scripts\Activate.ps1` | `source .venv/bin/activate` |
| 패키지 설치 | `pip install -r requirements.txt` | `pip install -r requirements.txt` |
| 실행 | `streamlit run app.py` | `streamlit run app.py` |

> 윈도우에서 `Activate.ps1` 실행이 막히면 `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` 를 한 번 실행하세요.

## LLM 연결

| 제공자 | 설정 |
| --- | --- |
| Upstage Solar (클라우드) | API 키 발급 후 사이드바에 입력, 또는 Streamlit Cloud **Secrets**에 `UPSTAGE_API_KEY = "..."` 저장 |
| Ollama (로컬·폐쇄망) | `ollama pull gemma2` 후 앱에서 "Ollama 로컬" 선택 (주소 `http://localhost:11434/v1/chat/completions`) |
| EXAONE·HyperCLOVA X 등 | OpenAI 호환 Chat Completions 주소·모델명·키 직접 입력 |
| 미연결 | 내장 템플릿 엔진이 판정 결과를 그대로 문서화 (인터넷 불필요) |

LLM에는 판정 결과와 검색된 원문 구절만 전달하며, 없는 금액·조문을 만들지 않도록 시스템 프롬프트로 제한합니다.

## Streamlit Community Cloud 배포

1. https://share.streamlit.io → **Create app**
2. Repository `soonryu74/soonryu74.github.io`, Branch `main`, Main file path `gov-care-on/app.py`
3. (선택) **Advanced settings → Secrets** 에 `UPSTAGE_API_KEY = "..."`
4. **Deploy**

## 검증 방법

| 수준 | 방법 | 어디서 |
| --- | --- | --- |
| 자동 | 규칙의 소득 %·상한액·지원금액·서식 번호·제외 사유·확인 항목이 **인용한 쪽의 원문 텍스트에 실제로 있는지** 전수 대조 | 앱 「✅ 규칙 검증」 탭 또는 `python verify_rules.py` |
| 수동 | 검증표의 "인쇄 쪽"을 원본 PDF에서 펴서 눈으로 비교 | 앱 「규칙 검증 → 원문 쪽 직접 보기」 + 출처 링크의 PDF |
| 문서 | 생성된 기안문의 쪽수 인용을 「④ 감사 로그」의 "LLM에 전달된 컨텍스트"와 대조. 컨텍스트에 없는 숫자가 문서에 있으면 AI가 지어낸 것 | 앱 STEP 3 ④ 탭 |

## 한계

- 판정은 상담 텍스트의 키워드와 소득 비율에 기반한 **1차 스크리닝**입니다. 재산·금융재산 조사, 위기상황 현장확인 등 최종 결정은 담당 공무원의 몫입니다.
- 기본 투입 지침은 3개 기관(보건복지부·질병관리청·국토교통부)이며, 나머지 기관은 「지침 등록」으로 추가합니다.
