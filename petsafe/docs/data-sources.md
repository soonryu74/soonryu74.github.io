# 데이터 출처·라이선스·갱신 주기

- 작성일: 2026-09-25
- 원칙: 공공데이터 → 사업자 직접 제출(관리자 확인) → 사용자 오류신고 순으로 신뢰한다. 검색 포털의 리뷰·사진·장소정보는 복제하지 않고, 카카오맵은 주소 검색·길찾기 보조로만 쓴다.

> API 이름·필드·쿼터는 바뀔 수 있다. 아래 "확인 상태"가 `키 발급 후 확인 필요`인 항목은, 키를 받은 날 공식 문서를 열어 필드명을 대조하고 이 표의 확인일을 갱신한다.

| 용도 | 출처 | 연동 방식 | 라이선스 표기 | 갱신 | 코드 위치 | 확인 상태 |
|---|---|---|---|---|---|---|
| 전국 동물병원 | 행정안전부 동물_동물병원 조회서비스 (data.go.kr 15154952) | 일 배치 `npm run import:hospitals` | 공공데이터포털 이용허락(출처표시) | 매일 | `scripts/import-animal-hospitals.ts`, `src/lib/importers/animal-hospital.ts` | 필드 매핑은 LOCALDATA 표준 필드 기준으로 작성. **키 발급 후 실제 응답 필드명 대조 필요** (`FIELD_MAP`만 수정) |
| 동물약국·미용·위탁·장묘·운송 | 공공데이터포털 전국 인허가 데이터 | 일/주 배치 | 공공데이터포털 이용허락 | 주 1회 | 미구현 (Phase 2, 동물병원 수집기 구조 재사용) | 미착수 |
| 실종·구조동물 공고 | 농림축산식품부 국가동물보호정보시스템 구조동물 조회 서비스 (data.go.kr 15098931, `abandonmentPublicService_v2`) | 요청 시 서버 호출, 30분 캐시(시도·시군구 목록은 1일) | 이용허락범위 제한 없음 | 실시간(30분 캐시) | `src/lib/rescue/*`, `src/app/lost` | 2026-09-25 명세 확인: 요청 bgnde·endde·upkind(417000/422400/429900)·upr_cd·org_cd·state(notice/protect)·numOfRows≤1000, 응답 desertionNo·happenDt·happenPlace·upKindNm·kindNm·colorCd·age·weight·noticeSdt/Edt·popfile1·processState·sexCd·neuterYn·specialMark·careNm·careTel·careAddr·orgNm. 엔드포인트는 키 없이 호출 시 '등록되지 않은 서비스키' 응답 확인. **실제 키로 응답 확인은 아직 안 함** |
| 보호센터 | 국가동물보호정보시스템 동물보호센터 API | 일 배치 | 공공데이터포털 이용허락 | 매일 | 미구현 (Phase 2) | 미착수 |
| 동반 여행지 | 한국관광공사 TourAPI 반려동물 동반여행 | 주 배치 | 레코드별 사진 라이선스 기록 필수 | 주 1회 | 미구현 (Phase 2) | 미착수 |
| 지도 표시 | Kakao Map JavaScript SDK | 클라이언트, `NEXT_PUBLIC_KAKAO_MAP_APP_KEY` | 카카오 이용약관 | - | `src/app/map/map-client.tsx` | 키 없으면 목록+길찾기 링크로 동작 |
| 주소→좌표 | Kakao Local REST API | 서버 프록시 `/api/geocode`, `KAKAO_REST_API_KEY` | 카카오 이용약관 | 요청 시 | `src/app/api/geocode/route.ts` | 키 없으면 주소 텍스트 필터로 대체 |
| 신고 연락처 | 농림축산식품부·국가동물보호정보시스템·소비자원 등 | 관리자 CMS (`official_contacts`) | - | 분기 1회 재확인 | `src/content/official-contacts.ts` → `supabase/seed.sql` | 1577-0954, 112, 1372는 인수인계서(2026-08-31) 기준. 지자체·대한수의사회 번호는 **운영자 검증 전 미게시** |
| 감염병 콘텐츠 | 질병관리청 감염병포털, 농림축산검역본부 | 관리자 CMS, 검수 후 공개 | 원문 링크 필수 | 연 1회 이상 | `src/content/zoonoses.ts` | 초기 4종 모두 `in_review` — 수의사 검수 전 비공개 |

## 좌표 변환

- 인허가 데이터의 좌표는 EPSG:5174(Korean 1985 / Modified Central Belt, Bessel 타원체)다.
- `proj4` 정의: `+proj=tmerc +lat_0=38 +lon_0=127.0028902777778 +k=1 +x_0=200000 +y_0=500000 +ellps=bessel +units=m +towgs84=-115.80,474.99,674.11,1.16,-2.31,-1.63,6.43`
- 대한민국 범위(위도 32~39.5, 경도 124~132) 밖이면 변환 실패로 보고 좌표를 비운다. 변환 결과는 수집기 dry-run 출력의 `conversionSamples`에 남는다.

## 원본·정규화 분리

- 원본: `facility_source_records (source_system, source_id, raw_json, fetched_at)`
- 정규화: `facilities` + `facility_details`
- 중복 방지 키: `source_system + source_id` (unique)
- 폐업·휴업은 삭제하지 않고 `business_status` 변경 + `facility_status_history` 기록
- 이름·주소가 같은 레코드는 `mergeCandidates`로 후보만 뽑고 자동 병합하지 않는다(관리자 검토).
- 실행 기록: `facility_sync_logs`

## 예시 데이터

`src/content/demo-facilities.ts`와 `tests/fixtures/*.json`은 **실제 업체가 아니다**. 이름에 "예시", 주소에 "(예시 데이터)"를 넣고 `is_example=true`로 저장해 화면에 "예시 데이터" 배지를 붙인다. 전화번호는 존재하지 않는 `02-000-xxxx` 형식이다.
