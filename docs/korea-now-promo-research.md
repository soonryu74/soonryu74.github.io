# 방한 외국인 관광객용 혼잡도 PWA — 홍보/유저 획득 채널 리서치

- 조사일: 2026-09-13
- 대상: 1인 사업자, 광고예산 ~0, GitHub Pages 호스팅 PWA, 타깃 = 방한 외국인 관광객
- 원칙: 확인된 1차/공개 출처만 기재. 확인 불가 항목은 **출처 미확보**로 표기.
- 주의: 운영자의 한국어 YouTube 채널(AI 교육, 구독 1만)은 타깃 독자층이 전혀 겹치지 않으므로 본 리서치의 유입 채널 계산에서 제외.

---

## 1. Google Play 등록 (PWA → TWA) 및 Apple App Store

### 1-1. TWA(Trusted Web Activity)로 PWA를 Play에 올릴 수 있는가 — 가능. 구글 공식 경로임

- Android 공식 문서: TWA 콘텐츠는 "trusted" 즉 **앱과 웹사이트가 동일 개발자에게서 나왔음을 Digital Asset Links로 검증**하는 구조.
  - 원문: "Content in a Trusted Web activity is trusted -- the app and the site it opens are expected to come from the same developer. (This is verified using Digital Asset Links.)"
  - 출처: https://developer.android.com/develop/ui/views/layout/webapps/trusted-web-activities
- 품질 기준: "Trusted Web activities need to meet the same Add to Home Screen requirements" (Lighthouse의 "user can be prompted to Add to Home screen" 감사로 확인 가능). 같은 문서.
- 구글이 직접 운영하는 코드랩 "Adding Your Progressive Web App to Google Play" 가 존재 → 정책상 권장 경로임을 시사.
  - 출처: https://developers.google.com/codelabs/pwa-in-play
- 패키징 도구: Bubblewrap (Chrome Labs). Quick Start 가이드:
  - 출처: https://developer.android.com/develop/ui/views/layout/webapps/guide-trusted-web-activities-version2

**중요한 정책 리스크 지점 — "Webviews and Affiliate Spam"**
- Google Play 정책센터 원문: *"We don't allow apps whose primary purpose is to drive affiliate traffic to a website or provide a webview of a website **without permission from the website owner or administrator**."*
  - 출처: https://support.google.com/googleplay/android-developer/answer/9899034
- 해석: 금지 대상은 "**타인 사이트**를 허락 없이 웹뷰로 감싼 앱". 본인 도메인 + Digital Asset Links 검증을 통과한 TWA는 이 조항의 금지 대상이 아님. 즉 **자기 PWA를 TWA로 올리는 것은 2026년 현재도 허용**.
- 추가로 통과해야 하는 것: Spam / Functionality, Content, and User Experience 정책.
  - https://support.google.com/googleplay/android-developer/answer/9898783

> 검증 상태: **검증됨** (TWA 허용 및 정책 문구 모두 1차 출처 확인)

### 1-2. Google Play 개발자 등록비

- **US$25 1회성 등록비**. 원문: "There is a US$25 one-time registration fee".
  - 출처: https://support.google.com/googleplay/android-developer/answer/6112435
- 결제수단: MasterCard, Visa, American Express, Discover(미국), Visa Electron(미국 외). 선불카드 불가.

> 검증 상태: **검증됨**

### 1-3. ★결정적★ 개인 개발자 계정의 비공개 테스트 요건 — 여전히 유효, 단 20명 → 12명

- 공식(Play Console Help) 원문:
  - 적용 대상: "personal Google Play Console accounts created after **November 13, 2023**"
  - 요건: "run a closed test for their app with a minimum of **12 testers** who have been opted in **continuously for at least 14 days**"
  - "At least 12 testers must be opted in to your closed test when you apply for production access"
  - 14일은 **연속**이어야 하며, 테스터가 중간에 opt-out 후 재참여하면 시계가 리셋됨
  - 출처: https://support.google.com/googleplay/android-developer/answer/14151465
- 즉 2023년 신설된 "20명/14일" 요건은 **2024년 12월에 12명으로 완화되었을 뿐 폐지되지 않았고 2026년 현재도 유효**.
  - 20→12 변경에 대한 2차 정리: https://primetestlab.com/blog/google-play-changed-20-to-12-testers
- 적용 단위: **앱 단위**가 아니라 계정 단위로 최초 프로덕션 승인 신청 시 심사(2차 출처는 "앱마다 별도 클로즈드 테스트 필요"라고도 서술). 공식 페이지는 "when you apply for production access"로만 기술.
- **법인(Organization) 계정 및 2023-11-13 이전 개설 개인 계정은 면제** (2차 출처 다수 일치, 공식 페이지는 personal accounts created after Nov 13 2023으로 한정 서술).

**1인 사업자에게 의미**: 사업자등록이 있으면 **Organization(단체) 계정으로 등록하는 편이 12명/14일 요건을 우회하는 가장 현실적인 경로**. 다만 단체 계정은 D-U-N-S 번호 등 추가 검증이 필요함(본 리서치에서 D-U-N-S 요건 1차 출처는 미확인 → 별도 확인 필요).

> 검증 상태: **검증됨** (12명/14일, 적용대상 계정 날짜) / 단체계정 면제 및 D-U-N-S 요건은 **부분검증**

### 1-4. Apple App Store

- **가이드라인 4.2 Minimum Functionality 원문**:
  - "Your app should include features, content, and UI that elevate it beyond a **repackaged website**. If your app is not particularly useful, unique, or 'app-like,' it doesn't belong on the App Store."
  - **4.2.2**: "Other than catalogs, apps shouldn't primarily be marketing materials, advertisements, **web clippings**, content aggregators, or a collection of links."
  - 출처: https://developer.apple.com/app-store/review/guidelines/
- 의미: 단순 PWA 래핑은 4.2/4.2.2로 리젝될 가능성이 매우 높음. 통과하려면 네이티브 내비게이션, 오프라인 동작, 푸시, 기기 연동 등 브라우저 대비 차별 요소가 필요.
- **연회비 US$99** (Apple Developer Program, 매년 갱신).
  - 출처: https://developer.apple.com/programs/enroll/ , https://developer.apple.com/programs/whats-included/
- **Mac 필요 여부: 사실상 필요**.
  - 현재 제출 요건: "Apps uploaded to App Store Connect must be built with **Xcode 26 or later**" — 출처: https://developer.apple.com/news/upcoming-requirements/
  - Xcode는 macOS 전용이며 Xcode 버전별 지원 macOS가 정해져 있음 — 출처: https://developer.apple.com/xcode/system-requirements/
  - 결론: Mac 하드웨어 또는 macOS 클라우드 빌드 환경이 필요.

> 검증 상태: **검증됨** (4.2/4.2.2 원문, $99, Xcode 26 요건)

### 1-5. 실행 권고

Google Play = 비용 대비 유일하게 합리적인 스토어 경로($25 1회 + TWA 무료 툴체인). 개인 계정이면 12명×14일 테스트가 출시 지연의 최대 병목 → 단체 계정 검토. Apple은 4.2 리스크 + $99/년 + Mac 필요 → 초기 보류 권장.

---

## 2. 검색 유입 근거

### 2-1. SPA(JS 렌더링) 페이지의 구글 색인 — 색인은 되지만 지연이 있음 (공식)

Google Search Central 공식 문서 원문:
- 3단계 처리: **crawling → rendering → indexing**
- "a **headless Chromium** renders the page and executes the JavaScript"
- 렌더 큐: "The page may stay on this queue for a few seconds, but **it can take longer than that**", 렌더링은 "Once Google's resources allow" 시점에 수행
- 문서는 서버사이드 렌더링/프리렌더링을 권장 (사용자와 크롤러 모두 빨라짐, 일부 봇은 JS 실행 불가)
- 출처: https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics

**GitHub Pages + SPA 운영자에게 의미**: 클라이언트 렌더링만으로도 색인은 되지만 지연·누락 위험이 있음. 관광지별 페이지(예: `/gyeongbokgung`)는 **정적 HTML로 프리렌더**해서 제목/요금/개장시간/휴무일을 서버 응답 HTML에 직접 포함시키는 것이 검색 유입의 핵심. Bing·DuckDuckGo·SNS 미리보기 크롤러는 JS를 실행하지 않는 경우가 많다는 점도 같은 방향.

> 검증 상태: **검증됨**

### 2-2. 영문 관광 키워드 수요 — 공개 절대 검색량은 미확보, 대체 지표로 위키백과 조회수 제시

- Google Trends는 **절대 검색량을 제공하지 않음**(0~100 상대 지수). 공식 FAQ: https://support.google.com/trends/answer/4365533
- "Gyeongbokgung", "Myeongdong", "Seoul itinerary"의 **월간 절대 검색량**은 Ahrefs/Semrush/Keyword Planner 등 유료·로그인 도구에서만 확인 가능 → 공개 1차 출처 **출처 미확보**.

**대안: 영문 위키백과 월간 조회수 (Wikimedia 공식 API, 누구나 검증 가능)**
기간 2025-08 ~ 2026-07 (12개월), en.wikipedia, all-access, user(봇 제외):

| 문서 | 12개월 합계 | 월평균 |
|---|---|---|
| Jeju_Island | 378,776 | 31,564 |
| Gyeongbokgung | 209,327 | 17,443 |
| N_Seoul_Tower | 50,929 | 4,244 |
| Bukchon_Hanok_Village | 40,512 | 3,376 |
| Myeong-dong | 37,702 | 3,141 |
| Insa-dong | 21,982 | 1,831 |
| Bukhansan | 18,283 | 1,523 |
| (참고) Seoul | 881,042 | 73,420 |

- 취득 방법(재현 가능): `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/user/Gyeongbokgung/monthly/2025080100/2026073100`
- API 문서: https://wikimedia.org/api/rest_v1/
- 해석: 영어권에서 경복궁 단일 문서만 월 1.7만 조회. 실제 구글 검색 수요는 이보다 훨씬 크다고 추정되지만 **추정치는 기재하지 않음**.

> 검증 상태: **검증됨**(위키백과 조회수) / 영문 키워드 절대 검색량은 **출처 미확보**

### 2-3. 한국관광공사의 공식 "구글 검색량" 지표 존재

- 한국관광 데이터랩은 **방한 상위 7개국(일본, 대만, 미국, 홍콩, 필리핀, 베트남, 싱가포르)** 사용자가 각국 언어로 Google에서 한국여행 관련 키워드를 검색한 빈도를 전년도 방한인원 가중치로 지수화한 지표를 제공하며, **월별 방한 외래객 수와 양(+)의 상관관계**를 가진다고 명시.
  - 출처: https://datalab.visitkorea.or.kr/
- 이 지표는 "검색 → 실제 방한"의 연결 고리를 공공기관이 공식 인정한 근거로 인용 가능.

> 검증 상태: **부분검증** (지표 설명은 확인, 구체 수치·키워드 리스트는 로그인/다운로드 필요)

---

## 3. 해외 커뮤니티 규모·규칙

> 참고: Reddit 공식 API/웹은 본 환경에서 403으로 차단됨. 구독자 수는 서드파티 통계, 규칙은 서브레딧 위키 원문으로 교차 확인함.

### 3-1. r/korea

- 구독자: **약 1.4M (1,398,821명, 2026-08-07 기준)** — https://gummysearch.com/r/korea/ , https://redpulse.io/subreddit-search/r/korea/
- 위키 원문 확인: 사이드바/위키가 **Reddit 전역 "Self-Promotion Guidelines"(reddit.com/wiki/selfpromotion)** 와 "What constitutes spam? Am I a spammer?" 헬프 문서를 규칙으로 링크. https://www.reddit.com/r/korea/wiki/ , https://www.reddit.com/r/korea/about/rules
- 서브레딧 자체 규칙 조항의 **축자 원문은 미확보**(about/rules 접근 불가).

> 검증 상태: **부분검증**

### 3-2. r/koreatravel — 앱/도구 홍보에 가장 현실적인 타깃

- 구독자: **약 227,000명 (2026-09-07 기준)** — https://gummysearch.com/r/koreatravel/ . 소개문 "All about Korea Travel - genuine discussions, insider tips, and comprehensive travel maps."
- **위키 원문에 이미 "Useful Sites, Apps, and Resources" 섹션이 존재**하며 Kakao Map, Naver Map, Kakao Taxi, **관광통역안내 1330 앱** 등을 직접 추천. 사이드바에도 KTO 공식 사이트를 리소스로 게시. → **도구·앱 공유가 커뮤니티 규범상 환영되는 구조.** https://www.reddit.com/r/koreatravel/wiki/index
- 다만 자기 홍보 금지 조항의 **축자 원문은 미확보**.

> 검증 상태: **부분검증** (구독자 수·위키 원문 검증됨 / 자기홍보 규칙 조항 원문 미확보)

### 3-3. r/Living_in_Korea — 규칙 원문 확보. 자기 홍보에 매우 엄격

- 구독자: **약 138,000명 (2026-09-07 기준, 전년 대비 +34,000 / +32.9%)** — 출처: https://gummysearch.com/r/Living_in_Korea/
- 규칙 위키 **원문**(https://www.reddit.com/r/Living_in_Korea/wiki/rules) — 4대 원칙: "Treat others with respect. / Stay on-topic. / Provide accurate information. / **Avoid self-serving posts.**" / Disallowed Post Types 중: "Posts which may result in the **transfer of currency, goods, or services** from one person to another", "**Posts written by AI**", "Posts conducting **surveys, polling and/or research**", "IAMAs/AMAs", "Low-content posts or posts containing memes" / Bans: "Bans will be used for: **Spammers, solicitors, and self-interested shills.**" / AMA 예외는 사전 모더레이터 승인 필요 + "**Promotion of a product or service in comments is strictly prohibited.**"
- 결론: **직접 홍보 금지. 무료·비상업 도구라도 사전 모더레이터 문의 외에는 사실상 불가.**

> 검증 상태: **검증됨** (규칙 원문 전문 확인)

### 3-4. Facebook — 한국 여행 대형 그룹

- "South Korea Travel Planning" (facebook.com/groups/southkoreatravelplanning/) — **약 185,000명 이상**
  - 그룹 URL: https://www.facebook.com/groups/southkoreatravelplanning/
  - 운영 블로그: https://koreatravelplanning.com/ ("a great resource to enable you to ask questions about your upcoming trip to South Korea"로 소개하나 **멤버 수는 블로그에 미기재**)
  - 멤버 수 185K는 2차 출처(검색 결과 스니펫) 기반 → **부분검증**
- 기타 대형 그룹(멤버 수 미확인): "South Korea Travel Tips and Planning"(/groups/southkoreatravel/), "Korea Travel Guide"(/groups/koreatravelguide/), "South Korea Travel Guide: Seoul & Beyond", "Epic Adventures In Korea"
- **그룹 규칙 원문은 로그인 없이는 조회 불가 → 출처 미확보.**

> 검증 상태: **부분검증**(멤버 수) / **출처 미확보**(그룹 규칙)

### 3-5. 커뮤니티에서 도구/앱 공유가 허용되는 조건 (관찰된 공통 패턴)

- r/koreatravel처럼 **위키가 이미 앱 리스트를 운영**하는 곳은, "질문에 대한 답변으로 도구를 언급" 형태가 규범에 부합.
- r/Living_in_Korea처럼 "self-serving / solicitors" 금지 조항이 명시된 곳은 **사전 모더레이터 승인 없이는 금지**.
- Reddit 전역 가이드라인(각 서브레딧이 링크하는 문서): https://www.reddit.com/wiki/selfpromotion (본 환경에서 원문 접근 불가 → 조항 축자 인용은 **출처 미확보**)

---

## 4. 국가별 플랫폼

### 4-1. 샤오홍슈 (小红书 / RED / Xiaohongshu)

- **MAU**: 자사 공개 기준 **4억 명 이상(2026년 5월 시점)**, 2025년에는 3억 명대로 보도. 2차 출처: https://www.statista.com/statistics/1327421/china-xiaohongshu-monthly-active-users/ , https://fashionchinaagency.com/latest-xiaohongshu-rednote-statistics-2026/
- **해외 사업자 계정 운영: 가능**. 요건 — 기업/회사 선택 후 'Business Entity Type'에서 **'Overseas Entity'** 선택, **본국 사업자등록증** 제출(중/영이 아니면 공증 번역본), 법인 대표자 신분증(여권 등), 인증번호 수신용 휴대전화번호, 심사 3~5영업일. https://www.octoplusmedia.com/can-you-register-for-xiaohongshu-as-a-hong-kong-or-overseas-company-without-a-mainland-chinese-business-license/ , https://www.dragontrail.com/resources/blog/how-to-register-for-xiaohongshu-account-from-overseas
- **비용(2026)**: 해외 법인 기업계정(Blue V) 인증 수수료 **약 US$300**. 커머스 스토어는 보증금 US$3,500~8,000(업종별) — **커머스가 불필요하면 인증비 수준**. https://halotechmedia.sg/blog/xhs-business-account/
- **한국 여행 콘텐츠 규모의 공개 통계: 출처 미확보.**

> 검증 상태: **부분검증** (MAU·해외계정 가능 여부는 다수 2차 출처 일치, 1차 공시는 미확보 / 한국여행 콘텐츠 규모는 출처 미확보)

### 4-2. 일본인 여행자가 쓰는 SNS

**(a) 일본 전체 SNS 이용률 — 総務省 令和7年版 情報通信白書 (2026년 6월 발표)**

- 전 연령 이용률: **LINE 92.9% / YouTube 81.5% / Instagram 48.5% / X(구 Twitter) 44.7%**
- 연령별: X는 20대 78.0%, 10대 62.1%, 30대 61.6%, 40대 48.7%. Instagram은 20대 78.6%, 여성 54.8% > 남성 42.3%.
- 출처: https://www.soumu.go.jp/johotsusintokei/whitepaper/ja/r07/html/nd111120.html (원문 페이지는 인코딩 문제로 직접 추출 실패, 백서 인용 2차 정리: https://www.comnico.jp/we-love-social/sns-users )

**(b) 일본인의 여행정보 입수 경로 — 한국관광공사 데이터랩 리포트**

- SNS 이용률 (ICT총합연구소, 2022.5.17): LINE 79.5% / YouTube 62.0% / Twitter 55.9% / Instagram 52.9% / Facebook 24.6% / TikTok 19.7%
- **젊은층(15~25세) 여행정보 입수경로 (라쿠텐그룹, 2022.8.9)**: **Instagram 62.8% / 검색사이트 54.8% / 여행정보 종합사이트 45.5%**
- SHIBUYA109 엔터테인먼트(15~24세, 2022.6.14): Instagram 인지경로 72.5% / 입수경로 52.5%, 동영상서비스 53.8% / 28.5%, Twitter 46.5%
- 출처: https://datalab.visitkorea.or.kr/site/portal/ex/bbs/View.do?cbIdx=1132&bcIdx=301407

**(c) 한국관광공사 공공데이터 — 국가별 해외여행 활용 SNS/동영상 플랫폼**

- 데이터셋: "한국관광공사_국가별 해외여행 활용 SNS 및 동영상플랫폼_20250915"
- 제공기관 한국관광공사, 등록 2025-09-15 / 수정 2025-09-17
- 내용: 미국·중국·일본·태국 등 주요국, 플랫폼별 1~5순위, 성별, 연령대(15~39 / 40+), 응답률(%)
- 조사대상: "해외 거주 중인 만 15세 이상 일반 외국인"
- 활용 목적 명시: "**(잠재) 관광객을 대상으로 하는 홍보 채널 파악에 활용**"
- 출처: https://www.data.go.kr/data/15149395/fileData.do
- → **국가별 홍보 채널 선정의 가장 직접적인 무료 공식 근거. 다운로드해서 일본/대만/미국 행만 뽑으면 채널 우선순위가 바로 나옴.**

> 검증 상태: **부분검증** (일본 SNS 이용률은 백서 인용 2차 출처 / 데이터랩·공공데이터 항목은 검증됨, 단 데이터랩 수치는 2022년 자료)

### 4-3. 방한 국가별 관광객 수 (2025년 연간 확정)

- **총 1,894만 명** (2019년 대비 108.2%)
- 중국 **548만** (2019 대비 77.4%)
- 일본 **365만** (119.4%)
- 대만 **189만** (181.4% — 주요시장 중 최고 회복률)
- 미국 **148만** (136.5%)
- 홍콩 **62만** (95.1%)
- 출처: 한국관광공사 2026-01-30 발표 / https://www.ajunews.com/view/20260130103801235
- 원자료: https://datalab.visitkorea.or.kr/ , https://know.tour.go.kr/

**채널 우선순위 시사점**: 영어권(미국 148만)보다 중국(548만)·일본(365만)·대만(189만)이 절대 규모에서 압도. 다만 중국은 샤오홍슈, 일본·대만은 Instagram/X 중심으로 채널이 완전히 분리됨. 영어 UI 하나로는 절반 이상의 시장에 닿지 않음.

> 검증 상태: **검증됨**

---

## 5. 한국관광공사·정부 지원

### 5-1. 관광벤처사업 — 2026년 모집 **진행됨**

- **제18회 예비관광벤처 사업 공모** — 모집 **2026-04-29(수) 10:00 ~ 2026-05-15(금) 15:00**, 지원 **기업당 3,000만~7,000만 원** + 멘토링·컨설팅·교육·네트워킹·투자유치 육성프로그램, 자격은 공고일 기준 **사업자등록증이 없는** 예비/재창업자, 주관 한국관광공사(운영사무국 ㈜탭엔젤파트너스). 출처: https://www.venturesquare.net/announcement/1079264
- 직전 회차(2025년 제16회): 초기부문 업력 3년 이내 창업자 **4,000만~8,000만 원**, 예비부문 3,000만~7,000만 원. 신청은 관광산업포털 **투어라즈(touraz.kr) 개인회원** 온라인 접수. https://www.bizinfo.go.kr/web/lay1/bbs/S1T122C128/AS/74/view.do?pblancId=PBLN_000000000104702 (초기) , ...104703 (예비)
- 2026년 초기부문 사업 자체는 문체부 입찰공고로 확인: "2026년 초기관광벤처 지원사업 및 지역 실증(BETTER里) 연계 통합운영" — https://www.mcst.go.kr/site/s_notice/notice/bidView.jsp?pSeq=17800

**1인 사업자에게 의미**: **이미 사업자등록이 있으면 예비부문 대상이 아님 → 초기부문(업력 3년 이내) 트랙**. 홍보비를 직접 지원받을 수 있는 가장 큰 규모의 공식 채널.

> 검증 상태: **검증됨** (제18회 예비부문) / 2026 초기부문 공고 상세는 **부분검증**

### 5-2. 관광데이터 활용 공모전 2026 — **진행됨**

- **웹·앱 개발 부문** — 시상 총 22팀: **대상 1,000만 원(문체부 장관상)**, 최우수상 300만 원(관광공사 사장상), 우수상 100만 원×10팀, 장려상 50만 원×10팀. 참가자격 **국내 거주자 누구나**(개인 또는 최대 5명 팀). 필수조건 **한국관광공사 관광데이터·OpenAPI 활용**, 10개 지정과제 중 1개 선택. 접수(보도) 2026-07-06 ~ 07-21 16:00, 한국관광콘텐츠랩 온라인 접수. https://www.devtimes.co.kr/news/503409
  - ※ 다른 공고에서는 웹·앱 부문 접수를 2026-03-30 ~ 05-06 16:00으로 표기 → **출처별 일정 상충. 공식 공고 재확인 필요.** https://www.culture.go.kr/portal/cltBnf/cltSup/view.do?viewTp=3&rcrtSn=216134
- **생성형 AI 활용 관광 프롬프톤 부문**: 접수 2026-05-07 ~ 05-20 16:00, 우수상 100만 원×10팀 — https://dacon.io/forum/416700 / OpenAPI 포털 https://api.visitkorea.or.kr/

**1인 사업자에게 의미**: 본 앱이 이미 관광공사 OpenAPI(관광지 정보·요금·휴무일)를 쓰고 있다면 **개발 추가 비용 없이 그대로 출품 가능**. 수상 시 상금 + 문체부/관광공사 보도자료 노출 = 사실상 무료 PR.

> 검증 상태: **검증됨**(상금·자격·필수조건) / **부분검증**(접수 일정 — 출처 간 불일치)

### 5-3. VISITKOREA에 외부 서비스가 소개되는 경로 — **VK 얼라이언스**

- **2026 VISITKOREA(VK) 얼라이언스 회원사 모집** (2026년 2월 공고, 3년차 사업) — 모집 2026년 2월 27일까지 **15개사 내외 선발**. 신청 자격 "여행업계는 물론 **민간 플랫폼, 이종산업 등 다양한 분야의 기업**". 신청은 **한국관광산업포털 '투어라즈'(touraz.kr)**. 지원 내용: 회원사 상품·서비스 맞춤형 **홍보 콘텐츠 제작 + 8개 국어 번역·감수**, VK 웹/앱/SNS 및 공사 **해외지사** 활용 브랜드 인지도 제고, 제휴 프로모션 온·오프라인 홍보·판촉(연말까지 단계별). **VK 규모: 연간 방문자 3,300만 명, SNS 팔로워 370만 명, 8개 국어.**
  - 출처: https://www.newsis.com/view/NISX20260203_0003500837 , https://www.gukjenews.com/news/articleView.html?idxno=3496905 , https://www.newspim.com/news/view/20260203000139
- 선례: **"한국관광 필수 앱 얼라이언스"**(2024-10-07 출범, 7개사 — 네이버, 카카오모빌리티, 와드, 셔틀, 크리에이트립, 오렌지스퀘어, Visa). VisitKorea 플랫폼에서 **11월 1일부터 1개월간 특별 페이지 운영** + 할인코드 + 인플루언서 협업 마케팅. https://traveli.net/news/view.php?no=11231
- VisitKorea 자체 규모: 2008년 개설, 8개 국어, 연평균 1,500만 방문 — https://en.wikipedia.org/wiki/VisitKorea.or.kr

**1인 사업자에게 의미**: **0원 예산 대비 가장 ROI가 높은 공식 채널**. 대기업 위주로 보이지만 공고문상 자격은 "다양한 분야 기업"으로 열려 있음. 매년 초(1~2월) 투어라즈 공고를 반드시 체크.

> 검증 상태: **검증됨**

### 5-4. 창업진흥원·중기부 1인 창업 홍보/마케팅 지원

- **1인 창조기업 활성화 지원사업**(창업진흥원) — 대상 "**1인 창조기업 육성에 관한 법률 제2조**에 해당하는 1인 창조기업 또는 예비 1인 창조기업". 지원: 사무공간(1인 창조기업 지원센터 입주) + 세무·회계·법률·**마케팅** 경영지원, 교육·멘토링, 네트워킹, 판로·투자유치. https://www.kised.or.kr/menu.es?mid=a10203050000
- **1인 창조기업 마케팅 지원사업 세부관리기준** 문서 존재(홍보/마케팅비 직접 지원 근거) — https://www.kised.or.kr/prePubDetail/index.es?mid=a10103010000&prePubId=31 . **지원 한도 금액은 미확인 → 출처 미확보**
- 2026년 공고는 센터별 개별 모집(K-Startup 게시). 상반기 입주기업 모집 공고 확인 — https://startupinfo.net/support/312775 / 통합공고 "2026년 중앙부처 및 지자체 창업지원사업" https://www.bizinfo.go.kr/sii/siia/selectSIIA200Detail.do?pblancId=PBLN_000000000116904 / 포털 https://www.k-startup.go.kr/

> 검증 상태: **부분검증** (사업 존재·대상·지원 범주는 확인 / **마케팅비 지원 한도 금액은 출처 미확보**)

---

## 6. 오프라인 접점

### 6-1. 관광안내소

- **전국**: 공공데이터 "**전국관광안내소표준데이터**" 존재(소관 문화체육관광부, 제공 지자체, 수정 2026-06-22). 항목에 안내소명·위치·하절기/동절기 운영시간·**외국어(영/일/중) 안내 가능 여부**·휴무일·평균 근무인원·좌표 포함. 페이지에 "172개 기관" 표기(전체 레코드 수인지 제공기관 수인지 불분명). → **총 개소 수는 출처 미확보**(CSV/API 카운트 필요). 출처: https://www.data.go.kr/data/15013112/standard.do
- **서울**: "서울시 관광안내소(표준 데이터)" — 제공 **서울관광재단 관광인프라팀(02-3788-0882)**, 최초 2021-01-12, 메타 수정 2025-03-12, 월 1회 갱신. **총 행 수 미표기 → 출처 미확보**. https://data.seoul.go.kr/dataList/OA-20350/S/1/datasetView.do , 사본 https://www.data.go.kr/data/15119368/fileData.do
- **인천국제공항**: T1 3층 일반지역/면세지역(중앙 8번 출입구·25번 게이트·29번 게이트 부근) 및 1층 일반지역 10번 출입구 부근 안내데스크. **면세지역은 24시간 운영**, 그 외 07:00~22:00. T1 **교통센터 지하1층 중앙에 Travel Center**. → "관광안내소"로 명시된 개소 수는 **출처 미확보**. https://www.airport.kr/ap_ko/1008/subview.do , https://www.airport.kr/ap_ko/974/subview.do

> 검증 상태: **부분검증** (데이터셋 존재·항목·운영시간 확인 / 개소 수는 **출처 미확보**)

### 6-2. 게스트하우스·호스텔 수

- **외국인관광도시민박업(게스트하우스 성격)**: 2025-06-20 기준 **누적 등록 8,534명, 정상 영업 6,134명(71.9%)**, 서울 3,869명(63.1%). 원자료는 행정안전부 지방행정인허가데이터(localdata.go.kr). 집계: https://www.wehome.me/trust/ko/report-urbanstay-202506/ (직전 2024-08-20 기준: 등록 5,825 / 정상영업 3,611(62%) / 서울 2,295(63.3%) — https://www.wehome.me/trust/ko/report-urbanstay-202408/ )
- **관광사업체 전체(2023-12-31, e-나라지표)**: 총 38,712개(전년비 +10.6%). 여행업 19,463 / 관광객이용시설업 8,684 / 관광편의시설업 3,667 / 유원시설업 2,866 / **관광숙박업 2,591** / 국제회의업 1,424 / 카지노업 17. → 호스텔업 단독 수는 미분리 → **출처 미확보**. https://www.index.go.kr/unity/potal/main/EachDtlPageDetail.do?idx_cd=1651
- 호스텔업 원자료 위치(xlsx 다운로드 필요): 문체부 "2025년 기준 관광숙박업 등록현황" 첨부 `25년 12월 31일 기준 관광숙박업 통계(최종)_공개용.xlsx` — https://www.mcst.go.kr/site/s_policy/dept/deptView.jsp?pSeq=2122&pDataCD=0417000000&pType=05 (2024년판: pSeq=1985)

**1인 사업자에게 의미**: 정상 영업 중인 도시민박 6,134곳 중 서울 3,869곳 — **QR 카드/스티커 배포 대상으로 주소·좌표가 공개된 리스트가 localdata.go.kr에 무료로 존재**. 오프라인 접점 중 가장 데이터가 잘 잡히는 채널.

> 검증 상태: **검증됨**(외도민업 수치, 관광사업체 총계) / **출처 미확보**(호스텔업 단독 수)

### 6-3. 외국인 관광객의 여행정보 획득 경로 비율

- **외래관광객조사(한국문화관광연구원)의 "정보획득경로" 항목별 비율은 본 리서치에서 확보 실패 → 출처 미확보.** 보고서 https://know.tour.go.kr/stat/fReportsOfForeignerDis19Re.do / 원자료 https://know.tour.go.kr/stat/fRawDataDownloadDis19Re.do / 2024 확정치 https://datalab.visitkorea.or.kr/site/portal/ex/bbs/View.do?cbIdx=1127&bcIdx=309193 / 설문지에 해당 문항 존재 https://know.tour.go.kr/stat/fQuestionnaireOfForeignerDis19Re.do
- 2024년 외래관광객조사 관련 수치(2차 출처): **재방문율 54.7%**, 방문목적 여가·위락·휴식 **68.0%**, 한국 관심 계기 **한류 콘텐츠 38.3%** — https://www.kcti.re.kr/ (본 리서치 시점 503 오류로 원문 미확인)
- 대체 가능한 공식 자료: 4-2(c) 한국관광공사 "국가별 해외여행 활용 SNS 및 동영상플랫폼" 데이터셋. 서울 한정으로는 "2024 서울관광 실태조사(외국인)" 보고서·통계표·원자료 공개 — https://www.sto.or.kr/survey/15390_/15390

> 검증 상태: **출처 미확보** (보고서 PDF/원자료 직접 열람 필요)

---

## 7. 기타 등재처

### 7-1. Product Hunt

- 등록 조건: 계정 생성 후 상단 **Submit → New Product**. 제품 URL(직접 사용/다운로드 가능한 랜딩·홈페이지), 제품명, **60자 이내 태그라인** 필요. **self-hunt(본인 제품 직접 등록) 허용**. 최대 1개월 전 예약 가능(권장 화/수 00:01 PST). 공식: https://www.producthunt.com/launch , https://www.producthunt.com/launch/preparing-for-launch / 2차 정리 https://getlaunchlist.com/blog/how-to-launch-on-product-hunt-2026
- **핵심 금지 규칙: 업보트를 직접 요청하는 것 금지**("cannot ask people directly to upvote"). 방문·댓글 요청은 허용.
- **한국 제품 사례**: Typed가 국내 최초 Product of the Day, 이어 2022-11-15 국내 두 번째 일간 1위 달성 보도. 스냅덱은 일간 5위. https://brunch.co.kr/@melvinkang/1 , https://www.recatch.cc/ko/blog/product-hunt-product-of-the-week-open-launch/ , https://www.venturesquare.net/959939 — **2025~2026년 한국 제품 1위 사례는 출처 미확보**

> 검증 상태: **검증됨**(등록 조건·금지 규칙) / **부분검증**(한국 사례, 2022년 기준)

### 7-2. 여행앱 디렉터리 / "Korea travel app" 추천 목록 매체

- 검색 상위를 점유하는 것은 레거시 매체가 아니라 **개인 블로그·OTA 블로그**. 확인된 대표 목록형 콘텐츠:
  - Klook 공식 블로그 "10 Best South Korea Travel Apps Every Tourist Needs in 2026" — https://www.klook.com/blog/best-korea-apps-for-travel/
  - South Korea Hallyu "38 Best Korea Phone Apps for Travellers" — https://southkoreahallyu.com/south-korea-phone-apps/
  - "Best Apps for Traveling in Seoul 2026" — https://www.seoultourism.org/seoul-travel-apps/
  - Middle Class SG, Away to the City, JustKTravel 등 다수. → **등재 표준 경로는 공개되지 않음. 개별 이메일 피칭이 현실적.**
- **레거시 매체 접촉처**: Time Out Seoul — 발행사 Mediabling Co., Ltd (서울 용산구 이태원동 172-2 덕흥빌딩 3F), Tel +82-2-794-4926, 2015-05 창간, 한/영/중 월간 무가지 + 온라인/앱 (https://www.timeoutkorea.kr/seoul/ko/contact-us , https://www.timeout.com/seoul/about-us) / The Korea Herald — 1953 창간 영자지, 용산구 후암로4길 10 헤럴드스퀘어 (https://en.wikipedia.org/wiki/The_Korea_Herald) / 보도자료 배포 Korea Newswire (https://en.wikipedia.org/wiki/Korea_Newswire). **세 곳 모두 "앱 소개 기사 제보 절차" 공식 문서는 출처 미확보.**
- 가장 현실적인 등재처: **r/koreatravel 위키의 "Useful Sites, Apps, and Resources" 섹션** (이미 1330 앱 등 등재). 모더레이터에게 위키 편집 요청 가능 — https://www.reddit.com/r/koreatravel/wiki/index

> 검증 상태: **부분검증** (매체·목록 존재는 확인 / 등재 경로는 **출처 미확보**)

---

## 우선순위 요약 (근거 강도 순)

| 순위 | 채널 | 근거 강도 | 비용 | 병목 |
|---|---|---|---|---|
| 1 | 검색(프리렌더 정적 페이지) | 검증됨 (Google 공식 JS 색인 지연 문서 + 위키 조회수) | 0원 | SPA → 정적 HTML 전환 작업 |
| 2 | VK 얼라이언스 (관광공사) | 검증됨 (연 3,300만 방문 / 8개 국어 / 번역 무상) | 0원 | 매년 1~2월 투어라즈 공고 |
| 3 | 관광데이터 활용 공모전 | 검증됨 (상금 최대 1,000만 + 정부 보도) | 0원 | OpenAPI 활용 필수 |
| 4 | r/koreatravel (22.7만) | 부분검증 (위키가 앱 리스트를 운영 중) | 0원 | 자기홍보 규칙 원문 미확인 |
| 5 | Google Play TWA | 검증됨 | $25 | **개인계정 12명×14일 테스트** |
| 6 | 관광벤처사업 초기부문 | 검증됨 (4,000만~8,000만) | 0원 | 업력 3년 이내 |
| 7 | 게스트하우스 오프라인(6,134곳) | 검증됨 (주소 공개 데이터 존재) | 인쇄비 | 인력 |
| 8 | 샤오홍슈 (중국 548만 방한) | 부분검증 | 약 $300 | 해외법인 인증 |
| 9 | Product Hunt | 검증됨 | 0원 | 타깃 불일치(개발자 대상) |
| 10 | Apple App Store | 검증됨 | $99/년 + Mac | 4.2 리젝 위험 |

## 후속 확인이 필요한 항목 (전부 출처 미확보)

1. 외래관광객조사 "여행정보 획득 경로" 항목별 비율 — know.tour.go.kr 보고서 PDF 직접 열람
2. 전국/서울 관광안내소 총 개소 수 — 표준데이터 CSV 카운트
3. 호스텔업 단독 등록 업체 수 — 문체부 관광숙박업 통계 xlsx
4. 1인 창조기업 마케팅 지원사업 지원 한도 금액 — 세부관리기준 문서
5. r/korea·r/koreatravel 자기홍보 규칙 축자 원문 — Reddit 로그인 필요
6. Facebook "South Korea Travel Planning" 정확한 멤버 수 및 그룹 규칙 — Facebook 로그인 필요
7. 영문 키워드("Gyeongbokgung" 등) 절대 월간 검색량 — Google Keyword Planner 계정 필요
8. Google Play 단체(Organization) 계정의 D-U-N-S 번호 요건 및 12명 테스트 면제 여부 — Play Console 공식 문서 재확인
9. 2026 관광데이터 활용 공모전 웹·앱 부문 접수 일정 (출처 간 불일치: 3/30~5/6 vs 7/6~7/21)
10. 샤오홍슈 내 한국여행 콘텐츠 규모 공개 통계
