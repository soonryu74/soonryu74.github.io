# PILOT_PROMPTS_READY — 파일럿 3컷 복사용 완성 패키지 (v4.2, 실행 전)

**실행 상태: 미실행.** 아래는 Dreamina에 붙여 넣을 최종 문자열. 실제 생성·결제는 승인 후.

## 0. 준비 — 레퍼런스 이미지 7장 (Dreamina AI 이미지, 각 3회 생성 후 1장 확정)

| 파일명 | 프롬프트 |
|---|---|
| R-HI-hand.png | Close-up of a slender female hand, short clean nails, resting on top of an older man's thick weathered hand on a gray rubber boat edge, single warm headlamp, pure black beyond. Photorealistic cinematic still, 35mm look, subtle grain. No text. |
| R-DS25-hand.png | Close-up of thick weathered male hands, prominent knuckles, old scars, dirt in creases, palm-up on a gray rubber boat edge, warm headlamp, pure black beyond. Photorealistic. No text. |
| R-LAKE.png | Underground lake inside a lava tube, perfectly still black water, small gray rubber boat with two seated figures, headlamps reflecting off water onto low black basalt ceiling as two circles of light, pure black beyond. Photorealistic. |
| R-BAG.png | Clear polyethylene specimen bag with a blank white write-on label strip, holding a yellow rubber work glove crusted in white calcite, resting on a clipboard, dusk light. Photorealistic. No text. |
| R-GLOVE.png | Macro, yellow rubber work glove wedged in a black basalt crevice, crusted in bone-white calcite with small coral-like nodules, warm headlamp beam, pure black beyond. Photorealistic. |
| R-GATE-dusk.png | Flat farmland in Woljeong, Jeju at blue dusk, low black stone walls, one concrete utility pole with wires, a rusted steel hatch about one meter square in a concrete frame, open, equipment cases around. Photorealistic. No text. |
| R-FISH.png | Macro photograph of a small cave goby, 3.5 cm, translucent pale-pink body with the spine faintly visible, unusually large head, eyes reduced to two tiny dark dots beneath the skin, no visible eyeball, in one warm headlamp beam, black water. Photorealistic. |

## 1. UI 절차 (Dreamina 공식 사용법 기준; 당일 UI 재확인)
1. AI 비디오 → 모델 **Seedance 2.5** → **Omni reference** 켜기 (없으면 2.0 → Multiframes)
2. `+` 로 해당 샷의 레퍼런스 업로드(아래 순서대로; 참조 가중치 UI가 있으면 첫 번째 = 최대)
3. 프롬프트 붙여넣기 → 16:9 → 1080p → 길이(10 또는 5) → 생성
4. 결과 저장: `02_생성/S09/9-3_v1.mp4` 형식. `GENERATION_LEDGER.csv`와 `PILOT_SCORECARD.csv`에 차감 크레딧·결과 기록
5. 3회 후 점수표 집계. 통과 기준 미달이면 아래 '1회 수정안'으로 **1회만** 추가 → 그래도 미달이면 중단 보고

## 2. 샷별 복사용 프롬프트

### 9-3 · 랜턴이 켜진다. 이미 포개진 두 손 · 요청 10s · 사용 8s
- 업로드 순서: R-HI-hand.png → R-DS25-hand.png → R-LAKE.png
- 합격 기준(PILOT_SCORECARD 12점 만점): 10점 이상 + 치명 항목(손가락 수 / 손 보임 / 눈알 없음) 2점 필수
```
Pure black. A single warm headlamp switches on. In the small circle of light, resting on the gray rubber boat edge: a young woman's slender five-fingered hand lying still on top of an older man's thick, scarred, calloused five-fingered hand. Neither hand moves. Extreme macro close-up, pure black water beyond. Pitch-black lava cave. Headlamp beams are the only light; everything outside the beams is pure black. Black basalt walls streaked with bone-white calcite. Not a limestone cave: never brighten the whole cave, zero ambient light. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Muted palette of black, warm orange practical light and bone-white. No text, no logos, no subtitles, no lens flare.
```
- 실패 시 1회 수정: 'two hands only, exactly five fingers on each hand, fingers relaxed and slightly apart, woman's hand fully covering the back of the man's hand' 를 첫 문장 뒤에 삽입. 손 레퍼런스 2장만 남기고 R-LAKE 제거.

### 10-7 · 해인의 손이 봉투를 저녁빛 속으로 들어 올린다 (1-5 대칭) · 요청 5s · 사용 4s
- 업로드 순서: R-BAG.png → R-GLOVE.png → R-GATE-dusk.png
- 합격 기준(PILOT_SCORECARD 12점 만점): 9점 이상 + 치명 항목(손가락 수 / 손 보임 / 눈알 없음) 2점 필수
```
Low angle. A young woman's hand grips the top of a clear specimen bag holding a white-crusted yellow glove and lifts it upward into the last blue-orange dusk light above a dark field; the bag is held firmly by the hand the whole time and never floats. Slow tilt up following the hand and bag. Sky behind. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Muted palette of black, warm orange practical light and bone-white. No text, no logos, no subtitles, no lens flare.
```
- 실패 시 1회 수정: 'the hand is visible in frame from the first frame to the last, wrist and sleeve visible, bag hangs from the fingers' 추가. 틸트업 각도를 'slight tilt up'으로 줄임.

### 6-3 · 눈이 퇴화한 물고기 · 요청 10s · 사용 9s
- 업로드 순서: R-FISH.png → R-LAKE.png
- 합격 기준(PILOT_SCORECARD 12점 만점): 9점 이상 + 치명 항목(손가락 수 / 손 보임 / 눈알 없음) 2점 필수
```
Macro shot. A single small pale-pink translucent cave goby, 3.5 cm long, with an unusually large head and eyes reduced to two tiny dark dots buried beneath the skin with no visible eyeball, drifts slowly through a single warm headlamp beam in black water beside a gray rubber boat edge. One fish only, calm, unafraid of the light. Slow tracking with the fish. Pitch-black lava cave. Headlamp beams are the only light; everything outside the beams is pure black. Black basalt walls streaked with bone-white calcite. Not a limestone cave: never brighten the whole cave, zero ambient light. Cinematic live-action realism, 16:9, 24fps, shallow depth of field, subtle film grain. Muted palette of black, warm orange practical light and bone-white. No text, no logos, no subtitles, no lens flare.
```
- 실패 시 1회 수정: 'the head is smooth and eyeless like a newborn, two faint dark specks under translucent skin, no pupils, no iris' 추가. 요청 길이 5초로 단축.

## 3. 계산식과 중단 기준
- 시험 횟수: 3컷 × 3회 = **9회** (+ 수정안 최대 3회 = 12회 상한).
- 크레딧: `1회 단가(결제 화면 실측) × 횟수`. 단가 실측 전 금액은 **미확인**. 참고 환산(공식: Basic 1,575cr ≈ 10초 19편 → ≈83cr/편)으로는 9~12회 ≈ 750~1,000cr(추정).
- **중단**: 9-3이 3회(+1회 수정) 모두 손가락/접촉 실패 → 전체 제작 보류, 대안 컷(어깨 실루엣) 설계 후 재시험. 6-3 실패 → 물고기 컷을 7-2 항아리 디테일로 대체 가능(이야기 손상 중). 10-7 실패 → 10-5 라벨 컷으로 결말 마감(대칭 약화).
- **확대 조건**: 3컷 모두 통과 + 단가 확인 → 07 문서 시나리오 표에 실측 입력 → 상한 승인 후 P0 나머지 7컷 → P1 → P2.