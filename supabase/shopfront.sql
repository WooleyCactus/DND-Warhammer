-- Shop window: what the GM is currently showing players (no GM-only prices or controls).
-- One row per party; data = null means no shop is open. Writes need the GM PIN; anyone with the party code can read.
create table if not exists public.shopfront (
  party text primary key,
  data jsonb,
  updated_at timestamptz not null default now()
);
alter table public.shopfront enable row level security;   -- no policies: closed to direct access

create or replace function public.shopfront_set(p_party text, p_pin text, p_data jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.map_pin_ok(p_party, p_pin) then raise exception 'GM PIN required'; end if;
  if p_data is not null and octet_length(p_data::text) > 200000 then raise exception 'shop too large'; end if;
  insert into public.shopfront (party, data, updated_at) values (upper(p_party), p_data, now())
  on conflict (party) do update set data = excluded.data, updated_at = now();
end $$;

create or replace function public.shopfront_get(p_party text)
returns jsonb language sql stable security definer set search_path = public as $$
  select data from public.shopfront where party = upper(p_party);
$$;
grant execute on function public.shopfront_set(text,text,jsonb), public.shopfront_get(text) to anon, authenticated;
