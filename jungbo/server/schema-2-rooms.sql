-- 중보기도 나눔터 — 2차: 방(그룹·기수·공통) 구조와 글 공개 범위
-- 모임(공동체) 안에 방이 여럿: kind = group(그룹 1~12) · cohort(기수 1~6) · custom. 공통은 room_id = null.
-- 한 사람이 여러 방에 속한다. 글은 방 하나에 올리고 visibility(room·leaders·private)를 고른다.
-- 인도자 두 층: pray_member.role = 'leader'(전체 인도자·목회자) / pray_room_member.role = 'leader'(방 인도자)

create table if not exists pray_room (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references pray_group(id) on delete cascade,
  name text not null,
  kind text not null default 'custom' check (kind in ('group', 'cohort', 'custom')),
  sort int not null default 0,
  created_at timestamptz not null default now(),
  unique (group_id, name)
);
create table if not exists pray_room_member (
  room_id uuid not null references pray_room(id) on delete cascade,
  member_id uuid not null references pray_member(id) on delete cascade,
  role text not null default 'member' check (role in ('leader', 'member')),
  created_at timestamptz not null default now(),
  primary key (room_id, member_id)
);
create index if not exists pray_room_member_member on pray_room_member(member_id);
alter table pray_room enable row level security;
alter table pray_room_member enable row level security;
revoke all on pray_room, pray_room_member from anon, authenticated;

alter table pray_post add column if not exists room_id uuid references pray_room(id) on delete set null;
alter table pray_post add column if not exists visibility text not null default 'room';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'pray_post_visibility_check') then
    alter table pray_post add constraint pray_post_visibility_check check (visibility in ('room', 'leaders', 'private'));
  end if;
end $$;
create index if not exists pray_post_room on pray_post(room_id);

-- ── 도우미 ─────────────────────────────────────────────
-- 이 글을 이 사람이 볼 수 있나: 쓴 사람 · 전체 인도자 · (방 글이면) 방 식구 · (인도자만이면) 방 인도자
create or replace function pray__can_see(m pray_member, p pray_post) returns boolean language sql stable security definer
set search_path = public as $$
  select p.author_id = m.id
      or (p.visibility <> 'private' and m.role = 'leader')
      or (p.visibility = 'room' and (p.room_id is null or exists (select 1 from pray_room_member rm where rm.room_id = p.room_id and rm.member_id = m.id)))
      or (p.visibility = 'leaders' and p.room_id is not null and exists (select 1 from pray_room_member rm where rm.room_id = p.room_id and rm.member_id = m.id and rm.role = 'leader'))
$$;
-- 이 글을 고치고 지울 수 있나: 쓴 사람 · 전체 인도자 · 그 방의 방 인도자
create or replace function pray__can_edit(m pray_member, p pray_post) returns boolean language sql stable security definer
set search_path = public as $$
  select p.author_id = m.id or m.role = 'leader'
      or (p.room_id is not null and exists (select 1 from pray_room_member rm where rm.room_id = p.room_id and rm.member_id = m.id and rm.role = 'leader'))
$$;
create or replace function pray__room_json(r pray_room, me uuid) returns jsonb language sql stable security definer
set search_path = public as $$
  select jsonb_build_object('id', r.id, 'name', r.name, 'kind', r.kind, 'sort', r.sort,
    'member_count', (select count(*) from pray_room_member rm join pray_member x on x.id = rm.member_id where rm.room_id = r.id and x.active),
    'mine', exists (select 1 from pray_room_member rm where rm.room_id = r.id and rm.member_id = me),
    'my_role', (select role from pray_room_member rm where rm.room_id = r.id and rm.member_id = me))
$$;
create or replace function pray__member_rooms(mid uuid) returns jsonb language sql stable security definer
set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'name', r.name, 'kind', r.kind, 'role', rm.role) order by r.kind, r.sort, r.name), '[]'::jsonb)
  from pray_room_member rm join pray_room r on r.id = rm.room_id where rm.member_id = mid
$$;

-- 글 JSON에 방·공개 범위 추가
create or replace function pray__post_json(p pray_post, me uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', p.id, 'author_id', p.author_id, 'author_name', p.author_name, 'kind', p.kind, 'for_whom', p.for_whom, 'body', p.body,
    'status', p.status, 'answer_note', p.answer_note, 'answered_at', p.answered_at, 'created_at', p.created_at, 'updated_at', p.updated_at,
    'room_id', p.room_id, 'room_name', (select r.name from pray_room r where r.id = p.room_id), 'visibility', p.visibility,
    'mine', p.author_id = me,
    'prayed_total', coalesce((select sum(count) from pray_prayed where post_id = p.id), 0),
    'prayed_people', (select count(*) from pray_prayed where post_id = p.id),
    'my_prayed', coalesce((select count from pray_prayed where post_id = p.id and member_id = me), 0),
    'reactions', coalesce((select jsonb_object_agg(emoji, n) from (select emoji, count(*) n from pray_reaction where post_id = p.id group by emoji) r), '{}'::jsonb),
    'my_reactions', coalesce((select jsonb_agg(emoji) from pray_reaction where post_id = p.id and member_id = me), '[]'::jsonb),
    'comment_count', (select count(*) from pray_comment where post_id = p.id)
  )
$$;
-- 내 정보에 내 방 목록
create or replace function pray__me_json(m pray_member) returns jsonb language sql stable security definer
set search_path = public as $$
  select jsonb_build_object(
    'me', jsonb_build_object('id', m.id, 'name', m.name, 'role', m.role, 'created_at', m.created_at, 'rooms', pray__member_rooms(m.id)),
    'group', pray__group_json(g)
  ) from pray_group g where g.id = m.group_id
$$;

-- ── 방 ─────────────────────────────────────────────────
create or replace function pray_rooms(p_token text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare m pray_member := pray__me(p_token);
begin
  return coalesce((select jsonb_agg(pray__room_json(r, m.id) order by r.kind, r.sort, r.name) from pray_room r where r.group_id = m.group_id), '[]'::jsonb);
end $$;
-- 방 하나 만들기/이름 바꾸기 (전체 인도자)
create or replace function pray_room_save(p_token text, p_id uuid, p_name text, p_kind text) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare m pray_member := pray__me(p_token); nm text := pray__clean(p_name, 30); k text := case when p_kind in ('group', 'cohort') then p_kind else 'custom' end;
begin
  if m.role <> 'leader' then raise exception '전체 인도자만 할 수 있습니다'; end if;
  if length(nm) < 1 then raise exception '방 이름을 적어 주세요'; end if;
  if p_id is null then
    insert into pray_room (group_id, name, kind, sort) values (m.group_id, nm, k, coalesce((select max(sort) + 1 from pray_room where group_id = m.group_id and kind = k), 1))
      on conflict (group_id, name) do nothing;
  else
    update pray_room set name = nm where id = p_id and group_id = m.group_id;
  end if;
  return pray_rooms(p_token);
end $$;
-- 방 여러 개 한 번에: p_fmt 의 # 자리에 1..n (예: '#그룹' → 1그룹…, '#기' → 1기…). 이미 있는 이름은 건너뛴다
create or replace function pray_rooms_bulk(p_token text, p_kind text, p_count int, p_fmt text) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare m pray_member := pray__me(p_token); k text := case when p_kind in ('group', 'cohort') then p_kind else 'custom' end; i int; nm text;
begin
  if m.role <> 'leader' then raise exception '전체 인도자만 할 수 있습니다'; end if;
  if coalesce(p_count, 0) < 1 or p_count > 60 then raise exception '1~60개까지 만들 수 있습니다'; end if;
  if position('#' in coalesce(p_fmt, '')) = 0 then raise exception '이름 틀에 # 을 넣어 주세요 (예: #그룹)'; end if;
  for i in 1..p_count loop
    nm := pray__clean(replace(p_fmt, '#', i::text), 30);
    insert into pray_room (group_id, name, kind, sort) values (m.group_id, nm, k, i) on conflict (group_id, name) do nothing;
  end loop;
  return pray_rooms(p_token);
end $$;
-- 방 지우기: 그 방 글은 공통으로 옮긴다
create or replace function pray_room_delete(p_token text, p_id uuid) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare m pray_member := pray__me(p_token);
begin
  if m.role <> 'leader' then raise exception '전체 인도자만 할 수 있습니다'; end if;
  update pray_post set room_id = null where room_id = p_id and group_id = m.group_id;
  delete from pray_room where id = p_id and group_id = m.group_id;
  return pray_rooms(p_token);
end $$;
-- 방에 넣기/빼기·방 인도자 지정: 전체 인도자는 누구든, 방 인도자는 자기 방에, 본인은 자기 자신(방 인도자 지정은 못 함)
create or replace function pray_room_member_set(p_token text, p_room uuid, p_member uuid, p_on boolean, p_role text) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare m pray_member := pray__me(p_token); r pray_room; target uuid := coalesce(p_member, m.id); rl text := case when p_role = 'leader' then 'leader' else 'member' end;
  room_leader boolean;
begin
  select * into r from pray_room where id = p_room and group_id = m.group_id;
  if r.id is null then raise exception '방을 찾지 못했습니다'; end if;
  if not exists (select 1 from pray_member where id = target and group_id = m.group_id and active) then raise exception '식구를 찾지 못했습니다'; end if;
  room_leader := exists (select 1 from pray_room_member where room_id = r.id and member_id = m.id and role = 'leader');
  if m.role <> 'leader' and not room_leader and target <> m.id then raise exception '인도자만 다른 식구를 넣고 뺄 수 있습니다'; end if;
  if rl = 'leader' and m.role <> 'leader' and not room_leader then raise exception '방 인도자는 인도자만 세울 수 있습니다'; end if;
  if p_on then
    insert into pray_room_member (room_id, member_id, role) values (r.id, target, rl)
      on conflict (room_id, member_id) do update set role = excluded.role;
  else
    delete from pray_room_member where room_id = r.id and member_id = target;
  end if;
  return pray_rooms(p_token);
end $$;
-- 식구 목록에 방 표시
create or replace function pray_members(p_token text) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'name', x.name, 'role', x.role, 'created_at', x.created_at,
      'last_seen_at', x.last_seen_at, 'push', exists (select 1 from pray_push p where p.member_id = x.id), 'rooms', pray__member_rooms(x.id)) order by x.role, x.created_at), '[]'::jsonb)
  from pray_member x where x.group_id = (pray__me(p_token)).group_id and x.active
$$;

-- ── 들어가기: 초대 미리 보기에 방 목록, 들어갈 때 방 고르기 ──────────────
create or replace function pray_group_peek(p_invite text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', g.id, 'name', g.name, 'member_count', (select count(*) from pray_member where group_id = g.id and active),
    'join_open', coalesce((g.settings->>'join_open')::boolean, true),
    'rooms', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'name', r.name, 'kind', r.kind) order by r.kind, r.sort, r.name) from pray_room r where r.group_id = g.id), '[]'::jsonb))
  from pray_group g where g.invite_code = pray__norm(p_invite)
$$;
create or replace function pray_join(p_invite text, p_name text, p_rooms uuid[] default null) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare g pray_group; m pray_member; tok text; who text := pray__clean(p_name, 20);
begin
  select * into g from pray_group where invite_code = pray__norm(p_invite);
  if g.id is null then raise exception '초대 코드를 찾지 못했습니다. 다시 확인해 주세요'; end if;
  if coalesce((g.settings->>'join_open')::boolean, true) = false then raise exception '이 모임은 지금 새 가입을 받지 않습니다. 인도자에게 말씀해 주세요'; end if;
  if length(who) < 1 then raise exception '이름을 적어 주세요'; end if;
  if (select count(*) from pray_member where group_id = g.id and active) >= 2000 then raise exception '모임 인원이 가득 찼습니다'; end if;
  tok := pray__code(12);
  insert into pray_member (group_id, name, role, token_hash) values (g.id, who, 'member', pray__hash(tok)) returning * into m;
  if p_rooms is not null then
    insert into pray_room_member (room_id, member_id) select r.id, m.id from pray_room r where r.group_id = g.id and r.id = any (p_rooms) on conflict do nothing;
  end if;
  return pray__me_json(m) || jsonb_build_object('token', pray__fmt(tok));
end $$;
-- 모임 나가기·식구 빼기에서 방 소속도 지운다
create or replace function pray_leave(p_token text) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare m pray_member := pray__me(p_token);
begin
  if m.role = 'leader'
     and not exists (select 1 from pray_member where group_id = m.group_id and active and role = 'leader' and id <> m.id)
     and exists (select 1 from pray_member where group_id = m.group_id and active and id <> m.id) then
    raise exception '다른 분을 먼저 인도자로 세워 주세요. 인도자가 한 분은 있어야 합니다';
  end if;
  update pray_member set active = false, token_hash = pray__hash(pray__code(12)) where id = m.id;
  delete from pray_push where member_id = m.id;
  delete from pray_room_member where member_id = m.id;
  return jsonb_build_object('ok', true);
end $$;
create or replace function pray_member_remove(p_token text, p_member uuid) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare m pray_member := pray__me(p_token);
begin
  if m.role <> 'leader' then raise exception '전체 인도자만 할 수 있습니다'; end if;
  if p_member = m.id then raise exception '나 자신은 여기서 뺄 수 없습니다. [모임 나가기]를 써 주세요'; end if;
  update pray_member set active = false, token_hash = pray__hash(pray__code(12)) where id = p_member and group_id = m.group_id;
  delete from pray_push where member_id = p_member;
  delete from pray_room_member where member_id = p_member;
  return pray_members(p_token);
end $$;

-- ── 기도제목: 방·공개 범위 ──────────────────────────────
-- 목록. p_scope: 'mine'(내 방들 + 공통, 인도자는 전체) · 'common'(공통만) · 'room'(p_room 방만)
create or replace function pray_feed(p_token text, p_filter text default 'open', p_limit int default 60, p_scope text default 'mine', p_room uuid default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare m pray_member := pray__me(p_token); lim int := least(greatest(coalesce(p_limit, 60), 1), 300);
begin
  return coalesce((
    select jsonb_agg(pray__post_json(p, m.id) order by (p.kind = 'urgent' and p.status = 'open') desc, coalesce(p.answered_at, p.created_at) desc)
    from (
      select * from pray_post p where p.group_id = m.group_id
        and pray__can_see(m, p)
        and case p_scope when 'common' then p.room_id is null when 'room' then p.room_id = p_room else true end
        and case p_filter when 'urgent' then p.kind = 'urgent' and p.status = 'open'
                          when 'answered' then p.status = 'answered'
                          when 'all' then true
                          else p.status = 'open' end
      order by (p.kind = 'urgent' and p.status = 'open') desc, coalesce(p.answered_at, p.created_at) desc
      limit lim
    ) p), '[]'::jsonb);
end $$;
create or replace function pray_post_get(p_token text, p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare m pray_member := pray__me(p_token); p pray_post;
begin
  select * into p from pray_post where id = p_id and group_id = m.group_id;
  if p.id is null then raise exception '글을 찾지 못했습니다 (지워졌거나 다른 모임 글입니다)'; end if;
  if not pray__can_see(m, p) then raise exception '이 글은 볼 수 없습니다 (다른 방 글이거나 공개 범위 밖입니다)'; end if;
  return pray__post_json(p, m.id) || jsonb_build_object(
    'comments', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'author_id', c.author_id, 'author_name', c.author_name, 'body', c.body,
        'created_at', c.created_at, 'mine', c.author_id = m.id) order by c.created_at) from pray_comment c where c.post_id = p.id), '[]'::jsonb),
    'prayed_names', coalesce((select jsonb_agg(x.name order by pp.last_at desc) from pray_prayed pp join pray_member x on x.id = pp.member_id where pp.post_id = p.id), '[]'::jsonb),
    'reaction_names', coalesce((select jsonb_object_agg(emoji, names) from (
        select r.emoji, jsonb_agg(x.name order by r.created_at) names from pray_reaction r join pray_member x on x.id = r.member_id where r.post_id = p.id group by r.emoji) q), '{}'::jsonb),
    'can_edit', pray__can_edit(m, p)
  );
end $$;
-- 올리기·고치기: 방(p_room, null = 공통)과 공개 범위(p_visibility)
create or replace function pray_post_save(p_token text, p_id uuid, p_kind text, p_for text, p_body text, p_room uuid default null, p_visibility text default 'room') returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare m pray_member := pray__me(p_token); p pray_post; body text := pray__clean_body(p_body, 2000); fw text := pray__clean(p_for, 60);
  kind text := case when p_kind = 'urgent' then 'urgent' else 'normal' end;
  vis text := case when p_visibility in ('leaders', 'private') then p_visibility else 'room' end;
begin
  if length(body) < 1 then raise exception '기도 내용을 적어 주세요'; end if;
  if p_room is not null then
    if not exists (select 1 from pray_room r where r.id = p_room and r.group_id = m.group_id) then raise exception '방을 찾지 못했습니다'; end if;
    if m.role <> 'leader' and not exists (select 1 from pray_room_member rm where rm.room_id = p_room and rm.member_id = m.id) then raise exception '내가 속한 방에만 올릴 수 있습니다'; end if;
  end if;
  if p_id is null then
    insert into pray_post (group_id, author_id, author_name, kind, for_whom, body, room_id, visibility)
      values (m.group_id, m.id, m.name, kind, fw, body, p_room, vis) returning * into p;
  else
    select * into p from pray_post where id = p_id and group_id = m.group_id;
    if p.id is null then raise exception '글을 찾지 못했습니다'; end if;
    if not pray__can_edit(m, p) then raise exception '쓴 분이나 인도자만 고칠 수 있습니다'; end if;
    update pray_post set kind = pray_post_save.kind, for_whom = fw, body = pray_post_save.body, room_id = p_room, visibility = vis, updated_at = now() where id = p.id returning * into p;
  end if;
  return pray_post_get(p_token, p.id);
end $$;
create or replace function pray_post_status(p_token text, p_id uuid, p_status text, p_note text) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare m pray_member := pray__me(p_token); p pray_post;
begin
  if p_status not in ('open', 'answered', 'closed') then raise exception '상태가 잘못되었습니다'; end if;
  select * into p from pray_post where id = p_id and group_id = m.group_id;
  if p.id is null then raise exception '글을 찾지 못했습니다'; end if;
  if not pray__can_edit(m, p) then raise exception '쓴 분이나 인도자만 바꿀 수 있습니다'; end if;
  update pray_post set status = p_status, answer_note = case when p_status = 'answered' then pray__clean_body(p_note, 1000) else answer_note end,
    answered_at = case when p_status = 'answered' then now() else null end, updated_at = now() where id = p.id;
  return pray_post_get(p_token, p.id);
end $$;
create or replace function pray_post_delete(p_token text, p_id uuid) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare m pray_member := pray__me(p_token); p pray_post;
begin
  select * into p from pray_post where id = p_id and group_id = m.group_id;
  if p.id is null then return jsonb_build_object('ok', true); end if;
  if not pray__can_edit(m, p) then raise exception '쓴 분이나 인도자만 지울 수 있습니다'; end if;
  delete from pray_post where id = p.id;
  return jsonb_build_object('ok', true);
end $$;
-- 반응·기도했어요·댓글은 볼 수 있는 글에만
create or replace function pray_react(p_token text, p_post uuid, p_emoji text) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare m pray_member := pray__me(p_token); p pray_post;
begin
  if p_emoji not in ('🙏', '❤️', '😢', '🙌', '💪') then raise exception '쓸 수 없는 이모지입니다'; end if;
  select * into p from pray_post where id = p_post and group_id = m.group_id;
  if p.id is null or not pray__can_see(m, p) then raise exception '글을 찾지 못했습니다'; end if;
  if exists (select 1 from pray_reaction where post_id = p.id and member_id = m.id and emoji = p_emoji) then
    delete from pray_reaction where post_id = p.id and member_id = m.id and emoji = p_emoji;
  else
    insert into pray_reaction (post_id, member_id, emoji) values (p.id, m.id, p_emoji);
  end if;
  return pray_post_get(p_token, p.id);
end $$;
create or replace function pray_prayed(p_token text, p_post uuid) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare m pray_member := pray__me(p_token); p pray_post;
begin
  select * into p from pray_post where id = p_post and group_id = m.group_id;
  if p.id is null or not pray__can_see(m, p) then raise exception '글을 찾지 못했습니다'; end if;
  insert into pray_prayed (post_id, member_id) values (p.id, m.id)
    on conflict (post_id, member_id) do update set count = least(pray_prayed.count + 1, 999), last_at = now();
  return pray_post_get(p_token, p.id);
end $$;
create or replace function pray_comment_add(p_token text, p_post uuid, p_body text) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare m pray_member := pray__me(p_token); p pray_post; body text := pray__clean_body(p_body, 1000); c pray_comment;
begin
  if length(body) < 1 then raise exception '댓글을 적어 주세요'; end if;
  select * into p from pray_post where id = p_post and group_id = m.group_id;
  if p.id is null or not pray__can_see(m, p) then raise exception '글을 찾지 못했습니다'; end if;
  insert into pray_comment (post_id, author_id, author_name, body) values (p.id, m.id, m.name, body) returning * into c;
  return pray_post_get(p_token, p.id) || jsonb_build_object('comment_id', c.id);
end $$;

revoke all on function pray__can_see(pray_member, pray_post), pray__can_edit(pray_member, pray_post), pray__room_json(pray_room, uuid), pray__member_rooms(uuid) from public, anon, authenticated;
grant execute on function pray_rooms(text), pray_room_save(text, uuid, text, text), pray_rooms_bulk(text, text, int, text), pray_room_delete(text, uuid),
  pray_room_member_set(text, uuid, uuid, boolean, text), pray_group_peek(text), pray_join(text, text, uuid[]),
  pray_feed(text, text, int, text, uuid), pray_post_save(text, uuid, text, text, text, uuid, text) to anon, authenticated;
-- 예전 서명은 지운다 (PostgREST가 헷갈리지 않게)
drop function if exists pray_join(text, text);
drop function if exists pray_feed(text, text, int);
drop function if exists pray_post_save(text, uuid, text, text, text);
