# 시험 흔적 정리 실행안 — 승인 요청

작성: 2026-10-04 · 상태: **미실행. 승인 전까지 실행하지 않는다.**
대상 환경: **운영 Supabase 프로젝트**
조사 방법: 읽기 전용 카탈로그·행 조회만 수행했다.

> 이전 보고에서 "이름 T, 지역 서울, 경력 1년" 조건을 제시한 것은 **삭제 대상 식별자로 부적절**했다. 아래는 모두 **정확한 기본키**로 다시 작성한 것이다.

---

## 0. 공통 중단 조건

세 건 모두 다음을 지킨다.

1. 실행 전 `select count(*)` 로 **예상 행 수를 먼저 확인**한다.
2. 예상과 다르면 **중단하고 보고**한다. 조건을 넓혀 다시 시도하지 않는다.
3. 한 번에 한 건씩 실행하고, 각 실행 후 상태를 확인한다.
4. 승인 거부 시 우회하지 않는다. 다른 도구로 같은 삭제를 실행하지 않는다.

---

## 1. `caregivers` 테스트 행 1건

### 대상

| 항목 | 값 |
|---|---|
| 기본키 `id` | `73de6033-960f-4d58-9fa0-b7ede1a61287` |
| `created_at` | 2026-10-04 10:19:00.899023+00 |
| `name` / `role` / `area` / `exp` | `T` / 요양보호사 / 서울 / 1년 |
| `verified` / `premium` / `status` | false / false / active |

### 시험 생성 근거

- 입력값 검증 시험 **T11d** 에서 만들어졌다. `contact_public=true` 인데 `contact` 가 비어 있어도 등록되는지 확인하려던 요청이 통과해 행이 남았다.
- `pg_stat_statements` 에 같은 시각(10:19:00)의 PostgREST INSERT 문장이 `calls=1` 로 남아 있다.
- 이 틈은 이후 `caregivers_insert_restrictive_guard` 정책으로 막았고, 같은 요청이 지금은 `401` 로 거부되는 것을 확인했다.

### 영향·의존

- 예상 영향 행: **정확히 1행.**
- `caregivers` 를 참조하는 뷰: `caregivers_public` (뷰이므로 행 삭제에 영향 없음).
- 이 테이블을 가리키는 외래키: 없음.
- 현재 `caregivers` 전체 행 수는 **1** 이다. 즉 이 행이 유일한 행이다.

### 실행안

```sql
-- 1) 사전 확인 — 반드시 1이 나와야 한다
select count(*) from public.caregivers
 where id = '73de6033-960f-4d58-9fa0-b7ede1a61287';

-- 2) 삭제 (1 이 아니면 실행하지 않는다)
delete from public.caregivers
 where id = '73de6033-960f-4d58-9fa0-b7ede1a61287';

-- 3) 사후 확인 — 0 이어야 한다
select count(*) from public.caregivers
 where id = '73de6033-960f-4d58-9fa0-b7ede1a61287';
```

### 복구

```sql
insert into public.caregivers (id, created_at, name, role, exp, area, types, skills, "time",
                               contact, contact_public, intro, premium, verified, status)
values ('73de6033-960f-4d58-9fa0-b7ede1a61287', '2026-10-04 10:19:00.899023+00',
        'T', '요양보호사', '1년', '서울', '{}', '{}', '주간(낮)',
        '', true, null, false, false, 'active');
```
※ 현재 RESTRICTIVE 정책 때문에 익명으로는 재삽입되지 않는다. 관리자 권한으로만 가능하다.

### 대안

삭제 대신 `status` 를 `'test'` 로 바꾸면 공개 뷰(`status='active'` 조건)에서 빠진다. 행을 지우지 않는 쪽을 원하시면 이 방법을 쓸 수 있다.

---

## 2. `selftest_idem` 테이블 (중복접수 제약 시험용)

### 대상

| 항목 | 값 |
|---|---|
| 테이블 | `public.selftest_idem` |
| 생성 | 마이그레이션 `selftest_idem_clone_create` (2026-10-04 06:56:11) |
| 목적 | `waitlist` 와 **같은 모양의 유니크 인덱스**를 가진 복제본. 운영 테이블을 건드리지 않고 중복접수 차단을 시험하기 위해 만들었다 |
| 행 수 | **3** |
| 익명 권한 | **없음** (`selftest_idem_clone_lockdown` 에서 전부 회수) |
| 참조하는 뷰 | **없음** |
| 이 테이블을 가리키는 외래키 | **없음** |

### 남은 3행 (전부 합성 데이터)

| `id` | `created_at` | `role` | `source` | `contact`(마스킹) |
|---|---|---|---|---|
| `2f81cfa3-b802-4269-b125-725a559aa0c7` | 06:56:29.504857+00 | 전문가 | `selftest` | `tst-492d2c…@example.com` |
| `110fee73-0cc5-4a96-9643-06f630b34412` | 06:56:32.347148+00 | 가정·기관 | `selftest` | `010-1234-5…` |
| `1651d14e-e941-44ce-8db9-401c9457b9bf` | 06:56:33.999022+00 | 전문가 | `selftest` | `other-tst-…@example.com` |

- 모두 `source='selftest'` 이고, 연락처는 `example.com` 도메인과 `010-1234-5678`(예시 번호)이다. **실제 개인정보가 아니다.**
- 세 행 모두 내 적재 스크립트가 만든 것이며, 생성 시각이 3초 안에 몰려 있다.

### 실행안

```sql
-- 1) 사전 확인 — 3 이어야 하고, 'selftest' 가 아닌 행이 0 이어야 한다
select count(*) as 전체, count(*) filter (where source <> 'selftest') as 비시험행
  from public.selftest_idem;

-- 2) 의존 객체 확인 — 결과가 비어 있어야 한다
select dv.relname from pg_depend d
  join pg_rewrite r on r.oid = d.objid
  join pg_class dv on dv.oid = r.ev_class
  join pg_class src on src.oid = d.refobjid
 where src.relname = 'selftest_idem' and dv.relname <> 'selftest_idem';

-- 3) 제거 (위 두 확인이 통과한 경우에만)
drop table public.selftest_idem;
```

`drop table` 은 테이블과 함께 인덱스 2개, 정책 1개를 같이 지운다. `cascade` 는 쓰지 않는다 — 의존 객체가 있으면 실패해야 한다.

### 복구

테이블 정의 전체가 마이그레이션 `selftest_idem_clone_create` 에 남아 있으므로 그대로 재생성할 수 있다. 3행은 합성 데이터이므로 복원할 필요가 없다.

### 대안

제거 대신 두는 것도 안전하다. 익명 권한이 이미 전부 회수되어 외부에서 읽지도 쓰지도 못한다. 다만 **다음에 또 "이게 뭐지" 하게 되는 흔적**이므로 지우는 쪽을 권한다.

---

## 3. `institutions_raw` 의 적재 시험 행 1건

### 대상

| 항목 | 값 |
|---|---|
| 기본키 `id` | `1` (bigint identity) |
| `loaded_at` | 2026-10-04 11:29:44.316941+00 |
| `source_file` | `probe` |
| `ltc_sym` / `name` / `eval_round` | `PROBE` / `적재시험` / `적재시험` |

### 시험 생성 근거

마이그레이션 `institutions_raw_probe_one_row` 가 만든 행이다. 적재 경로가 열려 있는지 한 행으로 확인하려고 넣었다.

### 영향·의존

- 예상 영향 행: **정확히 1행.**
- `institutions_raw` 를 참조하는 뷰: `institutions_eval`.
  이 뷰는 `where source_file like 'data.go.kr%'` 로 걸러내므로 **probe 행은 애초에 포함되지 않는다.** 삭제해도 뷰 결과(24,486건)는 바뀌지 않는다.
- `institutions_eval_latest` 는 뷰에서 한 번 복사한 **테이블**이므로 영향 없다.
- 공공데이터 행 수: **27,947** (이 1행과 별개).

### 실행안

```sql
-- 1) 사전 확인 — probe 1, 공공데이터 27947 이어야 한다
select count(*) filter (where source_file = 'probe')        as probe행,
       count(*) filter (where source_file like 'data.go.kr%') as 공공데이터행
  from public.institutions_raw;

-- 2) 삭제 (위 값이 일치할 때만)
delete from public.institutions_raw where id = 1 and source_file = 'probe';

-- 3) 사후 확인 — probe 0, 공공데이터 27947 유지
select count(*) filter (where source_file = 'probe')        as probe행,
       count(*) filter (where source_file like 'data.go.kr%') as 공공데이터행
  from public.institutions_raw;
```

### 복구

```sql
insert into public.institutions_raw (seq, eval_round, ltc_sym, name, source_file, loaded_at)
values (0, '적재시험', 'PROBE', '적재시험', 'probe', '2026-10-04 11:29:44.316941+00');
```
(`id` 는 identity 열이라 같은 값이 다시 부여되지 않는다. 기능상 문제는 없다.)

---

## 4. 같이 정리할 수 있는 것 (승인에 포함할지 선택)

| 대상 | 내용 | 위험 |
|---|---|---|
| `"load window"` 정책 | `institutions_raw` 에 남은 적재용 INSERT 정책. **권한(grant)이 이미 회수되어 현재 무해**하지만 흔적이다 | 없음. `drop policy "load window" on public.institutions_raw;` |
| `institutions_latest` 뷰 | 기관기호 기반 새 경로로 대체됨. **라이브 `gigwan.html` 이 아직 조회 중**이므로 지금 지우면 운영 화면이 깨진다 | **프런트엔드 배포 확인 후에만** |
| `institutions` 테이블 | 기관기호가 없는 옛 적재본 27,946행. 새 `institutions_raw`/`institutions_eval_latest` 로 대체 | 라이브가 사용 중. 처리 방침은 사용자 결정 |

---

## 5. 별건 — 긴급도가 더 높은 항목

`docs/care-platform/incident-20261004.md` **6절**의 `public.import_eval_chunk(text)` 는
**인터넷의 누구나 호출할 수 있는 `SECURITY DEFINER` 함수**이며, 임의 URL 요청(SSRF)과
`institutions` 테이블에 대한 RLS 우회 삽입이 가능하다. Supabase 자체 보안 검사도 같은 항목을 경고한다.

위 1~3번은 흔적 정리일 뿐이지만, 이것은 **현재 열려 있는 외부 공격 경로**다.
실행안·영향·복구는 사고 기록 6절에 적어 두었다. 이것부터 결정해 주시기를 권한다.
