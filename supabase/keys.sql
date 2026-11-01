-- Rogue Trader Manifest: player PINs.
-- A player claims their character with a PIN; their device remembers it. Once claimed, only that PIN
-- or the GM PIN can change the character, and only that PIN can read or answer the character's polls.
-- The PIN travels inside the saved data as "_auth" (stripped before storing) so party_save keeps its signature.
create table if not exists public.char_keys (
  party text not null,
  char_id text not null,
  pin_hash text,
  updated_at timestamptz not null default now(),
  primary key (party, char_id)
);
alter table public.char_keys enable row level security;   -- no policies: closed to direct access

create or replace function public.char_hash(p_party text, p_char text, p_pin text)
returns text language sql immutable as $$
  select encode(sha256(convert_to(upper(p_party) || ':' || p_char || ':' || coalesce(p_pin, ''), 'UTF8')), 'hex');
$$;

create or replace function public.char_claimed(p_party text, p_char text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.char_keys where party = upper(p_party) and char_id = p_char and pin_hash is not null);
$$;

create or replace function public.char_pin_ok(p_party text, p_char text, p_pin text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.char_keys where party = upper(p_party) and char_id = p_char
    and pin_hash is not null and pin_hash = public.char_hash(p_party, p_char, p_pin));
$$;

-- Set the PIN if the character has none yet, otherwise check it.
create or replace function public.char_claim(p_party text, p_char text, p_pin text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if p_pin is null or length(p_pin) < 4 or length(p_pin) > 64 then raise exception 'PIN must be 4 or more characters'; end if;
  if not exists (select 1 from public.characters where id = p_char and party = upper(p_party)) then raise exception 'no such character in this party'; end if;
  insert into public.char_keys (party, char_id, pin_hash) values (upper(p_party), p_char, public.char_hash(p_party, p_char, p_pin))
  on conflict (party, char_id) do update set pin_hash = excluded.pin_hash, updated_at = now() where public.char_keys.pin_hash is null;
  return public.char_pin_ok(p_party, p_char, p_pin);
end $$;

-- Which characters in the party have a player PIN (ids only).
create or replace function public.char_claims(p_party text)
returns setof text language sql stable security definer set search_path = public as $$
  select char_id from public.char_keys where party = upper(p_party) and pin_hash is not null;
$$;

-- GM: clear a player's PIN so they can set a new one.
create or replace function public.char_reset(p_party text, p_gm_pin text, p_char text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.map_pin_ok(p_party, p_gm_pin) then raise exception 'GM PIN required'; end if;
  update public.char_keys set pin_hash = null, updated_at = now() where party = upper(p_party) and char_id = p_char;
end $$;

create or replace function public.party_save(p_party text, p_id text, p_data jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare v_pin text := p_data->>'_auth';
begin
  if p_party is null or length(p_party) < 8 then raise exception 'invalid party code'; end if;
  if p_id is null or length(p_id) > 64 then raise exception 'invalid id'; end if;
  p_data := p_data - '_auth';
  if octet_length(p_data::text) > 200000 then raise exception 'character too large'; end if;
  if public.char_claimed(p_party, p_id) and not public.char_pin_ok(p_party, p_id, v_pin) and not public.map_pin_ok(p_party, v_pin) then
    raise exception 'This character belongs to another player. Only they or the GM can change it.';
  end if;
  insert into public.characters (id, party, data, updated_at)
  values (p_id, upper(p_party), p_data, now())
  on conflict (id) do update set data = excluded.data, updated_at = now()
  where public.characters.party = upper(p_party);
end $$;

-- Polls with the player's PIN. The old PIN-less versions now refuse claimed characters.
create or replace function public.poll_mine(p_party text, p_char text, p_pin text)
returns table (id text, data jsonb, created_at timestamptz) language plpgsql stable security definer set search_path = public as $$
begin
  if public.char_claimed(p_party, p_char) and not public.char_pin_ok(p_party, p_char, p_pin) then raise exception 'wrong player PIN'; end if;
  return query select p.id, p.data, p.created_at from public.polls p
    where p.party = upper(p_party) and p.char_id = p_char and p.answer is null and not p.archived order by p.created_at;
end $$;

create or replace function public.poll_reply(p_party text, p_id text, p_char text, p_pin text, p_answer jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if public.char_claimed(p_party, p_char) and not public.char_pin_ok(p_party, p_char, p_pin) then raise exception 'wrong player PIN'; end if;
  if octet_length(p_answer::text) > 4000 then raise exception 'answer too long'; end if;
  update public.polls set answer = p_answer, answered_at = now()
    where id = p_id and party = upper(p_party) and char_id = p_char and answer is null;
  if not found then raise exception 'poll not found or already answered'; end if;
end $$;

create or replace function public.poll_open(p_party text, p_char text)
returns table (id text, data jsonb, created_at timestamptz) language sql stable security definer set search_path = public as $$
  select id, data, created_at from public.polls where party = upper(p_party) and char_id = p_char and answer is null and not archived
    and not public.char_claimed(p_party, p_char) order by created_at;
$$;

create or replace function public.poll_answer(p_party text, p_id text, p_char text, p_answer jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if public.char_claimed(p_party, p_char) then raise exception 'wrong player PIN'; end if;
  if octet_length(p_answer::text) > 4000 then raise exception 'answer too long'; end if;
  update public.polls set answer = p_answer, answered_at = now()
    where id = p_id and party = upper(p_party) and char_id = p_char and answer is null;
  if not found then raise exception 'poll not found or already answered'; end if;
end $$;
