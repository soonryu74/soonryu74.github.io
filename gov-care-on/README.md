# 국민 곁에 ON (Gov-Care Navigator)

질병관리청·보건복지부·지자체 지침을 한 번에 대조해 위기 가구의 지원 자격을 판정하고,
기안문·사전기입 신청서·쉬운말/다국어 안내장 3종을 생성하는 Streamlit 앱입니다.

## 폴더 구성

```
gov-care-on/
├─ app.py                 # 앱 본체
├─ requirements.txt       # 의존성 (streamlit, pandas)
├─ .streamlit/config.toml # 테마
├─ input_readonly/        # 원본 지침 (읽기 전용, 샘플 JSON 포함)
├─ output_generated/      # 생성 산출물 (git 제외)
├─ run_windows.bat        # 윈도우 실행 스크립트
└─ run_mac.sh             # 맥 실행 스크립트
```

## 로컬 실행

### 한 번에 실행 (가상환경 자동 생성)

| 윈도우 | 맥 |
| --- | --- |
| `run_windows.bat` 더블클릭 | 터미널에서 `./run_mac.sh` |

### 직접 실행

| 단계 | 윈도우 (PowerShell) | 맥 (터미널) |
| --- | --- | --- |
| 폴더 이동 | `cd gov-care-on` | `cd gov-care-on` |
| 가상환경 생성 | `python -m venv .venv` | `python3 -m venv .venv` |
| 가상환경 활성화 | `.venv\Scripts\Activate.ps1` | `source .venv/bin/activate` |
| 패키지 설치 | `pip install -r requirements.txt` | `pip install -r requirements.txt` |
| 실행 | `streamlit run app.py` | `streamlit run app.py` |

실행하면 브라우저에 `http://localhost:8501` 이 열립니다.

> 윈도우에서 `Activate.ps1` 실행이 막히면 PowerShell에서 한 번만
> `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` 를 실행하세요.

## Streamlit Community Cloud 배포

1. https://share.streamlit.io 접속 → GitHub 로그인
2. **Create app** → **Deploy a public app from GitHub**
3. 입력값
   - Repository: `soonryu74/soonryu74.github.io`
   - Branch: 배포할 브랜치 (예: `main`)
   - Main file path: `gov-care-on/app.py`
4. **Deploy** 클릭

`requirements.txt` 가 같은 폴더에 있어 자동으로 설치됩니다.

## LLM 연결 (선택)

사이드바에서 API 주소를 입력하면 실제 모델을 호출합니다. 비워 두면 내장 템플릿 엔진으로 동작하므로
인터넷·외부 서버 없이도 시연할 수 있습니다.

| 모델 | API 주소 예시 |
| --- | --- |
| Ollama (로컬) | `http://localhost:11434/api/generate` |
| OpenAI 호환 서버 | `http://localhost:8000/v1/chat/completions` |

## 주의

앱에 포함된 지침·금액·서식명은 시연용 모의 데이터입니다.
