-- Public bucket for item pictures + a lister the GM screen calls once.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('item-images','item-images',true, 2097152, array['image/webp','image/png','image/jpeg'])
on conflict (id) do update set public=true;
create or replace function public.item_images() returns setof text
language sql stable security definer set search_path='' as $$
  select name from storage.objects where bucket_id='item-images' and name not like '%/%';
$$;
grant execute on function public.item_images() to anon, authenticated;
