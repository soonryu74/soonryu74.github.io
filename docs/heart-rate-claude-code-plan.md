# 심박·맥박 데이터를 클로드 코드로 기록·판독하기 — 조사·검증 보고서

작성일 2026-11-07 · 대상: 아이폰+애플워치 / 갤럭시+갤럭시워치 / 기타 밴드 사용자 · 검증 스크립트: `scripts/heart_rate_parse.py`

---

## 1. 결론 (한 줄)

**"워치 → 건강 앱 내보내기 파일 → 내 PC 폴더 → 클로드 코드(파이썬) 파싱·판독"** 경로가 비용 0원, 디바이스 불문, 외부 서버 불필요로 가장 타당합니다. 자동화는 2단계에서 아이폰은 Health Auto Export 앱(월 3,300원), 갤럭시는 헬스 커넥트 예약 내보내기(무료)로 붙입니다.

| 단계 | 할 일 | 비용 | 난이도 | 상태 |
|---|---|---|---|---|
| 1 | 수동 내보내기 + 파싱 스크립트 | 0원 | ★☆☆ | **완료(스크립트 검증)** |
| 2 | 자동 내보내기(앱/OS 기능) → 클라우드 폴더 동기화 | 0~3,300원/월 | ★★☆ | 설계 완료 |
| 3 | MCP 서버 연결 → 클로드 코드에서 자연어 질의 | 0원 | ★★★ | 후보 선정 |

---

## 2. 조사 범위

- 디바이스 8종 경로: 애플워치, 갤럭시워치, 가민, 핏빗, 샤오미(미밴드), 폴라, 오우라/후프, 어그리게이터(Terra·Junction·Open Wearables)
- 판독 근거: 손목 광학(PPG, 피피지) 센서 정확도 연구, 안정시 심박·HRV(심박변이도) 해석 연구, 국내 식약처 허가 현황
- 실행 검증: 애플 export.xml / 삼성 heart_rate CSV / Health Auto Export JSON 3종 형식을 합성 데이터로 생성 → 단일 스크립트로 파싱·일별 요약·기준선 판독 성공

---

## 3. 경로별 비교 (전 세계 현황, 2026-11 기준)

| 디바이스 | 경로 | 비용 | 자동화 | 데이터 깊이 | 안정성 | 판정 |
|---|---|---|---|---|---|---|
| **애플워치** | ① 건강 앱 → 프로필 → "모든 건강 데이터 보내기"(export.zip) → 파이썬 파싱 | 무료 | 수동 | 심박 전수·안정시·HRV(SDNN) | 매우 높음(공식) | **1순위** |
| | ② Health Auto Export 앱 → iCloud Drive/Dropbox CSV, REST API 전송 | 월 3,300원(프리미엄) | 일 단위 자동 | 분 단위 Min/Avg/Max | 중(iOS 백그라운드 제약 보고) | 2단계 |
| | ③ 단축어(Shortcuts) "건강 샘플 찾기" → 파일 저장 자동화 | 무료 | 자동 | 심박 전수 | 중(직접 제작) | 대안 |
| | ④ Apple Health MCP 서버(DuckDB/PostgreSQL/SQLite 기반 오픈소스) | 무료 | 내보내기 후 질의 | 전체 | 중(비공식) | 3단계 |
| **갤럭시워치** | ① 삼성헬스 → 설정 → 개인 데이터 다운로드(CSV 묶음, 24시간 내 메일) | 무료 | 수동 | 심박 전수 + 운동 중 연속심박(바이너리) | 높음(공식) | **1순위** |
| | ② 헬스 커넥트(Health Connect) 예약 내보내기 → Google Drive ZIP(Android 14+, 일/주/월) | 무료 | 자동 | 삼성이 헬스 커넥트에 쓰는 항목만(심박·수면·걸음) | 중(초기 0바이트 버그 보고) | 2단계 |
| | ③ samsung-health-mcp(CSV/ZIP 읽기, Node) · Health Hub(안드로이드 동반앱→자체 서버) | 무료 | ②와 결합 | 전체 | 중(비공식) | 3단계 |
| **가민** | python-garminconnect + MCP 서버 다수(mcp-garmin, garmin_mcp 등) | 무료 | 완전 자동 | 안정시·일중·HRV·구간 | 중(비공식 로그인 API) | 가민 보유자에겐 최선 |
| **핏빗** | 레거시 Web API **2026-11-02 종료(HTTP 410)**. 후속 Google Health API는 신규 프로젝트 접수 중단·Restricted 심사 | - | 불가 | - | 낮음 | **비추천** |
| **샤오미** | Gadgetbridge(오픈소스 앱) DB 내보내기. Zepp 앱은 실시간 제3자 접근 불가 | 무료 | 반자동 | 분당 1회 | 중 | 가능하나 번거로움 |
| **폴라** | AccessLink API(공식 OAuth2, 5분 연속심박) · H10 흉부밴드 BLE SDK(RR 간격=진짜 HRV) | 무료 | 자동 | 가장 깊음 | 높음(공식) | 정밀 HRV 콘텐츠용 |
| **오우라/후프** | 공식 API, 가공 점수 위주 | 구독 필요 | 자동 | 원자료 제한 | 높음 | 보조 |
| **어그리게이터** | Terra(월 $399), Junction(비공개), Open Wearables(MIT 오픈소스 셀프호스팅) | 고가/무료 | 자동 | 200+ 기기 통합 | - | 1인 사용엔 과함 |

### 핵심 판단 근거
- **구글 Fit REST API는 2026년 말 지원 종료**, 핏빗 API는 이미 종료. "클라우드 API로 끌어오기" 경로는 가민·폴라를 제외하면 사실상 막혔습니다.
- 애플·삼성 모두 **공식 내보내기 기능**이 있고, 파일 형식이 공개 분석 도구(파이썬, DuckDB)로 바로 열립니다. 외부 서버에 건강정보를 올릴 필요가 없습니다.
- MCP 서버는 모두 비공식 개인 프로젝트입니다. 민감정보가 지나가므로 **코드를 읽을 수 있는 로컬 실행형**만 추천합니다.

---

## 4. 판독(해석) 근거 — 연구 요약

| 주제 | 근거 | 적용 |
|---|---|---|
| 안정시 심박 참고범위 | 성인 60~100 bpm. 단, 9만 2천여 명 웨어러블 연구(PLOS ONE)에서 개인 간 정상값 차이가 최대 70 bpm | **개인 기준선(중앙값) 대비 변화**로 판독. 절대값 비교 금지 |
| 손목 PPG 정확도 | 걷기·안정 시 ECG(심전도)와 양호, 고강도·급격한 강도 변화·근력운동에서 오차 증가(Khushhal 2017, Zhang 리뷰, JMIR 2025) | 운동 중 피크값은 참고만, **안정시·수면 중 값 중심** |
| 갤럭시워치 | 미시간대 HPSSC 협업: 달리기 중 ECG 대비 상관 90%(삼성 발표). 독립 연구(JMIR 2022, Galaxy Watch Active2): 안정 시 양호 | 삼성 발표는 기업 주도임을 명시 |
| 애플워치 HRV | Series 9/Ultra 2, 39명·316회 측정(2024): 흉부밴드 대비 알고리즘 개선 필요 | HRV는 **추세만** |
| 삼성 HRV | 2024 연구: 수면 중 시간영역 HRV 양호, 각성 시 오차 큼 | 수면 중 HRV만 사용 |
| HRV 분석 도구 | NeuroKit2(파이썬, RMSSD·SDNN), 호주체육연구소 HRV 가이드(2023): 개인 추세 추적 | RR 간격 있을 때만 RMSSD 계산(폴라 H10 등) |
| 국내 연구 | 강원대·서울아산병원(2024): 스마트워치 HRV와 우울·불안 증상 4주 추적. 식약처: 갤럭시워치 불규칙 심장리듬 알림(IHRN) 2023년 허가 | "허가된 알림 기능"과 "내 스크립트 판독"은 별개임을 콘텐츠에서 명확히 |

> 판독 원칙: ① 기준선 = 최근 2주 제외 안정시 중앙값 ② 최근 7일 중 기준선 +5 bpm(또는 8%) 이상인 날 플래그 ③ 200 bpm 이상 피크는 센서 오류 우선 의심 ④ 기준선 100 초과·50 미만은 의료진 상담 문구 ⑤ 항상 "의료 진단 아님" 고지.

---

## 5. 실행 검증 결과

`scripts/heart_rate_parse.py` (표준 라이브러리만 사용, 설치 불필요)

| 입력 형식 | 합성 데이터 | 결과 |
|---|---|---|
| 애플 export.zip (export.xml, +0900 시간대) | 21일 × 10분 간격 3,066건 + 안정시·HRV | 일별 요약 21행, 마지막 3일 안정시 +6 bpm **플래그 정상 작동** |
| 삼성 heart_rate CSV (메타 첫줄 + `com.samsung.health.heart_rate.*` 네임스페이스 헤더) | 10일 1,440건 | 헤더 자동 탐색, 안정시(하위 10% 평균) 추정 정상 |
| Health Auto Export JSON (date/Min/Avg/Max) | 8일 192건 | 정상 |

출력: `heart_rate_clean.csv`(정규화 원자료), `daily_summary.csv`, `report.md`(판독 메모).
실제 내보내기 파일은 버전·언어별로 헤더가 달라질 수 있어 첫 실행 때 열 이름 확인이 필요합니다.

---

## 6. 실행 계획

### 1단계 (이번 주, 무료)
1. 내보내기
   - 아이폰: 건강 앱 → 우상단 프로필 → **모든 건강 데이터 보내기** → export.zip을 PC로(에어드롭/iCloud)
   - 갤럭시: 삼성헬스 → 설정 → **개인 데이터 다운로드** 신청 → 24시간 내 메일 링크(30일 유효) → ZIP
2. 실행 (클로드 코드 터미널)
   ```bash
   # Mac
   python3 scripts/heart_rate_parse.py ~/Downloads/export.zip --out hr_out
   # Windows (PowerShell)
   python scripts\heart_rate_parse.py $HOME\Downloads\export.zip --out hr_out
   ```
3. 클로드 코드에 "hr_out/daily_summary.csv 읽고 지난 2주 추세 설명해줘"라고 요청 → 판독 메모 보강

### 2단계 (자동화)
- 아이폰: Health Auto Export 프리미엄 → 매일 CSV를 iCloud Drive 폴더에 저장 → Mac/Windows iCloud 동기화 폴더를 스크립트 입력으로. 또는 단축어 "건강 샘플 찾기" 자동화(무료, 제작 1시간)
- 갤럭시: 헬스 커넥트 → 내보내기 예약(매일) → Google Drive → PC 동기화 폴더
- 윈도우 작업 스케줄러 / Mac launchd로 스크립트 매일 실행 → report.md 자동 갱신

### 3단계 (MCP)
- 아이폰: Apple Health MCP(DuckDB) 또는 healthsync CLI(SQLite) 로컬 설치 → `claude mcp add`
- 갤럭시: samsung-health-mcp(ZIP 읽기형) 로컬 설치
- 가민 보유 시: mcp-garmin / garmin_mcp (python-garminconnect 기반)

---

## 7. 리스크·주의

- **민감정보**: 건강정보는 개인정보보호법상 민감정보. 외부 REST 서버 전송 시 HTTPS·토큰 필수, 콘텐츠 시연에서는 합성 데이터 또는 본인 데이터만.
- **의료 조언 금지**: 판독은 생활 기록 참고용. 식약처 허가 기능(IHRN, 심전도)과 분리해 설명.
- **비공식 API 변동**: 가민·MCP 서버는 로그인 방식 변경으로 갑자기 멈출 수 있음. 공식 내보내기를 기본선으로.
- **헤더 변동**: 삼성 CSV 열 이름은 앱 버전·언어별 상이. 스크립트는 자동 탐색하지만 첫 실행 확인 필요.

---

## 8. 콘텐츠 각도 (유튜브 → 강의 연결)

제목 후보(금지어 회피, 정직 톤)
- "내 워치 심박 데이터, 클로드 코드로 무료 자동 기록·판독 — 이거면 끝"
- "삼성헬스·애플워치에 숨겨진 내보내기 버튼, 몰랐죠? 파이썬 10줄로 내 심박 추세표"
- "병원 안 가도 되는 게 아니라, 병원 갈 때 들고 갈 '내 심박 리포트' 자동화"

강의 연결: "데이터 가져오기 → 정규화 → 기준선 판독 → 자동 리포트" 4단계는 바이브코딩 입문 커리큘럼의 표준 파이프라인 예제로 재사용 가능.

**이 부분은 전자책에!**
- "절대값이 아니라 내 기준선" 원칙(9만 명 연구 인용)
- 손목 센서가 못 믿을 때 3가지(고강도 운동, 급격한 강도 변화, 각성 시 HRV)
- 핏빗·구글핏 API 종료 사례로 배우는 "공식 내보내기 파일이 가장 오래 가는 데이터 통로"

---

## 9. 출처

- Apple Health 파싱: [apple-health-extractor(PyPI)](https://pypi.org/project/apple-health-extractor), [Medium 가이드](https://medium.com/internet-of-technology/how-to-extract-and-analyze-apple-health-data-a-practical-python-guide-4b9ddbade37f)
- Health Auto Export: [JSON 형식 위키](https://github.com/Lybron/health-auto-export/wiki/API-Export---JSON-Format), [앱스토어(KR)](https://apps.apple.com/kr/app/id1115567069), [apple-health-ingester](https://github.com/irvinlim/apple-health-ingester)
- 단축어: [Export Heart Rate data 단축어](https://matthewcassinelli.com/shortcuts/export-heart-rate-data/), [heartbridge(PyPI)](https://pypi.org/project/heartbridge)
- 삼성헬스: [삼성 고객지원 데이터 다운로드](https://www.samsungsvc.co.kr/solution/4204659), [내보내기 가이드(takeoutday)](https://takeoutday.org/guides/how-to-export-samsung-health-data), [samsung-health-sdk](https://pypi.org/project/samsung-health-sdk/), [samsung-health-mcp](https://github.com/davidmosiah/samsung-health-mcp)
- 헬스 커넥트: [Google 백업·복원 도움말](https://support.google.com/android/answer/15323271?hl=EN-GB), [Google Fit 이전 FAQ](https://developer.android.com/health-and-fitness/guides/health-connect/migrate/migration-faq), [Health Hub MCP](https://glama.ai/mcp/servers/ejxn5v73yh)
- Apple Health MCP: [aferdina health_mcp](https://lobehub.com/en/mcp/aferdina-health_mcp), [Momentum 블로그](https://www.themomentum.ai/blog/apple-health-mcp-server-use-cases-for-developers), [healthsync 스킬](https://getclawkit.com/skills/official-bro3886-healthsync)
- 가민: [mcp-garmin](https://pypi.org/project/mcp-garmin/), [garmin_mcp(Taxuspt)](https://gittrend.io/repo/Taxuspt/garmin_mcp), [mcp-garmin-connect](https://pypi.org/project/mcp-garmin-connect/0.4.0/)
- 핏빗/구글: [Google Health API 소개](https://developers.google.com/health/about), [종료 안내(dev.fitbit.com)](https://dev.fitbit.com/build/reference/device-api/), [Sahha 분석](https://sahha.ai/blog/fitbit-api-sunset-migration/)
- 폴라·기타: [Polar AccessLink 안내](https://www.developer-tech.com/news/polar-opens-its-api-developers-access-user-health-data/), [openwearables Polar 가이드](https://openwearables.io/blog/polar-api-training-hrv-nightly-recharge-data.md), [Gadgetbridge Xiaomi](https://gadgetbridge.org/gadgets/wearables/xiaomi/), [Terra 대안 비교](https://sahha.ai/compare/terra-alternatives/), [Junction 가격](https://pricingsaas.com/companies/tryvital)
- 정확도·판독 연구: [Fitbit Charge 4·Galaxy Watch Active2 심박 정확도(JMIR 2022)](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8924780/), [Apple Watch S9/Ultra2 HRV 검증(2024)](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11478500/), [삼성 스마트워치 HR/HRV 정확도](https://research.utu.fi/converis/portal/detail/Publication/177532506?lang=en_US), [Apple Watch 운동 중 타당도(Khushhal)](https://napier-repository.worktribe.com/output/3849158/validity-and-reliability-of-the-apple-watch-for-measuring-heart-rate-during-exercise), [손목 PPG vs ECG(JMIR 2025)](https://cardio.jmir.org/2025/1/e67110/PDF), [Garmin 피부톤 연구(Frontiers 2025)](https://www.frontiersin.org/journals/digital-health/articles/10.3389/fdgth.2025.1553565/full), [안정시 심박 개인차 보도(PLOS ONE 연구)](https://www.news-medical.net/news/20200206/Normal-resting-heart-rate-may-vary-from-person-to-person.aspx), [호주체육연구소 HRV 가이드](https://www.ais.gov.au/__data/assets/pdf_file/0013/1130260/HRV-BPG_FINAL.pdf), [NeuroKit2](https://github.com/jvp-labs/NeuroKit), [스마트워치 HRV와 스트레스 리뷰](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10490434/), [강원대·서울아산 HRV 종단연구(Frontiers Psychiatry 2024)](https://www.frontiersin.org/journals/psychiatry/articles/10.3389/fpsyt.2024.1371946/epub)
- 국내 허가·발표: [삼성 뉴스룸 IHRN 식약처 허가](https://news.samsung.com/kr/%ea%b0%a4%eb%9f%ad%ec%8b%9c-%ec%9b%8c%ec%b9%98%ec%9d%98-%eb%b6%88%ea%b7%9c%ec%b9%99-%ec%8b%ac%ec%9e%a5-%eb%a6%ac%eb%93%ac-%ec%95%8c%eb%a6%bcihrn-%ea%b8%b0%eb%8a%a5-%ec%8b%9d%ed%92%88%ec%9d%98), [삼성·미시간대 정확도 발표](https://www.smarttoday.co.kr/ko-kr/articles/58994)
