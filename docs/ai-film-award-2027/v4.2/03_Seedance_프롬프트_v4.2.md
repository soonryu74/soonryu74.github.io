# 「입구」 v4.2 — Seedance 프롬프트 (샷별)

**단일 진실 소스** `02_입구_샷리스트_v4.2.csv` (gen_v4.py 생성). 총 65행, AI 61컷 331s / 전체 384s.

## 공통 블록 (v4.2 분리)

**STYLE_BASE — 모든 AI 샷 끝에 부착 (지상·실내 포함)**
```
Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Muted palette of black, warm orange practical light and bone-white. No text, no logos, no subtitles, no lens flare.
```
**CAVE_LIGHT — 동굴 샷에만 (광원블록 열 = CAVE_LIGHT)**
```
Pitch-black lava cave. Headlamp beams are the only light; everything outside the beams is pure black. Black basalt walls streaked with calcite in bone-white, pale yellow and rust-red tints. Not a limestone cave: never brighten the whole cave, zero ambient light.
```
**인물 상수**
```
DS (동굴·지상 장비): Korean man, 64, short white hair, deeply weathered face, thick calloused hands, faded orange safety vest over gray shirt, old scratched white hard hat
DS_HOME (실내, 안전모 없음): Korean man, 64, short white hair, deeply weathered face, thick calloused hands, worn gray long-sleeve shirt, bareheaded
DS05 (2005): Korean man, 44, short black hair wet with rain, orange safety vest, white hard hat
HI (동굴, 랜턴): Korean woman, 34, black low ponytail, small mole under left eye, black technical work jacket, headlamp strap on forehead
HI_CIVIL (사무실·돌담길·마지막): Korean woman, 34, black low ponytail, small mole under left eye, black technical work jacket, bareheaded
LEADER: gray-haired Korean man in his 50s, gray field jacket
TEAM: cave survey team in identical black work jackets and headlamps, faces in shadow
```

## 광원 규칙 (현실 정합)
- '광원 하나'는 샷 안의 **주광원이 하나**라는 뜻. 랜턴 여러 개가 보이는 샷(5-1, 6-1, 9-1)은 각 랜턴이 작은 원을 만들고 그 사이는 검정. 수면 반사(6-1)는 같은 랜턴의 2차 반사. 지상·실내 샷은 자연광·백열등·저녁빛이 주광원이며 CAVE_LIGHT를 붙이지 않는다. 용접 불꽃은 v4에서 삭제됨(자물쇠·봉인지).

## 프롬프트 위생 규칙
- 프롬프트 본문에 한글·괄호 메모·합성 지시를 넣지 않는다(→ `편집합성_비고` 열). 글자가 필요한 모든 면은 'blank / no legible letters'로 생성 후 편집 합성.
- 샷당 카메라 이동 하나. 한 프롬프트에 두 국면(시간 점프·매치컷)을 넣지 않는다(7-4a/7-4b, 8-3a/8-3b로 분할).

## Seedance 사양 검증 (Dreamina 공식 페이지, 2026-10-20)

| 항목 | 2.0 | 2.5 | 판정 |
|---|---|---|---|
| 참조 입력 | 12개(이미지 9·영상 3·오디오 3, 각 ≤15초) | 최대 50개 | 확인됨(공식) |
| 모드 | Single-frame / Multiframes | Omni reference | 확인됨(공식) |
| 1회 출력 길이 | 미표기(요금 환산 10초 기준) | 30초, 확장 5~180초 베타 | 일부 확인 — **5/10초 옵션은 가정** |
| 해상도 | 1080p 다운로드 | 동일 | 일부 확인 |
| 요금 | Basic $15/1,575cr · Standard $36/3,885cr · Advanced 17,600cr(가격 미표기) | — | 일부 확인 — 샷당 단가 미공개 → PENDING |
| @ 태그 | @AssetName | @Image1… | 공식 가이드. UI 당일 확인 |

## 우선순위
- **P0** 파일럿 3컷(9-3, 10-7, 6-3) 각 3회 → 통과 후 나머지 P0·P1 확대. 'P0 각 10회' 표현은 v4.2에서 폐기.

## S0. 공식 인트로

### INTRO · 0:00–0:20 (20s) · 생성 없음
- 공식 인트로(주최 제공)
- 음향/대사: 주최 제공 영상 그대로
- 비고: 주최 드라이브 원본. 길이 20초는 가정(파일 확인 전)

## S1. 2005 비 오는 밭

### 1-1 · 0:20–0:25 · 사용 5s / 요청 5s · T2V · STYLE_BASE만 · P2
- 기능: 2005 발견. 비 오는 밭, 전신주를 세운다
- 레퍼런스: R-2005 · 카메라: fixed wide
- 음향/대사/자막: 빗소리, 굴착기
- 편집 합성·비고: —
- 예상 실패: 비가 안개처럼 / 전신주가 나무 → 재생성: 'concrete utility pole with wires', 'rain as thin streaks' 추가
```
Wide shot. Gray rain over flat Jeju farmland with black stone walls. A crane truck lowers a new concrete utility pole upright into a freshly dug hole; a worker (Korean man, 44, short black hair wet with rain, orange safety vest, white hard hat) steadies it at the base. Fixed camera, overcast, desaturated documentary feel. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Muted palette of black, warm orange practical light and bone-white. No text, no logos, no subtitles, no lens flare.
```

### 1-2 · 0:25–0:29 · 사용 4s / 요청 5s · T2V · STYLE_BASE만 · P1
- 기능: 땅이 꺼지고 전신주가 지하로 빨려 들어간다
- 레퍼런스: R-2005 · 카메라: fixed low
- 음향/대사/자막: 흙 무너지는 굉음, 전신주 둔탁음
- 편집 합성·비고: 사실 근거: 국가유산청 소식지 2017 '전신주가 지하로 쑥 빨려 들어가는 바람에 발견'
- 예상 실패: 구멍이 물웅덩이 / 전신주가 쓰러짐 → 재생성: 'sinks straight down, stays upright', 'dry black void' 추가
```
Low angle in the rain. The ground at the base of a concrete utility pole suddenly gives way; the pole lurches and sinks several meters straight down into a dry black opening, mud sliding in after it, and stops tilted. Fixed low camera. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Muted palette of black, warm orange practical light and bone-white. No text, no logos, no subtitles, no lens flare.
```

### 1-3 · 0:29–0:34 · 사용 5s / 요청 5s · I2V · STYLE_BASE만 · P1
- 기능: 차가운 바람이 올라온다 (4-3 매치)
- 레퍼런스: R-DS05 · 카메라: slow push-in
- 음향/대사/자막: 바람 소리(저음)
- 편집 합성·비고: —
- 예상 실패: 머리카락이 안 움직임 → 재생성: 'hair visibly blown upward' 반복, 10초 요청
```
Korean man, 44, short black hair wet with rain, orange safety vest, white hard hat leans over the dark gap beside a tilted, half-sunken utility pole in wet ground. A cold wind rises from below and visibly lifts his hair; he freezes. Slow push-in on his face. Rain on skin. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Muted palette of black, warm orange practical light and bone-white. No text, no logos, no subtitles, no lens flare.
```

### 1-4 · 0:34–0:42 · 사용 8s / 요청 10s · T2V · CAVE_LIGHT · P0
- 기능: 손전등 원 안의 흰 벽 — 첫 빛 (훅)
- 레퍼런스: R-WALL;R-ROOT · 카메라: slow pan
- 음향/대사/자막: 물방울 1회
- 편집 합성·비고: v4.2 +2s, P0 격상(첫 30초 훅)
- 예상 실패: 원 밖이 회색 / 석회동굴처럼 밝음 → 재생성: CAVE_LIGHT 반복, 'small circle of light'
```
POV flashlight beam shining straight down into a pitch-black volcanic shaft. As the circle of light reaches the inner wall, bone-white soda-straw stalactites and glistening calcite flowstone emerge over black basalt. Slow pan across the untouched white formations. Pure black outside the beam. Pitch-black lava cave. Headlamp beams are the only light; everything outside the beams is pure black. Black basalt walls streaked with calcite in bone-white, pale yellow and rust-red tints. Not a limestone cave: never brighten the whole cave, zero ambient light. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Muted palette of black, warm orange practical light and bone-white. No text, no logos, no subtitles, no lens flare.
```

### 1-5 · 0:42–0:47 · 사용 5s / 요청 5s · T2V · CAVE_LIGHT · P1
- 기능: 노란 장갑이 떨어진다 (10-7 대칭)
- 레퍼런스: R-GLOVE · 카메라: fixed top-down
- 음향/대사/자막: 낙하음 1.5초 지연
- 편집 합성·비고: —
- 예상 실패: 장갑 둘 / 손 잔류 → 재생성: 'one glove only' 반복
```
Looking straight down a black shaft. One yellow rubber work glove slips from a hand at the top of frame; the hand exits frame immediately and the glove falls away from camera, caught briefly in a flashlight beam, then swallowed by darkness. Pitch-black lava cave. Headlamp beams are the only light; everything outside the beams is pure black. Black basalt walls streaked with calcite in bone-white, pale yellow and rust-red tints. Not a limestone cave: never brighten the whole cave, zero ambient light. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Muted palette of black, warm orange practical light and bone-white. No text, no logos, no subtitles, no lens flare.
```

### TITLE · 0:47–0:50 (3s) · 생성 없음
- 타이틀 '입구 / The Opening'
- 음향/대사: 무음
- 비고: —

## S2. 2025 조사기관 사무실(극중)

### 2-1 · 0:50–0:56 · 사용 6s / 요청 10s · I2V · STYLE_BASE만 · P1
- 기능: 보고서를 넘기다 한 줄에서 멈춘다
- 레퍼런스: R-DOC · 카메라: slow push-in
- 음향/대사/자막: 종이 소리 | SUB(합성): Discovered by: construction worker (name unknown)
- 편집 합성·비고: 편집 합성: '발견자: 공사 인부(성명 미상)' + 구석 고지 '극중 재구성된 기록 / dramatized record'. 극중 가상 문서
- 예상 실패: 페이지에 가짜 글자 → 재생성: 'no legible letters' 2회
```
Close on a woman's slender hand turning pages of a bound cave survey report with photographs and diagrams under cool fluorescent office light. Her index finger stops on a single unprinted blank line in a table. Slow push-in on the blank line, shallow focus, no legible letters anywhere on the page. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Muted palette of black, warm orange practical light and bone-white. No text, no logos, no subtitles, no lens flare.
```

### 2-2 · 0:56–1:00 · 사용 4s / 요청 5s · I2V · STYLE_BASE만 · P2
- 기능: 보고서를 덮고 명단 양식을 당긴다
- 레퍼런스: R-DOC · 카메라: fixed
- 음향/대사/자막: 없음
- 편집 합성·비고: 편집 합성: 헤더 '2025년 학술조사 참가자 명단'. 극중 가상 문서
- 예상 실패: — → 재생성: —
```
The same hand closes the report firmly and pulls forward a blank form with an empty header area. Fixed camera, cool fluorescent light, no legible letters. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Muted palette of black, warm orange practical light and bone-white. No text, no logos, no subtitles, no lens flare.
```

### 2-3 · 1:00–1:07 · 사용 7s / 요청 10s · REF · STYLE_BASE만 · P1
- 기능: 이름을 쓴다. 팀장: 기록은 못 고쳐
- 레퍼런스: R-HI-civil;R-LEADER · 카메라: fixed two-shot
- 음향/대사/자막: 팀장: 기록은 못 고쳐. 20년 전 거야. / 해인: 압니다. 이번 조사 명단에만. | SUB: The official record can't be changed. It's twenty years old. / I know. Just on this survey's roster.
- 편집 합성·비고: —
- 예상 실패: 입 모양 불일치 → 재생성: 대사는 후반 더빙, 'speaks briefly'만
```
Korean woman, 34, black low ponytail, small mole under left eye, black technical work jacket, bareheaded writes a name on a roster form with a pen. Across the desk a gray-haired Korean man in his 50s, gray field jacket watches and speaks briefly. Fixed two-shot, office interior, cool fluorescent light. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Muted palette of black, warm orange practical light and bone-white. No text, no logos, no subtitles, no lens flare.
```

### 2-4 · 1:07–1:12 · 사용 5s / 요청 5s · T2V · STYLE_BASE만 · P2
- 기능: 팀장이 서명한다
- 레퍼런스: R-LEADER · 카메라: fixed
- 음향/대사/자막: 없음
- 편집 합성·비고: —
- 예상 실패: — → 재생성: —
```
Close on a man's hand holding a pen above a signature box, hesitating, then signing. Fixed camera, fluorescent light, desk, no legible letters. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Muted palette of black, warm orange practical light and bone-white. No text, no logos, no subtitles, no lens flare.
```

## S3. 월정리 동수의 집

### 3-1 · 1:12–1:18 · 사용 6s / 요청 10s · T2V · STYLE_BASE만 · P2
- 기능: 돌담길, 팻말 하나
- 레퍼런스: R-GATE;R-HI-civil;R-SIGN · 카메라: slow tracking
- 음향/대사/자막: 바람 | 팻말 합성(극중 소품, 실존 표지판 아님): 천연기념물 보호구역 · 허가 없이 현상을 변경할 수 없습니다 / Natural Monument Protected Zone — No alteration without permit
- 편집 합성·비고: 팻말 1개, 글자 편집 합성
- 예상 실패: 팻말 글자 → 재생성: 'blank flat face' 반복
```
Evening dusk. Korean woman, 34, black low ponytail, small mole under left eye, black technical work jacket, bareheaded walks along a Jeju black-stone-wall lane past quiet fields. Beside one field gate stands a weathered metal notice board with a blank flat face, no letters. Slow tracking beside her, cool blue dusk light. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Muted palette of black, warm orange practical light and bone-white. No text, no logos, no subtitles, no lens flare.
```

### 3-2 · 1:18–1:22 · 사용 4s / 요청 5s · REF · STYLE_BASE만 · P2
- 기능: 노인 한 사람이 고개를 돌린다
- 레퍼런스: R-HI-civil · 카메라: fixed medium
- 음향/대사/자막: 없음
- 편집 합성·비고: —
- 예상 실패: 노인이 웃음 → 재생성: 'expression closed, avoids eye contact'
```
An elderly Jeju farmer walking toward Korean woman, 34, black low ponytail, small mole under left eye, black technical work jacket, bareheaded on a stone-wall lane sees her, closes his expression, turns his head away and passes without greeting. Fixed medium shot, cool dusk light. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Muted palette of black, warm orange practical light and bone-white. No text, no logos, no subtitles, no lens flare.
```

### 3-3 · 1:22–1:27 · 사용 5s / 요청 5s · I2V · STYLE_BASE만 · P1
- 기능: 밥상 위 그릇 하나
- 레퍼런스: R-HOME · 카메라: slow push-in
- 음향/대사/자막: TV 소리 낮게
- 편집 합성·비고: —
- 예상 실패: 그릇이 둘 → 재생성: 'exactly one bowl, one spoon'
```
Small rural Korean room at night, one bare incandescent bulb. Low table with exactly one bowl of rice and one spoon. Old TV glow flickers on the wall. Slow push-in on the single bowl. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Muted palette of black, warm orange practical light and bone-white. No text, no logos, no subtitles, no lens flare.
```

### 3-4 · 1:27–1:32 · 사용 5s / 요청 5s · I2V · STYLE_BASE만 · P1
- 기능: 보지 않고 먹는다. 숟가락을 더듬는다
- 레퍼런스: R-DS25-home · 카메라: fixed medium
- 음향/대사/자막: 없음
- 편집 합성·비고: —
- 예상 실패: TV를 쳐다봄 → 재생성: 'eyes stay down the whole time'
```
Korean man, 64, short white hair, deeply weathered face, thick calloused hands, worn gray long-sleeve shirt, bareheaded eats alone at a low table with his eyes lowered, never looking at the flickering TV, his right hand feeling for the spoon on the table by touch. Fixed medium shot, warm incandescent bulb light. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Muted palette of black, warm orange practical light and bone-white. No text, no logos, no subtitles, no lens flare.
```

### 3-5 · 1:32–1:37 · 사용 5s / 요청 5s · T2V · STYLE_BASE만 · P2
- 기능: 벽의 안전모와 액자
- 레퍼런스: R-HOME;R-PHOTO · 카메라: slow pan
- 음향/대사/자막: 없음
- 편집 합성·비고: 액자 사진 1996년 설정('96 날짜 도장은 합성)
- 예상 실패: 액자 속 얼굴 왜곡 → 재생성: 액자는 R-PHOTO 별도 생성 후 합성
```
Slow pan across a wall under warm bulb light: a scratched white hard hat hanging on a nail, then a faded framed film snapshot of a young man carrying a small girl on his shoulders in front of a concrete utility pole. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Muted palette of black, warm orange practical light and bone-white. No text, no logos, no subtitles, no lens flare.
```

### 3-6 · 1:37–1:44 · 사용 7s / 요청 10s · REF · STYLE_BASE만 · P1
- 기능: 문을 연다. 딸을 보지 않고 문고리를 만진다
- 레퍼런스: R-DS25-home;R-HI-civil · 카메라: fixed
- 음향/대사/자막: 동수: …몇 년 만이냐. / 해인: 3년. | SUB: …How many years has it been? / Three.
- 편집 합성·비고: v4.2 +2s
- 예상 실패: 눈을 마주침 → 재생성: 'he looks at the door frame, not at her'
```
Korean man, 64, short white hair, deeply weathered face, thick calloused hands, worn gray long-sleeve shirt, bareheaded opens a wooden door. Outside in the dark stands Korean woman, 34, black low ponytail, small mole under left eye, black technical work jacket, bareheaded. He does not meet her eyes; he looks at the door frame while his thumb slowly rubs the metal door handle. Fixed shot from inside, warm bulb light against night darkness. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Muted palette of black, warm orange practical light and bone-white. No text, no logos, no subtitles, no lens flare.
```

### 3-7 · 1:44–1:50 · 사용 6s / 요청 10s · REF · STYLE_BASE만 · P1
- 기능: 허가서. 뚫은 놈. 니도.
- 레퍼런스: R-DS25-home;R-HI-civil · 카메라: fixed two-shot
- 음향/대사/자막: 동수: 20년 동안 나보고 뚫은 놈이라 그랬다. 니도. / 해인: …맞잖아요. | SUB: For twenty years they blamed me for breaking it open. Even you. / …You did.
- 편집 합성·비고: —
- 예상 실패: — → 재생성: —
```
Inside the small room, Korean woman, 34, black low ponytail, small mole under left eye, black technical work jacket, bareheaded holds out a folded document. Korean man, 64, short white hair, deeply weathered face, thick calloused hands, worn gray long-sleeve shirt, bareheaded does not take it; he turns his gaze toward the old white hard hat hanging on the wall nail. Fixed two-shot, warm incandescent bulb light. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Muted palette of black, warm orange practical light and bone-white. No text, no logos, no subtitles, no lens flare.
```

### 3-8 · 1:50–1:55 · 사용 5s / 요청 5s · I2V · STYLE_BASE만 · P1
- 기능: 안전모를 내려 먼지를 턴다
- 레퍼런스: R-DS25-hand · 카메라: fixed macro
- 음향/대사/자막: 먼지 터는 소리
- 편집 합성·비고: —
- 예상 실패: 손가락 6개 → 재생성: 손 레퍼런스 첨부, 'five fingers' 반복
```
Close on thick weathered five-fingered hands lifting an old white hard hat from a wall nail and brushing dust off it with a palm. Warm bulb light. Fixed camera. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Muted palette of black, warm orange practical light and bone-white. No text, no logos, no subtitles, no lens flare.
```

### 3-9 · 1:55–1:59 · 사용 4s / 요청 5s · I2V · STYLE_BASE만 · P2
- 기능: 해인이 그릇 하나를 본다
- 레퍼런스: R-HI-civil · 카메라: slow push-in
- 음향/대사/자막: 없음
- 편집 합성·비고: —
- 예상 실패: — → 재생성: —
```
Korean woman, 34, black low ponytail, small mole under left eye, black technical work jacket, bareheaded stands indoors, glances down at the low table with one single bowl and one spoon, and remains silent. Slow push-in on her face, warm bulb light. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Muted palette of black, warm orange practical light and bone-white. No text, no logos, no subtitles, no lens flare.
```

## S4. 입구

### 4-1 · 1:59–2:04 · 사용 5s / 요청 5s · I2V · STYLE_BASE만 · P2
- 기능: 전신주, 철문, 조사팀
- 레퍼런스: R-GATE;R-TEAM · 카메라: slow aerial pull-out
- 음향/대사/자막: 없음
- 편집 합성·비고: —
- 예상 실패: 철문이 지하실 문처럼 큼 → 재생성: 'about one meter square'
```
Overcast morning. Flat Jeju field with black stone walls, a concrete utility pole, a rusted steel hatch about one meter square in a concrete frame beside it. A cave survey team in identical black work jackets and headlamps, faces in shadow unloads equipment from a white van. Slow aerial pull-out. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Muted palette of black, warm orange practical light and bone-white. No text, no logos, no subtitles, no lens flare.
```

### 4-2 · 2:04–2:09 · 사용 5s / 요청 5s · REF · STYLE_BASE만 · P1
- 기능: 헤드랜턴을 씌운다. 손이 이마에 닿는다
- 레퍼런스: R-DS25;R-HI · 카메라: fixed close two-shot
- 음향/대사/자막: 없음
- 편집 합성·비고: —
- 예상 실패: — → 재생성: —
```
Korean woman, 34, black low ponytail, small mole under left eye, black technical work jacket, headlamp strap on forehead fastens a headlamp over the old white hard hat worn by Korean man, 64, short white hair, deeply weathered face, thick calloused hands, faded orange safety vest over gray shirt, old scratched white hard hat. Her fingers touch his forehead for a moment; both go still. Close two-shot, fixed, overcast light. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Muted palette of black, warm orange practical light and bone-white. No text, no logos, no subtitles, no lens flare.
```

### 4-3 · 2:09–2:14 · 사용 5s / 요청 5s · REF · STYLE_BASE만 · P1
- 기능: 철문이 열리고 바람이 올라온다 (1-3 매치)
- 레퍼런스: R-DS25 · 카메라: slow push-in
- 음향/대사/자막: 바람 소리(1-3 동일 음원)
- 편집 합성·비고: 안전모 착용 상태에서 관자놀이 머리카락만
- 예상 실패: 안전모 쓴 채 머리 전체가 날림 → 재생성: 'only the hair below the hard hat moves'
```
A steel hatch door swings open. Cold air rises from the dark and lifts the loose white hair at the temples of Korean man, 64, short white hair, deeply weathered face, thick calloused hands, faded orange safety vest over gray shirt, old scratched white hard hat standing at the edge, hard hat on. Slow push-in. Overcast. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Muted palette of black, warm orange practical light and bone-white. No text, no logos, no subtitles, no lens flare.
```

### 4-4 · 2:14–2:19 · 사용 5s / 요청 5s · T2V · CAVE_LIGHT · P2
- 기능: 위에서 본 구멍, 사다리, 작아지는 빛
- 레퍼런스: 없음 · 카메라: fixed top-down
- 음향/대사/자막: 없음
- 편집 합성·비고: —
- 예상 실패: — → 재생성: —
```
Looking straight down a dark vertical shaft with a steel ladder fixed to one side. Headlamp circles descend the ladder one by one, growing smaller, until the last one moves out of view. Fixed top-down camera. Pure black. Pitch-black lava cave. Headlamp beams are the only light; everything outside the beams is pure black. Black basalt walls streaked with calcite in bone-white, pale yellow and rust-red tints. Not a limestone cave: never brighten the whole cave, zero ambient light. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Muted palette of black, warm orange practical light and bone-white. No text, no logos, no subtitles, no lens flare.
```

## S5. 동굴 상류 흰 벽

### 5-1 · 2:19–2:26 · 사용 7s / 요청 10s · I2V · CAVE_LIGHT · P1
- 기능: 용암두루마리 벽을 훑는 랜턴 원 여섯 개
- 레퍼런스: R-ROLL · 카메라: slow tracking
- 음향/대사/자막: 발소리, 물방울
- 편집 합성·비고: —
- 예상 실패: 벽 전체가 밝아짐 → 재생성: CAVE_LIGHT 반복, 'beams are small circles'
```
Six small headlamp circles sweep along a lava tube: rope-like lava rolls run along the black floor, a frozen lava fall steps down one wall, and calcite flows in bone-white, pale yellow and rust-red cover the rock. Beams cross and separate. Slow tracking along the passage. Pitch-black lava cave. Headlamp beams are the only light; everything outside the beams is pure black. Black basalt walls streaked with calcite in bone-white, pale yellow and rust-red tints. Not a limestone cave: never brighten the whole cave, zero ambient light. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Muted palette of black, warm orange practical light and bone-white. No text, no logos, no subtitles, no lens flare.
```

### 5-2 · 2:26–2:31 · 사용 5s / 요청 5s · I2V · CAVE_LIGHT · P1
- 기능: 뿌리를 따라 자란 흰 종유관, 물방울
- 레퍼런스: R-ROOT · 카메라: slow tilt up
- 음향/대사/자막: 물방울 1회
- 편집 합성·비고: —
- 예상 실패: 종유관이 굵은 고드름 → 재생성: 'pencil-thin straws'
```
A headlamp beam tilts up to a black basalt ceiling where thin bone-white soda-straw stalactites hang like pipe-organ tubes, and calcite has grown along old tree roots into slender pale pillars from ceiling to floor. A single water drop swells at a tip and falls. Slow tilt up then hold. Pitch-black lava cave. Headlamp beams are the only light; everything outside the beams is pure black. Black basalt walls streaked with calcite in bone-white, pale yellow and rust-red tints. Not a limestone cave: never brighten the whole cave, zero ambient light. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Muted palette of black, warm orange practical light and bone-white. No text, no logos, no subtitles, no lens flare.
```

### 5-3 · 2:31–2:40 · 사용 9s / 요청 10s · REF · CAVE_LIGHT · P0
- 기능: 흰 벽 앞에서 손이 멈춘다
- 레퍼런스: R-DS25;R-DS25-hand;R-WALL · 카메라: fixed side profile
- 음향/대사/자막: 해인(화면 밖): 만지면 안 돼요. | SUB: Don't touch it.
- 편집 합성·비고: v4.2 +2s
- 예상 실패: 손이 벽에 닿음 → 재생성: 'never touches, visible gap' 반복
```
Korean man, 64, short white hair, deeply weathered face, thick calloused hands, faded orange safety vest over gray shirt, old scratched white hard hat with lit headlamp stands before a bone-white calcite wall. He slowly reaches out his thick five-fingered hand toward the white surface, then stops a full hand's width away without touching it, trembling slightly, and holds. Fixed side profile; his own headlamp is the only light. Pitch-black lava cave. Headlamp beams are the only light; everything outside the beams is pure black. Black basalt walls streaked with calcite in bone-white, pale yellow and rust-red tints. Not a limestone cave: never brighten the whole cave, zero ambient light. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Muted palette of black, warm orange practical light and bone-white. No text, no logos, no subtitles, no lens flare.
```

### 5-4 · 2:40–2:46 · 사용 6s / 요청 10s · REF · CAVE_LIGHT · P1
- 기능: 멈춘 손 → 해인의 시선
- 레퍼런스: R-HI · 카메라: rack focus
- 음향/대사/자막: 없음
- 편집 합성·비고: —
- 예상 실패: — → 재생성: —
```
Close on a weathered hand frozen a hand's width from a white calcite wall. Rack focus to Korean woman, 34, black low ponytail, small mole under left eye, black technical work jacket, headlamp strap on forehead in the background watching the hand, her headlamp beam low. Pitch-black lava cave. Headlamp beams are the only light; everything outside the beams is pure black. Black basalt walls streaked with calcite in bone-white, pale yellow and rust-red tints. Not a limestone cave: never brighten the whole cave, zero ambient light. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Muted palette of black, warm orange practical light and bone-white. No text, no logos, no subtitles, no lens flare.
```

## S6. 호수

### 6-1 · 2:46–2:53 · 사용 7s / 요청 10s · I2V · CAVE_LIGHT · P1
- 기능: 보트. 빛이 두 번
- 레퍼런스: R-LAKE · 카메라: slow tracking side
- 음향/대사/자막: 노 젓는 물소리
- 편집 합성·비고: —
- 예상 실패: 모터/셋째 인물 → 재생성: 'two people only, no motor'
```
A small gray rubber boat glides on perfectly still black underground water; Korean woman, 34, black low ponytail, small mole under left eye, black technical work jacket, headlamp strap on forehead rows at the back, Korean man, 64, short white hair, deeply weathered face, thick calloused hands, faded orange safety vest over gray shirt, old scratched white hard hat sits at the front, two people only, no motor. Their headlamps reflect off the water onto a low basalt ceiling as two circles of light. Slow tracking from the side. Pitch-black lava cave. Headlamp beams are the only light; everything outside the beams is pure black. Black basalt walls streaked with calcite in bone-white, pale yellow and rust-red tints. Not a limestone cave: never brighten the whole cave, zero ambient light. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Muted palette of black, warm orange practical light and bone-white. No text, no logos, no subtitles, no lens flare.
```

### 6-2 · 2:53–2:58 · 사용 5s / 요청 5s · T2V · CAVE_LIGHT · P2
- 기능: 물속 경계층 아지랑이
- 레퍼런스: R-HAZE · 카메라: slow push-in
- 음향/대사/자막: 없음
- 편집 합성·비고: 해수 영향은 확인, '층'의 시각화는 창작적 표현
- 예상 실패: 층이 안개 → 재생성: 'sharp refraction layer, not fog'
```
A headlamp beam shines down into clear black water. A shimmering, wavering refraction layer where fresh water meets denser salt water, like heat haze underwater. Slow push-in. Pitch-black lava cave. Headlamp beams are the only light; everything outside the beams is pure black. Black basalt walls streaked with calcite in bone-white, pale yellow and rust-red tints. Not a limestone cave: never brighten the whole cave, zero ambient light. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Muted palette of black, warm orange practical light and bone-white. No text, no logos, no subtitles, no lens flare.
```

### 6-3 · 2:58–3:07 · 사용 9s / 요청 10s · I2V · CAVE_LIGHT · P0
- 기능: 눈이 퇴화한 물고기
- 레퍼런스: R-FISH;R-LAKE · 카메라: slow tracking with fish
- 음향/대사/자막: 없음
- 편집 합성·비고: v4.2 +2s. 크기 3.44cm(2014 측정) 반영
- 예상 실패: 눈알 생김 / 물고기 둘 → 재생성: 'no visible eyeball', 'one fish only' 2회 반복
```
Macro shot. A single small pale-pink translucent cave goby, 3.5 cm long, with an unusually large head and eyes reduced to two tiny dark dots buried beneath the skin with no visible eyeball, drifts slowly through a single warm headlamp beam in black water beside a gray rubber boat edge. One fish only, calm, unafraid of the light. Slow tracking with the fish. Pitch-black lava cave. Headlamp beams are the only light; everything outside the beams is pure black. Black basalt walls streaked with calcite in bone-white, pale yellow and rust-red tints. Not a limestone cave: never brighten the whole cave, zero ambient light. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Muted palette of black, warm orange practical light and bone-white. No text, no logos, no subtitles, no lens flare.
```

### 6-4 · 3:07–3:12 · 사용 5s / 요청 5s · REF · CAVE_LIGHT · P1
- 기능: 동수가 들여다본다. 빛이 없어서 눈이 없어진 거냐
- 레퍼런스: R-DS25 · 카메라: fixed close
- 음향/대사/자막: 동수: 빛이 없어서 눈이 없어진 거냐. | SUB: Did they lose their eyes because there's no light?
- 편집 합성·비고: —
- 예상 실패: — → 재생성: —
```
Korean man, 64, short white hair, deeply weathered face, thick calloused hands, faded orange safety vest over gray shirt, old scratched white hard hat leans over the edge of a rubber boat and looks down into black water lit by his headlamp, his face faintly reflected. Fixed close shot. Pitch-black lava cave. Headlamp beams are the only light; everything outside the beams is pure black. Black basalt walls streaked with calcite in bone-white, pale yellow and rust-red tints. Not a limestone cave: never brighten the whole cave, zero ambient light. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Muted palette of black, warm orange practical light and bone-white. No text, no logos, no subtitles, no lens flare.
```

### 6-5 · 3:12–3:17 · 사용 5s / 요청 5s · REF · CAVE_LIGHT · P1
- 기능: 해인: 안 써도 살 수 있었나 봐요
- 레퍼런스: R-HI · 카메라: fixed medium
- 음향/대사/자막: 해인: …안 써도 살 수 있었나 봐요. | SUB: …Maybe they could live without using them.
- 편집 합성·비고: —
- 예상 실패: — → 재생성: —
```
Korean woman, 34, black low ponytail, small mole under left eye, black technical work jacket, headlamp strap on forehead holds the oars still and looks at the man across the boat, calm, and speaks one short line. Fixed medium shot, black water, her beam low. Pitch-black lava cave. Headlamp beams are the only light; everything outside the beams is pure black. Black basalt walls streaked with calcite in bone-white, pale yellow and rust-red tints. Not a limestone cave: never brighten the whole cave, zero ambient light. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Muted palette of black, warm orange practical light and bone-white. No text, no logos, no subtitles, no lens flare.
```

### 6-6 · 3:17–3:23 · 사용 6s / 요청 10s · REF · CAVE_LIGHT · P0
- 기능: 동수가 자기 손을 내려다본다. 그럼 뭘 보고 사냐
- 레퍼런스: R-DS25;R-DS25-hand · 카메라: fixed close
- 음향/대사/자막: 동수: 그럼 뭘 보고 사냐. / 해인(화면 밖): 안 봐요. 느껴요. | SUB: Then what do they see by? / They don't see. They feel.
- 편집 합성·비고: —
- 예상 실패: 손가락 수 → 재생성: 손 레퍼런스, 'five fingers each'
```
Korean man, 64, short white hair, deeply weathered face, thick calloused hands, faded orange safety vest over gray shirt, old scratched white hard hat in a rubber boat slowly turns his thick five-fingered hands palm-up in his own headlamp light and looks at them. Fixed close shot, black water beyond. Pitch-black lava cave. Headlamp beams are the only light; everything outside the beams is pure black. Black basalt walls streaked with calcite in bone-white, pale yellow and rust-red tints. Not a limestone cave: never brighten the whole cave, zero ambient light. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Muted palette of black, warm orange practical light and bone-white. No text, no logos, no subtitles, no lens flare.
```

### 6-7 · 3:23–3:28 · 사용 5s / 요청 5s · I2V · CAVE_LIGHT · P1
- 기능: 물고기가 빛을 가로질러 사라진다
- 레퍼런스: R-FISH · 카메라: fixed macro
- 음향/대사/자막: 없음
- 편집 합성·비고: —
- 예상 실패: — → 재생성: —
```
The pale-pink translucent goby, eyes buried beneath its skin, crosses the full width of a headlamp beam in black water and disappears at the edge of the light. Fixed macro. Pitch-black lava cave. Headlamp beams are the only light; everything outside the beams is pure black. Black basalt walls streaked with calcite in bone-white, pale yellow and rust-red tints. Not a limestone cave: never brighten the whole cave, zero ambient light. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Muted palette of black, warm orange practical light and bone-white. No text, no logos, no subtitles, no lens flare.
```

## S7. 호수 끝 모래 둑

### 7-1 · 3:28–3:33 · 사용 5s / 요청 5s · I2V · CAVE_LIGHT · P2
- 기능: 보트가 모래에 닿는다. 파도 소리
- 레퍼런스: R-SAND · 카메라: fixed low from boat
- 음향/대사/자막: 먼 파도 소리
- 편집 합성·비고: —
- 예상 실패: — → 재생성: —
```
The nose of a gray rubber boat slides onto a dark sand bank at the end of black underground water. A headlamp beam ahead reveals sand rising into darkness. Fixed low camera from the boat. Pitch-black lava cave. Headlamp beams are the only light; everything outside the beams is pure black. Black basalt walls streaked with calcite in bone-white, pale yellow and rust-red tints. Not a limestone cave: never brighten the whole cave, zero ambient light. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Muted palette of black, warm orange practical light and bone-white. No text, no logos, no subtitles, no lens flare.
```

### 7-2 · 3:33–3:38 · 사용 5s / 요청 5s · I2V · CAVE_LIGHT · P1
- 기능: 항아리들, 벽의 두 자국
- 레퍼런스: R-SAND;R-INSCRIPTION · 카메라: slow pan
- 음향/대사/자막: 없음
- 편집 합성·비고: 기종명(장동병 등)은 미검증이라 쓰지 않음. 각자 글자는 합성하지 않고 '두 자국'으로만
- 예상 실패: 각자가 문자처럼 생성 → 재생성: 'two shallow illegible marks'
```
A headlamp beam settles on gray stoneware bottles and jars half-buried in dark wet sand, one tipped over, broken sherds, abalone and limpet shells and a dark smear of old charcoal nearby. The beam tilts up to a black basalt wall where two shallow scratched marks are half-covered by white calcite crust, illegible. Slow pan from the jars to the wall. Pitch-black lava cave. Headlamp beams are the only light; everything outside the beams is pure black. Black basalt walls streaked with calcite in bone-white, pale yellow and rust-red tints. Not a limestone cave: never brighten the whole cave, zero ambient light. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Muted palette of black, warm orange practical light and bone-white. No text, no logos, no subtitles, no lens flare.
```

### 7-3 · 3:38–3:44 · 사용 6s / 요청 10s · T2V · CAVE_LIGHT · P2
- 기능: 창작 재현: 횃불, 항아리를 두고 벽에 자국을 긋는다
- 레퍼런스: R-SILLA · 카메라: fixed wide
- 음향/대사/자막: 횃불 소리 | 화면 하단 자막(6초 내내): 창작 재현 — 유물은 실제, 장면은 상상 / Dramatization — artifacts are real, the scene is imagined
- 편집 합성·비고: —
- 예상 실패: 얼굴이 보임 → 재생성: 'faces never lit'
```
Long ago on the same sand bank. Four silhouetted figures in rough undyed hemp clothing hold pine torches, faces entirely outside the firelight; a small fire of embers glows on the sand. One kneels and sets a gray stoneware jar on the wet sand; another scratches two marks into the black wall with an iron point. Only torchlight, deep orange, black beyond. Dreamlike silhouettes. Pitch-black lava cave. Headlamp beams are the only light; everything outside the beams is pure black. Black basalt walls streaked with calcite in bone-white, pale yellow and rust-red tints. Not a limestone cave: never brighten the whole cave, zero ambient light. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Muted palette of black, warm orange practical light and bone-white. No text, no logos, no subtitles, no lens flare.
```

### 7-4a · 3:44–3:49 · 사용 5s / 요청 5s · T2V · CAVE_LIGHT · P2
- 기능: 횃불이 돌아선다, 마지막 불이 사라진다
- 레퍼런스: R-SILLA · 카메라: fixed
- 음향/대사/자막: 횃불 멀어짐
- 편집 합성·비고: v4.2 분할(구 7-4 전반)
- 예상 실패: — → 재생성: —
```
Four silhouetted figures holding pine torches turn away from a gray stoneware jar resting on dark sand and walk up into the pitch-black cave until the last orange flame disappears into pure black. Fixed camera. Pitch-black lava cave. Headlamp beams are the only light; everything outside the beams is pure black. Black basalt walls streaked with calcite in bone-white, pale yellow and rust-red tints. Not a limestone cave: never brighten the whole cave, zero ambient light. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Muted palette of black, warm orange practical light and bone-white. No text, no logos, no subtitles, no lens flare.
```

### 7-4b · 3:49–3:54 · 사용 5s / 요청 5s · I2V · CAVE_LIGHT · P2
- 기능: 현재: 같은 항아리에 랜턴이 켜진다 (매치컷)
- 레퍼런스: R-SAND · 카메라: fixed same framing
- 음향/대사/자막: 물방울
- 편집 합성·비고: v4.2 분할(구 7-4 후반). 7-4a 마지막 프레임을 첫 프레임 참조로
- 예상 실패: — → 재생성: —
```
Pure black frame. A single cool-white headlamp beam sweeps in and illuminates the same gray stoneware jar, now weathered, crusted with white calcite and half-buried in dark sand. Fixed camera, identical framing to the previous shot. Pitch-black lava cave. Headlamp beams are the only light; everything outside the beams is pure black. Black basalt walls streaked with calcite in bone-white, pale yellow and rust-red tints. Not a limestone cave: never brighten the whole cave, zero ambient light. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Muted palette of black, warm orange practical light and bone-white. No text, no logos, no subtitles, no lens flare.
```

## S8. 바위 틈 장갑

### 8-1 · 3:54–3:59 · 사용 5s / 요청 5s · T2V · CAVE_LIGHT · P1
- 기능: 랜턴이 바위 틈에서 멈춘다. 장갑
- 레퍼런스: R-GLOVE · 카메라: slow pan then hold
- 음향/대사/자막: 없음
- 편집 합성·비고: —
- 예상 실패: — → 재생성: —
```
A headlamp beam sweeps along a black basalt crevice at the edge of a sand bank, then stops. In the beam: a yellow rubber work glove crusted in white calcite. Slow pan then hold. Pitch-black lava cave. Headlamp beams are the only light; everything outside the beams is pure black. Black basalt walls streaked with calcite in bone-white, pale yellow and rust-red tints. Not a limestone cave: never brighten the whole cave, zero ambient light. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Muted palette of black, warm orange practical light and bone-white. No text, no logos, no subtitles, no lens flare.
```

### 8-2 · 3:59–4:04 · 사용 5s / 요청 5s · REF · CAVE_LIGHT · P1
- 기능: 동수가 얼어붙는다
- 레퍼런스: R-DS25 · 카메라: slow push-in
- 음향/대사/자막: 없음
- 편집 합성·비고: —
- 예상 실패: — → 재생성: —
```
Korean man, 64, short white hair, deeply weathered face, thick calloused hands, faded orange safety vest over gray shirt, old scratched white hard hat with headlamp stares at something low in a rock crevice. His body goes completely still; his beam trembles slightly. Slow push-in on his face. Pitch-black lava cave. Headlamp beams are the only light; everything outside the beams is pure black. Black basalt walls streaked with calcite in bone-white, pale yellow and rust-red tints. Not a limestone cave: never brighten the whole cave, zero ambient light. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Muted palette of black, warm orange practical light and bone-white. No text, no logos, no subtitles, no lens flare.
```

### 8-3a · 4:04–4:09 · 사용 5s / 요청 5s · REF · CAVE_LIGHT · P1
- 기능: 해인이 본다. 사진 한 장
- 레퍼런스: R-HI · 카메라: fixed medium
- 음향/대사/자막: 셔터음
- 편집 합성·비고: v4.2 분할(구 8-3 전반)
- 예상 실패: 플래시가 동굴을 밝힘 → 재생성: 'brief small flash, cave stays black'
```
Korean woman, 34, black low ponytail, small mole under left eye, black technical work jacket, headlamp strap on forehead approaches the rock crevice, sees the calcite-crusted yellow glove, pauses, and photographs it once with a rugged tablet camera; a brief small flash lights only the crevice while the cave stays black. Fixed medium shot. Pitch-black lava cave. Headlamp beams are the only light; everything outside the beams is pure black. Black basalt walls streaked with calcite in bone-white, pale yellow and rust-red tints. Not a limestone cave: never brighten the whole cave, zero ambient light. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Muted palette of black, warm orange practical light and bone-white. No text, no logos, no subtitles, no lens flare.
```

### 8-3b · 4:09–4:13 · 사용 4s / 요청 5s · REF · CAVE_LIGHT · P2
- 기능: 기록, 집게와 봉투를 꺼낸다
- 레퍼런스: R-HI · 카메라: fixed medium-close
- 음향/대사/자막: 없음
- 편집 합성·비고: v4.2 분할(구 8-3 후반). 극중 절차(실제 규정 아님)
- 예상 실패: — → 재생성: —
```
The same woman lowers the tablet, makes a brief note on a field clipboard under her headlamp light, and picks up steel specimen tweezers and a clear polyethylene bag. Fixed medium-close shot. Pitch-black lava cave. Headlamp beams are the only light; everything outside the beams is pure black. Black basalt walls streaked with calcite in bone-white, pale yellow and rust-red tints. Not a limestone cave: never brighten the whole cave, zero ambient light. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Muted palette of black, warm orange practical light and bone-white. No text, no logos, no subtitles, no lens flare.
```

### 8-4 · 4:13–4:18 · 사용 5s / 요청 5s · REF · CAVE_LIGHT · P0
- 기능: 장갑을 표본 봉투에. 라벨 한 칸은 비어 있다
- 레퍼런스: R-HI-hand;R-GLOVE;R-BAG · 카메라: fixed macro
- 음향/대사/자막: 없음
- 편집 합성·비고: 편집 합성: 라벨 '유입 경위: ______'
- 예상 실패: 라벨에 가짜 글자 → 재생성: 'blank white label strip' 반복
```
Macro close-up on gloved hands using steel tweezers to gently lift the white calcite-crusted yellow work glove from the basalt crevice and slide it into a clear specimen bag with a blank white label strip. Fine white calcite dust falls. A pen tip hovers above the blank label and stops without writing. Fixed macro. Pitch-black lava cave. Headlamp beams are the only light; everything outside the beams is pure black. Black basalt walls streaked with calcite in bone-white, pale yellow and rust-red tints. Not a limestone cave: never brighten the whole cave, zero ambient light. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Muted palette of black, warm orange practical light and bone-white. No text, no logos, no subtitles, no lens flare.
```

### 8-5 · 4:18–4:24 · 사용 6s / 요청 10s · REF · CAVE_LIGHT · P0
- 기능: 봉투를 아버지 손에 쥐어준다
- 레퍼런스: R-HI-hand;R-DS25-hand;R-BAG · 카메라: fixed macro
- 음향/대사/자막: 없음
- 편집 합성·비고: —
- 예상 실패: — → 재생성: —
```
Close on hands. A young woman's slender five-fingered hand places a clear specimen bag holding a white-crusted yellow glove into an older man's thick, scarred, open left palm. His fingers close on it. Fixed macro, warm headlamp light. Pitch-black lava cave. Headlamp beams are the only light; everything outside the beams is pure black. Black basalt walls streaked with calcite in bone-white, pale yellow and rust-red tints. Not a limestone cave: never brighten the whole cave, zero ambient light. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Muted palette of black, warm orange practical light and bone-white. No text, no logos, no subtitles, no lens flare.
```

### 8-6 · 4:24–4:28 · 사용 4s / 요청 5s · REF · CAVE_LIGHT · P2
- 기능: 해인이 돌아서 보트로 간다
- 레퍼런스: R-HI · 카메라: fixed wide from behind
- 음향/대사/자막: 없음
- 편집 합성·비고: —
- 예상 실패: — → 재생성: —
```
Korean woman, 34, black low ponytail, small mole under left eye, black technical work jacket, headlamp strap on forehead turns away and walks back across dark sand toward a rubber boat, her headlamp beam leading. Behind her the man stands alone holding a small clear bag. Fixed wide from behind her. Pitch-black lava cave. Headlamp beams are the only light; everything outside the beams is pure black. Black basalt walls streaked with calcite in bone-white, pale yellow and rust-red tints. Not a limestone cave: never brighten the whole cave, zero ambient light. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Muted palette of black, warm orange practical light and bone-white. No text, no logos, no subtitles, no lens flare.
```

## S9. 호수 가운데 어둠

### 9-1 · 4:28–4:33 · 사용 5s / 요청 5s · REF · CAVE_LIGHT · P1
- 기능: 보트가 호수 가운데. 노를 멈춘다. 끄죠
- 레퍼런스: R-HI;R-DS25;R-LAKE · 카메라: fixed wide side
- 음향/대사/자막: 해인: 끄죠. | SUB: Let's turn them off.
- 편집 합성·비고: —
- 예상 실패: — → 재생성: —
```
Rubber boat in the middle of a black underground lake. Korean woman, 34, black low ponytail, small mole under left eye, black technical work jacket, headlamp strap on forehead at the back stops rowing; Korean man, 64, short white hair, deeply weathered face, thick calloused hands, faded orange safety vest over gray shirt, old scratched white hard hat at the front. Two headlamp circles on water and ceiling. Fixed wide from the side. Pitch-black lava cave. Headlamp beams are the only light; everything outside the beams is pure black. Black basalt walls streaked with calcite in bone-white, pale yellow and rust-red tints. Not a limestone cave: never brighten the whole cave, zero ambient light. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Muted palette of black, warm orange practical light and bone-white. No text, no logos, no subtitles, no lens flare.
```

### 9-2 · 4:33–4:37 · 사용 4s / 요청 5s · REF · CAVE_LIGHT · P1
- 기능: 랜턴 두 개가 꺼진다 → 검정
- 레퍼런스: R-HI;R-DS25 · 카메라: fixed close two-shot
- 음향/대사/자막: 없음
- 편집 합성·비고: —
- 예상 실패: 프레임이 회색 → 재생성: 마지막 1초 편집 검정
```
Close two-shot in a boat: both people reach up and switch off their headlamps one after the other, the man first. Light disappears; the frame goes to pure black. Fixed camera. Pitch-black lava cave. Headlamp beams are the only light; everything outside the beams is pure black. Black basalt walls streaked with calcite in bone-white, pale yellow and rust-red tints. Not a limestone cave: never brighten the whole cave, zero ambient light. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Muted palette of black, warm orange practical light and bone-white. No text, no logos, no subtitles, no lens flare.
```

### BLACK · 4:37–4:47 (10s) · 생성 없음
- 암전 (기본 10초, 8/15초 대안)
- 음향/대사: 물방울·숨·먼 파도. 동수: …보인다. / 해인: 뭐가요. / 동수: 아무것도. | SUB: …I can see. / See what? / Nothing.
- 비고: SOUND_TIMELINE 초 단위. 자막은 검정 위 흰 글자

### 9-3 · 4:47–4:55 · 사용 8s / 요청 10s · REF · CAVE_LIGHT · P0
- 기능: 랜턴이 켜진다. 이미 포개진 두 손
- 레퍼런스: R-HI-hand;R-DS25-hand;R-LAKE · 카메라: fixed macro
- 음향/대사/자막: 숨소리, 점등 후 무음 3초
- 편집 합성·비고: v4.2 +2s. 영화의 성패
- 예상 실패: 손가락 수 / 손 위치 → 재생성: 손 레퍼런스 2쌍 고정. 파일럿 3회 → 통과 후 확대. 채택 컷의 손 위치를 9-4 프롬프트에 기술
```
Pure black. A single warm headlamp switches on. In the small circle of light, resting on the gray rubber boat edge: a young woman's slender five-fingered hand lying still on top of an older man's thick, scarred, calloused five-fingered hand. Neither hand moves. Extreme macro close-up, pure black water beyond. Pitch-black lava cave. Headlamp beams are the only light; everything outside the beams is pure black. Black basalt walls streaked with calcite in bone-white, pale yellow and rust-red tints. Not a limestone cave: never brighten the whole cave, zero ambient light. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Muted palette of black, warm orange practical light and bone-white. No text, no logos, no subtitles, no lens flare.
```

### 9-4 · 4:55–5:00 · 사용 5s / 요청 5s · REF · CAVE_LIGHT · P0
- 기능: 둘 다 손을 쳐다보지 않는다
- 레퍼런스: R-HI;R-DS25 · 카메라: fixed two-shot
- 음향/대사/자막: 없음
- 편집 합성·비고: —
- 예상 실패: 손이 떨어져 있음 → 재생성: 'hands stay joined, same position as previous shot'
```
Two-shot in a rubber boat under one headlamp: Korean man, 64, short white hair, deeply weathered face, thick calloused hands, faded orange safety vest over gray shirt, old scratched white hard hat looks down at the water, Korean woman, 34, black low ponytail, small mole under left eye, black technical work jacket, headlamp strap on forehead looks up at the ceiling, their joined hands resting on the boat edge between them, out of focus, the woman's hand on top. Neither looks at the hands. Fixed. Pitch-black lava cave. Headlamp beams are the only light; everything outside the beams is pure black. Black basalt walls streaked with calcite in bone-white, pale yellow and rust-red tints. Not a limestone cave: never brighten the whole cave, zero ambient light. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Muted palette of black, warm orange practical light and bone-white. No text, no logos, no subtitles, no lens flare.
```

### 9-5 · 5:00–5:05 · 사용 5s / 요청 5s · I2V · CAVE_LIGHT · P2
- 기능: 물고기가 보트 옆을 지난다
- 레퍼런스: R-FISH · 카메라: fixed macro
- 음향/대사/자막: 없음
- 편집 합성·비고: —
- 예상 실패: — → 재생성: —
```
The pale-pink translucent goby, eyes buried beneath its skin, drifts past a gray rubber boat edge at the bottom of a single headlamp beam and slips into black water. Fixed macro. Pitch-black lava cave. Headlamp beams are the only light; everything outside the beams is pure black. Black basalt walls streaked with calcite in bone-white, pale yellow and rust-red tints. Not a limestone cave: never brighten the whole cave, zero ambient light. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Muted palette of black, warm orange practical light and bone-white. No text, no logos, no subtitles, no lens flare.
```

## S10. 지상 철문

### 10-1 · 5:05–5:10 · 사용 5s / 요청 5s · I2V · STYLE_BASE만 · P1
- 기능: 저녁. 철문 앞 조사팀. 한 명이 비켜선다
- 레퍼런스: R-GATE-dusk;R-TEAM · 카메라: slow push-in
- 음향/대사/자막: 바람
- 편집 합성·비고: —
- 예상 실패: 도열처럼 보임 → 재생성: 'loosely gathered, not in lines'
```
Evening, flat Jeju field, blue dusk. A cave survey team in identical black work jackets and headlamps, faces in shadow waits loosely gathered around an open steel hatch, equipment set down, not in lines. One researcher steps back from the hatch edge to make room. Slow push-in. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Muted palette of black, warm orange practical light and bone-white. No text, no logos, no subtitles, no lens flare.
```

### 10-2 · 5:10–5:15 · 사용 5s / 요청 5s · REF · STYLE_BASE만 · P1
- 기능: 동수가 봉투를 들고 올라온다. 팀장이 안전모를 벗는다
- 레퍼런스: R-DS25;R-LEADER;R-BAG · 카메라: fixed low
- 음향/대사/자막: 없음
- 편집 합성·비고: —
- 예상 실패: — → 재생성: —
```
Korean man, 64, short white hair, deeply weathered face, thick calloused hands, faded orange safety vest over gray shirt, old scratched white hard hat climbs up out of a steel hatch in the ground holding a small clear specimen bag in his left hand. Nearby a gray-haired Korean man in his 50s, gray field jacket quietly takes off his own hard hat. Fixed low camera at ground level. Dusk. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Muted palette of black, warm orange practical light and bone-white. No text, no logos, no subtitles, no lens flare.
```

### 10-3 · 5:15–5:20 · 사용 5s / 요청 5s · REF · STYLE_BASE만 · P1
- 기능: 팀장이 손을 내민다. 동수가 봉투를 본다
- 레퍼런스: R-DS25;R-LEADER;R-BAG · 카메라: fixed medium
- 음향/대사/자막: 없음
- 편집 합성·비고: —
- 예상 실패: — → 재생성: —
```
The gray-haired Korean man in his 50s, gray field jacket holds out an open hand toward Korean man, 64, short white hair, deeply weathered face, thick calloused hands, faded orange safety vest over gray shirt, old scratched white hard hat, who looks down at the specimen bag in his own hand for a long moment. Fixed medium two-shot, dusk. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Muted palette of black, warm orange practical light and bone-white. No text, no logos, no subtitles, no lens flare.
```

### 10-4 · 5:20–5:26 · 사용 6s / 요청 10s · REF · STYLE_BASE만 · P1
- 기능: 동수가 봉투를 건넨다 (클로즈업). 동굴이나 잘 닫으쇼
- 레퍼런스: R-DS25;R-LEADER;R-BAG · 카메라: fixed close
- 음향/대사/자막: 팀장: 보고서에 올리겠습니다. / 동수: …동굴이나 잘 닫으쇼. | SUB: I'll put it in the report. / …Just seal the cave tight.
- 편집 합성·비고: 자막에 '이름'을 넣지 않는다(공식 기록 정정 오인 방지)
- 예상 실패: — → 재생성: —
```
Close on hands and faces: Korean man, 64, short white hair, deeply weathered face, thick calloused hands, faded orange safety vest over gray shirt, old scratched white hard hat moves the clear specimen bag to his right hand, places it into the gray-haired Korean man in his 50s, gray field jacket's open hand and lets go slowly. The leader says something; the old man answers in a few words and looks away toward the field. Fixed close two-shot, dusk. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Muted palette of black, warm orange practical light and bone-white. No text, no logos, no subtitles, no lens flare.
```

### 10-5 · 5:26–5:33 · 사용 7s / 요청 10s · REF · STYLE_BASE만 · P0
- 기능: 해인이 봉투 라벨의 빈 칸에 쓴다
- 레퍼런스: R-HI-hand;R-BAG · 카메라: fixed macro
- 음향/대사/자막: 펜 소리 | SUB(합성): Origin: dropped during utility-pole work, 2005 — Kim Dong-su
- 편집 합성·비고: v4.2 +2s. 편집 합성: '유입 경위: 2005년 공사 중 낙하 — 김동수'. 표본 라벨은 공식 문서가 아님
- 예상 실패: 가짜 글자 → 재생성: 'no legible text' 반복
```
Extreme macro close-up on a young woman's slender five-fingered hand in a black jacket sleeve holding a black pen, writing steadily across a blank white label strip on a clear specimen bag that contains a calcite-crusted yellow work glove, resting flat on a clipboard. Cool blue dusk light, no legible text. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Muted palette of black, warm orange practical light and bone-white. No text, no logos, no subtitles, no lens flare.
```

### 10-6 · 5:33–5:38 · 사용 5s / 요청 5s · REF · STYLE_BASE만 · P1
- 기능: 팀장이 읽고 아래에 서명한다. 사람들이 조용히 본다
- 레퍼런스: R-LEADER;R-TEAM · 카메라: fixed medium
- 음향/대사/자막: 없음
- 편집 합성·비고: —
- 예상 실패: 집단이 고개 숙임 → 재생성: 'no bowing, heads level'
```
The gray-haired Korean man in his 50s, gray field jacket reads the label, nods once, and signs below it. Around him a cave survey team in identical black work jackets and headlamps, faces in shadow watches in silence; no one bows, no one speaks, heads level. Fixed medium, dusk. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Muted palette of black, warm orange practical light and bone-white. No text, no logos, no subtitles, no lens flare.
```

### 10-7 · 5:38–5:42 · 사용 4s / 요청 5s · REF · STYLE_BASE만 · P0
- 기능: 해인의 손이 봉투를 저녁빛 속으로 들어 올린다 (1-5 대칭)
- 레퍼런스: R-BAG;R-GLOVE;R-GATE-dusk;R-HI-hand · 카메라: slow tilt up
- 음향/대사/자막: 바람
- 편집 합성·비고: 파일럿 2번 컷
- 예상 실패: 장갑이 스스로 떠오름 / 손 없음 → 재생성: 'held firmly by the hand, never floats' 반복
```
Low angle. A young woman's hand grips the top of a clear specimen bag holding a white-crusted yellow glove and lifts it upward into the last blue-orange dusk light above a dark field; the bag is held firmly by the hand the whole time and never floats. Slow tilt up following the hand and bag. Sky behind. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Muted palette of black, warm orange practical light and bone-white. No text, no logos, no subtitles, no lens flare.
```

### 10-8 · 5:42–5:47 · 사용 5s / 요청 5s · T2V · STYLE_BASE만 · P2
- 기능: 철문이 닫힌다. 자물쇠. 봉인지
- 레퍼런스: R-GATE-dusk · 카메라: fixed close
- 음향/대사/자막: 자물쇠 소리
- 편집 합성·비고: 입구 밀폐는 실제 관행(국가유산청 2017: 조사 외 완전 밀폐). '최종 조사 후 영구'만 창작
- 예상 실패: 봉인지에 글자 → 재생성: 'blank white paper strip'
```
A steel hatch door closes over a concrete frame in a dark field. Hands fasten a heavy padlock and press a blank white paper strip across the seam. Fixed close on the seam, dusk to night. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Muted palette of black, warm orange practical light and bone-white. No text, no logos, no subtitles, no lens flare.
```

## S11. 전신주

### 11-1 · 5:47–5:52 · 사용 5s / 요청 5s · REF · STYLE_BASE만 · P1
- 기능: 동수가 전신주에 손을 댄다
- 레퍼런스: R-DS25;R-GATE · 카메라: slow push-in
- 음향/대사/자막: 전선 윙 소리
- 편집 합성·비고: —
- 예상 실패: — → 재생성: —
```
Night wind over a Jeju field. A concrete utility pole, wires humming, a sealed hatch below it with a small blank sign. Korean man, 64, short white hair, deeply weathered face, thick calloused hands, faded orange safety vest over gray shirt, old scratched white hard hat places his hand flat on the pole. Slow push-in on the hand. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Muted palette of black, warm orange practical light and bone-white. No text, no logos, no subtitles, no lens flare.
```

### 11-2 · 5:52–5:59 · 사용 7s / 요청 10s · REF · STYLE_BASE만 · P0
- 기능: 동수가 처음으로 딸을 본다
- 레퍼런스: R-DS25;R-HI · 카메라: fixed close two-shot
- 음향/대사/자막: 없음
- 편집 합성·비고: v4.2 +2s. 해인은 랜턴 벗은 상태
- 예상 실패: 눈을 피함 → 재생성: 'direct eye contact, held'
```
Night wind over a dark Jeju field, concrete utility pole behind. Korean man, 64, short white hair, deeply weathered face, thick calloused hands, faded orange safety vest over gray shirt, old scratched white hard hat slowly turns his head and looks directly into the eyes of Korean woman, 34, black low ponytail, small mole under left eye, black technical work jacket, bareheaded standing beside him, holding her gaze for the first time. She looks straight back at him. Fixed close two-shot. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Muted palette of black, warm orange practical light and bone-white. No text, no logos, no subtitles, no lens flare.
```

### 11-3 · 5:59–6:04 · 사용 5s / 요청 5s · REF · STYLE_BASE만 · P1
- 기능: 동수가 딸의 손을 잡는다. 둘이 앞을 본다
- 레퍼런스: R-DS25;R-HI · 카메라: slow pull-out
- 음향/대사/자막: 없음
- 편집 합성·비고: —
- 예상 실패: — → 재생성: —
```
Wide from behind: Korean man, 64, short white hair, deeply weathered face, thick calloused hands, faded orange safety vest over gray shirt, old scratched white hard hat and Korean woman, 34, black low ponytail, small mole under left eye, black technical work jacket, bareheaded stand side by side before a utility pole in a dark field. His thick hand reaches sideways and takes hers. Both turn to face forward. Slow pull-out, wind in their hair. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Muted palette of black, warm orange practical light and bone-white. No text, no logos, no subtitles, no lens flare.
```

## S12. 크레딧

### CREDITS · 6:04–6:24 (20s) · 생성 없음
- 엔딩 크레딧
- 음향/대사: 무음→전선 소리
- 비고: —
