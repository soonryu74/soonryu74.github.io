# 지역 건강프로파일 대시보드 — 시작 안내

이 폴더는 Cowork(모바일 세션)에서 작업한 내용을 클로드 코드로 인수인계하는 패키지입니다.
`CLAUDE.md`에 전체 맥락이 들어 있어서, 클로드 코드를 켜면 자동으로 읽고 이어서 작업합니다.

## 1. 클로드 코드 설치 (처음 한 번만)

**윈도우 (PowerShell 실행 후):**
```powershell
irm https://claude.ai/install.ps1 | iex
```

**맥 (터미널 실행 후):**
```bash
curl -fsSL https://claude.ai/install.sh | bash
```

설치가 안 되면 Node.js 방식(윈도우/맥 동일):
```
npm install -g @anthropic-ai/claude-code
```

## 2. 시작하기

압축을 푼 이 폴더로 이동한 뒤 클로드 코드를 실행합니다.

**윈도우 (PowerShell):**
```powershell
cd $HOME\Downloads\health-dashboard
claude
```

**맥 (터미널):**
```bash
cd ~/Downloads/health-dashboard
claude
```

처음 실행하면 로그인 안내가 나옵니다 (Claude 계정 그대로 사용).

## 3. 첫 지시 (복사해서 붙여넣기)

```
CLAUDE.md 읽고 현재 상태 요약해줘. 그 다음 김동현 교수 엑셀 DB부터 검증하자.
파일 위치는 다운로드 폴더의 "지역사회 건강결과 및 건강 결정요인 DB 1.7v.xlsx"야.
```

## 폴더 구성

- `CLAUDE.md` — 프로젝트 전체 맥락 (클로드 코드가 자동으로 읽음)
- `prototype/` — 디자인 확정된 대시보드 프로토타입 (샘플 데이터)
- `docs/` — 랭킹 기획안 등 문서
- `scripts/kosis_collect.py` — KOSIS 지표 인벤토리 수집 시작 스크립트
- `.env` — KOSIS API 키 (**절대 GitHub에 올리지 말 것**, .gitignore에 이미 등록됨)
