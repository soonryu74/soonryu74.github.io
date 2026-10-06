# DATA_SOURCES — 공공데이터·API 조사 (다시ON AI)

- 조사일: 2026-10-06
- 조사 방법과 한계: 이 개발 환경에서는 `work24.go.kr`, `data.go.kr`, `hrd.go.kr` 직접 접속이 프록시 정책으로 차단(CONNECT 403)되어 **웹 검색 결과(검색엔진이 요약한 공식 페이지 내용)와 공개 저장소 코드**로만 확인했다. 아래 "실제 연결 여부"는 이 MVP 저장소 기준이며, 요청주소·응답 항목은 **고용24 OPEN-API 승인 후 명세서로 반드시 재확인**해야 한다.
- 표기: `[포털 확인]` 공식 페이지 존재·제목 확인 / `[2차 출처]` 커뮤니티·GitHub 코드에서만 확인 / `미확인` 확인하지 못함

## 요약표
| 데이터 | 기관 | API/파일 | URL | 실제 연결 여부 | MVP 활용 |
|---|---|---|---|---|---|
| 고용24 직업정보(검색·분류) | 한국고용정보원 | OPEN-API (XML) | https://www.work24.go.kr → 고객센터 → OPEN-API `[포털 확인]` | **미연결**(키 미발급) | 직무 사전 18종을 수기 정리해 대체. 연결 시 직업코드로 사전 확장 |
| 직업정보 상세(하는 일·교육자격훈련·임금·전망·능력·지식·환경) | 한국고용정보원 | OPEN-API `[포털 확인: 서비스 존재]`, 응답 항목 `미확인` | 위와 동일 | **미연결** | 점수 요소 "직업전망·노동시장 15%" → 현재 **미반영 표시**. Gap 근거 확장 예정 |
| 직업사전 목록·상세 | 한국고용정보원 | OPEN-API | https://www.data.go.kr/data/15037284/openapi.do `[포털 확인]` | 미연결 | 직무 설명 보강 후보 |
| 직무데이터사전 | 한국고용정보원 | OPEN-API | https://www.data.go.kr/data/15088880/openapi.do `[포털 확인]` | 미연결 | 역량 사전 정합성 보강 후보 |
| 채용정보 목록·상세 | 한국고용정보원 | OPEN-API `callOpenApiSvcInfo210L01.do` (authKey, callTp, returnType, startPage, display, keyword, region, empTpGb …) `[2차 출처: 검색 결과에 노출된 호출 URL]` | https://www.work24.go.kr/cm/openApi/call/wk/callOpenApiSvcInfo210L01.do · data.go.kr 3038225 `[포털 확인]` | **미연결** → 화면 DEMO 표기 + 공식 검색 링크 | `scripts/fetch_work24.py` 로 수집 구조 준비. 캐시 있으면 자동 전환 |
| 직업훈련(국민내일배움카드 훈련과정) | 한국고용정보원(HRD-Net→고용24) | OPEN-API `callOpenApiSvcInfo310L01.do` (authKey, returnType, outType, pageNum, pageSize, srchTraStDt, srchTraEndDt, sort, sortCol) `[2차 출처 + data.go.kr 15109032 포털 확인]` | https://www.work24.go.kr/cm/openApi/call/hr/callOpenApiSvcInfo310L01.do · https://www.data.go.kr/data/15109032/openapi.do | **미연결** → DEMO 표기 + 공식 검색 링크 | 응답 항목 중 취업률(EI_EMPL_RATE3/6)·수강비·만족도 등은 2차 출처. 승인 후 대조 |
| 공통코드(지역·직종·KECO·NCS·훈련종류) | 한국고용정보원 | OPEN-API `[포털 확인: 서비스 존재]`, 요청주소 `미확인` | 고용24 OPEN-API 안내 | 미연결 | 지역은 `data/regions.js`(시도·시군구 수기) 사용. 연결 시 코드 정규화 |
| NCS(국가직무능력표준) | 한국산업인력공단 | OPEN-API | https://www.data.go.kr/data/15086418/openapi.do `[포털 확인]` | 미연결 | 역량 사전 → NCS 능력단위 매핑 예정 |
| 자격코드·국가자격 정보 | 한국산업인력공단(큐넷) | 사이트 안내 | https://www.q-net.or.kr | 링크만 | 직무별 필수·권장 자격 안내 링크 |
| 사회복지사 자격 | 한국사회복지사협회 | 사이트 안내 | https://lic.welfare.net | 링크만 | 권장 자격 안내 |
| 요양보호사 자격시험 | 한국보건의료인국가시험원 | 사이트 안내 | https://www.kuksiwon.or.kr | 링크만 | 필수 자격 안내 |
| 아이돌보미 양성교육 | 아이돌봄서비스 | 사이트 안내 | https://idolbom.go.kr | 링크만 | 필수 교육 안내 |
| 고용행정통계(EIS)·고용노동데이터(ELDS) | 고용노동부 | 포털 | https://eis.work24.go.kr | 미연결 | 노동시장 요소 연결 후보 |
| 장기요양기관 평가결과(저장소 기보유) | 국민건강보험공단 | 파일(data.go.kr 15104801) | `dolbom/data/eval/`, `caregap/data/ltc/` | 저장소에 있음 | 돌봄 직무 선택 시 기관 찾기 안내 후보(이번 MVP 화면 미사용) |

## 이용 조건 메모
- 고용24 OPEN-API: 회원가입 후 서비스 신청 → 담당자 심사 → 인증키 발급. 기업회원 전용(사업자등록번호 요구)이라는 2차 출처 기록이 있어 **개인 참가자는 발급 가능 여부를 먼저 확인**해야 한다. 일일 호출 한도(2차 출처: 1,000회)도 승인 안내로 확인.
- 공공데이터포털(data.go.kr) OpenAPI: 활용신청 → serviceKey. 개발계정 10,000건/일.
- 출처 표기: 화면 Evidence 와 리포트에 "고용24 OPEN-API(한국고용정보원)" 표기 예정. 공공누리 유형은 데이터셋별 확인.

## 저장소에 넣지 않은 것(원칙)
- 존재가 확인되지 않은 API 주소·파라미터를 "연결된 것처럼" 쓰지 않았다. 캐시가 없으면 화면은 DEMO 로 표시된다.
- 가짜 채용공고·가짜 훈련과정을 실제처럼 보이게 하지 않았다(DEMO 배지, 원문 링크 없음 명시).
- 직업전망·임금·지역별 채용 밀도 수치를 만들어 넣지 않았다(미반영 표시).
