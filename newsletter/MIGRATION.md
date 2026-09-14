# healthbrief 로 주소 옮기기

지금 주소: `https://soonryu74.github.io/newsletter/`
옮길 주소: **`https://healthbrief.github.io`**

## 1. 조직 만들기 (무료)

1. <https://github.com/organizations/new> 접속 → **Free** 선택
2. Organization name에 `healthbrief` 입력 (이미 쓰는 사람이 있으면 `healthbrief-kr` 등으로)
3. 이메일 확인 후 생성

## 2. 저장소 만들기

1. 조직 화면에서 **New repository**
2. 이름을 정확히 **`healthbrief.github.io`** 로 (조직명과 같아야 루트 주소가 됩니다)
3. **Public** 선택 → Create

## 3. 파일 올리기

`dist/healthbrief/` 폴더의 내용을 **저장소 루트에** 올립니다(폴더째가 아니라 안의 파일들).

| 올라가는 것 | 내용 |
|---|---|
| `index.html` | 뉴스레터 메이커 |
| `subscribe.html`, `subscribe-config.json` | 구독 신청 |
| `paper.css`, `email.js`, `vendor/` | 서식·메일·QR |
| `issues/`, `samples/` | 발간본과 원본 |
| `data/sources.json`, `data/feed.json` | 소스 목록과 수집분 |
| `scripts/` | 수집·발간 스크립트 |
| `.github/workflows/newsletter.yml` | 매일 새벽 5시 자동 수집 |

웹에서 올리려면: 저장소 화면 → **Add file → Upload files** → 폴더째 끌어다 놓기.

## 4. Pages 켜기

Settings → **Pages** → Source: `Deploy from a branch`, Branch: `main` / `/ (root)` → Save.
몇 분 뒤 `https://healthbrief.github.io` 에서 열립니다.

## 5. 주소가 다르면 한 줄만 고치기

`site-config.json` 의 `baseUrl` 만 실제 주소로 바꾸고,
`python3 scripts/render_newsletter_issues.py` 를 한 번 돌리면
구독 링크와 QR이 모두 새 주소로 다시 만들어집니다.

```json
{ "baseUrl": "https://healthbrief.github.io" }
```

## 옮긴 뒤

- 지금 주소(`soonryu74.github.io/newsletter`)는 그대로 둬도 되고, 안내 문구만 남겨 두어도 됩니다.
- 나중에 도메인(예: `healthbrief.kr`)을 사면 Settings → Pages → Custom domain 에 넣고
  `site-config.json` 의 baseUrl 만 바꾸면 됩니다.
