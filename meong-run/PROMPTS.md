# Flow(Veo 3.1) 프롬프트 — 멍 런

## 사용 순서
1. Flow → 새 프로젝트 → **Text to Video**, 모델 `Veo 3.1 - Quality`, 비율은 세로(9:16) 또는 가로(16:9) 중 화면에 맞게.
2. 아래 프롬프트 하나를 붙여넣고 생성. 마음에 드는 컷을 **Extend**(이어 붙이기)로 24~32초까지 늘리면 루프 티가 덜 남.
3. 다운로드 → `videos/` 폴더에 넣기 → `videos.js`에 파일명 추가.

## 공통 규칙 (모든 프롬프트 맨 앞에 붙이기)
```
Photorealistic cinematic footage, shot on ARRI Alexa 50mm, natural light, shallow depth of field, subtle film grain, muted warm color grade, steady gimbal tracking shot at constant distance, no camera shake, no cuts, no text, no music, only ambient sound (footsteps, breathing, wind)
```

## Scene 01 — 다리 위 뒷모습, 해질녘
```
A young Caucasian woman in her mid-20s running away from camera across a long steel bridge at golden hour. Long blonde ponytail swings rhythmically with each stride. White breathable open-back running tank, black running shorts, toned athletic build, relaxed effortless form. Camera follows smoothly behind her at a constant 4 meters. Blurred harbor and distant city traffic in background, soft sunlight on her shoulders. Calm, hypnotic, endless rhythm.
```

## Scene 02 — 숲길 정면
```
A young European woman in her late 20s jogging toward the camera on a shaded forest path, dappled morning light through green leaves. Light brown hair tied back, light blue sports top and black bike shorts, natural slight smile mid-breath, steady rhythmic stride. Camera retreats smoothly ahead of her at constant distance so she stays centered. Leaves drift gently. Tranquil, meditative mood.
```

## Scene 03 — 새벽 강변 옆모습
```
Side-profile tracking shot of a young Scandinavian woman running along a misty riverside promenade at dawn. Pale blue sky with soft pink horizon, grey long-sleeve running top and dark leggings, hair in a loose braid, calm focused expression, breath faintly visible in the cool air. Reflections on wet pavement, empty path, camera moves parallel to her at the same speed. Serene and quiet.
```

## Scene 04 — 해변 모래사장, 늦은 오후
```
A young woman with sun-lightened hair running barefoot along the wet sand at the water's edge in late afternoon light. Olive-green sports top and white shorts, relaxed long strides, small waves washing over her footprints. Low camera angle gliding behind and slightly to the side. Golden backlight, sea spray, slow rolling waves, timeless and peaceful.
```

## Scene 05 — 비 그친 도시 밤거리
```
A young Caucasian woman running through a quiet city street at night just after rain. Black running jacket with reflective trim, dark leggings, ponytail. Neon shop signs reflected in wet asphalt, soft bokeh streetlights, steam rising from a vent. Camera tracks beside her at a steady pace. Rhythmic footsteps echo, calm and cinematic.
```

## 루프 품질 팁
- "no cuts", "constant distance", "steady pace" 세 구절이 루프의 핵심. 빠지면 카메라가 흔들리거나 장면이 바뀜.
- 사람 얼굴이 정면으로 크게 나오면 AI 티가 남. 뒷모습·옆모습·중거리가 안전.
- 걸음이 어색하면 "natural running gait, heel-to-toe, arms relaxed at 90 degrees" 추가.
- 피해야 할 단어: close-up, slow zoom, dramatic, sexy, revealing. (품질 저하 + 필터 차단)

## 썸네일/정지 이미지용 (Imagen / Nano Banana)
```
Photorealistic editorial sports photo, Sony A7IV 85mm f/1.8, 9:16. A young Caucasian woman in her mid-20s running away from camera across a steel bridge at golden hour, long blonde ponytail mid-swing, white open-back running tank, black shorts, one foot off the ground, blurred harbor behind, warm muted grade, candid unposed.
Negative: cartoon, anime, 3d render, oversaturated, extra limbs, distorted hands, text, watermark, posed studio shot
```
