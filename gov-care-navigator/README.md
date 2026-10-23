# 🏛️ 국민 곁에 ON (Gov-Care Navigator)
> **2026년 공공 AI 대전환 챌린지 [세션 1: AI 정부 실험실 챔피언십] 출품작**

## 1. 주요 기능
- **신청주의 타파 & 부처 칸막이 해체**: 질병청·복지부·지자체 지침 동시 탐색.
- **수리적 규칙 엔진 + 멀티 LLM 하이브리드**: 파이썬 수식 검증으로 환각(Hallucination) 방지.
- **행안부 공통기반 4대 모델 실시간 교체**: Gemma, EXAONE, HyperCLOVA X, Solar 어댑터 지원.
- **원본 절대 보호(Read-Only)**: `input_readonly/` 읽기 전용 보호 및 `output_generated/` 격리 저장.

## 2. 폴더 구성
```
gov-care-navigator/
├─ app.py              # Streamlit 앱 본체
├─ requirements.txt    # 필요 패키지 (streamlit, pandas)
├─ run.bat             # Windows 더블클릭 실행
├─ run.sh              # Mac / Linux 실행
├─ input_readonly/     # 실행 시 자동 생성 (원본 지침, 읽기 전용)
└─ output_generated/   # 실행 시 자동 생성 (산출물 격리 저장)
```

## 3. 구동 방법

### 사전 준비
Python 3.10 이상이 설치되어 있어야 합니다. 터미널에서 확인하세요.

| | Windows (PowerShell / CMD) | Mac (터미널) |
| :--- | :--- | :--- |
| 버전 확인 | `python --version` | `python3 --version` |
| 설치 안 됐을 때 | https://www.python.org/downloads/ 에서 설치 (설치 시 **Add python.exe to PATH** 체크) | `brew install python` 또는 python.org에서 설치 |

### 방법 A. 스크립트로 한 번에 실행

| Windows | Mac |
| :--- | :--- |
| `run.bat` 더블클릭 | 터미널에서 아래 두 줄 실행 |
| | `chmod +x run.sh` (최초 1회) |
| | `./run.sh` |

### 방법 B. 직접 명령어 입력

| 단계 | Windows (PowerShell / CMD) | Mac (터미널) |
| :--- | :--- | :--- |
| 1. 폴더 이동 | `cd 경로\gov-care-navigator` | `cd 경로/gov-care-navigator` |
| 2. 가상환경 생성 (권장, 최초 1회) | `python -m venv .venv` | `python3 -m venv .venv` |
| 3. 가상환경 활성화 | `.venv\Scripts\activate` | `source .venv/bin/activate` |
| 4. 패키지 설치 | `pip install -r requirements.txt` | `pip install -r requirements.txt` |
| 5. 앱 실행 | `streamlit run app.py` | `streamlit run app.py` |

> PowerShell에서 3단계가 "스크립트 실행이 비활성화" 오류로 막히면 아래를 한 번 실행한 뒤 다시 시도하세요.
> `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`

### 접속
브라우저에서 `http://localhost:8501` 접속 후 시나리오 원클릭 테스트.
종료는 터미널에서 `Ctrl + C` (Windows / Mac 동일).

## 4. 자주 생기는 문제
| 증상 | 원인 / 해결 |
| :--- | :--- |
| `streamlit: command not found` | 가상환경이 활성화되지 않음. 3단계를 다시 실행하거나 `python -m streamlit run app.py` 로 실행 |
| 포트 8501 사용 중 | `streamlit run app.py --server.port 8502` 처럼 다른 포트 지정 |
| 한글 깨짐 (Windows CMD) | `chcp 65001` 입력 후 실행 (run.bat에는 포함됨) |
