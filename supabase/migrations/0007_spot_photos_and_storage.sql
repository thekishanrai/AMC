-- 0007: Properly licensed spot photos, served from our own Storage bucket.
-- NOTE: spots.photos (text[]) is intentionally left in place and NOT migrated. The app no longer
-- renders it. Clean it up in a later migration once spot_photos is populated.

create table if not exists spot_photos (
  id uuid primary key default gen_random_uuid(),
  spot_id uuid references spots on delete cascade,
  storage_path text not null,
  credit_name text,
  credit_url text,
  license text not null,
  position int default 0
);
create index if not exists spot_photos_spot_id_idx on spot_photos (spot_id, position);
alter table spot_photos enable row level security;
drop policy if exists "spot_photos public read" on spot_photos;
create policy "spot_photos public read" on spot_photos for select using (true);

-- Public bucket for the licensed photos (images only, 10 MB).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('spot-photos', 'spot-photos', true, 10485760, array['image/jpeg','image/png','image/webp','image/avif'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Form attachments: the bucket itself is the real enforcement for size and type.
update storage.buckets
set file_size_limit = 20971520,
    allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif','image/heic','image/heif','video/mp4','video/quicktime']
where id = 'form-attachments';
