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

## 투입 원문

| 문서 | 발행 | 출처 | PDF SHA-256 |
| --- | --- | --- | --- |
| 2026년 긴급복지지원사업 안내 (240쪽) | 보건복지부 기초생활보장과, 2026-01 | [mohw.go.kr 게시물](https://mohw.go.kr/board.es?act=view&bid=0009&list_no=1488509&mid=a10402000000) | `bf4db81bd42d61e6…` |
| 2026 국가결핵관리지침 (674쪽) | 질병관리청 결핵정책과, 2026-01-05 | [결핵ZERO 관리지침](https://tbzero.kdca.go.kr/tbzero/board/boardView.do?leftMenuId=8&paramMenuId=82&boardSeq=9206) | `e5ab1b685a816d82…` |

원본 PDF는 용량(5MB·20MB) 때문에 저장소에 넣지 않고 추출 텍스트만 커밋합니다. 다시 만들려면:

```
python scripts/build_corpus.py "2026년 긴급복지지원사업 안내.pdf" MOHW_EMG_2026 14
python scripts/build_corpus.py "2026 국가결핵관리지침.pdf" KDCA_TB_2026 16
```

## 폴더 구성

```
gov-care-on/
├─ app.py                     # 앱 본체
├─ requirements.txt
├─ .streamlit/config.toml     # 테마
├─ input_readonly/
│   ├─ rules.json             # 제도별 판정 규칙 (쪽수 인용)
│   └─ corpus/*.json          # 지침 원문 페이지 텍스트
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

## 한계

- 판정은 상담 텍스트의 키워드와 소득 비율에 기반한 **1차 스크리닝**입니다. 재산·금융재산 조사, 위기상황 현장확인 등 최종 결정은 담당 공무원의 몫입니다.
- 지자체 자체 사업(찾아가는 돌봄 등)은 원문을 확보한 뒤 `rules.json`에 추가해야 합니다.
