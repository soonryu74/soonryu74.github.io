---
name: craft-suite
description: >
  ArtCraft 팀의 무료 · 오픈소스(MIT/Apache-2.0) 어도비 대체 3종 — PhotoCraft(포토샵) · FilmCraft(프리미어 프로) ·
  EffectCraft(애프터 이펙트) 안내와 우리 파이프라인 연결. 세 프로그램 모두 «모든 메뉴 = 명령»이라 CLI · MCP 서버로
  Claude 가 직접 조작할 수 있다(숨은 핵심). 설치(Windows · Mac 비교) · Claude 연결(MCP) · 우리 PSD/영상을 넘겨 손보는 법 ·
  한계(알파)까지. "포토크래프트", "필름크래프트", "이펙트크래프트", "PhotoCraft", "FilmCraft", "EffectCraft", "ArtCraft",
  "포토샵 무료 대체", "프리미어 대신", "애프터이펙트 대신", "PSD 어디서 열어", "타임라인으로 다듬고 싶어", "Lottie 로 내보내",
  "Claude 가 편집 프로그램 직접 조작" 요청에 사용.
---

# craft-suite — PhotoCraft · FilmCraft · EffectCraft

> 출처: github.com/storytold/{photocraft, filmcraft, effectcraft} README · docs (2026-10-18 확인).
> 최신 태그: PhotoCraft v0.9.0 · FilmCraft v0.9.0 · EffectCraft v0.9.2. 셋 다 **알파** — 본인들 말로 «아직 어도비 대체 수준은 아님».

## 0. 한눈에

| 프로그램 | 대체 대상 | 잘하는 것 | 기능 있음 / 실무 준비 | 내 파일 |
|---|---|---|---|---|
| **PhotoCraft** | 포토샵 | 레이어 · 마스크 · 글자 · **진짜 PSD 열고 저장** · 일괄 처리 | 메뉴 전부 연결 / 생성형 AI · 일부 도구 없음 | `.psd` |
| **FilmCraft** | 프리미어 프로 | 타임라인 · 트림 · 루메트리 색보정 · 자막 · 음량 · 93개 효과 | 약 86% / 약 56% | FCP7 XML · OTIO · EDL · AAF (`.prproj` 는 못 연다) |
| **EffectCraft** | 애프터 이펙트 | 모션그래픽 · 키프레임 · 합성 · **Lottie 내보내기** · 로토(선택) | 약 91% / 약 45% | `.ecproj`(읽을 수 있는 JSON · `.aep` 는 못 연다) |

공통: 무료 · 계정 없음 · 추적(텔레메트리) 없음 · Windows/Mac/Linux + 브라우저판(web zip). 화면 배치 · 단축키가 어도비와 같아서 손이 기억하는 대로 쓴다.

## 1. 숨은 핵심 — «Claude 가 직접 누른다»
세 프로그램은 버튼 · 메뉴 · 슬라이더가 전부 **이름 있는 명령**(PhotoCraft 500개+, FilmCraft 650개+)이다. 화면 · CLI · MCP 서버가 같은 명령을 부르므로 **사람이 하는 편집을 Claude 가 그대로 할 수 있다.**
- PhotoCraft: `photocraft-cli run 썸네일.psd --cmd filter.sharpen.smartSharpen --params '{"amount":80}' --out 완성.png` · `photocraft-cli batch --actions 보정.json --in ./원본 --out ./완성`(폴더 일괄)
- FilmCraft: `timeline.place` · `effects.setParam`(루메트리 곡선 등) · `ui.screenshot` — 명령 목록 `filmcraft-cli commands`
- EffectCraft: `effectcraft-cli set Main '#1' transform/position '[100,360]' --time 0 main.ecproj --save` · `effectcraft-cli render --comp Main --out main.mp4` · `effectcraft-cli exec file.exportLottie '{"comp":"Main","path":"main.json"}' main.ecproj`
- MCP 도구(EffectCraft 기준, FilmCraft 동일 규약): `command_list` · `command_run` · `command_batch` · `doc_inspect` · `render_preview`(PNG 미리보기)

> 채널 각도: «포토샵 · 프리미어 · 애프터이펙트, 무료 대체품에 Claude 를 연결하면 말로 편집된다» — 익숙한 툴 + 아무도 모르는 조합.

## 2. 설치 — Windows · Mac 비교
받는 곳: 처음이면 getartcraft.com/apps/{photocraft|filmcraft|effectcraft} · 특정 버전은 GitHub Releases(`SHA256SUMS.txt` 로 확인).

| 할 일 | Windows | Mac |
|---|---|---|
| 앱 파일 | `<이름>-<버전>-windows-x64.msi`(설치) 또는 `-portable.zip`(압축만 풀기) · ARM 노트북은 `arm64` | `<이름>-<버전>-macos-universal.dmg` (애플 실리콘 · 인텔 공용, 서명 · 공증됨) |
| 명령줄 도구(CLI) | MSI 에 같이 들어 있다 | 따로: `<이름>-cli-<버전>-macos-universal.zip` → `ditto -x -k <파일>.zip .` |
| 설치 확인 | PowerShell: `& "<설치폴더>\photocraft-cli.exe" --help` | 터미널: `./photocraft-cli --help` (처음 한 번 macOS 가 온라인 공증 확인) |
| 창이 번쩍하고 꺼질 때 | PowerShell: `$env:WGPU_BACKEND = "vulkan"` 후 실행(AMD 그래픽 드라이버 문제) | 해당 없음 |
| 설치 없이 | `<이름>-web-<버전>.zip` 을 풀어 정적 서버로 · PhotoCraft 는 photo-craft.online/editor 바로 | 같음 |

한글: PhotoCraft · FilmCraft 는 한국어 화면이 있다(FilmCraft 는 컴퓨터의 한글 글꼴 — 맑은 고딕 · Apple SD Gothic Neo — 이 있어야 켜진다). EffectCraft 는 아직 한국어 화면 없음(영어로 쓴다).

## 3. Claude 에 연결 (MCP) — Windows · Mac 비교
| 쓰는 곳 | Windows | Mac |
|---|---|---|
| Claude Code | `claude mcp add photocraft -- "C:\Program Files\PhotoCraft\photocraft-cli.exe" mcp` (EffectCraft 공식 문서의 기본 설치 폴더 규칙 기준 — 다르면 바꾸기) | `claude mcp add photocraft -- ~/craft-cli/photocraft-cli mcp` (CLI zip 을 푼 곳) |
| Claude Desktop 설정 파일 | `%APPDATA%\Claude\claude_desktop_config.json` | `~/Library/Application Support/Claude/claude_desktop_config.json` |

```json
{ "mcpServers": {
  "photocraft":  { "command": "<CLI 경로>/photocraft-cli",  "args": ["mcp", "--automation-read-root", "<작업폴더>", "--automation-write-root", "<작업폴더>/완성"] },
  "filmcraft":   { "command": "<CLI 경로>/filmcraft-cli",   "args": ["mcp"] },
  "effectcraft": { "command": "<CLI 경로>/effectcraft-cli", "args": ["mcp", "--bridge", "9877"] }
} }
```
- EffectCraft 는 `mcp --autosave` 로 켜야 서버가 다시 켜져도 작업이 남는다. FilmCraft 는 폴더 묶기 옵션이 아직 없다.
- `mcp` 만 쓰면 화면 없이(headless) 돈다. 켜 둔 앱을 같이 보며 시키려면 앱을 `--control 9877` 로 켜고 MCP 에 `--bridge 9877`.
- **안전**: PhotoCraft · EffectCraft 는 `--automation-read-root` / `--automation-write-root` 로 Claude 가 읽고 쓸 폴더를 묶는다. 묶으면 스크립트 실행 · 화면 클릭 도구는 막힌다. 처음엔 꼭 묶어서 쓴다.

## 4. 우리 파이프라인과 잇기
| 우리가 만든 것 | 넘기는 곳 | 손보는 것 |
|---|---|---|
| `cover.py` · `talk.py thumb` 의 `_레이어.psd` | PhotoCraft | 글자 · 얼굴 위치 · 색 상자 — 레이어 이름 그대로 열린다(talk-studio §7) |
| 썸네일 여러 장 일괄 보정 | `photocraft-cli batch` | 같은 곡선 · 선명도를 폴더 통째로 |
| `highlight.py` 가 같이 쓰는 `_컷.xml`(FCP7) · `_컷.otio` | FilmCraft · 프리미어 · 다빈치 | 원본 크기 러프 컷을 열어 컷 미세 조정 · 색보정 · 음량(라우드니스 미터) · 자막 트랙 |
| motion-studio · typo.py 로 구운 mp4 | FilmCraft | 앞뒤 붙이기 · 색 · 음량 |
| 다른 편집기(프리미어 · 다빈치) 작업 | FilmCraft ⇄ FCP7 XML · OTIO · EDL · AAF | 프로젝트 오가기 |
| 로고 애니메이션 · 자막 바 · 인트로 | EffectCraft → Lottie JSON / mp4 | 웹페이지(판매 페이지 등)에 가벼운 애니메이션으로 |

## 4-B. 바로 쓰는 세트 (`presets/`)
| 파일 | 무엇 | Windows (PowerShell) | Mac (터미널) |
|---|---|---|---|
| `mcp_windows.json` · `mcp_mac.json` | Claude Desktop 연결 설정 — 세 프로그램 한 번에. `내이름` · 작업 폴더만 바꿔 설정 파일(§3)에 붙여 넣기 | 기본 설치 폴더 `C:\Program Files\<이름>\` 기준 | CLI zip 을 `~/craft-cli/` 에 푼 기준 |
| `photocraft_썸네일.json` | PhotoCraft 동작 세트 2개: `썸네일_보정`(살짝 S 곡선 · 활기 +20 · 선명 효과) · `유튜브_1280`(같은 보정 + 1280×720) | `& "C:\Program Files\PhotoCraft\photocraft-cli.exe" batch --actions photocraft_썸네일.json --action 유튜브_1280 --in .\원본 --out .\완성 --format jpg --quality 92` | `~/craft-cli/photocraft-cli batch --actions photocraft_썸네일.json --action 유튜브_1280 --in ./원본 --out ./완성 --format jpg --quality 92` |
| `autosam_intro.jsx` | 오토샘 로고 인트로 3.5초(남색 바탕 · 금색 선 · «오토샘» 튀어 오름 · «영상 자동화 공장»). 애프터 이펙트 스크립트라 **진짜 애프터 이펙트에서도** 돈다. 세로는 파일 안 `VERTICAL = true` | ① `& "C:\Program Files\EffectCraft\effectcraft-cli.exe" script autosam_intro.jsx --save-as 오토샘_인트로.ecproj` ② `… render 오토샘_인트로.ecproj --comp 오토샘인트로 --out 오토샘_인트로.mp4` ③ `… exec file.exportLottie '{"comp":"오토샘인트로","path":"오토샘_인트로.json"}' 오토샘_인트로.ecproj` | 같은 명령, 실행 파일만 `~/craft-cli/effectcraft-cli` |

- 동작 세트의 단계는 `["명령", {값}]` 짝으로 쓴다(`{"command":…}` 꼴은 «Actions set: invalid type: map» 오류). **첫 단계는 `layer.flattenImage`** — 빼면 PSD 에서 보정이 맨 위 레이어 하나에만 걸린다. 명령 이름 · 값 범위는 PhotoCraft 소스(v0.9.0) 기준: `image.adjustments.curves{points}` · `image.adjustments.vibrance{vibrance,saturation}` · `filter.sharpen.smartSharpen{amount 1–500, radius 0.1–64, reduceNoise 0–100}` · `image.imageSize{width,height,resample}`.
- `batch` 는 `--out` 이 `--in` 과 같은 폴더면 거절한다(원본 보호). PSD 를 jpg 로 내보낼 때 레이어는 합쳐진다 — PSD 원본은 그대로 남는다.
- **글꼴**: EffectCraft 는 컴퓨터에 설치된 글꼴만 쓴다. Pretendard 가 없으면 기본 글꼴로 바뀐다 → 먼저 설치(Windows: 글꼴 파일 우클릭 ▸ «모든 사용자용으로 설치» · Mac: 더블클릭 ▸ «서체 설치»). 파일은 `video-factory/assets/fonts/Pretendard-*.otf`.
- 스크립트는 `layer.text.sourceText` · `layer.transform.scale` 같은 짧은 이름으로 쓴다 — `layer.property("Source Text")` 꼴은 EffectCraft 에서 null 이 된다(애프터 이펙트는 둘 다 된다).
- Lottie 는 글자 레이어가 글자로 남는다(3KB) — 웹페이지에서 Pretendard 를 같이 불러 쓴다.
### 4-C. 실제 테스트 결과 (2026-10-18, 공식 Linux 배포판 · SHA256 확인)
| 시험 | 결과 |
|---|---|
| PhotoCraft 0.9.0 `batch` — talk-studio 썸네일 jpg + 9레이어 PSD | ✅ 2개 성공 · PSD 합성이 원본 jpg 와 같게 열림 · 보정 반영(대비 ↑) · 1280×720 |
| EffectCraft 0.9.2 `script` → `render` → `file.exportLottie` | ✅ 3.5초 1920×1080 · 세로 1080×1920 · Lottie(글자 레이어 2 + 단색 3, 경고 0) · 굽기 약 7초 |
| FilmCraft 0.9.0 `file.import` — `_컷.xml` · `_컷.otio` | ✅ 둘 다 컷 3개 · 이름 · 원본 시각 그대로, 빠진 미디어 0 · `export` 결과가 highlight.py 결과와 장면 일치(SSIM 0.994, 길이 차 0.03초) |
| MCP 연결(초기화 + 도구 목록) | ✅ PhotoCraft 도구 25 · FilmCraft 17 · EffectCraft 27 (폴더 묶기 옵션 포함) |
처음 돌렸을 때 나온 버그 2개(동작 세트 형식 · 스크립트 속성 이름)와 함정 2개(PSD 합치기 · 글꼴 설치)는 위에 고쳐 적었다. Windows · Mac 설치 경로는 공식 문서 기준이고 실기기에서는 아직 안 돌렸다.

## 5. 한계 — 정직하게
- 셋 다 알파: 실제 폰 · 카메라 영상은 덜 시험됨, Windows · Linux 는 Mac 보다 버그가 많다. 큰 영상은 느리다(색보정 · 내보내기 일부가 CPU).
- FilmCraft 내보내기: 소프트웨어로는 H.264 만, H.265 는 그래픽카드(NVIDIA · Mac) 인코더로만, AV1 없음. 플러그인(VST · OpenFX) 없음.
- `.prproj`(프리미어) · `.aep`(애프터이펙트) 원본 파일은 못 연다 → XML · OTIO 로 옮긴다.
- **이 클라우드 서버에서도** 공식 Linux 배포판(.deb 를 풀어 `usr/bin/*-cli`)으로 세 CLI 가 돈다 — 대표님이 «테스트 해봐»처럼 허락하면 받아서 쓴다(받은 뒤 `SHA256SUMS.txt` 로 확인). 화면 있는 앱은 대표님 컴퓨터에서.
- 강의 · 영상에서 소개할 때: «무료 · 알파 · 아직 어도비 완전 대체는 아님»을 같이 말한다(신뢰 톤).
