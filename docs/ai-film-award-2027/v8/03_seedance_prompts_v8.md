# 《입구》 v8 — Seedance 프롬프트 (제작용)

> `tools/gen_v8.py`가 생성. 화면 비율 16:9, 1080p. 샷마다 '첨부'에 적힌 시트를 참고 이미지로 넣고 프롬프트를 그대로 붙여넣는다.
> 글자(문서·도장·자막·타이틀)는 생성하지 않고 편집에서 합성한다. 생성할 때마다 날짜·계정·모델 버전·프롬프트·결과 파일명을 기록한다(약관 5.5).

## 공통 부정 프롬프트
```
text, letters, subtitles, watermark, logo, extra fingers, fused hands, deformed face, face drift, age change, costume change, cartoon, anime, oversaturated, tourist-brochure look, lens flare spam, banners, posters, signs, printed letters on props, audience behind the speaker, hand touching cave wall, black bars
```

## Veo 테스트에서 얻은 규칙
- '닿지 않는다'는 부정문 대신 손과 벽 사이의 **보이는 간격**을 묘사한다.
- 글자 금지는 현수막·포스터·간판까지 직접 적는다.
- 물건이 떨어질 때는 누가 놓는지까지 적는다.
- 빈 장갑은 '납작하게 누운, 비어 있는'이라고 적는다.
- 실루엣은 두 사람 사이를 비우고 팔이 가운데로 나오지 않게 적는다.

## 샷별 프롬프트

### S1-01 · 편집 5초 · 생성 6초 · dream wide
- 내용: 꿈: 온통 흰 벽, 아이의 숨소리
- 첨부: 없음
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Dreamlike shot, a vast snow-white mineral cave wall filling the frame, soft glowing haze, shallow focus drifting slowly, quiet and unreal. Camera: slow drift, soft focus. Lighting: soft white glow, no visible source
```

### S1-02 · 편집 6초 · 생성 7초 · dream close
- 내용: 너무 큰 노란 장갑을 낀 작은 손이 흰 쪽으로 뻗는다. 화면 밖 '해인아!'
- 첨부: 해인 7세(신규), 장갑: 새것
- 대사(한국어 음성): 동수(화면 밖): 해인아!
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Dreamlike close shot, a small child's hand wearing a far too large bright yellow rubber-coated work glove reaches slowly toward a glowing white wall, soft haze, shallow focus; the hand stops and the image begins to fade. Camera: close on small hand, soft focus. Lighting: soft white glow
```

### S2-01 · 편집 5초 · 생성 6초 · wide
- 내용: 비 오는 밭, 돌담 옆 전신주 공사
- 첨부: 동수 44세, 장갑: 새것
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Wide shot, rainy Jeju farmland with black basalt stone walls, a utility pole being installed, Kim Dong-su at 44, lean Korean electrical line worker, short black hair, rain-soaked navy work jacket, white hard hat standing beside a dug hole. grey overcast rain, flat daylight. Camera: static wide. Lighting: grey overcast rain, flat daylight
```

### S2-02 · 편집 4초 · 생성 5초 · close
- 내용: 흙이 꺼지고 찬 바람이 올라온다
- 첨부: 없음
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close shot of wet soil at the bottom of a dug hole suddenly collapsing inward, revealing darkness, cold mist rising from below. Camera: locked close, slight shake. Lighting: grey overcast rain, flat daylight
```

### S2-03 · 편집 4초 · 생성 5초 · close
- 내용: 구멍: 바닥 없는 검은 허공, 찬 김
- 첨부: 없음
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close shot in rain of a narrow ragged break in muddy ground that opens into a vast black void below, like the roof of a cave; only pure darkness inside, no bottom, no soil walls, no roots; faint cold mist rising. Camera: locked close. Lighting: grey overcast rain, flat daylight
```

### S2-04 · 편집 3초 · 생성 4초 · close
- 내용: 구멍 가장자리로 다급하게 뻗어 버티는 어른의 팔
- 첨부: 동수 44세
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close shot in rain, a man's forearm in a rain-soaked navy sleeve thrust down over the muddy edge of a hole, straining hard, his grip hidden below the frame edge; nothing below the edge is shown. Camera: close on forearm. Lighting: grey overcast rain, flat daylight
```

### S2-05 · 편집 4초 · 생성 5초 · top-down
- 내용: 노란 장갑 한 짝이 어둠으로 떨어진다
- 첨부: 장갑: 새것
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Top-down shot into a black void, a single clean bright yellow rubber-coated work glove tumbling down away from camera, shrinking until the darkness swallows it. Camera: top-down into the hole. Lighting: weak daylight from above
```

### S2-06 · 편집 5초 · 생성 6초 · close-up
- 내용: 동수 얼굴: 공포, 거친 숨. 화면 아래의 무언가를 끌어안고 있다. 타이틀 합성
- 첨부: 동수 44세
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close-up, Kim Dong-su at 44, lean Korean electrical line worker, short black hair, rain-soaked navy work jacket, white hard hat, rain on his face, breathing hard, terrified, looking down at something he clutches against his chest just below the frame; the frame never shows what he holds. Camera: static close-up. Lighting: grey overcast rain, flat daylight
```

### S2-07 · 편집 5초 · 생성 6초 · wide from behind
- 내용: 빗속에 웅크린 동수의 뒷모습. 주위엔 아무도 없다
- 첨부: 동수 44세
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Wide shot from behind, Kim Dong-su at 44, lean Korean electrical line worker, short black hair, rain-soaked navy work jacket, white hard hat kneeling hunched over beside a hole and a utility pole in an empty rainy field, his body hiding whatever he holds; he glances over his shoulder; nobody else around. Camera: static wide from behind. Lighting: grey overcast rain, flat daylight
```

### S3-01 · 편집 4초 · 생성 5초 · wide
- 내용: 마을 회관 무대, 동굴 사진 앞의 해인
- 첨부: 해인(행사장, 조끼)
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Wide shot of a small community hall, residents on folding chairs seen from behind, Kim Hae-in at 31, same woman, hair tied back, grey surveyor vest over a white shirt standing on a low stage before a projected photo of a dark cave interior. flat fluorescent community-hall light. Camera: static wide. Lighting: flat fluorescent community-hall light
```

### S3-02 · 편집 4초 · 생성 5초 · medium
- 내용: 뒷문이 열리고 양복 재킷의 동수가 초청장을 쥐고 벽에 붙어 선다
- 첨부: 동수 61세 양복
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Medium shot, a back door opens quietly and Kim Dong-su at 61, same man, grey cropped hair, wearing his one ill-fitting dark suit jacket over a work shirt slips in holding a folded invitation card, standing against the wall. Camera: static medium. Lighting: flat fluorescent community-hall light
```

### S3-03 · 편집 4초 · 생성 5초 · medium
- 내용: 화면 밖 질문을 듣는 해인
- 첨부: 해인(행사장, 조끼)
- 대사(한국어 음성): 주민(화면 밖): 발견한 인부가 아버님이라던데요.
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Medium shot, Kim Hae-in at 31, same woman, hair tied back, grey surveyor vest over a white shirt on stage listening to a question from the audience, her expression tightening; she does not speak. Behind her is only a plain wall with a dim projected photo of a dark cave; no audience visible behind her, no banners, no signs, no posters. Camera: static medium. Lighting: flat fluorescent community-hall light
```

### S3-04 · 편집 3초 · 생성 4초 · close-up
- 내용: 해인의 눈이 뒷문의 아버지와 마주친다
- 첨부: 해인(행사장, 조끼)
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close-up, Kim Hae-in at 31, same woman, hair tied back, grey surveyor vest over a white shirt looks past the camera toward the back of the room and goes very still, without widening her eyes. Behind her is only a plain wall with a dim projected photo of a dark cave; no audience visible behind her, no banners, no signs, no posters. Camera: static close-up. Lighting: flat fluorescent community-hall light
```

### S3-05 · 편집 3초 · 생성 4초 · close-up
- 내용: 동수가 아주 작게 고개를 끄덕인다
- 첨부: 동수 61세 양복
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close-up, Kim Dong-su at 61, same man, grey cropped hair, wearing his one ill-fitting dark suit jacket over a work shirt gives a very small reassuring nod, as if to say it is all right. Camera: static close-up. Lighting: flat fluorescent community-hall light
```

### S3-06 · 편집 3초 · 생성 4초 · close-up
- 내용: 해인 대사
- 첨부: 해인(행사장, 조끼)
- 대사(한국어 음성): 해인: …모르는 분입니다.
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close-up, Kim Hae-in at 31, same woman, hair tied back, grey surveyor vest over a white shirt lowers her eyes and says one short flat sentence, face controlled, almost blank. Behind her is only a plain wall with a dim projected photo of a dark cave; no audience visible behind her, no banners, no signs, no posters. Camera: static close-up. Lighting: flat fluorescent community-hall light
```

### S3-07 · 편집 3초 · 생성 4초 · close
- 내용: 초청장을 반으로 접는다
- 첨부: 동수 61세 양복
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close shot, an older man's rough hands slowly fold an invitation card in half. No readable text. Camera: close on hands. Lighting: flat fluorescent community-hall light
```

### S3-08 · 편집 2초 · 생성 4초 · wide
- 내용: 문이 닫힌다. 해인은 보지 않는다
- 첨부: 해인(행사장, 조끼)
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Wide shot from the back of the hall, the back door swings shut; on the distant stage Kim Hae-in at 31, same woman, hair tied back, grey surveyor vest over a white shirt keeps her eyes down. Camera: static wide. Lighting: flat fluorescent community-hall light
```

### S4-01 · 편집 3초 · 생성 4초 · medium
- 내용: 해인이 낡은 보고서를 넘긴다
- 첨부: 해인(현재, 녹색 재킷)
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Medium shot, Kim Hae-in, 34, Korean woman cave surveyor, hair tied back, dark green field jacket, calm guarded expression at a desk turning pages of an old bound survey report with blank pages. cool overcast window light, quiet office. Camera: static medium. Lighting: cool overcast window light, quiet office
```

### S4-02 · 편집 4초 · 생성 5초 · insert
- 내용: 보고서 한 줄(후반 합성 텍스트)
- 첨부: 없음
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Top-down insert of an aged report page with a blank printed-form layout, a finger resting under an empty line. No readable text. Camera: top-down insert. Lighting: cool overcast window light, quiet office
```

### S4-03 · 편집 4초 · 생성 5초 · insert
- 내용: 보고서 표지의 붉은 도장(후반 합성 텍스트)
- 첨부: 없음
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Top-down insert of a worn grey report cover on a desk with a blank rectangular area where a stamp will be composited. No readable text. Camera: top-down insert. Lighting: cool overcast window light
```

### S4-04 · 편집 4초 · 생성 5초 · insert
- 내용: 명단 맨 아래에 이름을 쓴다(후반 합성)
- 첨부: 해인(현재, 녹색 재킷)
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close shot of a woman's hand writing with a pen at the bottom of a blank participant list form. No readable text. Camera: close on pen hand. Lighting: cool overcast window light, quiet office
```

### S4-05 · 편집 3초 · 생성 4초 · insert
- 내용: 팀장이 말없이 서명한다
- 첨부: 팀장
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close shot, an older man's hand signs the bottom of a blank form with a pen. No readable text. Camera: close on hand. Lighting: cool overcast window light, quiet office
```

### S5-01 · 편집 5초 · 생성 6초 · detail
- 내용: 신발장 구석, 먼지 앉은 왼쪽 노란 장갑 한 짝
- 첨부: 장갑: 먼지 앉은 왼쪽
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Detail shot, the corner of an old wooden shoe cabinet in a rural Korean house entrance, a single faded yellow left work glove lying alone, covered in dust. Camera: slow push-in. Lighting: dim interior, single window daylight, warm brown shadows
```

### S5-02 · 편집 3초 · 생성 4초 · medium
- 내용: 해인이 장갑을 보지 못하고 지나친다
- 첨부: 해인(현재, 녹색 재킷)
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Medium shot, Kim Hae-in, 34, Korean woman cave surveyor, hair tied back, dark green field jacket, calm guarded expression steps through a house entrance past an old shoe cabinet without looking at it. Camera: static medium. Lighting: dim interior, single window daylight, warm brown shadows
```

### S5-03 · 편집 4초 · 생성 5초 · insert
- 내용: 식탁 위 밥그릇 하나
- 첨부: 없음
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Static shot of a small wooden dining table with a single rice bowl and one pair of chopsticks. dim interior, single window daylight, warm brown shadows. Camera: static. Lighting: dim interior, single window daylight, warm brown shadows
```

### S5-04 · 편집 5초 · 생성 6초 · insert
- 내용: 가족사진, 액자 모서리에 반으로 접힌 초청장
- 첨부: 없음
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Slow pan across a wall: an old framed photo of a man in a hard hat carrying a little girl on his shoulders in front of a utility pole; a card folded in half tucked into the corner of the frame. No readable text. Camera: slow pan. Lighting: dim interior, single window daylight, warm brown shadows
```

### S5-05 · 편집 3초 · 생성 4초 · close-up
- 내용: 해인의 눈이 초청장에서 멈춘다
- 첨부: 해인(현재, 녹색 재킷)
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close-up, Kim Hae-in, 34, Korean woman cave surveyor, hair tied back, dark green field jacket, calm guarded expression staring at something on the wall, a flicker of shame. Camera: static close-up. Lighting: dim interior, single window daylight, warm brown shadows
```

### S5-06 · 편집 5초 · 생성 6초 · medium
- 내용: 문이 열리고 동수가 딸을 보지 않은 채 말한다
- 첨부: 동수 64세
- 대사(한국어 음성): 동수: 3년 만이구나.
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Medium shot, a door opens and Kim Dong-su at 64, same man, grey cropped hair, weathered face, faded navy work jacket, old scratched white hard hat, avoids eye contact steps in, eyes lowered, says one short sentence without looking up. Camera: static medium. Lighting: dim interior, single window daylight, warm brown shadows
```

### S5-07 · 편집 6초 · 생성 7초 · medium
- 내용: 허가서를 식탁에 놓고 말한다
- 첨부: 해인(현재, 녹색 재킷)
- 대사(한국어 음성): 해인: 내일이면 영영 닫혀요. 같이 가요.
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Medium shot, Kim Hae-in, 34, Korean woman cave surveyor, hair tied back, dark green field jacket, calm guarded expression places a sheet of paper on the dining table and says two short quiet sentences. Camera: static medium. Lighting: dim interior, single window daylight, warm brown shadows
```

### S5-08 · 편집 5초 · 생성 6초 · medium
- 내용: 종이를 읽지 않고 벽의 안전모를 내려 먼지를 턴다
- 첨부: 동수 64세, 안전모
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Medium shot, Kim Dong-su at 64, same man, grey cropped hair, weathered face, faded navy work jacket, old scratched white hard hat, avoids eye contact ignores the paper, takes an old white hard hat down from the wall and brushes the dust off with his palm. Camera: static medium. Lighting: dim interior, single window daylight, warm brown shadows
```

### S5-09 · 편집 2초 · 생성 4초 · two-shot
- 내용: 둘 다 그날 얘기를 하지 않는다
- 첨부: 해인(현재, 녹색 재킷), 동수 64세
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Wide two-shot in a dim rural kitchen, an old man holding a hard hat and his adult daughter standing apart, neither looking at the other. Camera: static wide two-shot. Lighting: dim interior, single window daylight, warm brown shadows
```

### S6-01 · 편집 3초 · 생성 4초 · wide
- 내용: 철문 앞 조사팀
- 첨부: 팀장, 해인(현재, 녹색 재킷), 동수 64세
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Wide shot, a small survey team in helmets gathered at a locked iron gate set into a low concrete structure in a Jeju field. Camera: static wide. Lighting: overcast daylight, cold air
```

### S6-02 · 편집 6초 · 생성 7초 · close two-shot
- 내용: 헤드랜턴을 고정하다 손끝이 이마에 닿자 둘 다 멈춘다
- 첨부: 해인(현재, 녹색 재킷), 동수 64세, 안전모, 안전모+헤드랜턴
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close two-shot, Kim Hae-in, 34, Korean woman cave surveyor, hair tied back, dark green field jacket, calm guarded expression fixes a headlamp onto the old white hard hat worn by Kim Dong-su at 64, same man, grey cropped hair, weathered face, faded navy work jacket, old scratched white hard hat, avoids eye contact; her fingertip brushes his forehead and both freeze for a beat. Camera: close, static. Lighting: overcast daylight, cold air
```

### S6-03 · 편집 4초 · 생성 5초 · close-up
- 내용: 2005년과 같은 찬 바람
- 첨부: 동수 64세
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close-up, Kim Dong-su at 64, same man, grey cropped hair, weathered face, faded navy work jacket, old scratched white hard hat, avoids eye contact facing a dark open gate, cold air moves his collar, a flicker of old fear. Camera: static close-up. Lighting: overcast daylight, cold air
```

### S6-04 · 편집 5초 · 생성 6초 · wide
- 내용: 동수가 마지막으로 내려간다
- 첨부: 동수 64세, 안전모
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. High-angle shot from inside a dark stairwell, Kim Dong-su at 64, same man, grey cropped hair, weathered face, faded navy work jacket, old scratched white hard hat, avoids eye contact is the last to descend metal stairs, daylight shrinking behind him. Camera: high angle from inside. Lighting: daylight above, darkness below
```

### S7-01 · 편집 5초 · 생성 6초 · wide
- 내용: 랜턴 빛이 어둠을 가른다
- 첨부: 해인(현재, 녹색 재킷), 동수 64세, 안전모+헤드랜턴
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Wide shot inside a lava tube, two figures with headlamps walk slowly, beams cutting the darkness. Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill. Camera: slow dolly forward. Lighting: Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill.
```

### S7-02 · 편집 3초 · 생성 4초 · detail
- 내용: 흰 탄산염 벽, 물방울
- 첨부: 없음
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Detail shot, white carbonate deposits flowing over black lava rock, a water drop forming and falling. Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill. Camera: slow pan. Lighting: Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill.
```

### S7-03 · 편집 7초 · 생성 8초 · side-on medium close
- 내용: 옆얼굴의 동수가 벽에 손을 뻗다 한 뼘 앞에서 멈추고 거둔다. 화면 밖 '만지면 안 돼요.'
- 첨부: 동수 64세, 안전모, 안전모+헤드랜턴
- 대사(한국어 음성): 해인: 만지면 안 돼요.
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Side-on medium close shot: Kim Dong-su at 64, same man, grey cropped hair, weathered face, faded navy work jacket, old scratched white hard hat, avoids eye contact in profile on the left, wearing an old yellowed white hard hat with a small black headlamp glowing warm orange, no letters on the strap. A white mineral cave wall on the right, also side-on, so the dark air between his fingertips and the wall is clearly visible as a gap. He raises his bare hand toward the wall, absorbed; the hand stops a hand's width short and holds; the gap stays visible the whole time and the fingertips never make contact. Then he slowly lowers the hand and looks down. Camera: static side-on. Lighting: Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill.
```

### S7-04 · 편집 3초 · 생성 4초 · medium
- 내용: 거둔 손을 작업복에 문질러 닦는다
- 첨부: 동수 64세
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Medium shot, Kim Dong-su at 64, same man, grey cropped hair, weathered face, faded navy work jacket, old scratched white hard hat, avoids eye contact lowers his hand without touching the wall and wipes his palm on his jacket as if it were dirty. Camera: static medium. Lighting: Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill.
```

### S7-05 · 편집 3초 · 생성 4초 · close-up
- 내용: 이번엔 해인이 벽을 너무 오래 본다
- 첨부: 해인(현재, 녹색 재킷)
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close-up, Kim Hae-in, 34, Korean woman cave surveyor, hair tied back, dark green field jacket, calm guarded expression in a helmet with a headlamp, staring at a white cave wall off-screen for too long, a flicker of recognition and unease. Camera: slow push-in. Lighting: Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill.
```

### S7-06 · 편집 4초 · 생성 5초 · close-up
- 내용: 해인 대사: 꿈에서 본 것 같다
- 첨부: 해인(현재, 녹색 재킷)
- 대사(한국어 음성): 해인: …여기, 꿈에서 본 것 같아요.
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close-up, Kim Hae-in, 34, Korean woman cave surveyor, hair tied back, dark green field jacket, calm guarded expression still looking at the wall, says one hesitant sentence almost to herself. Camera: static close-up. Lighting: Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill.
```

### S7-07 · 편집 3초 · 생성 4초 · close-up
- 내용: 동수가 딸을 돌아본다. 입을 열었다가 닫는다
- 첨부: 동수 64세
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close-up, Kim Dong-su at 64, same man, grey cropped hair, weathered face, faded navy work jacket, old scratched white hard hat, avoids eye contact turns his head toward his daughter, opens his mouth to speak, then closes it and looks away. Camera: static close-up. Lighting: Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill.
```

### S8-01 · 편집 6초 · 생성 7초 · wide
- 내용: 검은 호수, 보트 위 부녀
- 첨부: 해인(현재, 녹색 재킷), 동수 64세
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Wide shot, a small inflatable boat with two people crossing a black underground lake in a lava tube. Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill. Still black water mirroring the beams. Camera: static wide. Lighting: Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill. Still black water mirroring the beams.
```

### S8-02 · 편집 4초 · 생성 5초 · detail
- 내용: 주황빛 반사가 천장에 일렁인다
- 첨부: 없음
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Tilt up from black water to a cave ceiling where rippling warm orange reflections move across the rock. Camera: tilt up. Lighting: Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill. Still black water mirroring the beams.
```

### S8-03 · 편집 5초 · 생성 6초 · detail
- 내용: 작고 창백한 물고기가 빛 가장자리를 스친다(종 묘사 PENDING)
- 첨부: 없음
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Top-down shot through clear dark water, a tiny pale fish glides past the edge of a light beam and vanishes. Camera: top-down at surface. Lighting: Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill. Still black water mirroring the beams.
```

### S8-04 · 편집 5초 · 생성 6초 · close-up
- 내용: 동수 대사
- 첨부: 동수 64세
- 대사(한국어 음성): 동수: 눈이… 없는 건가?
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close-up, Kim Dong-su at 64, same man, grey cropped hair, weathered face, faded navy work jacket, old scratched white hard hat, avoids eye contact looking down at the water, says a short hesitant question. Camera: static close-up. Lighting: Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill. Still black water mirroring the beams.
```

### S8-05 · 편집 5초 · 생성 6초 · close-up
- 내용: 해인 대사
- 첨부: 해인(현재, 녹색 재킷)
- 대사(한국어 음성): 해인: 여기선 다른 걸로 길을 찾겠죠.
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close-up, Kim Hae-in, 34, Korean woman cave surveyor, hair tied back, dark green field jacket, calm guarded expression holding an oar, answers softly with one sentence, eyes on the water. Camera: static close-up. Lighting: Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill. Still black water mirroring the beams.
```

### S8-06 · 편집 5초 · 생성 6초 · close
- 내용: 동수가 노를 잡은 딸의 오른손을 본다
- 첨부: 동수 64세, 해인(현재, 녹색 재킷)
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close shot of a woman's right hand gripping an oar, tilt up to an old man's eyes watching that hand, unable to speak. Camera: close on hands, tilt to his eyes. Lighting: Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill. Still black water mirroring the beams.
```

### S8-07 · 편집 4초 · 생성 5초 · wide
- 내용: 말없이 흘러가는 보트
- 첨부: 해인(현재, 녹색 재킷), 동수 64세
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Wide shot, the small boat drifts in silence, two headlamp beams apart, not facing each other. Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill. Still black water mirroring the beams. Camera: slow drift. Lighting: Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill. Still black water mirroring the beams.
```

### S9-01 · 편집 5초 · 생성 6초 · wide
- 내용: 랜턴 빛이 검은 바위를 훑다가 노란색에 멈춘다
- 첨부: 장갑: 침전물 앉은 오른쪽
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Inside a completely black lava tube cave, the only light is one narrow warm orange headlamp beam, a small moving circle; no ambient light, no cool or green tones. The beam starts on bare wet black rock, drifts slowly to the right, catches a patch of dull yellow and stops on it: a single old rubber-coated work glove lying in a rock crevice, clearly empty, flat and collapsed, faded ochre yellow, more than half covered by a hard white mineral crust. Camera: beam drifts right and stops. Lighting: one narrow warm orange headlamp beam; nothing outside the beam visible
```

### S9-02 · 편집 3초 · 생성 4초 · detail
- 내용: 침전물 앉은 낡은 오른쪽 작업장갑
- 첨부: 장갑: 침전물 앉은 오른쪽
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Macro shot, a single old right work glove lying flat and collapsed in a rock crevice, clearly empty, dull faded ochre yellow, a hard white mineral crust like limescale fusing it to the black rock, beige knit cuff frayed; lit only by one warm orange headlamp beam. Camera: macro, static. Lighting: Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill.
```

### S9-03 · 편집 4초 · 생성 5초 · close-up
- 내용: 동수가 얼어붙는다
- 첨부: 동수 64세
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close-up, Kim Dong-su at 64, same man, grey cropped hair, weathered face, faded navy work jacket, old scratched white hard hat, avoids eye contact frozen, lips parted, headlamp light trembling. Camera: static close-up. Lighting: Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill.
```

### S9-04 · 편집 3초 · 생성 4초 · medium
- 내용: 해인이 처음으로 환해지며 사진을 찍는다
- 첨부: 해인(현재, 녹색 재킷)
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Medium shot, Kim Hae-in, 34, Korean woman cave surveyor, hair tied back, dark green field jacket, calm guarded expression brightens for the first time and photographs the crevice with a small camera. Camera: static medium. Lighting: Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill.
```

### S9-05 · 편집 5초 · 생성 6초 · close-up
- 내용: 해인 대사
- 첨부: 해인(현재, 녹색 재킷)
- 대사(한국어 음성): 해인: 아버지 거죠? 이거면 이름 넣을 수 있어요.
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close-up, Kim Hae-in, 34, Korean woman cave surveyor, hair tied back, dark green field jacket, calm guarded expression speaks eagerly, two short hopeful sentences, almost smiling. Camera: static close-up. Lighting: Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill.
```

### S9-06 · 편집 3초 · 생성 4초 · close-up
- 내용: '넣지 마라.'
- 첨부: 동수 64세
- 대사(한국어 음성): 동수: 넣지 마라.
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close-up, Kim Dong-su at 64, same man, grey cropped hair, weathered face, faded navy work jacket, old scratched white hard hat, avoids eye contact still staring ahead, says two quiet firm words. Camera: static close-up. Lighting: Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill.
```

### S9-07 · 편집 2초 · 생성 4초 · close-up
- 내용: 해인이 돌아본다
- 첨부: 해인(현재, 녹색 재킷)
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close-up, Kim Hae-in, 34, Korean woman cave surveyor, hair tied back, dark green field jacket, calm guarded expression turns her head sharply, the smile gone. Camera: static close-up. Lighting: Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill.
```

### S9-08 · 편집 5초 · 생성 6초 · close-up
- 내용: '그건 내 손에서 빠진 게 아니다.'
- 첨부: 동수 64세
- 대사(한국어 음성): 동수: 그건 내 손에서 빠진 게 아니다.
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close-up, Kim Dong-su at 64, same man, grey cropped hair, weathered face, faded navy work jacket, old scratched white hard hat, avoids eye contact eyes fixed on the crevice, says one slow heavy sentence. Camera: very slow push-in. Lighting: Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill.
```

### S9-09 · 편집 4초 · 생성 5초 · flashback wide
- 내용: 2005년: 아빠 안전모와 큰 장갑을 낀 일곱 살 해인이 도시락 보자기를 들고 걸어온다
- 첨부: 해인 7세(신규), 장갑: 새것, 안전모
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Wide shot in light rain on a Jeju field with black stone walls and a utility pole, Kim Hae-in at 7, a small Korean girl with a short bob, yellow raincoat, wearing her father's oversized white hard hat and oversized yellow rubber-coated work gloves, carrying a cloth-wrapped lunch bundle, walking toward camera, smiling. Camera: static wide. Lighting: grey overcast rain, flat daylight
```

### S9-10 · 편집 2초 · 생성 4초 · flashback close
- 내용: 아이 발밑의 흙이 꺼진다
- 첨부: 해인 7세(신규)
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close shot of a child's small yellow rain boots on wet soil as the ground beneath them suddenly sags and cracks. The shot cuts before any fall is seen. Camera: close on small rain boots. Lighting: grey overcast rain, flat daylight
```

### S9-11 · 편집 4초 · 생성 5초 · flashback close
- 내용: 동수의 손이 아이 손목을 붙잡는다. 아이 손에서 장갑만 미끄러져 떨어진다
- 첨부: 동수 44세, 해인 7세(신규), 장갑: 새것
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close shot in rain over the muddy edge of a hole: a man's strong bare hand grips a small child's wrist tightly; an oversized bright yellow work glove slips off the child's small hand and drops away into darkness; the man's grip holds firm. Camera: close on hands. Lighting: grey overcast rain, flat daylight
```

### S9-12 · 편집 4초 · 생성 5초 · flashback medium
- 내용: 아이를 끌어올려 끌어안는다. 아이는 울지도 못한다
- 첨부: 동수 44세, 해인 7세(신규), 장갑: 새것
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Medium shot in rain, Kim Dong-su at 44, lean Korean electrical line worker, short black hair, rain-soaked navy work jacket, white hard hat on his knees clutching a small girl in a yellow raincoat tightly against his chest beside a hole; the girl is safe, wide-eyed and silent; one oversized yellow glove still on her left hand, her right hand bare. Camera: static medium. Lighting: grey overcast rain, flat daylight
```

### S9-13 · 편집 4초 · 생성 5초 · flashback wide
- 내용: 한 손으로 아이를 안은 채 합판으로 구멍을 덮고 걸어 나간다
- 첨부: 동수 44세, 해인 7세(신규)
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Wide shot in rain, Kim Dong-su at 44, lean Korean electrical line worker, short black hair, rain-soaked navy work jacket, white hard hat carrying a small girl on one arm drags a sheet of plywood over a hole beside a utility pole with his free hand, then walks away carrying her without looking back. Camera: static wide, he exits frame. Lighting: grey overcast rain, flat daylight
```

### S9-14 · 편집 4초 · 생성 5초 · close
- 내용: 해인이 자기 오른손을 내려다본다
- 첨부: 해인(현재, 녹색 재킷)
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close shot, a woman's bare right hand slowly opening in warm headlamp light, tilt up to the face of Kim Hae-in, 34, Korean woman cave surveyor, hair tied back, dark green field jacket, calm guarded expression, stunned. Camera: close on her right hand, tilt to her face. Lighting: Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill.
```

### S9-15 · 편집 4초 · 생성 5초 · close-up
- 내용: '찾은 건 너다. 일곱 살짜리가.'
- 첨부: 동수 64세
- 대사(한국어 음성): 동수: 찾은 건 너다. 일곱 살짜리가.
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close-up, Kim Dong-su at 64, same man, grey cropped hair, weathered face, faded navy work jacket, old scratched white hard hat, avoids eye contact finally looking straight at his daughter, says two short quiet sentences. Camera: static close-up. Lighting: Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill.
```

### S9-16 · 편집 5초 · 생성 6초 · close-up
- 내용: '넌 그 뒤로 일 년을 말을 안 했다.'
- 첨부: 동수 64세
- 대사(한국어 음성): 동수: 넌 그 뒤로 일 년을 말을 안 했다.
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close-up, Kim Dong-su at 64, same man, grey cropped hair, weathered face, faded navy work jacket, old scratched white hard hat, avoids eye contact voice almost gone, says one slow sentence, eyes wet. Camera: static close-up. Lighting: Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill.
```

### S9-17 · 편집 3초 · 생성 4초 · close
- 내용: 손에 든 카메라가 천천히 내려간다
- 첨부: 해인(현재, 녹색 재킷)
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close shot, a woman's hands holding a small camera slowly lower it to her side. Camera: close on hands. Lighting: Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill.
```

### S10-01 · 편집 3초 · 생성 4초 · wide
- 내용: 돌아오는 보트, 해인이 노를 멈춘다
- 첨부: 해인(현재, 녹색 재킷), 동수 64세
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Wide shot, the boat in the middle of the black lake, Kim Hae-in, 34, Korean woman cave surveyor, hair tied back, dark green field jacket, calm guarded expression stops rowing and lets the oars rest. Camera: static wide. Lighting: Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill. Still black water mirroring the beams.
```

### S10-02 · 편집 3초 · 생성 4초 · close-up
- 내용: 해인이 말없이 자기 랜턴을 끈다
- 첨부: 해인(현재, 녹색 재킷), 안전모+헤드랜턴
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close-up, Kim Hae-in, 34, Korean woman cave surveyor, hair tied back, dark green field jacket, calm guarded expression reaches up and switches off her headlamp; her face drops into shadow. Camera: static close-up. Lighting: Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill. Still black water mirroring the beams.
```

### S10-03 · 편집 3초 · 생성 4초 · close-up
- 내용: 동수가 딸을 보다가 자기 랜턴도 끈다
- 첨부: 동수 64세, 안전모+헤드랜턴
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close-up, Kim Dong-su at 64, same man, grey cropped hair, weathered face, faded navy work jacket, old scratched white hard hat, avoids eye contact looks toward his daughter for a moment, then switches off his own headlamp; the frame falls to black. Camera: static close-up. Lighting: Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill. Still black water mirroring the beams.
```

### S10-05 · 편집 5초 · 생성 6초 · silhouette wide
- 내용: 해인: '왜 말 안 했어요. 이십 년을.'
- 첨부: 해인(현재, 녹색 재킷), 동수 64세, 안전모
- 대사(한국어 음성): 해인: 왜 말 안 했어요. 이십 년을.
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Static wide shot. Near-total darkness on a black underground lake; one tiny warm light far across the water gives only a faint rim on two seated silhouettes at opposite ends of a small inflatable boat, an old man in a hard hat on the left and a woman on the right, a wide empty space between them. They do not face each other; both look down at the water. Arms close to their own bodies; no arms or hands extend into the space between them. No faces visible, no hands visible. Full-frame 16:9, no black bars. Both figures almost completely still. Camera: static wide, same frame for all four. Lighting: distant single light, rim only
```

### S10-06 · 편집 7초 · 생성 8초 · silhouette wide
- 내용: 동수: '네가 다시 입을 뗀 날… 그걸로 됐다 싶었다.'
- 첨부: 해인(현재, 녹색 재킷), 동수 64세, 안전모
- 대사(한국어 음성): 동수: 네가 다시 입을 뗀 날… 그걸로 됐다 싶었다.
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Static wide shot. Near-total darkness on a black underground lake; one tiny warm light far across the water gives only a faint rim on two seated silhouettes at opposite ends of a small inflatable boat, an old man in a hard hat on the left and a woman on the right, a wide empty space between them. They do not face each other; both look down at the water. Arms close to their own bodies; no arms or hands extend into the space between them. No faces visible, no hands visible. Full-frame 16:9, no black bars. Both figures almost completely still. Camera: static wide, same frame for all four. Lighting: distant single light, rim only
```

### S10-07 · 편집 8초 · 생성 9초 · silhouette wide
- 내용: 해인: '그날, 뒷문에 계신 거 봤어요.' / '보고도… 모른다고 했어요.'
- 첨부: 해인(현재, 녹색 재킷), 동수 64세, 안전모
- 대사(한국어 음성): 해인: 그날, 뒷문에 계신 거 봤어요. / 해인: 보고도… 모른다고 했어요.
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Static wide shot. Near-total darkness on a black underground lake; one tiny warm light far across the water gives only a faint rim on two seated silhouettes at opposite ends of a small inflatable boat, an old man in a hard hat on the left and a woman on the right, a wide empty space between them. They do not face each other; both look down at the water. Arms close to their own bodies; no arms or hands extend into the space between them. No faces visible, no hands visible. Full-frame 16:9, no black bars. Both figures almost completely still. Camera: static wide, same frame for all four. Lighting: distant single light, rim only
```

### S10-08 · 편집 6초 · 생성 7초 · silhouette wide
- 내용: 동수: '내가 안 갔어야 했다.' 해인: '아니요.' 실루엣 하나가 조금 기운다
- 첨부: 해인(현재, 녹색 재킷), 동수 64세, 안전모
- 대사(한국어 음성): 동수: 내가 안 갔어야 했다. / 해인: 아니요.
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Static wide shot. Near-total darkness on a black underground lake; one tiny warm light far across the water gives only a faint rim on two seated silhouettes at opposite ends of a small inflatable boat, an old man in a hard hat on the left and a woman on the right, a wide empty space between them. They do not face each other; both look down at the water. Arms close to their own bodies; no arms or hands extend into the space between them. No faces visible, no hands visible. Full-frame 16:9, no black bars. Both figures almost completely still. Camera: static wide, same frame for all four. Lighting: distant single light, rim only
```

### S10-09 · 편집 6초 · 생성 7초 · close
- 내용: 랜턴이 켜지면 해인의 손이 동수의 손 위에 있다
- 첨부: 해인(현재, 녹색 재킷), 동수 64세
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close shot. The very first second is pure black. Then a headlamp clicks on and warm orange light reveals two hands on the rubber edge of a small boat, black water behind: one hand already resting on top of the other. The top hand is clearly a woman's, smaller and slender with smooth skin, from a dark green field jacket sleeve. The bottom hand is an old man's, large, weathered and wrinkled, from a faded navy work jacket sleeve. The hands stay completely still. Camera: close on hands. Lighting: Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill. Still black water mirroring the beams.
```

### S10-10 · 편집 3초 · 생성 4초 · two-shot
- 내용: 서로 보지 않지만 손은 그대로
- 첨부: 해인(현재, 녹색 재킷), 동수 64세
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Two-shot in the boat, father and daughter look in different directions, their hands still joined between them. Camera: static two-shot. Lighting: Lit only by two warm orange headlamps; pitch-black lava tube beyond the beams; wet basalt, white carbonate deposits catching the light; no ambient fill. Still black water mirroring the beams.
```

### S11-01 · 편집 3초 · 생성 4초 · wide
- 내용: 저녁빛, 팀장이 봉투와 조사표를 들고 있다
- 첨부: 팀장, 해인(현재, 녹색 재킷), 동수 64세
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Wide shot outside the iron gate, survey team leader, Korean man in his 50s, glasses, grey field vest holding a clipboard and a clear sample bag with an old yellow glove, facing a woman and an old man. low golden evening light, long shadows. Camera: static wide. Lighting: low golden evening light, long shadows
```

### S11-02 · 편집 2초 · 생성 4초 · insert
- 내용: 펜이 조사표의 빈칸을 가리킨다
- 첨부: 팀장
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close shot, a pen tip points at an empty line on a blank field form on a clipboard. No readable text. Camera: close on clipboard. Lighting: low golden evening light, long shadows
```

### S11-03 · 편집 3초 · 생성 4초 · close-up
- 내용: '비워 두세요.'
- 첨부: 해인(현재, 녹색 재킷)
- 대사(한국어 음성): 해인: 비워 두세요.
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close-up, Kim Hae-in, 34, Korean woman cave surveyor, hair tied back, dark green field jacket, calm guarded expression says one calm short sentence. Camera: static close-up. Lighting: low golden evening light, long shadows
```

### S11-04 · 편집 4초 · 생성 5초 · medium
- 내용: 팀장이 끄덕이고 동수를 보며 묻는다
- 첨부: 팀장
- 대사(한국어 음성): 팀장: 그럼 이분은…
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Medium shot, survey team leader, Korean man in his 50s, glasses, grey field vest nods, then glances past her toward the old man and begins a hesitant question. Camera: static medium. Lighting: low golden evening light, long shadows
```

### S11-05 · 편집 3초 · 생성 4초 · close-up
- 내용: '제 아버지예요.'
- 첨부: 해인(현재, 녹색 재킷)
- 대사(한국어 음성): 해인: 제 아버지예요.
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close-up, Kim Hae-in, 34, Korean woman cave surveyor, hair tied back, dark green field jacket, calm guarded expression answers plainly and clearly, one short sentence, chin up. Camera: static close-up. Lighting: low golden evening light, long shadows
```

### S11-06 · 편집 3초 · 생성 4초 · close-up
- 내용: 동수가 딸을 본다
- 첨부: 동수 64세
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close-up, Kim Dong-su at 64, same man, grey cropped hair, weathered face, faded navy work jacket, old scratched white hard hat, avoids eye contact looks at his daughter, eyes wet, very still. Camera: static close-up. Lighting: low golden evening light, long shadows
```

### S11-07 · 편집 4초 · 생성 5초 · close
- 내용: 팀장이 봉투를 내밀고 동수가 두 손으로 받는다
- 첨부: 팀장, 동수 64세, 장갑: 침전물 앉은 오른쪽
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close shot, a clear sample bag holding an old yellow glove is handed over; an old man's two weathered hands receive it carefully. Camera: close on hands. Lighting: low golden evening light, long shadows
```

### S11-08 · 편집 2초 · 생성 4초 · insert
- 내용: 뒤에서 철문이 닫히고 자물쇠가 채워진다
- 첨부: 없음
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close shot, an iron gate swings shut and a gloved hand snaps a heavy padlock closed, golden evening light. Camera: close on padlock. Lighting: low golden evening light
```

### S11-09 · 편집 3초 · 생성 4초 · medium from behind
- 내용: 전신주 아래, 해인의 뒷모습 대사
- 첨부: 해인(현재, 녹색 재킷)
- 대사(한국어 음성): 해인: 아빠. 밥 먹고 가요.
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Medium shot from behind, a woman in a dark green field jacket stands under a weathered utility pole with humming wires, Jeju field at dusk. low golden evening light, long shadows. Camera: static, from behind. Lighting: low golden evening light, long shadows
```

### S11-10 · 편집 3초 · 생성 4초 · close-up
- 내용: 동수가 딸의 눈을 피하지 않는다
- 첨부: 동수 64세
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Close-up, Kim Dong-su at 64, same man, grey cropped hair, weathered face, faded navy work jacket, old scratched white hard hat, avoids eye contact turns and holds eye contact without looking away, the faintest softening. Camera: static close-up. Lighting: low golden evening light, long shadows
```

### S12-01 · 편집 8초 · 생성 9초 · detail
- 내용: 신발장: 왼쪽 장갑 옆에 오른쪽 장갑을 내려놓는다. 한 켤레. 어른 장갑이다
- 첨부: 동수 64세, 장갑: 먼지 앉은 왼쪽, 장갑: 침전물 앉은 오른쪽
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Detail shot on an old wooden shoe cabinet, an old man's hand places a mineral-crusted yellow right work glove next to a dusty faded yellow left work glove; the two lie side by side as a pair. Camera: static detail. Lighting: dim interior, single window daylight, warm brown shadows
```

### S12-02 · 편집 8초 · 생성 9초 · detail
- 내용: 식탁, 밥그릇 둘. 김이 오른다. 사람은 없다
- 첨부: 없음
```
Naturalistic live-action cinema, restrained emotion, 16:9, 1080p, 24fps, shallow depth of field, muted palette of cave black, lantern orange, carbonate white and one accent of work-glove yellow, soft film grain, no on-screen text. Static shot of a small wooden dining table with two steaming rice bowls and two pairs of chopsticks, no people in frame. dim interior, single window daylight, warm brown shadows. Camera: static, slow fade out. Lighting: dim interior, single window daylight, warm brown shadows
```
