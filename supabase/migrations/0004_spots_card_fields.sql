-- Adds the fields needed for the finalized spot-card format (IndiaHikes-style
-- quick-facts + highlights + safety, adapted for a Mumbai/Pune weekend app).
alter table public.spots
  add column if not exists region text,
  add column if not exists altitude_m integer,
  add column if not exists duration_label text,
  add column if not exists highlights text[] default '{}',
  add column if not exists things_to_carry text[] default '{}',
  add column if not exists safety_note text,
  add column if not exists nearest_station text,
  add column if not exists faqs jsonb default '[]',
  add column if not exists youtube_url text;
