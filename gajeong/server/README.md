# 목장 나눔터 — 서버 쪽 (Supabase 프로젝트 `dxhmprqfgigljgbstqrg`)

화면(`gajeong/*.html`)은 GitHub Pages로, 아래 두 함수와 데이터베이스는 Supabase에 따로 올린다.

| 파일 | 어디에 | 무엇 |
|---|---|---|
| `migration-002-multichurch.sql` | 데이터베이스 | 교회 단위 분리, 초대 코드, 알림 구독, 기도제목 중복 정리 |
| `church-admin.ts` | Edge Function `church-admin` (verify_jwt 끔) | 새 교회 등록, 목자·목사 계정, 비밀번호, 삭제 — 모두 같은 교회 안에서만 |
| `church-notify.ts` | Edge Function `church-notify` (verify_jwt 끔) | 목자가 일기를 제출하면 같은 교회 목사 기기로 웹 푸시 |

## 올리는 순서 (순서가 중요하다)

1. **데이터베이스** — `migration-002-multichurch.sql`
   - 1절(교회 표·소속 표시)은 2026-10-15에 적용했다. 2절부터 적용한다.
   - 2절(교회 범위 RLS)이 들어가기 전에는 새 교회를 만들면 안 된다. 예전 규칙은 "목사면 모든 목장"이라 다른 교회 목사에게 보인다.
   - 적용 전 백업: `church_bak_20261015_*` 표.
2. **비밀값** (Edge Function Secrets): `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`
   - 공개키는 `gajeong/common.js`의 `VAPID_PUBLIC`과 같아야 한다. 비밀키는 저장소에 두지 않는다.
3. **함수** — `church-admin`, `church-notify` 배포 (둘 다 verify_jwt 끔, 함수 안에서 직접 확인)
4. **초대 코드** — `church_invite` 표에 한 줄 넣는다. 이 코드를 받은 교회만 새로 등록할 수 있다.
5. **화면** — main에 합친다.

## 확인

- `gajeong/test/run.js` — 가짜 서버로 화면 흐름 42가지 (교회 표시, 교회별 시간대, 교회 간 격리, 새 교회 등록, 중복 저장, 알림 켜기·끄기·시험, 아이폰 안내, 알림 눌러 일기 열기, 교회 정보 고치기)
- 웹 푸시 암호화(aes128gcm)와 VAPID 서명은 `web-push@3.6.7`로 만들고, 받는 쪽 키로 직접 풀어 확인했다.
