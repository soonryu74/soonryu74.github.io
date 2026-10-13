# 눈치 Nunchi — MVP

외국인 학습자용 한국어 학습 LLM 프로토타입. 문법 정오답이 아니라 **관계·상황(화용)** 을 다루는 것이 차별점.

## 화면 4개
1. **관계 다이얼** — 한 문장이 친구/선배/동료/모르는 사람/사장님에게 각각 어떻게 바뀌는지 5단계 동시 출력.
2. **상황 롤플레이** — 8장면: 병원 접수, 편의점 첫 알바, 집주인 통화, 팀장 보고, 부동산 계약, 회식 자리, 택배 문의 전화, 면접. 대화 중에는 교정하지 않음(발화 불안 감소 우선). TOPIK 급수로 모델 출력 어휘 상한을 제한.
3. **복기 카드** — 대화 종료 후 최대 5장. `WRONG`(문법 오류)과 `ODD`(문법은 맞지만 한국인은 안 쓰는 표현)를 구분.
4. **복습 큐** — 복기에서 살아남은 카드는 자동으로 기기(localStorage)에 저장되고 간격 반복으로 돌아온다. 처음엔 바로, 그다음 1 → 3 → 7 → 14 → 30일. 학습자가 쓴 원문만 먼저 보여 주고, 「답 보기」 뒤에 「다시」(처음으로, 오늘 다시) / 「기억했어요」(한 단계 위). 계정·서버 없음.

## UI 언어
기본은 영어(외국인 학습자용). 오른쪽 위 버튼으로 한국어 UI로 전환되며 선택은 `nunchi.lang`에 저장된다. 브라우저 언어가 한국어면 처음부터 한국어.
고정 문구는 `data-i18n` 속성 + `T` 사전, 동적 문구는 `t()`로 처리한다. 모델에게 시키는 설명(`why`)도 UI 언어를 따라간다(영어 UI → 영어 설명, 한국어 UI → 한국어 설명).

## 과교정 억제
LLM은 학습자 문장을 통째로 고쳐 쓰는 경향이 있다(과교정). 그래서 교정안을 **음절 가방(bag of syllables)** 으로 원문과 비교해, 바뀐 비율이 45%를 넘으면 카드에서 뺀다.
편집거리가 아니라 음절 구성으로 재는 이유: `배가 아파요 어제부터 → 어제부터 배가 아파요` 같은 **어순 교정은 편집거리로는 89% 변경으로 잡히지만 실제로는 한 글자도 안 바뀐 것**이고, 이런 카드가 우리 제품의 핵심이기 때문이다. 어휘를 새로 갈아끼우는 진짜 과교정만 걸러진다.

## 1단계 — 정적 (서버 없음) · 완료
정적 파일 하나. 빌드 없음. `nunchi/index.html`을 열면 끝.
`PROXY` 상수를 비우면 이 모드다. 모델 호출은 학습자 본인의 Gemini API 키(무료 등급)를 쓰고, 키는 브라우저 localStorage에만 저장된다. 키가 없어도 예시 데이터로 화면 전체가 돌아간다.

### 모델 (2026-10 기준)
기본 모델은 글·대화용 정식 모델 `gemini-3.8-flash`다.

| 이름 | 상태 | 눈치에서의 처리 |
|---|---|---|
| `gemini-omni-flash-preview` | 2026-10-22 호출 차단 | `gemini-3.8-flash`로 보냄 |
| `gemini-omni-1.1-flash` | 구글이 적은 위 모델의 대체. **영상 생성 모델**이라 대화·JSON 불가 | `gemini-3.8-flash`로 보냄 |
| `gemini-2.5-flash` | 기존 사용자만 접근. 새 키는 404 | `gemini-3.8-flash`로 보냄 |

Gemini 3 계열은 기본으로 사고(thinking)하고 사고 토큰이 출력 한도에 포함된다. 그래서 `thinkingLevel: low`를 넣고 대화 출력 한도를 1024로 둔다.
`temperature`는 Gemini 3에서 지원이 끝나 보내지 않는다. 구글 이전 안내가 temperature·top_p·top_k를 빼라고 하고, 1.0 아래로 내리면 반복이나 품질 저하가 생길 수 있다고 적는다.
`thinkingLevel`은 3 이전 모델에서 오류이므로 그런 모델을 직접 고르면 예전 설정(temperature 포함)으로 보낸다.

## 2단계 — 서버 프록시 (키 숨김 + 로그 적재) · 연결됨
`nunchi/server/index.ts` 가 대신 모델을 호출하고 `nunchi_turns` 에 대화를 남긴다. 기기당 하루 호출 상한(`NUNCHI_DAILY_LIMIT`, 기본 120)이 걸려 있다.
`nunchi/index.html` 상단의 상수가 채워져 있어 지금은 서버 모드다. API 키 버튼은 숨겨진다.

```js
const PROXY = 'https://dxhmprqfgigljgbstqrg.supabase.co/functions/v1/nunchi';   // korea-now 프로젝트
```

배포 상태 (2026-10-13)

| 항목 | 상태 |
|---|---|
| 테이블 `nunchi_turns`, `nunchi_quota`, 함수 `nunchi_bump_quota` | 마이그레이션 `nunchi` 적용됨 |
| Edge Function `nunchi` (verify_jwt 끔) | 배포됨, v1 |
| 시크릿 `GEMINI_API_KEY` | **아직 없음** — 넣기 전까지 앱은 "서버에 모델 키가 아직 없어요" 안내를 띄운다 |

### 키 넣기 — 둘 중 하나만
함수는 Edge Function 시크릿을 먼저 보고, 없으면 같은 프로젝트의 `app_secrets` 테이블(name = `GEMINI_API_KEY`)을 본다.

**방법 A · 대시보드 SQL (CLI 설치 없음)** — Supabase 대시보드 → SQL Editor:
```sql
insert into public.app_secrets (name, value) values ('GEMINI_API_KEY', '<발급받은키>')
on conflict (name) do update set value = excluded.value, updated_at = now();
```

**방법 B · CLI** — 맥·윈도우 명령 동일:
```bash
supabase secrets set GEMINI_API_KEY=<발급받은키> --project-ref dxhmprqfgigljgbstqrg
```

### 배포 명령어 (맥 / 윈도우)

Supabase CLI 설치 — 2026년 9월 기준

| | 맥 (터미널) | 윈도우 (PowerShell) |
|---|---|---|
| 설치 | `brew install supabase/tap/supabase` | `scoop bucket add supabase https://github.com/supabase/scoop-bucket.git` 그다음 `scoop install supabase` |
| 확인 | `supabase --version` | `supabase --version` |

> 윈도우에 scoop이 없으면 PowerShell에서 먼저
> `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser` → `irm get.scoop.sh | iex`
> 맥에 brew가 없으면 `/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"`

배포는 맥·윈도우 명령이 같다. 프로젝트 폴더에서:

```bash
# 이 저장소에는 supabase 설정이 없다(별도 저장소로 분리됨).
# supabase 프로젝트 폴더에서 아래처럼 붙여 넣고 배포한다.
mkdir -p supabase/functions/nunchi
cp <이-저장소>/nunchi/server/index.ts supabase/functions/nunchi/index.ts
cp <이-저장소>/nunchi/server/schema.sql supabase/migrations/0003_nunchi.sql

supabase login
supabase link --project-ref <프로젝트-ref>
supabase db push                                  # 테이블 생성
supabase secrets set GEMINI_API_KEY=<발급받은키>
supabase functions deploy nunchi --no-verify-jwt
```

동작 확인 — 맥은 `curl`, 윈도우 PowerShell은 `curl.exe`(그냥 `curl`은 PowerShell 내장 별칭이라 따옴표 처리가 달라진다):

```bash
# 맥 / 리눅스
curl -s -X POST "https://<프로젝트>.supabase.co/functions/v1/nunchi" \
  -H "Content-Type: application/json" \
  -d '{"mode":"chat","system":"한국어로 한 문장만 답하세요.","prompt":"안녕하세요"}'
```
```powershell
# 윈도우 PowerShell
curl.exe -s -X POST "https://<프로젝트>.supabase.co/functions/v1/nunchi" `
  -H "Content-Type: application/json" `
  -d '{\"mode\":\"chat\",\"system\":\"한국어로 한 문장만 답하세요.\",\"prompt\":\"안녕하세요\"}'
```

## 테스트
모델 호출을 가로채 앱 로직만 검증한다. API 키가 없어도 돌아간다. `index.html`에는 배포된 `PROXY`가 들어 있으므로 테스트는 `PROXY`만 바꾼 임시 사본 두 개(1단계 빈 값, 2단계 가짜 서버)로 돈다.
검증 범위: 관계 다이얼, 8장면 롤플레이, 복기 카드 + 과교정 억제, 복습 큐(저장·간격·다시·삭제·중복 방지·새로고침 유지), 실패 경로, 한국어 UI 전환, 서버 모드(키 미전송·상한·키 미설정 안내).

```bash
npm i playwright && npx playwright install chromium   # 처음 한 번 (맥·윈도우 동일)
node nunchi/test/run.js
```

## 다음 단계
- `GEMINI_API_KEY` 투입 후 실제 대화 로그 확인.
- 영역별(듣기·읽기·쓰기·화용) 분리 진단.
- 복습 큐를 서버(`device` 기준)로 옮겨 기기 간 동기화.
- 국립국어원 한국어 학습자 말뭉치(오류 주석, 1,588만 어절)로 오류 유형 카드 풀과 평가셋 구축.
- 쌓인 `nunchi_turns` 로 한국어 화용 평가 전용 소형 모델 파인튜닝.
