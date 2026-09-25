# 설계 결정 기록

## 2026-09-24 저장소 조사 결과

- 저장소 `soonryu74.github.io`는 여러 정적 하위 사이트(부동산·입시·영양제·목장 나눔터 등)가 있는 GitHub Pages(Jekyll) 사이트다. 펫안심365 관련 기존 코드·자산은 없었다.
- 기존 파일·경로는 전혀 수정하지 않았다. 새 프로젝트는 `petsafe/` 폴더에 독립 Next.js 앱으로 만들었다.
- 부작용 주의: 루트의 Jekyll 빌드(`.github/workflows/jekyll.yml`)는 `petsafe/`도 정적 파일로 복사한다. Next.js 앱은 GitHub Pages에서 돌 수 없으므로(서버 액션·API 필요) Vercel 등 Node 호스팅에 배포한다. `_config.yml`의 `exclude`에 `petsafe`를 넣으면 Pages 산출물에서 빠진다 — 사용자 사이트 설정 변경이라 이번 작업에서는 하지 않았다(README 안내).
- 기존 `gajeong/`이 Supabase `korea-now` 프로젝트를 쓰고 있다. 펫안심365는 다른 앱이므로 **전용 Supabase 프로젝트**를 권장한다(무료 요금제 활성 프로젝트 수 제한 확인 필요).

## 기술 선택

- Next.js 16 App Router + TypeScript + Tailwind CSS 4, Supabase(Auth·Postgres·Storage·RLS), zod, proj4.
- Next 16에서 `middleware`는 `proxy`로 이름이 바뀌었다 → `src/proxy.ts`.
- ESLint 10은 eslint-plugin-react와 호환되지 않아 ESLint 9를 쓴다.
- TypeScript 7 대신 5.9(에코시스템 호환).

## 데이터 계층

- `Store` 인터페이스 하나에 두 구현: `supabase`(운영, RLS가 권한 강제)와 `demo`(키가 없을 때 로컬 JSON 파일, 코드에서 소유자 필터).
- 예시 모드는 화면 상단 배너와 로그인 화면에서 명시하고, 이메일을 보내지 않는다(가짜 성공 메시지 금지).
- DB 행 타입을 snake_case 그대로 도메인 타입으로 써서 매핑 코드를 줄였다. `supabase gen types` 도입 시 교체 가능.
- 반려동물 삭제는 하드 삭제(연관 데이터 cascade + 문서 파일 삭제)로 했다. 사용자에게 "영구 삭제"를 명시하고 이름 재입력으로 확인한다. `pets.deleted_at` 컬럼은 향후 복구 기능용으로 남겼다.

## 제품 경계

- 긴급 화면: 관찰 신호 → 할 것/하지 말 것 → 전화·병원 찾기. 진단명·약·용량 없음. 단위 테스트가 금지 표현을 검사한다.
- 보험: 일반 안내만으로는 "보장 가능성 높음"을 주지 않는다(사용자가 입력한 보장 조항이 있을 때만).
- 24시간·응급·전문 진료·동반 조건은 검증 전 "미확인".
- 위치: 버튼 클릭 시에만 요청, 좌표는 브라우저 메모리에서만 사용, 서버 전송·저장 없음. 주소 검색은 카카오 키가 있으면 좌표 변환, 없으면 주소 텍스트 필터.
- 신고 초안은 기본 "이 기기에 저장"(localStorage). 계정 저장은 별도 동의 + 90일 보유 + 행정동 수준 위치만.

## 기술부채·후속

- 가족 공동관리: DB·RLS(`pet_guardians`)는 준비, 초대 UI는 "준비 중".
- 알림(푸시·이메일), 캘린더, QR 안심카드 미구현.
- `incident_drafts.retention_until`, `documents.retention_until` 만료 삭제 배치 미구현(크론 필요).
- 파일 악성코드 검사: `documents.scan_status` 연결 지점만 있음.
- 공공데이터 수집기: 동물병원만. 약국·보호센터·생활업·TourAPI는 같은 구조로 추가.
