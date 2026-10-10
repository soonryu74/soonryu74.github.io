# 한뼘 Supabase — 무엇이 만들어져 있고 무엇이 비어 있나

`schema.sql`은 **적용하지 않은 초안**입니다. 프로젝트도 아직 없습니다. 목장 나눔터(`gajeong/`)와 같은 뼈대(정적 사이트 + Supabase + Edge Function)에 결제·정산이 붙는 구조를 테이블로 먼저 그려 둔 것입니다.

## 지금 화면이 데이터를 어디서 읽나

| 화면 | 지금(시안) | 나중(실제) |
| --- | --- | --- |
| 책·작가·이번 주 한 권 | `handspan/data/*.json` 정적 파일 | `books`, `artists`, `curation_weekly` (public read 정책) |
| 장바구니 | `localStorage` `handspan-cart` | 그대로 브라우저에 두고, 결제 때 `orders`·`order_lines` 생성 |
| 선서·福袋 신청 | `localStorage` `handspan-box-requests` | `box_requests` (anyone insert 정책) |
| 입점 신청 | `localStorage` `handspan-join-requests` | `artists` (status='invited') + 초대 메일 |
| 작가 스튜디오 | 화면 안의 모의 데이터 | RLS로 `my_artist_id()` 행만 |

## 스키마에서 중요한 세 줄

1. `books_fits_in_a_hand` — `greatest(width_mm, height_mm) <= 190`. 규칙이 곧 브랜드이므로 DB가 막습니다. 예외 플래그를 두지 않았습니다.
2. `revenue_splits_sum` — 분배 비율 합이 100이 아니면 거래가 실패합니다(deferrable constraint trigger라 여러 줄을 한 번에 넣어도 됩니다).
3. `payouts_hold_explained` — `status='held'`이면 `hold_reason`과 `release_date`가 비어 있을 수 없습니다. "보류 시 사유와 해제일을 먼저 알린다"는 약속을 제약으로 옮긴 것입니다.

숫자(190, 12%, 15%, 3권, 1일·16일)는 `platform_settings`에 있습니다. `order_lines.track_a_discount_cap` 체크 제약의 `0.15`만 하드코딩되어 있으니, 정가제 재검토 결론이 나면 설정값과 함께 바꿔야 합니다.

## PG 지급대행 단계에서 해야 할 것

플랫폼이 대금을 직접 쥐면 전자금융거래법상 PG 등록(자본금 10억, 소규모 3억)이 필요합니다. 그래서 **지급대행(토스페이먼츠 서브몰)** 또는 **포트원 파트너정산**을 씁니다. 그 단계에 필요한 것:

- 작가 온보딩 때 서브몰(지급 계좌) 등록 API 호출. `artists.payout_method = 'bank_kr'`과 연결.
- 결제 승인 webhook → Edge Function이 `orders.status='paid'`, `order_lines.fee_rate` 확정(첫째 금요일이면 0).
- 배송완료 + 7일 → `orders.confirmed_at` 자동 기록(cron Edge Function).
- 매월 1일·16일 cron: `confirmed_at`이 지급일 7일 전까지인 라인을 모아 `payouts` 생성 → 지급대행 API로 작가별 이체 → `pg_transfer_id` 저장. 분배가 있으면 `revenue_splits` 비율로 `payout_lines`를 나눕니다.
- 월 정산서 PDF: 면세/과세 라인을 나눠 `statement_url`에 저장, 과세분은 계산서 자동 발행.
- 해외 작가: PayPal Payouts 또는 Wise. 한국 운영사의 이용 조건·수수료는 **미확인**(기획안 10절).

## 아직 없는 것

- 계정(auth) 연결과 작가 초대 흐름. `artists.user_id`가 비어 있는 상태로 시작합니다.
- Edge Function 코드(주문 생성, 지급 실행, 납본 체크리스트). 이 README의 설명만 있습니다.
- Storage 버킷(표지 사진, 디지털 책 서명 URL, 다운로드 횟수 제한).
- 우체국 준등기·K-Packet API, 편의점 택배 연동. 1단계는 작가가 `shipments.tracking_no`를 손으로 적습니다.
- `admin/` 화면(큐레이션 편성, 정산 실행, 납본 체크리스트). 테이블은 있고 화면은 없습니다.
- 환율: `books.krw_equiv`는 표시용입니다. 결제일 환율로 다시 계산하는 함수가 필요합니다.

## 적용하려면

```
supabase init
supabase db reset           # 로컬
psql "$DATABASE_URL" -f handspan/supabase/schema.sql
```

적용 전에 `gajeong/`와 같은 프로젝트를 쓸지, 새 프로젝트를 만들지 정해야 합니다. 테이블 이름이 겹치지 않으므로 같은 프로젝트에 넣어도 되지만, 결제 데이터가 붙는 서비스는 따로 두는 쪽을 권합니다.
