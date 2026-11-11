# 《입구》 v5 — Seedance 프롬프트

> `tools/gen_v5.py`가 생성. 직접 수정 금지(스크립트를 고칠 것). 영상 생성은 승인 전 실행 금지.

## 공통 스타일 (모든 샷 앞에 붙임)
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text.
```

## 동굴 조명 블록 (S5~S9)
```
Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill.
```

## 공통 부정 프롬프트
```
text, letters, subtitles, watermark, logo, extra fingers, fused hands, deformed face, face drift, age change, costume change, cartoon, anime, oversaturated, tourist-brochure look, lens flare spam
```

## 연속성 규칙
- 인물·소품은 `04_character_and_prop_bible_v5.md`의 레퍼런스 이미지를 매 샷 첨부한다(continuity_id 기준).
- 한 샷 = 한 동작. 대사 샷은 화자 1명만 입을 연다.
- 문서·라벨·자막·타이틀 글자는 생성하지 않고 후반 합성한다(TXT_xx).
- 동굴 벽·유물에 손이 닿는 결과물은 불합격 처리한다.
- 대사 음성(한국어) 생성 방식은 PENDING: Seedance 자체 오디오/립싱크 지원 여부 공식 확인 후 결정.

## 샷별 프롬프트

### S1-01 · 5s · wide
- 동작: 비 오는 밭, 돌담 옆 전신주 공사
- 카메라: static wide
- 연속성: `CH_D44;LOC_FIELD;PR_GLOVE_NEW`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Wide shot, rainy Jeju farmland with black basalt stone walls, a utility pole being installed, Kim Dong-su at 44, lean Korean electrical line worker, short black hair, rain-soaked navy work jacket, white hard hat working beside a dug hole. grey overcast rain, flat daylight. Camera: static wide. Lighting: grey overcast rain, flat daylight
```

### S1-02 · 5s · medium
- 동작: 동수가 삽으로 구멍 가장자리를 다듬는다
- 카메라: slow push-in
- 연속성: `CH_D44;LOC_FIELD;PR_GLOVE_NEW`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Medium shot, Kim Dong-su at 44, lean Korean electrical line worker, short black hair, rain-soaked navy work jacket, white hard hat wearing bright yellow work gloves, trimming the edge of a hole with a shovel in the rain. Camera: slow push-in. Lighting: grey overcast rain, flat daylight
```

### S1-03 · 4s · close
- 동작: 흙이 푹 꺼지고 찬 바람이 솟는다
- 카메라: locked close, slight shake
- 연속성: `LOC_FIELD`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close shot of wet soil at the bottom of a dug hole suddenly collapsing inward, revealing darkness, cold mist rising from below. Camera: locked close, slight shake. Lighting: grey overcast rain, flat daylight
```

### S1-04 · 5s · POV
- 동작: 손전등 빛: 검은 돌, 안쪽의 흰 벽
- 카메라: POV tilt down, handheld
- 연속성: `LOC_CAVE_WALL`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. POV looking down through a ragged opening in the ground, a flashlight beam reveals black lava rock and, deeper inside, a snow-white mineral wall. Camera: POV tilt down, handheld. Lighting: single flashlight beam into darkness
```

### S1-05 · 4s · close
- 동작: 뻗은 손이 멈추고 노란 장갑 한 짝이 어둠으로 떨어진다
- 카메라: close on hand, tilt follows glove
- 연속성: `CH_D44;PR_GLOVE_NEW`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close shot, a man's rain-wet hand stops above a dark opening, one bright yellow work glove slips off the hole edge and falls into the darkness, shrinking out of sight. Camera: close on hand, tilt follows glove. Lighting: flashlight spill
```

### S1-06 · 5s · close-up
- 동작: 동수 얼굴: 놀라움보다 두려움. 타이틀 합성
- 카메라: static close-up
- 연속성: `CH_D44`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close-up, Kim Dong-su at 44, lean Korean electrical line worker, short black hair, rain-soaked navy work jacket, white hard hat, rain on his face, looking down into a hole with fear rather than wonder, he swallows and pulls back slightly. Camera: static close-up. Lighting: grey overcast rain, flat daylight
```

### S2-01 · 3s · medium
- 동작: 해인이 낡은 보고서를 넘긴다
- 카메라: static medium
- 연속성: `CH_H34;LOC_OFFICE`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Medium shot, Kim Hae-in, 34, Korean woman cave surveyor, hair tied back, dark green field jacket, calm guarded expression at a desk turning pages of an old bound survey report with blank pages. cool overcast window light, quiet office. Camera: static medium. Lighting: cool overcast window light, quiet office
```

### S2-02 · 4s · insert
- 동작: 보고서 한 줄(후반 합성 텍스트)
- 카메라: top-down insert
- 연속성: `LOC_OFFICE;TXT_01`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Top-down insert of an aged report page with a blank printed-form layout and a blurred photo of a ground opening, a finger resting under an empty line. No readable text. Camera: top-down insert. Lighting: cool overcast window light, quiet office
```

### S2-03 · 3s · insert
- 동작: 해인이 명단에 이름을 쓴다(후반 합성)
- 카메라: close on pen hand
- 연속성: `CH_H34;TXT_02`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close shot of a woman's hand writing with a pen on a blank participant list form. No readable text. Camera: close on pen hand. Lighting: cool overcast window light, quiet office
```

### S2-04 · 4s · over-shoulder
- 동작: 팀장 대사
- 카메라: OTS on leader
- 연속성: `CH_LEAD;CH_H34;LOC_OFFICE`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Over-the-shoulder shot, survey team leader, Korean man in his 50s, glasses, grey field vest looks up from a sheet of paper and speaks one short calm sentence. Camera: OTS on leader. Lighting: cool overcast window light, quiet office
```

### S2-05 · 5s · close-up
- 동작: 해인 대사
- 카메라: static close-up
- 연속성: `CH_H34;LOC_OFFICE`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close-up, Kim Hae-in, 34, Korean woman cave surveyor, hair tied back, dark green field jacket, calm guarded expression speaks quietly and firmly, two short sentences, eyes steady. Camera: static close-up. Lighting: cool overcast window light, quiet office
```

### S2-06 · 3s · insert
- 동작: 팀장이 서명한다
- 카메라: close on hand
- 연속성: `CH_LEAD;TXT_03`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close shot, an older man's hand signs the bottom of a blank form with a pen. No readable text. Camera: close on hand. Lighting: cool overcast window light, quiet office
```

### S3-01 · 4s · wide
- 동작: 마을 길, 가상 안내문, 이웃 한 명이 시선을 돌린다
- 카메라: tracking behind
- 연속성: `CH_H34;LOC_VILLAGE`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Tracking shot behind Kim Hae-in, 34, Korean woman cave surveyor, hair tied back, dark green field jacket, calm guarded expression walking a narrow Jeju village lane between basalt stone walls, past a blank signboard; one elderly neighbour glances at her then looks away. Camera: tracking behind. Lighting: overcast afternoon
```

### S3-02 · 4s · insert
- 동작: 식탁 위 밥그릇 하나
- 카메라: static
- 연속성: `LOC_HOUSE`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Static shot of a small wooden dining table with a single rice bowl and one pair of chopsticks. dim interior, single window daylight, warm brown shadows. Camera: static. Lighting: dim interior, single window daylight, warm brown shadows
```

### S3-03 · 4s · insert
- 동작: 벽의 가족사진과 접힌 초청장
- 카메라: slow pan
- 연속성: `LOC_HOUSE;PR_PHOTO;CH_H14`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Slow pan across a wall: an old framed photo of a man in a hard hat carrying a little girl on his shoulders in front of a utility pole, a folded card tucked into the frame edge. No readable text. Camera: slow pan. Lighting: dim interior, single window daylight, warm brown shadows
```

### S3-04 · 4s · medium
- 동작: 문이 열리고 동수가 딸을 보지 않은 채 말한다
- 카메라: static medium
- 연속성: `CH_D64;LOC_HOUSE`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Medium shot, a door opens and Kim Dong-su at 64, same man, grey cropped hair, weathered face, faded navy work jacket, old scratched white hard hat, avoids eye contact steps in, eyes lowered, says one short sentence without looking up. Camera: static medium. Lighting: dim interior, single window daylight, warm brown shadows
```

### S3-05 · 5s · close-up
- 동작: 해인 고백 대사
- 카메라: static close-up
- 연속성: `CH_H34;LOC_HOUSE`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close-up, Kim Hae-in, 34, Korean woman cave surveyor, hair tied back, dark green field jacket, calm guarded expression speaks haltingly, a pause after the first words, eyes glistening but controlled. Camera: static close-up. Lighting: dim interior, single window daylight, warm brown shadows
```

### S3-06 · 3s · close-up
- 동작: 동수는 대답하지 않는다
- 카메라: static close-up
- 연속성: `CH_D64;LOC_HOUSE`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close-up, Kim Dong-su at 64, same man, grey cropped hair, weathered face, faded navy work jacket, old scratched white hard hat, avoids eye contact stays silent, jaw tight, eyes fixed on the floor. Camera: static close-up. Lighting: dim interior, single window daylight, warm brown shadows
```

### S3-07 · 4s · close-up
- 동작: 해인 대사
- 카메라: static close-up
- 연속성: `CH_H34;LOC_HOUSE`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close-up, Kim Hae-in, 34, Korean woman cave surveyor, hair tied back, dark green field jacket, calm guarded expression asks a question, then adds two short phrases, voice low. Camera: static close-up. Lighting: dim interior, single window daylight, warm brown shadows
```

### S3-08 · 6s · close-up
- 동작: 동수의 두려움 고백
- 카메라: very slow push-in
- 연속성: `CH_D64;LOC_HOUSE`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close-up, Kim Dong-su at 64, same man, grey cropped hair, weathered face, faded navy work jacket, old scratched white hard hat, avoids eye contact speaks slowly with a long pause in the middle, still not meeting her eyes. Camera: very slow push-in. Lighting: dim interior, single window daylight, warm brown shadows
```

### S3-09 · 4s · close-up
- 동작: 해인 대사
- 카메라: static close-up
- 연속성: `CH_H34;LOC_HOUSE`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close-up, Kim Hae-in, 34, Korean woman cave surveyor, hair tied back, dark green field jacket, calm guarded expression asks one hurt question, barely above a whisper. Camera: static close-up. Lighting: dim interior, single window daylight, warm brown shadows
```

### S3-10 · 5s · medium
- 동작: 긴 침묵, 벽의 안전모를 만진다. 끝에 '그랬지.'
- 카메라: static medium
- 연속성: `CH_D64;PR_HELMET;LOC_HOUSE`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Medium shot, Kim Dong-su at 64, same man, grey cropped hair, weathered face, faded navy work jacket, old scratched white hard hat, avoids eye contact reaches to an old white hard hat hanging on the wall and rests his fingers on it for a long silent moment, then says one word. Camera: static medium. Lighting: dim interior, single window daylight, warm brown shadows
```

### S3-11 · 5s · two-shot
- 동작: 해인이 허가서를 놓고, 동수는 안전모 먼지를 턴다
- 카메라: static wide two-shot
- 연속성: `CH_H34;CH_D64;PR_HELMET;LOC_HOUSE`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Wide two-shot, Kim Hae-in, 34, Korean woman cave surveyor, hair tied back, dark green field jacket, calm guarded expression places a sheet of paper on the table; Kim Dong-su at 64, same man, grey cropped hair, weathered face, faded navy work jacket, old scratched white hard hat, avoids eye contact does not read it, takes the old hard hat down and brushes the dust off. Camera: static wide two-shot. Lighting: dim interior, single window daylight, warm brown shadows
```

### S4-01 · 4s · wide
- 동작: 철문 앞 가상 조사팀
- 카메라: static wide
- 연속성: `LOC_GATE;CH_LEAD`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Wide shot, a small survey team in helmets gathered at a locked iron gate set into a low concrete structure in a Jeju field. Camera: static wide. Lighting: overcast daylight, cold air
```

### S4-02 · 6s · close two-shot
- 동작: 해인이 헤드랜턴을 고정, 손끝이 이마에 닿자 둘 다 멈춘다
- 카메라: close, static
- 연속성: `CH_H34;CH_D64;PR_HELMET;PR_LAMP`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close two-shot, Kim Hae-in, 34, Korean woman cave surveyor, hair tied back, dark green field jacket, calm guarded expression fixes a headlamp onto the old white hard hat worn by Kim Dong-su at 64, same man, grey cropped hair, weathered face, faded navy work jacket, old scratched white hard hat, avoids eye contact; her fingertip brushes his forehead and both freeze for a beat. Camera: close, static. Lighting: overcast daylight, cold air
```

### S4-03 · 4s · close-up
- 동작: 2005년과 같은 찬 바람
- 카메라: static close-up
- 연속성: `CH_D64;LOC_GATE`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close-up, Kim Dong-su at 64, same man, grey cropped hair, weathered face, faded navy work jacket, old scratched white hard hat, avoids eye contact facing a dark open gate, cold air moves his collar, a flicker of old fear. Camera: static close-up. Lighting: overcast daylight, cold air
```

### S4-04 · 5s · wide
- 동작: 동수가 마지막으로 계단을 내려간다
- 카메라: high angle from inside
- 연속성: `CH_D64;LOC_GATE;PR_HELMET`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. High-angle shot from inside a dark stairwell, Kim Dong-su at 64, same man, grey cropped hair, weathered face, faded navy work jacket, old scratched white hard hat, avoids eye contact is the last to descend metal stairs, daylight shrinking behind him. Camera: high angle from inside. Lighting: daylight above, darkness below
```

### S5-01 · 6s · wide
- 동작: 랜턴 빛이 검은 동굴을 가른다
- 카메라: slow dolly forward
- 연속성: `LOC_CAVE;CH_H34;CH_D64;PR_LAMP`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Wide shot inside a lava tube, two figures with headlamps walk slowly, beams cutting the darkness. Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill. Camera: slow dolly forward. Lighting: Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill.
```

### S5-02 · 5s · detail
- 동작: 흰 탄산염 벽, 물방울
- 카메라: slow pan
- 연속성: `LOC_CAVE_WALL`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Detail shot, white carbonate deposits flowing over black lava rock, a water drop forming and falling. Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill. Camera: slow pan. Lighting: Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill.
```

### S5-03 · 5s · medium
- 동작: 동수가 무의식적으로 벽에 손을 뻗는다
- 카메라: side medium
- 연속성: `CH_D64;LOC_CAVE_WALL`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Side medium shot, Kim Dong-su at 64, same man, grey cropped hair, weathered face, faded navy work jacket, old scratched white hard hat, avoids eye contact slowly raises his bare hand toward a white cave wall, absorbed. Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill. Camera: side medium. Lighting: Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill.
```

### S5-04 · 4s · close
- 동작: '만지면 안 돼요.' 손이 벽 한 뼘 앞에서 멈춘다
- 카메라: close on hand and wall
- 연속성: `CH_D64;LOC_CAVE_WALL`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close shot, an old man's hand stops in mid-air a hand's width from a white mineral cave wall, fingers trembling slightly, never touching. Camera: close on hand and wall. Lighting: Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill.
```

### S5-05 · 6s · two-shot
- 동작: 손을 천천히 거둔다. 딸이 그 손을 본다
- 카메라: rack focus hand to Hae-in
- 연속성: `CH_D64;CH_H34;LOC_CAVE_WALL`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Two-shot, the old man's hand slowly withdraws from the wall without touching it; focus racks to Kim Hae-in, 34, Korean woman cave surveyor, hair tied back, dark green field jacket, calm guarded expression watching his hand. Camera: rack focus hand to Hae-in. Lighting: Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill.
```

### S6-01 · 6s · wide
- 동작: 검은 호수, 보트 위 부녀
- 카메라: static wide
- 연속성: `LOC_LAKE;CH_H34;CH_D64`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Wide shot, a small inflatable boat with two people crossing a black underground lake in a lava tube. Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill. Still black water mirroring the beams. Camera: static wide. Lighting: Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill. Still black water mirroring the beams.
```

### S6-02 · 5s · detail
- 동작: 수면 반사광이 천장에 일렁인다
- 카메라: tilt up
- 연속성: `LOC_LAKE`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Tilt up from black water to a cave ceiling where rippling orange reflections move across the rock. Camera: tilt up. Lighting: Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill. Still black water mirroring the beams.
```

### S6-03 · 5s · detail
- 동작: 작고 창백한 물고기가 스친다(종 묘사 PENDING)
- 카메라: top-down at surface
- 연속성: `LOC_LAKE`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Top-down shot through clear dark water, a tiny pale fish glides past the edge of a light beam and vanishes. Camera: top-down at surface. Lighting: Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill. Still black water mirroring the beams.
```

### S6-04 · 5s · close-up
- 동작: 동수 대사
- 카메라: static close-up
- 연속성: `CH_D64;LOC_LAKE`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close-up, Kim Dong-su at 64, same man, grey cropped hair, weathered face, faded navy work jacket, old scratched white hard hat, avoids eye contact looking down at the water, says a short hesitant question. Camera: static close-up. Lighting: Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill. Still black water mirroring the beams.
```

### S6-05 · 5s · close-up
- 동작: 해인 대사
- 카메라: static close-up
- 연속성: `CH_H34;LOC_LAKE`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close-up, Kim Hae-in, 34, Korean woman cave surveyor, hair tied back, dark green field jacket, calm guarded expression holding an oar, answers softly with one sentence, eyes on the water. Camera: static close-up. Lighting: Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill. Still black water mirroring the beams.
```

### S6-06 · 6s · close
- 동작: 동수가 노를 잡은 딸의 손을 본다
- 카메라: close on hands, tilt to his eyes
- 연속성: `CH_D64;CH_H34;LOC_LAKE`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close shot of a woman's hands gripping an oar, tilt up to an old man's eyes watching them, unable to speak. Camera: close on hands, tilt to his eyes. Lighting: Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill. Still black water mirroring the beams.
```

### S6-07 · 7s · wide
- 동작: 말없이 흘러가는 보트
- 카메라: slow drift
- 연속성: `LOC_LAKE;CH_H34;CH_D64`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Wide shot, the small boat drifts in silence, two headlamp beams apart, not facing each other. Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill. Still black water mirroring the beams. Camera: slow drift. Lighting: Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill. Still black water mirroring the beams.
```

### S7-01 · 6s · wide
- 동작: 호수 끝 모래 둑에 닿는다
- 카메라: static wide
- 연속성: `LOC_SAND;CH_H34;CH_D64`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Wide shot, the boat reaches a pale sand bank at the end of the underground lake, two people step out carefully. Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill. Camera: static wide. Lighting: Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill.
```

### S7-02 · 5s · detail
- 동작: 바닥의 오래된 토기 조각처럼 보이는 물체, 손대지 않음
- 카메라: slow push-in
- 연속성: `LOC_SAND`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Detail shot, an ancient weathered pottery fragment half-buried in cave sand inside a headlamp beam, two pairs of boots stop at a respectful distance, nobody touches it. Camera: slow push-in. Lighting: Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill.
```

### S7-03 · 4s · medium
- 동작: 해인이 무전으로 위치만 알린다
- 카메라: static medium
- 연속성: `CH_H34;LOC_SAND`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Medium shot, Kim Hae-in, 34, Korean woman cave surveyor, hair tied back, dark green field jacket, calm guarded expression speaks briefly into a handheld radio, pointing at the ground without stepping closer. Camera: static medium. Lighting: Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill.
```

### S7-04 · 5s · close-up
- 동작: 동수가 오랜 세월의 흔적을 본다
- 카메라: static close-up
- 연속성: `CH_D64;LOC_SAND`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close-up, Kim Dong-su at 64, same man, grey cropped hair, weathered face, faded navy work jacket, old scratched white hard hat, avoids eye contact looking at something on the ground for a long time, the weight of years on his face. Camera: static close-up. Lighting: Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill.
```

### S8-01 · 4s · wide
- 동작: 랜턴 빛이 바위 틈의 노란색에 멈춘다
- 카메라: pan stops
- 연속성: `LOC_CREVICE;PR_GLOVE_AGED`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. A headlamp beam pans across black rock and stops on a small patch of faded yellow wedged in a crevice. Camera: pan stops. Lighting: Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill.
```

### S8-02 · 4s · detail
- 동작: 침전물이 앉은 낡은 작업장갑 한 짝
- 카메라: macro, static
- 연속성: `PR_GLOVE_AGED;LOC_CREVICE`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Macro shot, a single old yellow work glove lodged in a rock crevice, stiff and faded, thin white mineral crust on its surface. Camera: macro, static. Lighting: Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill.
```

### S8-03 · 3s · close-up
- 동작: 동수가 얼어붙는다
- 카메라: static close-up
- 연속성: `CH_D64`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close-up, Kim Dong-su at 64, same man, grey cropped hair, weathered face, faded navy work jacket, old scratched white hard hat, avoids eye contact frozen, lips parted, headlamp light trembling. Camera: static close-up. Lighting: Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill.
```

### S8-04 · 4s · medium
- 동작: 해인이 사진을 찍고 무전한다
- 카메라: static medium
- 연속성: `CH_H34;LOC_CREVICE`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Medium shot, Kim Hae-in, 34, Korean woman cave surveyor, hair tied back, dark green field jacket, calm guarded expression photographs the crevice with a small camera, then lifts a radio. Camera: static medium. Lighting: Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill.
```

### S8-05 · 4s · medium
- 동작: 조사팀이 봉투에 담아 동수에게 잠시 보여준다
- 카메라: static medium
- 연속성: `CH_LEAD;CH_D64;PR_GLOVE_AGED;PR_BAG`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Medium shot, survey team leader, Korean man in his 50s, glasses, grey field vest wearing nitrile gloves holds up a clear sample bag containing the old yellow work glove for the old man to see. Camera: static medium. Lighting: Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill.
```

### S8-06 · 5s · close-up
- 동작: 동수 고백
- 카메라: static close-up
- 연속성: `CH_D64`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close-up, Kim Dong-su at 64, same man, grey cropped hair, weathered face, faded navy work jacket, old scratched white hard hat, avoids eye contact staring at the bag, speaks slowly with a pause in the middle. Camera: static close-up. Lighting: Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill.
```

### S8-07 · 3s · close-up
- 동작: 해인 대사
- 카메라: static close-up
- 연속성: `CH_H34`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close-up, Kim Hae-in, 34, Korean woman cave surveyor, hair tied back, dark green field jacket, calm guarded expression says one gentle sentence. Camera: static close-up. Lighting: Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill.
```

### S8-08 · 3s · close-up
- 동작: 동수 대사
- 카메라: static close-up
- 연속성: `CH_D64`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close-up, Kim Dong-su at 64, same man, grey cropped hair, weathered face, faded navy work jacket, old scratched white hard hat, avoids eye contact answers in a breaking low voice, one short sentence. Camera: static close-up. Lighting: Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill.
```

### S8-09 · 3s · close-up
- 동작: 해인이 처음으로 아버지 얼굴을 제대로 본다
- 카메라: slow push-in
- 연속성: `CH_H34`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close-up, Kim Hae-in, 34, Korean woman cave surveyor, hair tied back, dark green field jacket, calm guarded expression really looks at her father's face for the first time, accusation fading into complicated understanding. Camera: slow push-in. Lighting: Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill.
```

### S9-01 · 5s · wide
- 동작: 돌아오는 보트, 해인이 노를 멈춘다
- 카메라: static wide
- 연속성: `LOC_LAKE;CH_H34;CH_D64`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Wide shot, the boat in the middle of the black lake, Kim Hae-in, 34, Korean woman cave surveyor, hair tied back, dark green field jacket, calm guarded expression stops rowing and says one word. Camera: static wide. Lighting: Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill. Still black water mirroring the beams.
```

### S9-02 · 4s · two-shot
- 동작: 두 사람이 랜턴을 끈다
- 카메라: static two-shot
- 연속성: `CH_H34;CH_D64;PR_LAMP`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Two-shot in the boat, both reach up to their headlamps and switch them off one after the other; the frame falls to total black. Camera: static two-shot. Lighting: Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill. Still black water mirroring the beams.
```

### S9-05 · 6s · close
- 동작: 랜턴이 켜지면 해인의 손이 동수의 손 위에 있다
- 카메라: close on hands
- 연속성: `CH_H34;CH_D64;LOC_LAKE`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close shot, a headlamp clicks on and warm light reveals a woman's hand already resting on top of an old man's weathered hand on the boat's edge; the hands stay still. Camera: close on hands. Lighting: Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill. Still black water mirroring the beams.
```

### S9-06 · 5s · two-shot
- 동작: 서로 보지 않지만 손을 놓지 않는다
- 카메라: static two-shot
- 연속성: `CH_H34;CH_D64;LOC_LAKE`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Two-shot in the boat, father and daughter look in different directions, their hands still joined between them. Camera: static two-shot. Lighting: Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill. Still black water mirroring the beams.
```

### S10-01 · 4s · wide
- 동작: 저녁빛, 조사팀이 장비를 정리
- 카메라: static wide
- 연속성: `LOC_GATE;CH_LEAD`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Wide shot outside the iron gate, the survey team packing equipment cases. low golden evening light, long shadows. Camera: static wide. Lighting: low golden evening light, long shadows
```

### S10-02 · 5s · medium
- 동작: 팀장이 봉투를 보여주며 말한다
- 카메라: static medium
- 연속성: `CH_LEAD;CH_D64;PR_GLOVE_AGED;PR_BAG`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Medium shot, survey team leader, Korean man in his 50s, glasses, grey field vest holds the clear sample bag with the yellow glove toward the old man and says one formal sentence. Camera: static medium. Lighting: low golden evening light, long shadows
```

### S10-03 · 5s · close-up
- 동작: 동수가 장갑을 내려다본다
- 카메라: static close-up
- 연속성: `CH_D64;PR_BAG`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close-up, Kim Dong-su at 64, same man, grey cropped hair, weathered face, faded navy work jacket, old scratched white hard hat, avoids eye contact looks down at the bag for a long moment, wanting to keep it. Camera: static close-up. Lighting: low golden evening light, long shadows
```

### S10-04 · 4s · close
- 동작: 봉투를 조사팀 쪽으로 밀어준다
- 카메라: close on hands
- 연속성: `CH_D64;PR_BAG;PR_GLOVE_AGED`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close shot, an old man's hand slowly slides a clear sample bag holding a yellow glove across a folding table toward another pair of hands. Camera: close on hands. Lighting: low golden evening light, long shadows
```

### S10-05 · 5s · close-up
- 동작: 동수 대사
- 카메라: static close-up
- 연속성: `CH_D64`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close-up, Kim Dong-su at 64, same man, grey cropped hair, weathered face, faded navy work jacket, old scratched white hard hat, avoids eye contact speaks with a pause, plain and settled. Camera: static close-up. Lighting: low golden evening light, long shadows
```

### S10-06 · 5s · close
- 동작: 해인이 조사표에 적는다
- 카메라: close on pen hand
- 연속성: `CH_H34;TXT_04`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close shot, a woman's hand writes on a blank field form on a clipboard in golden light. No readable text. Camera: close on pen hand. Lighting: low golden evening light, long shadows
```

### S10-07 · 5s · insert
- 동작: 조사표 '유입 경위'란(후반 합성 텍스트)
- 카메라: top-down insert
- 연속성: `TXT_04`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Top-down insert of a blank field survey form on a clipboard, pen resting beside an empty line, golden light. No readable text. Camera: top-down insert. Lighting: low golden evening light, long shadows
```

### S10-08 · 3s · close-up
- 동작: 팀장이 확인한다
- 카메라: static close-up
- 연속성: `CH_LEAD`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close-up, survey team leader, Korean man in his 50s, glasses, grey field vest reads a clipboard and gives a small nod. Camera: static close-up. Lighting: low golden evening light, long shadows
```

### S10-09 · 5s · close
- 동작: 봉투 속 장갑이 해인 손에서 저녁빛을 받는다(S1 대칭)
- 카메라: close, low angle
- 연속성: `CH_H34;PR_BAG;PR_GLOVE_AGED`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Low-angle close shot, a woman's hand holds up a clear sample bag with the old yellow glove against the evening sun, the yellow glowing. Camera: close, low angle. Lighting: low golden evening light, long shadows
```

### S10-10 · 4s · close
- 동작: 장갑이 보관함으로 들어간다
- 카메라: close on case
- 연속성: `CH_LEAD;PR_BAG`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close shot, gloved hands place the sample bag into a grey storage case and close the lid. Camera: close on case. Lighting: low golden evening light, long shadows
```

### S11-01 · 4s · medium
- 동작: 봉인된 문, 전선이 운다. 동수가 전신주에 손을 댄다
- 카메라: static medium
- 연속성: `CH_D64;LOC_POLE`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Medium shot, Kim Dong-su at 64, same man, grey cropped hair, weathered face, faded navy work jacket, old scratched white hard hat, avoids eye contact rests his palm on a weathered concrete utility pole near the closed iron gate, wires humming in the wind. low golden evening light, long shadows. Camera: static medium. Lighting: low golden evening light, long shadows
```

### S11-02 · 4s · two-shot
- 동작: 해인이 옆에 서서 말한다
- 카메라: static two-shot
- 연속성: `CH_H34;CH_D64;LOC_POLE`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Two-shot, Kim Hae-in, 34, Korean woman cave surveyor, hair tied back, dark green field jacket, calm guarded expression steps beside her father at the pole and says one quiet sentence with a pause. Camera: static two-shot. Lighting: low golden evening light, long shadows
```

### S11-03 · 4s · close-up
- 동작: 동수가 돌아보고 딸의 눈을 피하지 않는다
- 카메라: static close-up
- 연속성: `CH_D64`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close-up, Kim Dong-su at 64, same man, grey cropped hair, weathered face, faded navy work jacket, old scratched white hard hat, avoids eye contact turns his head and, for the first time, holds eye contact without looking away. Camera: static close-up. Lighting: low golden evening light, long shadows
```

### S11-04 · 4s · close
- 동작: 아버지가 먼저 손을 내밀고 해인이 잡는다
- 카메라: close on hands
- 연속성: `CH_D64;CH_H34`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close shot, an old man's hand reaches out first, a woman's hand takes it, simple firm grip, golden backlight. Camera: close on hands. Lighting: low golden evening light, long shadows
```

### S11-05 · 4s · wide
- 동작: 카메라를 등지고 나란히 선다. 긴 정적
- 카메라: static wide from behind
- 연속성: `CH_D64;CH_H34;LOC_POLE`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Wide shot from behind, father and daughter stand side by side with their backs to camera beside a utility pole, Jeju field at dusk, long stillness. Camera: static wide from behind. Lighting: low golden evening light, long shadows
```
