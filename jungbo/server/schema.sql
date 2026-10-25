-- 중보기도 나눔터 — 데이터베이스 (Supabase 프로젝트 korea-now, 다락방 나눔터와 같은 프로젝트)
-- 로그인(Supabase Auth)을 쓰지 않는다. 가입하면 받는 '열쇠 코드'(12자)가 곧 신분이고,
-- 모든 읽기·쓰기는 열쇠 코드를 받는 RPC 함수(security definer)로만 한다. 표에는 직접 손대지 못한다(RLS, 정책 없음).
-- 열쇠 코드는 해시만 저장한다.

create table if not exists pray_group (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create table if not exists pray_member (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references pray_group(id) on delete cascade,
  name text not null,
  role text not null default 'member' check (role in ('leader', 'member')),
  token_hash text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz
);
create index if not exists pray_member_group on pray_member(group_id);
create table if not exists pray_post (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references pray_group(id) on delete cascade,
  author_id uuid not null references pray_member(id) on delete cascade,
  author_name text not null,
  kind text not null default 'normal' check (kind in ('urgent', 'normal')),
  for_whom text not null default '',
  body text not null,
  status text not null default 'open' check (status in ('open', 'answered', 'closed')),
  answer_note text not null default '',
  answered_at timestamptz,
  notified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists pray_post_group on pray_post(group_id, created_at desc);
create table if not exists pray_reaction (
  post_id uuid not null references pray_post(id) on delete cascade,
  member_id uuid not null references pray_member(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  primary key (post_id, member_id, emoji)
);
create table if not exists pray_prayed (
  post_id uuid not null references pray_post(id) on delete cascade,
  member_id uuid not null references pray_member(id) on delete cascade,
  count int not null default 1,
  last_at timestamptz not null default now(),
  primary key (post_id, member_id)
);
create table if not exists pray_comment (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references pray_post(id) on delete cascade,
  author_id uuid not null references pray_member(id) on delete cascade,
  author_name text not null,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists pray_comment_post on pray_comment(post_id, created_at);
create table if not exists pray_push (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references pray_member(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists pray_push_member on pray_push(member_id);

alter table pray_group enable row level security;
alter table pray_member enable row level security;
alter table pray_post enable row level security;
alter table pray_reaction enable row level security;
alter table pray_prayed enable row level security;
alter table pray_comment enable row level security;
alter table pray_push enable row level security;
revoke all on pray_group, pray_member, pray_post, pray_reaction, pray_prayed, pray_comment, pray_push from anon, authenticated;

-- ── 도우미 ─────────────────────────────────────────────
-- 코드 정리: 대문자, 영문·숫자만 (사용자가 소문자나 하이픈을 섞어 넣어도 된다)
create or replace function pray__norm(p text) returns text language sql immutable as $$
  select upper(regexp_replace(coalesce(p, ''), '[^A-Za-z0-9]', '', 'g'))
$$;
create or replace function pray__hash(p_token text) returns text language sql immutable
set search_path = public, extensions as $$
  select encode(extensions.digest('pray:' || pray__norm(p_token), 'sha256'), 'hex')
$$;
-- 헷갈리는 글자(I O L 0 1) 없는 31자
create or replace function pray__code(n int) returns text language plpgsql volatile
set search_path = public, extensions as $$
declare a text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; s text := ''; b bytea := extensions.gen_random_bytes(n); i int;
begin
  for i in 0..n - 1 loop s := s || substr(a, (get_byte(b, i) % length(a)) + 1, 1); end loop;
  return s;
end $$;
create or replace function pray__fmt(p text) returns text language sql immutable as $$
  select substr(p, 1, 4) || '-' || substr(p, 5, 4) || '-' || substr(p, 9)
$$;
-- 열쇠 코드로 나를 찾는다 (없으면 오류)
create or replace function pray__me(p_token text) returns pray_member language plpgsql stable security definer
set search_path = public as $$
declare m pray_member;
begin
  select * into m from pray_member where token_hash = pray__hash(p_token) and active limit 1;
  if m.id is null then raise exception '열쇠 코드가 맞지 않습니다' using errcode = 'P0001'; end if;
  return m;
end $$;
create or replace function pray__clean(p text, n int) returns text language sql immutable as $$
  select left(regexp_replace(trim(coalesce(p, '')), '\s+', ' ', 'g'), n)
$$;
create or replace function pray__clean_body(p text, n int) returns text language sql immutable as $$
  select left(regexp_replace(trim(coalesce(p, '')), '\n{3,}', E'\n\n', 'g'), n)
$$;

-- 모임 요약 (내 정보 응답에 붙인다)
create or replace function pray__group_json(g pray_group) returns jsonb language sql stable security definer
set search_path = public as $$
  select jsonb_build_object(
    'id', g.id, 'name', g.name, 'invite_code', g.invite_code, 'settings', g.settings, 'created_at', g.created_at,
    'member_count', (select count(*) from pray_member where group_id = g.id and active),
    'push_count', (select count(distinct p.member_id) from pray_push p join pray_member m on m.id = p.member_id where m.group_id = g.id and m.active)
  )
$$;
create or replace function pray__me_json(m pray_member) returns jsonb language sql stable security definer
set search_path = public as $$
  select jsonb_build_object(
    'me', jsonb_build_object('id', m.id, 'name', m.name, 'role', m.role, 'created_at', m.created_at),
    'group', pray__group_json(g)
  ) from pray_group g where g.id = m.group_id
$$;

-- ── 들어가기 ───────────────────────────────────────────
-- 새 모임 만들기 — 만든 사람이 인도자가 된다. 열쇠 코드는 이때 한 번 돌려준다.
create or replace function pray_create_group(p_name text, p_leader_name text) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare g pray_group; m pray_member; tok text; code text; nm text := pray__clean(p_name, 40); who text := pray__clean(p_leader_name, 20);
begin
  if length(nm) < 1 then raise exception '모임 이름을 적어 주세요'; end if;
  if length(who) < 1 then raise exception '내 이름을 적어 주세요'; end if;
  loop code := pray__code(8); exit when not exists (select 1 from pray_group where invite_code = code); end loop;
  insert into pray_group (name, invite_code) values (nm, code) returning * into g;
  tok := pray__code(12);
  insert into pray_member (group_id, name, role, token_hash) values (g.id, who, 'leader', pray__hash(tok)) returning * into m;
  return pray__me_json(m) || jsonb_build_object('token', pray__fmt(tok));
end $$;
-- 초대 코드로 모임 이름 미리 보기 (로그인 전)
create or replace function pray_group_peek(p_invite text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', g.id, 'name', g.name, 'member_count', (select count(*) from pray_member where group_id = g.id and active),
    'join_open', coalesce((g.settings->>'join_open')::boolean, true))
  from pray_group g where g.invite_code = pray__norm(p_invite)
$$;
-- 초대 코드 + 이름으로 들어가기
create or replace function pray_join(p_invite text, p_name text) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare g pray_group; m pray_member; tok text; who text := pray__clean(p_name, 20);
begin
  select * into g from pray_group where invite_code = pray__norm(p_invite);
  if g.id is null then raise exception '초대 코드를 찾지 못했습니다. 다시 확인해 주세요'; end if;
  if coalesce((g.settings->>'join_open')::boolean, true) = false then raise exception '이 모임은 지금 새 가입을 받지 않습니다. 인도자에게 말씀해 주세요'; end if;
  if length(who) < 1 then raise exception '이름을 적어 주세요'; end if;
  if (select count(*) from pray_member where group_id = g.id and active) >= 500 then raise exception '모임 인원이 가득 찼습니다'; end if;
  tok := pray__code(12);
  insert into pray_member (group_id, name, role, token_hash) values (g.id, who, 'member', pray__hash(tok)) returning * into m;
  return pray__me_json(m) || jsonb_build_object('token', pray__fmt(tok));
end $$;
-- 내 정보 (열쇠 코드로 들어가기 · 화면을 열 때마다)
create or replace function pray_me(p_token text) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare m pray_member := pray__me(p_token);
begin
  update pray_member set last_seen_at = now() where id = m.id;
  return pray__me_json(m);
end $$;
-- 열쇠 코드 새로 받기 (예전 코드는 못 쓰게 된다)
create or replace function pray_new_key(p_token text) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare m pray_member := pray__me(p_token); tok text := pray__code(12);
begin
  update pray_member set token_hash = pray__hash(tok) where id = m.id;
  return jsonb_build_object('token', pray__fmt(tok));
end $$;
-- 내 이름 바꾸기 (올린 글·댓글의 이름도 함께)
create or replace function pray_member_rename(p_token text, p_name text) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare m pray_member := pray__me(p_token); who text := pray__clean(p_name, 20);
begin
  if length(who) < 1 then raise exception '이름을 적어 주세요'; end if;
  update pray_member set name = who where id = m.id;
  update pray_post set author_name = who where author_id = m.id;
  update pray_comment set author_name = who where author_id = m.id;
  return pray_me(p_token);
end $$;
-- 모임 나가기 (혼자 남은 인도자가 다른 사람을 두고는 못 나간다)
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
  return jsonb_build_object('ok', true);
end $$;

-- ── 모임 관리 (인도자) ───────────────────────────────────
create or replace function pray_members(p_token text) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'name', x.name, 'role', x.role, 'created_at', x.created_at,
      'last_seen_at', x.last_seen_at, 'push', exists (select 1 from pray_push p where p.member_id = x.id)) order by x.role, x.created_at), '[]'::jsonb)
  from pray_member x where x.group_id = (pray__me(p_token)).group_id and x.active
$$;
create or replace function pray_member_remove(p_token text, p_member uuid) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare m pray_member := pray__me(p_token);
begin
  if m.role <> 'leader' then raise exception '인도자만 할 수 있습니다'; end if;
  if p_member = m.id then raise exception '나 자신은 여기서 뺄 수 없습니다. [모임 나가기]를 써 주세요'; end if;
  update pray_member set active = false, token_hash = pray__hash(pray__code(12)) where id = p_member and group_id = m.group_id;
  delete from pray_push where member_id = p_member;
  return pray_members(p_token);
end $$;
create or replace function pray_member_role(p_token text, p_member uuid, p_role text) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare m pray_member := pray__me(p_token);
begin
  if m.role <> 'leader' then raise exception '인도자만 할 수 있습니다'; end if;
  if p_role not in ('leader', 'member') then raise exception '역할이 잘못되었습니다'; end if;
  if p_member = m.id and p_role = 'member'
     and not exists (select 1 from pray_member where group_id = m.group_id and active and role = 'leader' and id <> m.id) then
    raise exception '인도자가 한 분은 있어야 합니다';
  end if;
  update pray_member set role = p_role where id = p_member and group_id = m.group_id and active;
  return pray_members(p_token);
end $$;
create or replace function pray_group_update(p_token text, p_name text, p_settings jsonb) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare m pray_member := pray__me(p_token); nm text := pray__clean(p_name, 40); g pray_group;
begin
  if m.role <> 'leader' then raise exception '인도자만 할 수 있습니다'; end if;
  select * into g from pray_group where id = m.group_id;
  if length(nm) >= 1 then g.name := nm; end if;
  if p_settings is not null then
    g.settings := g.settings || jsonb_strip_nulls(jsonb_build_object(
      'join_open', case when jsonb_typeof(p_settings->'join_open') = 'boolean' then p_settings->'join_open' end));
  end if;
  update pray_group set name = g.name, settings = g.settings where id = g.id;
  return pray__me_json((select x from pray_member x where x.id = m.id));
end $$;
create or replace function pray_invite_new(p_token text) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare m pray_member := pray__me(p_token); code text;
begin
  if m.role <> 'leader' then raise exception '인도자만 할 수 있습니다'; end if;
  loop code := pray__code(8); exit when not exists (select 1 from pray_group where invite_code = code); end loop;
  update pray_group set invite_code = code where id = m.group_id;
  return pray__me_json(m);
end $$;

-- ── 기도제목 ───────────────────────────────────────────
create or replace function pray__post_json(p pray_post, me uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', p.id, 'author_id', p.author_id, 'author_name', p.author_name, 'kind', p.kind, 'for_whom', p.for_whom, 'body', p.body,
    'status', p.status, 'answer_note', p.answer_note, 'answered_at', p.answered_at, 'created_at', p.created_at, 'updated_at', p.updated_at,
    'mine', p.author_id = me,
    'prayed_total', coalesce((select sum(count) from pray_prayed where post_id = p.id), 0),
    'prayed_people', (select count(*) from pray_prayed where post_id = p.id),
    'my_prayed', coalesce((select count from pray_prayed where post_id = p.id and member_id = me), 0),
    'reactions', coalesce((select jsonb_object_agg(emoji, n) from (select emoji, count(*) n from pray_reaction where post_id = p.id group by emoji) r), '{}'::jsonb),
    'my_reactions', coalesce((select jsonb_agg(emoji) from pray_reaction where post_id = p.id and member_id = me), '[]'::jsonb),
    'comment_count', (select count(*) from pray_comment where post_id = p.id)
  )
$$;
-- 목록: open(기도 중, 긴급 먼저) · urgent · answered · all
create or replace function pray_feed(p_token text, p_filter text default 'open', p_limit int default 60) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare m pray_member := pray__me(p_token); lim int := least(greatest(coalesce(p_limit, 60), 1), 200);
begin
  return coalesce((
    select jsonb_agg(pray__post_json(p, m.id) order by (p.kind = 'urgent' and p.status = 'open') desc, coalesce(p.answered_at, p.created_at) desc)
    from (
      select * from pray_post p where p.group_id = m.group_id
        and case p_filter when 'urgent' then p.kind = 'urgent' and p.status = 'open'
                          when 'answered' then p.status = 'answered'
                          when 'all' then true
                          else p.status = 'open' end
      order by (p.kind = 'urgent' and p.status = 'open') desc, coalesce(p.answered_at, p.created_at) desc
      limit lim
    ) p), '[]'::jsonb);
end $$;
-- 글 한 개 (댓글 · 기도한 분들 · 이모지 누른 분들)
create or replace function pray_post_get(p_token text, p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare m pray_member := pray__me(p_token); p pray_post;
begin
  select * into p from pray_post where id = p_id and group_id = m.group_id;
  if p.id is null then raise exception '글을 찾지 못했습니다 (지워졌거나 다른 모임 글입니다)'; end if;
  return pray__post_json(p, m.id) || jsonb_build_object(
    'comments', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'author_id', c.author_id, 'author_name', c.author_name, 'body', c.body,
        'created_at', c.created_at, 'mine', c.author_id = m.id) order by c.created_at) from pray_comment c where c.post_id = p.id), '[]'::jsonb),
    'prayed_names', coalesce((select jsonb_agg(x.name order by pp.last_at desc) from pray_prayed pp join pray_member x on x.id = pp.member_id where pp.post_id = p.id), '[]'::jsonb),
    'reaction_names', coalesce((select jsonb_object_agg(emoji, names) from (
        select r.emoji, jsonb_agg(x.name order by r.created_at) names from pray_reaction r join pray_member x on x.id = r.member_id where r.post_id = p.id group by r.emoji) q), '{}'::jsonb),
    'can_edit', (p.author_id = m.id or m.role = 'leader')
  );
end $$;
-- 올리기 · 고치기 (고치기는 쓴 사람이나 인도자만)
create or replace function pray_post_save(p_token text, p_id uuid, p_kind text, p_for text, p_body text) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare m pray_member := pray__me(p_token); p pray_post; body text := pray__clean_body(p_body, 2000); fw text := pray__clean(p_for, 60);
  kind text := case when p_kind = 'urgent' then 'urgent' else 'normal' end;
begin
  if length(body) < 1 then raise exception '기도 내용을 적어 주세요'; end if;
  if p_id is null then
    insert into pray_post (group_id, author_id, author_name, kind, for_whom, body) values (m.group_id, m.id, m.name, kind, fw, body) returning * into p;
  else
    select * into p from pray_post where id = p_id and group_id = m.group_id;
    if p.id is null then raise exception '글을 찾지 못했습니다'; end if;
    if p.author_id <> m.id and m.role <> 'leader' then raise exception '쓴 분이나 인도자만 고칠 수 있습니다'; end if;
    update pray_post set kind = pray_post_save.kind, for_whom = fw, body = pray_post_save.body, updated_at = now() where id = p.id returning * into p;
  end if;
  return pray_post_get(p_token, p.id);
end $$;
-- 응답받았어요 · 다시 기도 중으로 · 마침
create or replace function pray_post_status(p_token text, p_id uuid, p_status text, p_note text) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare m pray_member := pray__me(p_token); p pray_post;
begin
  if p_status not in ('open', 'answered', 'closed') then raise exception '상태가 잘못되었습니다'; end if;
  select * into p from pray_post where id = p_id and group_id = m.group_id;
  if p.id is null then raise exception '글을 찾지 못했습니다'; end if;
  if p.author_id <> m.id and m.role <> 'leader' then raise exception '쓴 분이나 인도자만 바꿀 수 있습니다'; end if;
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
  if p.author_id <> m.id and m.role <> 'leader' then raise exception '쓴 분이나 인도자만 지울 수 있습니다'; end if;
  delete from pray_post where id = p.id;
  return jsonb_build_object('ok', true);
end $$;
-- 이모지 누르기 (다시 누르면 취소)
create or replace function pray_react(p_token text, p_post uuid, p_emoji text) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare m pray_member := pray__me(p_token); p pray_post;
begin
  if p_emoji not in ('🙏', '❤️', '😢', '🙌', '💪') then raise exception '쓸 수 없는 이모지입니다'; end if;
  select * into p from pray_post where id = p_post and group_id = m.group_id;
  if p.id is null then raise exception '글을 찾지 못했습니다'; end if;
  if exists (select 1 from pray_reaction where post_id = p.id and member_id = m.id and emoji = p_emoji) then
    delete from pray_reaction where post_id = p.id and member_id = m.id and emoji = p_emoji;
  else
    insert into pray_reaction (post_id, member_id, emoji) values (p.id, m.id, p_emoji);
  end if;
  return pray_post_get(p_token, p.id);
end $$;
-- 기도했어요 (누를 때마다 1씩, 사람 수는 따로)
create or replace function pray_prayed(p_token text, p_post uuid) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare m pray_member := pray__me(p_token); p pray_post;
begin
  select * into p from pray_post where id = p_post and group_id = m.group_id;
  if p.id is null then raise exception '글을 찾지 못했습니다'; end if;
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
  if p.id is null then raise exception '글을 찾지 못했습니다'; end if;
  insert into pray_comment (post_id, author_id, author_name, body) values (p.id, m.id, m.name, body) returning * into c;
  return pray_post_get(p_token, p.id) || jsonb_build_object('comment_id', c.id);
end $$;
create or replace function pray_comment_delete(p_token text, p_id uuid) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare m pray_member := pray__me(p_token); c pray_comment;
begin
  select x.* into c from pray_comment x join pray_post pp on pp.id = x.post_id where x.id = p_id and pp.group_id = m.group_id;
  if c.id is null then raise exception '댓글을 찾지 못했습니다'; end if;
  if c.author_id <> m.id and m.role <> 'leader' then raise exception '쓴 분이나 인도자만 지울 수 있습니다'; end if;
  delete from pray_comment where id = c.id;
  return pray_post_get(p_token, c.post_id);
end $$;

-- ── 휴대전화 알림 (웹 푸시 구독) ───────────────────────────
create or replace function pray_push_save(p_token text, p_endpoint text, p_p256dh text, p_auth text, p_ua text) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare m pray_member := pray__me(p_token);
begin
  if coalesce(p_endpoint, '') = '' or coalesce(p_p256dh, '') = '' or coalesce(p_auth, '') = '' then raise exception '구독 정보가 비었습니다'; end if;
  insert into pray_push (member_id, endpoint, p256dh, auth, user_agent) values (m.id, p_endpoint, p_p256dh, p_auth, left(p_ua, 200))
    on conflict (endpoint) do update set member_id = m.id, p256dh = excluded.p256dh, auth = excluded.auth, user_agent = excluded.user_agent, created_at = now();
  return jsonb_build_object('ok', true);
end $$;
create or replace function pray_push_delete(p_token text, p_endpoint text) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare m pray_member := pray__me(p_token);
begin
  delete from pray_push where member_id = m.id and endpoint = p_endpoint;
  return jsonb_build_object('ok', true);
end $$;

-- 화면(anon 키)이 부를 수 있는 함수만 열어 둔다. 도우미(pray__*)는 막는다.
revoke all on function pray__norm(text), pray__hash(text), pray__code(int), pray__fmt(text), pray__me(text), pray__clean(text, int), pray__clean_body(text, int),
  pray__group_json(pray_group), pray__me_json(pray_member), pray__post_json(pray_post, uuid) from public, anon, authenticated;
grant execute on function pray_create_group(text, text), pray_group_peek(text), pray_join(text, text), pray_me(text), pray_new_key(text),
  pray_member_rename(text, text), pray_leave(text), pray_members(text), pray_member_remove(text, uuid), pray_member_role(text, uuid, text),
  pray_group_update(text, text, jsonb), pray_invite_new(text), pray_feed(text, text, int), pray_post_get(text, uuid),
  pray_post_save(text, uuid, text, text, text), pray_post_status(text, uuid, text, text), pray_post_delete(text, uuid), pray_react(text, uuid, text),
  pray_prayed(text, uuid), pray_comment_add(text, uuid, text), pray_comment_delete(text, uuid), pray_push_save(text, text, text, text, text),
  pray_push_delete(text, text) to anon, authenticated;
