# Future Health Digital Innovation Challenge 2026 × Health Equity Radar Global — 독립 평가 (v1, 2026-10-24)

평가 원칙: 옹호 금지 · 확인 사실과 가설 구분 · 출처 없는 숫자 금지. 아래 "확인"은 2026-10-24에 실제 페이지·파일을 열어 읽은 것, "미확인"은 열지 못했거나 근거가 검색 요약뿐인 것이다. 내부 자산은 이 저장소(health-dashboard/)와 라이브 사이트를 직접 점검했다.

---

## 1. Executive Verdict

| 대상 | 결론 |
|---|---|
| **Health Equity Radar Global(기획안 그대로) 출품** | **NO-GO** |
| **이 대회 참가 자체** | **CONDITIONAL GO** — 공식 세부 과제 06 「Population and Workforce Health Early Warning」에 맞춰 기존 엔진·데이터 파이프라인을 재사용한 **한국 다중신호 조기경보 시제품**으로 전환할 때만 |
| 후보 C(허위정보) | **NO-GO** — 10개 과제 어디에도 해당 없음 |

NO-GO 근거 3가지(모두 확인 사실):
1. **공식 10개 Challenge Statement 중 "국가 간 건강격차 지표 조화·불평등 탐지"에 해당하는 항목이 없다.** 10개 전문을 Hack2skill 페이지 번들에서 그대로 확보해 대조했다(3절).
2. **한국–UAE–우간다 국가 내부 분해 비교는 공개 데이터로 불가능하다.** WHO HIDR에 한국·UAE는 성·연령 차원만 있고 소득·교육·지역 분해가 없다(한국 RMNCH 0행). UAE 유일의 위험요인 조사(2017–18)는 PDF뿐이고 노동자 캠프를 제외했다(5절).
3. **현재 자산에 AI가 없고, 국가 간 데이터는 국가 평균뿐이다.** /global/은 WDI 25개 지표의 국가 평균, WHO STEPS 파이프라인은 원자료 미확보로 재현값 0건, 설계 원칙상 LLM·예측 금지. 심사 6요소 중 「Technical depth」「Working solution」「Path to pilot」에서 설명할 것이 없다.

---

## 2. 공모전 공식 규정 검증표

출처: H2S = https://hack2skill.com/event/futurehealthchallenge/ (정적 HTML + 하이드레이션 번들 `_astro/EventClient.*.js`에서 10개 과제·FAQ·일정·심사요소 원문 추출) · PR = 2026-10-15 보도자료(futurehealthinitiative.ae, Zawya 동일문) · T&C = `/tnc` (Hack2skill **범용 플랫폼 약관 템플릿**이 이 대회명만 끼워 넣어 렌더링됨)

| 항목 | 확인 결과 | 출처 | 판정 |
|---|---|---|---|
| 참가 자격 | "Individuals, researchers, startups, developers, designers, clinicians… from anywhere in the world." 팀 1~5명, 국가 혼성 가능, 팀 대표·수상자 18세 이상 | H2S FAQ | 한국 거주·한국 국적 **문제 없음** |
| 공무원 참가 | 규정 없음. 단 "If you need permission from your employer or institution to take part, you are responsible for obtaining it." | H2S FAQ | **소속기관 확인은 참가자 책임** — 국가공무원법 겸직·영리업무 규정과 상금 수령 가능 여부를 기관에 서면 확인 필요(미확인) |
| 기존 프로젝트 재활용 | "Yes. Ideas, existing solutions, and early prototypes are eligible… Tell us how mature your solution is now and what you will build or improve during the Challenge." | H2S FAQ | **허용**. 단 "대회 중 무엇을 개선했는가"를 요구 |
| UAE 거주·현지 참석 | "No. The build runs online. The top three winning teams get to present in-person at GITEX 2026." | H2S FAQ | 참가는 온라인. **상위 3팀은 현지 발표**. 참석이 지급 조건인지·여비 지원 여부 **미확인** |
| 등록 마감 | H2S: 15 Oct–**10 Nov** / PR: "apply by 15th November" | H2S, PR | **충돌 확인됨**. 보수적으로 11/10 적용. H2S "Dates may be subject to change. Any change will be published on this page." |
| 제출물 | "A working prototype by 20th November, with technical documentation and a clear statement of your assumptions, dependencies, and limitations. Full requirements are shared when you register." | H2S FAQ | 영상·덱·저장소·영어 요건은 **등록 후 공개(미확인)** |
| 데이터 | "The organisers will not provide any data, including synthetic data. Use only data you have the legal right to use, declare every data source, and avoid personal data you do not need." | H2S FAQ | 공개 집계자료만 사용, 업무상 접근 자료 사용 금지 |
| 기술 제약 | "Technology-neutral… No platform, model, or device is mandatory." Azure 요구 없음 | H2S | — |
| 심사 요소 | 6개(배점 **미공개**): Health impact & clinical relevance / Technical depth & architecture / Working solution & demonstration quality / Responsible AI, safety & data governance / Scalability & deployment readiness / Commercial viability & path to pilot. 머리글 "Impact first. Then proof that it works." | H2S | — |
| 상금 | 50k/35k/20k USD. "Awards are subject to the final rules, eligibility verification, acceptance of award terms, and payment requirements." "Top three teams will be selected solely based on evaluations." | H2S | 후속 파일럿은 "may… potential pathways"(PR) — **확정 지원금 아님** |
| 세금·지급 | T&C 템플릿: "solely responsible for all applicable taxes", "paid within 60 days", "deduction of TDS as per the government rules"(인도 원천징수 용어) | T&C | 아부다비 자금 상금에 TDS 조항이 적용되는지 **미확인**. 한국 기타소득 신고는 세무 확인 필요 |
| 지식재산 | FAQ: "Intellectual property stays with you and your team. You may be asked to share your code base… for evaluation." **그러나** T&C 템플릿: 6개월 **독점 라이선스 우선매수권(right of first refusal)**, 제출 아이디어의 무제한 공개권, 마케팅 콘텐츠 영구 라이선스, "The Terms and Conditions herein shall prevail over any inconsistent terms" | H2S FAQ vs T&C | **FAQ와 약관이 모순**. 등록 전 support+fhdic@hack2skill.com 에 서면 확인 권고 |
| 과거 수상작 | 이 대회(Hack2skill판)는 **첫 회**. 별도 프로그램인 「Future Health Challenge(MIT Solve 공동, 2026-05)」만 수상 기록 존재 | PR, mediaoffice.abudhabi | 7절 참조 |

---

## 3. 10개 Challenge Statement와 기획안 적합성

전문은 scratchpad `fh/statements.json`에 보관. 아래는 제목·핵심 요구와 후보 A·B·C 적합도.

| # | 분야 | 제목 | 핵심 요구(원문 요약) | A 적합 | B 적합 | C 적합 |
|---|---|---|---|---|---|---|
| 01 | Fertility | Male Reproductive Health | 남성 생식건강 위험 조기 식별, 저마찰 평가, 안전한 분류·의뢰, 프라이버시 | × | × | × |
| 02 | Fertility | Reproductive Potential | 생식능력 변화의 종단 뷰, 평이한 해석, 개인 맞춤 선택지 | × | × | × |
| 03 | Fertility | Inherited Disease Risk (consanguinity) | 근친혼 관련 유전질환 위험 설명·상담 연결 | × | × | × |
| 04 | Population Health | Precision Prevention and Screening | "authorized clinical, genomic, developmental, behavioral, family-history, Well-Child Visit, adult screening and contextual data"로 미충족 위험 식별 → 적시 등록·리콜·추적. "suppress small cells" | △ (지역 단위 미충족 검진 식별만 부분 부합; 개인 등록·리콜은 불가) | × | × |
| 05 | Population Health | Closing the Screening-to-Care Loop | 검진 양성 결과 → 통보·확진·의뢰·종결 추적 | × | × | × |
| 06 | Population Health | **Population and Workforce Health Early Warning** | "Combine at least two materially different signal types, such as clinical or service data with environmental, workplace or community data." 설명 가능한 이상탐지, 비례적 예방조치 권고, 소셀 억제, **"Back-test against historical or simulated scenarios and report lead time, sensitivity, positive predictive value, false alarms, data latency"** | × | **○** | × |
| 07 | Population Health | Climate-Resilient Worker Health | 폭염 노동자 개인·작업반 단위 경보(웨어러블·현장 조건) | × | △ | × |
| 08 | Population Health | Protecting Brain Health Earlier | 인지기능 종단 변화 탐지, 문화적 타당성 | × | × | × |
| 09 | Wellbeing | Sustaining Healthy Behaviors | 적응형 행동변화 루프 | × | × | × |
| 10 | Wellbeing | Earlier, Safer Mental Wellbeing Support | 조기 식별·단계적 연결·위기 에스컬레이션 | × | × | × |

확인 사실: 10개 과제에 "health equity", "inequality", "cross-country", "harmonization"이라는 표현은 없다. 형평성은 각 과제의 평가 항목(“fairness across…”, “equitable reach”) 즉 **솔루션의 부수 조건**으로만 등장한다. 허위정보는 어떤 과제에도 없다. 모든 과제가 **아부다비 보건체계 운영 문제**(Well-Child Visit, Malaffi형 통합자료, 근친혼 유전검사, 폭염 노동자)를 전제로 쓰였다.

---

## 4. 글로벌 경쟁 제품 비교표 (확인 2026-10-24)

| 제품 | 소유 | 대상 | 데이터 범위 | 분해 차원 | 불평등 지표 | AI 수준 | 개입 연결 | 가격 |
|---|---|---|---|---|---|---|---|---|
| **WHO HEAT v7 / HEAT Plus v7** (2026-03 출시) | WHO | 정책·사업 기획자 | HIDR 62개 데이터셋·2,400+ 지표·1,300만 포인트; HEAT Plus는 자체 자료 업로드(Windows 오프라인) | 22개 차원(연령·성·경제수준·교육·거주지·하위지역·장애·이주 등) | 기술노트 15종(SII·RII·PAR·ACI·Theil…), R 패키지 healthequal 21종 | 없음(v7 「Determinants」산점도는 기술적) | 없음 | 무료, AGPL-3.0 |
| **WHO HIDR** | WHO | 분석가 | 62개 데이터셋 | 최대 22개 | 원자료+SE/CI만 | 없음 | 없음 | 무료, API |
| **World Bank WDI / HEFPI v9** | WB | 일반 | WDI 1,500+ 지표 국가 수준; HEFPI 104지표·204국·~1,900 조사(2021까지, 파일 2023-02 최종) | WDI 국가만; HEFPI 빈곤/비빈곤·도농·하위지역 | HEFPI 분위 격차 | 없음 | 없음 | CC BY 4.0 |
| **IHME GBD 2023** | IHME | 연구자·보건부 | 204국, 하위지역 20개국 660곳(한·UAE·우간다 **국가만**) | 연령·성·지역 | 없음(SDI 비교) | 없음(공식 LLM 없음) | 없음 | **비상업 전용, 재배포·파생 데이터셋 금지** |
| **DHIS2 Scorecard / Bottleneck Analysis** | HISP(우간다 포함) | 보건부 사업관리자 | 자국 HMIS | 조직단위·기간 | 없음(신호등) | 없음 | 병목→Action Tracker | 무료 |
| **Zenysis Harmony** | Zenysis | LMIC 정부 8+국 | HMIS·재정·조사 통합 | 적재 자료 따름 | 없음 | 임계치 경보; LLM은 로드맵 | 없음 | AGPL, 구축 서비스 유료 |
| **County Health Rankings + What Works for Health + "Evi"(2025 LLM 검색)** | UW PHI | 미국 지방정부 | 미국 카운티 90지표, 400+ 전략 | 인종·장소 | 순위 격차 | LLM 검색 | **있음**(근거등급 6단계) | 무료, 자금 2026-12 종료 후 재원 전환 |
| **OHID Health Inequalities Dashboard** | 영국 OHID | 잉글랜드 | 4개 영역 | 성·박탈십분위·지역 | SII·RII·절대/상대 격차 | 없음 | 없음 | 무료 |
| **Google Data Commons (Gemini CLI/MCP, 2025-12·2026-02)** | Google | 개발자 | UN·WB·정부 | 출처 따름 | 없음 | LLM 자연어 질의 | 없음 | 무료 |
| **BlueDot Assistant** (2024-08) | BlueDot | 정부·제약 | 감염병 190+ | — | — | LLM 질의 | 위험 브리핑 | 상용 |

**이미 해결된 것**: (1) 조화된 분해 데이터(HIDR·HEFPI, 단 LMIC 중심), (2) 불평등 계산(HEAT v7·healthequal, 무료·오픈소스), (3) 근거등급 개입 목록(WWFH, 미국 한정), (4) LLM-over-공공데이터 배관(Data Commons MCP, 무료).
**진짜 공백**: 세 단계를 잇는 배포 제품은 없다. 그러나 (a) 엄밀 평가에서 LLM의 공중보건 자원배분 정확도는 0.46(arXiv 2025-11), (b) 고소득국(한·UAE)은 HIDR에 소득·교육·하위지역 차원 자체가 없어 "글로벌" 조화가 아니라 **국가별 통계원 개별 연결**이 실제 작업이다.
**중복 개발 위험**: 기획안 A·B(불평등 탐지)는 HEAT v7이 이미 무료로 제공. A의 차별점은 C·D(설명·개입)뿐인데 이는 현재 미구현이고, 이 대회 과제와 무관하다.

---

## 5. 한국·UAE·우간다 데이터 실재성·호환성 검증표

### 5-1. 국가별

| 국가 | 데이터 | 발행 | URL | 분해 | N | 라이선스/접근 | 문제 |
|---|---|---|---|---|---|---|---|
| KOR | 지역사회건강조사(KOSIS 공표표) | 질병관리청 | kosis.kr openapi | 258 조사단위·17 시도·성·연령, SE 포함 | 231,615(2025) | API 키·활용약관(KOGL 유형 미확인) | 원자료는 신청제(서약·이용계획·승인) |
| KOR | KNHANES | 질병관리청 | knhanes.kdca.go.kr | 성·연령·지역·소득 | ~10,000/년 | 동의 후 공개 다운로드 | 2024 자료 2025-12 공개 |
| KOR | WHO HIDR | WHO | datasafe API rep_gho/rep_sdg/rep_ncd | **성·연령·거주지만**, RMNCH 0행 | — | WHO terms | 소득·교육 차원 없음 |
| KOR | WHO STEPS | — | — | — | — | — | **한국은 STEPS 미실시(확인)** |
| ARE | Bayanat 연방 개방데이터 | FCSC | bayanat.ae (CC BY 4.0 확인) | 에미리트·성·**국적**; 연령 없음 | 행정 건수 | CC BY 4.0 | 유병률·조사지표 없음 |
| ARE | UAE National Health Survey 2017–18(STEPS+WHS) | MOHAP·WHO EMRO | cdn.who.int …uae-national-health-survey-report-2017-2018.pdf | 성·국적(Emirati/non)·연령; 에미리트별 추정치 **미공표** | 8,214 성인, RR 87% | PDF만, 마이크로데이터 없음(WHO 저장소 미등재) | **노동자 캠프·집단거주 제외** → 남성 이주노동자 누락 |
| ARE | MOHAP/DoH/DSC 개방데이터 | — | mohap.gov.ae, doh.gov.ae, dsc.gov.ae | — | — | — | 이번 환경에서 전부 503/403 → **미확인** |
| ARE | WHO HIDR/GHO | WHO | rep_ncd 35지표 | 성·연령 | — | WHO | 전부 모델 추정(NCD-RisC) |
| UGA | UDHS 2016 | UBOS/DHS | api.dhsprogram.com (읽음) | 거주지·지역·교육·**부의 5분위**·성 | 19,588가구 | DHS 등록 | — |
| UGA | UDHS 2022 | UBOS | unicef.org …UDHS-2022-Report.pdf | 14 하위지역+난민·거주지·교육·분위 | 19,758가구 | **DHS API 미등재, UBOS 아카이브 접속 불가 → 마이크로데이터 경로 미확인** | 최대 위험 |
| UGA | WHO STEPS 2023 | MoH/WHO | extranet.who.int/ncdsmicrodata/catalog/995 | 4지역×도농·성·연령·교육 | 3,694 | **Licensed(공개이용 아님)**: 출처 명기·출판계획 공유·공저 제안·비상업 | 기존 PoC 문서의 "public-use" 가정 **정정 필요** |
| UGA | UNHS 2023/24 | UBOS | jointdatacenter.org 미러 PDF | 15 하위지역·도농·성·분위 | 15,813가구 | UBOS 아카이브(미확인) | 생체지표 없음 |
| UGA | DHIS2 HMIS | MoH | hmis.health.go.ug | — | — | 로그인 전용 | 공개 없음 |

### 5-2. 3개국 공통 후보 지표(WHO GHO API 직접 조회)

| 지표 | KOR | UAE | UGA | 분해 | 측정/모델 |
|---|---|---|---|---|---|
| 흡연(연령표준화 15+) | 2024 | 2024 | 2024 | 성 | WHO 모델 |
| 고혈압 30–79 | 2019 26.7 | 2019 41.4 | 2019 32.5 | 성, HIDR 연령 10군 | NCD-RisC 모델 |
| 비만 BMI≥30 | 2022 7.4 | 2022 31.8 | 2022 8.4 | 성·연령; **UGA만** DHS 2016 부·교육·거주지 | 모델(UGA 일부 실측) |
| 당뇨(연령표준화) | 2022 10.4 | 2022 26.1 | 2022 5.2 | 성·연령 | 모델 |
| 5세 미만 사망 | 2024 2.8 | 2024 4.8 | 2024 48.7 | 성; **UGA만** 부의 분위(60.5→34.9) | UN IGME 모델 |
| 자살 사망률 | 2023 23.4 | 2023 2.8 | 2023 17.2(CI 9.3–28.2) | 성 | 모델(UAE·UGA 사망등록 취약) |
| 재난적 의료비 >10% | 2018(도농) | **2019 단일값, 분해 없음** | 2016(도농·성·연령) | — | 실측 |

**판정**: "3개국 모두 국가 내부 소득·교육·지역 분해"가 가능한 지표는 **0개**. 가능한 것은 국가 평균의 성·연령 비교(전부 모델 추정)뿐이며, 이는 WHO GHO·HEAT가 이미 제공한다.
**대체 설계**(DHS API·WHO 저장소에서 확인): ① 한국–**요르단**–우간다(요르단 DHS 2023, 19,475가구, 부·교육·지역 분해 확인; STEPS 2019 마이크로데이터 등재) — UAE를 아랍권 국가로 대체하는 최선안. ② 한국–필리핀–우간다(필리핀 DHS 2022, 30,372가구). ③ UAE 유지 시 "국가 내부"를 성×연령(+UAE 국적, 우간다 부)으로 재정의 — 정직하지만 약함.

---

## 6. 후보 A·B·C 비교 평가표 (자체 100점, 공식 배점 아님)

자체 가중: 공식 과제 적합 25 · 데이터 실재 15 · 27일 실현성 15 · 기술 깊이 15 · 검증 가능 증거 10 · 차별성 10 · 파일럿 경로 10

| 항목 | A. HER Global(기획안) | A′. HER를 과제 04에 맞춰 축소(한국 검진 미충족 지역) | **B′. 과제 06 다중신호 조기경보(한국 폭염·대기질 + 응급실 감시)** | C. 허위정보→행동 |
|---|---|---|---|---|
| 공식 과제 적합 /25 | 4 | 12 | **21** | 0 |
| 데이터 실재 /15 | 5 | 11 | 11 | 6 |
| 27일 실현성 /15 | 9 | 10 | 9 | 6 |
| 기술 깊이·AI /15 | 3 | 5 | 9 | 7 |
| 검증 증거 /10 | 3 | 4 | 6(백테스트 가능) | 2 |
| 차별성 /10 | 4 | 4 | 5 | 3 |
| 파일럿 경로 /10 | 3 | 4 | 5 | 2 |
| **합계** | **31** | **50** | **66** | **26** |

B′ 설계 요지(확인된 공개 데이터만): 질병관리청 **온열질환 응급실감시체계** 일별 자료(공공데이터포털 15126731·15122866: 지역·연령·성·**직업**·발생장소, 2011~; 5/15~9/30 운영) + 기상청 관측자료(일최고기온·습도) + 에어코리아 대기질 API(PM2.5·O3, 이용허락 제한 없음) + 선택: 감염병 주간 발생(공공데이터포털). 시도·주 단위 기준선 대비 이상탐지(기존 Mann-Kendall·Gi* 코드 재사용), 2011–2025 **백테스트로 선행시간·민감도·PPV·오경보율 보고**, 설명 가능한 경보 카드(기존 buildReasons 구조), 소셀 억제·집계 전용(개인정보 없음), 예방조치 권고는 질병청 폭염 대응지침·고용노동부 열사병 예방 3대 수칙 **원문 링크**(기존 evidence_registry 검증 방식). UAE 연계는 "미드데이 브레이크" 정책 맥락과 Statement 07 교차 언급에 그치고, UAE 공개 열질환 통계는 **미확인**이므로 UAE 데이터 사용을 약속하지 않는다.

---

## 7. 주요 결격·탈락 위험 10개

1. **과제 불일치(치명)**: A는 10개 과제 어디에도 없다. 심사 첫 요소 "Health impact and clinical relevance"가 아부다비 과제 기준으로 평가된다.
2. **AI 부재**: 현재 자산은 규칙 기반 백분위·신호. 설명 가능 AI(C)·개입 추천(D)은 미구현. 27일 안에 LLM 설명층을 붙여도 "환각률·출처 일치율" 검증 시간이 없다.
3. **국가 간 데이터 비교 불가**: 5절. 무리하게 비교하면 "Responsible AI, data governance"에서 감점.
4. **우간다 STEPS 2023 라이선스**: 공개이용이 아니라 Licensed(비상업·출판 사전 공유·공저 제안). 상업화 전제의 제품에 쓰면 약관 위반 위험. UDHS 2022 마이크로데이터 경로 미확인.
5. **UAE 데이터 공백**: 유일한 조사가 2017–18 PDF, 노동자 캠프 제외, 에미리트별 추정 없음. 개최국 데이터로 "할 수 있는 것"이 사실상 없다.
6. **공무원 신분**: 상금 수령·대외 출품·GITEX 참석(출장/연가)·IP 귀속을 소속기관이 승인해야 한다. 미확인 상태로 등록하면 수상 뒤 지급 단계("eligibility verification, acceptance of award terms")에서 탈락할 수 있다.
7. **약관 모순**: FAQ "IP는 참가자 소유" vs 템플릿 T&C "6개월 독점 라이선스 우선매수권·아이디어 무제한 공개권", "T&C가 우선". 서면 확인 없이는 상업화 계획과 충돌.
8. **수상작 패턴과의 거리**: Future Health 1회 대회(MIT Solve) 수상 3건 모두 수년 배포·동료심사 검증 제품(ThinkMD 9,000명 현장요원·885시설, VectorCam 우간다 22개 구, Huna 50만 명). 조사한 20여 대회에서 **공개 지표 시각화 도구가 대상을 받은 사례 없음**.
9. **사용자·검증 0**: 실무자 테스트 미실시, 외부 검토 게시 0건. "Working solution" 요소는 데모 품질로 일부 보완 가능하나 "path to pilot"은 공백.
10. **일정·단독 개발**: 등록 마감 11/10(보수치), 시제품 11/20. /global/ 응답이 1회 connection reset(불안정) 관측. 단독 개발자가 새 과제로 전환하면서 백테스트·영문 문서·데모 영상을 27일에 끝내야 한다.

---

## 8. 개발비와 27일 실행 가능성 (2026-10-24 → 11-20)

전제: 기존 코드(React 단일 HTML, 통계 함수, 근거 링크 검증기, 영문 랜딩)와 GitHub Pages/Vercel 무료 호스팅 재사용. 아래 비용은 **가정**이며 견적이 아니다.

| 항목 | 개인 1인 | 2~3인 팀(역학 1 + 개발 1~2) |
|---|---|---|
| 데이터 수집·정제(온열질환 일별 2011–2025, 기상·대기질 API, 코드 매핑) | 5일 | 3일 |
| 이상탐지·백테스트(기준선·선행시간·민감도·PPV·오경보) | 6일 | 4일 |
| 경보 카드·설명·근거 링크·소셀 억제 UI | 5일 | 3일 |
| 영문 데모·기술문서(가정·한계 명시)·영상 | 4일 | 3일 |
| 검증·수정 여유 | 3일 | 4일 |
| **합계** | **23일(여유 4일)** | **17일(여유 10일)** |
| LLM API(설명문 생성, 선택) | 가정 US$20–100 | 동일 |
| 클라우드·도메인 | 0(기존) | 0 |
| 외부 전문가 | 산업보건·기상 1인 자문 권장(무보수 가정) | 동일 |
| GITEX 현지 참석(수상 시) | 항공·숙박 5박 **가정 300~450만 원**, 여비 지원 미확인 | 인원 비례 |

판단: B′는 1인도 가능하나 여유가 4일뿐이다. A(기획안)는 데이터 자체가 없어 일수와 무관하게 불가능하다.

---

## 9. 1등 경쟁력을 높이기 위한 핵심 수정안 5개

1. **과제를 06으로 고정하고 이름을 바꾼다**: "Health Equity Radar"는 영문 소개·방법론 페이지의 **자산 설명**으로만 남기고, 출품명은 조기경보 도구로. 심사위원은 과제 번호로 읽는다.
2. **"두 가지 이상 서로 다른 신호"를 문자 그대로 충족**: 임상/서비스 신호(응급실 온열질환 신고) + 환경 신호(기온·습도·PM2.5) + 선택 지역사회 신호(직업·발생장소). 과제 원문 문구를 기술문서 소제목으로 그대로 쓴다.
3. **백테스트 표를 데모 첫 화면에**: 2018·2023·2025 폭염 시즌별 선행시간·민감도·PPV·오경보율·자료 지연. 과제 06 "Operational validation" 항목을 수치로 답하는 팀은 드물 것이다(가설).
4. **Responsible AI를 기존 강점으로 증명**: 집계 전용·소셀 억제·신뢰구간·"예측이 아니라 기준선 이탈"·근거 링크 자동 검증(21/21 통과 기록)·금지 표현 빌드 차단 — 이미 있는 장치를 영문 한 장으로 정리.
5. **파일럿 경로를 구체적 기관명으로**: 한국은 보건소·지자체 폭염 대응 TF(실무자 테스트 프로토콜 즉시 실행, 2~3명이라도 기록), 아부다비는 Statement 07과의 연결(노동자 폭염)을 "다음 단계"로만 기술. 사용자 수·효과는 쓰지 않는다.

---

## 10. 최종 추천안 1개와 이유

**추천: Health Equity Radar Global 출품을 중단하고, 참가한다면 과제 06 「Population and Workforce Health Early Warning」용 한국 다중신호 조기경보 시제품(B′)으로 전환한다. 소속기관 승인과 약관 서면 확인이 11월 초까지 안 되면 참가하지 않는다.**

이유: (1) 공식 과제에 맞는 유일한 후보다. (2) 필요한 데이터가 전부 한국 공개 집계자료이고 라이선스가 깨끗하다. (3) 참가자의 역학·감시 전문성이 심사 요소 1·4에 직접 쓰인다. (4) 기존 통계 엔진·근거 검증기·영문 랜딩을 재사용해 27일 안에 끝낼 수 있다. (5) 떨어져도 산출물(폭염 조기경보 백테스트)이 health-profile.kr의 "3단계 신청제 자료 연계(온열질환)" 로드맵과 일치해 매몰비용이 적다.

병행 권고: Future Health가 2026-10-20 **2회 Impact Challenge(MIT Solve 공동) 관심표명 접수를 시작**했다. 1회 대회는 Prototype 단계부터 지원 가능했고 주제가 "Population Sensing"이었다. 한국 배포 실적·실무자 테스트 결과·외부 검토를 갖춘 Health Equity Radar는 **그쪽이 더 맞는 무대**다(주제·기준은 아직 미공개).

---

## 마지막 질문에 대한 답

**"심사위원이라면 Health Equity Radar Global을 최종 3팀에 넣을 실증적 이유가 있는가?"** — **없다.** 세 가지가 결정적이다. 첫째, 10개 과제 중 어느 것에도 해당하지 않으므로 첫 심사 요소에서 채점할 근거가 없다. 둘째, "Global"이라 부를 수 있는 부분은 WDI 국가 평균 25개 지표뿐이고, 국가 내부 격차는 한국만 있으며, 세 나라 비교는 데이터가 존재하지 않는다. 셋째, 1회 대회 수상작 세 팀이 보여 준 것(현장 사용자 수, 동료심사 검증, 보건부 파트너)에 해당하는 증거가 하나도 없고, 그 대회 자체도 공개 지표 대시보드에 상을 준 적이 없다.

**"그렇다면 무엇을 만들어야 하는가?"** — 과제 06의 문장을 그대로 충족하는 것: 한국 응급실 온열질환 신고(서비스 신호)와 기온·습도·PM2.5(환경 신호)를 합쳐 시도·주 단위 기준선 이탈을 탐지하고, 어느 신호·지역·기간이 경보에 기여했는지 보여 주며, 2011–2025 자료로 백테스트한 선행시간·민감도·PPV·오경보율을 표로 제시하고, 집계·소셀 억제·근거 링크 검증으로 책임성 요건을 채운 뒤, 보건소 실무자 2~3명의 사용 기록을 붙인 영문 데모다. 그것이 27일 안에 "Impact first. Then proof that it works."에 답할 수 있는 유일한 산출물이다.

---

### 부록: 확인 출처
- 대회: hack2skill.com/event/futurehealthchallenge/ (+ `_astro/EventClient.*.js`, `/tnc`, `/api/v1/event/futurehealthchallenge/event-tnc`) · zawya.com 보도자료 1680763 · futurehealthinitiative.ae(about-us, 2026-10-20 documentary/EOI) · mediaoffice.abudhabi(2025-11-02 출범, 2026-05 수상) · solve.mit.edu/challenges/future-health-challenge
- 경쟁: who.int/data/inequality-monitor (assessment_toolkit, data, hidr-api, 2026-03-03 뉴스) · github.com/WHOequity/HEAT · cran healthequal · datacatalog.worldbank.org 0037712/0038633 · healthdata.org 비상업 이용약관 PDF · docs.dhis2.org BNA · github.com/Zenysis/Harmony · countyhealthrankings.org 2025 wrap · analytics.phe.gov.uk · developers.googleblog.com Data Commons
- 데이터: kosis.kr openapi · chs.kdca.go.kr · kdca.go.kr 보도자료 304276/310235 · WHO datasafe rep_gho/rep_sdg/rep_ncd/rep_rmnch · ghoapi.azureedge.net · api.worldbank.org · bayanat.ae(Copyright) · cdn.who.int UAE NHS 2017–18 · dha.gov.ae 2024 연감 · api.dhsprogram.com(UG/JO/PH/KE) · unicef.org UDHS 2022 · extranet.who.int/ncdsmicrodata catalog/995 · jointdatacenter.org UNHS 2023/24 · data.go.kr 15126731/15122866
- 내부: docs/COMPETITION_EVIDENCE.md(2026-10-17) · docs/GLOBAL_RADAR_v0.2.md · docs/WHO_CROSS_COUNTRY_POC.md · docs/MIT_SOLVE_READINESS.md · global/data/wdi_compact.json(KOR/ARE/UGA 25지표 전수 확인)
- 미확인(열지 못함): mohap.gov.ae·doh.gov.ae·dsc.gov.ae·opendata.fcsc.gov.ae·dhsprogram.com 본문·ubos.org·healthdata.org 결과도구·wam.ae·등록 후 공개되는 제출 요건 전문
