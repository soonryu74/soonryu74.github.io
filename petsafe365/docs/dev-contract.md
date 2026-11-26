# 화면 개발 규칙 (모든 화면 공통)

기준 문서는 인수인계서(`PETSAFE365_CLAUDE_HANDOFF.md`)와 이 문서다. 2026-11-26 확정 사항 세 가지가 인수인계서보다 우선한다.

1. 결제는 사업자 신고와 결제대행사 심사 뒤 관리자 승인으로 켠다. 그 전에는 `paymentsEnabled=false`.
2. 하단 탭은 `오늘 | 우리 아이 | 지도 | 용품 | 더보기`. 기록은 `우리 아이` 안에 둔다 (`/records` 경로는 유지).
3. 광고는 월 이용자 5천 명 이후 관리자 승인으로 켠다. 그 전에는 `adsEnabled=false`.

## 기술 규칙

- Next.js 16 App Router, TypeScript, Tailwind 4. 화면은 `src/app/<route>/page.tsx`.
- 데이터를 다루는 화면은 `"use client"` 로 만들고, 데이터는 반드시 `getRepo()` (`@/lib/repo`) 로만 읽고 쓴다. `localStorage` 를 직접 쓰지 않는다.
- 동적 경로의 값은 `useParams()` 로 읽는다.
- 조회는 `useAsync(fn, deps)`, 세션은 `useSession()`, 내 반려동물은 `usePets()` (`@/lib/hooks`).
- 복합 동작은 `@/lib/domain` (`createPetWithTasks`, `completeTask`, `snoozeTask`, `tasksForToday`, `deletePetCascade`, `recordConsents`, `getFlags`, `getContent`, `audit`).
- 규칙·문구는 `@/lib/rules` (`classifyInsurance`, `INSURANCE_DISCLAIMER`, `INSURANCE_FINAL_NOTE`, `RESULT_LABEL`, `INSURANCE_CATEGORIES`, `isContactUsable`, `isContentPublic`, `fitFor`, `commerceAllowedOn`).
- 화면 부품은 `@/components/ui` 만 쓴다 (`Button`, `LinkButton`, `Card`, `PageHeader`, `Badge`, `ExampleBadge`, `Field`, `SelectField`, `TextareaField`, `Loading`, `EmptyState`, `ErrorState`, `LoginRequired`, `Forbidden`, `SourceMeta`, `Notice`, `formatDate`, `formatWon`). 새 공용 부품이 필요하면 자기 화면 폴더 안에 둔다.
- 색은 Tailwind 토큰만: `bg-bg bg-card bg-tint text-ink text-muted border-line`, `brand`(인디고), `accent`(메리골드, 결제·강조 한 곳), `safe`(청록), `danger`(긴급 전용), `warn`.
- `src/lib/**`, `src/components/ui.tsx`, `src/components/AppShell.tsx`, `src/app/layout.tsx`, `globals.css` 는 수정하지 않는다. 고쳐야 하면 보고만 한다.

## 모든 화면이 갖춰야 할 상태

- 로딩 (`Loading`), 빈 상태 (`EmptyState`), 오류 (`ErrorState` + 다시 시도), 로그인 필요 (`LoginRequired`), 권한 없음·없는 대상 (`Forbidden`).
- 폼: 모든 입력에 `label`, 오류 문구, 제출 중 버튼 비활성화. 필수와 선택을 구분한다.
- 모바일 360px 에서 가로 스크롤이 없어야 한다. 버튼 높이 48px 이상.
- 작동하지 않는 버튼을 만들지 않는다. 미구현은 숨기거나 `disabled` + "준비 중".
- 성공 메시지는 실제로 저장이 끝난 뒤에만 보여 준다.

## 내용 규칙

- 진단명·약·용량·치료법을 제시하지 않는다. 행동(전화, 기록, 병원 가기)만 안내한다.
- 보험 상품 추천·순위·가입 버튼을 만들지 않는다.
- 병원·카페·공원·연락처를 지어내지 않는다. 시드에 있는 것만 쓰고 예시는 `ExampleBadge` 를 붙인다.
- 24시간·응급·동반 가능은 확인값이 없으면 "미확인".
- 출처·최근 검토일·검수 상태를 `SourceMeta` 로 보여 준다.
- 위치 권한은 버튼을 눌렀을 때만 요청하고 좌표를 저장하지 않는다.
- 판매·광고는 `commerceAllowedOn(pathname)` 이 true 인 화면에서만.
- 문구는 따뜻한 존댓말(해요체), 짧은 문장.

## 검증

- 자기 파일에 대해 `npx tsc --noEmit` 과 `npx eslint <파일들>` 을 통과시킨다.
- `next build`, `next dev`, 테스트 실행은 하지 않는다 (다른 작업과 충돌).
