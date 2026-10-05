-- 자격 확인 절차의 데이터·권한 구조 (격리 환경)
--
-- 원칙
--  · 사람이 원본 서류를 확인하기 전에는 어떤 확인 표시도 붙지 않는다.
--  · 증빙 파일은 공개 경로에 두지 않는다. 이 DB에는 파일 자체를 넣지 않고
--    보관 위치 참조와 해시만 둔다.
--  · 확인은 영구가 아니다. 유효기간이 지나면 자동으로 만료된다.
--  · 철회·이의제기 이력을 남긴다. 상태를 덮어쓰지 않는다.

create table public.verifications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  subject_type text not null check (subject_type in ('caregiver','org')),
  subject_id uuid not null,
  -- 무엇을 확인했는가
  kind text not null check (kind in
    ('요양보호사자격','간호조무사자격','간호사면허','기관실재','사업자등록','교육이수')),
  -- 증빙: 파일은 여기 넣지 않는다. 비공개 보관소의 참조와 해시만 둔다.
  evidence_ref text,
  evidence_sha256 text,
  -- 확인 행위
  state text not null default 'requested' check (state in
    ('requested','in_review','verified','rejected','expired','revoked')),
  reviewed_by text,                       -- 확인한 사람 (운영자 식별자)
  reviewed_at timestamptz,
  valid_until date,                       -- 유효기간. 지나면 만료로 본다
  note text,                              -- 반려·철회 사유 (내부용)
  constraint verified_needs_reviewer
    check (state <> 'verified' or (reviewed_by is not null and reviewed_at is not null)),
  constraint rejected_needs_reason
    check (state <> 'rejected' or note is not null)
);
create index verifications_subject_idx on public.verifications (subject_type, subject_id, kind);

create table public.verification_events (   -- 상태 변경 이력. 덮어쓰지 않고 쌓는다
  id bigint generated always as identity primary key,
  verification_id uuid not null references public.verifications(id) on delete cascade,
  at timestamptz not null default now(),
  from_state text, to_state text not null,
  actor text,                               -- 운영자 / 본인 / 시스템
  reason text
);

-- 공개 화면에 내보낼 수 있는 것: '유효한 확인이 있는가' 뿐.
-- 증빙 참조·해시·검토자·사유는 내보내지 않는다.
create view public.verification_badges as
select subject_type, subject_id, kind, valid_until
from public.verifications
where state = 'verified'
  and (valid_until is null or valid_until >= current_date);
alter view public.verification_badges set (security_invoker = true);

alter table public.verifications       enable row level security;
alter table public.verification_events enable row level security;

-- 공개 읽기는 '유효한 확인' 행에 한정한다
create policy "read valid verifications" on public.verifications
  for select to anon, authenticated
  using (state = 'verified' and (valid_until is null or valid_until >= current_date));

revoke all on public.verifications, public.verification_events from anon, authenticated;
grant select on public.verifications to anon, authenticated;
grant select on public.verification_badges to anon, authenticated;

-- 상태 변경은 전부 이력에 남긴다
create or replace function public.log_verification_change() returns trigger
language plpgsql as $t$
begin
  if tg_op = 'INSERT' then
    insert into public.verification_events (verification_id, from_state, to_state, actor)
    values (new.id, null, new.state, coalesce(new.reviewed_by, 'system'));
  elsif new.state is distinct from old.state then
    insert into public.verification_events (verification_id, from_state, to_state, actor, reason)
    values (new.id, old.state, new.state, coalesce(new.reviewed_by, 'system'), new.note);
  end if;
  return new;
end $t$;
create trigger verifications_audit
  after insert or update on public.verifications
  for each row execute function public.log_verification_change();
