# 《입구》 v7 캐릭터·소품 시트 프롬프트 (Google Gemini 이미지 생성용)

> 화면 비율은 전부 **16:9(가로)**. 공모전 규정이 16:9 가로 영상이라 시트도 같은 비율로 만든다.
> 순서: 1단계 기준 시트 → 마음에 드는 얼굴 하나로 고정 → 2단계에서 그 이미지를 첨부해 나이 변형.
> 실존 배우·유명인을 닮게 나오면 버린다(약관상 실존 인물로 보이는 합성 금지). 이미지 파일은 이 공개 저장소에 올리지 않는다.

## 1단계: 기준 시트 (글만으로 생성)

### 동수 64세 (CH_D64)
```
Character reference sheet, photorealistic, 16:9, plain light-grey studio background, soft even lighting. One Korean man, 64 years old, retired electrical line worker. Lean build, short cropped grey hair, deep wrinkles, sun-weathered skin, tired gentle eyes that avoid the camera, no beard, no glasses. Wearing a faded navy work jacket over a plain grey shirt, dark work trousers. Show the same man four times in a row: full-body front view, full-body side view, three-quarter close-up of the face, and close-up of the face looking down. Identical face, hair and clothes in all four views. Neutral restrained expression. No text, no labels, no logos.
```

### 해인 34세 (CH_H34)
```
Character reference sheet, photorealistic, 16:9, plain light-grey studio background, soft even lighting. One Korean woman, 34 years old, cave surveyor. Slim build, black hair tied back in a low ponytail, minimal makeup, calm guarded expression. Wearing a dark green field jacket over a plain grey top, dark trousers, hiking boots. Show the same woman four times in a row: full-body front view, full-body side view, three-quarter close-up of the face, and close-up of the face looking down. Identical face, hair and clothes in all four views. No text, no labels, no logos.
```

### 팀장 (CH_LEAD)
```
Character reference sheet, photorealistic, 16:9, plain light-grey studio background, soft even lighting. One Korean man in his 50s, survey team leader. Medium build, short black hair with grey at the temples, thin metal-frame glasses, composed neutral expression. Wearing a grey field vest over a dark long-sleeve shirt, dark trousers. Show the same man three times in a row: full-body front view, full-body side view, close-up of the face. Identical face and clothes in all views. No text, no labels, no logos.
```

## 2단계: 나이 변형 (기준 시트를 첨부하고 입력)

### 동수 44세 (CH_D44) — 동수 64세 시트 첨부
```
Using the attached reference, create a character reference sheet of the same man at 44 years old, twenty years younger. Keep the same facial bone structure, eyes, nose and ears. Change only: short black hair, fewer wrinkles, firmer skin. Wearing a rain-soaked navy work jacket, a white hard hat, and a pair of bright yellow coated work gloves. Same layout: full-body front, full-body side, three-quarter face close-up, face looking down. Plain light-grey background, photorealistic, 16:9. No text, no logos.
```

### 동수 61세 양복 (CH_D61) — 동수 64세 시트 첨부
```
Using the attached reference, create a character reference sheet of the same man at 61, almost unchanged in face and hair. Change only the clothes: an old, slightly ill-fitting dark suit jacket over a plain work shirt, no tie, no hard hat. He holds a blank white invitation card in one hand. Same layout: full-body front, full-body side, three-quarter face close-up, face looking down. Plain light-grey background, photorealistic, 16:9. No text, no logos.
```

### 해인 31세 (CH_H31) — 해인 34세 시트 첨부
```
Using the attached reference, create a character reference sheet of the same woman at 31, almost unchanged in face and hair. Change only the clothes: a grey surveyor vest over a white shirt, dark trousers. Same layout: full-body front, full-body side, three-quarter face close-up, face looking down. Plain light-grey background, photorealistic, 16:9. No text, no logos.
```

## 3단계: 소품 시트

### 노란 장갑 3종 (PR_GLOVE_NEW / PR_GLOVE_LEFT / PR_GLOVE_AGED)
```
Prop reference sheet, photorealistic, 16:9, plain light-grey background, soft even lighting, top-down view. Three versions of the same yellow coated work glove model, laid flat in a row with space between them: (1) a brand-new pair, bright yellow, left and right; (2) a single LEFT glove, faded pale yellow and covered in dust; (3) a single RIGHT glove, faded yellow, stiff, with a thin white mineral crust on its surface. Same shape, cuff and stitching in all three. No text, no labels, no logos.
```

### 안전모와 헤드랜턴 (PR_HELMET / PR_LAMP)
```
Prop reference sheet, photorealistic, 16:9, plain light-grey background, soft even lighting. An old white construction hard hat with two long scratches on the right side, shown three times: front view, side view, and with a small black headlamp strapped on, its lamp glowing warm orange. No text, no labels, no logos.
```

## 쓰는 법
1. 기준 시트는 3~4번 뽑아 가장 마음에 드는 얼굴 하나로 고정한다.
2. 영상 프롬프트를 넣을 때 해당 인물 시트를 첨부하고, 첫 줄에 `Use the attached character reference for the man/woman.`을 추가한다.
3. 가족사진 속 14세 해인(CH_H14)은 영상 컷이 아니라 사진 소품이라 뒤로 미룬다.
