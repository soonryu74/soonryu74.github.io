# 효과 목차 — 한 장 (기획 때는 이것만 읽는다)

세기: 1 가벼움 · 2 보통 · 3 셈(봉우리에만) · 비용: 가 = 가벼움 · 무 = 무거움(짧게 쓴다) · 등급: ✓ 실사용 확인 · β 실험(키트에서는 ✓ 우선)
쓰는 법 상세: 카메라 · 편집 → `camera.md` · 효과 사전 → `effects.md` · 시간 조작 → `time.md` · 키트 → `kits.md`
**읽는 순서**: ②-B 키트 고르기 = `kits.md` · ④ 효과 계획 = **이 한 장** · ⑦ 코드 = 고른 것의 상세만(전부 읽지 않는다). 상세 문서는 «쓰는 법 · 함정»이고 목록은 여기 하나다.

## 1. 컷 전환 (장면 ↔ 장면) — `camera.EDITS` · 키트의 `K.edit`
| 이름 | 한 줄 | 세기 | 비용 | 등급 |
|---|---|:-:|:-:|:-:|
| cut | 그냥 컷 — 박자에 맞추면 가장 세다 | 1~3 | 가 | ✓ |
| dissolve | 겹치며 바뀜 | 1 | 가 | ✓ |
| dip | 검정(또는 흰색)으로 꺼졌다 켜짐 | 1 | 가 | ✓ |
| flash | 흰 번쩍 | 3 | 가 | ✓ |
| blur_cut | 흐려졌다 바뀜 | 1 | 가 | β |
| push | 밀어내기 (dir) | 1 | 가 | ✓ |
| cover · reveal | 덮기 · 걷어내기 (dir) | 1 | 가 | β |
| stretch | 늘어나며 밀기 | 1~2 | 가 | β |
| cube | 정육면체 돌리기 | 2 | 보통 | β |
| tiles | 타일 뒤집기 | 2 | 가 | β |
| drop | 떨어져 튀기 | 2~3 | 가 | β |
| blinds · clock · slice | 블라인드 · 시계 바늘 · 띠 | 2 | 가 | β |
| zoom_cut | 한 점으로 빨려 들어가며 바뀜 | 2 | 보통 | ✓ |
| zoom_blur | 방사형 흐림 | 2~3 | 무 | β |
| impact | 쾅 착지 (다가감 → 번쩍 → 흔들리며 내려앉기) | 3 | 보통 | β |
| spin_cut | 돌며 바뀜 | 2 | 보통 | β |
| burn | 불타듯 번짐 | 2 | 무 | β |
| glitch · rgb_split · pixelate | 글리치 · 색 갈라짐 · 모자이크 | 2~3 | 가 | β |
| whip · zoom_through | 휩 팬 · 줌 스루 (효과 사전) | 2 · 3 | 보통 | ✓ |
| iris · split · leak · bubble · page | 아이리스 · 분할 · 빛 · 말풍선 · 페이지 (효과 사전 — 손으로 부른다) | 2 | 보통 | β |

## 2. 카메라 (장면 안 · 요소는 그대로) — `camera.py`
장면마다 «화면이 바뀔 만큼» 움직이는 카메라 하나 이상 · 끝 화면 = 전체 · 요소 가운데 · 이유 있는 삼분할 (camera.md §3-B) · 흐르기 · 밀고 들어가기 · 빠지며 공개 · 시선 옮기기는 모든 키트의 기본
| 이름 | 한 줄 | 세기 | 등급 |
|---|---|:-:|:-:|
| 밀고 들어가기 · 빠지며 공개 | full ↔ on(요소) | 1~2 | ✓ |
| 훑기 · 시선 옮기기 | 큰 아트보드 위 · A → B | 1 | ✓ |
| 끊어 다가가기 · 점프 컷 | 같은 시각 두 번 = 컷 | 2 | ✓ |
| 천천히 흐르기 | 머무는 동안 (drift) | 1 | ✓ |
| 손에 든 카메라 · 기울기 | handheld · rot | 1~2 | ✓ |
| 빠른 줌 | 짧은 keys + mblur | 3 | ✓ |
| 초점 옮기기 | defocus | 1 | ✓ |
| 깊이 | parallax + appear off | 1 | β |

## 3. 오브젝트 애니 (카메라 고정 · 요소가 움직임)
| 갈래 | 이름 (함수) | 세기 | 등급 |
|---|---|:-:|:-:|
| 등장 | fade · up/down/left/right · pop · zoom(내려앉기) · wipe · type_text(한 자씩) · lines(줄마다) — `appear` | 1~2 · zoom 3 | ✓ |
| 등장 | blur_in · spin_in · flip_in — `motion` | 1~2 | β |
| 퇴장 | appear.out(거꾸로) ✓ · burst_out(터지기) · scatter_out(흩어지기) — `motion` β | 1~2 | |
| 머무는 동안 | float_(둥실) · breathe(숨쉬기) · blink(깜빡) · pulse(맥박) — `motion.put` 과 함께 | 1 | β |
| 강조 | underline · highlight(형광펜) — `motion` | 1 | β |
| 강조 | punch_zoom · word_slam · callout · hand_circle · arrow_draw · spotlight · shine · burst · shake · sparkles · strike_swap — `fx` (effects.md) | 2~3 | ✓ |
| 정보 | bar_chart · donut · timeline · checklist · slot_number · karaoke_words — `fx` | 2 | ✓ |
| 그림 공개 | ink_reveal · draw_reveal · slider · card_deck · page_flip_box · text_window · magnifier — `fx` | 2 | ✓ |

## 4. 킥 장치 (한 편에 하나가 출발점)
| 이름 | 한 줄 | 세기 | 등급 |
|---|---|:-:|:-:|
| 아니지~ 다시 | A 쌓기 → 삐! ✕ → 되감기 → 같은 출발점에서 B | 3 | ✓ |
| 결과 먼저 → 되감기 · 멈추고 짚기 · 쾅 직전 슬로 · 빨리 감기 · 되감고 바꿔 보기 · 멈춘 채 카메라만 · 끝에서 처음으로 · 앞뒤 흔들기 · 닿을 듯 → 제자리 | `timewarp` (time.md) | 2~3 | β |
| 매치 컷 | 앞뒤 장면 같은 자리 · 같은 모양 → 컷 | 2 | ✓ |

## 5. 화면 겹 · 소리
| 갈래 | 이름 | 등급 |
|---|---|:-:|
| 화면 겹 (`finish`) | grain · vignette · scan · paper · grade(warm · cool · fade · punch · mono) · glow | β |
| 효과음 (`audio`) | whoosh · hit · chime · tick · mallet · bell · buzzer(timewarp) | ✓ |
| 배경음 | palette pop · cinema · study · tale · groove · calm … | ✓ |

## 보태는 법 (엔진을 늘릴 때 — 문서가 흩어지지 않게)
1. 코드: 갈래에 맞는 모듈 하나에 — 컷 전환 = `camera.py` + `EDITS` · 카메라 = `camera.py` · 등장 · 머무는 동안 = `appear.py`(✓) / `motion.py`(β) · 요소 효과 · 정보 · 그림 공개 = `fx.py` · 화면 겹 = `finish.py` · 시간 = `timewarp.py`. 새 모듈은 갈래가 새로 생길 때만.
2. 이 목차에 **한 줄**(이름 · 한 줄 · 세기 · 비용 · 등급 β). 쓰는 법이 한 줄로 안 끝나면 그 갈래의 상세 문서에 한 줄 더.
3. 키트에 넣을 만하면 `kit.py` KITS 의 칸에 — 전환이면 `DUR` 에 길이도.
4. 실사용 영상에서 좋았으면 β → ✓ (이 목차 · 키트 등급 둘 다).
⛔ 같은 효과를 두 모듈에 두지 않는다 · 기획 문서(review-voice · plan-format)에 효과 목록을 다시 적지 않는다(여기를 가리킨다).
