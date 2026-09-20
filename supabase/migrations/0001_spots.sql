-- Run once network access to api.supabase.com is available:
-- scripts/push-schema.sh (uses SUPABASE_ACCESS_TOKEN + Management API)

create table if not exists public.spots (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in ('trek', 'waterfall', 'camping')),
  lat double precision not null,
  lng double precision not null,
  description text,
  difficulty text,
  best_season text,
  distance_from_mumbai_km numeric,
  distance_from_pune_km numeric,
  photos text[] default '{}',
  how_to_reach text,
  status text not null default 'published' check (status in ('published', 'draft')),
  created_at timestamptz not null default now()
);

alter table public.spots enable row level security;

drop policy if exists "public read published spots" on public.spots;
create policy "public read published spots" on public.spots
  for select
  using (status = 'published');
