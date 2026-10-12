# 「3초 뒤의 나」 대본·콘티·제작 프롬프트

길이 59초 · 세로 9:16 · 자막은 편집에서 텍스트로 얹기 (AI 그림에 글자 넣지 않기)

## 1. 설정

- 주인공: 서울의 중학생, 교복과 후드 차림. 이름은 화면에 쓰지 않음.
- 얼굴 노출 최소: 뒷모습, 옆모습, 손, 폰 화면 위주. 정면은 마지막 장면 한 컷만.
- 배경: 서울 도심 횡단보도, 비 오는 하굣길 계단, 밤 골목, 마지막에 남산 방향 서울 풍경.
- 색: 현재는 따뜻한 낮 톤, "3초 뒤" 시뮬레이션은 푸른 홀로그램 톤, 위험 순간은 붉은 테두리.
- AI 시뮬레이션 창: 푸른 홀로그램 패널, 카운트다운 3-2-1.
- 충돌·부상 장면은 보여 주지 않음. 급정거, 미끄러지기 직전, 경고창까지만.

## 2. 장면표

| 시간 | 장면 | 화면 | 효과음·음악 | 자막 |
|---|---|---|---|---|
| 0~4초 | 훅 | 횡단보도 앞, 폰을 보며 한 발 내딛는 순간 모든 것이 정지, 푸른 홀로그램 창이 뜸 | 삐— 정지음, 낮은 베이스 | 3초 뒤의 나 |
| 4~14초 | 미래 1 교통 | 홀로그램 3-2-1, 그대로 걸으면 급정거하는 차량과 경적, 붉은 테두리 | 경적, 급제동음, 심장박동 | 교통 · 폰 보며 걷기 |
| 14~24초 | 미래 2 일상 | 비 오는 하굣길, 이어폰과 폰, 계단에서 발이 미끄러지기 직전 | 빗소리, 이어폰 새는 음악 | 일상 · 빗길 하굣길 |
| 24~36초 | 미래 3 온라인 | 밤 골목, 낯선 계정의 메시지와 링크, 누르려는 엄지, AI 경고창이 화면을 덮음 | 알림음, 낮은 긴장음 | 온라인 · 낯선 링크와 요청 |
| 36~46초 | 되감기 | 시간이 되감기고, 학생이 폰을 내리고 고개를 듦, 신호 초록, 차가 멈추고 안전하게 건넘 | 되감기 효과음, 밝은 전환 | (자막 없음) |
| 46~56초 | 메시지 | 학생이 카메라를 보며 미소, 뒤로 서울 풍경이 펼쳐짐 | 밝은 피아노 + 신스 | AI는 3초 뒤를 보여 줄 수 있어요 / 바꾸는 건 지금의 나예요 |
| 56~59초 | 타이틀 | 검정 배경 + 공모전 문구와 사용 AI 표기 | 여운 있는 한 음 | BIG: Beyond Imagination, Grow! |

## 3. 내레이션 대본

차분한 청소년 또는 젊은 여성 목소리. 말은 적게, 호흡 길게.

| 구간 | 대사 |
|---|---|
| 0~4초 | "잠깐. 3초만." |
| 4~14초 | "이대로 건너면, 3초 뒤의 나는." |
| 14~24초 | "이어폰을 낀 채 비 오는 계단을 내려가면." |
| 24~36초 | "모르는 사람이 보낸 링크를 누르면." |
| 36~46초 | "그래서 지금, 멈춰요." |
| 46~56초 | "AI는 3초 뒤를 보여 줄 수 있어요. 바꾸는 건, 지금의 나예요." |

- 미래 1·2·3 구간에서 학생의 목소리는 쓰지 않고, AI 시뮬레이션 음성(낮고 담담한 톤)으로 나눠도 좋음.
- 총 대사 약 85자 이내로 유지.

## 4. 장면별 생성 프롬프트 (영어, 도구 공통)

공통 접두어: `cinematic vertical 9:16, Seoul city, realistic, soft film grain, shallow depth of field, Korean middle-school student in school uniform and hoodie, shot mostly from behind or side, face not shown,`

| 장면 | 프롬프트 |
|---|---|
| 1 훅 | 공통 접두어 + `standing at a pedestrian crossing looking down at a smartphone, one foot stepping forward, time frozen, floating blue holographic interface appearing in the air, warm daylight` |
| 2 교통 | 공통 접두어 + `blue holographic countdown 3-2-1, a car braking hard at a crosswalk, red warning border glowing, motion blur, near miss, no collision` |
| 3 일상 | 공통 접두어 + `rainy afternoon, wet stairs, student with earbuds looking at phone, foot slipping slightly on the step, blue hologram warning icon, no injury` |
| 4 온라인 | 공통 접두어 + `dark alley at night, close-up of thumb about to tap a suspicious link on a phone, holographic red warning shield covering the screen, cool blue tones` |
| 5 되감기 | 공통 접두어 + `rewind effect, student lowers the phone and looks up, pedestrian light turns green, cars stopped, student crosses safely, warm light` |
| 6 메시지 | 공통 접두어 + `student turns to camera with a gentle smile, Seoul skyline with Namsan Tower in the background, golden hour, hopeful mood` |

생성 순서
1. 장면 1의 주인공 한 컷을 기준 이미지로 확정.
2. 나머지 장면은 기준 이미지를 참조해 이미지 투 비디오로 생성.
3. 클립은 3~6초, 장면당 4회 이상 뽑아 최선 선택.
4. 얼굴이 흔들리는 클립은 뒷모습·손 클로즈업으로 대체.

## 5. 편집 지침

- 자막 글꼴은 굵은 고딕 한 종류, 하단 안전 영역(위아래 15%) 피하기.
- 미래 1·2·3은 같은 구성으로 반복해 리듬을 만들기: 카운트다운, 위험 순간, 붉은 정지.
- 되감기 구간은 역재생 + 색 톤을 푸른색에서 따뜻한 색으로 전환.
- 효과음은 저작권 걱정 없는 무료 음원이나 AI 생성 음원만 사용하고 출처를 기록.
- 마지막 타이틀에 사용한 AI 도구 이름을 작게 표기.

## 6. 작품 설명문 (신청서용, 약 200자)

> 「3초 뒤의 나」는 AI가 보여 주는 가까운 미래를 통해 청소년의 일상 안전을 이야기하는 59초 영상입니다. 폰을 보며 걷기, 비 오는 하굣길, 낯선 링크라는 세 가지 장면에서 AI가 "3초 뒤의 나"를 먼저 보여 줍니다. 결말은 위험이 아니라 선택입니다. 학생이 잠깐 멈추면 미래가 바뀝니다. AI는 위험을 알려 주는 도구이고, 안전을 지키는 것은 지금의 나라는 메시지를 담았습니다.

## 7. 제출 서류 입력 초안

| 항목 | 내용 |
|---|---|
| 작품명 | 3초 뒤의 나 |
| 분야 | 교통, 일상 안전, AI와 그리는 미래의 안전 |
| 형태 | 개인 |
| 영상 길이 | 59초 |
| 사용 AI | (제작 후 기재: 이미지, 영상, 음성, 음악 도구와 버전) |
| 성명·연락처·거주지 | 직접 기재 (개인정보라 이 문서에 쓰지 않음) |

## 8. 남은 확인 사항

- 안내문 hwp의 영상 규격과 심사 기준을 보고 위 구성을 조정.
- 서울시민 증빙이 필요한지 확인.
- 사용 도구의 약관에서 공모전 응모 등 상업 외 활용이 가능한지 확인.
