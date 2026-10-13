---
name: talk-studio
description: 말하는 얼굴 영상(16:9 토킹헤드)을 «얼굴+옆 정보 카드 → 슬라이드+원형 얼굴(금테) → 전체 장면 모아보기» 세 화면으로 오가며 편집하고, 핵심 단어만 색이 바뀌는 자막과 썸네일 틀(오른쪽 얼굴 · 큰 글씨 · 한 단어 색 상자 · 데모 캡처 · 스티커)까지 만드는 스킬. 썸네일은 요소별 레이어 PSD 도 같이 내보내 PhotoCraft(photo-craft.online/editor, 무료 브라우저 포토샵 대체)·포토샵에서 바로 손볼 수 있다. CONNECT AI LAB 식 편집(2026-10 분석)을 우리 채널 색(남색·금색)으로 옮긴 것. "토킹헤드 편집", "얼굴 영상에 카드 띄워줘", "슬라이드랑 얼굴 원형으로", "키워드 자막", "그 유튜버처럼 편집해줘", "talk-studio", "썸네일 PSD로", "포토크래프트에서 고치게" 요청에 사용. 쇼츠(9:16) 세로 영상은 이 스킬이 아니라 강의 하이라이트 방식(위 슬라이드/아래 얼굴)을 쓴다.
---

# talk-studio — 토킹헤드 3화면 편집 + 키워드 자막 + 썸네일

엔진: `scripts/talk.py` (PIL + ffmpeg, 키 불필요) · 시범본: `scripts/sample.py`

## 1. 화면 3가지 (타임라인의 `mode`)
| mode | 화면 | 언제 |
|---|---|---|
| `face` | 얼굴 영상 그대로. `card` 가 있으면 오른쪽 위에 반투명 카드가 밀려 들어왔다 사라짐 | 공감·질문·마무리 |
| `slide` | 남색 슬라이드 + 오른쪽 위 원형 얼굴(금테). 배경은 천천히 당겨짐 | 개념·단계·예시 문장 |
| `grid` | 앞 장면들을 3장씩 캡처해 바둑판(5열)으로 깔고, 몇 칸에 빛나는 테두리 | 정리·«오늘 다룬 것» |

## 2. 타임라인 JSON (`python talk.py build timeline.json`)
```json
{
 "base": "촬영본.mp4",            // 16:9 얼굴 영상 (소리 포함이면 audio 생략)
 "audio": "나레이션.wav",          // 선택: 소리를 따로 줄 때
 "bgm": "음악.mp3", "bgm_volume": 0.12,   // 선택
 "face_box": [x, y, w, h],          // 원형 얼굴로 쓸 정사각 영역(원본 픽셀)
 "accent": [242, 193, 78],          // 강조색(기본 금색)
 "out": "결과.mp4",
 "segments": [
  {"t": [0, 8.2], "mode": "face",
   "card": {"kicker": "every monday", "title": "월요일 아침 *두 시간*", "items": ["부서별 시트 합치기", "…"], "at": [0.4, 7.9]}},
  {"t": [8.2, 15], "mode": "slide",
   "slide": {"kicker": "3 steps", "title": "AI 비서에게 넘기는 *3단계*", "cards": ["① 반복\n*찾기*", "② …", "③ …"], "gold": 2, "note": "아래 작은 설명"}},
  {"t": [15, 21], "mode": "slide", "slide": {"kicker": "no code", "title": "…", "quote": "부탁 문장 *강조*\n둘째 줄"}},
  {"t": [21, 26], "mode": "slide", "slide": {"png": "직접 만든 슬라이드.png"}},
  {"t": [26, 31], "mode": "grid", "kicker": "all in one", "title": "오늘 다룬 것 *한눈에*", "highlight": [2, 6, 8]},
  {"t": [31, 36], "mode": "face"}
 ],
 "subs": [[0.5, 3.9, "매주 월요일, 엑셀 정리에\n*두 시간*씩 쓰고 계시죠?"]]
}
```
- `t`·`at`·자막 시각은 모두 **원본 영상 기준 초**. 구간은 빈틈 없이 이어 붙인다.
- `*별표*` 안 = 강조색. 자막은 두 줄까지, 줄당 18자 안팎.
- 슬라이드 제목은 오른쪽 위 원형 얼굴 자리(가로 460px)를 피해 1340px 안에.

## 3. 썸네일 JSON (`python talk.py thumb thumb.json`, 1280×720 JPG + `<이름>_레이어.psd`)
`face`(얼굴 프레임) · `face_crop` · `title`(줄 목록, `*한 단어*` = 색 상자) · `shot`(데모 캡처) · `shot_xy` · `shot_rot` · `stickers`[{text, xy, rot, size, color}] · `pill`(채널명) · `out`.
`"psd": false` 면 PSD 생략. PSD 는 `pip install psd-tools` 필요.
채널 원칙: 낚시·과장 금지. 강조 단어는 사실인 숫자·결과(«5분», «무료»)에만.

## 4. 작업 순서
1. 촬영본 받기 → faster-whisper 받아쓰기(강의 하이라이트 때 쓴 `transcribe.py` 방식) → 문장 시각.
2. 문장마다 화면(mode)·카드·슬라이드 내용 정하기 → timeline.json.
3. `build` → 확인용 저화질(crf30) 보내기 → OK 받으면 `thumb`.
4. 썸네일 JPG·PSD 둘 다 보낸다(PSD 는 대표님이 §7 방식으로 손볼 때).
5. 결과물은 **비공개 저장소 `yt-studio-output/<작업명>/`** 에(CLAUDE.md). 이 스킬 폴더에는 코드만.

## 5. 시범본
`python scripts/sample.py OUTDIR` — 가짜 작업실 + 그림 인물(실존 인물 아님) + 나레이션. 나레이션은 `GEMINI_API_KEY` 있으면 Gemini TTS(Kore), 없으면 엣지 TTS(2026-10 기준 이 서버에선 403 차단). `--voice-only` 는 음성만 만든다.

## 6. 레퍼런스 분석 요약 (CONNECT AI LAB, 2026-10)
- 기획: AI 개념(강화학습 상태→행동→보상)을 인생 교훈(포기하지 않는 법)으로, 직접 만든 데모(«AI도 포기했다»)로 증명.
- 제목: 고백형 문장 + `|` 키워드 부제. 썸네일: 오른쪽 웃는 얼굴 · 왼쪽 2줄 · 한 단어 형광 상자 · 데모 캡처 · 분홍 스티커 · 채널 알약.
- 화면: 위 3모드 + 아래 반투명 상자 자막(핵심 단어만 노랑).

## 7. PhotoCraft 연계 (2026-10-13 분석)
**무엇인가:** photo-craft.online — 포토샵을 그대로 본뜬 무료·오픈소스(MIT/Apache) 사진 편집기. Rust→WebAssembly 로 브라우저 탭에서 돈다. 설치·계정 없음, 사진을 서버에 올리지 않음(탭 안에서 처리, 자동 저장도 브라우저 안). 한국어 화면 있음(photo-craft.online/ko/). **초기 알파** — 본인들 말로 아직 포토샵 대체 수준은 아님(생성형 AI 기능·일부 도구·글자 조판 깊이 부족).
- 레이어·마스크·조정 레이어(곡선·레벨 등 16종)·레이어 스타일(그림자·외곽선·광선)·문자·브러시.
- **PSD 읽기/쓰기**(레이어·마스크·조정 레이어·스마트 오브젝트 유지), PNG·JPG·WebP 내보내기.
- 명령 600여 개가 전부 JSON 명령 → `photocraft-cli`(run · batch · serve · mcp)와 MCP 로 AI 가 조작 가능.

**우리 작업에서 쓰는 법 (기본):**
1. `talk.py thumb` 가 만든 `_레이어.psd` 를 받는다. 레이어: 배경 · 얼굴 · 데모 캡처 · 채널 알약 · 제목(줄마다) · 강조 상자 · 스티커(각각).
2. photo-craft.online/editor → 파일 › 열기(Ctrl+O / ⌘O) → PSD 선택.
3. 레이어 패널에서 옮기기(이동 도구 V)·숨기기(눈 아이콘)·얼굴 바꾸기(새 사진을 파일 › 포함 가져오기로 얹고 «얼굴» 레이어 숨김).
4. 문구 수정: 글자는 그림(픽셀) 레이어다. 해당 «제목» 레이어를 숨기고 문자 도구(T)로 새로 쓴다. 레이어 이름에 원래 문구가 적혀 있다.
5. 파일 › 내보내기 → JPG/PNG. 다 고친 PSD 는 다시 보내 주면 비공개 저장소에 보관.

| 동작 | Windows | Mac |
|---|---|---|
| 열기 | Ctrl+O | ⌘O |
| 이동 도구 / 문자 도구 | V / T | V / T |
| 되돌리기 | Ctrl+Z | ⌘Z |
| 레이어 복제 | Ctrl+J | ⌘J |

**AI 가 직접 조작 (선택, 실험):** 편집기를 `?mcp=<토큰>` 을 붙여 열고, MCP 클라이언트(Claude 등)를 `mcp.artcraftweb.org/mcp?token=<토큰>` 에 연결하면 AI 가 그 탭의 명령을 실행·미리보기한다. 주의: 이때 명령과 미리보기 이미지는 **artcraftweb.org 중계 서버를 거친다**(«업로드 없음»은 편집기 단독 사용 얘기). 공개해도 되는 이미지에만 쓴다. 토큰은 채팅·저장소에 남기지 않는다. 연결 절차는 바뀔 수 있으니 그때 사이트 안내를 다시 확인.

**본인 PC 일괄 처리 (선택):** `photocraft-cli batch --actions grade.json --in ./raw --out ./graded` — 같은 보정을 폴더 전체에.
| | Windows (PowerShell) | Mac (터미널) |
|---|---|---|
| 받기 | GitHub 릴리스에서 `photocraft-<버전>-windows-x64-portable.zip` (CLI 포함 여부 미확인) | `photocraft-cli-<버전>-macos-universal.zip` |
| 실행 | `.\photocraft-cli.exe batch --actions grade.json --in .\raw --out .\graded` | `./photocraft-cli batch --actions grade.json --in ./raw --out ./graded` |

**이 클라우드 서버에서는:** 외부 코드 빌드·실행이 권한상 막혀 있어 PhotoCraft 를 직접 돌리지 않는다. PSD 는 psd-tools 로 우리가 만들고, 편집은 대표님 브라우저에서.
출처: photo-craft.online 첫 화면·FAQ, github.com/storytold/photocraft README · docs/control-protocol.md · docs/mcp.md · book/src/formats/pcraft.md (2026-10-13 확인).
