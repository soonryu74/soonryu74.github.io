# 미국 County Health Rankings & Roadmaps(CHR&R) 검토

> 원자료: CHR&R 웹사이트, **2025 Technical Documentation**(24p PDF), What Works for Health 방법론, CHR&R 블로그
> 검토일: 2026-09-18 · 운영: University of Wisconsin Population Health Institute(UWPHI), 후원: Robert Wood Johnson Foundation(RWJF)

---

## 0. 요약 — 세 줄

1. **CHR&R는 2024년부터 1~N 순위를 폐기하고 10개 「Health Group」으로 바꿨다.** 기술문서 원문: *"Counties are assigned a value (e.g., group 1-10) based on their Z-score **rather than an ordinal rank**."*
2. 우리가 갖지 못한 통계적 절제 장치를 갖추고 있다 — **95% 신뢰구간 공표**, 소규모 지역 Z-점수 ±3 절단, 다년 합산, 자료 불안정 시 **아예 등급을 부여하지 않음**.
3. **2026년 연례 릴리스는 없다.** RWJF 자금이 연말 종료되어 Health Groups·추세·강점/개선영역 기능을 모두 중단했고, 웹사이트는 2026년 12월까지만 유지한다.

미국에서 가장 권위 있는 카운티 단위 건강 순위 사업이 **스스로 순위를 버렸다**는 사실은, 「지역보건사업 평가이론」에서 우리가 도달한 결론(위계별 순위 적합성 분리)과 정확히 같은 방향이다.

---

## 1. 무엇인가 — 우리와 같은 자리에 있는 사업

| | CHR&R | 우리 대시보드 |
|---|---|---|
| 단위 | 미국 카운티 약 3,000개 | 시군구 231개 · 보건소 258개 |
| 시작 | 2010년(전신 MATCH 2008) | 2025년 |
| 운영 | 대학 연구소(UWPHI) + 민간재단(RWJF) | 개인 프로젝트 |
| 측정값 | 80여 개(요약점수에는 29개만 사용) | 156개 |
| 요약 | Population Health and Well-being · Community Conditions 2개 | 영역별 지표 + 계층 배지 |
| 중재 근거 | **What Works for Health** 내장 | (CPSTF 검토만 하고 미반영) |

같은 문제를 16년 먼저 겪은 사업이다. 그들이 무엇을 바꿨는지가 우리에게는 미래 예고편이다.

---

## 2. 핵심 — 2024~2025년 대전환

### 2.1 무엇이 바뀌었나

| | **구 모델(2010~2023)** | **신 모델(2024~2025)** |
|---|---|---|
| 상위 구조 | Health Outcomes / Health Factors | Population Health and Well-being / **Community Conditions** |
| 결과 표기 | **주 내 1~N위 순위** | **전국 10개 Health Group** |
| 하위 가중치 | 건강행태 30% · 임상진료 20% · 사회경제 40% · 물리환경 10% | **보건인프라 25% · 물리환경 25% · 사회경제 50%** |
| 건강행태 | 독립 영역(30%) | 해체되어 '보건인프라 > 건강증진·해악감소'로 흡수 |
| 물리환경 | 10% | **25%** (2.5배) |

두 가지를 동시에 한 것이다 — **① 서열을 없애고 ② 사회구조 요인의 비중을 높였다.**

### 2.2 순위를 버린 방식

단순히 순위를 감춘 것이 아니라 **다른 통계로 대체**했다.

- 요약 Z-점수를 계산한 뒤, **Wasserstein 거리(earth mover's distance)** 기반 군집분석으로 전국 카운티를 10개 그룹에 배정한다.
- 10개 그룹은 **크기가 같지 않다**(unequally-sized). 십분위가 아니라 **데이터 안의 실제 간격(meaningful gaps)** 을 기준으로 나눈다.
- 방법론 근거: Pollock EA, Gangnon RE, Gennuso KP, Givens ML. *Cluster analysis methods to support population health improvement among U.S. counties.* J Public Health Manag Pract. 2024.

그리고 기술문서와 웹사이트 양쪽에 같은 경고를 박아 놓았다.

> *"Health Groups do not always indicate statistically significant differences between counties; instead, they help facilitate data-informed comparisons and highlight meaningful similarities."*

**순위 1위와 2위의 차이가 통계적으로 의미 없을 수 있다**는 사실을, 순위를 없애는 방식으로 해결한 것이다.

### 2.3 왜 중요한가

우리 대시보드는 지금 **231개 시군구를 1위부터 231위까지 줄 세운다.** 「전체 보기」 막대 순위는 그 서열을 애니메이션으로 보여 주기까지 한다.
「지역보건사업 평가이론」에서 계층별 `rankable` 속성(임팩트·맥락은 false, 성과는 "위험보정 후")을 붙여 일부 방어했지만, **화면은 여전히 순위를 준다.**
CHR&R의 선택은 이 문제에 대한 가장 권위 있는 선례다.

---

## 3. 현행 모델과 가중치 (2025 기술문서 Table 1 전문)

### Population Health and Well-being — 5개 측정값

| 영역 | 측정값 | 가중치 |
|---|---|---:|
| 수명(Length of life) | Premature Death(조기사망, YPLL) | **50%** |
| 삶의 질(Quality of life) | Low Birthweight(저체중출생) | 20% |
| | Poor Physical Health Days | 10% |
| | Poor Mental Health Days | 10% |
| | Poor or Fair Health(주관적 건강) | 10% |

### Community Conditions — 24개 측정값

| 영역(가중) | 측정값 | 가중치 |
|---|---|---:|
| **보건인프라 25%** | 운동시설 접근성 / 인플루엔자 접종률 / 식품환경지수 | 각 4% |
| | 예방가능 입원 / 무보험률 | 각 4% |
| | 일차의료의사 | 2% |
| | 유방촬영검진 / 정신건강 제공자 / 치과의사 | 각 1% |
| **물리환경 25%** | 대기오염(PM2.5) | **8%** |
| | 식수 위반 / 초고속인터넷 접근 / 심각한 주거문제 | 각 4% |
| | 도서관 접근 / 나홀로 자동차 통근 | 각 2% |
| | 장시간 나홀로 통근 | 1% |
| **사회경제 50%** | 고교 졸업 / 대학 경험 / 실업률 / 아동빈곤 / 소득불평등 | **각 8%** |
| | 보육비 부담 / 손상 사망 | 각 4% |
| | 사회적 결사체 수 | 2% |

**검산**: PHW 50+20+10+10+10 = 100%, CC 25+25+50 = 100%, 측정값 5 + 24 = **29개**.
(CHR&R 웹 방법론 페이지는 "Community Conditions 요약에 29개"라고 적었으나 기술문서 Table 1을 세면 CC는 24개, 전체 Select가 29개다. **웹 페이지 쪽 표기 오류로 보인다.** 본 문서는 기술문서를 따른다.)

**주목할 점**
- 도서관 접근·초고속인터넷·사회적 결사체가 **건강 지표**로 들어 있다. '시민 인프라(civic infrastructure)'를 건강 결정요인으로 명시적으로 계산에 넣는다.
- 보육비 부담(Child Care Cost Burden)이 4%다.
- 대기오염 단일 측정값이 8%로, 일차의료의사(2%)의 4배다.

---

## 4. 통계적 절제 장치 — 우리에게 없는 것들

### 4.1 Z-점수 계산과 절단

```
Z = (카운티 값 − 전국 카운티 평균) / (전국 카운티 표준편차)
```
- 방향이 반대인 측정값(고교 졸업률 등)은 **−1을 곱해** 모든 Z-점수가 "높을수록 나쁨"이 되도록 통일한다(reverse coding).
- **인구 20,000명 이하 카운티는 Z-점수를 ±3.0에서 절단한다.** 소규모 지역의 극단값이 요약점수를 지배하지 못하게 막는 장치다.

### 4.2 95% 신뢰구간 공표

> *"Where possible, we provide the margins of error (95% confidence intervals)... **In many cases, the values of specific measures are not statistically different between counties.**"*

두 지역의 오차범위가 겹치면 차이를 확신할 수 없다는 설명을 사용자에게 직접 제공한다.

### 4.3 등급을 아예 부여하지 않는 규칙

다음 중 하나라도 해당하면 그 카운티는 **Health Group을 받지 못한다**(빈칸으로 둔다).

1. 조기사망 값 결측 — 해당 기간 사망 **20건 미만**이라 프라이버시로 억제된 경우
2. 조기사망 값이 불안정하고 다른 이환 측정값이 없는 경우
3. 조기사망·저체중출생 모두 불안정하고 다른 이환 측정값이 없는 경우

**불안정(unreliable)의 정의**: 추정치의 표준오차가 추정값의 **20%를 초과**하고, 그 값이 **전년도 신뢰구간 밖**에 있을 때.

> 억지로 숫자를 채우지 않고 **빈칸으로 남기는 규칙이 명문화**되어 있다는 점이 핵심이다.

### 4.4 그 밖

- **다년 합산**: 희귀사건·소규모 인구는 여러 해를 묶어 안정화한다.
- **연령표준화**: 연령구조가 다른 카운티 비교를 위해 적용.
- **결측 대체**: 등급을 받을 자격은 되는데 특정 측정값만 없으면, **같은 주(state) 내 카운티들의 Z-점수 평균**으로 대체한다.

---

## 5. 보조 도구 — 설계 철학이 드러나는 부분

### 5.1 Areas of Strength / Areas to Explore

주·전국 기준값보다 **의미 있게 나은** 측정값은 '강점', **의미 있게 나쁜** 측정값은 '탐색 영역'으로 자동 제시한다.

> *"Each county is assigned **at least three Areas of Strength**, and there is **no minimum number** of Areas to Explore."*

**강점은 최소 3개를 보장하고, 약점은 최소 개수가 없다.** 최하위 카운티라도 반드시 강점 3개를 보게 된다. 서열 공개가 낙인이 되지 않도록 한 의도적 설계다.
또 '탐색 영역(Areas to **Explore**)'이라는 명명 자체가 '약점·미달'이 아니다.

### 5.2 County Descriptions — 숫자 앞에 맥락을 놓는다

각 카운티 스냅샷 맨 위에 서술형 소개가 붙는다. 여기에 포함되는 것 —
- **Native Lands Digital** 링크(그 땅의 원주민 국가)
- **1935~1940년 HOLC 레드라이닝 지도**에서 "쇠퇴·위험" 등급을 받은 동네가 있는지 — 즉 **의도적 투자 배제의 역사**
- 인구밀도, 대도시·주도와의 연결성

숫자를 보여 주기 전에 "이 지역이 왜 이런 상태인지"의 역사적 맥락을 먼저 읽게 한다.

### 5.3 추세 그래프

- 12개 Select 측정값 + 3개 추가 측정값에 대해 제공.
- **최소 8년 자료**로 선형회귀, **80% 신뢰수준** 유의성 검정.
- 장기 추세(전 기간)와 **단기 추세(최근 4년)** 를 따로 계산하고, 둘이 다르면 그래프에 주석이 붙는다.
- 아이콘 색: 빨강(악화) · 노랑(유의한 추세 없음) · 초록(개선) · 회색(해석에 추가 정보 필요) · 검정(해석 미제공).

> **우리가 더 나은 부분**: 우리는 Mann-Kendall + Sen 기울기를 쓴다. 비모수 방법이라 정규성·선형성 가정에 덜 민감하고, 이상치에 강건하다. CHR&R의 OLS 80% 검정보다 방법론적으로 보수적이다.

---

## 6. What Works for Health — CPSTF와 나란히 놓고 보기

CHR&R는 데이터 옆에 **중재 근거 데이터베이스**를 직접 붙여 두었다. 우리가 CPSTF 검토에서 「근거 중재 레이어」로 제안한 바로 그것이다.

### 6.1 근거 등급 6단계

| 등급 | 정의 |
|---|---|
| Scientifically Supported | 복수의 견고한 연구가 일관되게 유리한 결과 |
| Some Evidence | 긍정적이나 추가 연구 필요 |
| Expert Opinion | 전문가 권고, 연구는 제한적 |
| Insufficient Evidence | 효과를 입증할 연구가 제한적 |
| Mixed Evidence | 결과가 일관되지 않음 |
| **Evidence of Ineffectiveness** | 복수 연구가 일관되게 **불리하거나 해로운** 결과 |

판정 절차: 광범위 검색 → 체계적 문헌고찰·동료평가 논문 우선 초점 검색 → 설계의 엄격성·질·결과 강도 평가 → **분석가 2인의 독립 검토**로 최종 등급.

### 6.2 건강형평성 영향 등급 4단계 (CPSTF에 없는 것)

| 등급 | 의미 |
|---|---|
| Potential to Decrease Disparities | 집단 간 격차를 줄일 가능성 |
| Potential to Increase Disparities | **격차를 키울 가능성** |
| Potential for Mixed Disparities | 양방향 모두 가능 |
| Inconclusive Impact on Disparities | 형평성 영향 판단 불가 |

**효과가 있어도 격차를 키울 수 있다**는 것을 별도 축으로 표시한다. 이것이 CPSTF보다 진전된 부분이다.

### 6.3 CPSTF와의 비교

| | CPSTF(The Community Guide) | WWFH(CHR&R) |
|---|---|---|
| 등급 수 | 4 | 6 |
| 부정 등급 | 반대 권고(2건) | Evidence of Ineffectiveness |
| 중간 등급 | 없음 | **Mixed Evidence**(결과 불일치)를 근거 불충분과 분리 |
| 전문가 의견 | 별도 등급 없음 | **Expert Opinion** 등급 존재 |
| 형평성 | 검토 항목 중 하나 | **독립된 4단계 등급** |
| 엄격성 | 높음(10단계 절차, 경제성 검토 별도) | 상대적으로 유연(2인 검토) |
| 규모 | 224건 | 수백 건, 주제별 큐레이션 목록 제공 |

**둘은 대체재가 아니라 보완재다.** CPSTF는 엄격하지만 느리고 범위가 좁다. WWFH는 유연하지만 근거 강도가 고르지 않다. 실무에서는 CPSTF 강력 권고를 1순위로, WWFH를 보조 탐색으로 쓰는 것이 합리적이다.

---

## 7. 비판과 CHR&R의 자기방어

### 7.1 주요 비판

| 비판 | 요지 |
|---|---|
| **가중치의 자의성** | 30/20/40/10에 이론적 근거가 없다 |
| **순위의 불안정성** | 인구가 적거나 중위권인 카운티는 순위 신뢰구간이 매우 넓다(경험적 베이즈 연구) |
| **농촌 자료 신뢰도** | 결측·불량 자료를 보정하느라 무작위성이 섞인다 |
| **서열의 부작용** | 낙인, 순위 변동에 대한 과잉 반응 |

### 7.2 CHR&R의 답

자체 블로그 「Is the County Health Rankings Model Right or Wrong?」에서 이렇게 답한다.

> *"There is no one 'correct' formula or 'true' set of weights that perfectly represents the health of a community."*
> *"The County Health Rankings model was **not developed to explain all the factors** and interactions between these factors — it was developed to provide **a graphical depiction of how we compile the Rankings**."*

즉 **모델은 인과 이론이 아니라 산출 절차의 도식**이라는 것이다. 정직하지만, 이 답변만으로는 서열의 부작용을 막지 못했다.
그래서 별도 워킹페이퍼 「Different Perspectives for Assigning Weights to Determinants of Health」로 가중치 민감도 분석을 수행했고, **결국 2024년에 순위 자체를 버렸다.**

> 이 경로가 시사하는 바가 크다. **비판 → 해명 → 민감도 분석 → 설계 변경.** 해명으로 버티지 않고 끝내 구조를 바꿨다.

---

## 8. 2026년 중단 — 지속가능성 교훈

2026년 3월, CHR&R는 다음을 공지했다.

- **RWJF 자금이 2026년 말 종료**된다. 현재 자금·인력으로는 예년 수준의 연례 릴리스가 불가능하다.
- 2026년에는 34개 측정값만 갱신하고, **전국 보고서·Health Groups 갱신·추세 그래프·강점/개선영역 기능을 제공하지 않는다.**
- 웹사이트는 **2026년 12월까지** 유지하며, 신규 자금 확보 시 연장될 수 있다.

16년간 미국 지역보건 데이터의 표준 역할을 한 사업이 단일 재단 자금에 의존하다 중단 수순에 들어갔다.
**우리 프로젝트에 주는 교훈** — 데이터 수집 스크립트를 전부 저장소에 두고 원자료 출처를 공개해 둔 현재 구조(`scripts/kosis_*.py`, `scripts/fetch_cpstf.py`)가 이 위험에 대한 유일한 방어다. 사람이 빠져도 스크립트가 남으면 재현된다.

---

## 9. 우리 대시보드와 정면 대조

| 항목 | CHR&R | 우리 | 판정 |
|---|---|---|---|
| 서열 표기 | 10개 그룹(2024~) | **1~231위 순위 + 애니메이션** | ❌ 우리가 뒤처짐 |
| 신뢰구간 | 95% CI 공표 | **없음** | ❌ 우리가 뒤처짐 |
| 소규모 지역 처리 | Z-점수 ±3 절단, 다년 합산 | 다년 합산 일부만 | ❌ |
| 자료 불안정 시 | **등급 미부여(빈칸)** | 값이 있으면 그대로 순위 | ❌ |
| 강점 최소 보장 | **최소 3개 보장** | 강점 TOP 있음(최소 보장 없음) | △ |
| 맥락 서술 | 레드라이닝·원주민 토지 등 역사 | 없음 | △ |
| 추세 검정 | OLS 80% 신뢰 | **Mann-Kendall + Sen** | ✅ 우리가 나음 |
| 동류군 비교 | 도농 특성 기준 비교 도구 | **4축 표준화 거리 12개 동류군** | ✅ 우리가 나음 |
| 공간 군집 | 없음 | **Getis-Ord Gi\*** | ✅ 우리가 나음 |
| 중재 근거 | WWFH 내장 | CPSTF 검토만, 미반영 | ❌ |
| 계층 구분 | 2개 요약(결과/조건) | **5계층 배지 + 순위 적합성** | ✅ 우리가 나음 |
| 측정값 수 | 80여 개(요약엔 29) | 156개(요약 없음) | △ |
| 재현성 | 기술문서 공개, 코드 비공개 | **수집·가공 스크립트 전부 공개** | ✅ 우리가 나음 |
| 지속성 | **2026년 중단 예정** | 스크립트 기반 재현 가능 | ✅ |

**요약: 통계적 절제에서 밀리고, 분석 기법과 재현성에서 앞선다.**

---

## 10. 반영 권고

| # | 권고 | 근거 | 난이도 |
|---|---|---|---|
| **1** | **신뢰구간 병기** — 지역사회건강조사 「한눈에 보기」 부록에 시군구별 표준오차가 이미 공표되어 있다(`68.2(1.3)` 형식). 이를 추출해 순위·막대에 오차범위를 표시하고, 겹치면 "차이 불확실" 표시 | CHR&R가 명시적으로 하는 것, 우리에게 완전히 없는 것 | 중 |
| **2** | **「Health Group」 방식 병기** — 1~231위와 함께 10개 그룹(또는 5분위) 표기를 제공하고, 기본 표시를 그룹으로 전환 검토 | CHR&R 2024년 전환의 직접 이식 | 중 |
| **3** | **자료 불안정 시 등급 미부여 규칙 도입** — 표준오차 > 추정값의 20%면 순위에서 제외하고 빈칸 처리 | CHR&R 명문 규칙 | 하 |
| **4** | **강점 최소 3개 보장** — 프로파일에서 하위 지역도 반드시 강점 3개가 보이도록. '약점'을 '탐색 영역'으로 개명 | 낙인 방지 설계 | 하 |
| **5** | **소규모 시군구 Z-점수 절단** — 박탈지수·동류군 거리 계산 시 인구 하위 지역 Z를 ±3에서 절단 | CHR&R Z-score 규칙 | 하 |
| **6** | **맥락 서술 블록** — 각 시군구 프로파일 상단에 인구·도농·재정·역사적 맥락 한 문단 | County Descriptions | 중 |
| **7** | **WWFH 형평성 4등급을 CPSTF 레이어에 추가** — 중재가 격차를 줄이는지 키우는지 별도 표시 | CPSTF에 없는 WWFH의 강점 | 중 |

우선순위: **1 → 3 → 2 → 4 → 5 → 7 → 6**

### 10.1 반영 현황 (2026-09-18)

| # | 권고 | 상태 | 비고 |
|---|---|---|---|
| 1 | 신뢰구간 병기 | ✅ **완료** | 표본오차가 KOSIS 원표(CR_SE·SR_SE)에 이미 있었다. 순위 막대에 95% 오차막대 + ±표기, 선택 지역과 겹치면 흐리게 |
| 2 | Health Group 방식 병기 | ✅ **완료** | 순위 패널 「⑩ 묶음」 토글. 값 분포를 **1차원 최적 분할(Fisher–Jenks)** 로 10개 묶음(크기 제각각)에 배정 |
| 3 | 불안정 자료 등급 미부여 | ✅ **완료** | 상대표준오차 > 20%면 순위에서 제외(토글). 시군구 셀의 4.1%, 우울증상 유병률은 62% |
| 4 | 강점 최소 3개 보장 | ✅ **이미 충족** | 프로파일 「강점 TOP 5」가 백분위 상위 5개를 항상 표시한다. 약한 쪽은 「개선 과제」·「권고 예방·관리 사업」으로 행동 지향 명명 |
| 5 | 소규모 지역 Z-점수 절단 | ✅ **완료** | 동류군 거리 계산의 Z를 ±3에서 절단. 재정자립도에서 2곳(최대 z=4.15)이 영향을 받는다 |
| 6 | 맥락 서술 블록 | ⬜ 미착수 | |
| 7 | WWFH 형평성 4등급 | ⬜ 미착수 | CPSTF 「근거 중재」 레이어와 함께 붙여야 한다 |

**2번의 정직한 한계**: CHR&R 는 여러 측정값을 합친 **요약 Z-점수**를 Wasserstein 거리 군집으로 나눈다.
우리는 지표를 하나씩 다루므로 그 지표의 **값 분포**를 Fisher–Jenks(군집 내 제곱합 최소화)로 나눈다.
계산식이 다르므로 "CHR&R 방식을 그대로 구현했다"고 말할 수 없다. 같은 것은 목적 — **서열 대신 의미 있는 간격으로 끊고,
같은 묶음 안의 순서 차이는 의미 없다고 화면에 못 박는 것** — 이다.

1번과 3번이 가장 급하다. **신뢰구간 없이 231위까지 줄 세우는 현재 화면이 가장 공격받기 쉬운 지점**이며, CHR&R가 같은 비판을 받고 결국 설계를 바꾼 바로 그 지점이기 때문이다.

---

### 10.2 반영 현황 재점검 (2026-09-24, 소유자 요청 "CHR&R 검토해서 반영 여부 알려줘")

**기술문서 권고 7개 중 5개 반영 완료, 2개 미착수. 2025 연례보고서 권고 4개는 모두 미착수.**

| 출처 | 권고 | 상태 | 판단 |
|---|---|---|---|
| 기술문서 1 | 신뢰구간 병기 | ✅ 완료 | 순위 패널 「⟺ 신뢰구간」 |
| 기술문서 2 | Health Group 묶음 | ✅ 완료(방식 다름) | 「⑩ 묶음」 = Fisher–Jenks. CHR&R는 요약 Z + Wasserstein |
| 기술문서 3 | 불안정 자료 순위 제외 | ✅ 완료 | RSE>20% 토글 |
| 기술문서 4 | 강점 최소 3개 | ✅ 이미 충족 | 강점 TOP 5 |
| 기술문서 5 | Z ±3 절단 | ✅ 완료 | 동류군 거리 |
| 기술문서 6 | 맥락 서술 블록 | ⬜ 미착수 | **반영 권고** — 인구·도농·재정·인구감소지역 지정 여부 등 자료로 만들 수 있는 것만. 역사 서술은 제외 |
| 기술문서 7 | WWFH 형평성 4등급 | ⬜ 미착수 | **보류** — WWFH 갱신이 2026-07로 끝났고 등급 원자료를 일괄 내려받을 수 없음. 근거 탭(CPSTF)에 "격차 영향" 열을 수작업 표기하는 정도만 가능 |
| 2025 보고서 1 | 성별 분리 지표 | ⬜ 미착수 | **반영 권고(가장 값이 큼)** — KOSIS CHS 표에 성별 값이 이미 있어 재수집만 하면 됨. 156개 중 2개만 분리된 상태 |
| 2025 보고서 2 | 구조적 불이익 지역 유형 | ⬜ 미착수 | **반영 권고** — 행안부 인구감소지역 89곳(고시), 보건복지부 의료취약지, 접경·도서 지정을 프로파일 배지·동류군 축으로 |
| 2025 보고서 3 | 격차의 체감 환산 | ⬜ 미착수 | **반영 권고(반나절)** — 예: 기대수명 격차 "N년", 흡연율 격차 "성인 M명" |
| 2025 보고서 4 | 용어집 + 분류 한계 | ⬜ 미착수 | **반영 권고(반나절)** — 자료원 탭에 표준화율·백분위·RSE·묶음 등 용어집 |
| 2025 보고서 5 | 권력·구조적 인종주의 프레이밍 | — | 채택하지 않음(유지) |

**2026-09 기준 CHR&R 쪽 변화(추가 조사)**

- 2026년 3월 34개 측정값만 부분 갱신(비만·흡연·당뇨 유병·저체중아·유방암 검진·예방가능 입원·보험 미가입·실업 등). 2026 연례 릴리스·Health Groups·추세 그래프·강점/탐색 영역은 생산하지 않음. RWJF 지원은 2026-12 종료, 사이트는 2026-12까지.
- **코드·자료가 오픈소스 아카이브로 공개됨**: GitHub 조직 `countyhealthrankings`(county_health_measure_calculations = 2025 릴리스 측정값 산출 R 노트북, countyhealthR = CRAN 패키지), Zenodo에 2010~2025 데이터셋(엑셀·관계형)과 산출 코드 DOI. 본 검토 11장의 "코드 비공개" 한계는 해소됨. 다만 공개된 것은 측정값 산출 코드이며, Health Groups 군집(요약 Z → Wasserstein) 코드가 포함됐는지는 README만으로 확인되지 않아 저장소 직접 열람 필요.
- 「Narratives for Health」 자료는 Health in Partnership 사이트로 이관. What Works for Health는 2026-07까지만 일부 갱신.

**권고 순서**: 2025-3(체감 환산) → 2025-4(용어집) → 2025-1(성별 분리) → 기술문서 6(맥락 블록) → 2025-2(지역 유형). 기술문서 7은 보류.

출처(2026-09-24 확인): countyhealthrankings.org 블로그 "CHR&R Updates Data for 34 Measures, Will Not Produce a 2026 Annual Data Release", "FAQ: CHR&R program status and funding"; countyhealthrankings.github.io/welcome/archives.html; github.com/countyhealthrankings.

## 11. 한계

- 본 검토는 2025 Technical Documentation(24쪽)과 웹사이트 공개 페이지에 근거한다. Working Paper 전문과 Pollock et al.(2024) 원논문은 미열람이다.
- 군집분석의 구체적 구현(Wasserstein 거리 기반 클러스터 수 결정 규칙)은 기술문서에 요약만 있어, 그대로 재현하려면 원논문이 필요하다.
- CHR&R 웹 방법론 페이지와 기술문서 사이에 측정값 개수 표기 불일치가 있다(3장 검산 참조). 본 문서는 기술문서를 기준으로 삼았다.
- 2026년 이후 사이트 접근이 불가능해질 수 있으므로, 인용한 PDF는 별도 보관이 필요하다.

---

## 12. 출처

- County Health Rankings & Roadmaps — https://www.countyhealthrankings.org/
- 2025 Technical Documentation [PDF] — https://www.countyhealthrankings.org/sites/default/files/media/document/CHRR%20Technical%20Documentation%202025_2.pdf
- Methods — https://www.countyhealthrankings.org/health-data/methodology-and-sources/methods
- What Works for Health, Methods and Ratings — https://www.countyhealthrankings.org/strategies-and-solutions/what-works-for-health/methods-and-ratings
- "Is the County Health Rankings Model Right or Wrong?" — https://www.countyhealthrankings.org/findings-and-insights/blog/is-the-county-health-rankings-model-right-or-wrong
- "CHR&R Updates Data for 34 Measures, Will Not Produce a 2026 Annual Data Release" — https://www.countyhealthrankings.org/findings-and-insights/blog/chrr-updates-data-for-34-measures-will-not-produce-a-2026-annual-data-release
- Working Paper: Different Perspectives for Assigning Weights to Determinants of Health [PDF] — https://www.countyhealthrankings.org/sites/default/files/differentPerspectivesForAssigningWeightsToDeterminantsOfHealth.pdf
- Remington PL, Catlin BB, Gennuso KP. The County Health Rankings: rationale and methods. *Population Health Metrics*. 2015;13(11). — https://link.springer.com/article/10.1186/s12963-015-0044-2
- Pollock EA, Gangnon RE, Gennuso KP, Givens ML. Cluster analysis methods to support population health improvement among U.S. counties. *J Public Health Manag Pract*. 2024.
- Using Empirical Bayes Methods to Rank Counties on Population Health Measures — https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3733480/
