-- Rogue Trader Manifest: GM screen storage, private polls, and the battle-map reveal switch.
-- The GM PIN is the one set on the battle map (public.maps.gm_hash, checked by map_pin_ok).

-- Battle map: while meta.live is false, players get no terrain and no NPC tokens (only player tokens + initiative).
create or replace function public.map_get(p_party text, p_pin text default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare r public.maps; gm boolean; hidden boolean;
begin
  select * into r from public.maps where party = upper(p_party);
  if not found then return jsonb_build_object('meta', '{}'::jsonb, 'tokens', '{}'::jsonb, 'has_pin', false, 'gm', false); end if;
  gm := public.map_pin_ok(p_party, p_pin);
  hidden := not gm and coalesce((r.meta->>'live')::boolean, true) = false;
  return jsonb_build_object(
    'meta', case when hidden then jsonb_build_object('live', false, 'init', coalesce(r.meta->'init', '{}'::jsonb)) else r.meta end,
    'tokens', case when gm then r.tokens else coalesce((select jsonb_object_agg(k, v) from jsonb_each(r.tokens) t(k, v)
                where not coalesce((v->>'hidden')::boolean, false) and (not hidden or v->>'kind' = 'pc')), '{}'::jsonb) end,
    'has_pin', r.gm_hash is not null, 'gm', gm, 'updated_at', r.updated_at);
end $$;

-- GM screen: story, NPCs, factions, notes. Only readable and writable with the GM PIN.
create table if not exists public.gm_data (
  party text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.gm_data enable row level security;

create or replace function public.gm_get(p_party text, p_pin text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.map_pin_ok(p_party, p_pin) then raise exception 'GM PIN required'; end if;
  return coalesce((select jsonb_build_object('data', data, 'updated_at', updated_at) from public.gm_data where party = upper(p_party)),
                  jsonb_build_object('data', '{}'::jsonb, 'updated_at', null));
end $$;

create or replace function public.gm_save(p_party text, p_pin text, p_data jsonb)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare t timestamptz := now();
begin
  if not public.map_pin_ok(p_party, p_pin) then raise exception 'GM PIN required'; end if;
  if octet_length(p_data::text) > 400000 then raise exception 'GM notes too large'; end if;
  insert into public.gm_data (party, data, updated_at) values (upper(p_party), p_data, t)
  on conflict (party) do update set data = excluded.data, updated_at = t;
  return t;
end $$;

-- Polls (removing a poll archives it): the GM sends a question to one or more characters; each player answers their own.
create table if not exists public.polls (
  id text primary key,
  party text not null,
  char_id text not null,
  data jsonb not null,
  answer jsonb,
  created_at timestamptz not null default now(),
  answered_at timestamptz,
  archived boolean not null default false
);
create index if not exists polls_party_idx on public.polls (party, char_id);
alter table public.polls enable row level security;

create or replace function public.poll_send(p_party text, p_pin text, p_group text, p_chars text[], p_data jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare c text;
begin
  if not public.map_pin_ok(p_party, p_pin) then raise exception 'GM PIN required'; end if;
  if octet_length(p_data::text) > 8000 then raise exception 'poll too large'; end if;
  if (select count(*) from public.polls where party = upper(p_party) and not archived) > 500 then raise exception 'too many polls; delete some old ones'; end if;
  foreach c in array p_chars loop
    insert into public.polls (id, party, char_id, data) values (left(p_group, 40) || ':' || left(c, 64), upper(p_party), c, p_data)
    on conflict (id) do nothing;
  end loop;
end $$;

create or replace function public.poll_list(p_party text, p_pin text)
returns setof public.polls language plpgsql stable security definer set search_path = public as $$
begin
  if not public.map_pin_ok(p_party, p_pin) then raise exception 'GM PIN required'; end if;
  return query select * from public.polls where party = upper(p_party) and not archived order by created_at desc;
end $$;

-- A player's unanswered polls (needs the party code and their character's id).
create or replace function public.poll_open(p_party text, p_char text)
returns table (id text, data jsonb, created_at timestamptz) language sql stable security definer set search_path = public as $$
  select id, data, created_at from public.polls where party = upper(p_party) and char_id = p_char and answer is null and not archived order by created_at;
$$;

create or replace function public.poll_answer(p_party text, p_id text, p_char text, p_answer jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if octet_length(p_answer::text) > 4000 then raise exception 'answer too long'; end if;
  update public.polls set answer = p_answer, answered_at = now()
    where id = p_id and party = upper(p_party) and char_id = p_char and answer is null;
  if not found then raise exception 'poll not found or already answered'; end if;
end $$;

create or replace function public.poll_delete(p_party text, p_pin text, p_group text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.map_pin_ok(p_party, p_pin) then raise exception 'GM PIN required'; end if;
  update public.polls set archived = true where party = upper(p_party) and split_part(id, ':', 1) = p_group;
end $$;

-- Both tables have row-level security on and no policies, so they are closed to direct access;
-- everything goes through the security-definer functions above (callable by anon by default).
