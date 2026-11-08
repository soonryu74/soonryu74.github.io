# Flow(Veo 3.1) 프롬프트 — 멍 런

## 사용 순서
1. Flow → 새 프로젝트 → **Text to Video**, 모델 `Veo 3.1 - Quality`, 비율은 세로(9:16) 또는 가로(16:9) 중 화면에 맞게.
2. 아래 프롬프트 하나를 붙여넣고 생성. 마음에 드는 컷을 **Extend**(이어 붙이기)로 24~32초까지 늘리면 루프 티가 덜 남.
3. 다운로드 → `videos/` 폴더에 넣기 → `videos.js`에 파일명 추가.

## 공통 규칙 (모든 프롬프트 맨 앞에 붙이기)
```
Cinematic tracking shot from behind a runner, camera on a gimbal 3 meters back, matching her pace, continuous forward motion, no cuts, natural light, shallow depth of field, warm color grade
```

## Scene 01 — 가로수길, 해질녘
```
A young Korean woman in her 20s running down a long tree-lined avenue toward the sunset, seen from behind. Long black ponytail swinging with each stride, white running top, black running shorts, relaxed steady form. Warm backlight, long shadows, the road stretching ahead.
```

## Scene 02 — 다리 위, 늦은 오후
```
A young East Asian woman running across a long bridge in late afternoon light, viewed from behind. High dark ponytail, light grey tank top, navy running shorts, steady light steps. Harbor and city skyline blurred past the railing, wind in her hair.
```

## Scene 03 — 숲길, 아침
```
A young Korean woman running along a winding forest path in the morning, viewed from behind. Black hair in a loose braid, pale pink sports top, black leggings, light steady strides. Dappled sunlight through green leaves, path curving ahead.
```

## Scene 04 — 강변길, 블루아워
```
A young East Asian woman running along a quiet riverside path at blue hour, viewed from behind. Black ponytail, cream running top, dark shorts, upright posture, steady rhythm. City lights across the water, lamp posts passing one by one.
```

## Scene 05 — 해안도로, 이른 아침
```
A young Korean woman running along an empty coastal road at sunrise, ocean on her left, viewed from behind. Dark hair tied high moving in the sea breeze, white sleeveless top, black shorts, light strides. Pink-gold sky, waves rolling in, road curving along the cliffs.
```

## 생성 실패 시
- "동영상을 생성할 수 없습니다" → 안전 필터. captivating, alluring, mesmerizing, slim, toned, figure, legs, "want to follow her" 같은 외모·감정 표현 금지. 촬영 지시문처럼만 쓸 것.
- 그래도 실패하면 `woman` → `runner`, 나이 표현 삭제.
- "오디오를 생성할 수 없습니다" → Flow 설정에서 **무음 동영상 반환** 켜기. 웹앱은 기본 음소거라 무관.

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
