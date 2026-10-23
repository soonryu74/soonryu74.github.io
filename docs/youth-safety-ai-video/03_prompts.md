# 컷별 이미지 생성 프롬프트 (복사해서 바로 사용)

도구: 나노바나나(Gemini 이미지) / GPT 이미지 / 캔바 AI. 비율: 세로 9:16 (도구가 없으면 3:4 → 편집에서 크롭).
순서: 캐릭터 시트 2장 먼저 확정 → 이후 모든 컷에 해당 시트를 레퍼런스로 첨부하고 "같은 인물, 같은 화풍 유지" 추가.

## 스타일 블록 (S) — 모든 프롬프트 맨 앞

```
따뜻한 한국 웹툰 애니메이션 스타일, 깔끔한 선화와 부드러운 셀 셰이딩, 감성적이고 차분한 분위기, 세로 9:16 비율. 그림 안에 글자, 말풍선, UI 텍스트, 숫자 절대 없음.
```

## 캐릭터 블록

- (H) 하늘: `15세 한국 여중생, 어깨 길이 검은 단발머리, 둥근 얼굴, 큰 눈, 마른 체형, 회색 후드티에 체크무늬 잠옷 바지`
- (M) 엄마: `40대 한국인 엄마, 짧은 갈색 웨이브 머리, 베이지색 니트 위에 앞치마, 따뜻하고 다정한 인상`
- (V) 사기범: `검은 후드를 쓴 남자의 뒷모습, 얼굴 보이지 않음, 어두운 방, 모니터 3대의 푸른 빛`

## 캐릭터 시트

```
[S] 캐릭터 시트: [H]. 정면 상반신, 중립적인 표정, 연한 하늘색 단색 배경.
```
```
[S] 캐릭터 시트: [M]. 정면 상반신, 부드러운 미소, 연한 크림색 단색 배경.
```

## 컷 1~9

```
cut01  [S] 밤, 중학생의 방. 책상 위 스마트폰이 진동하며 화면이 환하게 빛남. 하이앵글, 근경, 인물 없음. 남색·보라 톤.
```
```
cut02  [S] [H] 스마트폰을 귀에 대고 눈이 커진 놀란 표정. 클로즈업, 정면. 어두운 방 조명, 남색·보라 톤. (레퍼런스: 하늘 시트)
```
```
cut03  [S] 스마트폰 화면을 누르려는 떨리는 엄지손가락. 익스트림 클로즈업. 화면은 빈 흰색 박스, 텍스트 없음. 어두운 방.
```
```
cut04  [S] 스마트폰 화면 테두리에서 연한 파란 빛이 번지고, 화면 중앙에 작은 파란 방패 모양이 떠오름. 손가락은 화면 바로 위에서 멈춤. 근경, 정면.
```
```
cut05  [S] [V] 로우앵글, 뒷모습. 모니터 3대에 여학생과 엄마가 함께 웃는 영상 썸네일과 파란 음성 파형 그래프. 어두운 방.
       (상단 절반은 cut02 하늘 정지 컷을 편집에서 합성 — 별도 생성 불필요)
```
```
cut06  [S] [H] 의 어깨 너머로 보이는 스마트폰 영상통화 화면. 화면 속 [M] 이 앞치마를 입고 설거지하다 환하게 웃는 모습. 중경. 따뜻한 주방 조명. (레퍼런스: 하늘 시트 + 엄마 시트)
```
```
cut07  [S] 어두운 방, 꺼져가는 모니터 3대, [V] 의 실루엣. 근경, 정면. 모니터 한 곳에만 붉은 빛 한 점. 텍스트 없음.
```
```
cut08  [S] 2030년의 밝은 교실, 창가 역광, 크림·하늘색 톤. 학생들의 스마트폰마다 작은 파란 방패 빛. [H] 가 친구와 폰을 보며 웃는 모습. 원경. (레퍼런스: 하늘 시트)
```
```
cut09  [S] [H] 따뜻한 미소, 정면 클로즈업, 연한 하늘색 단색 배경. (레퍼런스: 하늘 시트)
```

## 검수 기준 (컷마다)

- 글자·숫자가 그림에 있으면 재생성
- 하늘 머리 길이·후드티 색이 다르면 재생성
- 지정 구도(클로즈업/원경/앵글)와 다르면 재생성

## 모션 프롬프트 (클링/비오, 이미지→영상 5초)

| 컷 | 프롬프트 |
|---|---|
| 1 | phone vibrating gently on desk, screen light flickering, subtle camera push-in, no text |
| 2 | slow zoom in on face, eyes trembling slightly, hair barely moving, no text |
| 3 | thumb slowly lowering toward screen, slight hand tremor, no text |
| 4 | soft blue glow spreading from phone edges, shield icon pulsing, finger frozen, no text |
| 5 | waveform animating on monitors, monitor light flickering, static figure, no text |
| 6 | video call screen brightening, mother laughing warmly, girl's shoulders relaxing, no text |
| 7 | monitors fading to black one by one, red dot blinking out, no text |
| 8 | slow pan across bright classroom, sunlight particles drifting, students smiling, no text |
| 9 | nearly still, very subtle zoom, warm smile, no text |

## 진행 상태 (2026-10-21)

- [x] 하늘 시트 확정 → `characters/haneul.jpg` (원본 1086×1448)
- [x] 엄마 시트 확정 → `characters/mom.jpg` (ChatGPT 생성)
- [ ] cut01~09 — 하늘 시트를 레퍼런스로 첨부해 생성
