# AI 도구를 민감한 종교·선교 목적에 쓸 때의 데이터 노출 위험과 오프라인 대안 (2026년 9월 기준 조사)

- 조사일: 2026-09-06. 웹 검색 및 1차 출처(각 사 정책 페이지·도움말·투명성 보고서) 확인.
- 표기 원칙: 1차 출처에서 직접 확인한 내용만 "확인"으로 적고, 2차 매체 보도만 있는 항목은 "(2차 보도)"로, 확인하지 못한 항목은 **미확인**으로 표기했다. 추측은 넣지 않았다.
- 정책은 자주 바뀐다. 각 항목의 출처 URL을 열어 최신 문구를 다시 확인하고 쓰기 바란다.

---

## 1. 주요 AI 서비스의 대화 데이터 보관·학습 정책 (2026년 현재)

### 1-1. ChatGPT (OpenAI)

| 구분 | 내용 |
|---|---|
| 도구/정책 | **Free/Plus**: 기본적으로 대화가 모델 학습에 사용될 수 있으며, 설정 → Data Controls → "Improve the model for everyone"을 꺼야 제외된다. **Team/Business/Enterprise/Edu/API**: 기본적으로 학습에 사용하지 않는다. API는 자격 요건을 충족하는 조직에 한해 무보관(Zero Data Retention) 옵션 제공. |
| 삭제 | 삭제한 대화·임시 채팅(Temporary Chat)은 30일 이내에 시스템에서 삭제(법적 예외 시 제외). 임시 채팅은 학습에 쓰이지 않으나 남용 감시 목적의 검토는 가능. |
| 2025년 법원 명령 후 현황 | 2025년 5월 NYT 저작권 소송에서 "모든 출력 로그를 보존·분리 보관"하라는 명령이 내려졌고, 2025년 10월 9일 Ona T. Wang 판사가 향후 로그 보존 의무를 해제(9월 26일부로 종료). 단, NYT가 지목한 계정 관련 데이터는 계속 보존해야 한다. OpenAI는 2025년 4~9월분 과거 데이터 일부를 별도 보관 중이라고 밝혔고, 2025년 11월에는 비식별화된 2,000만 건의 로그를 원고 측에 제출하라는 명령이 확정되었다. 즉 "삭제하면 지워진다"는 원칙은 회복됐지만, 해당 기간 데이터는 소송 종료까지 남아 있을 수 있다. |
| 직원 검토 | 남용 감시 목적의 검토 가능(임시 채팅 포함). |
| 정부 요청 | 2026년 1월 1일 발효 "Government User Data Request Policy": 유효한 법적 절차 또는 생명 위험 긴급 상황에서만 제공. 반기별 정부 요청 보고서를 2025년 9월부터 발행(2025년 상·하반기 보고서 공개). 하반기 수치는 PDF 본문 파싱이 불가해 **미확인**. |
| 위험 | 무료/Plus는 학습 기본 켜짐. 소송 보존 데이터가 남아 있음. 계정이 곧 신원(이메일·전화번호)이다. |
| 대안 | 민감 작업은 Temporary Chat + 학습 끄기, 또는 Team/Enterprise/API(ZDR). 그래도 서버로 나가는 것은 동일하다. |

출처: https://help.openai.com/en/articles/8983778-chat-and-file-retention-policies-in-chatgpt · https://openai.com/index/response-to-nyt-data-demands/ · https://www.engadget.com/ai/openai-no-longer-has-to-preserve-all-of-its-chatgpt-data-with-some-exceptions-192422093.html · https://news.bloomberglaw.com/ip-law/openai-must-turn-over-20-million-chatgpt-logs-judge-affirms · https://openai.com/enterprise-privacy/ · https://cdn.openai.com/pdf/openai-law-enforcement-policy-v.2025-12.pdf · https://cdn.openai.com/trust-and-transparency/report-2025h2-government-requests-for-user-data.pdf

### 1-2. Claude (Anthropic)

| 구분 | 내용 |
|---|---|
| 2025년 변경 | 2025년 8월 28일 소비자 약관 개정: Free/Pro/Max(및 이 계정으로 쓰는 Claude Code)는 "Help improve Claude" 설정으로 학습 허용 여부를 선택. 허용 시 보관기간 **5년**, 비허용 시 기존 **30일**. 2025년 10월 8일까지 선택 필요. 삭제한 대화는 학습에 쓰이지 않는다. Claude for Work/Government/Education, API(Bedrock·Vertex 포함)는 이 변경과 무관하며 학습에 사용하지 않는다. |
| 삭제 | 삭제 시 대화 목록에서 즉시 제거, 백엔드에서 30일 내 삭제. 단, 자동 안전 시스템에 플래그된 경우나 법적 보존 의무가 있는 경우 예외. |
| 직원 검토 | 자동 신뢰·안전 시스템이 플래그한 내용에 한해 소수 승인 검토자가 열람 가능. 2026년 6월 한 매체는 개인정보처리방침에 "안전 검토용으로 플래그된 대화는 학습 거부와 무관하게 안전 연구에 쓸 수 있다"는 예외가 있다고 보도했다(2차 보도, Anthropic 공식 답변 **미확인**). |
| 2026년 변경 | 개인정보처리방침이 2026년 1월 12일, 7월 8일 개정(연결 앱·에이전트 작업 시 제3자 공유, 연령·신원 확인 데이터 등 추가). API 쪽은 2026년 6월 9일부터 "Covered Models"(Mythos급, Fable 5/5.1 포함)에 대해 ZDR 계약이 있어도 30일 보관을 요구하기 시작했고, 2026년 9월 2일 고객 통제 클라우드에 저장하는 Enterprise Frontier Safeguards로 ZDR을 다시 제공한다고 보도됐다. 소비자 플랜은 해당 없음. |
| 정부 요청 | 2025년 7~12월: 콘텐츠 요청 2건(8계정, 2건 제공), 비콘텐츠 요청 20건(55계정, 7건 제공), 긴급 요청 0건, 보존 요청 7건(29계정). 법적으로 금지되지 않는 한 사용자에게 통지한다는 방침. |
| 위험 | 학습 허용 시 5년 보관. 플래그된 대화는 30일 이후에도 남을 수 있다. |
| 대안 | "Help improve Claude" 끄기, 민감 작업은 Claude for Work/Enterprise 또는 API. |

출처: https://www.anthropic.com/news/updates-to-our-consumer-terms · https://privacy.claude.com/en/articles/10023548-how-long-do-you-store-my-data · https://privacy.claude.com/en/articles/10301952-updates-to-our-privacy-policy · https://privacy.claude.com/en/articles/15425996-data-retention-practices-for-covered-models · https://www.theregister.com/ai-and-ml/2026/09/02/anthropic-promises-zero-data-retention-but-customers-must-check-it-worked/5293789 · https://assets.anthropic.com/m/604a7603983db0b9/original/Anthropic-Government-Requests-Report.pdf · https://techcoffeehouse.com/2026/06/09/claude-training-data-opt-out-carve-out/ (2차 보도)

### 1-3. Gemini (Google)

| 구분 | 내용 |
|---|---|
| 소비자 앱 | "Keep Activity"(구 Gemini Apps Activity) 켜짐이 기본, 자동 삭제 기본 18개월(3/36개월·무기한 선택). 활동을 꺼도 서비스 운영을 위해 **72시간** 보관. 2025년 8월 도입된 임시 채팅(Temporary Chat)은 활동 기록에 남지 않고 학습·개인화에 쓰이지 않으나 역시 72시간 보관. |
| 직원 검토 | 활동이 켜져 있으면 사람 검토자가 대화를 읽을 수 있으며, **검토된 대화는 계정에서 분리되어 최대 3년 보관되고 사용자가 삭제해도 지워지지 않는다.** 대화에 직접 적은 개인정보는 검토자에게 그대로 보인다. |
| Workspace(업무·교육 계정) | 콘텐츠를 도메인 밖 모델 학습에 쓰지 않고 사람이 검토하지 않는다는 기업 약정 적용. |
| 정부 요청 | Google 투명성 보고서에 통합(6개월 단위, 계정 수 공개). Gemini 별도 수치는 **미확인**. |
| 위험 | 소비자 계정은 사람 검토 + 3년 보관 예외가 가장 큰 노출점. |
| 대안 | Keep Activity 끄기 또는 임시 채팅, 가능하면 Workspace 계정 사용. |

출처: https://support.google.com/gemini/answer/13594961?hl=en · https://blog.google/products-and-platforms/products/gemini/temporary-chats-privacy-controls/ · https://knowledge.workspace.google.com/admin/generative-ai/generative-ai-in-google-workspace-privacy-hub · https://transparencyreport.google.com/user-data/overview

### 1-4. Microsoft Copilot (소비자용)

| 구분 | 내용 |
|---|---|
| 정책 | 대화 기록 기본 **18개월** 보관, 개별·전체 삭제 가능. Bing/MSN/Copilot 데이터(업로드한 이미지·파일 포함)를 AI 학습에 사용하되 옵트아웃 가능. **한국·중국(홍콩 제외)·브라질·이스라엘·나이지리아·베트남 사용자, Entra ID(조직) 계정, Microsoft 365 개인/가족 구독자, 미로그인, 18세 미만은 학습 제외.** |
| 직원 검토 | "일부 대화는 자동 및 사람 검토 대상"이며, 행동 강령 위반 의심 시 사람 검토 옵트아웃 불가. |
| 정부 요청 | 2025년 하반기 미국 법집행기관 소비자 데이터 요청 5,587건(2차 보도), 상세는 Microsoft 보고서 참조. |
| 위험 | 한국 계정은 학습 제외지만, 현지 국가 계정으로 쓰면 학습 대상이 될 수 있다. 사람 검토 예외. |
| 대안 | 조직(Entra ID) 계정, 학습 옵트아웃. |

출처: https://support.microsoft.com/en-us/microsoft-copilot/privacy-faq-for-microsoft-copilot · https://www.microsoft.com/en-us/corporate-responsibility/reports/government-requests/customer-data

### 1-5. NotebookLM (Gemini Notebook)

- 업로드한 소스·질문·답변은 **피드백(👍/👎)을 보내지 않는 한** 기초 모델 학습에 쓰이지 않는다. 피드백을 보내면 계정과 분리된 상태로 사람 검토 가능, 최대 3년 보관. Workspace/교육 계정은 피드백을 보내도 사람 검토 없음. 소스는 노트북을 공유하지 않는 한 본인만 볼 수 있다.
- 위험: 소비자 계정에서 무심코 누른 피드백 버튼. 노트북 공유 시 소스 전체가 공유된다.
- 대안: 피드백 버튼 사용 금지, 성경 번역 초안·현지 신자 기록은 오프라인 도구로.
- 출처: https://support.google.com/notebooklm/answer/17004255?hl=en

### 1-6. Perplexity

- Free/Pro/Max는 "AI data retention" 토글이 기본 켜짐(학습 사용). 설정 → Preferences에서 끌 수 있으나 과거 데이터에는 소급 안 됨. 계정 삭제 시 30일 내 삭제(과거 정책 문구).
- **2026년 7월 2일 정책 개편에서 학습 옵트아웃 문구, 30일 삭제 기한, 중대 변경 통지 약속이 정책 본문에서 빠졌다(2차 보도).** 토글 자체는 도움말에 남아 있으나 정책상 약정이 아니게 됐다.
- Enterprise는 학습 미사용, 파일 보관 약 7일(2차 보도).
- 위험: 정책 후퇴 사례. 검색 기록이 "무엇을 조사했는가"를 그대로 드러낸다.
- 출처: https://www.perplexity.ai/help-center/en/articles/11564572-data-collection-at-perplexity · https://venpo.com/blog/perplexity-moved-three-protections-out-of-its-privacy-policy

### 1-7. 공통 정리
- "삭제하면 정말 지워지나": 세 회사 모두 "30일 내 삭제"를 원칙으로 하되 **법적 보존·안전 플래그·사람 검토분(Gemini 3년)**이 예외다. 완전 삭제를 보장하는 서비스는 없다.
- "직원 검토": 모두 남용 감시 목적의 사람 검토를 남겨 둔다. 종교 활동이 "유해"로 오분류될 가능성은 어느 회사도 배제하지 않는다.
- "정부 요청": 미국 회사들은 유효한 법적 절차에만 응한다고 밝히지만, 요청국이 어디든 미국 법원의 절차라면 제공된다. 현지 정부가 직접 요청해 받을 가능성은 낮으나 0은 아니다.

### 1-8. 바로 적용할 설정 체크리스트 (2026-09 기준 메뉴 위치)

| 서비스 | 학습 끄기 | 기록 남기지 않기 | 계정 유형 권장 |
|---|---|---|---|
| ChatGPT | 설정 → Data Controls → "Improve the model for everyone" 끄기 | 새 대화 시 Temporary Chat 선택(30일 내 삭제, 학습 제외, 남용 검토는 가능) | Team/Enterprise/Edu 또는 API(ZDR 신청) |
| Claude | 설정 → Privacy → "Help improve Claude" 끄기(끄면 30일 보관, 켜면 5년) | 대화 삭제(30일 내 백엔드 삭제) | Claude for Work/Enterprise 또는 API |
| Gemini | Keep Activity 끄기(사람 검토·학습 제외, 72시간 보관은 유지) | Temporary Chat(72시간) | Workspace 계정(학습·사람 검토 없음) |
| Copilot(소비자) | 설정 → 개인정보 → 모델 학습 옵트아웃(한국 계정은 기본 제외) | 대화 기록 삭제(기본 18개월 보관) | Entra ID 조직 계정 |
| NotebookLM | 👍/👎 피드백 버튼 누르지 않기 | 노트북 삭제, 공유 안 하기 | Workspace/교육 계정 |
| Perplexity | 설정 → Preferences → AI data retention 끄기(과거분 소급 안 됨) | 스레드 삭제 | Enterprise(학습 미사용) |

주의: 위 메뉴 이름은 각 사 도움말 기준이며 UI 개편으로 바뀔 수 있다. 분기마다 한 번씩 각 서비스의 개인정보 도움말을 다시 열어 문구가 바뀌었는지 확인하는 것을 권한다. Perplexity 사례(2026-07)처럼 정책 본문에서 약정이 조용히 사라지는 일이 실제로 일어난다.

### 1-9. "정부 요청" 항목을 읽는 법
- 세 회사(OpenAI·Anthropic·Microsoft)와 Google 모두 "유효한 법적 절차"에만 응하고, 가능하면 사용자에게 통지한다고 밝힌다. 그러나 (1) 미국 법원의 영장·소환장은 요청 발원국과 무관하게 집행되고, (2) 긴급 요청(생명 위험)은 법적 절차 없이도 제공되며, (3) 보존 요청(preservation request)이 오면 삭제 정책과 무관하게 데이터가 동결된다. Anthropic 2025년 하반기 보고서에 보존 요청 7건(29계정)이 실제로 기록되어 있다.
- 따라서 "우리 정부가 미국 회사에 요청해 받을 리 없다"는 가정보다 "요청이 오면 회사는 법에 따라 제공한다"는 가정이 안전하다. 요청 자체를 무의미하게 만드는 방법은 서버에 데이터를 남기지 않는 것뿐이다.

---

## 2. 국가별 AI 서비스 접근 현황

| 국가 | ChatGPT | Claude | Gemini | 비고 |
|---|---|---|---|---|
| 중국 본토·홍콩·마카오 | 지원국 목록에서 제외 + 방화벽 차단 | 미지원(홍콩 포함) | 미지원 | 홍콩은 정부 차단이 아니라 회사의 지오펜싱(2차 보도). |
| 러시아 | 미지원 | 미지원 | 접근 불안정(2차 보도) | 2026년 3월 러시아 정부가 외국 AI 서비스에 3년 데이터 현지 보관 의무를 부과하는 법안 발표, 2027년 9월 1일 시행 예정(2차 보도). |
| 이란 | 미지원 | 미지원 | 미지원 | 2026년 1월 8일 전국 인터넷 차단; 이후 "국제 인터넷 반복 접속 시 회선 정지·사법 회부" 경고 문자 발송(2차 보도). 2026년 9월 새 법안은 VPN 처벌 조항을 뺐으나 외국 플랫폼 현지 법인 요구(RFE/RL). |
| 북한 | 미지원 | 미지원 | 미지원 | 일반 인터넷 자체가 없음. 별도 확인 자료 **미확인**. |
| 우즈베키스탄·카자흐스탄·터키·이집트 | 지원 | 지원(공식 목록 확인) | — | Gemini 개별 확인 **미확인**. |

- **우회 접속의 계정 위험**: OpenAI는 "미지원 국가에서 접속·접속 제공 시 계정이 차단·정지될 수 있다"고 명시. Anthropic은 미지원 국가 소유 법인에 대한 서비스 거부 권한을 명시. VPN으로 만든 계정은 언제든 사라질 수 있고, 결제 정보·전화번호가 실제 위치를 드러낸다.
- **중국 법적 위험**: 2026년 1월 1일 발효된 사이버보안법 개정으로 벌금 상향(불법 소득의 최대 20배, 2차 보도). 개인 VPN 사용은 주로 경고·소액 벌금 사례가 보고되나 판매·제공자는 구금 대상. AI 생성물 표시 의무(2025년 9월 1일 시행)로 중국 플랫폼에 올리는 AI 생성물에는 명시·암시 라벨이 붙는다.
- **중국 국산 AI(DeepSeek·Qwen·Doubao 등)**: DeepSeek 개인정보처리방침(2026-02-10 개정)은 모든 대화·업로드·기기 정보를 **중국 내 서버에 저장**한다고 명시. 중국 사이버보안법·국가안보법에 따라 정부가 데이터 접근을 요구할 수 있다. 정부 비판 콘텐츠 검열이 보고됐고, 이탈리아·호주·대만·한국 등이 정부 부문 사용을 금지. 생성형 AI 잠정조치(2023)와 사이버보안법상 실명 인증이 적용된다. 2026년 7월 15일 "의인화 AI 상호작용 서비스 잠정조치" 시행으로 Doubao·Qwen이 에이전트 기능을 종료했다. **핵심: 중국 국산 AI에 입력한 선교 관련 내용은 정부가 볼 수 있다고 전제해야 한다.** 오픈 가중치 모델(Qwen, DeepSeek)을 **오프라인으로 돌리는 것**은 별개 문제로, 데이터가 서버로 가지 않는다(3장).

### 2-1. 우회 접속이 실제로 걸리는 방식
- OpenAI는 방화벽 차단(중국)과 별개로 **자사 계정 수준에서 IP 지오펜싱**을 한다. 즉 VPN을 잠시 끄고 접속하면 그 시점의 IP가 기록되고, 계정 정지 사유가 된다. 가입 시 필요한 SMS 인증 번호·결제 카드의 국가도 신원 단서다.
- Anthropic 공식 지원국 목록은 우즈베키스탄·카자흐스탄·터키·이집트를 포함하고 중국·홍콩·러시아·이란·북한·아프가니스탄·벨라루스·미얀마·시리아·예멘을 제외한다. 2025년 9월부터는 미지원국 자본이 50% 이상인 법인도 서비스 대상에서 제외한다.
- 이란은 2026년 1월 전면 차단 이후 "화이트리스트 국제 서비스"(Google·Gmail·ChatGPT·지도 등)만 부분 허용하는 2단계 인터넷을 운영하고 있다는 보도가 있다(CNN, 2026-05). 화이트리스트에 있는 서비스라도 국내 게이트웨이를 통과하므로 접속 사실·시각은 당국이 볼 수 있다고 전제해야 한다.
- 러시아는 2026년 2월 WhatsApp 차단, YouTube 제한 등 외국 플랫폼 압박을 강화했고, 외국 AI 서비스에 3년 데이터 현지 보관을 요구하는 법안이 2027년 9월 시행을 목표로 준비 중이다(2차 보도). 현지 보관에 응하지 않으면 공식 차단 대상이 된다.

출처: https://help.openai.com/en/articles/7947663-chatgpt-supported-countries · https://help.openai.com/en/articles/9131992-chatgpt-and-api-services-in-unsupported-countries-and-territories · https://anthropic.com/supported-countries · https://www.anthropic.com/news/updating-restrictions-of-sales-to-unsupported-regions · https://www.ptsconsulting.com.hk/blog/openai-ban · https://cybernews.com/ai-news/foreign-ai-putin-moral-values-leave-russia-chat-gpt-claude/ · https://www.chathamhouse.org/2026/01/irans-internet-shutdown-signals-new-stage-digital-isolation · https://www.globalsecurity.org/wmd/library/news/iran/2026/09/iran-260903-rferl02.htm · https://www.techradar.com/vpn/vpn-privacy-security/iranians-threatened-with-legal-action-for-using-vpns-to-bypass-internet-blocks-heres-everything-we-know · https://www.china-briefing.com/news/china-cybersecurity-law-amendment/ · https://www.chinalawtranslate.com/en/ai-labeling/ · https://iapp.org/news/a/deepseek-and-the-china-data-question-direct-collection-open-source-and-the-limits-of-extraterritorial-enforcement · https://anonyome.com/knowledge-center/ai-privacy/deepseek-privacy/ · https://technode.com/2026/07/06/bytedances-doubao-and-alibabas-qwen-to-shut-down-ai-agent-features-on-july-15/

---

## 3. 오프라인 로컬 AI 2026 현황

### 3-1. PC용

| 도구 | 완전 오프라인 | 텔레메트리 | 비고 |
|---|---|---|---|
| **LM Studio** | 모델 다운로드 후 완전 오프라인 가능. "로컬로 실행하면 메시지·대화·문서가 시스템 밖으로 전송되지 않는다"(공식). | 공식 정책: 텔레메트리·사용자 추적 없음. 앱 업데이트 확인 시 기기 정보·IP, 모델 검색 시 익명 검색어 전송. (일부 2차 자료는 "익명 사용 데이터" 토글이 있다고 하나 공식 문서와 불일치 — **미확인**) | GGUF/MLX, GUI 친화적. 비공개 소스. |
| **Ollama** | 로컬 실행 시 "프롬프트를 보지 않음"(공식 FAQ). 업데이트 확인·모델 다운로드 외 통신 없음. | 계정 정보·제한된 사용 메타데이터만(프롬프트 내용 제외). | 주의: 모델명에 `-cloud` 접미사를 붙이면 Ollama 서버에서 실행됨. 로컬 전용 모드로 클라우드 기능을 끌 수 있음. MIT 오픈소스. |
| **Jan** | 완전 오프라인. 대화는 로컬 JSON 파일. | 첫 실행 시 분석 동의 선택(PostHog EU), 프롬프트·대화·파일은 수집 안 함. AGPLv3 오픈소스. | 코드 감사 가능. |
| **GPT4All** | 오프라인 기본, LocalDocs로 PDF/Office 문서 RAG. | 연구용 데이터 공유는 옵트인(2차 자료). | 설치가 가장 쉬움. |

네 도구 모두 llama.cpp 기반, GGUF 모델 호환. **"오프라인"의 의미는 "모델을 받은 뒤 네트워크를 끊어도 동작한다"이지 "네트워크가 절대 안 나간다"가 아니다.** 방화벽으로 실행 파일의 아웃바운드를 막고, 최초 1회 다운로드는 안전한 지역에서 마친 뒤 반입하는 것이 좋다.

### 3-2. 스마트폰용

| 도구 | 플랫폼 | 오프라인·프라이버시 | 최소 사양 |
|---|---|---|---|
| **PocketPal AI** | iOS/Android | 오픈소스. "모든 프롬프트·응답·문서가 기기에 머문다"; 벤치마크 리더보드 제출·피드백만 옵트인. GGUF 모델(Gemma·Qwen·Phi·Llama). CPU/GPU/NPU(Hexagon) 지원. | Android 8.0+, RAM 4GB(2차 자료). |
| **MLC Chat** | Android/iOS | 온디바이스, NPU 최적화로 가장 빠름(2차 자료). | — |
| **Google AI Edge Gallery** | Android 12+, iOS 17+, macOS | 공식: "모든 추론이 기기 하드웨어에서 실행, 인터넷 불필요." Gemma 4 E2B/E4B(구 Gemma 3n) 중심, 커스텀 모델 로드 가능. APK 직접 설치 가능. | Gemma 4 E2B는 1.5GB 미만 RAM에서 동작(2차 자료); 모델 파일 1~3GB. |
| **Apple 온디바이스 모델** | iOS 26+ | Foundation Models 프레임워크로 약 3B 온디바이스 모델을 앱이 오프라인 사용. 지원 언어(iOS 26.1): 영어·중국어(간·번)·일본어·**한국어**·베트남어·프랑스어·독일어·이탈리아어·스페인어·포르투갈어·덴마크어·네덜란드어·노르웨이어·스웨덴어·터키어. 페르시아어·우즈베크어·아랍어 **미지원**. | Apple Intelligence 지원 기기. |

### 3-3. 추천 소형 모델 (한국어·현지어)

- **Gemma 4** (2026-04-02 공개, 140개 이상 언어): E2B/E4B(폰), 12B/26B-A4B/31B(PC). 텍스트·이미지·(E2B/E4B/12B) 오디오 입력.
- **Qwen 3.5 Small** (2026-03 공개, 0.8B/2B/4B/9B, 201개 언어 표기): 2B는 아이폰 비행기 모드에서 동작, 4B는 Q4 기준 약 2.5GB. Qwen3 계열은 119개 언어 사전학습.
- **Gemma 3**(140개 언어), **Llama** 계열도 GGUF로 가용.
- 한국어·중국어·아랍어는 위 모델들이 기본 지원. **페르시아어·우즈베크어 등 저자원 언어의 실제 품질 벤치마크는 확인된 공개 자료가 없어 미확인** — 반드시 현지어 화자가 직접 검수해야 한다.
- 크기 선택: 4B(Q4 ≈ 2.5~3GB)는 8GB RAM 노트북·중급 폰, 8~9B(Q4 ≈ 5~6GB)는 16GB RAM 권장, 12B 이상은 16GB+ 또는 GPU.

### 3-4. 최소 사양(2차 자료 종합)
- Q4 양자화 기준 약 0.25GB/10억 파라미터 + 여유분. 8GB 노트북: 3~4B 모델이 무난, 7B는 다른 앱을 닫아야 함. 16GB: 7~9B 편안, 14B까지 가능. CPU만으로 7B Q4는 초당 약 8~15토큰.
- 안드로이드: 4GB RAM은 1~2B급, 6~8GB는 2~4B급이 현실적.

### 3-5. 현장 도입 절차 (권장)
1. **안전한 지역에서 준비**: 한국 등에서 노트북·폰에 앱과 모델(GGUF 또는 앱 내장 형식)을 미리 받는다. Ollama는 `ollama pull`, LM Studio·Jan은 앱 내 검색, PocketPal은 Hugging Face 목록, AI Edge Gallery는 앱 내 다운로드(플레이스토어가 막힌 곳은 GitHub APK).
2. **네트워크 차단 테스트**: 비행기 모드 또는 방화벽에서 앱 실행 파일의 아웃바운드를 막은 뒤 대화가 되는지 확인. Ollama는 `-cloud` 모델을 절대 쓰지 않고 로컬 전용 모드로 둔다.
3. **대화 파일 위치 파악**: Jan은 로컬 JSON, LM Studio·Ollama도 로컬 디렉터리에 대화·모델을 둔다. 기기 압수 시 이 파일이 곧 증거가 되므로 **전체 디스크 암호화(BitLocker/FileVault/안드로이드 기본 암호화)** 와 대화 자동 삭제 습관을 병행한다.
4. **모델 선택**: 한국어·중국어·아랍어는 Gemma 4 E4B/12B, Qwen 3.5 4B/9B가 현실적 출발점. 저자원 언어는 실제 문장으로 시험해 보고 모어 화자가 판정한다.
5. **업데이트도 오프라인으로**: 앱 자동 업데이트를 끄고, 필요할 때 안전한 지역에서 설치 파일을 받아 반입한다. LM Studio는 업데이트 확인 시 IP·기기 정보를 보낸다고 명시하고 있다.

출처: https://lmstudio.ai/app-privacy · https://docs.ollama.com/faq · https://www.jan.ai/docs/desktop/privacy · https://www.promptquorum.com/local-llms/local-llm-one-click-installers · https://github.com/a-ghorbani/pocketpal-ai · https://github.com/google-ai-edge/gallery · https://ai.google.dev/gemma/docs/core/model_card_4 · https://www.marktechpost.com/2026/03/02/alibaba-just-released-qwen-3-5-small-models-a-family-of-0-8b-to-9b-parameters-built-for-on-device-applications/ · https://www.apple.com/newsroom/2025/09/apples-foundation-models-framework-unlocks-new-intelligent-app-experiences/ · https://www.macrumors.com/2025/09/22/ios-26-1-apple-intelligence-languages/ · https://www.microcenter.com/site/mc-news/article/best-local-llms-8gb-16gb-32gb-memory-guide.aspx · https://www.promptquorum.com/power-local-llm/best-local-llm-apps-android-2026 · https://pub.towardsai.net/local-models-arent-automatically-private-8-ways-your-data-can-still-leave-your-laptop-23991cad242a

---

## 4. 오프라인 번역·음성

| 도구 | 오프라인 | 한계 |
|---|---|---|
| **Google 번역 오프라인 팩** | 언어별 30~90MB 팩 다운로드 후 텍스트·카메라·필기 번역. 59개 언어 오프라인 지원(2018년 발표 기준; 2026년 현재 정확한 수는 앱 내 목록 확인 — **미확인**). 다운로드 목록에 없는 언어는 오프라인 불가. | 온라인보다 품질 낮음. 오프라인 팩이라도 앱 자체는 Google 계정·활동 기록과 연결될 수 있으므로 기록 설정 확인. |
| **Apple 번역** | 앱에서 언어 다운로드 후 "온디바이스 모드" 사용 시 기기 내 처리. 출시 시 11개 언어(영·중·불·독·스·이·일·한·**아랍어**·포·러). | 페르시아어·우즈베크어 지원 여부 **미확인**(Apple 기능 가용성 페이지 확인 필요). |
| **Whisper(로컬 음성인식)** | whisper.cpp / faster-whisper / MLX로 완전 오프라인, 99개 언어. | 저자원 언어 정확도 낮음. **환각(없는 말을 만들어 냄)**: Koenecke 등(2024) 연구에서 약 1%의 전사에 허구 문장이 포함되고 그중 38%가 폭력·허위 권위 등 유해 내용. 무음·긴 쉼 구간에서 특히 심함. 우즈베크·페르시아어 개별 수치 **미확인**. |
| **오프라인 TTS** | Piper(8개 언어, 라즈베리파이 수준에서 동작), Kokoro-82M, sherpa-onnx(안드로이드·iOS·PC, 50개 이상 언어 표기). | 현지 소수 언어 음성 모델은 대부분 없음. |

**현지어 성경 번역 검토용으로 쓸 때**: SIL의 Scripture Forge(Serval 기반 초안 생성·역번역)와 AQuA(정확성·명료성·자연스러움 진단)가 표준 도구이며, 초안 생성은 약 8,000절(신약 분량)의 기존 번역이 있어야 의미 있다. SIL은 오프라인용 70B 모델 장치 "Truffle"을 XRI Global과 만들었다(2차 보도). 연구·현장 보고 공통 결론: **소수 언어 지원 부족, 문화·신학적 뉘앙스 오역, 편향 위험 때문에 모어 화자와 번역 컨설턴트의 검수 없이는 사용할 수 없다.** 범용 LLM은 "검토 보조"(용어 일관성, 역번역 비교)까지만 쓰고, 최종 판단 도구로 쓰지 말 것.

출처: https://support.google.com/translate/answer/6142473?hl=en&co=GENIE.Platform%3DAndroid · https://thenextweb.com/news/googles-translate-app-now-works-offline-for-59-languages · https://support.apple.com/guide/iphone/change-your-translate-settings-iphddb6e7264/ios · https://techcrunch.com/2020/06/22/apples-new-translate-app-works-offline-with-11-languages/ · https://arxiv.org/abs/2402.08021 · https://www.turingpost.com/p/topic-15-inside-whisper-an-open-source-audio-model · https://github.com/k2-fsa/sherpa-onnx · https://ai.sil.org/projects/scriptureforge · https://ai.sil.org/projects/AQuA · https://avodagroup.org/ai-bible-translation-african-languages/ · https://ajobit.brainfa.org/index.php/files/article/download/21/30

---

## 5. AI 생성물 추적 표식

| 표식 | 무엇이 남나 | 제거/유실 |
|---|---|---|
| **C2PA / Content Credentials** | 파일에 암호 서명된 출처 매니페스트(생성 도구·편집 이력) 삽입. 2026년 1월 기준 6,000개 이상 회원사, TikTok·YouTube·Meta·LinkedIn이 표시. | 메타데이터이므로 **스크린샷·재인코딩·리사이즈·포맷 변환·대부분 SNS 업로드 시 사라진다.** 일반 EXIF 제거 도구로도 제거 가능(2차 자료). |
| **Google SynthID** | 픽셀·주파수 영역에 심는 비가시 워터마크. Gemini 이미지·Veo·Lyria·Gemini 텍스트에 적용. JPEG 70+ 재압축·크롭·스케일·스크린샷·SNS 재게시에도 생존한다고 Google이 밝힘. | Google 모델에만 탐지 가능. 2026년 4월 "다중 해상도 스펙트럼 우회"로 무력화하는 연구 발표, 오픈소스 제거 도구 존재(2차 보도). 텍스트 워터마크는 사실 나열형 짧은 글에서 약함. |
| **OpenAI 이미지** | 2026년 5월 19일부터 ChatGPT·API·Codex 생성 이미지에 **C2PA 메타데이터 + SynthID 워터마크 이중 적용**. | C2PA는 스크린샷으로 사라지나 SynthID는 남는다. |
| **MS Office/Copilot** | Copilot·Editor 등 AI 기능을 쓰면 문서 속성에 "Intelligence data from AI assisted features" 메타데이터가 생김. Copilot 생성 이미지에는 C2PA 자격 증명. 텍스트 자체에는 가시 워터마크 없음. 조직 테넌트는 Purview 감사 로그에 Copilot 사용 기록. | 파일 → 정보 → 문제 확인 → 문서 검사(Document Inspector) → 모두 제거. 또는 텍스트를 새 문서에 붙여넣기. 조직 감사 로그는 사용자가 지울 수 없다. |

**실무 함의**: 현지에서 배포할 전도지·이미지가 "AI가 만든 것"으로 추적되면 제작자·도구 계정이 특정될 수 있다. 문서는 Document Inspector 후 PDF로 평탄화, 이미지는 스크린샷·재압축으로 메타데이터를 제거해도 SynthID는 남으므로 **Google/OpenAI 생성 이미지는 추적 가능하다고 전제**해야 한다. 로컬 생성(Stable Diffusion 계열 오프라인)은 이 문제가 없다.

출처: https://c2pa.org (표준) · https://www.softwareseni.com/c2pa-adoption-in-2026-hardware-platforms-and-verification-reality/ · https://truescreen.io/articles/c2pa-standard-history-limitations/ · https://openai.com/index/advancing-content-provenance/ · https://petapixel.com/2026/05/20/openai-gets-serious-about-detecting-fake-images/ · https://aiwatermark.studio/blog/en/remove-google-synthid.html · https://gigazine.net/gsc_news/en/20260413-reverse-synthid/ · https://learn.microsoft.com/en-us/answers/questions/5650868/what-does-intelligence-data-from-ai-assisted-featu · https://support.microsoft.com/en-us/office/collab-files/remove-hidden-data-and-personal-information-by-inspecting-documents-presentations-or-workbooks

---

## 6. 클라우드 공유의 노출

- **"링크 아는 사람" 공유의 검색 노출**: Google은 "링크가 있는 모든 사용자" 파일을 자동 색인하지 않지만, **링크가 공개 웹 어딘가(게시판·SNS·다른 공개 문서)에 올라가면 검색엔진이 색인한다.** 2026년 8월 Pageloot 사건: 계약자가 만든 자격 증명 문서가 Google 검색 자동완성에 노출됨. OneDrive·Dropbox의 "Anyone" 링크도 전달·게시·브라우저 기록으로 유출되며, 관리자는 기본 링크를 "특정 사용자"로 바꾸고 만료(30~90일)를 강제할 것을 권장. Dropbox의 검색엔진 색인 정책 공식 문구는 **미확인**.
- **편집자 이름·이메일 노출**: Google Docs에서 개별 초대된 사람·Workspace 도메인 사용자는 실명으로 보이며, 편집 권한자는 버전 기록에서 누가 언제 무엇을 고쳤는지 볼 수 있다. 링크 공유 익명 접속자는 "익명 동물"로 표시된다. **위험은 반대 방향이다**: 현지 협력자를 이메일로 초대하면 그 이메일이 공유 목록·버전 기록·댓글에 남고, 문서 사본을 만들어도 원본 소유자 이름이 남는다. 뷰어 권한만 주면 버전 기록은 감춰진다.
- **Notion·Google Docs 댓글·이력**: Notion은 삭제한 블록도 페이지 기록에 남고, 휴지통에서 영구 삭제해도 30일간 보존(Enterprise는 사용자 지정), 관리자 콘텐츠 검색 가능. Google Docs 버전 기록은 편집자에게 공개. 댓글 스레드는 해결(resolve)해도 이력이 남는다.
- 대안: 민감 문서는 (1) 개별 초대 + 뷰어 권한 + 다운로드·복사 금지, (2) 공유 만료 설정, (3) 협력자용 익명 계정, (4) 최종본은 "새 문서에 값만 복사"해 이력 없이 배포, (5) 가장 민감한 자료는 클라우드 자체를 피하고 암호화 파일(예: VeraCrypt/7z AES) + 오프라인 전달.

### 6-1. 실무 점검 순서
1. Drive/OneDrive/Dropbox에서 "링크가 있는 모든 사용자"로 공유된 파일을 검색해 전부 "제한됨/특정 사용자"로 바꾼다(Google Drive는 검색창에서 공유 상태 필터 가능).
2. 공유 목록에 남은 협력자 계정을 정리하고, 사역이 끝난 문서는 소유권을 익명 계정으로 옮기거나 삭제한다.
3. 외부 배포용 문서는 "파일 → 사본 만들기"가 아니라 **새 문서에 내용만 붙여넣기**로 만들어 버전 기록·댓글을 끊는다.
4. Notion은 페이지 기록에 삭제 블록이 남으므로, 민감 정보를 잘못 적었다면 페이지 자체를 삭제하고 휴지통에서 영구 삭제한 뒤에도 30일 보존이 있음을 감안한다.

출처: https://www.malwarebytes.com/blog/news/2026/08/be-careful-what-you-put-in-anyone-with-the-link-google-docs · https://www.docontrol.io/blog/google-drive-files-indexed-search-engines-ai · https://support.google.com/drive/thread/83160241 · https://sharegate.com/blog/managing-onedrive-sharing-settings-and-link-permissions-across-admin-centers · https://support.google.com/docs/answer/2494888?hl=en · https://support.google.com/docs/answer/7378739 · https://www.makeuseof.com/hide-google-docs-version-history/ · https://www.notion.com/help/custom-data-retention-settings · https://backups.so/blog/notion-version-history-limits

---

## 7. AI 교육 강사가 수강생 자료를 다룰 때

| 도구 | 문제 | 확인된 정책 | 대안 |
|---|---|---|---|
| **Zoom 클라우드 녹화** | 유료 계정은 기본적으로 **만료 없이** 클라우드에 남는다. 삭제해도 휴지통에 30일. 녹화 시 참가자에게 동의/퇴장 프롬프트. | 관리자가 "N일 후 자동 삭제"를 설정·잠금 가능(7/30/60일 등). | 로컬 녹화만 사용, 또는 자동 삭제 7일 + 즉시 다운로드 후 클라우드 삭제. |
| **Zoom AI Companion** | 회의 요약·전사가 Zoom 서버에서 생성·보관. | Zoom은 고객 콘텐츠(오디오·영상·채팅·화면·첨부)를 자사·제3자 AI 학습에 쓰지 않는다고 명시. **2026년 1월 26일부터** 호스트가 AI Companion을 켜면 모든 참가자가 정책 고지에 동의해야 회의에 남을 수 있음. 요약은 기본 호스트만 열람. 요약용 전사·OCR·채팅에 대해 "무보관(ZDR)" 옵션 제공. | 계정 수준에서 AI Companion 비활성화. 수강생 발언이 서버로 가는 것을 원치 않으면 켜지 말 것. |
| **Google Meet "Gemini로 메모"** | 전사·요약이 **주최자 Drive에 Google Docs로 저장되고 수동 삭제 전까지 무기한** 남으며 캘린더 일정에 첨부되어 초대자에게 공유될 수 있다. | Workspace 데이터라 모델 학습에 쓰이지 않음. 2026년 5월 5일부터 관리자가 "명시적 동의 요구" 설정을 켤 수 있으나 **기본 OFF**. | 메모 기능 끄기, 필요 시 생성 직후 Drive 문서·캘린더 첨부 삭제. |
| **Otter.ai 등 외부 노트봇** | 2025년 8월 집단소송(In re Otter.AI Privacy Litigation): 호스트 외 참가자 동의 없이 녹음·전사하고 모델 개선에 사용했다는 주장. 2026년 8월 13일 법원이 도청법·CIPA·일리노이 생체정보 청구를 기각하지 않고 디스커버리 진행. Otter는 비식별 데이터로 자동 학습하며 설정에서 꺼야 함. | 진행 중. | 수강생이 노트봇을 데려오지 못하게 대기실·봇 차단 설정. 강사도 사용 금지. |
| **수강생 명단·이메일** | Zoom 등록·출석 보고서, Google Forms 응답, Calendar 초대, Docs 공유 목록, Slack/Discord 가입, 이메일 대량 발송(CC) 등에 이름·이메일이 누적된다. 각 도구의 관리자·법적 요청으로 열람 가능. | — | (1) 실명 대신 별칭·일회용 이메일 사용 권장, (2) BCC 전용, (3) 등록 폼은 수업 종료 후 응답 삭제, (4) 명단은 오프라인 암호화 파일로만 보관, (5) 녹화·전사에 수강생 얼굴·이름·소속이 나오지 않도록 카메라 끄기·표시명 변경을 안내, (6) 교육 자료 예제에 실제 사역지·인명 넣지 않기. |

출처: https://recordmover.com/zoom-recording-retention · https://td.wku.edu/TDClient/34/Portal/KB/ArticleDet?ID=3888 · https://uit.stanford.edu/service/zoom/ai · https://www.zoom.com/en/products/ai-assistant/resources/privacy-security/ · https://workspaceupdates.googleblog.com/2026/04/require-explicit-consent-for-take-notes-with-Gemini-recordings-and-transcripts-in-Google-Meet.html · https://tldv.io/blog/gemini-google-meet/ · https://www.courtlistener.com/docket/71118721/brewer-v-otterai-inc/ · https://www.uctoday.com/security-compliance-risk/otter-ai-on-trial-and-the-ai-notetaker-industry-with-it/ · https://natlawreview.com/article/ai-notetaking-tools-under-fire-lessons-otterai-class-action-complaint

---

## 선교 용도 AI 사용 원칙 10개 (초안)

1. **서버로 가는 모든 입력은 공개된 것으로 간주한다.** 삭제·임시 채팅·옵트아웃은 노출을 줄일 뿐 없애지 못한다(법적 보존, 안전 플래그, 사람 검토 3년 보관 예외가 모두 실재한다).
2. **사람·장소·교회를 특정할 수 있는 정보는 온라인 AI에 절대 넣지 않는다.** 실명, 사역지 지명, 모임 시간·장소, 현지 신자·협력자 이름, 사진은 로컬 도구에서만 다룬다.
3. **민감 작업(성경 번역 검토, 현지 신자 기록, 전략 문서)은 오프라인 로컬 AI로 한다.** Ollama/LM Studio/Jan(PC), PocketPal/AI Edge Gallery(폰)에 Gemma 4·Qwen 3.5급 모델을 안전한 곳에서 미리 받아 두고, 실행 시 네트워크를 끊거나 방화벽으로 막는다.
4. **온라인 AI를 쓸 때는 반드시 학습 옵트아웃 + 임시 채팅 + 조직/Enterprise 계정을 사용한다.** 무료·개인 계정에 사역 내용을 넣지 않는다.
5. **현지 국가에서 만든 AI(DeepSeek·Qwen·Doubao 앱 등)는 온라인으로 쓰지 않는다.** 데이터가 현지 서버에 저장되고 정부 접근이 법적으로 가능하다. 오픈 가중치 모델을 오프라인으로 돌리는 것은 별개로 허용한다.
6. **차단국에서 VPN 우회는 계정·법적 위험을 감수하는 선택임을 알고, 실명·결제·전화번호가 연결된 계정으로는 하지 않는다.** 이란·중국처럼 회선 정지나 벌금 사례가 보고된 곳에서는 접속 자체를 재검토한다.
7. **AI 생성물은 배포 전 흔적을 제거하되, SynthID 같은 픽셀 워터마크는 제거되지 않는다고 전제한다.** Office 문서는 Document Inspector, 이미지는 재저장으로 메타데이터를 지우고, 추적이 치명적인 자료는 로컬 생성 도구를 쓴다.
8. **번역·전사 결과는 반드시 모어 화자가 검수한다.** Whisper는 없는 말을 지어내고, LLM은 저자원 언어와 신학 용어를 잘못 옮긴다. AI는 초안·비교·용어 일관성 확인까지만 맡긴다.
9. **공유는 "링크 아는 사람"이 아니라 개별 초대 + 뷰어 권한 + 만료로 하고, 최종본은 이력 없는 새 파일로 배포한다.** 협력자의 이메일·이름이 공유 목록과 버전 기록에 남는다는 것을 항상 기억한다.
10. **교육·회의는 녹화·AI 회의록을 기본 끄고, 수강생 명단은 오프라인 암호화 파일로만 보관하며, 수강생에게 별칭·카메라 끄기·개인정보 미기재를 먼저 안내한다.** 필요한 녹화는 로컬 저장 후 클라우드에서 즉시 삭제한다.

---

## 미확인 항목 정리
- OpenAI 2025년 하반기 정부 요청 건수(PDF 파싱 불가, 원문 링크 참조).
- Google 투명성 보고서의 Gemini 별도 수치.
- Anthropic "안전 플래그 대화의 학습 사용 예외"에 대한 공식 입장(2차 보도만 존재).
- LM Studio "익명 사용 데이터" 토글 존재 여부(공식 정책은 텔레메트리 없음이라 명시).
- Google 번역 오프라인 언어의 2026년 정확한 개수, Apple 번역의 페르시아어·우즈베크어 지원 여부.
- Whisper·소형 LLM의 우즈베크어·페르시아어 정량 벤치마크.
- Dropbox 공유 링크의 검색엔진 색인 공식 정책.
- 북한 관련 개별 확인 자료.
- 러시아 외국 AI 규제 법안의 최종 통과 여부(2026년 3월 보도 기준 "준비 중").
