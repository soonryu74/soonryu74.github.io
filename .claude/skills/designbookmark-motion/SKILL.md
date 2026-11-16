---
name: designbookmark-motion
description: DesignBookmark Motion(https://designbookmark.com/motion)의 스프링 기반 애니메이션 UI 컴포넌트 82종을 프로젝트에 넣는 디자인 스킬. 사용자가 "모션 넣어줘", "애니메이션 버튼/입력창/탭/카드 만들어", "스프링 애니메이션", "쫀득한/말랑한 인터랙션", "디자인북마크 모션", 또는 Pull cord·Goo menu·Jelly slider·Morph island 같은 컴포넌트 이름을 말할 때 사용한다. 버튼·입력·내비게이션·카드·AI·텍스트 모션을 원본 스프링 값 그대로 재현한다.
---

# DesignBookmark Motion

출처: https://designbookmark.com/motion — "살아 움직이는 애니메이션 컴포넌트" 82종.
이 스킬은 **목록·주소·스프링 규칙**만 담는다. 컴포넌트 코드는 쓸 때마다 원본 주소에서 읽어 온다(항상 최신, 원작자 표기 유지).

## 작업 순서

1. `references/catalog.md`에서 컴포넌트를 고른다. 사용자가 이름을 안 정했으면 분류(Buttons / Inputs / Navigation / Cards / AI / Text)에서 2~3개를 추천하고 고르게 한다.
2. 출처에 맞게 코드를 읽는다(아래 "출처별 가져오는 법").
3. 사용자 프로젝트를 먼저 살핀 뒤, **프로젝트가 이미 쓰는 기술**(React, Vue, Svelte, 순수 HTML 등)로 다시 만든다.
4. **스프링 값(stiffness, damping)은 원본 그대로** 유지한다. 움직임이 같아야 한다.
5. 색·글꼴·모서리 반경은 사용자 프로젝트 것으로 바꾸고, 데모 문구는 실제 제품 문구로 바꾼다.
6. 넣을 위치를 사용자가 말하지 않았으면 페이지에 추가하기 전에 묻는다.
7. 실행해서 동작을 확인하고, 어디서 볼 수 있는지 쉬운 말로 알려 준다.

## 출처별 가져오는 법

| 출처 | 읽을 곳 | 비고 |
|---|---|---|
| DesignBookmark (HTML/CSS/JS, 50개) | `https://designbookmark.com/motion-src/<slug>/index.html` + 옆의 CSS·JS, 공용 `https://designbookmark.com/motion-src/shared/` (`tokens.css`, `base.css`, `motion.js`) | 의존성 없음. `<slug>`는 id에서 `db-`를 뺀 값 |
| DesignBookmark (React, 1개) | `https://designbookmark.com/motion-src/react/command-button.tsx` | React 한 파일, Tailwind v4, `motion` 패키지 |
| Kokonut UI (25개, MIT) | 카탈로그의 문서 주소 | React+Tailwind면 `npx shadcn@latest add https://kokonutui.com/r/<id>.json` |
| SmoothUI (6개, MIT) | 카탈로그의 문서 주소 | React+Tailwind면 `npx shadcn@latest add https://smoothui.dev/r/<id>.json` |

- 한 파일로 합쳐진 코드: `https://designbookmark.com/motion-src/code/<id>.txt` (모든 출처 공통, 가장 빠르다).
- 미리보기: `https://designbookmark.com/motion#<id>`.
- `npx` 명령은 맥(터미널)·윈도우(PowerShell) 동일하다.
- shadcn 설치가 실패하면 문서 페이지의 코드를 components 폴더에 복사하고 import하는 패키지를 설치한다.

## 스프링 규칙 (공용 프리셋)

스프링은 `"stiffness damping"` 한 쌍이다. 새 컴포넌트는 이 프리셋에서 시작하고, 꼭 다른 느낌이 필요할 때만 값을 추가한다.

| 프리셋 | 값 | 쓰임 |
|---|---|---|
| follow | 900 50 | 포인터가 잡고 있는 것 — 오버슛·지연 없음 |
| settle | 280 22 | 놓을 때, 값에 안착 — 작은 오버슛 한 번 |
| soft | 260 24 | 큰 이동 — 패널, 시트 |
| lead | 620 36 | 늘어나는 하이라이트의 앞쪽 가장자리 |
| trail | 190 19 | 늘어나는 하이라이트의 뒤쪽 가장자리(늦게 따라와서 늘어남을 만든다) |
| pop | 520 16 | 선택 시 아이콘·숫자 튀어오름 |
| fade | 420 32 | 투명도, 작은 슬라이드 |
| stagger | 45ms | 항목이 차례로 들어올 때 간격 |

컴포넌트별 세부 값(Rubber dock, Goo menu, Morph island 등)은 원본 `tokens.css`에서 읽는다.

### 엔진 동작 방식

- 스프링 상태 `{x, v, t, k, c}`: 위치·속도·목표·stiffness·damping.
- 매 프레임: `a = -k·(x−t) − c·v`, `v += a·dt`, `x += v·dt`.
- `dt`는 최대 1/30초로 자르고, 한 프레임을 4번으로 쪼개 계산한다(안정성).
- `prefers-reduced-motion`이면 damping을 `2·√k`(임계 감쇠)로 바꿔 튕김을 없앤다. 재구현할 때도 반드시 지킨다.
- React의 `motion` 패키지로 옮길 때는 `{ type: "spring", stiffness, damping }`에 같은 숫자를 넣는다.

## 디자인 규칙 (원본 토큰)

- 테두리선·그림자 없음. 면의 밝기 차이로만 구분한다.
- 안쪽 반경 = 바깥 반경 − 둘 사이 여백. 기본 단계: 6 / 12 / 14 / 18 / 24 / 28px, 알약형 999px.
- 다크·라이트 두 테마 모두 지원한다.
- 위 값들은 원본 데모 기준이다. 실제 적용 시에는 사용자 프로젝트의 색·글꼴·반경이 우선한다.

## 주의

- DesignBookmark 자체 컴포넌트(HTML/CSS/JS)는 사이트에 라이선스가 명시돼 있지 않다. 코드를 통째로 재배포하지 말고, 사용자 프로젝트에 맞게 다시 구현한다.
- Kokonut UI·SmoothUI 코드는 MIT이며, 원작자 표기 주석을 지우지 않는다.
- 주소를 읽을 수 없으면(네트워크 차단 등) 추측으로 만들지 말고 사용자에게 알린다.
