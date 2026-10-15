# 목장 나눔터 — 서버 쪽 (Supabase 프로젝트 `dxhmprqfgigljgbstqrg`)

화면(`gajeong/*.html`)은 GitHub Pages로, 아래 두 함수와 데이터베이스는 Supabase에 따로 올린다.

| 파일 | 어디에 | 무엇 |
|---|---|---|
| `migration-002-multichurch.sql` | 데이터베이스 | 교회 단위 분리, 초대 코드, 알림 구독, 기도제목 중복 정리 |
| `church-admin.ts` | Edge Function `church-admin` (verify_jwt 끔) | 새 교회 등록, 목자·목사 계정, 비밀번호, 삭제 — 모두 같은 교회 안에서만 |
| `church-notify.ts` | Edge Function `church-notify` (verify_jwt 끔) | 목자가 일기를 제출하면 같은 교회 목사 기기로 웹 푸시 |

## 올리는 순서 (순서가 중요하다)

1. **데이터베이스** — `migration-002-multichurch.sql`
   - 2026-10-15에 모두 적용했다. 정책은 `drop/create` 대신 `alter policy`로 나눠 넣었다(한 번에 넣으면 시간 초과).
   - 2절(교회 범위 RLS)이 들어가기 전에는 새 교회를 만들면 안 된다. 예전 규칙은 "목사면 모든 목장"이라 다른 교회 목사에게 보인다.
   - 적용 전 백업: `church_bak_20261015_*`, 중복 정리 직전 `church_bak_20261015b_prayer`.
2. **알림 키** — 따로 넣을 것 없음. `church-notify`가 처음 불릴 때 VAPID 키 한 쌍을 만들어
   `church_secret` 표(RLS 켜짐, 정책 없음 → 서버만 읽음)에 둔다. 화면은 `{action:'key'}`로 공개키를 받아 구독한다.
   함수 비밀값 `VAPID_PUBLIC_KEY`·`VAPID_PRIVATE_KEY`를 넣으면 그쪽이 먼저 쓰인다(바꾸면 기존 구독은 다시 켜야 한다).

   ```sql
   create table public.church_secret (name text primary key, value text not null, updated_at timestamptz not null default now());
   alter table public.church_secret enable row level security;
   revoke all on public.church_secret from anon, authenticated;
   ```
3. **함수** — `church-admin`, `church-notify` 배포 (둘 다 verify_jwt 끔, 함수 안에서 직접 확인)
4. **초대 코드** — `church_invite` 표에 한 줄 넣는다. 이 코드를 받은 교회만 새로 등록할 수 있다.
5. **화면** — main에 합친다.

## 확인

- `gajeong/test/run.js` — 가짜 서버로 화면 흐름 42가지 (교회 표시, 교회별 시간대, 교회 간 격리, 새 교회 등록, 중복 저장, 알림 켜기·끄기·시험, 아이폰 안내, 알림 눌러 일기 열기, 교회 정보 고치기)
- 실제 서버(2026-10-15): 시험 교회를 만들어 다른 교회 목장·일기·계정·교회 정보에 손댈 수 없음, 같은 기도제목 세 번 넣어도 한 줄,
  초안은 알림 안 감, 제출 알림 1번·한 시간 안 재제출은 건너뜀, 끊긴 기기 구독은 자동 삭제를 확인했다.
- 웹 푸시 암호화(aes128gcm)와 VAPID 서명은 `web-push@3.6.7`로 만들고, 받는 쪽 키로 직접 풀어 확인했다.
