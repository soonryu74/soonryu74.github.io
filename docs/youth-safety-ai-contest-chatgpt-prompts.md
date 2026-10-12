# 「3초 뒤의 나」 ChatGPT 제작 프롬프트

사용법: 한 대화창에서 순서대로 진행. 인물이 바뀌지 않게 같은 대화창을 계속 씀.
글자는 그림에 넣지 않음. 자막은 편집 앱에서 얹음.

## 0. 먼저 붙여 넣기 (공통 규칙)

```
I'm making a 59-second vertical short film (9:16) about youth safety in Seoul. Keep the same main character in every image: a Korean middle-school student, short black hair, grey hoodie, navy school pants, orange backpack, white sneakers. Style: cinematic, realistic, soft film grain, shallow depth of field. Rules: no text, no logos, no watermark, no injury, no collision, no violence. Mostly show the student from behind or from the side. Always output vertical 9:16. Reply "ready" and wait for my scene requests.
```

## 1. 기준 이미지 (인물 확정)

```
Scene reference. A Korean middle-school student seen from behind, standing at a Seoul pedestrian crossing in warm daylight, looking down at a smartphone, one foot about to step forward. Grey hoodie, orange backpack, navy pants, white sneakers. Seoul apartment buildings and traffic light in the background. Vertical 9:16.
```

마음에 드는 한 컷이 나오면 "이 인물을 기준으로 이어서 만들어 줘"라고 말하고 아래로 진행.

## 2. 장면별 이미지

### 장면 1. 시간 정지 (0~4초)
```
Same student, same crossing. Time is frozen: a car and pedestrians are motionless, and a floating blue holographic interface panel with glowing rings appears in the air in front of the student. Cool blue light mixes with warm daylight. No text on the panel, only abstract glowing shapes. Vertical 9:16.
```

### 장면 2. 교통 (4~14초)
```
Same student at the crosswalk, a red car braking hard in the lane in front, tire smoke, motion blur, the car stopping just short of the crossing point. A blue holographic simulation grid overlays the scene and a red glowing dashed line shows the predicted collision point. Near miss only, no impact. Vertical 9:16.
```

### 장면 3. 일상 (14~24초)
```
Same student wearing white earbuds, looking at a phone while walking down wet outdoor stairs in heavy rain at dusk in Seoul. One foot slips slightly on the step, arms lifting for balance. Blue holographic warning icons float nearby, abstract and without text. No fall, no injury. Vertical 9:16.
```

### 장면 4. 온라인 (24~36초)
```
Close-up of a smartphone in a teenager's hand at night in a dark alley, a thumb hovering over a suspicious link in a text message. The text on the screen is blurred and unreadable. A red holographic shield and warning glow cover the screen. Cool blue night tones. Vertical 9:16.
```

### 장면 5. 되감기 후 안전한 선택 (36~46초)
```
Same student at the same crossing, now lowering the phone and looking up. The pedestrian light is green, the car has stopped far back, bright warm daylight, calm and safe mood. Vertical 9:16.
```

### 장면 6. 메시지 (46~56초)
```
Same student from behind on a hill at golden hour, looking up at the Seoul skyline with Namsan Tower in the distance, warm orange and purple sky, hopeful mood. Vertical 9:16.
```

## 3. 이미지를 영상으로 (ChatGPT의 영상 기능 또는 Sora)

각 이미지를 올리고 아래 동작 프롬프트를 사용. 길이는 4~6초씩 여러 번 뽑아 최선을 선택.

| 장면 | 동작 프롬프트 |
|---|---|
| 1 | Slow push-in. The world is frozen while the holographic panel glows and rotates gently. Subtle light flicker. |
| 2 | The red car brakes hard and stops, smoke drifts, slight camera shake, red warning glow pulses. The student stays still. |
| 3 | Rain falls continuously. The student's foot slips slightly and arms rise for balance, then the scene freezes with a red holographic warning glow. |
| 4 | The thumb slowly moves toward the link, then a red holographic shield expands across the screen. |
| 5 | The student slowly looks up from the phone, the light turns green, the car passes safely behind, the student starts to cross. |
| 6 | Slow camera push-in, soft wind in the hoodie, light particles drift, city lights begin to glow. |

공통으로 붙이면 좋은 문장: `Keep the character identical to the input image. No text. No injury.`

## 4. 편집 (캡컷 등)

1. 영상 클립을 장면 순서대로 배치, 총 59초 이내로 자르기
2. 자막은 `youth-safety-ai-contest-script.md` 의 장면표와 대본 문구 사용
3. 장면 사이에 되감기 효과, 흰 섬광 전환 사용
4. 마지막 3초에 타이틀 카드 + "AI 활용 도구" 표기
5. 안내문의 영상 규격에 맞춰 내보내기

## 5. 주의

- 이미지·영상 생성 기능은 요금제에 따라 횟수와 길이 제한이 다름. 제작 직전에 확인.
- 얼굴이 바뀌면 "Keep the exact same character as the first image" 를 다시 붙여서 재생성.
- 생성물의 이용 조건(공모전 응모 가능 여부)은 사용하는 서비스 약관에서 확인.
