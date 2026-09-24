# 눈치 Nunchi — MVP

외국인 학습자용 한국어 학습 LLM 프로토타입. 문법 정오답이 아니라 **관계·상황(화용)** 을 다루는 것이 차별점.

## 화면 3개
1. **관계 다이얼** — 한 문장이 친구/선배/동료/모르는 사람/사장님에게 각각 어떻게 바뀌는지 5단계 동시 출력.
2. **상황 롤플레이** — 병원 접수, 편의점 첫 알바, 집주인 통화, 팀장 보고. 대화 중에는 교정하지 않음(발화 불안 감소 우선). TOPIK 급수로 모델 출력 어휘 상한을 제한.
3. **복기 카드** — 대화 종료 후 최대 5장. `WRONG`(문법 오류)과 `ODD`(문법은 맞지만 한국인은 안 쓰는 표현)를 구분.

## 과교정 억제
LLM은 학습자 문장을 통째로 고쳐 쓰는 경향이 있다(과교정). 그래서 교정안을 **음절 가방(bag of syllables)** 으로 원문과 비교해, 바뀐 비율이 45%를 넘으면 카드에서 뺀다.
편집거리가 아니라 음절 구성으로 재는 이유: `배가 아파요 어제부터 → 어제부터 배가 아파요` 같은 **어순 교정은 편집거리로는 89% 변경으로 잡히지만 실제로는 한 글자도 안 바뀐 것**이고, 이런 카드가 우리 제품의 핵심이기 때문이다. 어휘를 새로 갈아끼우는 진짜 과교정만 걸러진다.

## 1단계 — 지금 상태 (서버 없음)
정적 파일 하나. 빌드 없음. `nunchi/index.html`을 열면 끝.
모델 호출은 학습자 본인의 Gemini API 키(무료 등급)를 쓰고, 키는 브라우저 localStorage에만 저장된다. 키가 없어도 예시 데이터로 화면 전체가 돌아간다.

## 2단계 — 서버 프록시 (키 숨김 + 로그 적재)
`nunchi/server/index.ts` 가 대신 모델을 호출하고 `nunchi_turns` 에 대화를 남긴다. 기기당 하루 호출 상한(`NUNCHI_DAILY_LIMIT`, 기본 120)이 걸려 있다.
켜는 방법은 한 줄 — `nunchi/index.html` 상단의 상수만 채우면 API 키 버튼이 사라지고 자동으로 서버 모드가 된다.

```js
const PROXY = 'https://<프로젝트>.supabase.co/functions/v1/nunchi';
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
모델 호출을 가로채 앱 로직만 검증한다. API 키가 없어도 돌아가고, 서버 모드까지 함께 확인한다.

```bash
npm i playwright && npx playwright install chromium   # 처음 한 번 (맥·윈도우 동일)
node nunchi/test/run.js
```

## 다음 단계
- 영역별(듣기·읽기·쓰기·화용) 분리 진단, 복습 큐.
- 국립국어원 한국어 학습자 말뭉치(오류 주석, 1,588만 어절)로 오류 유형 카드 풀과 평가셋 구축.
- 쌓인 `nunchi_turns` 로 한국어 화용 평가 전용 소형 모델 파인튜닝.
