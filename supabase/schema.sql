-- Rogue Trader Manifest: shared party storage.
-- Party codes act as the shared secret: the table itself is closed to the public,
-- and all access goes through these three functions, which only ever touch one party.
create table if not exists public.characters (
  id text primary key,
  party text not null,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
create index if not exists characters_party_idx on public.characters (party);
alter table public.characters enable row level security;
revoke all on public.characters from anon, authenticated;

create or replace function public.party_list(p_party text)
returns setof public.characters
language sql security definer set search_path = public as $$
  select * from public.characters where party = upper(p_party) order by updated_at;
$$;

create or replace function public.party_save(p_party text, p_id text, p_data jsonb)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_party is null or length(p_party) < 8 then raise exception 'invalid party code'; end if;
  if p_id is null or length(p_id) > 64 then raise exception 'invalid id'; end if;
  if octet_length(p_data::text) > 200000 then raise exception 'character too large'; end if;
  insert into public.characters (id, party, data, updated_at)
  values (p_id, upper(p_party), p_data, now())
  on conflict (id) do update set data = excluded.data, updated_at = now()
  where public.characters.party = upper(p_party);
end $$;

create or replace function public.party_delete(p_party text, p_id text)
returns void
language sql security definer set search_path = public as $$
  delete from public.characters where id = p_id and party = upper(p_party);
$$;

revoke execute on function public.party_list(text), public.party_save(text, text, jsonb), public.party_delete(text, text) from public;
grant execute on function public.party_list(text), public.party_save(text, text, jsonb), public.party_delete(text, text) to anon, authenticated;
