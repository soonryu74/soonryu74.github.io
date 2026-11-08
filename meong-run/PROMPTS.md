# Flow(Veo 3.1) 프롬프트 — 멍 런

## 사용 순서
1. Flow → 새 프로젝트 → **Text to Video**, 모델 `Veo 3.1 - Quality`, 비율은 세로(9:16) 또는 가로(16:9) 중 화면에 맞게.
2. 아래 프롬프트 하나를 붙여넣고 생성. 마음에 드는 컷을 **Extend**(이어 붙이기)로 24~32초까지 늘리면 루프 티가 덜 남.
3. 다운로드 → `videos/` 폴더에 넣기 → `videos.js`에 파일명 추가.

## 공통 규칙 (모든 프롬프트 맨 앞에 붙이기)
```
Photorealistic cinematic footage, first-person following shot from directly behind, camera glides smoothly 3 meters behind her at her exact pace, she never turns around and never leaves the frame, continuous forward motion, no cuts, no camera shake, natural light, shallow depth of field, gentle warm color grade, ambient sound only (light footsteps, breeze, breathing)
```

## Scene 01 — 가로수길, 해질녘
```
A captivating young Korean woman seen from behind, running at a steady graceful pace down a long tree-lined avenue toward the golden sunset. Long glossy black ponytail swaying side to side with each stride, slim toned figure, white open-back running top, black shorts, smooth elegant form. Warm backlight outlining her hair and shoulders, long shadows on the path, the road stretching endlessly ahead. The viewer feels drawn to keep following her.
```

## Scene 02 — 다리 위, 늦은 오후
```
Following directly behind an alluring young East Asian woman running across a long bridge in late afternoon light. High dark ponytail bouncing rhythmically, light grey tank top, navy running shorts, graceful posture, relaxed arms, light quick steps. Harbor and city skyline blurred beyond the railing, warm sun on her back, wind lifting a few strands of hair. Hypnotic, effortless, endless.
```

## Scene 03 — 숲길, 아침
```
Back view of a beautiful young Korean woman running ahead along a winding forest path in soft morning light. Long black hair in a loose braid swinging gently, pale pink sports top, black leggings, slender athletic silhouette, light graceful strides. Dappled sunlight through green leaves falling on her shoulders, the path curving ahead invitingly. Calm, dreamlike, the camera never catches up.
```

## Scene 04 — 강변길, 블루아워
```
Following a mesmerizing young East Asian woman from behind as she runs along a quiet riverside path at blue hour. Sleek black ponytail, fitted cream-colored running top, dark shorts, elegant upright posture, smooth steady rhythm. City lights twinkling across the water, soft reflections, cool evening air, lamp posts passing one by one. Serene and magnetic.
```

## Scene 05 — 해안도로, 이른 아침
```
Back view of a graceful young Korean woman running along an empty coastal road at sunrise, the ocean on her left. Long dark hair tied high and flowing with the sea breeze, white sleeveless top, black shorts, toned legs, light floating strides. Pink-gold morning sky, waves rolling in, the road curving along the cliffs ahead. Peaceful, beautiful, you want to keep following.
```

## 루프 품질 팁
- "from directly behind", "she never turns around", "camera never catches up" 세 구절이 핵심. 빠지면 여자가 카메라를 지나치거나 돌아봄.
- 피할 단어: passing by, toward the camera, turns around, fixed camera, marathon, race, sprint.
- 사람 얼굴이 정면으로 크게 나오면 AI 티가 남. 뒷모습·옆모습·중거리가 안전.
- 걸음이 어색하면 "natural running gait, heel-to-toe, arms relaxed at 90 degrees" 추가.
- 그리고 close-up, slow zoom, dramatic, sexy, revealing. (품질 저하 + 필터 차단)

## 썸네일/정지 이미지용 (Imagen / Nano Banana)
```
Photorealistic editorial sports photo, Sony A7IV 85mm f/1.8, 9:16. A young Korean woman in her mid-20s running away from camera across a steel bridge at golden hour, long black ponytail mid-swing, white open-back running tank, black shorts, one foot off the ground, blurred harbor behind, warm muted grade, candid unposed.
Negative: cartoon, anime, 3d render, oversaturated, extra limbs, distorted hands, text, watermark, posed studio shot
```
