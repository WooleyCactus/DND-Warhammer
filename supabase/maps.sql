-- Rogue Trader Manifest: shared battle map (one live map per party).
-- Same model as characters: the table is closed, all access goes through these functions.
-- The party code lets anyone view the map and move player tokens.
-- The GM PIN (set by the first person to open GM mode) is needed to change the map or NPCs.
create table if not exists public.maps (
  party text primary key,
  meta jsonb not null default '{}'::jsonb,     -- grid, size, initiative, settings
  tokens jsonb not null default '{}'::jsonb,   -- { token_id: token }
  gm_hash text,
  updated_at timestamptz not null default now()
);
alter table public.maps enable row level security;
revoke all on public.maps from anon, authenticated;

create or replace function public.map_pin_ok(p_party text, p_pin text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.maps m where m.party = upper(p_party) and m.gm_hash is not null
    and m.gm_hash = encode(sha256(convert_to(upper(p_party) || ':' || coalesce(p_pin, ''), 'UTF8')), 'hex'));
$$;

-- Read the map. Hidden tokens are only returned with the right GM PIN.
create or replace function public.map_get(p_party text, p_pin text default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare r public.maps; gm boolean;
begin
  select * into r from public.maps where party = upper(p_party);
  if not found then return jsonb_build_object('meta', '{}'::jsonb, 'tokens', '{}'::jsonb, 'has_pin', false, 'gm', false); end if;
  gm := public.map_pin_ok(p_party, p_pin);
  return jsonb_build_object(
    'meta', r.meta,
    'tokens', case when gm then r.tokens else coalesce((select jsonb_object_agg(k, v) from jsonb_each(r.tokens) t(k, v)
                where not coalesce((v->>'hidden')::boolean, false)), '{}'::jsonb) end,
    'has_pin', r.gm_hash is not null, 'gm', gm, 'updated_at', r.updated_at);
end $$;

-- Become GM: sets the PIN if none exists yet, otherwise checks it.
create or replace function public.map_claim_gm(p_party text, p_pin text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if p_party is null or length(p_party) < 8 then raise exception 'invalid party code'; end if;
  if p_pin is null or length(p_pin) < 4 or length(p_pin) > 64 then raise exception 'PIN must be 4 or more characters'; end if;
  insert into public.maps (party) values (upper(p_party)) on conflict (party) do nothing;
  update public.maps set gm_hash = encode(sha256(convert_to(upper(p_party) || ':' || p_pin, 'UTF8')), 'hex')
    where party = upper(p_party) and gm_hash is null;
  return public.map_pin_ok(p_party, p_pin);
end $$;

create or replace function public.map_save_meta(p_party text, p_pin text, p_meta jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.map_pin_ok(p_party, p_pin) then raise exception 'GM PIN required'; end if;
  if octet_length(p_meta::text) > 150000 then raise exception 'map too large'; end if;
  update public.maps set meta = p_meta, updated_at = now() where party = upper(p_party);
end $$;

-- GM: add/replace any token, or wipe all tokens (p_clear).
create or replace function public.map_token_put(p_party text, p_pin text, p_token jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.map_pin_ok(p_party, p_pin) then raise exception 'GM PIN required'; end if;
  if p_token->>'id' is null or length(p_token->>'id') > 64 or octet_length(p_token::text) > 4000 then raise exception 'invalid token'; end if;
  update public.maps set tokens = tokens || jsonb_build_object(p_token->>'id', p_token), updated_at = now()
    where party = upper(p_party) and (tokens ? (p_token->>'id') or (select count(*) from jsonb_object_keys(tokens)) < 200);
end $$;

create or replace function public.map_token_del(p_party text, p_pin text, p_id text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.map_pin_ok(p_party, p_pin) then raise exception 'GM PIN required'; end if;
  if p_id = '*' then update public.maps set tokens = '{}'::jsonb, updated_at = now() where party = upper(p_party);
  else update public.maps set tokens = tokens - p_id, updated_at = now() where party = upper(p_party); end if;
end $$;

-- Player: place or update their own character token (kind is forced to 'pc'; can't touch NPCs).
create or replace function public.map_pc_put(p_party text, p_token jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare cur jsonb; t jsonb;
begin
  if p_party is null or length(p_party) < 8 then raise exception 'invalid party code'; end if;
  if p_token->>'id' is null or length(p_token->>'id') > 64 or octet_length(p_token::text) > 4000 then raise exception 'invalid token'; end if;
  insert into public.maps (party) values (upper(p_party)) on conflict (party) do nothing;
  select tokens->(p_token->>'id') into cur from public.maps where party = upper(p_party);
  if cur is not null and cur->>'kind' <> 'pc' then raise exception 'not a player token'; end if;
  t := (p_token - 'hidden' - 'free') || jsonb_build_object('kind', 'pc');
  update public.maps set tokens = tokens || jsonb_build_object(t->>'id', t), updated_at = now()
    where party = upper(p_party) and (tokens ? (t->>'id') or (select count(*) from jsonb_object_keys(tokens)) < 200);
end $$;

-- Anyone: move a player token or a token the GM marked "players can move".
create or replace function public.map_move(p_party text, p_id text, p_x int, p_y int)
returns void language plpgsql security definer set search_path = public as $$
declare cur jsonb;
begin
  select tokens->p_id into cur from public.maps where party = upper(p_party);
  if cur is null then raise exception 'no such token'; end if;
  if cur->>'kind' <> 'pc' and not coalesce((cur->>'free')::boolean, false) then raise exception 'only the GM can move that'; end if;
  if p_x < 0 or p_y < 0 or p_x > 200 or p_y > 200 then raise exception 'off the map'; end if;
  update public.maps set tokens = jsonb_set(tokens, array[p_id], cur || jsonb_build_object('x', p_x, 'y', p_y)), updated_at = now()
    where party = upper(p_party);
end $$;

revoke execute on function public.map_pin_ok(text, text), public.map_get(text, text), public.map_claim_gm(text, text),
  public.map_save_meta(text, text, jsonb), public.map_token_put(text, text, jsonb), public.map_token_del(text, text, text),
  public.map_pc_put(text, jsonb), public.map_move(text, text, int, int) from public, anon, authenticated;
grant execute on function public.map_get(text, text), public.map_claim_gm(text, text),
  public.map_save_meta(text, text, jsonb), public.map_token_put(text, text, jsonb), public.map_token_del(text, text, text),
  public.map_pc_put(text, jsonb), public.map_move(text, text, int, int) to anon, authenticated;
