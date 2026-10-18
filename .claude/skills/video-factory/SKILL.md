---
name: video-factory
description: 영상 자동화 공장 — 이미 찍은 영상(강의·설교·회의·행사·폰 영상)과 글로 쇼츠·자막·표지·고화질본을 찍어 내는 우리 자체 스킬. 받아쓰기(faster-whisper) → 명장면 고르기 → 세로/가로 하이라이트(위 슬라이드+아래 사람 · 한 영역 크게 · 전체+흐린 배경) → 핵심 단어만 금색인 자막 → 키네틱 타이포 쇼츠(오토샘 모션 메뉴 19가지 — 타자·한글 자모 타자·글자 쾅·해독·형광펜·지우고 고쳐 쓰기·우르르 쌓기 등, 코드로 주문) → 표지/썸네일(JPG + 레이어 PSD) → 4K/8K 업스케일 → 비공개 저장소 보관까지. "강의를 쇼츠로", "3분 하이라이트", "자막 넣어줘", "받아써줘", "타이포 쇼츠", "글자 영상", "표지 만들어줘", "썸네일", "8K로", "업스케일", "보관해", "영상 공장", "video-factory", "모션 메뉴", "T03 으로", "글자 쾅" 같은 코드·이름 주문에 사용. 얼굴 토킹헤드 16:9 편집(카드·원형 얼굴)은 talk-studio, 디자인형 모션그래픽은 motion-studio(조남경, MIT) 를 쓴다.
---

# video-factory — 영상 자동화 공장

> **편집은 기술이 아니라 반복이다. 반복은 스크립트에게, 사람은 고르고 OK 만.**
> 코드는 전부 이 저장소에서 새로 짠 것(MIT 아님 · 오토샘 소유). 글꼴 Pretendard 는 OFL(`assets/fonts/OFL-Pretendard.txt`).

## 0. 도구 (`scripts/`)
| 파일 | 하는 일 | 입력 → 출력 |
|---|---|---|
| `transcribe.py` | 받아쓰기(+단어 시각) | 영상/음성 → `segs.json` |
| `highlight.py` | 구간 이어 붙이기 · 세로/가로 화면 짜기 · 쉼에 맞춰 자르기 | `plan.json` → mp4 + `_컷.xml` · `_컷.otio` |
| `timeline.py` | 컷 목록을 편집 프로그램 파일로(FCP7 XML · OTIO) — FilmCraft · 프리미어 · 다빈치에서 손으로 다듬기. highlight.py 가 자동으로 부른다(`"timeline": false` 로 끔) | `plan.json` → xml · otio |
| `subs.py draft` | 자막 초안(두 줄 균형, 쉼·문장 끝에서 끊기) | 단어 JSON → `subs.json` |
| `subs.py burn` | 자막 굽기(*강조* 금색, 반투명 상자) | mp4 + `subs.json` → mp4 |
| `typo.py` | 키네틱 타이포 쇼츠/가로 (모션 메뉴 19가지) | `script.json` → mp4 |
| `menu.py` | 모션 메뉴 미리보기 영상 + `menu.json` | → 360×640 mp4 · jpg |
| `oneline.py` | 코스 C01 «한 줄의 선» — 크림 종이에 파란 펜 한 줄이 끊기지 않고 아이콘·손글씨를 그리며 내려감(9:16) | `spec.json` → mp4 |
| `group_short.py` | 그룹·모임 홍보 쇼츠 9:16 — 훅 · 사진 카드(흐린 배경 + 천천히 다가가기) · 숫자 세기 · 한 마디 · QR 자리. 작은 사진도 깨지지 않음. 장면마다 `voice` 를 주면 길이를 목소리에 맞추고 배경음을 자동으로 낮춤 | `spec.json` → mp4 |
| `tts_lines.py` | 문장마다 Gemini TTS 녹음(대괄호 태그 · 테이크 2개 · 지시문 읽은 테이크 다시). GEMINI_API_KEY 있는 자식 세션에서 | `narration.json` → wav |
| `cover.py` | 쇼츠 표지(1080×1920) · 썸네일(1280×720) + 레이어 PSD | `cover.json` → jpg + psd |
| `upscale.py` | 4K/8K, 조각 굽기(끊겨도 이어서), 100MB 넘으면 crf 올려 다시 | mp4 → mp4 |
| `archive.py` | 비공개 저장소 `<작업명>/<편키>/` 복사 · README · 커밋 · 푸시 | 파일들 → 커밋 |
`common.py` 는 공통(글꼴·색·ASS·PSD·전송용 저화질 `small_copy`). 각 파일 맨 위 설명에 JSON 형식 전체가 있다.

## 1. 일하는 순서 (모든 메뉴 공통)
1. **재료 받기** — 채팅 첨부 · 구글 드라이브(«링크가 있는 모든 사용자» 공유 → `drive.usercontent.google.com/download?id=…&confirm=t` 로 받기) · 큰 파일은 드라이브로.
2. **초안** → 30MB 아래 전송용(`small_copy`)을 보내고 **대표님 OK 를 받는다**. OK 전에는 자막·표지를 만들지 않는다.
3. **OK 후** 자막 → 표지 → (원하면) 8K.
4. **보관**: `archive.py` 로 비공개 저장소에. 채팅엔 결과 + 저장 위치 한 줄.
5. 실존 인물 얼굴을 공개용에 쓸 땐 먼저 묻는다. 비밀 파일(config.json · token.json · 키)은 어디에도 안 올린다.

## 2. 메뉴
### ① 강의·설교 → 3분 하이라이트 쇼츠
1. `python transcribe.py 원본.mp4 segs.json` (30분 영상 ≈ 7~10분)
2. Claude 가 받아쓰기를 읽고 **명장면 6~10개**를 고른다: 한 문장으로 완결되는 말 · 숫자·비유·결론 · 처음과 끝 인사. 합계 2분 50초~3분 10초.
3. 프레임 몇 장을 뽑아 보고 `crops` 를 정한다(슬라이드 화면 · 사람). `plan.json` → `python highlight.py plan.json`
4. 초안 전송 → OK → ② 자막 → ⑤ 표지.
5. 손으로 더 다듬고 싶으면 같이 생긴 `_컷.xml` 을 FilmCraft(파일 ▸ 가져오기)·프리미어·다빈치로 연다 — 원본 크기 그대로 컷만 이어 놓은 러프 컷. 원본 영상 위치가 다르면 프로그램이 «미디어 다시 연결»을 묻는다(`craft-suite` 스킬).

### ② 자막
1. `python transcribe.py 완성본.mp4 words.json --words` → `python subs.py draft words.json subs.json`
2. 받아쓰기 오류를 고치고(고유명사·숫자·성경 구절 주의) 줄마다 핵심 한 단어에 `*강조*`. 확신 없는 줄은 보고에 적는다.
3. `python subs.py burn 완성본.mp4 subs.json 자막본.mp4`

### ③ 글 → 타이포 쇼츠
- 문장을 장면으로 쪼개고(장면당 한 생각) 장면 종류를 고른다: title · pop · wipe · slide · count · list · stamp · end.
- 나레이션을 넣으면 장면마다 `"voice"` — 길이가 자동으로 맞는다. **Gemini 3.8 TTS 는 문장형 말투 지시를 소리 내 읽는다 → `[warm, calm] ` 같은 대괄호 태그만** (yt-studio/pipeline/docs/gemini_models_2026-10.md).
- 배경음 `bgm` 은 말할 때 자동으로 낮아진다.

## 2-B. 오토샘 모션 메뉴 (코드로 주문)
장면 `"type"` 에 **코드 · 한글 이름 · 영문 종류** 어느 것을 써도 된다(`"T03"` = `"글자 쾅"` = `"slam"`). 메뉴판(미리보기·담기·주문서 복사): https://claude.ai/artifact/QZzov3ZAW4qedgPLuAVTe9
| 코드 | 이름 | 장면 필드 | 어울리는 곳 |
|---|---|---|---|
| O01 | 여는 제목 | kicker, lines | 쇼츠 첫 1초 |
| O02 | 끝 화면 | lines, logo | 마무리 |
| T01 | 타자 치기 | lines, rate | 업무 자동화 시연 느낌 |
| T02 | 한글 자모 타자 | lines (ㅎ→하→한 처럼 조립) | 한글 강조 · 친근함 |
| T03 | 글자 쾅 | text, sub | 핵심 한 단어 — **한 편에 한 번만** |
| T04 | 단어 튀어나오기 | text | 짧은 훅 |
| T05 | 단어 올라오기 | lines | 차분한 설명 |
| T06 | 해독 글자 | lines | 숨겨진 기능 공개 |
| T07 | 줄 닦기 | lines | 기능 나열 |
| T08 | 좌우에서 밀기 | lines | 대비 · 전후 |
| T09 | 형광펜 칠하기 | lines (*강조* 에 칠) | 숫자 · 결과 |
| T10 | 밑줄 긋기 | lines (*강조* 아래) | 강의 요점 |
| T11 | 지우고 고쳐 쓰기 | wrong, right | 고정관념 뒤집기 |
| T12 | 우르르 쌓기 | text | 한 단어 제목 |
| T13 | 물결 글자 | text | 가벼운 끝 |
| T14 | 인용 카드 | text, by | 명언 · 후기 |
| N01 | 숫자 올라가기 | to, suffix, label | 성과 · 통계 |
| N02 | 목록 차례로 | title, items | 방법 · 순서 |
| B01 | 도장 쾅 | text, sub | 공지 · 결론 |
- 주문 예: «제목은 T02, ‘5분’은 T09, 끝은 B01» → 장면 JSON 으로 바꿔 `typo.py`.
- 새 움직임을 추가하면 `typo.py` 의 `MENU` 와 `menu.py` 의 `ITEMS` 에 넣고 `python menu.py 출력폴더` 로 미리보기를 다시 만든 뒤 메뉴판을 갱신.
- motion-studio 의 «모션 메뉴판»(조남경, motion-studio 0.27 이상 전용, 2026-10 기준 비공개 판)과는 별개. 코드 체계도 다르다.

### 코스 (영상 전체를 한 스타일로)
| 코드 | 이름 | 도구 | 쓰는 법 |
|---|---|---|---|
| C01 | 한 줄의 선 | `oneline.py` | `title`(2줄) · `stations`[{icon, text}] 3~6개 · `sign` · `sign_sub` · `dur`(기본 26초) · `bgm`. icon: phone · wave · star · bubble · phones · bulb · check · heart. 손글씨 글꼴 나눔손글씨 펜(OFL) |
- 코스는 한 편에 하나. 코스를 담으면 단품 장면은 쓰지 않는다(메뉴판 주문서도 그렇게 동작).
- 주문 예: «C01 한 줄의 선으로, 제목 ‘강의 30분이 / 쇼츠가 되는 길’, 단계는 찍기·받아쓰기·명장면·자막·완성».

### ④ 폰 세로 영상 ↔ 가로
`layout: "fit"` — 영상 전체를 넣고 남는 곳은 같은 화면을 흐리게. 회전 정보(폰 세로 촬영) 자동 반영.

### ⑤ 표지 · 썸네일
`cover.json` (쇼츠 9:16 / 유튜브 16:9). 같은 이름 `_레이어.psd` 가 함께 나온다 → photo-craft.online/editor · 포토샵에서 손보기(talk-studio §7). 채널 원칙: 낚시 금지, 강조는 사실인 숫자·결과에만, 금지어(기본기·총정리·사용법·기초·완벽 정리) 쓰지 않음.

### ⑥ 4K/8K
`python upscale.py 입력.mp4 출력_8K.mp4 --to 8k` — 오래 걸리면 백그라운드로 돌리고 같은 명령을 다시 실행하면 이어서 굽는다(조각 단위). 최종 crf 를 그 폴더 README 에 적는다.

### ⑦ 보관
`python archive.py --repo /home/user/yt-studio-output --job SCIC강의 --key 하이라이트 결과.mp4 표지.jpg --materials cuts.json subs.json --note "v2 자막" --trailer "<세션 규칙의 Co-Authored-By · Claude-Session 줄>"`

## 3. 대표님 PC 에서 직접 돌릴 때 (강의 수강생용)
| 단계 | Windows (PowerShell) | Mac (터미널) |
|---|---|---|
| 파이썬 설치 | `winget install Python.Python.3.12` | `brew install python` |
| ffmpeg 설치 | `winget install Gyan.FFmpeg` | `brew install ffmpeg` |
| 부품 설치 | `py -m pip install faster-whisper pillow numpy psd-tools` | `python3 -m pip install faster-whisper pillow numpy psd-tools` |
| 실행 예 | `py highlight.py plan.json` | `python3 highlight.py plan.json` |
| 폴더 이동 | `cd C:\Users\이름\video-factory\scripts` | `cd ~/video-factory/scripts` |
설치 후 터미널을 한 번 닫았다 열어야 ffmpeg 가 잡힌다(두 OS 공통). Mac 에 brew 가 없으면 brew.sh 안내 한 줄로 먼저 설치.

## 4. 강의(«영상 자동화 공장») 연결
1강 ①하이라이트 · 2강 talk-studio(얼굴 영상 편집) · 3강 ③타이포+AI 목소리 · 4강 ⑤표지+PhotoCraft+미드저니 Edit · 5강 ⑥⑦ 고화질·보관·재사용. 샘플: 비공개 저장소 `video-factory/샘플/`.

## 5. 알려진 한계
- 받아쓰기는 small 모델 기준 고유명사·숫자가 자주 틀린다 → 자막은 반드시 사람이 확인. medium 은 더 정확하지만 2~3배 느림. `--prompt` 를 길게 쓰면 같은 문장 반복 환각.
- 장면 자동 선택(명장면)은 Claude 판단 — 대표님 OK 단계가 품질 관문.
- 타이포 쇼츠는 글자 모션 전용(사진·영상 합성 없음). 사진·영상을 섞은 모션그래픽은 motion-studio.
- 말로 자르기 · 더빙 · 자막 · 배경음 바꾸기 · 굽기 뒤 «[피드백]» 고치기 흐름은 `vibe-edit` 스킬(motion-studio v0.13 과 이 공장 도구를 함께 연결).
- 이 클라우드 서버의 백그라운드 작업은 30분 제한 → 8K 는 조각 굽기 + 재실행으로.
