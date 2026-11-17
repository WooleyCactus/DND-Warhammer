-- Rogue Trader Manifest: Vox messages. The GM pushes in-world transmissions (vox calls, intercepted
-- signals, written notes) to some or all characters. Players get an "Incoming vox" alert and a Vox log.
-- Removing a message archives it. Read/unread is tracked on each device, not here.
create table if not exists public.vox (
  id text primary key,
  party text not null,
  chars text[],                 -- null or empty = the whole party
  data jsonb not null,          -- {from, text, style: clear|static|cipher}
  created_at timestamptz not null default now(),
  archived boolean not null default false
);
create index if not exists vox_party_idx on public.vox (party, created_at);
alter table public.vox enable row level security;   -- no policies: closed to direct access

create or replace function public.vox_send(p_party text, p_pin text, p_id text, p_chars text[], p_data jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.map_pin_ok(p_party, p_pin) then raise exception 'GM PIN required'; end if;
  if octet_length(p_data::text) > 8000 then raise exception 'vox message too long'; end if;
  if (select count(*) from public.vox where party = upper(p_party) and not archived) > 500 then raise exception 'too many vox messages; remove some old ones'; end if;
  insert into public.vox (id, party, chars, data) values (left(p_id, 64), upper(p_party), nullif(p_chars, '{}'), p_data)
  on conflict (id) do nothing;
end $$;

create or replace function public.vox_list(p_party text, p_pin text)
returns setof public.vox language plpgsql stable security definer set search_path = public as $$
begin
  if not public.map_pin_ok(p_party, p_pin) then raise exception 'GM PIN required'; end if;
  return query select * from public.vox where party = upper(p_party) and not archived order by created_at desc;
end $$;

-- What one device can read: party-wide messages, plus messages for its character (player PIN if claimed).
create or replace function public.vox_mine(p_party text, p_char text, p_pin text)
returns table (id text, data jsonb, created_at timestamptz, private boolean) language plpgsql stable security definer set search_path = public as $$
declare ok boolean := p_char is not null and (not public.char_claimed(p_party, p_char) or public.char_pin_ok(p_party, p_char, p_pin));
begin
  return query select v.id, v.data, v.created_at, v.chars is not null from public.vox v
    where v.party = upper(p_party) and not v.archived and (v.chars is null or (ok and p_char = any(v.chars)))
    order by v.created_at;
end $$;

create or replace function public.vox_delete(p_party text, p_pin text, p_id text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.map_pin_ok(p_party, p_pin) then raise exception 'GM PIN required'; end if;
  update public.vox set archived = true where party = upper(p_party) and id = p_id;
end $$;
