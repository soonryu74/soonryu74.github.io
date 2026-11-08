---
name: ebook-maker
description: 주제·강의·글을 "읽는 웹북"(세로 A5 책형, 한 쪽씩 넘기는 전자책)으로 만드는 스킬. HTML 웹북 + A5 PDF 를 함께 만든다. 주제만 주면 원고(콘티→본문)까지 쓰고, 공통 뼈대 + 주제별 포인트색 테마를 자동 적용하며, 모바일·야간모드·영상·QR·차례 점프를 지원한다. 사용자가 "웹북 만들어", "이북 만들어", "전자책으로 만들어", "읽는 책으로", "flipbook", "이 주제로 책 써 줘", "강의를 책으로"를 요청할 때 사용한다. 글자는 AI 그림에 넣지 않고 HTML 텍스트로 렌더링한다.
---

# 웹북 메이커 (ebook-maker)

주제 하나, 또는 강의·글 재료를 **읽는 웹북**으로 만든다.
세로 A5 책형(148:210) 종이를 한 쪽씩 넘기며, 휴대폰에서는 화면을 꽉 채운다. 같은 파일을 인쇄하면 A5 PDF 가 된다.

## 결과물

```
mybook/
  book.md      ← 원고(콘티+본문). 사람이 읽고 고칠 수 있는 유일한 원본
  index.html   ← build.py 가 만든 웹북 (단일 파일, 넘김·차례·영상·야간모드 내장)
  index.pdf    ← pdf.js 가 만든 A5 PDF
  img/         ← (선택) 표지·삽화 webp
```

- **공통 뼈대 + 주제별 포인트색**: 종이·잉크·선은 모든 책이 같고, 포인트색 4개만 주제에 따라 바뀐다(`assets/themes.md`). 주제 키워드로 자동 선택.
- **삽화**: 이미지가 없어도 완성되도록 인라인 SVG 삽화 9종 내장(`svg:` 필드). `img/` 에 파일을 넣으면 교체.
- **영상**: 유튜브 ID 만 넣으면 썸네일+재생+QR(segno 설치 시). PDF 에도 QR 과 링크가 남는다.

## 작업 흐름

### 0. 확인 질문 (한 번만, AskUserQuestion 으로)
재료가 주제 한 줄뿐이어도 아래만 확인하고 바로 만든다. 이미 답이 있는 항목은 묻지 않는다.
1. **독자**: 입문(50대도 따라할 수 있게) / 직장인 실무 / 전문가
2. **분량**: 20~30쪽(기본, 절 5~7개) / 10~15쪽 / 40쪽 이상
3. **영상**: 유튜브 ID 있음(절마다 / 끝에 하나) / 없음
4. **저자·브랜드·시리즈명·다음 챕터 링크** (없으면 비워 둠)
테마는 자동 매칭이 기본. 사용자가 색을 지정하면 그것이 우선(`theme:` 또는 `--theme`).
질문이 끝나면 "준비됐습니다. 만들겠습니다." 한 줄 후 바로 시작한다.

### 1. 콘티 → 2. 원고 (book.md)
- 재료(강의 노트·글)가 있으면 **내 말로 다시 쓴 요약**으로, 없으면 주제만으로 원고를 쓴다.
- 쪽 단위 콘티를 먼저 세우고(표지→차례→절마다 오프너→본문 2~4쪽→정리/체크→영상→맺음) 각 쪽을 채운다.
- 문법·작성 원칙은 **`assets/writing-guide.md`** 를 따른다. 핵심: **한 쪽 = 한 메시지, 450자 이내, 이야기 톤, 전문용어는 비유로.**

### 3. 빌드 → 4. 검증 → 5. PDF
```bash
python3 assets/build.py mybook/book.md        # → mybook/index.html  (쪽수·테마·경고 출력)
node assets/preview.js mybook/index.html      # 쪽마다 스크린샷 + 넘침 경고 (mybook/preview/)
node assets/pdf.js mybook/index.html          # → mybook/index.pdf (A5)
```
- build 의 `⚠` 경고(글자 수 초과, 필드 누락)는 **모두 해결**한다. preview 의 "넘침" 도 0이 될 때까지 쪽을 나눈다.
- 스크린샷을 실제로 열어 본다: 표지·차례·본문·영상·맺음 최소 5장. 야간은 `--night`, 데스크톱은 `--desktop`.
- front matter `pdf: index.pdf` 를 넣어야 화면 오른쪽 위 PDF 버튼이 생긴다.

### 6. 전달
폴더 구조와 함께 `index.html` 열어 보는 법, 수정은 `book.md` 고치고 다시 빌드하면 된다는 점을 알린다.

## 쪽 유형 (book.md 의 `== 유형`)

| 유형 | 쓰임 | 필수 |
|---|---|---|
| `cover` | 표지 | (front matter 의 title 사용) |
| `toc` | 차례 — `open` 쪽에서 자동 생성 | 없음 |
| `open N` | 절 오프너(번호·제목·부제) | `title:` |
| `body` | 본문(글, 또는 그림+글) | `h:` |
| `steps` | 따라 하기 단계(번호 카드) | `h:` + `1. **제목** — 설명` |
| `check` | 체크리스트 | `h:` + `- 항목` |
| `quote` | 인용 한 쪽 | 본문 한 문장 |
| `video ID` | 영상 + QR | 유튜브 ID |
| `close` | 맺음 / 다음 챕터 CTA | `title:` |
| `raw` | 직접 HTML | — |

공통 필드: `img:` `svg:` `svgtext:` `caption:` `note:` `label:`. 내장 SVG: hero · flow · compare · stairs · cycle · bulb · chart · check · tools.

## 터미널 명령 (Windows / Mac)

| 할 일 | Windows (PowerShell) | Mac (터미널) |
|---|---|---|
| 빌드 | `py assets\build.py mybook\book.md` | `python3 assets/build.py mybook/book.md` |
| 열어 보기 | `start mybook\index.html` | `open mybook/index.html` |
| PDF | `node assets\pdf.js mybook\index.html` | `node assets/pdf.js mybook/index.html` |
| QR 준비(1회) | `py -m pip install segno` | `pip3 install segno` |
| PDF 준비(1회) | `npm i playwright; npx playwright install chromium` | 동일 |

Playwright 가 없으면 브라우저에서 **인쇄 → PDF 저장**(용지 A5, 여백 없음, 배경 그래픽 켬)으로 대신한다.

## 디자인 원칙 (바꾸지 말 것)

- 본문 명조(Noto Serif KR) 16px 안팎, 행간 1.9, `word-break:keep-all`. 제목·UI 는 Pretendard.
- 한 줄 22~32자, 한 쪽 2~4문단. 여백이 가독성이다.
- 포인트색은 **기능에만**: 번호·규칙선·강조 배경·버튼. 본문 글자색으로 쓰지 않는다.
- 테마를 추가하려면 `template.html` 의 `[data-theme=…]` 4개 변수와 `build.py` 의 THEMES 키워드를 함께 추가한다.

## 하면 안 되는 것

- AI 그림 안에 글자 넣기 → 글자는 HTML. SVG 삽화의 라벨도 `svgtext:` 로 넣는다.
- 남의 유료 강의·글을 그대로 복붙 → 내 말로 다시 쓴 학습자료로. 이미지는 직접 만들거나 라이선스 확인.
- 한 쪽에 몰아넣기 → build 경고가 뜨면 쪼갠다.
- 과장·낚시 제목 → 정직한 약속 한 줄. (제목 공식은 writing-guide.md)
- `index.html` 을 직접 고치기 → 항상 `book.md` 를 고치고 다시 빌드한다.
