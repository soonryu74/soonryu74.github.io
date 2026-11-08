# 멍 런 (Meong Run)

누군가 달리는 모습을 그냥 멍하게 바라보는 웹앱. 의존성 없는 정적 HTML 한 장.

## 구성
```
meong-run/
├── index.html   앱 본체
├── videos.js    영상 목록 (파일명·제목)
├── videos/      Flow에서 내려받은 mp4
└── PROMPTS.md   Flow(Veo 3.1) 프롬프트
```

## 사용법
1. `PROMPTS.md`의 프롬프트로 Flow에서 영상 생성 → mp4 다운로드
2. `videos/` 폴더에 넣기
3. `videos.js`에 한 줄 추가
   ```js
   { src: "videos/bridge.mp4", title: "다리 위, 해질녘", note: "scene 01", loop: false },
   ```
4. 로컬에서 열기 (브라우저 자동재생 정책 때문에 파일 더블클릭 말고 서버로 열기)

| | Windows (PowerShell) | Mac (Terminal) |
|---|---|---|
| 폴더 이동 | `cd .\meong-run` | `cd meong-run` |
| 서버 실행 | `python -m http.server 8000` | `python3 -m http.server 8000` |
| 접속 | http://localhost:8000 | http://localhost:8000 |

파이썬이 없으면 두 OS 공통: `npx serve .`

## 조작
| 키 | 동작 |
|---|---|
| Space | 일시정지 |
| → | 다음 장면 |
| M | 소리 켜기/끄기 |
| F / 더블클릭 | 전체화면 |

3초 동안 가만히 있으면 커서와 버튼이 사라진다.

## 배포
정적 파일이라 GitHub Pages, Netlify, Vercel 어디든 폴더째 올리면 끝. 영상 용량이 크면(장당 20MB+) Netlify/Vercel이 더 편함.
