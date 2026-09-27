# 유튜브 자동화 스튜디오 (`yt-studio/`)

주제 한 줄 → 대본 → 음성 → 장면 → 자막 입힌 영상 → 썸네일 3종 → 유튜브 비공개 업로드.

| 파일 | 역할 |
| --- | --- |
| `index.html` | 웹 스튜디오: 로컬 AI·Gemini 로 기획, 제목 금지어 검사, 장면 편집, 음성 미리듣기, 썸네일 3종 미리보기, `project.json` 내보내기 |
| `guide.html` | 설치 안내 (윈도우·맥 명령어 비교, 업로드 연결, 예약 실행) |
| `pipeline/app.py` · `시작하기.bat` · `시작하기.command` | **SaGA 영상 제작실** — 내 컴퓨터 웹 화면(127.0.0.1:7860). 응원 릴레이·칼럼·강의 쇼츠·추천 영상·썸네일을 버튼으로 |
| `pipeline/studio.py` | 명령줄 프로그램: `doctor` · `plan` · `make` · `upload` · `auto` · `batch` · `voices` |
| `pipeline/ytauto/` | 대본(llm·prompts), 음성(tts), 장면(visuals), 합성(assemble), 썸네일(thumbs), 업로드(upload) |

빠른 시작 (자세한 내용은 `guide.html`):

```bash
cd yt-studio/pipeline
python3 -m venv .venv && source .venv/bin/activate   # Windows: py -m venv .venv ; .venv\Scripts\Activate.ps1
pip install -r requirements.txt
cp config.example.json config.json                    # Windows: copy config.example.json config.json
python3 studio.py doctor
python3 studio.py auto "엑셀 반복작업 무료 AI 자동화" --minutes 5
```

`config.json`, `client_secret.json`, `token.json`, `projects/` 는 `.gitignore` 로 제외됩니다.
