# 중보기도 나눔터 (`/jungbo/`)

기독교 모임의 중보기도 웹앱. 긴급기도를 올리면 알림을 켠 식구들 휴대폰에 웹 푸시가 바로 가고,
이어서 카카오톡 단톡방에는 공유 창으로 한 번 눌러 알린다. 식구들은 글을 눌러 **기도했어요 · 이모지 · 댓글**로 마음을 전한다.

## 왜 카카오톡 자동 전송이 아닌가
카카오톡은 외부 시스템이 단톡방에 자동으로 글을 쓰는 공식 API를 제공하지 않는다(메시지 API는 1회 5명·쿼터·권한 심사, 알림톡은 채널+템플릿 심사+유료).
그래서 **① 웹 푸시(자동) + ② 카카오 공유 창(한 번 누름)** 조합으로 만들었다. 모임이 커지면 알림톡을 2단계로 붙일 수 있다.

## 방 구조 (몇 백 명 규모)
- 모임(공동체) 안에 **방**: 그룹(1~12그룹) · 기수(1~6기) · 공통(room_id 없음). 한 사람이 여러 방에 속한다 (그룹 하나 + 기수 하나)
- 글은 방 하나에 올리고 **누가 볼까요?**를 고른다: 방 식구 모두 / 인도자만 / 나만(비밀 기도)
- 인도자 두 층: 전체 인도자(`pray_member.role='leader'`, 목회자) · 방 인도자(`pray_room_member.role='leader'`)
- 알림: 공통 글은 모임 전체, 방 글은 그 방 식구에게. '인도자만'은 전체 인도자 + 방 인도자에게. '나만'은 아무에게도
- 화면: 탭 아래 방 알약(전체 · 공통 · 내 방들)로 거른다. 초대 주소로 들어올 때 그룹·기수를 고른다
- SQL: `server/schema-2-rooms.sql` (1차 `schema.sql` 위에 적용)

## 생김새 — "조용한 예배당"
- 시간에 따라 하늘빛이 바뀐다: 새벽(복숭아) · 낮(미색) · 노을(호박) · 밤(짙은 상록 + 별 + 금빛). 메뉴에서 밤 모드 고정 가능
- 첫 화면에 날마다 바뀌는 짧은 말씀 한 구절
- **기도의 불빛**: [기도했어요]를 누른 사람 수만큼 글에 작은 촛불이 켜진다 (누르면 빛이 퍼지고 살짝 진동)
- 긴급은 빨간 경보 대신 천천히 숨 쉬는 불꽃 띠
- 글을 열면 "지금 N명이 이 기도 앞에 함께 있어요" (Supabase Realtime presence, 안 되면 조용히 숨김)

## 구조
| 파일 | 하는 일 |
|---|---|
| `index.html` `app.js` `style.css` | 화면 전체 (한 페이지). 로그인 없이 **열쇠 코드**(12자)로 사람을 알아본다 |
| `sw.js` `manifest.webmanifest` | 웹 푸시 수신 · 홈 화면 추가 |
| `server/schema.sql` `server/schema-2-rooms.sql` | Supabase 표(`pray_*`)와 RPC 함수. 표는 RLS로 잠그고 RPC(security definer)만 연다. 2차는 방·공개 범위 |
| `server/pray-notify.ts` | Edge Function `pray-notify` (verify_jwt=false): 올림·댓글·기도했어요·응답 알림. VAPID 키는 `pray_secret`(처음 한 번 자동 생성) |
| `test/run.js` | Playwright 흐름 검사 (실제 서버에 시험 모임을 만들고 끝나면 지운다) |
| `안내.txt` | 단톡방에 올리는 안내문 |

Supabase 프로젝트: `jungbo-prayer` (kagqgfcpvpcyosexdhsz, 서울) — 다락방 나눔터(korea-now)와 별도.

## 배포
- 화면: 이 저장소(GitHub Pages) → `https://soonryu74.github.io/jungbo/`
- DB: `server/schema.sql`을 Supabase SQL 편집기(또는 MCP `apply_migration`)로 적용
- 함수: `server/pray-notify.ts`를 `pray-notify` 이름, `verify_jwt=false`로 배포

## 검사
```
python3 -m http.server 8899 &   # 저장소 루트에서
node jungbo/test/run.js
```
