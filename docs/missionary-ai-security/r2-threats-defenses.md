# 종교 소수자·NGO·선교사를 노리는 기술적 위협과 방어 수단 (2023~2026, 방어 관점 정리)

조사 기준일: 2026-09-06. 웹 검색으로 확인된 사실만 기재했고, 확인되지 않은 부분은 "미확인"으로 표기했다. 공격 기법의 재현 정보는 다루지 않고, 각 위협에 대해 "무엇이 일어났는가 → 어떻게 막는가"만 정리한다.

---

## 1. 종교·민족 소수자를 노린 스파이웨어·악성앱 사례 (2023~2026)

### 1-1. 위구르·티베트 대상 가짜 종교앱·문화앱 (BADBAZAAR / MOONSHINE)
- **위협**: 쿠란 오디오 앱, 기도 앱, 티베트 문화 앱, 위구르어 도구, WhatsApp·Telegram·Signal 트로이목마 버전 등으로 위장한 Android/iOS 감시 앱. 마이크·카메라·메시지·사진·실시간 위치를 수집한다.
- **사례·연도**:
  - 2025-04-09: 영국 NCSC·NSA·FBI 등 Five Eyes + 독일 기관 공동 권고. "Audio Quran.apt"(위구르어 파일명)에 MOONSHINE, iOS "TibetOne"(2021-12 App Store 등록 후 삭제)에 BADBAZAAR가 실려 있었음을 공개. MOONSHINE은 2024-07 이후 50개 이상의 앱을 사용했고, 다수가 WhatsApp/Telegram 트로이목마 또는 무슬림 문화·기도 앱 위장이었다. 배포는 티베트 관련 Telegram 채널과 Reddit 포럼에서 직접 이루어졌다.
  - Lookout 분석: BADBAZAAR는 2018년 말부터 111개 이상의 앱을 사용했으며, 2022년 하반기 샘플의 70% 이상이 위구르어 커뮤니케이션 채널에서 발견됐다. 대상은 신장 위구르인뿐 아니라 터키·아프가니스탄 등 해외 무슬림 집단까지 포함.
- **방어 조치**: 공식 스토어 외 APK 설치 금지(Android Advanced Protection이 이를 강제), 메신저·종교앱은 개발사 공식 계정/공식 스토어 링크로만 설치, 채팅방에서 공유된 APK·IPA는 절대 열지 않기, 커뮤니티 차원의 경고 공유.
- **출처**: https://www.ncsc.gov.uk/news/advisory-badbazaar-moonshine , https://www.ic3.gov/CSA/2025/250409.pdf , https://www.lookout.com/threat-intelligence/article/badbazaar-surveillanceware-apt15 , https://therecord.media/ncsc-shares-details-on-spyware-targeting-uyghur-tiben-taiwanese-groups

### 1-2. 위구르어 소프트웨어 트로이목마 (Citizen Lab, 2025-04-28)
- **위협**: 세계위구르회의(WUC) 고위 인사들이 2025-03 파트너 단체를 사칭한 스피어피싱을 받았다. Google Drive 링크 → 비밀번호 걸린 RAR → 정품 오픈소스 위구르어 편집기 UyghurEditPP의 변조판. Windows 백도어로 시스템 정보 수집·파일 업다운로드·명령 실행 가능. 인프라 흔적은 2024-05까지 거슬러 올라간다.
- **방어 조치(Citizen Lab 권고)**: 공식 GitHub 등 검증된 출처에서만 내려받기, 코드 서명·"확인된 게시자" 확인, 타이포스쿼팅 도메인 주의.
- **출처**: https://citizenlab.ca/research/uyghur-language-software-hijacked-to-deliver-malware/

### 1-3. 티베트 불교 커뮤니티 대상 "달라이라마 90세 생일" 가짜 앱·사이트 (2025-07)
- **위협**: Zscaler ThreatLabz와 TibCERT가 Operation GhostChat / PhantomPrayers를 공개. 실제 티베트 자선단체 사이트를 변조해 가짜 사이트로 유도하고, "90th Birthday Global Check-in" 앱(지도에 위치를 찍어 축복을 보내라는 미끼)으로 Gh0st RAT / PhantomNet 백도어를 심었다.
- **방어 조치**: 행사·기념일 관련 "체크인 앱", "축하 메시지 앱"은 공식 기관 채널로 진위 확인 후 사용, 위치 권한 요구 앱 경계.
- **출처**: https://www.zscaler.com/blogs/security-research/illusory-wishes-china-nexus-apt-targets-tibetan-community , https://thehackernews.com/2025/07/china-based-apts-deploy-fake-dalai-lama.html

### 1-4. 디아스포라 활동가·언론인 대상 사칭 피싱 (Citizen Lab "Tall Tales", 2026-04)
- **위협**: 2025-04부터 위구르·티베트·대만·홍콩 디아스포라 활동가와 관련 보도 언론인을 노린 대규모 피싱·사칭. 기자, 영화감독, 유럽의회 의원 등 가짜 신원과 "기술회사 보안 경고" 사칭 이메일을 사용했고, 1년간 100개 이상의 유사 도메인이 확인됐다. 위구르계 캐나다 활동가 Mehmet Tohti의 제보로 조사 시작.
- **방어 조치**: 새 연락처의 신원은 별도 채널(전화, 기존 지인)로 교차 확인, 로그인 페이지로 가는 링크는 열지 않고 직접 주소 입력, 피싱 방지 인증(패스키/하드웨어 키) 사용.
- **출처**: https://citizenlab.ca/research/how-chinese-actors-use-impersonation-and-stolen-narratives-to-perpetuate-digital-transnational-repression/ , https://therecord.media/china-linked-hackers-led-phishing-campaigns-journalists

### 1-5. 상용 스파이웨어(Pegasus·Paragon Graphite·Predator)가 종교인·인권활동가에 쓰인 사례
- **Paragon Graphite (2025)**: WhatsApp이 2025-01-31 약 90명(20개국 이상의 언론인·시민사회)에게 표적 통보. 이탈리아 해상구조 NGO Mediterranea Saving Humans의 창립자 Luca Casarini, 활동가 Giuseppe Caccia가 감염 확인. 같은 단체의 **가톨릭 사제이자 선상 사목 담당 Don Mattia Ferrari**도 같은 날 Meta 통보를 받았으나, 이탈리아 의회 감독위 조사에서는 직접 감염 대상은 아니었다는 상반된 보도가 있다 → 감염 여부 **미확인**. Citizen Lab은 2025-03-19 인프라 분석, 2025-06 iOS 버전 최초 포렌식 확인(언론인 대상)을 발표했다.
- **Pegasus (2025~2026)**: 세르비아 학생운동 참여자의 iPhone이 2025-12~2026-01 iMessage 제로클릭으로 감염(Citizen Lab·Amnesty 독립 확인). 2026-07 Citizen Lab은 Pegasus 남용을 조사하던 전 유럽의회 의원 Stelios Kouloglou가 2022~2023 감염됐음을 확인. 세르비아에서는 2026년 초 이후 최소 14명이 표적(SHARE Foundation).
- **Predator (Intellexa)**: 2025-12 Amnesty Security Lab의 내부 유출 자료 분석. Recorded Future는 2025년에도 사우디·카자흐스탄·앙골라·몽골 고객 인프라가 활성이며 이라크에서 새 배치가 확인됐다고 보고. 파키스탄 발루치스탄 인권변호사가 WhatsApp 링크로 표적된 사례(첫 파키스탄 시민사회 대상).
- **종교 지도자를 특정한 2023~2026 상용 스파이웨어 감염 확인 사례**: 위의 Ferrari 사제 건 외에 이번 조사 범위에서 확인하지 못함 → **미확인**.
- **방어 조치**: iOS Lockdown Mode / Android Advanced Protection 상시 활성화, OS 즉시 업데이트, 모르는 번호의 WhatsApp/iMessage 링크 무시, 주기적 재부팅, Meta/Apple/Google의 "정부 지원 공격" 통보를 받으면 즉시 Access Now 헬프라인 또는 Amnesty Security Lab에 포렌식 요청.
- **출처**: https://citizenlab.ca/research/a-first-look-at-paragons-proliferating-spyware-operations/ , https://citizenlab.ca/research/first-forensic-confirmation-of-paragons-ios-mercenary-spyware-finds-journalists-targeted/ , https://www.ilfattoquotidiano.it/2025/02/24/paragon-mediterranea-don-mattia-ferrari-casarini-spionaggio/7890174/ , https://conflicts.digital/p/why-the-paragon-case-wont-go-away , https://citizenlab.ca/research/pegasus-spyware-infection-of-serbian-activist/ , https://www.amnesty.org/en/latest/news/2026/07/europe-brazen-hacking-of-former-mep-investigating-pegasus-abuses-exposes-painful-inaction-over-spyware/ , https://securitylab.amnesty.org/latest/2025/12/intellexa-leaks-predator-spyware-operations-exposed/ , https://therecord.media/intellexa-predator-spyware-continues-despite-sanctions

---

## 2. NGO·교회·선교단체 대상 피싱·계정탈취 실태와 방어

### 실태
- 2025년 기준 비영리 대상 자격증명 피싱이 전년 대비 50.4% 증가(Abnormal AI). 2025-08 미국 노스캐롤라이나·조지아 교회들이 목사 사칭 기프트카드 요청 피싱을 잇달아 신고. 교회 직원의 계정 탈취는 "아이디+비밀번호+MFA 코드"를 한꺼번에 입력하게 하는 실시간 피싱으로 발생한다.
- 국가 배후 사칭 피싱은 1-4 참고(위구르·티베트·홍콩 디아스포라, 2025~2026).
- **출처**: https://abnormal.ai/blog/nonprofit-sector-email-attack-trends , https://religionunplugged.com/news/2025/8/21/email-phishing-scams-increasingly-target-churches , https://enableministry.com/resources/top-5-cyber-threats-churches-face-in-2025/

### 방어
- **Google Advanced Protection Program(APP)**: 2026 현재 가입 조건은 "패스키 또는 보안 키 중 최소 1개". 물리 키 2개가 필수였던 시절과 달리 휴대폰 패스키만으로도 가입 가능. 효과: 검증되지 않은 서드파티 앱의 Gmail/Drive 접근 차단, 다운로드 강화 검사, 계정 복구 절차 강화, 앱 비밀번호 폐지. 대가: 일부 서드파티 앱·Apps Script 차단, 새 기기 로그인 시 키 필요.
- **패스키·하드웨어 키(YubiKey 등 FIDO 인증 키)**: 피싱 사이트에는 자격증명이 제출되지 않는 "피싱 저항" 인증. Google은 예비 키 1개 이상 보유를 권장.
- **SMS 2단계 인증의 약점**: Google은 2025-02 Gmail SMS 코드를 QR 코드·패스키로 단계적 대체한다고 발표했고, 이유로 SIM 스와핑과 코드를 가로채는 피싱을 명시했다(FBI 집계 2023년 SIM 스와핑 피해 4,800만 달러). SMS는 "없는 것보다 낫지만" 마지막 선택지로만 사용.
- **출처**: https://support.google.com/accounts/answer/7539956?hl=en , https://blog.google/technology/safety-security/google-passkeys-advanced-protection-program/ , https://www.forbes.com/sites/daveywinder/2025/02/26/google-confirms-gmail-to-ditch-sms-code-authentication/ , https://www.ghacks.net/2025/02/24/gmail-google-plans-to-end-sms-verification-in-favor-of-qr-codes/

---

## 3. 기기 방어 최신 상태

### 3-1. iOS Lockdown Mode (2026-09 기준 Apple 지원문서)
- 차단 항목: 메시지 첨부파일 대부분(일부 이미지·영상·오디오 제외), 링크 미리보기, 복잡한 웹 기술(JIT 등), 최근 30일 내 통화 이력 없는 FaceTime 수신, 잠금 상태 유선 액세서리 연결, 공유 앨범, 비보안 Wi-Fi, 2G/3G, 구성 프로파일·MDM 등록. iOS 16 이상 기본, iOS 17/macOS Sonoma 이후 추가 보호. Apple 문서에 iOS 26 전용 신규 항목은 명시되어 있지 않음 → iOS 26에서의 추가 변경 **미확인**.
- 보완: iOS 26(2025-09)에 Memory Integrity Enforcement(MIE)가 도입됐고, iPhone 17/Air의 A19 칩에서는 하드웨어 EMTE로 상시 메모리 안전 보호가 적용된다. 용병 스파이웨어의 익스플로잇 체인을 겨냥한 설계.
- **출처**: https://support.apple.com/en-us/105120 , https://freedom.press/digisec/blog/iphone-17s-killer-feature-memory-safety/ , https://appleinsider.com/articles/25/09/09/how-the-new-memory-shield-on-iphone-17-makes-you-even-more-secure

### 3-2. Android Advanced Protection (Android 16, 2025 도입)
- Google 지원문서 기준 기능: 출처 불명 앱 설치·업데이트 차단, Play Protect 강제, MTE, 접근성 도구 제한, 도난 감지 잠금, 오프라인 기기 잠금, **72시간 잠금 유지 시 자동 재부팅**, 잠금 중 USB 보호, 인증 실패 잠금, 2G 차단, Chrome HTTPS 강제·JavaScript 최적화기 비활성·WebGPU 비활성, 그리고 선택 기능인 **Intrusion Logging**(보안 이벤트를 종단간 암호화해 별도 서버에 보관, 키는 기기에만 존재, 12개월 후 자동 삭제, 수동 삭제 불가). RSF 보고에 따르면 2026-05 업데이트로 Intrusion Logging이 확대 제공됐다.
- **출처**: https://support.google.com/android/answer/16339980?hl=en , https://www.reporter-ohne-grenzen.de/en/artikel/blog/4242/new-protection-feature-against-sophisticated-spyware-advanced-protection-mode-for-android , https://www.androidauthority.com/android-advanced-protection-3556885/

### 3-3. 전체 디스크 암호화
- **Windows**: 11 24H2부터 하드웨어 요건 충족 + Microsoft 계정 로그인 시 클린 설치·재설치에서 기기 암호화가 자동 활성화되고 복구 키가 MS 계정에 저장된다(Home 에디션은 제조사 UEFI 플래그에 따라 다름). 복구 키가 클라우드 계정에 있다는 점은 계정이 탈취되면 디스크도 열린다는 뜻이므로, 계정 보호(2번)와 세트다.
- **macOS FileVault, iOS, Android**: 최신 iPhone/Android는 기본 암호화. 단 암호화는 "잠금 화면 + 강한 암호"와 결합될 때만 의미가 있다(4번 BFU/AFU 참고).
- **출처**: https://www.tomshardware.com/software/windows/windows-11-24h2-will-enable-bitlocker-encryption-for-everyone-happens-on-both-clean-installs-and-reinstalls , https://learn.microsoft.com/en-us/answers/questions/2199190/how-to-install-windows-11-24h2-without-bitlocker-e

### 3-4. 생체인증 vs 비밀번호: 국경·구금 시 법적·실무적 차이
- **법적(미국)**: 비밀번호 강제는 "마음속 내용의 진술"로서 수정헌법 5조 보호를 받는다는 데 법원들이 대체로 일치. 생체인증은 분열: 제9순회항소법원 US v. Payne(2024)은 강제 지문 해제를 비진술적이라 봤고, D.C.순회항소법원 US v. Brown(2025-01)은 위헌이라 판단. 연방대법원 판단은 없음. 즉 지역·상황에 따라 결과가 달라진다.
- **실무적**: 얼굴·지문은 본인 의사와 무관하게 물리적으로 제시될 수 있다. EFF·Proton 등은 국경 통과 전 생체인증 끄기, 긴 영숫자 암호, 완전 전원 끄기(BFU 상태 진입)를 권고.
- **한국·중국 등 다른 관할권의 법적 취급**: 이번 조사 범위에서 확인하지 못함 → **미확인**.
- **출처**: https://www.troutman.com/insights/us-v-brown-district-of-columbia-circuit-rules-on-compelled-biometric-unlocking-of-cellphones/ , https://cdt.org/insights/circuit-court-split-lays-the-groundwork-for-scotus-case-on-biometric-cell-phone-unlocking/ , https://www.eff.org/deeplinks/2025/06/journalist-security-checklist-preparing-devices-travel-through-us-border

### 3-5. GrapheneOS
- 2025-02 유출 Cellebrite 매트릭스에서 잠금 상태의 GrapheneOS Pixel은 전 모델 "접근 불가"(2022년 말 이후 빌드). 자동 재부팅(기본 18시간, 최소 10분), 잠금 중 USB 차단, Duress PIN(입력 즉시 eSIM 포함 완전 소거, 중단 불가) 제공.
- 2026 현황: Pixel 10 시리즈 공식 지원. 2026-03 MWC에서 Motorola와 장기 파트너십 발표로 Pixel 전용 시대 종료(구체 기기·출시 시점 미정).
- 주의: Duress PIN은 "증거 인멸"로 해석될 위험이 있는 관할권이 있으므로 법률 자문 없이 사용하지 말 것(법적 취급은 **미확인**).
- **출처**: https://grapheneos.org/features , https://osservatorionessuno.org/blog/2025/03/a-deep-dive-into-cellebrite-android-support-as-of-february-2025/ , https://www.androidauthority.com/cellebrite-leak-google-pixel-grapheneos-security-3611794/ , https://www.androidauthority.com/grapheneos-motorola-partnership-announced-3645710/

---

## 4. 국경 포렌식 도구(Cellebrite·GrayKey·MSAB)의 공개된 능력 범위 (2025~2026)

정직하게 요약하면: **"잠긴 최신 iPhone/Android도 AFU 상태면 상당 부분 열릴 수 있고, BFU 상태·강한 암호·최신 OS·GrapheneOS는 여전히 큰 장벽"** 이다.

- **BFU vs AFU**: 재부팅 후 한 번도 잠금 해제하지 않은 BFU 상태에서는 대부분의 사용자 데이터 키가 메모리에 없다. 한 번이라도 해제한 AFU 상태는 키가 메모리에 올라와 있어 포렌식에 훨씬 취약하다. 유출된 2024년 여름 Cellebrite 매트릭스는 당시 최신 iOS 전 기기가 AFU 상태에서 강제 접근 가능했음을 보여줬다.
- **iOS 비활성 재부팅**: iOS 18.0에서 7일, 18.1(2024-10)에서 72시간으로 단축. Secure Enclave가 타이머를 관리해 비행기 모드·패러데이 백으로 막을 수 없다. Magnet Forensics는 72시간 전에 기기를 연결하면 재부팅을 중단시킬 수 있다고 밝혔다. Android 16 Advanced Protection도 72시간 자동 재부팅을 제공.
- **Cellebrite 2026**: 2026-05-29 블로그에서 "최신 iPhone 모델·iOS 버전의 AFU·BFU 모두 지원", "이전에 미지원이던 iOS 구성에 새로운 AFU 접근법", "최신 Samsung·Pixel FFS 추출 복원·확대"를 주장. 단 버전 번호·기기 목록·검증 자료는 없는 마케팅 자료다. 2026년 봄 릴리스의 "Safeguard Mode"(압수 기기의 BFU 복귀 방지)는 2차 출처 보도만 있어 **미확인**.
- **GrayKey(Magnet)**: 2024-11 유출 문서상 iOS 18.0/18.0.1은 "부분 접근"(암호화되지 않은 파일·메타데이터 수준), iOS 18.1 베타는 접근 불가. 2025~2026 최신 버전에 대한 유출 자료는 **미확인**.
- **MSAB XRY Pro**: 2025-08 Qualcomm 칩 잠긴 Samsung의 브루트포스·FFS 추출 지원, 2025-11 MediaTek 확대, 2026-03 "고급 잠금 해제" 확대 발표. 구체 iOS 버전은 공개하지 않음.
- **Lockdown Mode의 영향**: 유출 Cellebrite Premium 문서에는 Lockdown Mode 언급이 없으며 커뮤니티 분석은 "Cellebrite에겐 아무것도 바뀌지 않는다"고 본다. Lockdown Mode는 원격 익스플로잇을 막는 기능이지 물리 포렌식 방어책이 아니다. 단 "잠금 중 액세서리 연결 차단"은 유선 접근의 문턱을 높인다.
- **삭제 데이터 복구**: FFS 추출은 SQLite 잔여물·WAL 저널·로그·임시 폴더에서 삭제 기록을 되살릴 수 있다. "삭제"는 방어가 아니다. 반면 Samsung Secure Folder는 사용 중엔 기기 수준 추출로 복호화되지만, 폴더 자체를 제거하면 암호화 디렉터리가 안전하게 소거되어 메타데이터 흔적만 남는다는 연구가 있다.
- **숨김 앱·비밀 폴더**: 계산기형 볼트 앱·iOS 숨김 앨범·앱 숨기기는 포렌식 도구가 PIN을 우회해 앱 샌드박스를 직접 읽으므로 **사실상 드러난다**. 연구(VIDE 등)와 실무 모두 볼트 앱을 "프라이버시 함정"으로 분류한다. 유일하게 의미 있는 방어는 "그 기기에 데이터를 두지 않는 것"이다.
- **출처**: https://cellebrite.com/en/blog/the-access-gap-is-closed-what-cellebrite-can-unlock-in-2026/ , https://news.ycombinator.com/item?id=45100219 , https://www.magnetforensics.com/blog/understanding-the-security-impacts-of-ios-18s-inactivity-reboot/ , https://9to5mac.com/2024/11/20/graykey-iphone-hacking-tool-can-partially-access-iphone-16-but-betas-protect/ , https://www.404media.co/leaked-documents-show-what-phones-secretive-tech-graykey-can-unlock-2/ , https://www.msab.com/updates/release-xry-11-1-1/ , https://www.msab.com/updates/q1-2026-major-release-is-now-available/ , https://discuss.privacyguides.net/t/updated-cellebrite-iphone-support-matrix-leak/19578?page=2 , https://www.magnetforensics.com/blog/mobile-anti-forensics-and-the-impact-on-evidence-recovery/ , https://www.sciencedirect.com/science/article/pii/S2666281720302560

---

## 5. 보안 메신저 2026 현황

- **Signal**: 러시아·베네수엘라 2024-08 차단, 이란은 장기 차단(Signal은 TLS 프록시 운영을 요청). 설정 > 개인정보 > 고급 > "검열 우회" 옵션. 사용자명 기능으로 전화번호 노출 없이 연락 가능. 사라지는 메시지(대화별 타이머), 2026-07 Android 8.18부터 통화 기록도 함께 사라짐. 2025-09(Android)·2025-11(iOS) Secure Backups 도입: 기기에서 생성한 64자 복구 키로만 열리는 암호화 백업, 키 분실 시 복구 불가. 서버는 마지막 접속 시각 정도만 보관.
- **WhatsApp**: 메시지는 E2EE지만 2025-02 정책 기준 전화번호·연락처·프로필·마지막 접속·IP·기기 ID·그룹 소속 등을 Meta와 공유. 2025-06 Status·Channels 광고 도입(개인 채팅 제외). 2025-04 "Advanced Chat Privacy"(내보내기 차단·미디어 자동 다운로드 차단)는 대화별 옵션이며 기본 꺼짐. 표적 통보 체계(Paragon 90명 통보)는 장점.
- **Telegram**: 기본 채팅·그룹은 서버 측 암호화로 종단간이 아니다. 2024-08 Durov 체포 후 2024-09 정책 변경 → 범죄 수사 일반에 IP·전화번호 제공. 미국 요청 이행은 2024년 1~9월 14건에서 연말 900건으로 급증, 2025년 1분기에만 13,600건 요청에 22,777명 정보 제공(인도 9,197건 최다). 종교 소수자·선교 활동의 조직 채널로는 부적합.
- **대안 비교**
  - *Briar*: 인터넷 없이 Bluetooth/Wi-Fi/Tor로 P2P. 단절 환경에 유리, 기기 간 동기화·iOS 지원 제한. (2025~2026 신규 변화 **미확인**)
  - *Session*: 계정에 전화번호 불필요, 2024-10 스위스 재단으로 이관. 2021년 전방향 비밀성(PFS) 제거로 암호학자 비판을 받았고, 2025-12 Protocol V2로 PFS 복원·양자내성 키교환을 발표. 완전 배포·검증 여부는 **미확인**.
  - *SimpleX*: 전화번호·사용자명·공개키 등 사용자 식별자가 전혀 없어 메타데이터 최소화. 사용 편의성과 다중 기기 지원이 약점.
  - *Delta Chat*: 이메일 인프라 위 Autocrypt/OpenPGP. 메신저가 차단된 곳에서 이메일 서버만 있으면 동작하지만, 메타데이터(제목·발신자·수신자)가 이메일 서버에 남는다. (2025~2026 신규 변화 **미확인**)
- **출처**: https://signal.org/blog/help-iran-reconnect/ , https://www.engadget.com/social-media/russia-and-venezuela-have-blocked-encrypted-messaging-app-signal-221433099.html , https://freedom.press/digisec/blog/signals-new-secure-backup-feature/ , https://aboutsignal.com/news/signal-will-soon-automatically-delete-call-events-in-disappearing-chats/ , https://www.eff.org/deeplinks/2025/09/what-whatsapps-advanced-chat-privacy-really-does , https://about.fb.com/news/2025/06/helping-you-find-more-channels-businesses-on-whatsapp/ , https://techcrunch.com/2025/01/07/telegram-reports-spike-in-sharing-user-data-with-law-enforcement/ , https://www.404media.co/telegram-gave-authorities-data-on-more-than-20-000-users/ , https://te-k.github.io/telegram-transparency/ , https://www.privacyguides.org/news/2025/12/03/session-messenger-adds-pfs-pqe-and-other-improvements/ , https://netguardia.com/privacy/anonymity/signal-session-simplex-and-matrix-messaging-anonymity-compared/

---

## 6. 오프라인·격리 환경과 여행용 기기 원칙

- **Tails**: 7.0(2025-09, Debian 13 기반, RAM 3GB 요구), 7.5(2026-02, Tor Browser·Thunderbird 갱신), 7.6(2026-03, 지역별 Tor 브리지 자동 감지로 검열 우회 수동 설정 불필요, 비밀번호 관리자를 KeePassXC에서 Secrets로 교체). USB에서 부팅해 종료 시 흔적을 남기지 않으며, 필요 시 암호화된 Persistent Storage만 유지.
- **여행용 기기 원칙(EFF 2025-06 언론인 체크리스트)**: 필요한 최소 기기만 휴대, 데이터가 거의 없는 전용 여행 기기 고려, 출발 전 백업 → 초기화 → 필수 정보만 재적재, 길고 예측 불가능한 영숫자 암호를 외워서 사용, BitLocker/FileVault 등 전체 디스크 암호화, 검색대 앞에서 완전 전원 끄기, 클라우드 앱(Drive·Dropbox·iCloud·메일) 완전 로그아웃(로그인 상태면 검사관이 앱을 열어 동기화된 내용을 볼 수 있음), 민감 파일·채팅·브라우징 기록 삭제 후 "최근 삭제" 폴더까지 비우기, Signal을 남긴다면 사라지는 메시지 설정. 압수 시 보관 영수증(미국은 Form 6051D) 요구, 담당자 이름·배지번호·사용 장비 기록.
- **주의**: EFF의 Sophia Cope는 "데이터가 전혀 없는 기기 자체가 의심을 살 수 있다"고 지적. 완전 공백보다 "평범한 여행자 수준의 데이터"가 자연스럽다.
- **귀국 후 복원**: 여행 기기는 귀국 후 다시 초기화하고, 본 기기는 여행 전 백업에서 복원. 여행 중 사용한 계정 비밀번호는 교체하고 로그인 이력·연결된 기기 목록을 점검한다. (이 절차는 EFF 권고를 종합한 실무 정리이며 단일 출처의 문구는 아님.)
- **출처**: https://blog.torproject.org/new-release-tails-7_0/ , https://blog.torproject.org/new-release-tails-7_6/ , https://www.eff.org/deeplinks/2025/06/journalist-security-checklist-preparing-devices-travel-through-us-border , https://www.eff.org/wp/defending-privacy-us-border-guide-travelers-carrying-digital-devices , https://proton.me/blog/border-crossing-protect-electronics

---

## 7. 문서·이미지 메타데이터 노출과 제거

### 무엇이 새는가
- docx/pptx/xlsx: 작성자·마지막 수정자·조직명·수정 이력·주석·숨김 텍스트·사용자 정의 XML·서버 속성.
- PDF: Author/Creator/Producer, XMP 메타데이터, 삭제한 줄 알았던 원본 객체(고아 객체).
- 사진: EXIF의 GPS 좌표·촬영 시각·기기 모델·일련번호.
- 화면 캡처: 상단바의 계정명·시간대·알림, 브라우저 탭·프로필 아이콘, 파일명에 포함된 계정·기기명.
- 인쇄물: 다수의 컬러 레이저 프린터·복합기가 날짜·시간·기기 일련번호를 담은 노란 점(MIC)을 찍는다. EFF 목록은 더 이상 갱신되지 않으며, 최신 기기는 고전적 노란 점이 아닌 다른 형태의 코드를 쓰기도 한다.

### 제거 방법
- **Windows GUI**: Word/PowerPoint/Excel → 파일 > 정보 > 문제 확인 > 문서 검사(Inspect Document) > 모두 제거(원본 사본에서 실행 권장). 사진·파일: 탐색기에서 마우스 오른쪽 > 속성 > 자세히 > "속성 및 개인 정보 제거".
- **Mac GUI**: Word for Mac → 검토 > 문서 보호 > "저장 시 개인 정보 제거" 또는 도구 > 문서 검사. 사진 앱 > 파일 > 내보내기에서 "위치 정보 포함" 해제. 미리보기(Preview)는 EXIF를 완전히 제거하지 못하므로 아래 CLI를 권장.
- **명령어(Windows PowerShell / macOS Terminal 공통)**:
  - `exiftool -all= 사진.jpg` (EXIF 제거, 원본은 `_original`로 남으니 함께 삭제)
  - `exiftool -all:all= 입력.pdf -o 중간.pdf` 후 `qpdf --linearize 중간.pdf 최종.pdf` (qpdf가 고아 객체를 제거해 되돌리기 불가하게 함)
  - `mat2 문서.docx` (Linux/macOS; docx에서 exiftool이 못 지우는 항목까지 제거. Windows 네이티브 지원은 제한적)
- **인쇄물**: 흑백 프린터 사용 또는 프린터 대신 화면 공유. 노란 점 분석·익명화 연구 도구(DEDA) 존재. 사용 중인 프린터가 코드를 찍는지 여부는 모델별로 **미확인**으로 두고 찍는다고 가정하는 편이 안전.
- **출처**: https://support.microsoft.com/en-us/office/remove-hidden-data-and-personal-information-by-inspecting-documents-presentations-or-workbooks-356b7b5d-77af-44fe-a07f-9aa4d085966f , https://gist.github.com/KernelGhost/2d6861bac3de5bdc781b9f8b4fad273b , https://exiftool.org , https://0xacab.org/jvoisin/mat2 , https://www.eff.org/issues/printers , https://www.eff.org/pages/list-printers-which-do-or-do-not-display-tracking-dots , https://en.wikipedia.org/wiki/Printer_tracking_dots

---

## 8. EFF SSD · Security in a Box · Access Now 헬프라인의 2025~2026 권고 핵심

- **EFF Surveillance Self-Defense (2025 Year in Review)**: 암호화 가이드 4종을 간결하게 재작성, iPhone·Android 프라이버시 설정 가이드 신규(연중 갱신), "디지털 발자국 관리" 가이드 신규. 2025-06 국경 통과 언론인 체크리스트(6번 참조). 종교·인권 활동가에게 직접 적용되는 핵심: 위협 모델링 → 기기별 프라이버시 설정 → 국경 대비.
- **Security in a Box (Front Line Defenders, 2026 로드맵)**: 2026년 "메시징 앱 안전 사용", "온라인 통신 프라이버시", "Android 기기 보호" 가이드 갱신과 2024년 갱신 가이드 전면 재검토. 신규로 자기돌봄, AI의 안전한 사용, 악성코드·피싱 대응, Tails·Qubes OS·Zoom·Jitsi 도구 가이드 예정. 13개 언어 현지화.
- **Access Now Digital Security Helpline**: 24시간 무료, 2024년 4,000건 이상 요청, 2014~2021 누적 1만 건 대비 이후 3년간 2배 이상. 2023년 사건의 82%가 "이미 벌어진 사건"에 대한 사후 대응이었고, 헬프라인은 "예방 조치가 공격 증가를 따라가지 못한다"고 진단. 연간 약 1,000건의 스파이웨어 의심 접수 중 약 25건이 감염 확인. 종교·인권 활동가용 핵심 권고: 의심 통보를 받으면 기기를 초기화하지 말고 헬프라인에 먼저 연락(포렌식 증거 보존), 단체 단위로 사전 위협 모델링 세션 요청.
- **출처**: https://www.eff.org/deeplinks/2025/12/surveillance-self-defense-2025-year-review , https://ssd.eff.org/ , https://securityinabox.org/en/blog/2026-04-siab-roadmap/index.html , https://www.accessnow.org/help/ , https://nordvpn.com/blog/access-now-digital-security-helpline-report/ , https://surfshark.com/blog/access-now-helpline

---

## 선교사 기기 보안 체크리스트 초안 (20개)

**A. 계정**
1. 주 이메일·클라우드 계정을 Google Advanced Protection(또는 동급)에 등록하고, 패스키 1개 + 하드웨어 보안 키 2개(1개는 본국 보관)를 만든다.
2. SMS 2단계 인증은 모든 계정에서 제거하거나 최후 수단으로만 남긴다. 복구 전화번호도 점검한다.
3. 로그인 링크는 이메일·메시지에서 절대 클릭하지 않고 직접 주소를 입력한다. "보안 경고" 메일은 사칭 가능성을 먼저 의심한다.
4. 새 협력자·기자·단체의 연락은 기존에 아는 사람 또는 전화 등 별도 채널로 신원을 교차 확인한 뒤 응답한다.

**B. 기기 설정**
5. iPhone은 Lockdown Mode, Android는 Advanced Protection을 상시 켜고 OS·앱 업데이트를 미루지 않는다.
6. 종교앱·메신저·언어 도구는 공식 스토어 또는 개발사 공식 페이지에서만 설치한다. 채팅방·포럼에 올라온 APK/IPA/RAR은 열지 않는다.
7. 잠금은 6자리 이상 숫자가 아닌 긴 영숫자 암호로 하고, 국경·검문 전에는 생체인증을 끄고 완전 전원을 끈다(BFU 상태).
8. 노트북은 FileVault/BitLocker를 확인하고, BitLocker 복구 키가 저장된 MS 계정도 1번 수준으로 보호한다.
9. 기기를 72시간 이상 방치할 때 자동 재부팅이 작동하는지(iOS 18.1+, Android 16 AP) 확인하고, 평소에도 매일 한 번 재부팅한다.
10. 고위험 지역 상주자는 GrapheneOS Pixel을 검토하되, Duress PIN 같은 기능은 현지 법률 자문 후에만 사용한다.

**C. 통신**
11. 조직 내부 소통은 Signal(사용자명 사용, 사라지는 메시지 기본 1주 이하)로 하고, Telegram 일반 채팅·그룹은 조직 채널로 쓰지 않는다.
12. WhatsApp을 써야 한다면 대화별 Advanced Chat Privacy를 켜고, 메타데이터(누가·언제·누구와)는 Meta에 남는다는 전제로 사용한다.
13. 인터넷이 끊기는 환경을 대비해 Briar 또는 SimpleX를 미리 설치·테스트해 둔다.
14. Signal 검열 우회 옵션 위치와 프록시 사용법을 출국 전에 익힌다.

**D. 이동·국경**
15. 여행 기기를 별도로 두고, 출발 전 "백업 → 초기화 → 최소 데이터 적재"를 한다. 완전 공백 기기는 오히려 눈에 띄므로 평범한 수준의 사진·앱을 둔다.
16. 국경 전 모든 클라우드·메일·메신저 앱에서 로그아웃하고, 사진·브라우저·앱의 "최근 삭제" 폴더까지 비운다.
17. "숨김 앱", "비밀 폴더", 계산기형 볼트 앱은 포렌식에 그대로 드러난다고 가정하고, 두면 안 되는 자료는 기기에 두지 않는다.
18. 기기가 압수되면 영수증을 요구하고 담당자·장비·시간을 기록한 뒤, 되돌려받은 기기는 초기화 전 헬프라인과 상의한다.

**E. 문서·대응**
19. 외부로 나가는 문서·사진은 문서 검사(Inspect Document)·exiftool·mat2·qpdf로 메타데이터를 지우고, 화면 캡처는 계정명·시간·알림을 가린다. 인쇄물은 흑백 프린터를 우선한다.
20. Apple/Google/Meta의 "정부 지원 공격" 통보를 받거나 기기가 이상하면 초기화하지 말고 즉시 Access Now 헬프라인(help@accessnow.org, 24시간)이나 Amnesty Security Lab에 연락한다. 단체 차원에서 연 1회 Security in a Box 기준 위협 모델링을 한다.
