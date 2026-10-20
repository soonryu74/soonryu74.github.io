# 「입구」 v4.1 — Seedance 프롬프트 (샷별)

**단일 진실 소스**: `02_입구_샷리스트_v4.1.csv` (이 문서는 `gen_v4.py`가 CSV와 함께 생성). 수정은 gen_v4.py에서.

## 공통 블록

**STYLE (모든 샷 끝에 자동 부착)**
```
Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Palette: pure black shadows, warm orange headlamp light, bone-white carbonate deposits. No text, no logos, no subtitles, no lens flare.
```
**CAVE (동굴 샷에 포함)**
```
Only headlamps light the scene. Everything outside the beams is pure black; do not reveal cave walls beyond the light. Black basalt walls streaked with bone-white calcite. Not a limestone cave: never brighten the whole cave.
```
**인물 고정 문구**
```
동수 2025: Korean man, 64, short white hair, weathered face, thick calloused hands, faded orange safety vest, old scratched white hard hat
동수 2005: Korean man, 44, short black hair wet with rain, orange safety vest, white hard hat
해인: Korean woman, 34, black low ponytail, black technical work jacket, headlamp strap on forehead
연구원: cave survey team in identical black work jackets and headlamps, faces in shadow
```

## 광원 규칙 (현실 정합)
- '광원 하나'는 **샷 안의 주광원이 하나**라는 뜻. 헤드랜턴 여러 개가 보이는 샷(5-1, 6-1, 9-1)은 각 랜턴이 작은 원을 만들고 그 사이는 검정. 수면 반사(6-1)는 같은 랜턴의 2차 반사. 지상 샷(S1·S3·S4·S10·S11)은 자연광·백열등이 주광원이며 CAVE 블록을 붙이지 않는다.

## 생성 요청 길이 가정
- Dreamina 길이 옵션을 5초/10초로 가정(제작 당일 UI 확인). ≤5초 샷은 5초, 6~7초 샷은 10초로 요청 후 편집에서 트리밍.

## Seedance 사양 검증 (Dreamina 공식 페이지, 2026-10-20)

| 항목 | 2.0 | 2.5 | 판정 |
|---|---|---|---|
| 참조 입력 | 12개(이미지 9·영상 3·오디오 3, 각 ≤15초) | 최대 50개(텍스트·이미지·영상·오디오 혼합) | 확인됨(공식) |
| 모드 | Single-frame(첫·끝 프레임) / Multiframes | Omni reference | 확인됨(공식) |
| 1회 출력 길이 | 공식 페이지 미표기(요금 환산은 10초 기준) | 최대 30초, 확장 5~180초(베타) | 일부 확인 — **길이 옵션(5/10초)은 가정** |
| 해상도 | 1080p 다운로드 명시, 4K 마케팅 문구 | 동일 | 일부 확인 |
| 오디오 | 네이티브 오디오·립싱크(유료) | 동일 | 확인됨(공식) — 본 작품은 후반 사운드로 대체 |
| 후처리 | 업스케일·보간(24→30/60fps)·사운드트랙 생성 | 동일 | 확인됨(공식) |
| 워터마크 | 유료 플랜만 제거 | 동일 | 확인됨(공식) |
| 요금 | Basic $15/1,575cr · Standard $36/3,885cr · Advanced 17,600cr(가격 미표기) | — | 일부 확인 — 샷당 크레딧 단가 미공개 |
| @ 태그 문법 | @AssetName | @Image1 … | 확인됨(공식 가이드) — UI 표기 당일 확인 |

출처: dreamina.capcut.com/ko-kr/tools/seedance-2-0 · dreamina.capcut.com/resource/how-to-use-seedance-2-0 · dreamina.capcut.com/seedance/how-to-use-seedance-2-5 (2026-06-29)

## 우선순위
- **P0** 먼저 시험: 영화의 성패를 가르는 손·물고기·라벨 컷. 각 10회 이상.
- P1 인물·관계 컷. P2 환경·전환 컷(실패해도 편집으로 대체 가능).

## S0. 공식 인트로

### INTRO · 0:00–0:20 (20s) · 생성 없음
- 공식 인트로(주최 제공)
- 음향/대사: 주최 제공 영상 그대로

## S1. 2005 비 오는 밭

### 1-1 · 0:20–0:25 · 사용 5s / 요청 5s · T2V · P2
- 기능: 2005 발견. 비 오는 밭, 공사
- 레퍼런스: R-2005 · 카메라: fixed wide
- 음향/대사/자막: 빗소리, 굴착기
- 예상 실패: 비가 안개처럼 뭉개짐 / 전신주가 나무로 생성 → 재생성: 'concrete utility pole with wires' 명시, 'rain as thin streaks' 추가
```
Wide shot. Gray rain over flat Jeju farmland with black stone walls. An excavator digs a hole beside a new concrete utility pole; a worker (Korean man, 44, short black hair wet with rain, orange safety vest, white hard hat) shovels at the edge. Fixed camera, overcast, desaturated 2005 documentary feel. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Palette: pure black shadows, warm orange headlamp light, bone-white carbonate deposits. No text, no logos, no subtitles, no lens flare.
```

### 1-2 · 0:25–0:29 · 사용 4s / 요청 5s · T2V · P2
- 기능: 삽이 헛돌고 흙이 꺼진다
- 레퍼런스: R-2005 · 카메라: fixed low
- 음향/대사/자막: 흙 무너지는 소리
- 예상 실패: 구멍이 물웅덩이로 보임 → 재생성: 'dry black void, no water' 추가
```
Close on muddy boots and a shovel blade. The shovel sinks and the wet soil suddenly gives way, mud collapsing into a black opening. Fixed low camera, rain. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Palette: pure black shadows, warm orange headlamp light, bone-white carbonate deposits. No text, no logos, no subtitles, no lens flare.
```

### 1-3 · 0:29–0:34 · 사용 5s / 요청 5s · I2V · P1
- 기능: 차가운 바람이 올라온다 (S4 매치)
- 레퍼런스: R-DS05 · 카메라: slow push-in
- 음향/대사/자막: 바람 소리 (저음)
- 예상 실패: 머리카락이 안 움직임 → 재생성: 'hair visibly blown upward' 반복, 생성 길이 10초로
```
Korean man, 44, short black hair wet with rain, orange safety vest, white hard hat leans over a dark hole in wet ground. A cold wind rises from below and lifts his hair; he freezes. Slow push-in on his face. Rain on skin. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Palette: pure black shadows, warm orange headlamp light, bone-white carbonate deposits. No text, no logos, no subtitles, no lens flare.
```

### 1-4 · 0:34–0:40 · 사용 6s / 요청 10s · T2V · P1
- 기능: 손전등 원 안의 흰 벽
- 레퍼런스: R-WALL · 카메라: slow pan
- 음향/대사/자막: 물방울 1회
- 예상 실패: 원 밖이 회색 → 재생성: 'pure black, zero ambient light' 2회 반복
```
POV flashlight beam from above into a dark shaft. The circle of light finds a black basalt wall streaked with bone-white calcite deposits. Slow pan across the white. Pure black outside the beam. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Palette: pure black shadows, warm orange headlamp light, bone-white carbonate deposits. No text, no logos, no subtitles, no lens flare.
```

### 1-5 · 0:40–0:45 · 사용 5s / 요청 5s · T2V · P1
- 기능: 노란 장갑이 떨어진다 (S10-7 대칭)
- 레퍼런스: R-GLOVE · 카메라: fixed top-down
- 음향/대사/자막: 낙하음 지연 1.5초
- 예상 실패: 장갑이 둘로 보임 / 손이 프레임에 남음 → 재생성: 'one glove only', 'the hand exits frame immediately'
```
Looking straight down a black shaft. A yellow rubber work glove slips from a hand at the top of frame and falls away from camera, caught briefly in a flashlight beam, then swallowed by darkness. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Palette: pure black shadows, warm orange headlamp light, bone-white carbonate deposits. No text, no logos, no subtitles, no lens flare.
```

### TITLE · 0:45–0:48 (3s) · 생성 없음
- 타이틀 '입구 / The Opening'
- 음향/대사: 무음

## S2. 2025 세계자연유산본부

### 2-1 · 0:48–0:54 · 사용 6s / 요청 10s · I2V · P1
- 기능: 2005 보고서를 넘기다 한 줄에서 멈춘다
- 레퍼런스: R-HI · 카메라: slow push-in
- 음향/대사/자막: 종이 소리. 자막 합성: Discovered by: construction worker (name unknown)
- 예상 실패: 페이지에 가짜 글자 생성 → 재생성: 'blank text lines, no legible letters' 명시 후 편집 합성
```
Close on a woman's hand turning pages of a bound cave survey report with photos and diagrams under fluorescent light. The hand stops on a line of text. Slow push-in on the page. (Fictional in-film document. Line '발견자: 공사 인부(성명 미상)' and a small corner notice '극중 재구성된 기록 / dramatized record' composited in editing.) Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Palette: pure black shadows, warm orange headlamp light, bone-white carbonate deposits. No text, no logos, no subtitles, no lens flare.
```

### 2-2 · 0:54–0:58 · 사용 4s / 요청 5s · I2V · P2
- 기능: 보고서를 덮고 명단 양식을 당긴다
- 레퍼런스: R-HI · 카메라: fixed
- 음향/대사/자막: 없음
- 예상 실패: — → 재생성: —
```
The same hand closes the report firmly and pulls a blank form forward whose header area is empty. Fixed camera, fluorescent light. (Header '2025년 학술조사 참가자 명단' composited; fictional document.) Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Palette: pure black shadows, warm orange headlamp light, bone-white carbonate deposits. No text, no logos, no subtitles, no lens flare.
```

### 2-3 · 0:58–1:05 · 사용 7s / 요청 10s · REF · P1
- 기능: 이름을 쓴다. 팀장: 기록은 못 고쳐
- 레퍼런스: R-HI;R-LEADER · 카메라: fixed two-shot
- 음향/대사/자막: 팀장: 기록은 못 고쳐. 20년 전 거야. / 해인: 압니다. 이번 조사 명단에만. | SUB: The record can't be changed. It's twenty years old. / I know. Just this survey's roster.
- 예상 실패: 입 모양 불일치 → 재생성: 대사는 후반 더빙. 입은 'speaks briefly'만
```
Korean woman, 34, black low ponytail, black technical work jacket, headlamp strap on forehead writes a name on a form with a pen. Across the desk a gray-haired middle-aged man in a gray jacket watches and speaks briefly. Fixed two-shot, office, fluorescent light. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Palette: pure black shadows, warm orange headlamp light, bone-white carbonate deposits. No text, no logos, no subtitles, no lens flare.
```

### 2-4 · 1:05–1:10 · 사용 5s / 요청 5s · T2V · P2
- 기능: 팀장이 서명한다
- 레퍼런스: R-LEADER · 카메라: fixed
- 음향/대사/자막: 없음
- 예상 실패: — → 재생성: —
```
Close on a man's hand holding a pen above a signature box, hesitating, then signing. Fixed camera, fluorescent light, desk. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Palette: pure black shadows, warm orange headlamp light, bone-white carbonate deposits. No text, no logos, no subtitles, no lens flare.
```

## S3. 월정리 동수의 집

### 3-1 · 1:10–1:16 · 사용 6s / 요청 10s · T2V · P2
- 기능: 돌담길, 밭마다 팻말
- 레퍼런스: R-GATE;R-HI · 카메라: slow tracking
- 음향/대사/자막: 바람. 팻말 1개 문구 편집 합성(일반 법령 수준): 천연기념물 제466호 보호구역 · 현상변경 허가 필요
- 예상 실패: 팻말에 가짜 글자 → 재생성: 'blank sign' 명시 후 합성
```
Evening. Korean woman, 34, black low ponytail, black technical work jacket, headlamp strap on forehead walks along a Jeju black-stone-wall lane past quiet fields. On one field gate a single weathered official notice board on a post. Slow tracking beside her. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Palette: pure black shadows, warm orange headlamp light, bone-white carbonate deposits. No text, no logos, no subtitles, no lens flare.
```

### 3-2 · 1:16–1:20 · 사용 4s / 요청 5s · REF · P2
- 기능: 이웃이 고개를 돌린다
- 레퍼런스: R-HI · 카메라: fixed medium
- 음향/대사/자막: 없음
- 예상 실패: 노인이 웃음 → 재생성: 'expression closed, avoids eye contact'
```
An elderly Jeju farmer walking toward Korean woman, 34, black low ponytail, black technical work jacket, headlamp strap on forehead on the lane sees her, turns his head away and passes without greeting. Fixed medium shot, dusk. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Palette: pure black shadows, warm orange headlamp light, bone-white carbonate deposits. No text, no logos, no subtitles, no lens flare.
```

### 3-3 · 1:20–1:25 · 사용 5s / 요청 5s · I2V · P1
- 기능: 밥상 위 그릇 하나
- 레퍼런스: R-HOME · 카메라: slow push-in
- 음향/대사/자막: TV 소리 낮게
- 예상 실패: 그릇이 둘 → 재생성: 'exactly one bowl, one spoon'
```
Small rural Korean room at night, one bare incandescent bulb. Low table with one bowl of rice and one spoon. Old TV glow flickers on the wall. Slow push-in on the single bowl. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Palette: pure black shadows, warm orange headlamp light, bone-white carbonate deposits. No text, no logos, no subtitles, no lens flare.
```

### 3-4 · 1:25–1:30 · 사용 5s / 요청 5s · I2V · P1
- 기능: 보지 않고 먹는다. 숟가락을 더듬는다
- 레퍼런스: R-DS25 · 카메라: fixed medium
- 음향/대사/자막: 없음
- 예상 실패: TV를 쳐다봄 → 재생성: 'eyes stay down the whole time'
```
Korean man, 64, short white hair, weathered face, thick calloused hands, faded orange safety vest, old scratched white hard hat, gray shirt, no hat, eats alone at a low table with his eyes lowered, never looking at the glowing TV, his hand feeling for the spoon by touch. Fixed medium shot, warm bulb light. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Palette: pure black shadows, warm orange headlamp light, bone-white carbonate deposits. No text, no logos, no subtitles, no lens flare.
```

### 3-5 · 1:30–1:35 · 사용 5s / 요청 5s · T2V · P2
- 기능: 벽의 안전모와 액자
- 레퍼런스: R-HOME · 카메라: slow pan
- 음향/대사/자막: 없음
- 예상 실패: 액자 속 인물 얼굴 왜곡 → 재생성: 액자 이미지는 R-PHOTO로 별도 생성 후 합성
```
Slow pan across a wall under warm bulb light: a scratched white hard hat on a nail, then a faded framed snapshot (1996 date stamp in the corner) of a young man carrying a small girl on his shoulders in front of a concrete utility pole. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Palette: pure black shadows, warm orange headlamp light, bone-white carbonate deposits. No text, no logos, no subtitles, no lens flare.
```

### 3-6 · 1:35–1:40 · 사용 5s / 요청 5s · REF · P1
- 기능: 문을 연다. 딸을 보지 않고 문고리를 만진다
- 레퍼런스: R-DS25;R-HI · 카메라: fixed
- 음향/대사/자막: 동수: …몇 년 만이냐. / 해인: 3년. | SUB: …How many years has it been. / Three.
- 예상 실패: 눈을 마주침 → 재생성: 'he looks at the door frame, not at her'
```
Korean man, 64, short white hair, weathered face, thick calloused hands, faded orange safety vest, old scratched white hard hat, no hat, opens a wooden door. Outside in the dark stands Korean woman, 34, black low ponytail, black technical work jacket, headlamp strap on forehead. He does not meet her eyes; his hand stays on the door handle, thumb moving over the metal. Fixed shot from inside the house. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Palette: pure black shadows, warm orange headlamp light, bone-white carbonate deposits. No text, no logos, no subtitles, no lens flare.
```

### 3-7 · 1:40–1:46 · 사용 6s / 요청 10s · REF · P1
- 기능: 허가서. 뚫은 놈. 니도.
- 레퍼런스: R-DS25;R-HI · 카메라: fixed two-shot
- 음향/대사/자막: 동수: 20년 동안 나보고 뚫은 놈이라 그랬다. 니도. / 해인: …맞잖아요. | SUB: For twenty years they called me the man who broke it. You did too. / …You did.
- 예상 실패: — → 재생성: —
```
Inside the room, Korean woman, 34, black low ponytail, black technical work jacket, headlamp strap on forehead holds out a folded document. Korean man, 64, short white hair, weathered face, thick calloused hands, faded orange safety vest, old scratched white hard hat, no hat, does not take it; he looks at the hard hat on the wall. Fixed two-shot, warm bulb light, long pause. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Palette: pure black shadows, warm orange headlamp light, bone-white carbonate deposits. No text, no logos, no subtitles, no lens flare.
```

### 3-8 · 1:46–1:51 · 사용 5s / 요청 5s · I2V · P1
- 기능: 안전모를 내려 먼지를 턴다
- 레퍼런스: R-DS25 · 카메라: fixed macro
- 음향/대사/자막: 먼지 터는 소리
- 예상 실패: 손가락 6개 → 재생성: 'five fingers' 명시, 손 레퍼런스 R-DS25-hand 첨부
```
Close on thick weathered hands lifting an old white hard hat from a nail and brushing dust off it with a palm. Warm light. Fixed camera. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Palette: pure black shadows, warm orange headlamp light, bone-white carbonate deposits. No text, no logos, no subtitles, no lens flare.
```

### 3-9 · 1:51–1:55 · 사용 4s / 요청 5s · I2V · P2
- 기능: 해인이 그릇 하나를 본다
- 레퍼런스: R-HI · 카메라: slow push-in
- 음향/대사/자막: 없음
- 예상 실패: — → 재생성: —
```
Korean woman, 34, black low ponytail, black technical work jacket, headlamp strap on forehead, indoors, glances down at a low table with one bowl and one spoon and says nothing. Slow push-in on her face. Warm bulb light. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Palette: pure black shadows, warm orange headlamp light, bone-white carbonate deposits. No text, no logos, no subtitles, no lens flare.
```

## S4. 입구

### 4-1 · 1:55–2:00 · 사용 5s / 요청 5s · I2V · P2
- 기능: 전신주, 철문, 조사팀
- 레퍼런스: R-GATE;R-TEAM · 카메라: slow aerial pull-out
- 음향/대사/자막: 없음
- 예상 실패: 철문이 지하실 문처럼 큼 → 재생성: 'small hatch, about one meter square'
```
Overcast morning. Flat Jeju field with black stone walls, a concrete utility pole, a rusted steel hatch in a concrete frame beside it. A cave survey team in identical black work jackets and headlamps, faces in shadow unloads equipment from a white van. Slow aerial pull-out. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Palette: pure black shadows, warm orange headlamp light, bone-white carbonate deposits. No text, no logos, no subtitles, no lens flare.
```

### 4-2 · 2:00–2:05 · 사용 5s / 요청 5s · REF · P1
- 기능: 헤드랜턴을 씌운다. 손이 이마에 닿는다
- 레퍼런스: R-DS25;R-HI · 카메라: fixed close two-shot
- 음향/대사/자막: 없음
- 예상 실패: — → 재생성: —
```
Korean woman, 34, black low ponytail, black technical work jacket, headlamp strap on forehead fastens a headlamp over an old white hard hat worn by Korean man, 64, short white hair, weathered face, thick calloused hands, faded orange safety vest, old scratched white hard hat. Her fingers touch his forehead for a moment; both go still. Close two-shot, fixed, overcast light. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Palette: pure black shadows, warm orange headlamp light, bone-white carbonate deposits. No text, no logos, no subtitles, no lens flare.
```

### 4-3 · 2:05–2:10 · 사용 5s / 요청 5s · REF · P1
- 기능: 철문이 열리고 바람이 올라온다 (S1-3 매치)
- 레퍼런스: R-DS25 · 카메라: slow push-in
- 음향/대사/자막: 바람 소리 (S1-3과 동일 음원)
- 예상 실패: — → 재생성: —
```
A steel hatch door swings open. Cold air rises from the dark and lifts the white hair of Korean man, 64, short white hair, weathered face, thick calloused hands, faded orange safety vest, old scratched white hard hat standing at the edge. Slow push-in. Overcast. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Palette: pure black shadows, warm orange headlamp light, bone-white carbonate deposits. No text, no logos, no subtitles, no lens flare.
```

### 4-4 · 2:10–2:15 · 사용 5s / 요청 5s · T2V · P2
- 기능: 위에서 본 구멍, 작아지는 빛
- 레퍼런스: 없음 · 카메라: fixed top-down
- 음향/대사/자막: 없음
- 예상 실패: — → 재생성: —
```
Looking straight down a dark vertical shaft. Headlamp circles descend one by one, growing smaller, until the last one moves out of view. Fixed top-down camera. Pure black. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Palette: pure black shadows, warm orange headlamp light, bone-white carbonate deposits. No text, no logos, no subtitles, no lens flare.
```

## S5. 동굴 상류 흰 벽

### 5-1 · 2:15–2:22 · 사용 7s / 요청 10s · I2V · P1
- 기능: 용암두루마리 벽을 훑는 랜턴 원 여섯 개
- 레퍼런스: R-ROLL · 카메라: slow tracking
- 음향/대사/자막: 발소리, 물방울
- 예상 실패: 벽 전체가 밝아짐 → 재생성: CAVE 문구 반복, 'beams are small circles'
```
Pitch-black lava tube. Six headlamp beams sweep across a black basalt wall carrying long horizontal rolled ridges like a scroll, with bone-white calcite flows over it. Beams cross and separate. Slow tracking along the wall. Only headlamps light the scene. Everything outside the beams is pure black; do not reveal cave walls beyond the light. Black basalt walls streaked with bone-white calcite. Not a limestone cave: never brighten the whole cave. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Palette: pure black shadows, warm orange headlamp light, bone-white carbonate deposits. No text, no logos, no subtitles, no lens flare.
```

### 5-2 · 2:22–2:27 · 사용 5s / 요청 5s · I2V · P1
- 기능: 뿌리를 따라 자란 흰 종유관, 물방울
- 레퍼런스: R-ROOT · 카메라: slow tilt up
- 음향/대사/자막: 물방울 1회
- 예상 실패: 종유관이 굵은 고드름 → 재생성: 'thin straws, pencil-thin'
```
A headlamp beam tilts up to a black basalt ceiling where thin bone-white soda-straw stalactites hang along the paths of tree roots. A single water drop swells at a tip and falls. Slow tilt up then hold. Only headlamps light the scene. Everything outside the beams is pure black; do not reveal cave walls beyond the light. Black basalt walls streaked with bone-white calcite. Not a limestone cave: never brighten the whole cave. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Palette: pure black shadows, warm orange headlamp light, bone-white carbonate deposits. No text, no logos, no subtitles, no lens flare.
```

### 5-3 · 2:27–2:34 · 사용 7s / 요청 10s · REF · P0
- 기능: 흰 벽 앞에서 손이 멈춘다
- 레퍼런스: R-DS25;R-WALL · 카메라: fixed side profile
- 음향/대사/자막: 해인(화면 밖): 만지면 안 돼요. | SUB: Don't touch.
- 예상 실패: 손이 벽에 닿음 → 재생성: 'the hand never touches the wall, stops with a visible gap'
```
Korean man, 64, short white hair, weathered face, thick calloused hands, faded orange safety vest, old scratched white hard hat with headlamp stands before a white calcite wall in a black cave. He slowly reaches out his thick hand toward the white, then stops a hand's width away and holds. Fixed side profile; his own headlamp is the only light. Only headlamps light the scene. Everything outside the beams is pure black; do not reveal cave walls beyond the light. Black basalt walls streaked with bone-white calcite. Not a limestone cave: never brighten the whole cave. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Palette: pure black shadows, warm orange headlamp light, bone-white carbonate deposits. No text, no logos, no subtitles, no lens flare.
```

### 5-4 · 2:34–2:40 · 사용 6s / 요청 10s · REF · P1
- 기능: 멈춘 손 → 해인의 시선
- 레퍼런스: R-HI · 카메라: rack focus
- 음향/대사/자막: 없음
- 예상 실패: — → 재생성: —
```
Close on a weathered hand frozen a hand's width from a white calcite wall. Rack focus to Korean woman, 34, black low ponytail, black technical work jacket, headlamp strap on forehead in the background watching the hand, her headlamp beam low. Only headlamps light the scene. Everything outside the beams is pure black; do not reveal cave walls beyond the light. Black basalt walls streaked with bone-white calcite. Not a limestone cave: never brighten the whole cave. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Palette: pure black shadows, warm orange headlamp light, bone-white carbonate deposits. No text, no logos, no subtitles, no lens flare.
```

## S6. 호수

### 6-1 · 2:40–2:47 · 사용 7s / 요청 10s · I2V · P1
- 기능: 보트. 빛이 두 번
- 레퍼런스: R-LAKE · 카메라: slow tracking side
- 음향/대사/자막: 노 젓는 물소리
- 예상 실패: 보트에 모터/셋째 인물 → 재생성: 'two people only, no motor'
```
A small gray rubber boat glides on perfectly still black underground water; Korean woman, 34, black low ponytail, black technical work jacket, headlamp strap on forehead rows at the back, Korean man, 64, short white hair, weathered face, thick calloused hands, faded orange safety vest, old scratched white hard hat sits at the front. Their headlamps reflect off the water onto a low basalt ceiling as two circles of light. Slow tracking from the side. Only headlamps light the scene. Everything outside the beams is pure black; do not reveal cave walls beyond the light. Black basalt walls streaked with bone-white calcite. Not a limestone cave: never brighten the whole cave. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Palette: pure black shadows, warm orange headlamp light, bone-white carbonate deposits. No text, no logos, no subtitles, no lens flare.
```

### 6-2 · 2:47–2:52 · 사용 5s / 요청 5s · T2V · P2
- 기능: 담수·염수 경계 아지랑이
- 레퍼런스: R-LAKE · 카메라: slow push-in
- 음향/대사/자막: 없음
- 예상 실패: 층이 안개로 보임 → 재생성: 'sharp refraction layer, not fog'
```
A headlamp beam shines down into clear black water. A shimmering, wavering layer where fresh water meets denser salt water, like heat haze underwater. Slow push-in. Only headlamps light the scene. Everything outside the beams is pure black; do not reveal cave walls beyond the light. Black basalt walls streaked with bone-white calcite. Not a limestone cave: never brighten the whole cave. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Palette: pure black shadows, warm orange headlamp light, bone-white carbonate deposits. No text, no logos, no subtitles, no lens flare.
```

### 6-3 · 2:52–2:59 · 사용 7s / 요청 10s · I2V · P0
- 기능: 눈이 퇴화한 물고기
- 레퍼런스: R-FISH · 카메라: slow tracking with fish
- 음향/대사/자막: 없음
- 예상 실패: 눈이 생김 / 물고기가 둘 → 재생성: 'no visible eyeball', 'one fish only' 2회 반복
```
A small pale-pink translucent cave goby, 4 cm, with an unusually large head and eyes reduced to two tiny dark dots beneath the skin, drifts slowly through a warm headlamp beam in black water beside a rubber boat edge. It does not flee the light. Macro, slow tracking. Only headlamps light the scene. Everything outside the beams is pure black; do not reveal cave walls beyond the light. Black basalt walls streaked with bone-white calcite. Not a limestone cave: never brighten the whole cave. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Palette: pure black shadows, warm orange headlamp light, bone-white carbonate deposits. No text, no logos, no subtitles, no lens flare.
```

### 6-4 · 2:59–3:04 · 사용 5s / 요청 5s · REF · P1
- 기능: 동수가 들여다본다. 빛이 없어서 눈이 없어진 거냐
- 레퍼런스: R-DS25 · 카메라: fixed close
- 음향/대사/자막: 동수: 빛이 없어서 눈이 없어진 거냐. | SUB: Did they lose their eyes because there's no light?
- 예상 실패: — → 재생성: —
```
Korean man, 64, short white hair, weathered face, thick calloused hands, faded orange safety vest, old scratched white hard hat leans over the edge of a rubber boat and looks down into black water lit by his headlamp, his face faintly reflected. Fixed close shot. Only headlamps light the scene. Everything outside the beams is pure black; do not reveal cave walls beyond the light. Black basalt walls streaked with bone-white calcite. Not a limestone cave: never brighten the whole cave. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Palette: pure black shadows, warm orange headlamp light, bone-white carbonate deposits. No text, no logos, no subtitles, no lens flare.
```

### 6-5 · 3:04–3:09 · 사용 5s / 요청 5s · REF · P1
- 기능: 해인: 안 써도 살 수 있어서요
- 레퍼런스: R-HI · 카메라: fixed medium
- 음향/대사/자막: 해인: …안 써도 살 수 있었나 봐요. | SUB: …Maybe they could live without using them.
- 예상 실패: — → 재생성: —
```
Korean woman, 34, black low ponytail, black technical work jacket, headlamp strap on forehead holds the oars still and looks at the man across the boat, calm, and speaks one short line. Fixed medium shot, black water, her beam low. Only headlamps light the scene. Everything outside the beams is pure black; do not reveal cave walls beyond the light. Black basalt walls streaked with bone-white calcite. Not a limestone cave: never brighten the whole cave. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Palette: pure black shadows, warm orange headlamp light, bone-white carbonate deposits. No text, no logos, no subtitles, no lens flare.
```

### 6-6 · 3:09–3:15 · 사용 6s / 요청 10s · REF · P0
- 기능: 동수가 자기 손을 내려다본다. 그럼 뭘 보고 사냐
- 레퍼런스: R-DS25 · 카메라: fixed close
- 음향/대사/자막: 동수: 그럼 뭘 보고 사냐. / 해인(화면 밖): 안 봐요. 느껴요. | SUB: Then what do they see by? / They don't see. They feel.
- 예상 실패: 손가락 수 → 재생성: 손 레퍼런스 첨부, 'five fingers each'
```
Korean man, 64, short white hair, weathered face, thick calloused hands, faded orange safety vest, old scratched white hard hat in a rubber boat slowly turns his thick weathered hands palm-up in his own headlamp light and looks at them. Fixed close shot, black water beyond. Only headlamps light the scene. Everything outside the beams is pure black; do not reveal cave walls beyond the light. Black basalt walls streaked with bone-white calcite. Not a limestone cave: never brighten the whole cave. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Palette: pure black shadows, warm orange headlamp light, bone-white carbonate deposits. No text, no logos, no subtitles, no lens flare.
```

### 6-7 · 3:15–3:20 · 사용 5s / 요청 5s · I2V · P1
- 기능: 물고기가 빛을 가로질러 사라진다
- 레퍼런스: R-FISH · 카메라: fixed macro
- 음향/대사/자막: 없음
- 예상 실패: — → 재생성: —
```
The pale-pink translucent goby, eyes buried beneath its skin, crosses the full width of a headlamp beam in black water and disappears at the edge of the light. Fixed macro. Only headlamps light the scene. Everything outside the beams is pure black; do not reveal cave walls beyond the light. Black basalt walls streaked with bone-white calcite. Not a limestone cave: never brighten the whole cave. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Palette: pure black shadows, warm orange headlamp light, bone-white carbonate deposits. No text, no logos, no subtitles, no lens flare.
```

## S7. 호수 끝 모래 둑

### 7-1 · 3:20–3:25 · 사용 5s / 요청 5s · I2V · P2
- 기능: 보트가 모래에 닿는다. 파도 소리
- 레퍼런스: R-SAND · 카메라: fixed low from boat
- 음향/대사/자막: 먼 파도 소리
- 예상 실패: — → 재생성: —
```
The nose of a rubber boat slides onto a dark sand bank at the end of black underground water. A headlamp beam ahead reveals sand rising into darkness. Fixed low camera from the boat. Only headlamps light the scene. Everything outside the beams is pure black; do not reveal cave walls beyond the light. Black basalt walls streaked with bone-white calcite. Not a limestone cave: never brighten the whole cave. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Palette: pure black shadows, warm orange headlamp light, bone-white carbonate deposits. No text, no logos, no subtitles, no lens flare.
```

### 7-2 · 3:25–3:30 · 사용 5s / 요청 5s · I2V · P1
- 기능: 항아리들, 벽의 두 글자
- 레퍼런스: R-SAND;R-INSCRIPTION · 카메라: slow pan
- 음향/대사/자막: 없음
- 예상 실패: 글자가 엉뚱한 문자 → 재생성: 'two scratched marks, illegible' 후 합성
```
A headlamp beam settles on round stoneware jars half-buried in dark sand, one tipped over, abalone shells scattered. The beam lifts to a black basalt wall where two carved characters are half-covered by white calcite crust. Slow pan from jars to wall. (Characters 火川 composited in editing.) Only headlamps light the scene. Everything outside the beams is pure black; do not reveal cave walls beyond the light. Black basalt walls streaked with bone-white calcite. Not a limestone cave: never brighten the whole cave. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Palette: pure black shadows, warm orange headlamp light, bone-white carbonate deposits. No text, no logos, no subtitles, no lens flare.
```

### 7-3 · 3:30–3:36 · 사용 6s / 요청 10s · T2V · P2
- 기능: 회상(창작 재현): 횃불, 항아리를 두고 글자를 긋는다
- 레퍼런스: R-SILLA · 카메라: fixed wide
- 음향/대사/자막: 횃불 소리. 화면 하단 자막(본편 6초 내내): 창작 재현 — 유물은 실제, 장면은 상상 / Dramatization — artifacts are real, the scene is imagined
- 예상 실패: 얼굴이 보임 → 재생성: 'faces never lit'
```
Same sand bank long ago. Four figures in rough undyed hemp clothing hold pine torches, faces entirely outside the firelight. One kneels and sets a round stoneware jar on the wet sand; another scratches marks into the black wall with an iron point. Only torchlight, deep orange, black beyond. Silhouettes, dreamlike. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Palette: pure black shadows, warm orange headlamp light, bone-white carbonate deposits. No text, no logos, no subtitles, no lens flare.
```

### 7-4 · 3:36–3:40 · 사용 4s / 요청 5s · T2V · P2
- 기능: 횃불이 돌아선다 → 현재 항아리
- 레퍼런스: R-SAND · 카메라: fixed same framing
- 음향/대사/자막: 없음
- 예상 실패: — → 재생성: —
```
The torches turn and walk away up the sand into darkness until the last flame disappears. Hold on black. Then a cool white headlamp beam fades in on the same jar, now half-buried and 1,200 years old. Fixed camera, same framing. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Palette: pure black shadows, warm orange headlamp light, bone-white carbonate deposits. No text, no logos, no subtitles, no lens flare.
```

## S8. 바위 틈 장갑

### 8-1 · 3:40–3:45 · 사용 5s / 요청 5s · T2V · P1
- 기능: 랜턴이 바위 틈에서 멈춘다. 장갑
- 레퍼런스: R-GLOVE · 카메라: slow pan then hold
- 음향/대사/자막: 없음
- 예상 실패: — → 재생성: —
```
A headlamp beam sweeps along a black basalt crevice at the edge of a sand bank, then stops. In the beam: a yellow rubber work glove crusted in white calcite. Slow pan then hold. Only headlamps light the scene. Everything outside the beams is pure black; do not reveal cave walls beyond the light. Black basalt walls streaked with bone-white calcite. Not a limestone cave: never brighten the whole cave. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Palette: pure black shadows, warm orange headlamp light, bone-white carbonate deposits. No text, no logos, no subtitles, no lens flare.
```

### 8-2 · 3:45–3:50 · 사용 5s / 요청 5s · REF · P1
- 기능: 동수가 얼어붙는다
- 레퍼런스: R-DS25 · 카메라: slow push-in
- 음향/대사/자막: 없음
- 예상 실패: — → 재생성: —
```
Korean man, 64, short white hair, weathered face, thick calloused hands, faded orange safety vest, old scratched white hard hat with headlamp stares at something low in a rock crevice. His body goes completely still; his beam trembles slightly. Slow push-in on his face. Only headlamps light the scene. Everything outside the beams is pure black; do not reveal cave walls beyond the light. Black basalt walls streaked with bone-white calcite. Not a limestone cave: never brighten the whole cave. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Palette: pure black shadows, warm orange headlamp light, bone-white carbonate deposits. No text, no logos, no subtitles, no lens flare.
```

### 8-3 · 3:50–3:55 · 사용 5s / 요청 5s · REF · P1
- 기능: 해인이 본다. 사진을 찍고 기록한다 (보존 절차)
- 레퍼런스: R-HI · 카메라: fixed medium
- 음향/대사/자막: 셔터음
- 예상 실패: 플래시가 동굴 전체를 밝힘 → 재생성: 'brief small flash, cave stays black'
```
Korean woman, 34, black low ponytail, black technical work jacket, headlamp strap on forehead approaches, sees the yellow glove in the crevice, pauses, then raises a rugged camera-tablet and photographs it with a small flash, and writes on a clipboard. Fixed medium shot, headlamp light. Only headlamps light the scene. Everything outside the beams is pure black; do not reveal cave walls beyond the light. Black basalt walls streaked with bone-white calcite. Not a limestone cave: never brighten the whole cave. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Palette: pure black shadows, warm orange headlamp light, bone-white carbonate deposits. No text, no logos, no subtitles, no lens flare.
```

### 8-4 · 3:55–4:00 · 사용 5s / 요청 5s · REF · P0
- 기능: 장갑을 표본 봉투에 넣는다. 라벨 한 칸은 비어 있다
- 레퍼런스: R-HI;R-GLOVE · 카메라: fixed macro
- 음향/대사/자막: 없음
- 예상 실패: 라벨에 가짜 글자 → 재생성: 'blank label' 후 합성: 유입 경위: ______
```
Close on gloved hands lifting the calcite-crusted yellow glove from the crevice with tweezers-like care and sliding it into a clear specimen bag with a white label. White dust falls. The pen hovers over one blank line on the label and does not write. Fixed macro, headlamp light. Only headlamps light the scene. Everything outside the beams is pure black; do not reveal cave walls beyond the light. Black basalt walls streaked with bone-white calcite. Not a limestone cave: never brighten the whole cave. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Palette: pure black shadows, warm orange headlamp light, bone-white carbonate deposits. No text, no logos, no subtitles, no lens flare.
```

### 8-5 · 4:00–4:06 · 사용 6s / 요청 10s · REF · P0
- 기능: 봉투를 아버지 손에 쥐어준다
- 레퍼런스: R-HI;R-DS25;R-GLOVE · 카메라: fixed macro
- 음향/대사/자막: 없음
- 예상 실패: — → 재생성: —
```
Close on hands. A young woman's hand places a clear specimen bag holding a white-crusted yellow glove into an older man's thick open palm. His fingers close on it. Fixed macro, warm headlamp light. Only headlamps light the scene. Everything outside the beams is pure black; do not reveal cave walls beyond the light. Black basalt walls streaked with bone-white calcite. Not a limestone cave: never brighten the whole cave. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Palette: pure black shadows, warm orange headlamp light, bone-white carbonate deposits. No text, no logos, no subtitles, no lens flare.
```

### 8-6 · 4:06–4:10 · 사용 4s / 요청 5s · REF · P2
- 기능: 해인이 돌아서 보트로 간다
- 레퍼런스: R-HI · 카메라: fixed wide from behind
- 음향/대사/자막: 없음
- 예상 실패: — → 재생성: —
```
Korean woman, 34, black low ponytail, black technical work jacket, headlamp strap on forehead turns away and walks back across dark sand toward a rubber boat, her headlamp beam leading. Behind her the man stands alone holding a small bag. Fixed wide from behind her. Only headlamps light the scene. Everything outside the beams is pure black; do not reveal cave walls beyond the light. Black basalt walls streaked with bone-white calcite. Not a limestone cave: never brighten the whole cave. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Palette: pure black shadows, warm orange headlamp light, bone-white carbonate deposits. No text, no logos, no subtitles, no lens flare.
```

## S9. 호수 가운데 어둠

### 9-1 · 4:10–4:15 · 사용 5s / 요청 5s · REF · P1
- 기능: 보트가 호수 가운데. 노를 멈춘다. 끄죠
- 레퍼런스: R-HI;R-DS25;R-LAKE · 카메라: fixed wide side
- 음향/대사/자막: 해인: 끄죠. | SUB: Let's turn them off.
- 예상 실패: — → 재생성: —
```
Rubber boat in the middle of a black underground lake. Korean woman, 34, black low ponytail, black technical work jacket, headlamp strap on forehead at the back stops rowing; Korean man, 64, short white hair, weathered face, thick calloused hands, faded orange safety vest, old scratched white hard hat at the front. Two headlamp circles on water and ceiling. Fixed wide from the side. Only headlamps light the scene. Everything outside the beams is pure black; do not reveal cave walls beyond the light. Black basalt walls streaked with bone-white calcite. Not a limestone cave: never brighten the whole cave. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Palette: pure black shadows, warm orange headlamp light, bone-white carbonate deposits. No text, no logos, no subtitles, no lens flare.
```

### 9-2 · 4:15–4:19 · 사용 4s / 요청 5s · REF · P1
- 기능: 랜턴 두 개가 꺼진다 → 검정
- 레퍼런스: R-HI;R-DS25 · 카메라: fixed close two-shot
- 음향/대사/자막: 없음
- 예상 실패: 프레임이 회색으로 남음 → 재생성: 마지막 1초는 편집에서 검정 처리
```
Close two-shot in a boat: both people reach up and switch off their headlamps one after the other. Light disappears; the frame goes to pure black. Fixed camera. Only headlamps light the scene. Everything outside the beams is pure black; do not reveal cave walls beyond the light. Black basalt walls streaked with bone-white calcite. Not a limestone cave: never brighten the whole cave. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Palette: pure black shadows, warm orange headlamp light, bone-white carbonate deposits. No text, no logos, no subtitles, no lens flare.
```

### BLACK · 4:19–4:29 (10s) · 생성 없음
- 암전 (기본 10초, 8/15초 대안)
- 음향/대사: 물방울, 두 사람의 숨, 먼 파도. 동수: …보인다. / 해인: 뭐가요. / 동수: 아무것도. | SUB: …I can see. / See what. / Nothing.

### 9-3 · 4:29–4:35 · 사용 6s / 요청 10s · REF · P0
- 기능: 랜턴이 켜진다. 이미 잡혀 있는 두 손
- 레퍼런스: R-HI-hand;R-DS25-hand · 카메라: fixed macro
- 음향/대사/자막: 숨소리
- 예상 실패: 손가락 수 / 손 위치가 9-4와 다름 → 재생성: 손 레퍼런스 2쌍 고정. 10회 이상 생성. 채택 컷의 손 위치를 9-4 프롬프트에 기술
```
Pure black. A single headlamp switches on. In the new circle of light, resting on a rubber boat edge: a young woman's slender hand lying on top of an older man's thick weathered hand. Neither hand moves. Fixed macro, nothing else visible. Only headlamps light the scene. Everything outside the beams is pure black; do not reveal cave walls beyond the light. Black basalt walls streaked with bone-white calcite. Not a limestone cave: never brighten the whole cave. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Palette: pure black shadows, warm orange headlamp light, bone-white carbonate deposits. No text, no logos, no subtitles, no lens flare.
```

### 9-4 · 4:35–4:40 · 사용 5s / 요청 5s · REF · P0
- 기능: 둘 다 손을 쳐다보지 않는다
- 레퍼런스: R-HI;R-DS25 · 카메라: fixed two-shot
- 음향/대사/자막: 없음
- 예상 실패: 손이 떨어져 있음 → 재생성: 'hands stay joined, same position as previous shot'
```
Two-shot in a rubber boat under one headlamp: Korean man, 64, short white hair, weathered face, thick calloused hands, faded orange safety vest, old scratched white hard hat looks down at the water, Korean woman, 34, black low ponytail, black technical work jacket, headlamp strap on forehead looks up at the ceiling, their joined hands resting on the boat edge between them, out of focus, woman's hand on top. Neither looks at the hands. Fixed. Only headlamps light the scene. Everything outside the beams is pure black; do not reveal cave walls beyond the light. Black basalt walls streaked with bone-white calcite. Not a limestone cave: never brighten the whole cave. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Palette: pure black shadows, warm orange headlamp light, bone-white carbonate deposits. No text, no logos, no subtitles, no lens flare.
```

### 9-5 · 4:40–4:45 · 사용 5s / 요청 5s · I2V · P2
- 기능: 물고기가 보트 옆을 지난다
- 레퍼런스: R-FISH · 카메라: fixed macro
- 음향/대사/자막: 없음
- 예상 실패: — → 재생성: —
```
The pale-pink translucent goby, eyes buried beneath its skin, drifts past a rubber boat edge at the bottom of a single headlamp beam and slips into black water. Fixed macro. Only headlamps light the scene. Everything outside the beams is pure black; do not reveal cave walls beyond the light. Black basalt walls streaked with bone-white calcite. Not a limestone cave: never brighten the whole cave. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Palette: pure black shadows, warm orange headlamp light, bone-white carbonate deposits. No text, no logos, no subtitles, no lens flare.
```

## S10. 지상 철문

### 10-1 · 4:45–4:50 · 사용 5s / 요청 5s · I2V · P1
- 기능: 저녁. 철문 앞 조사팀, 장비 내려놓음. 한 명이 비켜선다
- 레퍼런스: R-GATE-dusk;R-TEAM · 카메라: slow push-in
- 음향/대사/자막: 바람
- 예상 실패: 군중이 도열한 것처럼 보임 → 재생성: 'loosely gathered, not in lines'
```
Evening, flat Jeju field, blue dusk. A cave survey team in identical black work jackets and headlamps, faces in shadow waits around an open steel hatch, equipment set down. One researcher steps back from the hatch edge to make room. Slow push-in. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Palette: pure black shadows, warm orange headlamp light, bone-white carbonate deposits. No text, no logos, no subtitles, no lens flare.
```

### 10-2 · 4:50–4:55 · 사용 5s / 요청 5s · REF · P1
- 기능: 동수가 봉투를 들고 올라온다. 팀장이 안전모를 벗는다
- 레퍼런스: R-DS25;R-LEADER · 카메라: fixed low
- 음향/대사/자막: 없음
- 예상 실패: — → 재생성: —
```
Korean man, 64, short white hair, weathered face, thick calloused hands, faded orange safety vest, old scratched white hard hat climbs up out of a steel hatch in the ground holding a small clear specimen bag. Nearby a gray-haired team leader quietly takes off his own hard hat. Fixed low camera at ground level. Dusk. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Palette: pure black shadows, warm orange headlamp light, bone-white carbonate deposits. No text, no logos, no subtitles, no lens flare.
```

### 10-3 · 4:55–5:00 · 사용 5s / 요청 5s · REF · P1
- 기능: 팀장이 봉투를 받으려 손을 내민다. 동수가 봉투를 본다
- 레퍼런스: R-DS25;R-LEADER · 카메라: fixed medium
- 음향/대사/자막: 없음
- 예상 실패: — → 재생성: —
```
The team leader holds out an open hand toward Korean man, 64, short white hair, weathered face, thick calloused hands, faded orange safety vest, old scratched white hard hat, who looks down at the specimen bag in his own hand for a long moment. Fixed medium two-shot, dusk. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Palette: pure black shadows, warm orange headlamp light, bone-white carbonate deposits. No text, no logos, no subtitles, no lens flare.
```

### 10-4 · 5:00–5:06 · 사용 6s / 요청 10s · REF · P1
- 기능: 동수가 봉투를 건넨다(클로즈업). 동굴이나 잘 닫으쇼
- 레퍼런스: R-DS25;R-LEADER;R-BAG · 카메라: fixed close
- 음향/대사/자막: 팀장: 보고서에 올리겠습니다. / 동수: …동굴이나 잘 닫으쇼. | SUB: I'll put it in the report. / …Just close the cave properly.
- 예상 실패: — → 재생성: —
```
Close on hands and faces: Korean man, 64, short white hair, weathered face, thick calloused hands, faded orange safety vest, old scratched white hard hat places the clear specimen bag into the team leader's open hand with his right hand and lets go slowly. The leader says something; the old man answers in a few words and looks away toward the field. Fixed close two-shot, dusk. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Palette: pure black shadows, warm orange headlamp light, bone-white carbonate deposits. No text, no logos, no subtitles, no lens flare.
```

### 10-5 · 5:06–5:11 · 사용 5s / 요청 5s · REF · P0
- 기능: 해인이 봉투 라벨의 빈 칸에 쓴다
- 레퍼런스: R-HI;R-GLOVE · 카메라: fixed macro
- 음향/대사/자막: 펜 소리. 자막 합성: Origin: dropped during construction, 2005 — Kim Dong-su
- 예상 실패: 가짜 글자 → 재생성: 'blank label' 후 합성
```
Close on Korean woman, 34, black low ponytail, black technical work jacket, headlamp strap on forehead's hand writing with a pen on the white label of a clear specimen bag that holds a calcite-crusted yellow glove, held flat on a clipboard. Fixed macro, dusk light. (Text '유입 경위: 2005년 공사 중 낙하 — 김동수' composited.) Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Palette: pure black shadows, warm orange headlamp light, bone-white carbonate deposits. No text, no logos, no subtitles, no lens flare.
```

### 10-6 · 5:11–5:16 · 사용 5s / 요청 5s · REF · P1
- 기능: 팀장이 읽고 아래에 서명한다. 사람들이 조용히 본다
- 레퍼런스: R-LEADER;R-TEAM · 카메라: fixed medium
- 음향/대사/자막: 없음
- 예상 실패: 집단이 고개를 숙임 → 재생성: 'no bowing, heads level'
```
The gray-haired team leader reads the label, nods once, and signs below it. Around him cave survey team in identical black work jackets and headlamps, faces in shadow watches in silence; no one bows, no one speaks. Fixed medium, dusk. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Palette: pure black shadows, warm orange headlamp light, bone-white carbonate deposits. No text, no logos, no subtitles, no lens flare.
```

### 10-7 · 5:16–5:20 · 사용 4s / 요청 5s · REF · P0
- 기능: 봉투 속 장갑이 저녁빛 속으로 올라온다 (S1-5 대칭)
- 레퍼런스: R-GLOVE · 카메라: fixed low, tilt up
- 음향/대사/자막: 바람
- 예상 실패: — → 재생성: —
```
Low angle. A clear specimen bag holding a white-crusted yellow glove is lifted up into the last blue-orange dusk light above a dark field, held by a woman's hand. Slow tilt up with the bag. Sky behind. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Palette: pure black shadows, warm orange headlamp light, bone-white carbonate deposits. No text, no logos, no subtitles, no lens flare.
```

### 10-8 · 5:20–5:25 · 사용 5s / 요청 5s · T2V · P2
- 기능: 철문이 닫힌다. 자물쇠. 봉인지
- 레퍼런스: R-GATE-dusk · 카메라: fixed close
- 음향/대사/자막: 자물쇠 소리
- 예상 실패: 봉인지에 글자 → 재생성: 'blank white paper strip'
```
A steel hatch door closes over a concrete frame in a dark field. Hands fasten a heavy padlock and press an official paper seal across the seam. Fixed close on the seam, dusk to night. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Palette: pure black shadows, warm orange headlamp light, bone-white carbonate deposits. No text, no logos, no subtitles, no lens flare.
```

## S11. 전신주

### 11-1 · 5:25–5:30 · 사용 5s / 요청 5s · REF · P1
- 기능: 동수가 전신주에 손을 댄다
- 레퍼런스: R-DS25;R-GATE · 카메라: slow push-in
- 음향/대사/자막: 전선 윙 소리
- 예상 실패: — → 재생성: —
```
Night wind over a Jeju field. A concrete utility pole, wires humming, a sealed hatch below it with a small sign. Korean man, 64, short white hair, weathered face, thick calloused hands, faded orange safety vest, old scratched white hard hat places his hand flat on the pole. Slow push-in on the hand. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Palette: pure black shadows, warm orange headlamp light, bone-white carbonate deposits. No text, no logos, no subtitles, no lens flare.
```

### 11-2 · 5:30–5:35 · 사용 5s / 요청 5s · REF · P0
- 기능: 동수가 처음으로 딸을 본다
- 레퍼런스: R-DS25;R-HI · 카메라: fixed close two-shot
- 음향/대사/자막: 없음
- 예상 실패: 눈을 피함 → 재생성: 'direct eye contact, held'
```
Korean man, 64, short white hair, weathered face, thick calloused hands, faded orange safety vest, old scratched white hard hat turns his head and looks directly at Korean woman, 34, black low ponytail, black technical work jacket, headlamp strap on forehead standing beside him, for the first time holding her gaze. She looks back. Night, wind, pole behind. Fixed close two-shot. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Palette: pure black shadows, warm orange headlamp light, bone-white carbonate deposits. No text, no logos, no subtitles, no lens flare.
```

### 11-3 · 5:35–5:40 · 사용 5s / 요청 5s · REF · P1
- 기능: 동수가 딸의 손을 잡는다. 둘이 앞을 본다
- 레퍼런스: R-DS25;R-HI · 카메라: slow pull-out
- 음향/대사/자막: 없음
- 예상 실패: — → 재생성: —
```
Wide from behind: Korean man, 64, short white hair, weathered face, thick calloused hands, faded orange safety vest, old scratched white hard hat and Korean woman, 34, black low ponytail, black technical work jacket, headlamp strap on forehead stand side by side before a utility pole in a dark field. His thick hand reaches sideways and takes hers. Both turn to face forward. Slow pull-out, wind in their hair. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Palette: pure black shadows, warm orange headlamp light, bone-white carbonate deposits. No text, no logos, no subtitles, no lens flare.
```

## S12. 크레딧

### CREDITS · 5:40–6:00 (20s) · 생성 없음
- 엔딩 크레딧
- 음향/대사: 무음→전선 소리
