# Flow(Veo 3.1) 프롬프트 — 멍 런

## 사용 순서
1. Flow → 새 프로젝트 → **Text to Video**, 모델 `Veo 3.1 - Quality`, 비율은 세로(9:16) 또는 가로(16:9) 중 화면에 맞게.
2. 아래 프롬프트 하나를 붙여넣고 생성. 마음에 드는 컷을 **Extend**(이어 붙이기)로 24~32초까지 늘리면 루프 티가 덜 남.
3. 다운로드 → `videos/` 폴더에 넣기 → `videos.js`에 파일명 추가.

## 공통 규칙 (모든 프롬프트 맨 앞에 붙이기)
```
Photorealistic, candid everyday footage, fixed camera like a bystander sitting on a park bench, natural soft light, shallow depth of field, gentle warm color grade, no cuts, no camera movement, ambient sound only (birds, light footsteps, breeze)
```

## Scene 01 — 공원 산책로, 늦은 오후
```
A pretty young Caucasian woman in her mid-20s jogging at an easy relaxed pace along a tree-lined park path, approaching from the distance and passing by. Wavy honey-blonde hair in a loose ponytail bouncing softly, light pink crop top, grey jogging shorts, white sneakers, earbuds in. Calm content expression, slight smile, unhurried rhythm, arms swinging gently. Golden late-afternoon light through the trees, people blurred far in the background. Peaceful, pleasant to watch.
```

## Scene 02 — 호숫가 길, 아침
```
A charming young European woman in her late 20s lightly jogging along a lakeside path toward the camera in the soft morning light. Chestnut hair in a high ponytail, white sports bra top under an open light grey zip hoodie, black leggings. Fresh natural face, cheeks slightly flushed, breathing easily, comfortable slow jog. Mist on the water, ducks nearby, warm sun flare. Serene and effortless.
```

## Scene 03 — 동네 주택가, 해질녘
```
An attractive young woman with long dark blonde hair jogging casually down a quiet suburban street lined with trees, moving from left to right across the frame at a gentle pace. Sage-green tank top, navy shorts, hair swaying with each light step, relaxed shoulders, soft smile as if enjoying the evening. Warm sunset glow, long shadows, a sprinkler in a front yard, calm neighborhood. Simple and lovely.
```

## Scene 04 — 해변 산책로, 오전
```
A lovely young woman with sun-kissed light brown hair jogging slowly along a seaside boardwalk, passing the camera at a leisurely pace. Soft white tank top, coral shorts, hair loose and moving in the sea breeze, relaxed happy face. Bright but soft morning light, gentle waves and gulls in the background, a few people far away. Easygoing, warm, nice to watch.
```

## Scene 05 — 강변 자전거길, 저녁
```
A pretty young Caucasian woman jogging at an easy pace along a riverside path in the blue hour, coming toward the camera and passing close by. Light grey hoodie half-zipped, black leggings, high blonde ponytail, calm gentle expression, steady light breathing. City lights beginning to twinkle across the river, soft reflections on the water, quiet evening air. Relaxed and dreamy.
```

## 루프 품질 팁
- "fixed camera", "no cuts", "no camera movement" 세 구절이 핵심. 빠지면 스포츠 촬영처럼 카메라가 따라붙음.
- 피할 단어: marathon, race, athletic, sprint, intense, tracking shot. (운동 경기 톤으로 바뀜)
- 사람 얼굴이 정면으로 크게 나오면 AI 티가 남. 뒷모습·옆모습·중거리가 안전.
- 걸음이 어색하면 "natural running gait, heel-to-toe, arms relaxed at 90 degrees" 추가.
- 그리고 close-up, slow zoom, dramatic, sexy, revealing. (품질 저하 + 필터 차단)

## 썸네일/정지 이미지용 (Imagen / Nano Banana)
```
Photorealistic editorial sports photo, Sony A7IV 85mm f/1.8, 9:16. A young Caucasian woman in her mid-20s running away from camera across a steel bridge at golden hour, long blonde ponytail mid-swing, white open-back running tank, black shorts, one foot off the ground, blurred harbor behind, warm muted grade, candid unposed.
Negative: cartoon, anime, 3d render, oversaturated, extra limbs, distorted hands, text, watermark, posed studio shot
```
