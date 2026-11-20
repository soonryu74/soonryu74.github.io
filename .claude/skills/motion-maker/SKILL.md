---
name: motion-maker
description: 글 한 편을 넣으면 모션그래픽 영상(mp4)으로 만드는 스킬. 글을 장면으로 나누고, 시안 3종(잉크·페이퍼·팝)을 보여 주고, 브라우저 편집 화면에서 글자·색·길이를 직접 고친 뒤 가로(16:9)·세로 쇼츠(9:16) mp4로 내보낸다. 사용자가 "모션그래픽 만들어줘", "글을 영상으로", "이 글로 쇼츠 만들어줘", "카드뉴스 영상", "설명 영상 만들어줘", "motion-maker", "영상 다시 만들어줘(scenes.js 수정 후)"를 요청할 때 사용한다. 영상 편집 프로그램 없이 Playwright + ffmpeg 로 렌더링한다.
---

# motion-maker — 글 한 편 → 모션그래픽

글을 넣으면 **장면 → 시안 선택 → 화면에서 고치기 → mp4** 순서로 진행한다.
움직임은 전부 "시간 t의 함수"로 계산하므로 몇 번을 다시 만들어도 결과가 같다.

## 파일 구성

| 파일 | 역할 |
|---|---|
| `assets/player.html` | 재생 + 편집 화면(단일 파일). 옆의 `scenes.js`를 읽는다 |
| `assets/scenes.example.js` | 장면 데이터 예시 |
| `scripts/render.cjs` | `player.html`을 프레임 단위로 찍어 mp4로 합친다 |

## 진행 순서

### 1. 작업 폴더 만들기
사용자 작업 폴더 아래 `motion/<영상이름>/` 을 만들고 `assets/player.html`을 **그대로 복사**한다(수정 금지).

### 2. 글 → scenes.js
글을 읽고 `scenes.js`를 쓴다. 규칙:

- 한 장면 = 한 가지 메시지. 글자는 **짧게**(제목 20자 이내, 항목 18자 이내, 항목 최대 4개).
- 첫 장면은 `title`, 마지막은 `outro`. 전체 20~60초(쇼츠는 30초 안팎).
- 길이(`dur`)는 읽는 시간 기준: 제목 4~5초, 항목 n개면 `3 + n`초.
- 강조할 낱말은 `*별표*`로 감싼다(포인트 색). 줄바꿈은 `\n`.
- 원문에 없는 숫자·사실을 지어내지 않는다.

```js
window.MOTION = {
  "meta": { "title": "…", "ratio": "16:9", "fps": 30, "theme": "ink" },
  "scenes": [ { "type": "title", "title": "…", "dur": 4.5 }, … ]
};
```

| type | 쓰는 필드 | 용도 |
|---|---|---|
| `title` | `kicker` `title` `sub` | 여는 장면 |
| `bullets` | `title` `items[]` | 나열 |
| `steps` | `title` `items[]` | 순서가 있는 단계(번호 자동) |
| `number` | `label` `value` `prefix` `suffix` `sub` | 숫자가 올라가는 강조 |
| `quote` | `text` `by` | 한 문장 인용 |
| `compare` | `title` `left{label,items[]}` `right{label,items[]}` | 전/후 비교(오른쪽 강조) |
| `outro` | `title` `sub` | 닫는 장면 |

`meta.ratio`: `"16:9"` 또는 `"9:16"`. `meta.theme`: `ink` · `paper` · `pop`. `meta.accent`: 포인트 색(선택).
각 장면의 `memo`는 사용자가 편집 화면에서 남긴 **움직임 지시**다(아래 4번).

### 3. 시안 3종 보여 주기
```
node <스킬경로>/scripts/render.cjs motion/<영상이름> --preview
```
`preview-ink.png` `preview-paper.png` `preview-pop.png`가 생긴다. 세 장을 사용자에게 보여 주고 고르게 한 뒤 `meta.theme`에 반영한다.

### 4. 화면에서 고치기
사용자에게 `motion/<영상이름>/player.html`을 브라우저로 열라고 안내한다.

| | Mac | Windows |
|---|---|---|
| 열기 | `open motion/<영상이름>/player.html` | `start motion\<영상이름>\player.html` |

- 「✎ 고치기」를 켜고 화면 글자를 눌러 직접 수정, 오른쪽에서 시안·비율·포인트 색·장면 길이·순서 조정.
- 움직임처럼 말로 설명할 것은 「움직임 메모」에 적는다.
- 「scenes.js 저장」으로 내려받아 작업 폴더의 `scenes.js`에 덮어쓴다.

사용자가 돌아오면 `scenes.js`를 다시 읽고, `memo`가 있는 장면은 그 지시를 반영한다
(길이·순서·문구·type 변경으로 해결되면 `scenes.js`만 고친다. 새로운 움직임이 필요할 때만 작업 폴더의 `player.html` 복사본을 고친다). 반영한 `memo`는 지운다.

### 5. 영상 만들기
```
node <스킬경로>/scripts/render.cjs motion/<영상이름>
node <스킬경로>/scripts/render.cjs motion/<영상이름> --bgm 배경음.mp3 --voice 내레이션.mp3 --out 결과.mp4
```
- `--bgm`: 배경음(길이에 맞춰 반복, 끝 1.5초 페이드아웃). `--voice`: 내레이션(배경음은 자동으로 작게).
- 결과는 `output.mp4`. 만든 뒤 `ffprobe`로 길이·해상도를 확인하고, 중간 프레임 한두 장을 뽑아 글자가 넘치거나 잘리지 않았는지 본다.
- 같은 내용을 쇼츠로: `meta.ratio`만 `"9:16"`으로 바꿔 다시 렌더한다.

### 6. 고친 자리만 다시
사용자가 "3번 장면 숫자 바꿔줘"처럼 짚으면 해당 장면만 `scenes.js`에서 고치고 다시 렌더한다. 전체를 새로 쓰지 않는다.

## 준비물 (처음 한 번)

| | Mac | Windows |
|---|---|---|
| Node.js | `brew install node` | `winget install OpenJS.NodeJS.LTS` |
| ffmpeg | `brew install ffmpeg` | `winget install Gyan.FFmpeg` |
| Playwright | `npm i -g playwright && npx playwright install chromium` | 같음 |
| 확인 | `node -v && ffmpeg -version` | 같음 (PowerShell) |

`require('playwright')`가 실패하면 작업 폴더에서 `npm i playwright`를 실행한다.
글꼴은 Noto Sans KR(구글 폰트, 인터넷 필요). 오프라인이면 Mac은 Apple SD Gothic Neo, Windows는 맑은 고딕으로 대체된다.

## 하지 말 것
- 글자를 이미지로 굽지 않는다(항상 HTML 텍스트 → 수정 가능).
- CSS `animation`/`transition`으로 움직임을 넣지 않는다. 프레임 단위 렌더와 어긋난다. 움직임은 `seek(t)` 안에서 계산한다.
- 한 장면에 글을 많이 넣지 않는다. 넘치면 장면을 나눈다.
