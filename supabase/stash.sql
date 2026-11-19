-- Rogue Trader Manifest: the Ship's Armoury, one shared stash per party.
-- Players stow items from their gear and take items out. Anyone in the party may use it (a claimed
-- character needs its player PIN or the GM PIN, the same rule as saving a sheet). Each item has a "key"
-- (its catalogue id, e.g. std:medistimm) so stacks merge. The last 40 moves are kept in "log".
create table if not exists public.stash (
  party text primary key,
  items jsonb not null default '[]'::jsonb,
  log jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.stash enable row level security;   -- no policies: closed to direct access

create or replace function public.jsonb_head(a jsonb, n int)
returns jsonb language sql immutable as $$
  select coalesce(jsonb_agg(e order by i), '[]'::jsonb) from jsonb_array_elements(a) with ordinality t(e, i) where i <= n;
$$;

create or replace function public.stash_ok(p_party text, p_char text, p_pin text)
returns boolean language sql stable security definer set search_path = public as $$
  select public.map_pin_ok(p_party, p_pin)
    or (p_char is not null and exists (select 1 from public.characters where id = p_char and party = upper(p_party))
        and (not public.char_claimed(p_party, p_char) or public.char_pin_ok(p_party, p_char, p_pin)));
$$;

create or replace function public.stash_get(p_party text)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce((select jsonb_build_object('items', items, 'log', log, 'updated_at', updated_at) from public.stash where party = upper(p_party)),
                  jsonb_build_object('items', '[]'::jsonb, 'log', '[]'::jsonb, 'updated_at', null));
$$;

-- Put p_qty of an item into the armoury.
create or replace function public.stash_store(p_party text, p_char text, p_pin text, p_who text, p_item jsonb, p_qty int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare k text := coalesce(nullif(p_item->>'key',''), nullif(p_item->>'id',''), lower(p_item->>'name')); its jsonb;
begin
  if not public.stash_ok(p_party, p_char, p_pin) then raise exception 'This character belongs to another player.'; end if;
  if p_qty is null or p_qty < 1 or p_qty > 100000 then raise exception 'bad quantity'; end if;
  if octet_length(p_item::text) > 6000 then raise exception 'item too large'; end if;
  insert into public.stash (party) values (upper(p_party)) on conflict (party) do nothing;
  select items into its from public.stash where party = upper(p_party) for update;
  if jsonb_array_length(its) >= 300 then raise exception 'the armoury is full'; end if;
  select jsonb_agg(case when x->>'key' = k then x || jsonb_build_object('qty', coalesce((x->>'qty')::int,0) + p_qty) else x end)
    into its from jsonb_array_elements(its) x;
  its := coalesce(its, '[]'::jsonb);
  if not exists (select 1 from jsonb_array_elements(its) x where x->>'key' = k) then
    its := its || jsonb_build_array((p_item - 'qty') || jsonb_build_object('key', k, 'qty', p_qty));
  end if;
  update public.stash set items = its,
    log = public.jsonb_head(jsonb_build_array(jsonb_build_object('who', left(coalesce(p_who,'?'),60), 'name', p_item->>'name', 'qty', p_qty, 'dir', 'in', 't', (extract(epoch from now())*1000)::bigint)) || log, 40),
    updated_at = now() where party = upper(p_party);
  return its;
end $$;

-- Take p_qty of the item with key p_key out of the armoury. Returns the item (with qty = amount taken).
create or replace function public.stash_take(p_party text, p_char text, p_pin text, p_who text, p_key text, p_qty int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare its jsonb; it jsonb; have int;
begin
  if not public.stash_ok(p_party, p_char, p_pin) then raise exception 'This character belongs to another player.'; end if;
  if p_qty is null or p_qty < 1 then raise exception 'bad quantity'; end if;
  select items into its from public.stash where party = upper(p_party) for update;
  if its is null then raise exception 'The armoury is empty.'; end if;
  select x into it from jsonb_array_elements(its) x where x->>'key' = p_key limit 1;
  if it is null then raise exception 'That item is no longer in the armoury.'; end if;
  have := coalesce((it->>'qty')::int, 0);
  if have < p_qty then raise exception 'Only % left in the armoury.', have; end if;
  select coalesce(jsonb_agg(case when x->>'key' = p_key then x || jsonb_build_object('qty', have - p_qty) else x end)
    filter (where not (x->>'key' = p_key and have - p_qty <= 0)), '[]'::jsonb)
    into its from jsonb_array_elements(its) x;
  update public.stash set items = its,
    log = public.jsonb_head(jsonb_build_array(jsonb_build_object('who', left(coalesce(p_who,'?'),60), 'name', it->>'name', 'qty', p_qty, 'dir', 'out', 't', (extract(epoch from now())*1000)::bigint)) || log, 40),
    updated_at = now() where party = upper(p_party);
  return it || jsonb_build_object('qty', p_qty);
end $$;

-- GM: replace the whole list (used to stock the armoury or fix mistakes).
create or replace function public.stash_set(p_party text, p_pin text, p_items jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.map_pin_ok(p_party, p_pin) then raise exception 'GM PIN required'; end if;
  if jsonb_typeof(p_items) <> 'array' or octet_length(p_items::text) > 400000 then raise exception 'bad item list'; end if;
  insert into public.stash (party, items) values (upper(p_party), p_items)
  on conflict (party) do update set items = excluded.items, updated_at = now();
end $$;
