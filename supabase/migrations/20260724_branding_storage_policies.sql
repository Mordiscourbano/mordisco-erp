begin;

drop policy if exists "Authenticated read media assets" on public.media_assets;
create policy "Authenticated read media assets"
on public.media_assets for select to authenticated using (true);

drop policy if exists "Authenticated insert media assets" on public.media_assets;
create policy "Authenticated insert media assets"
on public.media_assets for insert to authenticated with check (true);

drop policy if exists "Authenticated update media assets" on public.media_assets;
create policy "Authenticated update media assets"
on public.media_assets for update to authenticated using (true) with check (true);

drop policy if exists "Authenticated read branding storage" on storage.objects;
create policy "Authenticated read branding storage"
on storage.objects for select to authenticated
using (bucket_id in ('logos','backgrounds','banners','products','avatars'));

drop policy if exists "Authenticated insert branding storage" on storage.objects;
create policy "Authenticated insert branding storage"
on storage.objects for insert to authenticated
with check (bucket_id in ('logos','backgrounds','banners','products','avatars'));

drop policy if exists "Authenticated update branding storage" on storage.objects;
create policy "Authenticated update branding storage"
on storage.objects for update to authenticated
using (bucket_id in ('logos','backgrounds','banners','products','avatars'))
with check (bucket_id in ('logos','backgrounds','banners','products','avatars'));

drop policy if exists "Authenticated delete branding storage" on storage.objects;
create policy "Authenticated delete branding storage"
on storage.objects for delete to authenticated
using (bucket_id in ('logos','backgrounds','banners','products','avatars'));

commit;
