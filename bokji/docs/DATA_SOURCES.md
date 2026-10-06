# 데이터 출처 — 모두의 복지 AI

화이트리스트 `app/src/data/services.json`의 전 항목. 모든 항목은 `source_org`·`official_url`·`verified_at`·`eligibility_note`·`last_checked`를 필수로 갖는다.

확인 방법: 개발 환경이 정부 사이트 직접 접속을 막아, 공식 주소는 **해당 도메인으로 제한한 검색 결과에 같은 경로가 색인돼 있는지**로 확인했다(`search-index`). 배포 전 `npm run check:links`로 직접 접속 결과를 `app/test-results/link-check.json`에 남길 것.

| # | 제도 | 담당 | 공식 링크 | 전화 | 확인일 | 확인 방법 |
|---|---|---|---|---|---|---|
| 1 | 노인맞춤돌봄서비스 | 보건복지부 | [보건복지부 노인맞춤돌봄서비스 안내](https://www.mohw.go.kr/menu.es?mid=a10712010400) | 129(보건복지상담센터) | 2026-10-05 | 검색 색인에서 공식 도메인·경로 확인 |
| 2 | 노인장기요양보험 장기요양인정 신청 | 국민건강보험공단 | [노인장기요양보험 공식 사이트](https://www.longtermcare.or.kr/) | 1577-1000(국민건강보험공단 고객센터) | 2026-10-05 | 검색 색인에서 공식 도메인·경로 확인 |
| 3 | 기초연금 | 보건복지부·국민연금공단 | [기초연금 공식 사이트(보건복지부)](https://basicpension.mohw.go.kr/) | 1355(국민연금공단 콜센터) | 2026-10-05 | 검색 색인에서 공식 도메인·경로 확인 |
| 4 | 보건소 방문건강관리서비스 | 보건복지부·한국건강증진개발원·보건소 | [한국건강증진개발원 방문건강관리 사업 안내](https://www.khepi.or.kr/menu?menuId=MENU01691) | 지역별 | 2026-10-05 | 검색 색인에서 공식 도메인·경로 확인 |
| 5 | 교통약자 특별교통수단(장애인콜택시 등) | 국토교통부·한국교통안전공단·지자체 | [교통약자 이동편의 정보관리시스템 이용안내(한국교통안전공단)](https://dtis.kotsa.or.kr/userWeb/serviceGuide.do) | 지역별 | 2026-10-05 | 검색 색인에서 공식 도메인·경로 확인 |
| 6 | 노인 무릎인공관절 수술비 지원(노인의료나눔재단) | 노인의료나눔재단(보건복지부 지정) | [노인의료나눔재단 무릎인공관절 수술지원사업](https://www.ok6595.or.kr/client/info/knee02.asp) | 1661-6595(노인의료나눔재단) | 2026-10-05 | 검색 색인에서 공식 도메인·경로 확인 |
| 7 | 독거노인·장애인 응급안전안심서비스 | 보건복지부·한국사회보장정보원 | [복지로 응급안전안심서비스 신청 안내](https://www.bokjiro.go.kr/ssis-tbu/cms/pc/news/promotion/1304668_1118.html) | 129(보건복지상담센터) | 2026-10-05 | 검색 색인에서 공식 도메인·경로 확인 |
| 8 | 치매안심센터·치매상담콜센터 | 보건복지부·중앙치매센터 | [중앙치매센터](https://www.nid.or.kr/) | 1899-9988(치매상담콜센터) | 2026-10-05 | 검색 색인에서 공식 도메인·경로 확인 |
| 9 | 장애인 활동지원서비스 | 보건복지부·국민연금공단 | [장애인활동지원 공식 사이트](https://www.ableservice.or.kr/) | 1355(국민연금공단 콜센터) | 2026-10-05 | 검색 색인에서 공식 도메인·경로 확인 |
| 10 | 발달장애인 주간활동서비스 | 보건복지부·중앙장애아동·발달장애인지원센터 | [중앙장애아동·발달장애인지원센터](https://www.broso.or.kr/mainPage.do) | 129(보건복지상담센터) | 2026-10-05 | 검색 색인에서 공식 도메인·경로 확인 |
| 11 | 발달장애인 부모상담지원 | 보건복지부 | [보건복지부 발달장애인 부모상담지원 안내](https://www.mohw.go.kr/menu.es?mid=a10710040500) | 129(보건복지상담센터) | 2026-10-05 | 검색 색인에서 공식 도메인·경로 확인 |
| 12 | 장애인연금 | 보건복지부 | [보건복지부 장애인연금 안내](https://www.mohw.go.kr/menu.es?mid=a10710030100) | 129(보건복지상담센터) | 2026-10-05 | 검색 색인에서 공식 도메인·경로 확인 |
| 13 | 장애수당 | 보건복지부 | [복지로 장애수당 안내](https://www.bokjiro.go.kr/ssis-tbu/twataa/wlfareInfo/moveTWAT52011M.do?wlfareInfoId=WLF00003265) | 129(보건복지상담센터) | 2026-10-05 | 검색 색인에서 공식 도메인·경로 확인 |
| 14 | 장애인 보조기기 교부사업 | 보건복지부·국립재활원 | [국립재활원 중앙보조기기센터 교부사업 안내](https://knat.go.kr/knw/home/knat_DB/assist_detail.php?assist_biz_idx=1) | 129(보건복지상담센터) | 2026-10-05 | 검색 색인에서 공식 도메인·경로 확인 |
| 15 | 긴급복지지원 | 보건복지부 | [보건복지부 긴급복지지원 안내](https://www.mohw.go.kr/menu.es?mid=a10708010100) | 129(보건복지상담센터(긴급 상담 24시간)) | 2026-10-05 | 검색 색인에서 공식 도메인·경로 확인 |
| 16 | 국민기초생활보장(생계·의료·주거·교육급여) | 보건복지부 | [복지로 생계급여 안내](https://www.bokjiro.go.kr/ssis-tbu/twataa/wlfareInfo/moveTWAT52011M.do?wlfareInfoId=WLF00001132) | 129(보건복지상담센터) | 2026-10-05 | 검색 색인에서 공식 도메인·경로 확인 |
| 17 | 에너지바우처 | 산업통상자원부·한국에너지공단 | [에너지바우처 공식 사이트](https://www.energyv.or.kr/) | 1600-3190(에너지바우처 콜센터) | 2026-10-05 | 검색 색인에서 공식 도메인·경로 확인 |
| 18 | 전기요금 복지할인(한국전력) | 한국전력공사 | [한전 사이버지점 복지할인 요금제 안내](https://cyber.kepco.co.kr/ckepco/front/jsp/CY/H/C/CYHCHP00208.jsp) | 123(한국전력 고객센터) | 2026-10-05 | 검색 색인에서 공식 도메인·경로 확인 |
| 19 | 재난적의료비 지원 | 보건복지부·국민건강보험공단 | [국민건강보험공단 재난적의료비 지원사업 안내](https://www.nhis.or.kr/nhis/policy/wbhada14400m01.do) | 1577-1000(국민건강보험공단 고객센터) | 2026-10-05 | 검색 색인에서 공식 도메인·경로 확인 |
| 20 | 복지로 맞춤형급여안내(복지멤버십) | 보건복지부·한국사회보장정보원 | [복지로 맞춤형급여안내(복지멤버십)](https://www.bokjiro.go.kr/ssis-tbu/twatza/wmAplyMng/selectWmGdnc.do) | 129(보건복지상담센터) | 2026-10-05 | 검색 색인에서 공식 도메인·경로 확인 |
| 21 | 정부24 혜택알리미 간편찾기 | 행정안전부 | [정부24 혜택알리미 간편찾기](https://plus.gov.kr/portal/benefitV2/benefitEasyFind/) | 지역별 | 2026-10-05 | 검색 색인에서 공식 도메인·경로 확인 |

## 보조 링크

- 노인장기요양보험 장기요양인정 신청: [장기요양인정 신청 안내](https://www.longtermcare.or.kr/npbs/u/b/101/openLtcRcgtAplyPttnChoice.web?aplyTypeScr=appltit&menuId=npe0000000500)
- 노인장기요양보험 장기요양인정 신청 온라인 신청: https://www.longtermcare.or.kr/npbs/u/b/101/openLtcRcgtAplyPttnChoice.web?aplyTypeScr=appltit&menuId=npe0000000500
- 기초연금: [복지로 기초연금 안내](https://www.bokjiro.go.kr/ssis-tbu/twataa/wlfareInfo/moveTWAT52011M.do?wlfareInfoId=WLF00001164)
- 기초연금 온라인 신청: https://www.bokjiro.go.kr/
- 독거노인·장애인 응급안전안심서비스: [보건복지부 보도자료: 혼자 사시는 노인 누구나 신청 가능](https://www.mohw.go.kr/board.es?mid=a10503010100&bid=0027&act=view&list_no=1480948)
- 장애인 활동지원서비스: [신청자격 안내](https://www.ableservice.or.kr/regm/info/getOHGC0005M0.do)
- 장애인 활동지원서비스 온라인 신청: https://www.bokjiro.go.kr/
- 발달장애인 주간활동서비스: [지역 발달장애인지원센터 찾기](https://www.broso.or.kr/contents.do?menuId=0201000000)
- 발달장애인 부모상담지원: [발달장애인 가족휴식지원 안내](https://www.mohw.go.kr/menu.es?mid=a10710040600)
- 발달장애인 부모상담지원 온라인 신청: https://www.bokjiro.go.kr/
- 장애인연금 온라인 신청: https://www.bokjiro.go.kr/
- 장애인 보조기기 교부사업: [복지로 보조기기 교부 안내](https://www.bokjiro.go.kr/ssis-tbu/twataa/wlfareInfo/moveTWAT52011M.do?wlfareInfoId=WLF00003211)
- 장애인 보조기기 교부사업 온라인 신청: https://www.bokjiro.go.kr/
- 긴급복지지원: [복지로 긴급복지 생계지원 안내](https://www.bokjiro.go.kr/ssis-tbu/twataa/wlfareInfo/moveTWAT52011M.do?wlfareInfoId=WLF00003180)
- 국민기초생활보장(생계·의료·주거·교육급여): [복지로 모의계산(국민기초생활보장)](https://www.bokjiro.go.kr/ssis-tbu/twatbz/mkclAsis/mkclInsertNblgPage.do)
- 에너지바우처: [신청 안내](https://www.energyv.or.kr/info/apl_info.do) · [모의진단](https://www.energyv.or.kr/info/energyv_smu.do)
- 에너지바우처 온라인 신청: https://www.energyv.or.kr/info/apl_info.do
- 복지로 맞춤형급여안내(복지멤버십): [정부24 혜택알리미 간편찾기](https://plus.gov.kr/portal/benefitV2/benefitEasyFind/)

## 긴급 연락처 (`app/src/data/emergency.json`)

| 번호 | 이름 | 이럴 때 | 운영 | 누리집 |
|---|---|---|---|---|
| 119 | 응급(구급·화재) | 쓰러짐, 호흡 곤란, 큰 부상, 화재 | 24시간 | — |
| 129 | 보건복지상담센터 | 긴급복지·복지 사각지대·학대·정신건강 상담, 복지제도 전반 문의 | 일반 상담 평일 09~18시 · 긴급 상담 24시간 | https://www.129.go.kr/ |
| 109 | 자살예방·정신건강 위기상담 | 죽고 싶다는 생각, 극심한 불안·우울 | 24시간 | — |
| 1577-1389 | 노인학대 신고 | 어르신이 맞거나 방치되는 것 같을 때 | 24시간 | https://www.noinboho.or.kr/ |
| 1899-9988 | 치매상담콜센터 | 치매가 걱정될 때, 돌봄 방법 상담 | 24시간 | — |
| 112 | 경찰(범죄·폭력) | 가정폭력, 위협, 사기 의심 | 24시간 | — |

## 전화번호 근거
- 129 보건복지상담센터: 평일 09~18시, 긴급복지·학대·정신건강 24시간 (129.go.kr)
- 1577-1000 국민건강보험공단 고객센터, 장기요양 상담 단축번호 041 (nhis.or.kr)
- 1355 국민연금공단 콜센터 (basicpension.mohw.go.kr 안내)
- 1600-3190 에너지바우처 콜센터, 평일 09~18시 (energyv.or.kr·korea.kr)
- 123 한국전력 고객센터 (kepco.co.kr)
- 1661-6595 노인의료나눔재단 (보도자료·지자체 안내)
- 1899-9988 치매상담콜센터 24시간 (치매안심센터 누리집 공통 표기)
- 1577-1389 노인학대 신고 24시간 (보건복지부 보도자료)
- 109 자살예방 상담전화 — 2024년 1월부터 1393·1577-0199·1388 통합 (korea.kr)
- 119·112 국번 없음

## 갱신 규칙
- 금액·기간은 본문에 최소한만 적고 공식 링크로 보낸다.
- 분기마다 `last_checked` 갱신, 주소 변경 시 `official_url` 수정 또는 `null` 처리.
