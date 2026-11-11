# 《입구》 v7 — Seedance 프롬프트

> `tools/gen_v7.py`가 생성. 직접 수정 금지(스크립트를 고칠 것). 영상 생성은 승인 전 실행 금지.

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
- 인물·소품은 `04_character_and_prop_bible_v7.md`의 레퍼런스 이미지를 매 샷 첨부한다(continuity_id 기준).
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
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Medium shot, Kim Dong-su at 44, lean Korean electrical line worker, short black hair, rain-soaked navy work jacket, white hard hat wearing a pair of bright yellow work gloves, trimming the edge of a hole with a shovel in the rain. Camera: slow push-in. Lighting: grey overcast rain, flat daylight
```

### S1-03 · 4s · close
- 동작: 흙이 꺼지고 찬 바람이 올라온다
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
- 동작: 뻗던 손이 멈추고 오른쪽 노란 장갑이 어둠으로 떨어진다
- 카메라: close on hand, tilt follows glove
- 연속성: `CH_D44;PR_GLOVE_NEW`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close shot, a man's rain-wet right hand stops above a dark opening, one bright yellow work glove slips off the hole edge and falls into the darkness, shrinking out of sight. Camera: close on hand, tilt follows glove. Lighting: flashlight spill
```

### S1-06 · 4s · close-up
- 동작: 동수 얼굴: 놀라움이 아니라 겁. 타이틀 합성
- 카메라: static close-up
- 연속성: `CH_D44`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close-up, Kim Dong-su at 44, lean Korean electrical line worker, short black hair, rain-soaked navy work jacket, white hard hat, rain on his face, looking down into a hole with fear rather than wonder, he swallows. Camera: static close-up. Lighting: grey overcast rain, flat daylight
```

### S1-07 · 3s · wide
- 동작: 주위를 둘러본다. 아무도 없다. 왼손 장갑은 그대로
- 카메라: static wide
- 연속성: `CH_D44;LOC_FIELD;PR_GLOVE_NEW`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Wide shot, Kim Dong-su at 44, lean Korean electrical line worker, short black hair, rain-soaked navy work jacket, white hard hat alone in an empty rainy field looks around over his shoulder; a yellow glove on his left hand only, right hand bare. Camera: static wide. Lighting: grey overcast rain, flat daylight
```

### S2-01 · 4s · wide
- 동작: 마을 회관 무대, 동굴 사진 앞의 해인
- 카메라: static wide
- 연속성: `CH_H31;LOC_HALL`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Wide shot of a small community hall, residents on folding chairs seen from behind, Kim Hae-in at 31, same woman, hair tied back, grey surveyor vest over a white shirt standing on a low stage before a projected photo of a dark cave interior. flat fluorescent community-hall light. Camera: static wide. Lighting: flat fluorescent community-hall light
```

### S2-02 · 4s · medium
- 동작: 뒷문이 열리고 양복 재킷의 동수가 초청장을 쥐고 벽에 붙어 선다
- 카메라: static medium
- 연속성: `CH_D61;LOC_HALL;PR_INVITE`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Medium shot, a back door opens quietly and Kim Dong-su at 61, same man, grey cropped hair, wearing his one ill-fitting dark suit jacket over a work shirt slips in holding a folded invitation card, standing against the wall. Camera: static medium. Lighting: flat fluorescent community-hall light
```

### S2-03 · 4s · medium
- 동작: 화면 밖 질문을 듣는 해인
- 카메라: static medium
- 연속성: `CH_H31;LOC_HALL`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Medium shot, Kim Hae-in at 31, same woman, hair tied back, grey surveyor vest over a white shirt on stage listening to a question from the audience, her expression tightening; she does not speak. Camera: static medium. Lighting: flat fluorescent community-hall light
```

### S2-04 · 3s · close-up
- 동작: 해인의 눈이 뒷문의 아버지와 마주친다
- 카메라: static close-up
- 연속성: `CH_H31`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close-up, Kim Hae-in at 31, same woman, hair tied back, grey surveyor vest over a white shirt looks past the audience toward the back of the room and freezes. Camera: static close-up. Lighting: flat fluorescent community-hall light
```

### S2-05 · 3s · close-up
- 동작: 동수가 아주 작게 고개를 끄덕인다
- 카메라: static close-up
- 연속성: `CH_D61`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close-up, Kim Dong-su at 61, same man, grey cropped hair, wearing his one ill-fitting dark suit jacket over a work shirt gives a very small reassuring nod, as if to say it is all right. Camera: static close-up. Lighting: flat fluorescent community-hall light
```

### S2-06 · 3s · close-up
- 동작: 해인 대사
- 카메라: static close-up
- 연속성: `CH_H31`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close-up, Kim Hae-in at 31, same woman, hair tied back, grey surveyor vest over a white shirt says one short flat sentence, eyes dropping. Camera: static close-up. Lighting: flat fluorescent community-hall light
```

### S2-07 · 3s · close
- 동작: 초청장을 반으로 접는다
- 카메라: close on hands
- 연속성: `CH_D61;PR_INVITE`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close shot, an older man's rough hands slowly fold an invitation card in half. No readable text. Camera: close on hands. Lighting: flat fluorescent community-hall light
```

### S2-08 · 2s · wide
- 동작: 문이 닫힌다. 해인은 보지 않는다
- 카메라: static wide
- 연속성: `CH_H31;LOC_HALL`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Wide shot from the back of the hall, the back door swings shut; on the distant stage Kim Hae-in at 31, same woman, hair tied back, grey surveyor vest over a white shirt keeps her eyes down. Camera: static wide. Lighting: flat fluorescent community-hall light
```

### S3-01 · 3s · medium
- 동작: 해인이 낡은 보고서를 넘긴다
- 카메라: static medium
- 연속성: `CH_H34;LOC_OFFICE`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Medium shot, Kim Hae-in, 34, Korean woman cave surveyor, hair tied back, dark green field jacket, calm guarded expression at a desk turning pages of an old bound survey report with blank pages. cool overcast window light, quiet office. Camera: static medium. Lighting: cool overcast window light, quiet office
```

### S3-02 · 4s · insert
- 동작: 보고서 한 줄(후반 합성 텍스트)
- 카메라: top-down insert
- 연속성: `LOC_OFFICE;TXT_01`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Top-down insert of an aged report page with a blank printed-form layout, a finger resting under an empty line. No readable text. Camera: top-down insert. Lighting: cool overcast window light, quiet office
```

### S3-03 · 4s · insert
- 동작: 명단 맨 아래에 이름을 쓴다(후반 합성)
- 카메라: close on pen hand
- 연속성: `CH_H34;TXT_02`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close shot of a woman's hand writing with a pen at the bottom of a blank participant list form. No readable text. Camera: close on pen hand. Lighting: cool overcast window light, quiet office
```

### S3-04 · 2s · insert
- 동작: 팀장이 말없이 서명한다
- 카메라: close on hand
- 연속성: `CH_LEAD;TXT_03`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close shot, an older man's hand signs the bottom of a blank form with a pen. No readable text. Camera: close on hand. Lighting: cool overcast window light, quiet office
```

### S3-05 · 3s · medium
- 동작: 서명이 마르기도 전에 종이를 집어 든다
- 카메라: static medium
- 연속성: `CH_H34;LOC_OFFICE`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Medium shot, Kim Hae-in, 34, Korean woman cave surveyor, hair tied back, dark green field jacket, calm guarded expression picks the sheet of paper off the desk at once and turns to leave. Camera: static medium. Lighting: cool overcast window light, quiet office
```

### S4-01 · 5s · detail
- 동작: 신발장 구석, 먼지 앉은 왼쪽 노란 장갑 한 짝
- 카메라: slow push-in
- 연속성: `PR_GLOVE_LEFT;LOC_HOUSE`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Detail shot, the corner of an old wooden shoe cabinet in a rural Korean house entrance, a single faded yellow left work glove lying alone, covered in dust. Camera: slow push-in. Lighting: dim interior, single window daylight, warm brown shadows
```

### S4-02 · 3s · medium
- 동작: 해인이 장갑을 보지 못하고 지나친다
- 카메라: static medium
- 연속성: `CH_H34;LOC_HOUSE`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Medium shot, Kim Hae-in, 34, Korean woman cave surveyor, hair tied back, dark green field jacket, calm guarded expression steps through a house entrance past an old shoe cabinet without looking at it. Camera: static medium. Lighting: dim interior, single window daylight, warm brown shadows
```

### S4-03 · 4s · insert
- 동작: 식탁 위 밥그릇 하나
- 카메라: static
- 연속성: `LOC_HOUSE`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Static shot of a small wooden dining table with a single rice bowl and one pair of chopsticks. dim interior, single window daylight, warm brown shadows. Camera: static. Lighting: dim interior, single window daylight, warm brown shadows
```

### S4-04 · 5s · insert
- 동작: 가족사진, 액자 모서리에 반으로 접힌 초청장
- 카메라: slow pan
- 연속성: `LOC_HOUSE;PR_PHOTO;PR_INVITE;CH_H14`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Slow pan across a wall: an old framed photo of a man in a hard hat carrying a little girl on his shoulders in front of a utility pole; a card folded in half tucked into the corner of the frame. No readable text. Camera: slow pan. Lighting: dim interior, single window daylight, warm brown shadows
```

### S4-05 · 3s · close-up
- 동작: 해인의 눈이 초청장에서 멈춘다
- 카메라: static close-up
- 연속성: `CH_H34;LOC_HOUSE`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close-up, Kim Hae-in, 34, Korean woman cave surveyor, hair tied back, dark green field jacket, calm guarded expression staring at something on the wall, a flicker of shame. Camera: static close-up. Lighting: dim interior, single window daylight, warm brown shadows
```

### S4-06 · 5s · medium
- 동작: 문이 열리고 동수가 딸을 보지 않은 채 말한다
- 카메라: static medium
- 연속성: `CH_D64;LOC_HOUSE`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Medium shot, a door opens and Kim Dong-su at 64, same man, grey cropped hair, weathered face, faded navy work jacket, old scratched white hard hat, avoids eye contact steps in, eyes lowered, says one short sentence without looking up. Camera: static medium. Lighting: dim interior, single window daylight, warm brown shadows
```

### S4-07 · 5s · medium
- 동작: 허가서를 식탁에 놓고 말한다
- 카메라: static medium
- 연속성: `CH_H34;LOC_HOUSE`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Medium shot, Kim Hae-in, 34, Korean woman cave surveyor, hair tied back, dark green field jacket, calm guarded expression places a sheet of paper on the dining table and says two quiet words. Camera: static medium. Lighting: dim interior, single window daylight, warm brown shadows
```

### S4-08 · 5s · medium
- 동작: 종이를 읽지 않고 벽의 안전모를 내려 먼지를 턴다
- 카메라: static medium
- 연속성: `CH_D64;PR_HELMET;LOC_HOUSE`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Medium shot, Kim Dong-su at 64, same man, grey cropped hair, weathered face, faded navy work jacket, old scratched white hard hat, avoids eye contact ignores the paper, takes an old white hard hat down from the wall and brushes the dust off with his palm. Camera: static medium. Lighting: dim interior, single window daylight, warm brown shadows
```

### S4-09 · 3s · two-shot
- 동작: 둘 다 그날 얘기를 하지 않는다
- 카메라: static wide two-shot
- 연속성: `CH_H34;CH_D64;LOC_HOUSE`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Wide two-shot in a dim rural kitchen, an old man holding a hard hat and his adult daughter standing apart, neither looking at the other. Camera: static wide two-shot. Lighting: dim interior, single window daylight, warm brown shadows
```

### S5-01 · 3s · wide
- 동작: 철문 앞 조사팀
- 카메라: static wide
- 연속성: `LOC_GATE;CH_LEAD;CH_H34;CH_D64`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Wide shot, a small survey team in helmets gathered at a locked iron gate set into a low concrete structure in a Jeju field. Camera: static wide. Lighting: overcast daylight, cold air
```

### S5-02 · 6s · close two-shot
- 동작: 헤드랜턴을 고정하다 손끝이 이마에 닿자 둘 다 멈춘다
- 카메라: close, static
- 연속성: `CH_H34;CH_D64;PR_HELMET;PR_LAMP`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close two-shot, Kim Hae-in, 34, Korean woman cave surveyor, hair tied back, dark green field jacket, calm guarded expression fixes a headlamp onto the old white hard hat worn by Kim Dong-su at 64, same man, grey cropped hair, weathered face, faded navy work jacket, old scratched white hard hat, avoids eye contact; her fingertip brushes his forehead and both freeze for a beat. Camera: close, static. Lighting: overcast daylight, cold air
```

### S5-03 · 4s · close-up
- 동작: 2005년과 같은 찬 바람
- 카메라: static close-up
- 연속성: `CH_D64;LOC_GATE`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close-up, Kim Dong-su at 64, same man, grey cropped hair, weathered face, faded navy work jacket, old scratched white hard hat, avoids eye contact facing a dark open gate, cold air moves his collar, a flicker of old fear. Camera: static close-up. Lighting: overcast daylight, cold air
```

### S5-04 · 5s · wide
- 동작: 동수가 마지막으로 내려간다
- 카메라: high angle from inside
- 연속성: `CH_D64;LOC_GATE;PR_HELMET`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. High-angle shot from inside a dark stairwell, Kim Dong-su at 64, same man, grey cropped hair, weathered face, faded navy work jacket, old scratched white hard hat, avoids eye contact is the last to descend metal stairs, daylight shrinking behind him. Camera: high angle from inside. Lighting: daylight above, darkness below
```

### S6-01 · 5s · wide
- 동작: 랜턴 빛이 어둠을 가른다
- 카메라: slow dolly forward
- 연속성: `LOC_CAVE;CH_H34;CH_D64;PR_LAMP`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Wide shot inside a lava tube, two figures with headlamps walk slowly, beams cutting the darkness. Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill. Camera: slow dolly forward. Lighting: Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill.
```

### S6-02 · 4s · detail
- 동작: 흰 탄산염 벽, 물방울
- 카메라: slow pan
- 연속성: `LOC_CAVE_WALL`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Detail shot, white carbonate deposits flowing over black lava rock, a water drop forming and falling. Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill. Camera: slow pan. Lighting: Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill.
```

### S6-03 · 4s · medium
- 동작: 동수가 저도 모르게 벽에 손을 뻗는다
- 카메라: side medium
- 연속성: `CH_D64;LOC_CAVE_WALL`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Side medium shot, Kim Dong-su at 64, same man, grey cropped hair, weathered face, faded navy work jacket, old scratched white hard hat, avoids eye contact slowly raises his bare hand toward a white cave wall, absorbed. Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill. Camera: side medium. Lighting: Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill.
```

### S6-04 · 4s · close
- 동작: '만지면 안 돼요.' 손이 벽 한 뼘 앞에서 멈춘다
- 카메라: close on hand and wall
- 연속성: `CH_D64;LOC_CAVE_WALL`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close shot, an old man's hand stops in mid-air a hand's width from a white mineral cave wall, fingers trembling slightly, never touching. Camera: close on hand and wall. Lighting: Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill.
```

### S6-05 · 4s · medium
- 동작: 거둔 손을 작업복에 문질러 닦는다
- 카메라: static medium
- 연속성: `CH_D64;LOC_CAVE_WALL`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Medium shot, Kim Dong-su at 64, same man, grey cropped hair, weathered face, faded navy work jacket, old scratched white hard hat, avoids eye contact lowers his hand without touching the wall and wipes his palm on his jacket as if it were dirty. Camera: static medium. Lighting: Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill.
```

### S6-06 · 3s · close-up
- 동작: 해인이 그 손을 본다
- 카메라: static close-up
- 연속성: `CH_H34`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close-up, Kim Hae-in, 34, Korean woman cave surveyor, hair tied back, dark green field jacket, calm guarded expression watching her father's hand, saying nothing. Camera: static close-up. Lighting: Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill.
```

### S7-01 · 6s · wide
- 동작: 검은 호수, 보트 위 부녀
- 카메라: static wide
- 연속성: `LOC_LAKE;CH_H34;CH_D64`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Wide shot, a small inflatable boat with two people crossing a black underground lake in a lava tube. Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill. Still black water mirroring the beams. Camera: static wide. Lighting: Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill. Still black water mirroring the beams.
```

### S7-02 · 4s · detail
- 동작: 주황빛 반사가 천장에 일렁인다
- 카메라: tilt up
- 연속성: `LOC_LAKE`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Tilt up from black water to a cave ceiling where rippling warm orange reflections move across the rock. Camera: tilt up. Lighting: Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill. Still black water mirroring the beams.
```

### S7-03 · 5s · detail
- 동작: 작고 창백한 물고기가 빛 가장자리를 스친다(종 묘사 PENDING)
- 카메라: top-down at surface
- 연속성: `LOC_LAKE`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Top-down shot through clear dark water, a tiny pale fish glides past the edge of a light beam and vanishes. Camera: top-down at surface. Lighting: Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill. Still black water mirroring the beams.
```

### S7-04 · 5s · close-up
- 동작: 동수 대사
- 카메라: static close-up
- 연속성: `CH_D64;LOC_LAKE`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close-up, Kim Dong-su at 64, same man, grey cropped hair, weathered face, faded navy work jacket, old scratched white hard hat, avoids eye contact looking down at the water, says a short hesitant question. Camera: static close-up. Lighting: Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill. Still black water mirroring the beams.
```

### S7-05 · 5s · close-up
- 동작: 해인 대사
- 카메라: static close-up
- 연속성: `CH_H34;LOC_LAKE`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close-up, Kim Hae-in, 34, Korean woman cave surveyor, hair tied back, dark green field jacket, calm guarded expression holding an oar, answers softly with one sentence, eyes on the water. Camera: static close-up. Lighting: Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill. Still black water mirroring the beams.
```

### S7-06 · 6s · close
- 동작: 동수가 노를 잡은 딸의 손을 본다
- 카메라: close on hands, tilt to his eyes
- 연속성: `CH_D64;CH_H34;LOC_LAKE`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close shot of a woman's hands gripping an oar, tilt up to an old man's eyes watching them, unable to speak. Camera: close on hands, tilt to his eyes. Lighting: Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill. Still black water mirroring the beams.
```

### S7-07 · 5s · wide
- 동작: 말없이 흘러가는 보트
- 카메라: slow drift
- 연속성: `LOC_LAKE;CH_H34;CH_D64`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Wide shot, the small boat drifts in silence, two headlamp beams apart, not facing each other. Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill. Still black water mirroring the beams. Camera: slow drift. Lighting: Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill. Still black water mirroring the beams.
```

### S8-01 · 4s · wide
- 동작: 랜턴 빛이 바위 틈의 노란색에 멈춘다
- 카메라: pan stops
- 연속성: `LOC_CREVICE;PR_GLOVE_AGED`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. A headlamp beam pans across black rock and stops on a small patch of faded yellow wedged in a crevice. Camera: pan stops. Lighting: Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill.
```

### S8-02 · 4s · detail
- 동작: 침전물 앉은 낡은 오른쪽 작업장갑
- 카메라: macro, static
- 연속성: `PR_GLOVE_AGED;LOC_CREVICE`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Macro shot, a single old yellow right work glove lodged in a rock crevice, stiff and faded, thin white mineral crust on its surface. Camera: macro, static. Lighting: Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill.
```

### S8-03 · 3s · close-up
- 동작: 동수가 얼어붙는다
- 카메라: static close-up
- 연속성: `CH_D64`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close-up, Kim Dong-su at 64, same man, grey cropped hair, weathered face, faded navy work jacket, old scratched white hard hat, avoids eye contact frozen, lips parted, headlamp light trembling. Camera: static close-up. Lighting: Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill.
```

### S8-04 · 3s · medium
- 동작: 해인이 처음으로 환해지며 사진을 찍는다
- 카메라: static medium
- 연속성: `CH_H34;LOC_CREVICE`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Medium shot, Kim Hae-in, 34, Korean woman cave surveyor, hair tied back, dark green field jacket, calm guarded expression brightens for the first time and photographs the crevice with a small camera. Camera: static medium. Lighting: Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill.
```

### S8-05 · 5s · close-up
- 동작: 해인 대사
- 카메라: static close-up
- 연속성: `CH_H34`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close-up, Kim Hae-in, 34, Korean woman cave surveyor, hair tied back, dark green field jacket, calm guarded expression speaks eagerly, two short hopeful sentences, almost smiling. Camera: static close-up. Lighting: Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill.
```

### S8-06 · 3s · close-up
- 동작: '넣지 마라.'
- 카메라: static close-up
- 연속성: `CH_D64`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close-up, Kim Dong-su at 64, same man, grey cropped hair, weathered face, faded navy work jacket, old scratched white hard hat, avoids eye contact still staring ahead, says two quiet firm words. Camera: static close-up. Lighting: Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill.
```

### S8-07 · 2s · close-up
- 동작: 해인이 돌아본다
- 카메라: static close-up
- 연속성: `CH_H34`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close-up, Kim Hae-in, 34, Korean woman cave surveyor, hair tied back, dark green field jacket, calm guarded expression turns her head sharply, the smile gone. Camera: static close-up. Lighting: Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill.
```

### S8-08 · 4s · flashback wide
- 동작: 2005년: 합판을 끌어다 구멍을 덮는다
- 카메라: static wide
- 연속성: `CH_D44;LOC_FIELD`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Wide shot in heavy rain, Kim Dong-su at 44, lean Korean electrical line worker, short black hair, rain-soaked navy work jacket, white hard hat drags a sheet of plywood over a hole in the ground beside a utility pole, hurried and furtive. Camera: static wide. Lighting: grey overcast rain, flat daylight
```

### S8-09 · 4s · flashback medium
- 동작: 흙을 퍼 올리고, 장갑 없는 오른손으로 삽을 쥔 채 걸어 나간다
- 카메라: static, he exits frame
- 연속성: `CH_D44;LOC_FIELD;PR_GLOVE_NEW`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Medium shot in rain, Kim Dong-su at 44, lean Korean electrical line worker, short black hair, rain-soaked navy work jacket, white hard hat shovels wet soil onto a plywood sheet, glances around, then walks away gripping the shovel in his bare right hand, a yellow glove on the left only, never looking back. Camera: static, he exits frame. Lighting: grey overcast rain, flat daylight
```

### S8-10 · 4s · close-up
- 동작: '덮었다. 잘릴까 봐.'
- 카메라: static close-up
- 연속성: `CH_D64`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close-up, Kim Dong-su at 64, same man, grey cropped hair, weathered face, faded navy work jacket, old scratched white hard hat, avoids eye contact eyes fixed on the crevice, says two short broken sentences. Camera: static close-up. Lighting: Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill.
```

### S8-11 · 5s · close-up
- 동작: '내가 찾았다고… 끝내 말 못 했다.'
- 카메라: very slow push-in
- 연속성: `CH_D64`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close-up, Kim Dong-su at 64, same man, grey cropped hair, weathered face, faded navy work jacket, old scratched white hard hat, avoids eye contact speaks slowly with a long pause in the middle, voice almost gone. Camera: very slow push-in. Lighting: Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill.
```

### S8-12 · 3s · close-up
- 동작: 해인의 얼굴: 믿어온 이야기가 무너진다
- 카메라: static close-up
- 연속성: `CH_H34`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close-up, Kim Hae-in, 34, Korean woman cave surveyor, hair tied back, dark green field jacket, calm guarded expression stunned, certainty draining from her face. Camera: static close-up. Lighting: Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill.
```

### S8-13 · 4s · close
- 동작: 손에 든 카메라가 천천히 내려간다
- 카메라: close on hands
- 연속성: `CH_H34`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close shot, a woman's hands holding a small camera slowly lower it to her side. Camera: close on hands. Lighting: Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill.
```

### S9-01 · 4s · wide
- 동작: 돌아오는 보트, 해인이 노를 멈춘다
- 카메라: static wide
- 연속성: `LOC_LAKE;CH_H34;CH_D64`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Wide shot, the boat in the middle of the black lake, Kim Hae-in, 34, Korean woman cave surveyor, hair tied back, dark green field jacket, calm guarded expression stops rowing and lets the oars rest. Camera: static wide. Lighting: Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill. Still black water mirroring the beams.
```

### S9-02 · 3s · close-up
- 동작: 해인이 말없이 자기 랜턴을 끈다
- 카메라: static close-up
- 연속성: `CH_H34;PR_LAMP`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close-up, Kim Hae-in, 34, Korean woman cave surveyor, hair tied back, dark green field jacket, calm guarded expression reaches up and switches off her headlamp; her face drops into shadow. Camera: static close-up. Lighting: Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill. Still black water mirroring the beams.
```

### S9-03 · 4s · close-up
- 동작: 동수가 딸을 보다가 자기 랜턴도 끈다
- 카메라: static close-up
- 연속성: `CH_D64;PR_LAMP`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close-up, Kim Dong-su at 64, same man, grey cropped hair, weathered face, faded navy work jacket, old scratched white hard hat, avoids eye contact looks toward his daughter for a moment, then switches off his own headlamp; the frame falls to black. Camera: static close-up. Lighting: Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill. Still black water mirroring the beams.
```

### S9-05 · 6s · silhouette wide
- 동작: 희미한 어깨선. 해인: '그날, 뒷문에 계신 거 봤어요.'
- 카메라: static wide
- 연속성: `CH_H34;CH_D64;LOC_LAKE`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Static wide shot. Near-total darkness; one tiny distant warm light far across black water gives only a faint rim on two seated silhouettes in a small boat; shoulders and heads barely visible, no faces, no hands visible. Both figures completely still. Camera: static wide. Lighting: distant single light, rim only
```

### S9-06 · 6s · silhouette wide
- 동작: 해인: '보고도… 모른다고 했어요.'
- 카메라: static wide, same frame
- 연속성: `CH_H34;CH_D64;LOC_LAKE`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Static wide shot. Near-total darkness; one tiny distant warm light far across black water gives only a faint rim on two seated silhouettes in a small boat; shoulders and heads barely visible, no faces, no hands visible. The smaller figure's head lowers slightly. Camera: static wide, same frame. Lighting: distant single light, rim only
```

### S9-07 · 6s · silhouette wide
- 동작: 동수: '내가 안 갔어야 했다.' 해인: '아니요.'
- 카메라: static wide, same frame
- 연속성: `CH_H34;CH_D64;LOC_LAKE`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Static wide shot. Near-total darkness; one tiny distant warm light far across black water gives only a faint rim on two seated silhouettes in a small boat; shoulders and heads barely visible, no faces, no hands visible. The larger figure's shoulders sink. Camera: static wide, same frame. Lighting: distant single light, rim only
```

### S9-08 · 2s · silhouette wide
- 동작: 실루엣 하나가 조금 기운다
- 카메라: static wide, same frame
- 연속성: `CH_H34;CH_D64;LOC_LAKE`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Static wide shot. Near-total darkness; one tiny distant warm light far across black water gives only a faint rim on two seated silhouettes in a small boat; shoulders and heads barely visible, no faces, no hands visible. One silhouette leans a little toward the other. Camera: static wide, same frame. Lighting: distant single light, rim only
```

### S9-09 · 6s · close
- 동작: 랜턴이 켜지면 해인의 손이 동수의 손 위에 있다
- 카메라: close on hands
- 연속성: `CH_H34;CH_D64;LOC_LAKE`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close shot, a headlamp clicks on and warm light reveals a woman's hand already resting on top of an old man's weathered hand on the boat's edge; the hands stay still. Camera: close on hands. Lighting: Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill. Still black water mirroring the beams.
```

### S9-10 · 3s · two-shot
- 동작: 서로 보지 않지만 손은 그대로
- 카메라: static two-shot
- 연속성: `CH_H34;CH_D64;LOC_LAKE`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Two-shot in the boat, father and daughter look in different directions, their hands still joined between them. Camera: static two-shot. Lighting: Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill. Still black water mirroring the beams.
```

### S10-01 · 3s · wide
- 동작: 저녁빛, 팀장이 봉투와 조사표를 들고 있다
- 카메라: static wide
- 연속성: `LOC_GATE;CH_LEAD;CH_H34;CH_D64;PR_BAG`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Wide shot outside the iron gate, survey team leader, Korean man in his 50s, glasses, grey field vest holding a clipboard and a clear sample bag with an old yellow glove, facing a woman and an old man. low golden evening light, long shadows. Camera: static wide. Lighting: low golden evening light, long shadows
```

### S10-02 · 2s · insert
- 동작: 펜이 조사표의 빈칸을 가리킨다
- 카메라: close on clipboard
- 연속성: `CH_LEAD;TXT_04`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close shot, a pen tip points at an empty line on a blank field form on a clipboard. No readable text. Camera: close on clipboard. Lighting: low golden evening light, long shadows
```

### S10-03 · 3s · close-up
- 동작: '비워 두세요.'
- 카메라: static close-up
- 연속성: `CH_H34`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close-up, Kim Hae-in, 34, Korean woman cave surveyor, hair tied back, dark green field jacket, calm guarded expression says one calm short sentence. Camera: static close-up. Lighting: low golden evening light, long shadows
```

### S10-04 · 4s · medium
- 동작: 팀장이 끄덕이고 동수를 보며 묻는다
- 카메라: static medium
- 연속성: `CH_LEAD`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Medium shot, survey team leader, Korean man in his 50s, glasses, grey field vest nods, then glances past her toward the old man and begins a hesitant question. Camera: static medium. Lighting: low golden evening light, long shadows
```

### S10-05 · 3s · close-up
- 동작: '제 아버지예요.'
- 카메라: static close-up
- 연속성: `CH_H34`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close-up, Kim Hae-in, 34, Korean woman cave surveyor, hair tied back, dark green field jacket, calm guarded expression answers plainly and clearly, one short sentence, chin up. Camera: static close-up. Lighting: low golden evening light, long shadows
```

### S10-06 · 3s · close-up
- 동작: 동수가 딸을 본다
- 카메라: static close-up
- 연속성: `CH_D64`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close-up, Kim Dong-su at 64, same man, grey cropped hair, weathered face, faded navy work jacket, old scratched white hard hat, avoids eye contact looks at his daughter, eyes wet, very still. Camera: static close-up. Lighting: low golden evening light, long shadows
```

### S10-07 · 4s · close
- 동작: 팀장이 봉투를 내밀고 동수가 두 손으로 받는다
- 카메라: close on hands
- 연속성: `CH_LEAD;CH_D64;PR_BAG;PR_GLOVE_AGED`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close shot, a clear sample bag holding an old yellow glove is handed over; an old man's two weathered hands receive it carefully. Camera: close on hands. Lighting: low golden evening light, long shadows
```

### S10-08 · 3s · medium from behind
- 동작: 전신주 아래, 해인의 뒷모습 대사
- 카메라: static, from behind
- 연속성: `CH_H34;LOC_POLE`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Medium shot from behind, a woman in a dark green field jacket stands under a weathered utility pole with humming wires, Jeju field at dusk. low golden evening light, long shadows. Camera: static, from behind. Lighting: low golden evening light, long shadows
```

### S10-09 · 3s · close-up
- 동작: 동수가 딸의 눈을 피하지 않는다
- 카메라: static close-up
- 연속성: `CH_D64`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close-up, Kim Dong-su at 64, same man, grey cropped hair, weathered face, faded navy work jacket, old scratched white hard hat, avoids eye contact turns and holds eye contact without looking away, the faintest softening. Camera: static close-up. Lighting: low golden evening light, long shadows
```

### S11-01 · 7s · detail
- 동작: 신발장: 왼쪽 장갑 옆에 오른쪽 장갑을 내려놓는다. 한 켤레
- 카메라: static detail
- 연속성: `CH_D64;PR_GLOVE_LEFT;PR_GLOVE_AGED;LOC_HOUSE`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Detail shot on an old wooden shoe cabinet, an old man's hand places a mineral-crusted yellow right work glove next to a dusty faded yellow left work glove; the two lie side by side as a pair. Camera: static detail. Lighting: dim interior, single window daylight, warm brown shadows
```

### S11-02 · 7s · detail
- 동작: 식탁, 밥그릇 둘. 김이 오른다. 사람은 없다
- 카메라: static, slow fade out
- 연속성: `LOC_HOUSE`
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Static shot of a small wooden dining table with two steaming rice bowls and two pairs of chopsticks, no people in frame. dim interior, single window daylight, warm brown shadows. Camera: static, slow fade out. Lighting: dim interior, single window daylight, warm brown shadows
```
