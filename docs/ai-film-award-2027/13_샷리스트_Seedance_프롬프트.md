# 「입구」 v3 — 샷리스트 + Seedance 프롬프트

**기준** 시나리오 v3 (17_시나리오_입구_v3.md) · 총 54샷 (12_시나리오_입구_v2.md) · 총 49샷 · 생성 분량 약 305초/360초 (85%)
**툴** Dreamina Seedance (2.0/2.5). 프로젝트당 레퍼런스 이미지 최대 9장, 클립 최대 15초. UI 사양은 제작 당일 확인.

---

## 0. 프롬프트 규칙 (전 샷 공통)

**공식**: 피사체 + 행동 + 환경 + 카메라(하나만) + 스타일 + 제약. 60~100단어. 영어.
**카메라**: 샷당 이동 하나. push-in / pull-out / pan / tracking / orbit / handheld / fixed 중 택1.
**레퍼런스**: 인물·장소는 레퍼런스 이미지 첨부 후 프롬프트는 짧게. `@` 태그는 Dreamina UI 표기 따름.

**STYLE 블록 (모든 프롬프트 끝에 붙임)**
```
Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain.
Palette: pure black shadows, warm orange headlamp light, bone-white carbonate deposits.
Single light source only. No text, no logos, no subtitles, no lens flare, no fog machine haze.
```

**동굴 샷 추가 제약**
```
Everything outside the headlamp circle is pure black. Do not reveal cave walls beyond the light.
```

**인물 고정 문구** (레퍼런스와 함께 매번 반복)
- 동수 2025: `Korean man, 64, short white hair, weathered face, thick hands, faded orange safety vest, old scratched white hard hat`
- 동수 2005: `Korean man, 43, short black hair, orange safety vest, white hard hat, wet from rain`
- 해인: `Korean woman, 34, black ponytail, black technical work jacket, headlamp on forehead, waterproof tablet`
- 연구원: `cave survey team in matching black work jackets and headlamps, faces in shadow`

---

## 1. 레퍼런스 이미지 생성 (영상 전에 먼저, Dreamina 이미지 모드)

| ID | 용도 | 이미지 프롬프트 |
|---|---|---|
| R-DS25 | 동수 2025 정면·측면 | Portrait of a Korean man, 64, short white hair, deep weathered lines, thick calloused hands, faded orange safety vest over gray shirt, old scratched white hard hat with faded KEPCO logo, neutral expression, soft warm key light from one side, black background, photorealistic |
| R-DS05 | 동수 2005 | Same man at 43, short black hair, rain on face, orange vest, white hard hat, overcast daylight, muddy field background |
| R-HI | 해인 | Portrait of a Korean woman, 34, black ponytail, black technical work jacket, headlamp strapped on forehead (off), holding a rugged tablet, calm focused expression, warm single light, black background, photorealistic |
| R-TEAM | 연구원 군상 | Six people in matching black work jackets and headlamps standing in a line, faces in shadow, evening field, shot from behind and side |
| R-WALL | 흰 탄산염 벽 | Interior of a black basalt lava tube, bone-white calcite deposits flowing down the dark wall like frozen snow, one headlamp beam illuminating a circle, everything else pure black, photorealistic cave photography |
| R-ROOT | 뿌리 종유석 | Black basalt cave ceiling with thin bone-white soda-straw stalactites grown along tree roots, roots visible inside some tubes, a single water drop at a tip, headlamp beam from below, black surroundings |
| R-LAKE | 호수 | Underground lake, perfectly still black water, headlamp beam reflecting off the surface onto a low basalt ceiling creating a second light, rubber boat edge in foreground, pure black beyond |
| R-FISH | 눈 없는 물고기 | Small translucent cave fish, finger length, eyes reduced to two tiny dark dots beneath the skin, pale pink-white body, drifting in black water lit by a single warm beam, macro photography |
| R-SAND | 모래 둑 | Sand bank at the end of an underground lake, several round Unified-Silla stoneware jars half-buried in dark sand, abalone shells, headlamp beam, black beyond |
| R-GLOVE | 장갑 | Yellow rubber work glove wedged in a basalt crevice, coated in white calcite crust, headlamp beam, macro |
| R-HOME | 동수의 집 | Small Korean rural house interior at night, single incandescent bulb, low table with one bowl and one spoon, old TV glow, faded framed photo and scratched white hard hat on the wall |
| R-GATE | 입구 철문 | Flat farmland in Woljeong, Jeju with black stone walls, a single concrete utility pole, next to it a rusted steel hatch door in a concrete frame, overcast sky |

---

## 2. 샷리스트

표기: **T2V** 텍스트→영상 · **I2V** 이미지→영상(첫 프레임 지정) · **REF** 레퍼런스 참조 · 초 = 목표 길이

### S1. 2005년 — 비 오는 밭 (0:20–0:50)

| # | 초 | 샷 | 모드 | 프롬프트 |
|---|---|---|---|---|
| 1-1 | 5 | 와이드, 비 오는 밭 | T2V + R-GATE | Wide shot. Gray rain over flat Jeju farmland with black stone walls, an excavator digging a hole beside a new utility pole, a worker in orange vest and white hard hat shoveling at the edge. Fixed camera. Overcast, desaturated, 2005 documentary feel. + STYLE |
| 1-2 | 4 | 삽이 헛도는 발 | T2V + R-DS05 | Close on muddy boots and a shovel. The shovel sinks into soil that suddenly gives way, mud collapsing into a black opening. Fixed low camera. Rain. + STYLE |
| 1-3 | 5 | 바람에 흔들리는 머리카락 | I2V(R-DS05) | Korean man, 43, orange vest, white hard hat, leans over a dark hole in wet ground. A cold wind rises from below and lifts his hair. He freezes. Slow push-in on his face. Rain on skin. + STYLE |
| 1-4 | 6 | 손전등 원 안의 흰 벽 | T2V + R-WALL | POV flashlight beam from above into a dark hole. The circle of light finds a black basalt wall streaked with bone-white calcite deposits. Slow pan across the white. Pure black outside the beam. + STYLE |
| 1-5 | 5 | 떨어지는 노란 장갑 | T2V | A yellow rubber work glove slips from a hand and falls into a black hole, tumbling, caught briefly in the flashlight beam, then swallowed by darkness. Fixed camera looking down. + STYLE |
| 타이틀 | 5 | 검정 위 흰 글자 | 편집 | 생성 없음 |

### S2. 2025년 — 세계자연유산본부 (0:50–1:10)

| # | 초 | 샷 | 모드 | 프롬프트 |
|---|---|---|---|---|
| 2-1 | 6 | 보고서를 넘기는 손, 한 줄에서 멈춤 | I2V(R-HI) | Close on a woman's hand turning pages of a bound 2005 survey report with photos and diagrams under fluorescent light. The hand stops on a line of text. Slow push-in on the page. (문구 '성명 미상'은 편집 합성) + STYLE |
| 2-1b | 4 | 보고서를 덮는다 | I2V(R-HI) | The same hand closes the report firmly and pulls a blank form forward. Fixed camera, fluorescent light. + STYLE |
| 2-2 | 7 | 해인이 명단에 쓴다 | I2V(R-HI) | Korean woman, 34, black ponytail, black work jacket, writes a name on a form with a pen. Across the desk a middle-aged man in a gray jacket watches. Fixed two-shot, office, fluorescent light. + STYLE |
| 2-3 | 6 | 팀장 서명 | T2V | Close on a man's hand holding a pen above a signature box, hesitating, then signing. Fixed camera, fluorescent light, desk. + STYLE |

### S3. 동수의 집 (1:10–1:50)

| # | 초 | 샷 | 모드 | 프롬프트 |
|---|---|---|---|---|
| 3-0a | 6 | 묵은 밭과 팻말 | T2V + R-GATE | Evening. A young woman in a black jacket walks along a Jeju black-stone-wall lane past overgrown unworked fields. On each field gate a weathered official sign on a post. Slow tracking beside her. (팻말 문구 편집 합성) + STYLE |
| 3-0b | 5 | 이웃이 고개를 돌린다 | REF(R-HI) | An elderly Jeju farmer walking toward the woman on the lane sees her, turns his head away and passes without greeting. Fixed medium shot, dusk. + STYLE |
| 3-1 | 6 | 밥상 위 그릇 하나 | I2V(R-HOME) | Small rural Korean room at night, one incandescent bulb. Low table with one bowl of rice, one spoon. Old TV glow flickers on the wall. Slow push-in on the single bowl. + STYLE |
| 3-2 | 5 | 동수가 혼자 먹는다, 보지 않고 | I2V(R-DS25) | Korean man, 64, white hair, gray shirt, eats alone at a low table with his eyes lowered, never looking at the glowing TV, his hand feeling for the spoon by touch. Fixed medium shot, warm bulb light. + STYLE |
| 3-3 | 5 | 벽의 안전모와 액자 | T2V + R-HOME | Slow pan across a wall: a scratched white hard hat on a nail, then a faded framed photo of a young man carrying a small girl on his shoulders in front of a utility pole. Warm bulb light. + STYLE |
| 3-4 | 5 | 문 여는 동수, 보지 않고 문고리를 만진다 | REF(R-DS25, R-HI) | Korean man, 64, opens a wooden door. Outside in the dark stands a Korean woman, 34, black ponytail, black jacket. He does not meet her eyes; his hand stays on the door handle, thumb moving over the metal. Fixed shot from inside the house. + STYLE |
| 3-5 | 7 | 두 사람, 허가서 | REF(R-DS25, R-HI) | Inside the room, the woman holds out a folded document. The man does not take it. He looks at the hard hat on the wall. Fixed two-shot, warm bulb light, long pause. + STYLE |
| 3-6 | 6 | 안전모 먼지 털기 | I2V(R-DS25) | Close on thick weathered hands lifting an old white hard hat from a nail and brushing dust off it with a palm. Warm light. Fixed camera. + STYLE |
| 3-7 | 6 | 해인이 그릇 하나를 본다 | I2V(R-HI) | Korean woman, 34, glances down at a low table with one bowl and one spoon, says nothing. Slow push-in on her face. Warm bulb light. + STYLE |

### S4. 입구 (1:50–2:15)

| # | 초 | 샷 | 모드 | 프롬프트 |
|---|---|---|---|---|
| 4-1 | 6 | 밭, 전신주, 철문, 팀 | I2V(R-GATE) | Overcast morning. Flat Jeju field, black stone walls, a utility pole and a rusted steel hatch in concrete. Six people in black work jackets unload equipment from a white van. Slow aerial pull-out. + STYLE |
| 4-2 | 6 | 헤드랜턴 씌우기, 이마에 닿는 손 | REF(R-DS25, R-HI) | Korean woman, 34, fastens a headlamp over an old white hard hat worn by a Korean man, 64. Her fingers touch his forehead for a moment. Both still. Close two-shot, fixed, overcast light. + STYLE |
| 4-3 | 7 | 철문이 열리고 바람 | REF(R-DS25) | Steel hatch door swings open. Cold air rises from the dark and lifts the white hair of a 64-year-old man in an orange vest. He stands at the edge. Slow push-in. Overcast. + STYLE |
| 4-4 | 6 | 위에서 본 구멍, 작아지는 빛 | T2V | Looking straight down a dark vertical shaft. Headlamp circles descend one by one, growing smaller, until only one remains, then it too moves out of view. Fixed top-down camera. Pure black. + STYLE |

### S5. 동굴 상류 — 흰 벽 (2:15–2:40)

| # | 초 | 샷 | 모드 | 프롬프트 |
|---|---|---|---|---|
| 5-1 | 7 | 랜턴 원 여섯 개가 벽을 훑는다 | I2V(R-WALL) | Pitch-black lava tube. Six headlamp beams sweep across a black basalt wall revealing bone-white calcite flows. Beams cross and separate. Slow tracking shot along the wall. Everything outside the beams is pure black. + STYLE + 동굴 제약 |
| 5-2 | 6 | 뿌리 종유석, 물방울 | I2V(R-ROOT) | Headlamp beam tilts up to pale root-shaped stalactites hanging from a black ceiling. A single water drop swells at a tip and falls. Slow tilt up then hold. Black beyond. + STYLE + 동굴 제약 |
| 5-3 | 7 | 동수가 벽 앞에 서서 손을 뻗는다 | REF(R-DS25, R-WALL) | Korean man, 64, old white hard hat with headlamp, stands before a white calcite wall in a black cave. He slowly reaches out his thick hand toward the white, then stops a hand's width away and holds. Fixed side profile, his own headlamp the only light. + STYLE + 동굴 제약 |
| 5-4 | 5 | 멈춘 손, 해인이 본다 | REF(R-HI) | Close on a weathered hand frozen a hand's width from a white calcite wall. Rack focus to a Korean woman, 34, in the background watching the hand, her headlamp beam low. Black surroundings. + STYLE + 동굴 제약 |

### S6. 호수 (2:40–3:20)

| # | 초 | 샷 | 모드 | 프롬프트 |
|---|---|---|---|---|
| 6-1 | 7 | 보트, 빛이 두 번 | I2V(R-LAKE) | A small rubber boat glides on perfectly still black underground water. A woman at the back rows, a man sits at the front. Their headlamps reflect off the water onto a low basalt ceiling, two circles of light. Slow tracking from the side. Pure black beyond. + STYLE + 동굴 제약 |
| 6-2 | 6 | 담수·염수 아지랑이 | T2V + R-LAKE | Headlamp beam shining down into clear black water. A shimmering wavering layer where fresh water meets salt water, like heat haze underwater. Slow push-in. Black beyond the beam. + STYLE + 동굴 제약 |
| 6-3 | 8 | 반투명 물고기가 보트 옆을 지난다 | I2V(R-FISH) | A small pale-pink translucent cave goby with a large head and eyes sunken beneath the skin drifts slowly through a warm headlamp beam in black water beside a rubber boat edge. It does not flee the light. Macro, slow tracking with the fish. + STYLE + 동굴 제약 |
| 6-4 | 6 | 동수가 들여다본다 | REF(R-DS25) | Korean man, 64, old hard hat, leans over the edge of a rubber boat and looks down into black water lit by his headlamp. His face reflected faintly. Fixed close shot. + STYLE + 동굴 제약 |
| 6-4b | 6 | 동수가 자기 손을 내려다본다 | REF(R-DS25) | Korean man, 64, in a rubber boat, slowly turns his thick weathered hands palm-up in his own headlamp light and looks at them. Fixed close shot, black water beyond. + STYLE + 동굴 제약 |
| 6-5 | 6 | 해인 "안 봐요. 느껴요." | REF(R-HI) | Korean woman, 34, headlamp, holds the oars still and looks at the man across the boat, calm. She speaks a short line. Fixed medium shot, black water, her beam low. + STYLE + 동굴 제약 |
| 6-6 | 7 | 물고기가 빛을 가로지른다, 동수의 눈 | I2V(R-FISH) | The pale-pink translucent goby, eyes buried beneath its skin, crosses the full width of a headlamp beam in black water and disappears at the edge of the light. Fixed macro. Then rack focus up to the watching man's eyes. + STYLE + 동굴 제약 |

### S7. 호수 끝 — 모래 둑 (3:20–3:45)

| # | 초 | 샷 | 모드 | 프롬프트 |
|---|---|---|---|---|
| 7-1 | 5 | 보트가 모래에 닿는다 | I2V(R-SAND) | Rubber boat nose slides onto a dark sand bank at the end of black underground water. Headlamp beam ahead reveals sand rising into darkness. Fixed low camera from the boat. + STYLE + 동굴 제약 |
| 7-2 | 5 | 항아리들과 火川 | I2V(R-SAND) | Headlamp beam settles on round stoneware jars half-buried in dark sand, one tipped over, abalone shells. The beam lifts to a black basalt wall where two carved characters are half-covered by white calcite crust. Slow pan from jars to wall. Black beyond. (글자는 편집 합성) + STYLE + 동굴 제약 |
| 7-3 | 8 | 회상: 횃불, 항아리를 두고 글자를 새긴다 | T2V | Same sand bank 1,200 years ago. Four figures in rough hemp clothing hold torches, faces outside the firelight. One kneels and sets a round stoneware jar on the wet sand at the water's edge; another scratches two characters into the black wall with an iron point. Fixed wide, torchlight only, warm orange, black beyond. + STYLE + 동굴 제약 |
| 7-4 | 7 | 회상: 횃불이 돌아선다 → 현재 항아리 | T2V | The torches turn and walk away up the sand into darkness until the last flame disappears. Hold on black. Then a cool white headlamp beam fades in on the same jar, now half-buried and 1,200 years old. Fixed camera, same framing. + STYLE + 동굴 제약 |

### S8. 바위 틈 — 장갑 (3:45–4:15)

| # | 초 | 샷 | 모드 | 프롬프트 |
|---|---|---|---|---|
| 8-1 | 5 | 랜턴이 바위 틈에서 멈춘다 | T2V + R-GLOVE | A headlamp beam sweeps along a black basalt crevice at the edge of a sand bank, then stops. In the beam: a yellow rubber work glove crusted in white calcite. Slow pan then hold. + STYLE + 동굴 제약 |
| 8-2 | 6 | 동수가 얼어붙는다 | REF(R-DS25) | Korean man, 64, old hard hat, stares at something low in a rock crevice. His body goes completely still. His headlamp beam trembles slightly. Slow push-in on his face. Black surroundings. + STYLE + 동굴 제약 |
| 8-3 | 6 | 해인이 태블릿을 내린다 | REF(R-HI) | Korean woman, 34, approaches holding a rugged tablet up to document, sees the yellow glove in the crevice, pauses, then slowly lowers the tablet to her side. Fixed medium shot, headlamp light. + STYLE + 동굴 제약 |
| 8-4 | 7 | 장갑을 집어 아버지 손에 | REF(R-HI, R-DS25, R-GLOVE) | Close on hands. A young woman's hand lifts a calcite-crusted yellow glove from a rock crevice, white dust falling, and places it into an older man's thick open palm. His fingers close on it. Fixed macro, warm headlamp light. + STYLE + 동굴 제약 |
| 8-5 | 6 | 해인이 돌아서 보트로 | REF(R-HI) | Korean woman, 34, turns away from the man and walks back across dark sand toward a rubber boat, her headlamp beam leading. Behind her the man stands alone holding a glove. Fixed wide from behind her. + STYLE + 동굴 제약 |

### S9. 호수 가운데 — 어둠 (4:15–4:50)

| # | 초 | 샷 | 모드 | 프롬프트 |
|---|---|---|---|---|
| 9-1 | 5 | 보트, 노를 멈춘다 | REF(R-HI, R-DS25, R-LAKE) | Rubber boat in the middle of a black underground lake. A woman at the back stops rowing. Two headlamp circles on the water and ceiling. Fixed wide from the side. + STYLE + 동굴 제약 |
| 9-2 | 5 | 랜턴 두 개가 꺼진다 | REF(R-HI, R-DS25) | Close two-shot in a boat. Both people reach up and switch off their headlamps one after the other. Light disappears. Frame goes to pure black. Fixed camera. + STYLE + 동굴 제약 |
| 암전 | 15 | 검정 + 사운드 | 편집 | 생성 없음. 물방울·숨·먼 파도. 대사 3줄 |
| 9-3 | 6 | 랜턴이 켜진다, 잡힌 두 손 | REF(R-HI, R-DS25) | Pure black. A single headlamp switches on. In the new circle of light, resting on a rubber boat edge: a young woman's hand lying on top of an older man's thick weathered hand. Neither hand moves. Fixed macro, nothing else visible. **(가장 중요한 컷. 생성 횟수 최다 배정)** + STYLE + 동굴 제약 |
| 9-3b | 5 | 둘 다 손을 쳐다보지 않는다 | REF(R-HI, R-DS25) | Two-shot in a rubber boat under one headlamp: the old man looks down at the water, the young woman looks up at the ceiling, their joined hands resting between them out of focus. Neither looks at the hands. Fixed.  + STYLE + 동굴 제약 |
| 9-4 | 6 | 물고기가 보트 옆을 지난다 | I2V(R-FISH) | The pale-pink translucent goby, eyes buried beneath its skin, drifts past a rubber boat edge at the bottom of a single headlamp beam and slips into black water. Fixed macro. + STYLE + 동굴 제약 |

### S10. 지상 — 철문 (4:50–5:25)

| # | 초 | 샷 | 모드 | 프롬프트 |
|---|---|---|---|---|
| 10-1 | 7 | 철문 양쪽 도열 | I2V(R-TEAM) + R-GATE | Evening, flat Jeju field, blue dusk. Six people in black work jackets stand silently in two lines on either side of an open steel hatch, equipment set down, no one holding a camera. Slow push-in down the center. + STYLE |
| 10-2 | 6 | 동수가 올라온다 | REF(R-DS25) | Korean man, 64, old white hard hat, climbs up out of a steel hatch in the ground holding a dust-white yellow glove, and stops when he sees the two lines of people. Fixed low camera at ground level. Dusk. + STYLE |
| 10-3 | 7 | 해인이 줄 끝에 선다 | REF(R-HI, R-TEAM) | Korean woman, 34, climbs out after him, walks past her father without stopping, and takes her place at the end of one line of people. Slow tracking following her. Dusk. + STYLE |
| 10-4 | 8 | 고개 숙임, 하나씩, 마지막에 해인 | REF(R-DS25, R-HI, R-TEAM) | A gray-haired team leader bows his head to the old man in the orange vest. Then each person in the lines bows in turn. Last, the young woman at the end of the line bows. The old man takes off his hard hat. Fixed wide, dusk. + STYLE |
| 10-5 | 5 | 동수가 손을 든다, 용접이 멈춘다 | REF(R-DS25) | A welder lifts a torch toward a steel hatch. An old man in an orange vest raises one hand. The welder stops. Fixed medium, dusk. + STYLE |
| 10-6 | 7 | 구멍을 내려다본다, 장갑을 떨어뜨린다 | REF(R-DS25, R-GLOVE) | Korean man, 64, stands at the edge of an open steel hatch and looks down into the black shaft. He opens his hand and lets a calcite-white yellow rubber glove fall into the dark. Fixed close from his side, dusk. + STYLE |
| 10-7 | 4 | 구멍 속으로 떨어지는 장갑 | T2V | Looking straight down a black shaft: a white-crusted yellow glove tumbles away from camera into darkness until it disappears. Fixed top-down. (S1 1-5 매치) + STYLE |
| 10-8 | 6 | 철문이 닫히고 용접 불꽃 | T2V + R-GATE | A steel hatch door closes over a concrete frame in a dark field. A welder's torch sparks along the seam, bright orange, then stops. Fixed close on the seam, dusk to night. + STYLE |

### S11. 전신주 (5:25–5:40)

| # | 초 | 샷 | 모드 | 프롬프트 |
|---|---|---|---|---|
| 11-1 | 7 | 전신주, 표지판, 손 | REF(R-DS25, R-GATE) | Night wind over a Jeju field. A single utility pole, wires humming. A sealed steel hatch below it with a small sign. A Korean man, 64, places his hand flat on the pole. Slow push-in on the hand. + STYLE |
| 11-2 | 5 | 보지 않고 손을 잡는다 | REF(R-DS25, R-HI) | Close from the side at waist height: a young woman's hand reaches sideways without her looking and takes an old man's thick hand. Both faces stay turned forward. Night wind, utility pole behind. Fixed. + STYLE |
| 11-3 | 6 | 둘이 나란히 | REF(R-DS25, R-HI) | Wide shot from behind: an old man in an orange vest and a young woman in a black jacket stand side by side before a utility pole in a dark field, hands joined, not speaking, wind in their hair. Slow pull-out. + STYLE |

---

## 3. 분량 계산 (70% 규정)

| 구분 | 초 |
|---|---|
| 전체 | 360 |
| 공식 인트로(주최 제공) | 20 |
| 타이틀·암전·크레딧(생성 없음) | 5 + 15 + 20 = 40 |
| **Seedance 생성 목표** | **약 300** (v3: 54샷, 생성 초 합계는 편집에서 6:00에 맞춰 트리밍) |
| 실사 보조 허용 한도 | ≤108 (쓰지 않아도 됨) |

300/360 = 83%. 인트로·암전을 분모에서 빼면 더 높음. 규정 해석(인트로 포함 여부)은 제출 전 주최 FAQ 확인.

**실사 보조 후보 (선택)**: 2-1 공문, 3-1 밥상, 10-5 용접 불꽃, 만장굴 벽 질감 인서트. 합쳐도 30초 미만.

---

## 4. 생성 순서 (일관성 우선)

1. 레퍼런스 이미지 12장 → 확정 → 전 샷 공통 첨부
2. **9-3 두 손** 먼저. 10회 이상 생성, 최고 컷 확정. 이 컷이 안 되면 영화가 안 됨
3. 인물 클로즈업(3-4, 5-3, 6-4, 6-5, 8-2, 8-4)
4. 동굴 환경(5-1, 5-2, 6-1, 6-3, 7-2)
5. 군상(10-1, 10-3, 10-4)
6. 나머지

## 5. 실패 패턴과 대응

| 증상 | 대응 |
|---|---|
| 랜턴 원 밖이 회색으로 뜸 | 프롬프트 끝에 "pure black, zero ambient light" 반복. 후반에서 레벨 조정 |
| 인물 얼굴이 샷마다 바뀜 | 레퍼런스 재첨부 + 고정 문구 전체 반복. 얼굴 절반 그늘로 노출 축소 |
| 물고기에 눈이 생김 | "no eyes, smooth skin where eyes would be" 2회 반복 |
| 카메라가 두 가지로 움직임 | 이동 동사 하나만 남기고 삭제 |
| 흰 벽이 석회동굴처럼 밝음 | "black basalt" 먼저 쓰고 "white calcite streaks" 뒤에 |
