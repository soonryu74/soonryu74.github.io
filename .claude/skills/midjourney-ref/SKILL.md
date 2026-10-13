---
name: midjourney-ref
description: 미드저니(Midjourney) 2026년 10월 기준 현황·파라미터·프롬프트 레시피·Edit 모델(문장 편집 · 참조 4장 합성 · 인페인팅/아웃페인팅 · 화풍 바꾸기)·Editor·비디오(V1) 워크플로 참고. 유저가 미드저니로 영상 배경·썸네일·삽화·짧은 애니메이션 클립을 만들거나 고칠 때, 또는 "미드저니 프롬프트 써줘", "미드저니로 배경 뽑자", "이 사진 미드저니로 고쳐", "배경 넓혀줘(아웃페인팅)", "이 이미지 애니메이트", "sref 뭐 쓰지", "--edit" 같은 요청에 사용. 만든 이미지·클립을 motion-studio(재료/) · 1분칼럼(`{key}_bg/`) · talk-studio(썸네일 바탕) 파이프라인에 넘기는 규칙까지 포함. 이 스킬은 미드저니를 대신 돌리지 않는다 — 프롬프트와 절차를 주고, 결과물은 유저가 받아 온다.
---

# midjourney-ref — 미드저니 참고 (2026-10-13 공식 문서 기준)

> 공식 문서 읽는 법: docs.midjourney.com 페이지는 이 서버에서 403(봇 차단)이지만 **헬프센터 API 는 열린다** →
> `curl https://docs.midjourney.com/api/v2/help_center/en-us/articles/<글번호>.json` (본문은 `article.body` HTML).
> 글번호: Edit Model 48495453462797 · Editor 32764383466893 · Version 32199405667853. 새 버전이 나오면 Version 글부터 다시 확인.

## 1. 지금 상태
- **기본 버전 V8.2** (2026-07-24부터). 미학·화질·개인화(Personalization) 개선 + **Edit 모델** 탑재. Edit 모델이 Omni Reference · Character Reference · Retexture 를 대체.
- **V8.1** (2026-04-14 출시, 06-10~07-23 기본) — 가장 빠름(표준 작업 4~5배), 작은 디테일 유지 좋음. `--raw` 로 기본 꾸밈 빼기.
- V8.0 알파(03-17~07-24)는 종료. V7(2025-04-03) · V6.1 · Niji 7(2026-01-09)은 계속 사용 가능.
- **HD(2048px, 네이티브 2K)**: V8.1·8.2. 설정 › Version 에서 켜거나 `--hd` / `--sd`. GPU 시간 **HD 1.3분 vs SD 0.8분**. HD 이미지에 Pan·Zoom Out·Edit(부분 다시 그리기)를 쓰면 결과가 SD 로 내려가니, 마지막에 Upscale 로 다시 HD.
- 최대 비율 14:1 (HD 는 4:1). 품질 `--q 1/2/4`. 시드 고정 시 99% 동일.
- 비디오 V1: 이미지의 약 8배 비용(5초×4개 한 작업, 2025-06 보도 기준 — 공식 글 미확인).

## 2. 파라미터 치트시트
| 파라미터 | 뜻 | 메모 |
|---|---|---|
| `--ar 16:9` / `9:16` / `1:1` | 비율 | 유튜브 배경·썸네일 16:9 · 쇼츠 9:16. **Edit 모델은 첫 참조 이미지 비율을 따라감** → 바꾸려면 `--ar` 를 꼭 적기(기본 설정 비율은 적용 안 됨) |
| `--v 8.2` / `--v 8.1` | 버전 | 안 쓰면 설정값(기본 8.2) |
| `--hd` / `--sd` | 2K / 표준 | 초안은 SD, 최종만 HD |
| `--q 1/2/4` | 품질 | V8 은 1·2·4 |
| `--s 0~1000` | 스타일라이즈 | 실사·문서용 100~250 · 일러스트 400~700 |
| `--raw` | 미드저니 손맛 빼기 | 실사·사진풍 필수. **Edit 모델에서 지시를 더 정확히 따르게** |
| `--c 0~100` | 변주 폭 | 탐색 20~40 · 확정 0 |
| `--sref <코드/URL>` `--sw` | 스타일 참조 | 채널 톤 통일. Edit 모델과 함께 쓸 때 **프롬프트에 화풍을 말로도 적어야** 잘 먹음 |
| `--p` | 개인화 | 공익·기관 영상은 끈다 |
| `--no 텍스트` | 빼기 | `--no text, watermark, logo` 기본 |
| `--tile` | 패턴 | **Edit 모델과 같이 못 씀** |
| `--edit <URL> [URL…]` | Edit 모델(디스코드) | 이미지 URL 최대 4개, 공백으로 구분 |
| `--niji 7` | 애니 풍 | 손그림 느낌 |
| 이미지 URL + `--iw` | 이미지 프롬프트 | Edit 모델과 함께 사용 가능 |
| `--motion low/high` · `--video` | 비디오 | §5 |

글자는 그림 안에 넣지 않는다(한글 깨짐) — 파이프라인(PIL·motion-studio·talk-studio)에서 얹는다.

## 3. 프롬프트 레시피 — 새로 뽑기
구조: **[피사체·행동] , [장소·시간·조명] , [카메라·렌즈] , [분위기·색] , [스타일 지시] --ar … --s … --raw --no text**
- **영상 배경(1분칼럼·설교·칼럼 낭독)** — 얼굴 없이, 글자 자리 비움: `wide empty foreground, soft morning light, calm, muted warm palette, photographic --ar 16:9 --raw --s 150 --no people, text`
- **썸네일 바탕** — `subject on the right third, left half plain soft background for title text --ar 16:9 --raw`
- **공익·기관 영상(사랑의 베이커리류)** — `honest documentary photo, natural light, real workplace, no stylization --raw --s 80`
- **역사·고문헌(직지류)** — `ink wash illustration on aged hanji paper, muted sepia, minimal lines --s 300` 또는 `--niji 7`. 실존 인물 얼굴은 그리지 않는다.
- **일관된 시리즈** — 첫 장이 마음에 들면 `--sref <URL> --sw 300`, 더 강하게는 무드보드.

## 4. Edit 모델 · Editor (V8.1/8.2)
**세 가지 쓰임**
1. **문장으로 고치기** — 이미지 1장 + 지시문: «make the background a quiet office at night», «remove the sign text».
2. **참조 최대 4장으로 새로 만들기** — 인물·사물·배경을 섞어 새 장면(옛 Omni/Character Reference 대체).
3. **Editor 에서 부분 수정** — 지운 곳만 다시 그리기(인페인팅) · 캔버스 넓히기(아웃페인팅).

**들어가는 곳 (웹)**
- **Imagine 바** → 그림 아이콘 → 업로드/고르기 → «Attach to prompt» 에 최대 4장 끌어다 놓기(자물쇠 아이콘 = 여러 프롬프트에 고정).
- **내 작품 열기** → Creation Actions → «Quick Edit»(Imagine 바로) / «Open Editor»(부분 수정).
- **왼쪽 메뉴 Edit 탭** = 전체 기능 Editor(외부 사진 업로드·URL 붙여넣기 가능).
- **디스코드**: 프롬프트 끝에 `--edit <이미지URL>` (여러 장은 공백으로). 내 PC 사진은 먼저 디스코드에 올려 URL 을 얻는다.

**Editor 도구**: 되돌리기/다시/초기화 · 이동·크기(비율 프리셋, 회색 막대 끌어 캔버스 넓히기, 직접 비율 입력) · 칠하기(Erase = 다시 그릴 곳, Restore = 되살리기, 브러시 크기) · **Smart Select**(클릭으로 포함/제외 점 → «Erase Selection» 또는 «Erase Background» 를 눌러야 적용) · Suggest Prompt(Describe) · **Layers**(다른 사진을 레이어로 얹고 지운 투명 부분만 다시 그림, 제출하면 합쳐짐) · 내보내기(Upscale to Gallery / Download — 원본 생성본 + 지운 부분 투명 PNG).
결과는 매번 4장씩 결과 패널에 쌓인다.

**프롬프트 쓰는 법**: 예전처럼 «장면 묘사»와 Edit 식 «지시문» 둘 다 된다(Conversational 모드처럼). 정밀하게 하려면 `--raw`.
- 인물 여럿이 섞이면 → **인물들을 한 장의 참조 이미지로 합쳐서** 넣는다.
- 시점 바꾸기: «let's see this image from the front / from behind».
- 화풍 바꾸기(Retexture): «hand drawn pencil sketch of this image --sref …» — 화풍을 말로도 적기.

**안 되는 것**: `--tile` 과 같이 못 씀 · Edit 결과는 Remix 불가 · HD 에 부분 수정하면 SD 로 내려감.

**공개 범위 — 반드시 확인**: V8.X Edit 모델로 만든 결과는 **외부 사진이라도 Create·Organize 에 올라가고 midjourney.com 다른 회원에게 보인다(Stealth 모드가 아니면)**. → 교회·기관 참가자 사진, 대표님 가족 사진, 아직 공개 전 자료는 Stealth(Pro/Mega 요금제) 없이 올리지 않는다. 남의 얼굴을 모욕·성적·비방 목적으로 바꾸는 것은 약관상 금지·정지 사유. 필터에 막힌 작업은 비용이 안 든다.

**우리 채널 레시피 (Edit 모델)**
| 하고 싶은 것 | 방법 |
|---|---|
| 강의·촬영 캡처를 썸네일 바탕으로(왼쪽 글자 자리 만들기) | Edit 탭에 캡처 업로드 → 이동·크기에서 캔버스를 왼쪽으로 넓힘(16:9) → 프롬프트 «extend the room naturally, keep the person unchanged, plain soft wall on the left» `--raw` → talk-studio `thumb` 의 `face` 로 사용 |
| 사진 속 간판·글자·잡동사니 지우기 | Smart Select 로 고르고 Erase Selection → «clean empty wall» `--raw` |
| 슬라이드용 삽화를 채널 톤으로 통일 | 기존 삽화 + «flat navy and gold illustration of this image» `--sref <채널 코드>` |
| 1분칼럼 배경 여러 장을 같은 장소로 | 첫 배경을 참조로 + «same place, evening light» / «same place, rainy morning» |
| 로고·제품 사진을 장면에 넣기 | 참조 2장(장면 + 로고 사진) + «place this logo on the bakery window» — 단, 기관 로고는 원본 파일을 코드로 얹는 것이 원칙(글자·로고 왜곡) |

## 5. 비디오(V1) 워크플로 — 이미지 → 짧은 클립
1. 이미지(생성 또는 업로드 → start frame)에서 **Animate**.
2. **자동**(모션 프롬프트 자동) / **수동**(«카메라가 천천히 밀고 들어간다, 커튼이 흔들린다»).
3. **low motion**(거의 고정, 배경·B롤용) / **high motion**(피사체·카메라 모두, 왜곡 가능).
4. 한 작업 = 5초 ×4개 → **extend** 약 4초씩 최대 4번 → 최대 21초.
5. 해상도·현재 모델명은 공식 글 미확인 → 받은 mp4 를 ffprobe 로 확인.
6. 쓰임: 1분칼럼 배경을 5초 루프로 · motion-studio `video.md` 의 영상 재료 · (구글 Veo 프리뷰가 2026-10-22 차단되면) 영상 클립 대체재.

## 6. 이 저장소 파이프라인에 넘기기
- **motion-studio**: 받은 파일을 작업 폴더 `재료/` 에 의미 있는 이름으로(`bakery_counter.jpg`). 보드에서 `<img src="재료/…">`. 영상은 `video.md` 규칙.
- **1분칼럼(radiocol)**: `jobs/1분칼럼/{key}_bg/` 에 16:9 이미지 → `run.py` 가 projects bg/ 로 복사.
- **talk-studio**: 썸네일 바탕·얼굴 사진은 thumb.json 의 `face`, 데모 화면은 `shot`. 글자는 코드로 얹고 레이어 PSD 로 내보낸다.
- 잘 나온 **sref 코드 · 프롬프트**는 아래 «채널 sref 노트»에 기록.

### 채널 sref 노트
- (아직 없음) — 형식: `용도 | sref 코드/URL | --sw | 메모`

## 7. 주의
- 실존 인물 얼굴·브랜드 로고 생성 금지(채널 규칙·초상권). 기관 로고는 원본 파일을 쓴다.
- Edit 결과의 **공개 범위**(§4) — Stealth 아니면 공개.
- 상업 이용 조건은 요금제마다 바뀐다 → 큰 프로젝트 전에 약관 확인.
- 이 스킬은 «프롬프트·절차»만 준다. 생성·다운로드는 유저가 하고 파일을 첨부하면 다음 단계로.

## 출처 (2026-10-13 확인, 헬프센터 API)
- Edit Model (글 48495453462797, 2026-09-24 수정) · Editor (32764383466893, 2026-09-02) · Version (32199405667853, 2026-09-01)
- 비디오 V1 비용·길이: techcrunch.com 2025-06-18 (공식 글 미확인)
